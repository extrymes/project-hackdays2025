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
import * as util from '@/io.ox/calendar/util'
import mini from '@/io.ox/backbone/mini-views/common'
import Typeahead from '@/io.ox/core/tk/typeahead'
import pModel from '@/io.ox/participants/model'
import { AttendeeView } from '@/io.ox/participants/chronos-views'
import calendarModel from '@/io.ox/calendar/model'
import yell from '@/io.ox/core/yell'

import '@/io.ox/participants/add'
import '@/io.ox/calendar/style.scss'

import gt from 'gettext'
import { RecurrenceRuleMapModel } from '../recurrence-rule-map-model'

export default {

  // only allow series and this and future
  openDialog (appointmentData) {
    if (!appointmentData) return
    util.showRecurrenceDialog(appointmentData, { dontAllowExceptions: true }).then(function ({ action }) {
      if (action === 'cancel') return

      new ModalDialog({
        title: gt('Change organizer')
      })
        .build(function () {
          this.model = new Backbone.Model({
            newOrganizer: new calendarModel.AttendeeModel(_(appointmentData.attendees).findWhere({ entity: appointmentData.organizer.entity })),
            comment: ''
          })

          const self = this
          const { dateStr, timeStr } = util.getDateTimeIntervalMarkup(appointmentData, { output: 'strings', zone: moment().tz() })
          const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(appointmentData)
          const descriptionId = _.uniqueId('alarms-dialog-description-')
          let guid = _.uniqueId('label-')
          const organizerView = new AttendeeView({
            model: this.model.get('newOrganizer'),
            halo: false,
            showAvatar: true,
            showRemoveButton: false,
            showOptionalButton: false,
            showParticipationStatus: false
          })
          const typeahead = new Typeahead({
            apiOptions: {
              contacts: false,
              users: true,
              groups: false,
              distributionlists: false,
              resources: false
            },
            extPoint: 'io.ox/participants/add',
            harmonize (data) {
              data = _(data).map(function (m) {
                return new pModel.Participant(m)
              })

              data = _(data).filter(function (model) {
                // only internal users allowed, so no secondary mail addresses
                return model.get('field') === 'email1'
              })
              // wait for participant models to be fully loaded (autocomplete suggestions might have missing values otherwise)
              return $.when.apply($, _(data).pluck('loading')).then(function () { return data })
            },
            click (e, data, value) {
              self.model.set('newOrganizer', new calendarModel.AttendeeModel(util.createAttendee(data)))
              // clean typeahead input and redraw organizer
              if (value) typeahead.$el.typeahead('val', '')
              organizerView.model = self.model.get('newOrganizer')
              organizerView.$el.empty()
              organizerView.render()
            }
          })

          this.$body.addClass('change-organizer-dialog').append(
            $('<div>').attr('id', descriptionId).append(
              $('<div class="text-bold">').text(appointmentData.summary),
              $('<div>').text(`${dateStr}${recurrenceString !== '' ? ' \u2013 ' + recurrenceString : ''} ${timeStr}`)
            ),
            $('<label class="mt-16">').text(gt('Current organizer')).attr({ for: guid = _.uniqueId('label-') }),
            organizerView.render().$el.attr({ id: guid }),
            $('<label class="mt-8">').text(gt('New organizer')).attr({ for: guid = _.uniqueId('label-') }),
            typeahead.$el.attr({ id: guid, placeholder: gt('Search contacts') }),
            $('<label class="mt-16">').text(gt('Add a message to the notification email for the other participants.')).attr({ for: guid = _.uniqueId('label-') }),
            new mini.InputView({ name: 'comment', model: this.model, placeholder: '', autocomplete: false }).render().$el.attr('id', guid)
          )
          typeahead.render()
        })
        .addCancelButton()
        // #. 'Change' as text for a button to apply the change of the organizer of an appointment.
        .addButton({ action: 'ok', label: gt('Change'), className: 'btn-primary' })
        .on('ok', function () {
          const params = {
            id: appointmentData.seriesId || appointmentData.id,
            folder: appointmentData.folder,
            organizer: this.model.get('newOrganizer').pick(['cn', 'email', 'entity', 'uri'])
          }
          // new organizer is the same as the old organizer... nothing to do
          if (params.organizer.entity === appointmentData.organizer.entity) return

          if (action === 'thisandfuture') {
            params.recurrenceId = appointmentData.recurrenceId
          }
          calApi.changeOrganizer(params, _.extend(util.getCurrentRangeOptions(), { comment: this.model.get('comment'), recurrenceRange: (action === 'thisandfuture' ? 'THISANDFUTURE' : undefined) }))
            .then(function () {
              yell('success', gt('Organizer changed'))
            }, yell)
          this.model = null
        })
        .open()
    })
  }
}
