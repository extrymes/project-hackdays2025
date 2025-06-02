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

// cSpell:ignore nohalo, sendby

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/calendar/common-extensions'
import calAPI from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import * as coreUtil from '@/io.ox/core/util'
import * as contactsUtil from '@/io.ox/contacts/util'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/calendar/style.scss'

import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'

let INDEX = 0

function toggleDetails (e) {
  e.preventDefault()

  const toggle = e.data.toggle
  toggle.toggleClass('expanded')
  e.data.content.toggle(toggle.hasClass('expanded'))

  let baton = e.data.baton

  if (e.data.content.children().length) return
  // there is no folder given for appointments where the user is not invited, so just use the data available
  if (!baton.data.event.folder) {
    ext.point('io.ox/calendar/conflicts/details').invoke('draw', e.data.content.empty(), ext.Baton.ensure(baton.data.event))
    e.data.content.show()
    return
  }
  calAPI.get(baton.data.event).done(function (appointment) {
    // we don't show details for private appointments in shared/public folders (see bug 37971)
    const folder = folderAPI.pool.getModel(baton.data.event.folder)
    if (appointment.get('private_flag') && (appointment.get('createdBy') || {}).entity !== ox.user_id && !folderAPI.is('private', folder)) return
    appointment.nohalo = true
    baton = ext.Baton.ensure(appointment.attributes)
    baton.model = appointment
    baton.isConflictView = true
    ext.point('io.ox/calendar/conflicts/details').invoke('draw', e.data.content.empty(), baton)
    e.data.content.show()
  })
}

ext.point('io.ox/calendar/conflicts').extend({
  index: INDEX += 100,
  id: 'subject',
  draw: extensions.h2
})

ext.point('io.ox/calendar/conflicts').extend({
  index: INDEX += 100,
  id: 'datetime',
  draw: extensions.datetime
})

function getConflictName (attendee) {
  return coreUtil.renderPersonalName({ html: contactsUtil.getFullName(attendee, true) }, attendee).html()
}

ext.point('io.ox/calendar/conflicts').extend({
  index: INDEX += 100,
  id: 'conflicts',
  draw (baton) {
    if (!baton.data.conflicting_attendees) return
    const node = $('<div class="conflicts">').text(gt('Conflicts:') + ' ')

    $.when.apply($, _(baton.data.conflicting_attendees).map(getConflictName)).then(function () {
      node.append([].slice.call(arguments).join('<span class="delimiter">\u00A0\u2022 </span>'))
    })

    this.append(node)
  }
})

INDEX = 0

ext.point('io.ox/calendar/conflicts/details').extend({
  index: INDEX += 100,
  id: 'location',
  draw: extensions.locationDetail
})

ext.point('io.ox/calendar/conflicts/details').extend({
  index: INDEX += 100,
  id: 'note',
  draw: extensions.note
})

ext.point('io.ox/calendar/conflicts/details').extend({
  index: INDEX += 100,
  id: 'participants',
  draw (baton) {
    const node = $('<div class="participants-view">')
    import('@/io.ox/participants/chronos-detail').then(({ default: ParticipantsView }) => {
      node.append(
        new ParticipantsView(baton, { inlineLinks: false, halo: false }).draw()
      )
    })
    this.append(node)
  }
})

ext.point('io.ox/calendar/conflicts/details').extend({
  index: INDEX += 100,
  id: 'list',
  draw (baton) {
    const node = $('<table class="details-table">')
    ext.point('io.ox/calendar/conflicts/details/list').invoke('draw', node, baton)
    this.append(node)
  }
})

INDEX = 0

ext.point('io.ox/calendar/conflicts/details/list').extend({
  index: INDEX += 100,
  id: 'sentby',
  draw (baton) {
    baton.sendbyNode = $('<span>')
    extensions.sentBy.bind(this)(baton)
  }
})

ext.point('io.ox/calendar/conflicts/details/list').extend({
  index: INDEX += 100,
  id: 'shownAs',
  draw: extensions.shownAs
})

ext.point('io.ox/calendar/conflicts/details/list').extend({
  index: INDEX += 100,
  id: 'folder',
  draw: extensions.folder
})

ext.point('io.ox/calendar/conflicts/details/list').extend({
  index: INDEX += 100,
  id: 'created',
  draw: extensions.created
})

ext.point('io.ox/calendar/conflicts/details/list').extend({
  index: INDEX += 100,
  id: 'modified',
  draw: extensions.modified
})

function drawList (conflicts) {
  return _(conflicts).sortBy(function (conflict) { return conflict.event.startDate }).map(function (conflict) {
    const baton = ext.Baton.ensure(conflict)
    const summary = $('<div class="conflict-summary">')
    const details = $('<div class="conflict-details">').hide()
    const toggle = $('<a href="#" role="button" class="detail-toggle">').attr('summary', gt('Show appointment details')).append(
      createIcon('bi/chevron-right.svg'),
      createIcon('bi/chevron-down.svg')
    )
    const li = $('<li>').append(toggle, summary, details)
    const entity = (conflict.event.createdBy || {}).entity

    // use same setting as scheduling view (freeBusyStrict) to decide if we show infos about appointments the user is not invited too
    if (settings.get('freeBusyStrict', true) && entity !== ox.user_id && _.isUndefined(conflict.event.summary)) {
      toggle.remove()
      details.remove()
    } else {
      summary.addClass('pointer')
      li.on('click', '.conflict-summary, .detail-toggle', { baton, toggle, content: details }, toggleDetails)
    }

    ext.point('io.ox/calendar/conflicts').invoke('draw', summary, baton)
    return li
  })
}

export default {

  dialog (conflicts) {
    return new ModalDialog({ title: gt('Conflicts detected'), width: _.device('smartphone') ? '100%' : 640 })
      .build(function () {
        // look for hard conflicts
        const hardConflict = !!_.find(conflicts, function (conflict) { return conflict.hard_conflict === true })

        // additional header
        this.$body.append(
          $('<div class="modal-subtitle">').text(gt('The new appointment conflicts with existing appointments.')),
          $('<br>')
        )
        // conflicting resources cannot be ignored
        if (hardConflict) {
          this.$body.append(
            $('<div class="alert alert-info hard-conflict">').text(gt('Conflicts with resources cannot be ignored'))
          )
        }
        // conflicting appointments
        this.$body.append($('<ul class="list-unstyled conflict-overview calendar-detail">').append(drawList(conflicts)))
        // cancel button
        this.addCancelButton()
        // ignore button
        if (!hardConflict) this.addButton({ action: 'ignore', className: 'btn-primary', label: gt('Ignore conflicts'), placement: 'right' })
      }).open()
  },

  drawHeader () {
    return $('<h4 class="text-error">')
      .text(gt('Conflicts detected'))
      .add($('<div class="modal-subtitle">').text(gt('The new appointment conflicts with existing appointments.')))
  }

}
