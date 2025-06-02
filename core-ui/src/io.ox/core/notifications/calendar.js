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
import ext from '@/io.ox/core/extensions'

import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import capabilities from '@/io.ox/core/capabilities'
import { createIcon } from '@/io.ox/core/components'
import { invoke } from '@/io.ox/backbone/views/actions/util'
import { renderPersonalName } from '@/io.ox/core/util'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'
// yes task util, we use the same array for both
import { buildOptionArray, computePopupTime } from '@/io.ox/tasks/util'
import { getDateTimeIntervalMarkup, ZULU_FORMAT, getMoment, openDeeplink, cid } from '@/io.ox/calendar/util'
import { BaseView } from '@/io.ox/core/notifications/views'
import { Adapter, collection as notificationsCollection } from '@/io.ox/core/notifications/api'
import calendarAPI from '@/io.ox/calendar/api'
import { playAlarm } from '@/io.ox/core/notifications/audio'
import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

import moment from '@open-xchange/moment'
import { mediator } from '@/io.ox/core/notifications/util'
import '@/io.ox/calendar/actions'

if (capabilities.has('calendar')) {
  calendarAPI.on('before:confirm', requestParams => {
    const { id, folder } = requestParams
    const model = notificationsCollection.findWhere({ id, folder })
    if (model) model.set('pendingRequest', true)
  })
  calendarAPI.on('after:confirm', requestParams => {
    const { id, folder } = requestParams
    const model = notificationsCollection.findWhere({ id, folder })
    if (model) model.set('pendingRequest', false)
  })

  mediator('io.ox/notifications/adapter', {

    'appointment:reminder': api => {
      const type = 'appointment:reminder'
      const detail = 'appointment'
      const label = gt('Appointment reminder')
      const adapter = new Adapter({ type, detail, label, api, autoOpen: settings.get('autoOpenNewReminders', false) })

      settings.on('change:autoOpenNewReminders', adapter.changeAutoOpen.bind(adapter))

      // add
      calendarAPI.on('resetChronosAlarms', items => {
        // remove items that are in the collection but not in the array of items to display
        adapter.prune(items)

        // items that are already in the collection will not trigger any change
        for (const item of items) {
          adapter.add({
            app: 'calendar',
            category: 'reminder',
            id: item.alarmId,
            folder_id: item.folder,
            recurrenceId: item.recurrenceId,
            alarmId: item.alarmId,
            time: item.time,
            // for convenience (easier use of calendar API)
            eventId: item.eventId,
            folder: item.folder
          })
        }
      })

      adapter.cid = data => `${type}:${data.folder}/${data.alarmId}`

      adapter.fetch = model => {
        const models = model ? [model] : adapter.list()
        return Promise.allSettled(models.map(async (model) => {
          const eventModel = await calendarAPI.get(model)
          model.set({
            // make sure to keep data from the alarm separate from the data about the calendar event. We don't want mixups here because that causes id issues.
            eventModel,
            title: eventModel.get('summary')
          })
          model.fetched = true
        }))
      }

      adapter.getShowtime = model => moment(model.get('time')).utc().valueOf()

      adapter.readyToShow = model => !model.get('pendingRequest') && adapter.getShowtime(model) <= Date.now()

      // sort by reminder start date
      adapter.getSortName = model => {
        // not yet fetched. no sorting possible
        if (!model.get('eventModel')) return 1
        return getMoment(model.get('eventModel').get('startDate')).utc().valueOf()
      }

      adapter.on = async (eventname, model, value) => {
        switch (eventname) {
          case 'open':
            return openDeeplink(cid(model.get('eventModel').attributes))
          case 'close':
            model.set('pendingRequest', true)
            try {
              await calendarAPI.acknowledgeAlarm(model.toJSON())
              return api.collection.remove(model)
            } catch (error) {
              model.set('pendingRequest', false)
            }
            break
          case 'snooze':
            model.set('pendingRequest', true)
            try {
              // use task util here. No need for code duplication
              await calendarAPI.remindMeAgain({ ...model.toJSON(), time: computePopupTime(value).alarmDate - Date.now() })
              api.collection.remove(model)
            } catch (error) {
              model.set('pendingRequest', false)
            }
          // no default
        }
      }
    },

    'appointment:invitation': api => {
      const type = 'appointment:invitation'
      const detail = 'appointment'
      const label = gt('Appointment invitation')
      const adapter = new Adapter({ type, detail, label, api })

      // add
      calendarAPI.on('new-invites', items => {
        adapter.prune(items)
        for (const item of items) {
          const invitationData = {
            app: 'calendar',
            category: 'invitation',
            folder_id: item.folder,
            folder: item.folder,
            title: item.summary,
            id: item.id,
            startDate: item.startDate,
            endDate: item.endDate
          }
          if (item.attendeeData) invitationData.attendeeData = item.attendeeData
          adapter.add(invitationData)
        }
      })

      // set status
      calendarAPI.on('mark:invite:confirmed delete:appointment', (appointment) => {
        api.collection.remove(api.collection.findWhere({ id: appointment.id, folder: appointment.folder }))
      })

      adapter.fetch = model => {
        const models = model ? [model] : adapter.list()
        return Promise.allSettled(models.map(async (model) => {
          const calendarModel = await calendarAPI.get(model)
          const subset = calendarModel.pick('rrule', 'flags', 'recurrenceId', 'flags', 'organizer', 'location', 'seriesId')
          model.set(subset)
        }))
      }

      // sort by event start date
      adapter.getSortName = model => getMoment(model.get('startDate')).valueOf()

      adapter.on = (eventname, model) => {
        const baton = ext.Baton({ data: model.toJSON() })
        switch (eventname) {
          case 'participate/yes':
          case 'participate/maybe':
          case 'participate/no':
          case 'changestatus':
            return invoke('io.ox/calendar/detail/actions/' + eventname, baton)
          case 'open':
            return openDeeplink(cid(model.attributes))
        // no default
        }
      }
    },

    'resource:invitation': api => {
      const type = 'resource:invitation'
      const detail = 'appointment'
      const label = gt('Resource booking request')
      const adapter = new Adapter({ type, detail, label, api })

      // add
      calendarAPI.on('resource-requests', items => {
        adapter.prune(items)
        for (const item of items) {
          const invitationData = {
            app: 'calendar',
            category: 'resource',
            folder_id: item.folder,
            folder: item.folder,
            title: item.attendeeData.cn,
            summary: item.summary,
            id: item.id,
            startDate: item.startDate,
            endDate: item.endDate,
            attendeeData: item.attendeeData
          }
          adapter.add(invitationData)
        }
      })

      adapter.fetch = model => {
        const models = model ? [model] : adapter.list()
        return Promise.allSettled(models.map(async (model) => {
          const calendarModel = await calendarAPI.get(model)
          const subset = calendarModel.pick('attendees', 'rrule', 'flags', 'recurrenceId', 'flags', 'organizer', 'location', 'seriesId')
          model.set(subset)
        }))
      }

      // sort by event start date
      adapter.getSortName = model => getMoment(model.get('startDate')).valueOf()

      adapter.on = (eventname, model) => {
        const baton = ext.Baton({ data: model.toJSON() })
        switch (eventname) {
          case 'participate/yes':
          case 'participate/maybe':
          case 'participate/no':
          case 'changestatus':
            return invoke('io.ox/calendar/detail/actions/' + eventname, baton)
          case 'open':
            return openDeeplink(cid(model.attributes))
        // no default
        }
      }
    },

    'calendar:initial-fetch': () => {
    // load and invoke plugins with delay
      setTimeout(() => {
        calendarAPI.getInvites()
        calendarAPI.getAlarms()
      }, 5000)
    }
  })
}

const AppointmentBaseView = BaseView.extend({

  renderTime (action = $(), options = {}) {
    const model = this.model.get('eventModel') || this.model
    // no timezone label. Makes keyboard navigation difficult and takes up space
    const dateTime = getDateTimeIntervalMarkup(model.pick('startDate', 'endDate'), { zone: moment().tz(), noTimezoneLabel: true }) || $()
    const capitalFirstLetter = (string) => string[0].toUpperCase() + string.slice(1)
    dateTime.find('.date').replaceWith(
      $(`<a class="date" data-name="open" title="${gt('Open in calendar')}" tabindex="0">`).text(dateTime.find('.date').text())
    )

    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Date')}">`).append(
          createIcon('bi/clock.svg').addClass('row-icon')
        ),
        $('<div class="flex-grow">').append(
          dateTime.addClass('ellipsis-2-lines'),
          options.showRelativeTime ? $('<div class="relative-time">').text(capitalFirstLetter(getMoment(model.get('startDate')).fromNow())) : '',
          options.showRecurrence ? this.renderRecurrence() : ''
        ),
        action
      )
    )
  },

  renderRecurrence () {
    const model = this.model.get('eventModel') || this.model
    const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(new RecurrenceRuleMapModel({ model }))
    if (recurrenceString === '') return ''
    return $('<div class="recurrence ellipsis-2-lines">').text(recurrenceString)
  },

  renderOrganizer () {
    const model = this.model.get('eventModel') || this.model
    const organizer = model.get('organizer')
    if (!organizer) return

    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Organizer')}">`).append(
          createIcon('bi/person.svg').addClass('row-icon')
        ),
        $('<div class="organizer truncate">').append(
          renderPersonalName({
            name: organizer.cn,
            email: organizer.email,
            user_id: organizer.entity
          }, { nohalo: true })
        )
      )
    )
  }
})

export const AppointmentReminderView = AppointmentBaseView.extend({
  render () {
    this.$el.attr('data-cid', _.cid(this.model.get('eventModel')?.pick('id', 'recurrenceId', 'folder')))
    const dropdown = new Dropdown({
      $toggle: $('<button type="button" class="btn btn-toolbar action">').attr('aria-label', gt('Remind me again')).append($('<div aria-hidden="true">').attr('title', gt('Remind me again')).append(createIcon('bi/three-dots.svg')))
    })
    // #. Header for a dropdown menu. This is followed by a list of dates: in 2 Minutes, tomorrow, next week etc.
      .header(gt('Remind me again'))
    buildOptionArray({ divider: true }).forEach(([value, text], index) => {
      if (value === '---') dropdown.divider(); else dropdown.option('snooze', value, text)
    })

    this.$el.empty()
    this.renderTitle(createIcon('bi/bell.svg'))
    this.renderTime(dropdown.render().$el, { showRelativeTime: true })
    this.renderLocation()
    return this
  }
})

export const AppointmentInvitationView = AppointmentBaseView.extend({

  render () {
    this.$el.empty()
    const calendarIcon = createIcon('bi/ox-calendar.svg')
    calendarIcon.one('load', () => {
      calendarIcon[0].getElementsByTagName('text')[0].textContent = String(moment(this.model.get('startDate').value).date())
    })
    this.renderTitle(calendarIcon, { closable: false })
    this.renderTime('', { showRecurrence: true })
    this.renderDescription()
    this.renderLocation()
    this.renderOrganizer()
    this.renderActions()
    return this
  },

  renderActions () {
    const button = (action, title) => /* html */`<button type="button" class="btn btn-default truncate" title="${title}" data-action="${action}"><div class="truncate">${title}</div></button>`
    const template = /* html */`
      <div class="item-row actions-container">
        <div class="actions flex-grow">
          <div class="btn-group" role="group" aria-label="${gt('Change participation')}">
            ${button('participate/yes', gt.pgettext('appointment participation status', 'Accept'))}
            ${button('participate/maybe', gt.pgettext('appointment participation status', 'Maybe'))}
            ${button('participate/no', gt.pgettext('appointment participation status', 'Decline'))}
            <button type="button" class="icon btn btn-default" data-action="changestatus" aria-label="${gt('Add comment')}"></button>
          </div>
        </div>
      </div>`

    // icon cannot be included in template because of weird createIcon implementation
    this.$el.append(template).find('.icon').append(
      $(`<div aria-hidden="true" title="${gt('Add comment')}">`).append(createIcon('bi/three-dots.svg'))
    )
  }
})

export const ResourceInvitationView = AppointmentInvitationView.extend({
  render () {
    this.$el.empty()
    this.renderTitle(createIcon('bi/gear.svg'), { closable: false })
    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Appointment title')}">`).append(
          createIcon('bi/calendar2.svg').addClass('row-icon')
        ),
        $('<div class="appointment-title truncate">').text(this.model.get('summary'))
      )
    )
    this.renderTime('', { showRecurrence: true })
    this.renderDescription()
    this.renderLocation()
    this.renderOrganizer()
    this.renderActions()
    return this
  }
})

export function registerAppointmentAudioAlarm () {
  let alarmCache = []
  let alarmTimer
  function updateTimer (alarms) {
    clearTimeout(alarmTimer)
    if (alarms) alarmCache = alarms
    alarmCache = _.sortBy(alarmCache, 'time')
    const now = moment().utc().format(ZULU_FORMAT)
    while (alarmCache.length && alarmCache[0].time < now) {
      const alarm = alarmCache.shift()
      calendarAPI.get({ id: alarm.eventId, folder: alarm.folder }).done(eventModel => {
        calendarAPI.acknowledgeAlarm(alarm)
        playAlarm({ type: 'eventAlarm', yell: eventModel?.get('summary') || gt('Appointment reminder') })
      })
    }
    if (!alarmCache.length) return
    alarmTimer = setTimeout(updateTimer, moment(alarmCache[0].time).utc().valueOf() - Date.now())
  }
  calendarAPI.on('resetAudioAlarms', (alarms = []) => {
    updateTimer(alarms)
  })
}
