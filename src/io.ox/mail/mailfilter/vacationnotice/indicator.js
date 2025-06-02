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
import Model from '@/io.ox/mail/mailfilter/vacationnotice/model'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import ext from '@/io.ox/core/extensions'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const VacationNoticeIndicator = ExtensibleView.extend({

  point: 'io.ox/mail/vacation-notice/indicator',

  el: '<div class="alert alert-accent alert-dismissible indicator ellipsis whitespace-normal hidden" role="alert">',

  events: {
    'click .btn-close': 'onClose',
    'click a[data-action="edit-vacation-notice"]': 'onEdit'
  },

  onEdit (e) {
    e.preventDefault()
    import('@/io.ox/mail/mailfilter/vacationnotice/view').then(function ({ default: view }) {
      view.open()
    })
  },

  attachTo ($el) {
    this.model = new Model()
    this.model.fetch().done(function () {
      $el.before(this.render().$el)
      this.listenTo(ox, 'mail:change:vacation-notice', this.onChange)
      this.listenTo(ox, 'refresh^', this.checkIfActive)
      this.onChange(this.model)
      this.trigger('drawn')
    }.bind(this))
    return this
  },

  onClose (e) {
    this.$el.toggleClass('hidden', true)
  },

  activeElements: [],

  setActiveState (model) {
    const key = _.indexOf(this.activeElements, model.id)
    if (model.isActive() && key === -1) {
      this.activeElements.push(model.id)
    } else if (!model.isActive() && key !== -1) {
      this.activeElements.splice(key, 1)
    }
    // keep active state in sync
    if (model.get('active') !== this.model.get('active')) this.model.set('active', model.get('active'))
  },

  checkIfActive () {
    this.onChange(this.model)
  },

  onChange (model) {
    this.setActiveState(model)
    const active = _.indexOf(this.activeElements, model.id) !== -1
    this.$el.toggleClass('hidden', !active)
  }
})

ext.point('io.ox/mail/vacation-notice/indicator').extend({
  id: 'link',
  index: 100,
  render () {
    const title = gt('Your vacation notice is active')
    this.$el.append(
      createIcon('bi/signpost-2.svg').addClass('me-8'),
      $('<span class="sr-only">').text(gt('Warning')),
      $('<a href="#" data-action="edit-vacation-notice">').text(title)
    )
  }
}, {
  id: 'close',
  index: 200,
  render () {
    this.$el.append(
      $('<button type="button" class="btn btn-link btn-close">').attr('title', gt('Close'))
        .append(createIcon('bi/x.svg').addClass('bi-18'))
    )
  }
})

export default VacationNoticeIndicator
