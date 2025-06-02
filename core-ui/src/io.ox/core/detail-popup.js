/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import DetailPopup from '@/io.ox/backbone/views/popup'
import { createIcon } from '@/io.ox/core/components'
import gt from 'gettext'
import manifests from '@/io.ox/core/manifests'

const registry = {
  call ({ type, e, data, level = 1, selector = '[data-detail-popup]' } = {}) {
    const handler = registry[type]
    if (!handler) return
    getCid(data, type)
    // stop if the same popup is already open
    const existingPopups = $('.detail-popup')
    const samePopup = data.cid && existingPopups.filter(`[data-level="${level}"][data-cid="${data.cid}"]`)
    if (samePopup && samePopup.length) {
      samePopup.remove()
      return
    }
    // close other on same level (delay to avoid flickering)
    _.delay(() => existingPopups.filter(`[data-level="${level}"]`).remove(), 10)
    // create popup
    const popup = new DetailPopup({ selector })
    popup.$el
      .addClass('detail-popup-' + type)
      .attr({ 'data-cid': data.cid, 'data-level': level })
    popup.snap(e)
    handler({ popup, data })
  }
}

function getCid (data, type) {
  // special treatment for halo
  if (type === 'halo') data.cid = data.user_id || data.email || data.email1
  if (type === 'resource') data.cid = data.id = (data.cid || data.id)
  // make sure we have a cid
  if (!data.cid) data = Object.assign({}, data, { cid: _.cid(data) })
  // and make sure it's a string ($.data() might return numbers)
  if (data.cid === 'undefined') data.cid = ''
  else if (_.isNumber(data.cid)) data.cid = String(data.cid)
}

$(document).on('click popup', '[data-detail-popup]', (e) => {
  e.preventDefault()
  // ignore recently dragged elements or close buttons
  if ($(e.target).closest('.dragged, [data-action]').length) return
  const $el = $(e.currentTarget)
  const parents = $el.parents()
  // ignore clicks on interactive elements like links
  if (parents.filter('a, button, :input').length) return
  // get level
  const level = (parents.filter('.detail-popup').first().attr('data-level') || 0) + 1
  const data = $el.data()
  const type = data.detailPopup
  if (ox.debug) console.debug('click -> data-detail-popup', type, data)
  registry.call({ type, e, data, level })
})

$.fn.forwardPopupClick = function () {
  this.each(function () {
    $(this).on('click', function (e) {
      $(this).trigger({ type: 'popup', pageX: e.pageX, pageY: e.pageY, target: e.target })
    })
  })
  return this
}

//
// Appointments
//

registry.appointment = async ({ popup, data }) => {
  const [{ default: view }, { default: api }] = await Promise.all([
    import('@/io.ox/calendar/view-detail'),
    import('@/io.ox/calendar/api')
  ])
  api.get(_.cid(data.cid)).then(
    model => {
      popup.$body.append(view.draw(new ext.Baton({ model, popup }), { deeplink: true }))
      popup.show()
    },
    error => yell(error)
  )
}

registry.itip = async ({ popup, data }) => {
  const { default: view } = await import('@/io.ox/calendar/view-detail')
  popup.$body.append(view.draw(new ext.Baton({ model: data.model, popup, toolbar: false, noFolderCheck: true })))
  popup.show()
}

//
// Contact
//

registry.contact = async ({ popup, data }) => {
  const [{ default: view }, { default: api }] = await Promise.all([
    import('@/io.ox/contacts/view-detail'),
    import('@/io.ox/contacts/api')
  ])
  api.get(_.cid(data.cid)).then(
    data => {
      popup.$body.append(view.draw(new ext.Baton({ data, popup })))
      popup.show()
    },
    error => yell(error)
  )
}

//
// Halo view
//

registry.halo = async ({ popup, data }) => {
  const [{ default: view }] = await Promise.all([
    import('@/plugins/halo/view-detail'),
    manifests.manager.loadPluginsFor('plugins/halo')
  ])
  const { cid, detailPopup, ...reduced } = data
  popup.$body.append(view.draw(reduced, popup))
  if (!_.device('smartphone')) popup.$el.height(800)
  popup.show()
}

//
// Resource view
//

registry.resource = async ({ popup, data }) => {
  const { cid, detailPopup, callbacks, ...reduced } = data

  const [{ ResourceDetailView }, { ResourcesToolbarView }] = await Promise.all([
    import('@/plugins/administration/resources/settings/view-detail'),
    import('@/plugins/administration/resources/settings/toolbar')]
  )

  popup.$toolbar.append(
    new ResourcesToolbarView({
      point: 'administration/resources/toolbar/inline',
      inline: true
    }).update([cid]).$el
  )
  popup.$body.append(
    new ResourceDetailView({ cid, popup, data: reduced, callbacks }).render().$el
  )

  if (popup.$container.closest('.io-ox-settings-main').length > 0 && _.device('!smartphone')) {
    // move calculated center of the $container to the right
    popup.lastSnap.mx = popup.lastSnap.mx + 180
  }

  popup.$el.height(800)
  popup.show()
  popup.trigger('after:show')
}

//
// Group view
//

registry.group = async ({ popup, data }) => {
  const { id } = data
  const [{ default: groupAPI }, { default: userAPI }] = await Promise.all([
    import('@/io.ox/core/api/group'),
    import('@/io.ox/core/api/user')]
  )
  const groupData = await groupAPI.get({ id })
  const members = await Promise.all(groupData.members.map(id => userAPI.get({ id })))

  popup.$body.append(
    // title
    $('<div class="detail-row">').append(
      $('<div class="icon">'),
      $('<div class="content">').append(
        $('<h1 class="text-2xl text-bold m-0 mt-8 break-words">').text(groupData.display_name)
      )
    ),
    // members
    $('<div class="detail-row">').append(
      $('<div class="icon">').append(createIcon('bi/person.svg')),
      $('<div class="content">').append(
        $('<p>').append(
          $('<h2 class="mb-10 heading-unstyled">').text(gt('Group members')),
          $('<ul class="list-unstyled">').append(
            members.map(user => {
              return $('<li class="delegate-wrapper flex-row items-center user">').append(
                $('<a href="#" data-detail-popup="halo">')
                  .data({ email1: user.email1 })
                  .text(user.display_name)
              )
            })
          )
        )
      )
    )
  )

  if (!members.length) popup.$body.find('ul').append($('<li class="delegate-wrapper flex-row items-center user italic">').text(gt('No members')))

  popup.$el.height(800)
  popup.show()
  popup.trigger('after:show')
}

//
// Email
//

registry.mail = async ({ popup, data }) => {
  const [{ default: detail }, { default: api }] = await Promise.all([
    import('@/io.ox/mail/detail/view'),
    import('@/io.ox/mail/api')
  ])
  api.get(_.cid(data.cid)).then(
    data => {
      const view = new detail.View({ data, popup })
      popup.$body.append(view.render().expand().$el.addClass('no-padding'))
      // response to "remove" event
      popup.listenTo(view.model, 'remove', function () {
        this.trigger('close')
      })
      popup.$el.height(800)
      popup.show()
    },
    error => yell(error)
  )
}

//
// Task
//

registry.task = async ({ popup, data }) => {
  const [{ default: view }, { default: api }] = await Promise.all([
    import('@/io.ox/tasks/view-detail'),
    import('@/io.ox/tasks/api')
  ])
  api.get(_.cid(data.cid)).then(
    data => {
      popup.$body.append(view.draw(new ext.Baton({ data, popup })))
      popup.show()
    },
    error => yell(error)
  )
}

export default registry
