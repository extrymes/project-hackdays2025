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
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import TimezonePicker from '@/io.ox/backbone/mini-views/timezonepicker'
import * as util from '@/io.ox/calendar/util'

import gt from 'gettext'

ext.point('io.ox/calendar/edit/timezone-dialog').extend({
  id: 'start-date-selection',
  index: 100,
  draw (baton) {
    const guid = _.uniqueId('form-control-label-')
    this.append(
      $('<div class="form-group">').append(
        $('<label>').attr('for', guid).text(gt('Start date time zone')),
        new TimezonePicker({
          id: guid,
          name: 'startTimezone',
          model: baton.model,
          className: 'form-control',
          showFavorites: true
        }).render().$el
      )
    )
  }
})

ext.point('io.ox/calendar/edit/timezone-dialog').extend({
  id: 'end-date-selection',
  index: 200,
  draw (baton) {
    const guid = _.uniqueId('form-control-label-')
    this.append(
      $('<div class="form-group">').append(
        $('<label>').attr('for', guid).text(gt('End date time zone')),
        new TimezonePicker({
          id: guid,
          name: 'endTimezone',
          model: baton.model,
          className: 'form-control',
          showFavorites: true
        }).render().$el
      )
    )
  }
})

function open (opt) {
  const model = new Backbone.Model({
    startTimezone: opt.model.getMoment('startDate').tz(),
    endTimezone: opt.model.getMoment('endDate').tz()
  })

  new ModalDialog({ title: gt('Change time zone') })
    .addCancelButton()
    .addButton({ label: gt('Change'), action: 'changeTZ' })
    .build(function () {
      ext.point('io.ox/calendar/edit/timezone-dialog').invoke('draw', this.$body, { model })
    })
    .on('changeTZ', function () {
      const startDate = opt.model.getMoment('startDate').tz(model.get('startTimezone'))
      const endDate = opt.model.getMoment('endDate').tz(model.get('endTimezone'))
      opt.model.set({
        startDate: { value: startDate.clone().utc().format(util.ZULU_FORMAT), tzid: startDate.tz() },
        endDate: { value: endDate.clone().utc().format(util.ZULU_FORMAT), tzid: endDate.tz() }
      })
    })
    .open()
}

export default { open }
