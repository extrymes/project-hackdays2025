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
import ox from '@/ox'

import Model from '@/io.ox/mail/mailfilter/autoforward/model'
import VacationNoticeView from '@/io.ox/mail/mailfilter/vacationnotice/indicator'
import ext from '@/io.ox/core/extensions'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

// just overwrite some stuff from the vacation notice view
const AutoforwardView = VacationNoticeView.extend({

  point: 'io.ox/mail/autoforward/indicator',

  events: {
    'click .btn-close': 'onClose',
    'click a[data-action="edit-auto-forward-notice"]': 'onEdit'
  },

  onEdit (e) {
    e.preventDefault()
    import('@/io.ox/mail/mailfilter/autoforward/view').then(function ({ default: view }) {
      view.open()
    })
  },

  attachTo ($el) {
    this.model = new Model()
    this.model.fetch().done(function () {
      $el.before(this.render().$el)
      this.listenTo(ox, 'mail:change:auto-forward', this.onChange)
      this.listenTo(ox, 'refresh^', this.checkIfActive)
      this.onChange(this.model)
      this.trigger('drawn')
    }.bind(this))
    return this
  }
})

ext.point('io.ox/mail/autoforward/indicator').extend({
  id: 'link',
  index: 100,
  render () {
    const title = gt('Auto forwarding is active')
    this.$el.append(
      createIcon('bi/forward.svg').addClass('me-8'),
      $('<span class="sr-only">').text(gt('Warning')),
      $('<a href="#" data-action="edit-auto-forward-notice">').text(title)
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
export default AutoforwardView
