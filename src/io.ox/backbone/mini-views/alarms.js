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

import * as util from '@/io.ox/calendar/util'
import DisposableView from '@/io.ox/backbone/views/disposable'

import ModalDialog from '@/io.ox/backbone/views/modal'
import userApi from '@/io.ox/core/api/user'
import '@/io.ox/backbone/mini-views/alarms.scss'

import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

const supportedTypes = settings.get('availableAlarmTypes', ['DISPLAY', 'AUDIO', 'EMAIL'])
const typeTranslations = {
  DISPLAY: gt('Notification'),
  AUDIO: gt('Audio'),
  EMAIL: gt('Mail'),
  'X-SMS': gt('SMS')
}
const relatedLabels = {
  // #. Used in a selectbox when the reminder for an appointment is before the start time
  'START-': gt('before start'),
  // #. Used in a selectbox when the reminder for an appointment is after the start time
  START: gt('after start'),
  // #. Used in a selectbox when the reminder for an appointment is before the end time
  'END-': gt('before end'),
  // #. Used in a selectbox when the reminder for an appointment is after the end time
  END: gt('after end')
}
const predefinedSentences = {
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'DISPLAYSTART-': gt('Notify %1$s before start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  DISPLAYSTART: gt('Notify %1$s after start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'DISPLAYEND-': gt('Notify %1$s before end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  DISPLAYEND: gt('Notify %1$s after end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. absolute date with time: something like September 4, 1986 8:30 PM
  DISPLAYABS: gt('Notify at %1$s.'),
  // #. Used to display reminders for appointments
  DISPLAYSTART0: gt('Notify at start.'),
  // #. Used to display reminders for appointments
  DISPLAYEND0: gt('Notify at end.'),

  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'AUDIOSTART-': gt('Play sound %1$s before start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  AUDIOSTART: gt('Play sound %1$s after start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'AUDIOEND-': gt('Play sound %1$s before end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  AUDIOEND: gt('Play sound %1$s after end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. absolute date with time: something like September 4, 1986 8:30 PM
  AUDIOABS: gt('Play sound at %1$s.'),
  // #. Used to display reminders for appointments
  AUDIOSTART0: gt('Play sound at start.'),
  // #. Used to display reminders for appointments
  AUDIOEND0: gt('Play sound at end.'),

  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'EMAILSTART-': gt('Send mail %1$s before start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  EMAILSTART: gt('Send mail %1$s after start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'EMAILEND-': gt('Send mail %1$s before end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  EMAILEND: gt('Send mail %1$s after end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. absolute date with time: something like September 4, 1986 8:30 PM
  EMAILABS: gt('Send mail at %1$s.'),
  // #. Used to display reminders for appointments
  EMAILSTART0: gt('Send mail at start.'),
  // #. Used to display reminders for appointments
  EMAILEND0: gt('Send mail at end.'),

  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'SMSSTART-': gt('Send SMS %1$s before start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  SMSSTART: gt('Send SMS %1$s after start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'SMSEND-': gt('Send SMS %1$s before end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  SMSEND: gt('Send SMS %1$s after end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the time the reminder should pop up. absolute date with time: something like September 4, 1986 8:30 PM
  SMSABS: gt('Send SMS at %1$s.'),
  // #. Used to display reminders for appointments
  SMSSTART0: gt('Send SMS at start.'),
  // #. Used to display reminders for appointments
  SMSEND0: gt('Send SMS at end.'),

  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  // #. %2$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'GENERICSTART-': gt('%1$s %2$s before start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  // #. %2$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  GENERICSTART: gt('%1$s %2$s after start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  // #. %2$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  'GENERICEND-': gt('%1$s %2$s before end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  // #. %2$s: the time the reminder should pop up. relative date: 15 minutes, 3 days etc
  GENERICEND: gt('%1$s %2$s after end.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  // #. %2$s: the time the reminder should pop up. absolute date with time: something like September 4, 1986 8:30 PM
  GENERICABS: gt('%1$s at %2$s.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS, email etc
  GENERICSTART0: gt('%1$s at start.'),
  // #. Used to display reminders for appointments
  // #. %1$s: the reminder type, SMS etc
  GENERICEND0: gt('%1$s at end.')
}

const AlarmsView = DisposableView.extend({
  className: 'alarms-view',
  events: {
    'click .alarm-remove': 'onRemove',
    'change .alarm-action': 'updateModel',
    'change .alarm-time': 'updateModel',
    'change .alarm-related': 'updateModel'
  },
  initialize (options) {
    this.options = options || {}
    this.attribute = options.attribute || 'alarms'
    this.phoneNumber = options.phoneNumber
    this.supportedTypes = options.phoneNumber ? supportedTypes : supportedTypes.filter(supportedType => supportedType !== 'X-SMS')
    this.list = $('<div class="alarm-list mb-8">')

    if (this.model) {
      this.listenTo(this.model, 'change:' + this.attribute, this.updateView)
    }
  },
  render () {
    const self = this
    this.$el.empty().append(
      self.list,
      $('<button class="btn btn-default ml-4" type="button">').text(gt('Add reminder'))
        .on('click', function () {
          let duration

          if (self.attribute === 'alarms' && self.model) {
            duration = util.isAllday(self.model) ? '-PT12H' : '-PT15M'
          } else if (self.attribute === 'chronos/defaultAlarmDate' || self.attribute === 'birthdays/defaultAlarmDate') {
            duration = '-PT12H'
          } else {
            duration = '-PT15M'
          }
          const action = supportedTypes.indexOf('DISPLAY') === -1 ? supportedTypes[0] || 'DISPLAY' : 'DISPLAY'
          const node = self.createNodeFromAlarm({ action, trigger: { duration, related: 'START' } })
          self.list.append(node)
          // focus newly added alarm, to offer feedback for screen readers etc
          node.find('.alarm-action').focus()
          self.updateModel()
        })
    )
    this.updateView()
    return this
  },
  onRemove (event) {
    event.stopPropagation()
    const item = $(arguments[0].target).closest('.alarm-list-item')
    item.remove()
    this.updateModel()
  },
  updateModel () {
    if (!this.model) return
    this.changedByUser = true
    this.model.set(this.attribute, this.getAlarmsArray())
    this.changedByUser = false
  },
  updateView () {
    // user induced changes don't need a redraw, the view is already in the correct state (redraw would also cause a focus loss)
    if (this.changedByUser) return
    const self = this
    this.list.empty().append(this.model ? _(this.model.get(this.attribute)).map(self.createNodeFromAlarm.bind(self)) : [])
  },
  createNodeFromAlarm (alarm, index) {
    index = (index || this.list.children().length) + 1
    if (!alarm || !alarm.trigger) return

    const uid = _.uniqueId()
    let row

    // fieldset does not support display flex so we need an inner div to do this
    const container = $('<fieldset class="alarm-list-item rounded p-4">').data('id', alarm.uid).append(
      // #. %1$d: is the number of the reminder
      $('<legend class="sr-only">').text(gt('Reminder %1$d', index)),
      row = $('<div class="item">'))
    if (this.supportedTypes.length === 1 || this.supportedTypes.indexOf(alarm.action) === -1) {
      row.append($('<div class="alarm-action" tabindex="0">').text(typeTranslations[alarm.action] || alarm.action).val(alarm.action))
    } else {
      row.append(
        // #. screen reader label for the reminder type (audio, notification, etc)
        $('<label class="sr-only">').attr('for', 'action-' + uid).text(gt('type')),
        $('<select class="form-control alarm-action">').attr('id', 'action-' + uid).append(
          this.supportedTypes.map(type => $('<option>').text(typeTranslations[type] || type).val(type))
        ).val(alarm.action)
      )
    }

    if (alarm.trigger.duration) {
      let selectbox, relatedbox
      row.append(
        // #. screen reader label for the reminder timeframe (15 minutes, etc)
        $('<label class="sr-only">').attr('for', 'time-' + uid).text(gt('timeframe')),
        selectbox = $('<select class="form-control alarm-time">')
          .attr('id', 'time-' + uid)
          .append(Object.entries(util.getReminderOptions()).map(([key, value]) => `<option value="${key}">${value}</option>`)),
        // #. screen reader label for the reminder timeframe relation (before start, after end, etc)
        $('<label class="sr-only">').attr('for', 'related-' + uid).text(gt('timeframe relation')),
        relatedbox = $('<select class="form-control alarm-related">')
          .attr('id', 'related-' + uid)
          .append(Object.entries(relatedLabels).map(([key, value]) => `<option value="${key}">${value}</option>`))
      )

      // add custom option so we can show non standard times
      if (Object.keys(util.getReminderOptions()).indexOf(alarm.trigger.duration.replace('-', '')) === -1) {
        // test if we just have a special 0 value
        if (/^[-+]?PT0[SHDW]$/.test(alarm.trigger.duration)) {
          selectbox.find('[value="PT0M"]').val(alarm.trigger.duration.replace('-', ''))
        } else {
          selectbox.append($('<option>').val(alarm.trigger.duration.replace('-', '')).text(moment.duration(alarm.trigger.duration).humanize()))
        }
      }

      relatedbox.val((alarm.trigger.related || 'START') + alarm.trigger.duration.replace(/\w*/g, ''))
      selectbox.val(alarm.trigger.duration.replace('-', ''))
    } else {
      row.append($('<div class="alarm-time" tabindex="0">').text(moment(alarm.trigger.dateTime).format('LLL')).val(alarm.trigger.dateTime))
    }

    row.append(
      $('<button type="button" class="btn btn-link alarm-remove">')
        .attr('title', gt('Remove reminder'))
        .append(createIcon('bi/trash.svg'))
    )

    return container
  },
  getAlarmsArray () {
    const self = this
    return _(this.list.children()).map(function (item) {
      let alarm = { action: $(item).find('.alarm-action').val() }
      const time = $(item).find('.alarm-time').val()
      const related = $(item).find('.alarm-related').val()

      if (time.indexOf('-P') === 0 || time.indexOf('P') === 0) {
        alarm.trigger = { duration: related.replace(/\w*/g, '') + time, related: related.replace(/\W*/g, '') }
      } else {
        alarm.trigger = { dateTime: time }
      }
      if ($(item).data('id')) {
        alarm = Object.assign(self.model.get('alarms').find(alarm => alarm.uid === $(item).data('id')), alarm)
      }

      // Don't use empty string as summary or description if not available. Produces problems with iCal with mail
      // or audio alarms everything is optional and handled by the backend (we could add attendees, description,
      // attachments etc but we want to keep things simple until needed) do not overwrite existing descriptions.
      if ((alarm.action === 'DISPLAY' || alarm.action === 'X-SMS') && !alarm.description) {
        alarm.description = self.model ? self.model.get('summary') || 'reminder' : 'reminder'
      }
      if (alarm.action === 'X-SMS' && !alarm.attendees && self.phoneNumber) {
        alarm.attendees = [{ uri: 'tel:' + self.phoneNumber }]
      }

      return alarm
    })
  }
})

const LinkView = DisposableView.extend({
  className: 'alarms-link-view',
  events: {
    'click .alarm-link': 'openDialog'
  },
  initialize (options) {
    this.options = options || {}
    this.attribute = options.attribute || 'alarms'
    if (this.model) {
      this.listenTo(this.model, 'change:' + this.attribute, this.render)
    }
  },
  render () {
    this.$el.empty().append(
      (this.model.get(this.attribute) || []).length === 0 ? $('<button type="button" class="alarm-link btn btn-link">').text(gt('No reminder')) : this.drawList()
    ).attr('data-action', this.attribute)
    return this
  },
  drawList () {
    const node = $('<ul class="list-unstyled alarm-link-list">')
    this.model.get(this.attribute).forEach(function (alarm) {
      if (!alarm || !alarm.trigger) return
      const options = []
      let key

      if (alarm.trigger.duration) {
        options.push(util.getReminderOptions()[alarm.trigger.duration.replace('-', '')] || moment.duration(alarm.trigger.duration).humanize())
        key = (alarm.trigger.related || 'START') + (alarm.trigger.duration.indexOf('PT0') === -1 ? alarm.trigger.duration.replace(/\w*/g, '') : '0')
      } else {
        options.push(moment(alarm.trigger.dateTime).format('LLL'))
        key = 'ABS'
      }
      options.push(alarm.action)
      const pattern = predefinedSentences[alarm.action + key] || predefinedSentences['GENERIC' + key]
      node.append($('<li>').append($('<button type="button" class="alarm-link btn btn-link">').text(_.noI18n.format(pattern, options))))
    })
    return node
  },
  openDialog (options) {
    options = options || {}
    const self = this
    userApi.get({ id: options.userId }).always(function (data) {
      data = data || {}

      const model = {}
      const phoneNumber = data.cellular_telephone1 || data.cellular_telephone2
      // deepClone is needed here or the models are not detached and the attribute is bound by reference
      model[self.attribute] = _.deepClone(self.model.get(self.attribute))
      const alarmView = new AlarmsView({ model: new Backbone.Model(model), attribute: self.attribute, phoneNumber })
      new ModalDialog({ title: gt('Edit reminders') })
        .build(function () {
          this.$body.append(alarmView.render().$el)
          this.$el.addClass('alarms-view-dialog')
        })
        .addCancelButton()
        .addButton({ action: 'apply', label: gt('Apply') })
        .on('apply', function () {
          // trigger event, so we know the user set the alarms manually
          // used by edit view, to determine, if the default alarms should be applied on allday change
          self.model.trigger('userChangedAlarms')
          // if the length of the array doesn't change the model doesn't trigger a change event,so we trigger it manually
          self.model.set(self.attribute, alarmView.getAlarmsArray()).trigger('change:' + self.attribute)
          // set previous focus to new rendered alarm link button
          this.previousFocus = self.$el.find('.alarm-link.btn-link')[0]
          // trigger change on view
          // some listeners just want to listen to changes coming from this view. Useful if model is reused elsewhere (settings for example)
          self.trigger('changed', self.model.get(self.attribute))
        })
        .open()
    })
  }
})

export default {
  LinkView,
  AlarmsView
}
