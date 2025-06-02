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
import moment from '@open-xchange/moment'

import calApi from '@/io.ox/calendar/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import AlarmsView from '@/io.ox/backbone/mini-views/alarms'
import * as util from '@/io.ox/calendar/util'
import '@/io.ox/calendar/style.scss'

import gt from 'gettext'
import { RecurrenceRuleMapModel } from '../recurrence-rule-map-model'

const showDialog = function (appointmentData, options) {
  options = options || {}
  const alarmsview = new AlarmsView.LinkView({ model: new Backbone.Model(appointmentData) })
  new ModalDialog({
    title: gt('Change reminders')
  })
    .build(function () {
      const strings = util.getDateTimeIntervalMarkup(appointmentData, { output: 'strings', zone: moment().tz() })
      const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(appointmentData)
      const descriptionId = _.uniqueId('alarms-dialog-description-')

      this.$el.attr('aria-describedby', descriptionId)

      this.$body.append(
        $('<p>').attr('id', descriptionId).append(
          $('<b>').text(appointmentData.summary),
          $.txt(', '),
          $.txt(strings.dateStr),
          $.txt(recurrenceString !== '' ? ' \u2013 ' + recurrenceString : ''),
          $.txt(' '),
          $.txt(strings.timeStr)
        ),
        $('<fieldset>').append(
          $('<legend class="confirm-dialog-legend">').text(gt('Reminder')),
          alarmsview.render().$el
        )
      )
    })
    .addCancelButton()
    // #. 'Change' as text for an apply button to change the reminder of an appointment alert via a modal dialog.
    .addButton({ action: 'ok', label: gt('Change'), className: 'btn-primary' })
    .on('ok', function () {
      const params = { id: appointmentData.id, folder: appointmentData.folder, alarms: alarmsview.model.get('alarms') }
      if (options.single && appointmentData.recurrenceId) {
        params.recurrenceId = appointmentData.recurrenceId
      }
      calApi.updateAlarms(params, util.getCurrentRangeOptions())
    })
    .open()
}

export default function (appointmentData) {
  if (appointmentData.recurrenceId && appointmentData.seriesId) {
    new ModalDialog({ title: gt('Change appointment reminders'), width: 600 })
      .build(function () {
        this.$body.append(gt('This appointment is part of a series. Do you want to change your reminders for the whole series or just for this appointment within the series?'))
      })
      .addCancelButton({ left: true })
      .addButton({ className: 'btn-default', label: gt('Change appointment'), action: 'appointment' })
      .addButton({
        action: 'series',
        // #. Use singular in this context
        label: gt('Change series')
      })
      .on('series', function () { showDialog(appointmentData, { single: false }) })
      .on('appointment', function () { showDialog(appointmentData, { single: true }) })
      .open()
    return
  }
  showDialog(appointmentData, { single: true })
};
