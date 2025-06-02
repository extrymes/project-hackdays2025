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

import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import mini from '@/io.ox/backbone/mini-views'
import AlarmsView from '@/io.ox/backbone/mini-views/alarms'
import * as util from '@/io.ox/core/settings/util'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import apps from '@/io.ox/core/api/apps'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/calendar/settings'

import gt from 'gettext'

import '@/io.ox/calendar/settings/style.scss'

ext.point('io.ox/calendar/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.CALENDAR,
        'ox.appsuite.user.sect.calendar.settings.html'
      ),
      new ExtensibleView({ point: 'io.ox/calendar/settings/detail/view', model: settings })
        .inject({
          getIntervalOptions () {
            return [5, 10, 15, 20, 30, 60].map(function (i) {
              i = String(i)
              return { label: gt('%1$d minutes', i), value: i }
            })
          },
          getTimeOptions () {
            const array = []; const m = moment().startOf('day')
            for (let i = 0; i < 24; i++) {
              array.push({ label: m.format('LT'), value: String(i) })
              m.add(1, 'hour')
            }
            return array
          },
          getWeekDays () {
            return _(new Array(7)).map(function (num, index) {
              const weekday = moment().weekday(index)
              return {
                value: weekday.day(),
                label: weekday.format('dddd')
              }
            })
          },
          getWeekLength () {
            return _(new Array(7)).map(function (num, index) {
              return {
                value: index + 1,
                label: gt.ngettext('%1$d day', '%1$d days', index + 1, index + 1)
              }
            })
          }
        })
        .build(function () {
          this.$el.addClass('settings-body io-ox-calendar-settings')
          this.listenTo(settings, 'change', function () {
            settings.saveAndYell()
          })
        })
        .render().$el
    )
  }
})

let birthdayFolderId

function getFolder () {
  if (birthdayFolderId) return folderAPI.get(birthdayFolderId)
  return folderAPI.flat({ module: 'event', all: true }).then(function (data) {
    data = _(data).chain().values().flatten().value()
    const birthdayFolder = _(data).findWhere({ 'com.openexchange.calendar.provider': 'birthdays' })
    if (!birthdayFolder) throw new Error('Cannot find birthdays folder')
    birthdayFolderId = birthdayFolder.id
    return birthdayFolder
  })
}

let INDEX = 0
ext.point('io.ox/calendar/settings/detail/view').extend(
  {
    id: 'view',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.CALENDAR_VIEW, st.CALENDAR_VIEW_EXPLANATION, 'io.ox/calendar/settings/view', true)
  },
  {
    id: 'reminders',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.APPOINTMENT_REMINDERS, st.APPOINTMENT_REMINDERS_EXPLANATION, 'io.ox/calendar/settings/reminders')
  },
  {
    id: 'timezones',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.ADDITIONAL_TIMEZONES) return
      util.renderExpandableSection(st.ADDITIONAL_TIMEZONES, st.ADDITIONAL_TIMEZONES_EXPLANATION, 'io.ox/calendar/settings/timezones').call(this, baton)
    }
  },
  {
    id: 'advanced',
    index: 10000,
    render: util.renderExpandableSection(st.CALENDAR_ADVANCED, '', 'io.ox/calendar/settings/advanced')
  }
)

INDEX = 0
ext.point('io.ox/calendar/settings/view').extend(
  //
  // Working tme
  //
  {
    id: 'working-time',
    index: INDEX += 100,
    render ({ view }) {
      this.append(
        util.fieldset(
          gt('Working Time'),
          util.explanation(
            gt('Set your preferred working hours. This timeframe will be highlighted in day, week, and workweek view. The time scale works like a zoom level. A lower number zooms in.')
          ),
          $('<div class="form-group row">').append(
            // start
            $('<div class="col-md-3">').append(
              $('<label for="settings-startTime">').text(st.WORKING_TIME_START),
              new mini.SelectView({ id: 'settings-startTime', name: 'startTime', model: settings, list: view.getTimeOptions() }).render().$el
            ),
            // end
            $('<div class="col-md-3">').append(
              $('<label for="settings-endTime">').text(st.WORKING_TIME_END),
              new mini.SelectView({ id: 'settings-endTime', name: 'endTime', model: settings, list: view.getTimeOptions() }).render().$el
            ),
            // scale
            $('<div class="col-md-3">').append(
              // #. Context: Calendar settings. Default time scale in minutes for new appointments.
              $('<label for="settings-interval">').text(st.TIME_SCALE),
              new mini.SelectView({ id: 'settings-interval', name: 'interval', model: settings, list: view.getIntervalOptions() }).render().$el
            )
          )
        )
      )
    }
  },
  //
  // Workweek
  //
  {
    id: 'workweek',
    index: INDEX += 100,
    render ({ view }) {
      this.append(
        util.fieldset(
          gt('Workweek'),
          util.explanation(
            gt('Adjust start and length if your workweek differs from the standard five-day week')
          ),
          // start & length
          $('<div class="form-group row">').append(
            // first day
            $('<div class="col-md-3">').append(
              $('<label for="settings-workweekstart">').text(st.WORKWEEK_START),
              new mini.SelectView({ id: 'settings-workweekstart', name: 'workweekStart', model: settings, list: view.getWeekDays(), integer: true }).render().$el
            ),
            // work week length
            $('<div class="col-md-3">').append(
              $('<label for="settings-numdaysworkweek">').text(st.WORKWEEK_LENGTH), // cSpell:disable-line
              new mini.SelectView({ id: 'settings-numdaysworkweek', name: 'numDaysWorkweek', model: settings, list: view.getWeekLength(), integer: true }).render().$el
            )
          )
        )
      )
    }
  }
)

INDEX = 0
ext.point('io.ox/calendar/settings/reminders').extend(
  //
  // New
  //
  {
    id: 'New',
    index: INDEX += 100,
    render () {
      const birthdayView = new AlarmsView.LinkView({ model: settings, attribute: 'birthdays/defaultAlarmDate' })
      this.append(
        $('<div class="form-group">').append(
          $('<label>').text(st.REMINDER_DEFAULT),
          new AlarmsView.LinkView({ model: settings, attribute: 'chronos/defaultAlarmDateTime' }).render().$el.addClass('supports-highlight')
        ),
        $('<div class="form-group">').append(
          $('<label>').text(st.REMINDER_ALLDAY),
          new AlarmsView.LinkView({ model: settings, attribute: 'chronos/defaultAlarmDate' }).render().$el.addClass('supports-highlight')
        ),
        capabilities.has('calendar_birthdays')
          ? $('<div class="form-group">').append(
            $('<label>').text(st.REMINDER_BIRTHDAY),
            birthdayView.render().$el.addClass('supports-highlight')
          )
          : ''
      )

      // update birthday folder data correctly
      getFolder().then(function (folderData) {
        birthdayView.on('changed', _.debounce(function () {
          folderAPI.update(birthdayFolderId, {
            // empty object as first parameter is needed to prevent folderData Object from being changed accidentally
            'com.openexchange.calendar.config': _.extend({}, folderData['com.openexchange.calendar.config'], {
              defaultAlarmDate: settings.get('birthdays/defaultAlarmDate'),
              defaultAlarmDateTime: []
            })
          })
        }, 500))
      })
    }
  }
)

INDEX = 0
ext.point('io.ox/calendar/settings/timezones').extend(
  {
    id: 'timezones',
    index: INDEX += 100,
    render () {
      const $el = $('<div>')
      this.append($el).parent().one('open', async () => {
        const { default: FavoriteView } = await import('@/io.ox/calendar/settings/timezones/favorite-view')
        new FavoriteView({ el: $el[0], model: settings }).render()
        $el.before(
          util.explanation(
            gt('Additional time zones allow you to effortlessly keep track of multiple time zones in day, workweek, and week view, eliminating the need for manual time zone calculations and simplifying time management across different regions.'),
            'ox.appsuite.user.sect.calendar.manage.timezones.html'
          ).addClass('mb-24')
        )
      })
    }
  }
)

INDEX = 0
ext.point('io.ox/calendar/settings/advanced').extend(
  {
    id: 'birthday',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.BIRTHDAY_CALENDAR) return

      const model = new Backbone.Model({ birthday: undefined })
      const checkbox = util.checkbox('birthday', st.BIRTHDAY_CALENDAR, model)
      const view = checkbox.data('view')

      checkbox.hide()

      getFolder().then(
        function (folder) {
          checkbox.show()
          model.set('birthday', !!folder.subscribed)
        },
        function () {
          checkbox.remove()
        }
      )

      view.listenTo(model, 'change:birthday', _.debounce(function (model) {
        if (_.isUndefined(model.previous('birthday'))) return
        folderAPI.update(birthdayFolderId, { subscribed: !!model.get('birthday') })
        // update selected folders
        const app = apps.get('io.ox/calendar')
        if (!app) return
        const folders = app.folders
        if (!folders) return
        app.folders[model.get('birthday') ? 'add' : 'remove'](birthdayFolderId)
      }, 500))

      this.append(checkbox)
    }
  },
  {
    id: 'advanced',
    index: 10000,
    render () {
      this.append(
        // declined
        util.checkbox('showDeclinedAppointments', gt('Show declined appointments'), settings),
        util.checkbox('chronos/allowAttendeeEditsByDefault', gt('Always mark "Participants can edit appointments" when creating or editing appointments'), settings),
        util.checkbox('markFulltimeAppointmentsAsFree', gt('Automatically mark all day appointments as "free" when creating or editing appointments'), settings),
        // category color as appointment color
        isConfigurable.CATEGORY_COLOR_FOR_APPOINTMENTS
          ? util.checkbox('categoryColorAppointments', st.CATEGORY_COLOR_FOR_APPOINTMENTS, settings)
          : $()
      )
    }
  },
  //
  // Alarms
  //
  {
    id: 'alarms',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.SHOW_PAST_REMINDERS) return
      this.append(
        // #. label for a checkbox that determines if we show reminders for appointments that are already over
        util.checkbox('showPastReminders', st.SHOW_PAST_REMINDERS, settings)
      )
    }
  },
  {
    id: 'imip',
    index: INDEX += 100,
    render () {
      const options = [
        { label: gt('Never'), value: 'NEVER' },
        { label: gt('Only from known senders'), value: 'KNOWN' },
        { label: gt('Always'), value: 'ALWAYS' }
      ]
      this.append(
        util.compactSelect('chronos/autoProcessIMip', st.AUTO_APPLY_APPOINTMENT_CHANGES, settings, options, { width: 9 })
      )
    }
  },
  //
  // Free/busy visibility
  //
  {
    id: 'freebusy',
    index: INDEX += 100,
    render () {
      if (!isConfigurable.SHARE_FREE_BUSY) return
      if (!settings.get('chronos/freeBusyVisibility')) settings.set('chronos/freeBusyVisibility', 'all')
      const options = [
        { value: 'all', label: gt('Everybody') },
        { value: 'internal-only', label: gt('Internal users only') },
        { value: 'none', label: gt('Nobody') }
      ]
      this.append(
        util.compactSelect('chronos/freeBusyVisibility', st.SHARE_FREE_BUSY, settings, options, { width: 9 })
      )
    }
  },
  //
  // Buttons
  //
  {
    id: 'shared-calendars',
    index: INDEX += 100,
    render () {
      if (!capabilities.has('edit_public_folders || read_create_shared_folders || caldav')) return

      function openDialog () {
        import('@/io.ox/core/sub/sharedFolders').then(({ default: subscribe }) => {
          subscribe.open({
            module: 'calendar',
            help: 'ox.appsuite.user.sect.calendar.folder.subscribeshared.html',
            title: gt('Subscribe to shared calendars'),
            tooltip: gt('Subscribe to calendar'),
            point: 'io.ox/core/folder/subscribe-shared-calendar',
            noSync: !capabilities.has('caldav'),
            sections: {
              public: gt('Public'),
              shared: gt('Shared'),
              private: gt('Private'),
              hidden: gt('Hidden')
            }
          })
        })
      }

      this.append(
        $('<div class="mt-24">').append(
          $('<button type="button" class="btn btn-default" data-action="subscribe-shared-calendars">')
            .append(
              $.txt(gt('Subscribe to shared calendars'))
            )
            .on('click', openDialog)
        )
      )
    }
  }
)
