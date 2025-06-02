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
import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import * as util from '@/io.ox/core/settings/util'
import capabilities from '@/io.ox/core/capabilities'
import desktopNotifications from '@/io.ox/core/desktopNotifications'
import yell from '@/io.ox/core/yell'
import { toggleSettings, getTogglePath } from '@/io.ox/core/feature'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import { settings as tasksSettings } from '@/io.ox/tasks/settings'
import gt from 'gettext'

const point = 'io.ox/settings/notifications'

ext.point(`${point}/settings/detail`).extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.NOTIFICATIONS,
        'ox.appsuite.user.sect.settings.notifications.html'
      ),
      new ExtensibleView({ point, model: settings })
        .inject({
          // this gets overwritten elsewhere
          getSoundOptions () {
            return [{ label: gt('Bell'), value: 'bell' }]
          }
        })
        .build(function () {
          this.$el.addClass('settings-body')
          this.listenTo(settings, 'change', () => settings.save())
          this.listenTo(mailSettings, 'change', () => mailSettings.save())
          this.listenTo(calendarSettings, 'change', () => calendarSettings.save())
          this.listenTo(tasksSettings, 'change', () => tasksSettings.save())
        })
        .render().$el
    )
  }
})

let INDEX = 0
ext.point(point).extend(
  {
    id: 'desktop',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.DESKTOP_NOTIFICATIONS, st.DESKTOP_NOTIFICATIONS_EXPLANATION, `${point}/desktop`, true)
  },
  {
    id: 'area',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.NOTIFICATION_AREA, st.NOTIFICATION_AREA_EXPLANATION, `${point}/area`)
  },
  {
    id: 'mail',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.NOTIFICATIONS_MAIL) return
      return util.renderExpandableSection(st.NOTIFICATIONS_MAIL, st.NOTIFICATIONS_MAIL_EXPLANATION, `${point}/mail`).call(this, baton)
    }
  },
  {
    id: 'calendar',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.NOTIFICATIONS_CALENDAR, st.NOTIFICATIONS_CALENDAR_EXPLANATION, `${point}/calendar`)
  },
  {
    id: 'tasks',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.NOTIFICATIONS_TASKS, st.NOTIFICATIONS_TASKS_EXPLANATION, `${point}/tasks`)
  }
)

ext.point(`${point}/desktop`).extend(
  {
    id: 'request-notifications',
    index: INDEX += 100,
    render ({ view }) {
      // mobile browsers generally don't support push notifications
      // and by design browsers only allow asking if there was no decision yet
      if (!desktopNotifications.isSupported() || desktopNotifications.getPermissionStatus().match(/granted|denied/)) {
        view.$requestLink = $()
        return
      }

      // add ask now link
      // Opens a native browser popup to decide if this applications/website is allowed to show notifications
      view.$requestLink = $('<a href="#" role="button" class="request-desktop-notifications">')
        .text(gt('Manage browser permissions now'))
        .on('click', function (e) {
          e.preventDefault()
          desktopNotifications.requestPermission(result => {
            if (result !== 'default') view.$requestLink.hide()
            switch (result) {
              case 'granted': settings.set('showDesktopNotifications', true).save(); break
              case 'denied': settings.set('showDesktopNotifications', false).save(); break
              // no default
            }
          })
        })

      view.listenTo(settings, 'change:showDesktopNotifications', (value) => {
        if (value !== true) return
        desktopNotifications.requestPermission(function (result) {
          if (view.disposed) return
          if (result !== 'default') view.$requestLink.hide()
          if (result !== 'denied') return
          // revert if user denied the permission
          // also yell message, because if a user pressed deny in the request permission dialog there is no way we can ask again.
          // The user has to do this in the browser settings, because the api blocks any further request permission dialogs.
          yell('info', gt('Please check your browser settings and enable desktop notifications for this domain'))
          settings.set('showDesktopNotifications', false)
        })
      })
    }
  },
  //
  // Options
  //
  {
    id: 'options',
    render ({ view }) {
      this.append(
        util.explanation(
          gt('Desktop notifications are a convenient feature as they can still notify you even if you have multiple tabs open in your browser. You don\'t necessarily have to keep App Suite as the active tab or constantly check it to stay updated.')
        ),
        util.checkbox('showDesktopNotifications', gt('Show desktop notifications'), settings)
          .append($('<br>'), view.$requestLink)
      )
    }
  }
)

INDEX = 0
ext.point(`${point}/area`).extend(
  {
    id: 'options',
    index: INDEX += 100,
    render ({ view, model }) {
      this.append(
        util.checkbox('autoOpenNewReminders', st.NOTIFICATIONS_AUTOOPEN, settings),
        capabilities.has('contacts') ? util.checkbox('showBirthdayNotifications', st.NOTIFICATIONS_BIRTHDAYS, settings) : $()
      )
    }
  }
)

INDEX = 0
ext.point(`${point}/mail`).extend(
  {
    id: 'sound',
    index: INDEX += 100,
    render ({ view, model }) {
      if (!isConfigurable.SOUND_MAIL_INCOMING) return

      this.append(
        util.checkbox('playSound', st.SOUND_MAIL_INCOMING, mailSettings),
        util.compactSelect('notificationSoundName', st.SOUND_MAIL_INCOMING_NAME, mailSettings, view.getSoundOptions())
          .prop('disabled', !mailSettings.get('playSound'))
      )

      view.listenTo(mailSettings, 'change:playSound', function (value) {
        view.$('[name="notificationSoundName"]').prop('disabled', !value ? 'disabled' : '')
      })
    }
  }
)

INDEX = 0
ext.point(`${point}/calendar`).extend(
  {
    id: 'countdown',
    index: INDEX += 100,
    render ({ view }) {
      if (!isConfigurable.COUNTDOWN) return
      const leadTimeOptions = [
        { label: gt('1 minute before the appointment starts'), value: '1' },
        { label: gt('5 minutes before the appointment starts'), value: '5' },
        { label: gt('10 minutes before the appointment starts'), value: '10' },
        { label: gt('15 minutes before the appointment starts'), value: '15' },
        { label: gt('30 minutes before the appointment starts'), value: '30' }
      ]
      this.append(
        util.fieldset(
          st.COUNTDOWN,
          // #. label for a checkbox in settings; it's about a visual countdown to remind the user about upcoming meetings
          util.checkbox(getTogglePath('countdown'), st.COUNTDOWN_SHOW, toggleSettings),
          util.checkbox('countdown/meetingsOnly', st.COUNTDOWN_MEETINGS_ONLY, calendarSettings),
          util.compactSelect('countdown/leadTime', st.COUNTDOWN_LEADTIME, calendarSettings, leadTimeOptions)
        ).addClass('countdown-settings')
      )
      function toggle (value) {
        this.$('[name="countdown/meetingsOnly"],[name="countdown/leadTime"]').prop('disabled', !value)
      }
      toggle.call(view, getTogglePath('countdown'))
      view.listenTo(toggleSettings, 'change:' + getTogglePath('countdown'), toggle.bind(view))
    }
  },
  {
    id: 'email',
    index: INDEX += 100,
    render () {
      this.append(
        util.fieldset(
          gt('Email notifications'),
          util.checkbox('notifyNewModifiedDeleted', st.CALENDAR_NOTIFY_MODIFY, calendarSettings),
          util.checkbox('notifyAcceptedDeclinedAsCreator', st.CALENDAR_NOTIFY_DECLINED_CREATOR, calendarSettings),
          util.checkbox('notifyAcceptedDeclinedAsParticipant', st.CALENDAR_NOTIFY_DECLINED_PARTICIPANT, calendarSettings),
          util.checkbox('deleteInvitationMailAfterAction', st.CALENDAR_DELETE_INVITATION_AFTER_ACTION, calendarSettings)
        ).addClass('calendar-email-notifications')
      )
    }
  }
)

INDEX = 0
ext.point(`${point}/tasks`).extend(
  {
    id: 'email',
    index: INDEX += 100,
    render () {
      this.append(
        util.fieldset(
          gt('Email notifications'),
          util.checkbox('notifyNewModifiedDeleted', st.TASKS_NOTIFY_MODIFY, tasksSettings),
          util.checkbox('notifyAcceptedDeclinedAsCreator', st.TASKS_NOTIFY_DECLINED_CREATOR, tasksSettings),
          util.checkbox('notifyAcceptedDeclinedAsParticipant', st.TASKS_NOTIFY_DECLINED_PARTICIPANT, tasksSettings)
        ).addClass('tasks-email-notifications')
      )
    }
  }
)
