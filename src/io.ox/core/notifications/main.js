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

import Backbone from '@/backbone'
import _ from '@/underscore'
import ox from '@/ox'

import a11y from '@/io.ox/core/a11y'
import $ from '@/jquery'
import gt from 'gettext'
import capabilities from '@/io.ox/core/capabilities'
import api, { registry as adapterRegistry, collection, hashMap } from '@/io.ox/core/notifications/api'
import { mediate, mediator } from '@/io.ox/core/notifications/util'
import { MainView, ToggleView, registry as viewRegistry } from '@/io.ox/core/notifications/views'
import { TaskInvitationView, TaskReminderView, TaskOverdueView } from '@/io.ox/core/notifications/task'
import { AppointmentReminderView, AppointmentInvitationView, registerAppointmentAudioAlarm, ResourceInvitationView } from '@/io.ox/core/notifications/calendar'
import { registerUnreadIndicator, registerDesktopNotifications, registerMailAudioAlarm } from '@/io.ox/core/notifications/mail'
import { BirthdayReminderView } from '@/io.ox/core/notifications/contacts'
import desktopNotifications from '@/io.ox/core/desktopNotifications'
import { hasFeature } from '@/io.ox/core/feature'

// export this, so other apps can use it as an event hub if needed (trigger hide etc)
export const controller = { POINT: 'io.ox/notifications', ...Backbone.Events }

mediator(controller.POINT, {

  views (controller) {
    controller.mainView = new MainView({ controller })
    controller.toggleView = new ToggleView({ el: $('#io-ox-toprightbar #io-ox-notifications-toggle') })
    controller.toggleView.render()
    if (_.device('smartphone')) return
    // there is just not enough logic to make this a real view
    controller.backdrop = $('<div class="notification-backdrop">')
  },

  unseen () {
    // manage seen hash
    collection.on('add remove', markAsSeen)
    collection.on('notificationReady', markAsSeen)
    controller.mainView.on('main:visibility-change', markAsSeen)

    function markAsSeen (model) {
      if (!controller.mainView.$el.hasClass('visible')) return
      // duck check
      hashMap.add(model?.set ? model : collection.getUnseen())
    }

    // indicator state
    collection.on('add remove notificationReady', _.debounce(controller.toggleView.updateIndicator.bind(controller.toggleView), 1000))
  },

  events (controller) {
    const hide = () => controller.mainView?.toggle(false)
    controller.firstOpen = true
    controller.appendNodes = () => {
      if (!controller.firstOpen) return
      controller.firstOpen = false
      // append nodes
      $('#io-ox-core').append(controller.backdrop, controller.mainView.render().$el)
      // bind redraw events
      controller.mainView.bindEvents()
    }
    controller.listenTo(controller.toggleView, 'main:toggle', () => {
      // append and render only when first openend. We do this to speed up boot time
      if (controller.firstOpen) {
        controller.appendNodes()
        // delay toggle, animation is not correctly drawn otherwise
        return _.delay(() => controller.mainView.toggle(), 100)
      }
      controller.mainView.toggle()
    })
    controller.listenTo(controller.toggleView, 'main:hide', hide)

    controller.listenTo(controller.mainView, 'main:visibility-change', visible => {
      controller.backdrop?.toggleClass('visible', visible)
      controller.toggleView.updateIndicator()
      // if visible focus main view
      if (visible) return a11y.getTabbable(controller.mainView.$el)[0]?.focus()
      // if hidden focus toggle button
      controller.toggleView.$('button').focus()
    })

    controller.backdrop?.on('click', hide)
    // used by other apps if they need to close the notification area (import controller, trigger hide)
    controller.on('hide', hide)
  },

  autoOpen () {
    // autoOpen is used if a related setting changes to force a possible autoopen
    collection.on('add remove notificationReady autoOpen', _.debounce(() => {
      // auto open notification area if we have any unseen notifications marked with autoOpen (only reminders currently)
      if (!collection.getUnseen().some(notification => notification.getAdapter().autoOpen)) return
      if (controller.firstOpen) {
        controller.appendNodes()
        // delay toggle, animation is not correctly drawn otherwise
        return _.delay(() => controller.mainView.toggle(true), 100)
      }
      controller.mainView?.toggle(true)
    }, 1000))
  },

  restoreFocus (controller) {
    ox.on('restoreFocus:failed', (previousActiveElement) => controller.mainView.restoreFocus())
  },

  async appointments () {
    if (!capabilities.has('calendar')) return
    viewRegistry['appointment:invitation'] = AppointmentInvitationView
    if (hasFeature('managedResources')) viewRegistry['resource:invitation'] = ResourceInvitationView
    viewRegistry['appointment:reminder'] = AppointmentReminderView
    // audio alarms
    registerAppointmentAudioAlarm()
  },

  async tasks () {
    if (!capabilities.has('tasks')) return
    viewRegistry['task:invitation'] = TaskInvitationView
    viewRegistry['task:reminder'] = TaskReminderView
    viewRegistry['task:overdue'] = TaskOverdueView
  },

  async mail () {
    // no dynamic imports
    if (!capabilities.has('webmail')) return
    registerMailAudioAlarm()
    registerUnreadIndicator()
    registerDesktopNotifications()
  },

  async contacts () {
    if (!capabilities.has('contacts')) return
    viewRegistry['contacts:reminder'] = BirthdayReminderView
  },

  async desktop () {
    // cache to store ids of already shown notifications
    const cache = []
    const showNotifications = () => {
      // no underscore
      collection.getCurrent().forEach(async notification => {
        if (cache.includes(notification.get('cid'))) return
        cache.push(notification.get('cid'))

        if (!notification.get('title')) await adapterRegistry[notification.get('type')]?.fetch(notification)

        let title = ''
        // compact
        switch (notification.get('type')) {
          case 'appointment:reminder':
          case 'task:reminder':
          case 'task:overdue':
            // #. %1$s is the title of a task or appointment
            title = gt('Reminder for: %1$s', notification.get('title'))
            break
          case 'appointment:invitation':
          case 'task:invitation':
            // #. %1$s is the title of a task or appointment
            title = gt('Invitation for: %1$s', notification.get('title'))
            break
          case 'resource:invitation':
            // #. %1$s is the name of a resource ("conference room" etc)
            title = gt('Resource booking request for: %1$s', notification.get('title'))
        }

        desktopNotifications.show(title)
      })
    }
    collection.on('add notificationReady pendingRequest', _.debounce(() => {
      // collection is currently fetching api data. wait for it to finish, instead of triggering more requests
      if (collection.fetching) return collection.once('fetch:done', showNotifications)
      showNotifications()
    // use long delay here and wait until notifications stop arriving
    }, 1000))
  },

  adapter () {
    mediate('io.ox/notifications/adapter', api)
  }
})

export const initNotifications = () => mediate(controller.POINT, controller)
