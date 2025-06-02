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

import _ from '@/underscore'
import $ from '@/jquery'

import ext from '@/io.ox/core/extensions'
import presence from '@/io.ox/switchboard/presence'
import api from '@/io.ox/switchboard/api'
import account from '@/io.ox/core/api/account'
import contactsAPI from '@/io.ox/contacts/api'
import * as util from '@/io.ox/contacts/util'
import callHistory from '@/io.ox/switchboard/views/call-history'
import '@/io.ox/switchboard/style.scss'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'

addReadyListener('capabilities:user', (capabilities) => {
  // no presence state for anonymous guests (check if they are allowed to edit their contact/user data to distinguish between invited by mail or anonymous link)
  if (capabilities.has('guest') && settings.get('user/internalUserEdit', true) === false) return
  // extend account dropdown
  ext.point('io.ox/core/appcontrol/right/account').extend({
    id: 'availability',
    index: 10,
    extend () {
      const self = this
      function addPresenceIcon () {
        _.defer(function () {
          self.$toggle.append(presence.getPresenceIcon(api.userId))
        })
      }
      // add to account dropdown
      const availability = presence.getMyAvailability()
      this.model.set('availability', availability)
      this.group(gt('Availability'))
      const options = { radio: true, group: true }
      _(availabilities).keys().forEach(function (type) {
        options.icon = presence.getFixedPresenceIcon(type)
        this.option('availability', type, availabilities[type], options)
      }, this)
      this.divider()

      // respond to user changes
      this.model.on('change:availability', function (model, availability) {
        presence.changeOwnAvailability(availability)
      })

      // redraw presence icon after updating contact picture (OXUIB-497)
      contactsAPI.on('reset:image update:image', addPresenceIcon)

      // respond to automatic state changes
      presence.on('change-own-availability', function (availability) {
        this.model.set('availability', availability)
      }.bind(this))

      // finally, add presence icon to dropdown node
      addPresenceIcon()
    }
  })

  const availabilities = {
    online: gt('Online'),
    absent: gt('Absent'),
    busy: gt('Busy'),
    invisible: gt('Invisible')
  }

  // extend list view in contacts
  ext.point('io.ox/contacts/mediator').extend({
    id: 'presence',
    after: 'vgrid',
    setup (app) {
      app.grid.addTemplate({
        build () {
          const $el = $('<div class="presence">')
          this.append($el)
          return { presence: $el }
        },
        set (data, fields) {
          fields.presence.toggle(String(data.folder_id) === util.getGabId())
          const icon = presence.getPresenceIcon(data.email1)
          fields.presence.replaceWith(icon)
          fields.presence = icon
        }
      })
    }
  })

  // extend list view in mail
  ext.point('io.ox/mail/listview/item/default').extend({
    id: 'presence',
    after: 'avatar',
    draw (baton) {
      if (!baton.app) return
      if (baton.app.props.get('listViewLayout') !== 'avatars') return
      const data = baton.data
      const who = account.is('sent|drafts', data.folder_id) ? data.to : data.from
      if (!who || !who.length) return
      const id = who[0][1]
      if (!api.isInternal(id)) return
      this.append(presence.getPresenceDot(id))
    }
  })

  // extend mail detail view
  ext.point('io.ox/mail/detail/header').extend({
    id: 'presence',
    after: 'picture',
    draw (baton) {
      const who = baton.data.from
      if (!who || !who.length) return
      const id = who[0][1]
      if (!api.isInternal(id)) return
      this.append(presence.getPresenceIcon(id))
    }
  })

  // add call history
  ext.point('io.ox/core/appcontrol/right').extend({
    id: 'call-history',
    // 100 is notifications, 120 is app launcher
    index: 110,
    draw () {
      if (!api.supports('history')) return
      this.append(callHistory.view.$el)
    }
  })
})
