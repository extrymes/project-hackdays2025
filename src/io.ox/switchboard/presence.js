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
import moment from '@open-xchange/moment'
import $ from '@/jquery'
import Backbone from '@/backbone'

import ox from '@/ox'
import api from '@/io.ox/switchboard/api'
import { settings } from '@/io.ox/switchboard/settings'
import gt from 'gettext'

const users = {}; let reconnect = false

const exports = {

  // returns jQuery node
  getPresenceString (userId) {
    const presence = this.getPresence(userId)
    return createPresenceNode(presence.availability, presence.id).append(
      $('<span class="availability">').text(this.getAvailabilityString(presence))
    )
  },

  // returns jQuery node
  getPresenceIcon (userId) {
    const presence = this.getPresence(userId)
    return createPresenceNode(presence.availability, presence.id)
  },

  getFixedPresenceIcon (availability) {
    return createPresenceIcon(availability)
  },

  // returns jQuery node
  getPresenceDot (userId) {
    const presence = this.getPresence(userId)
    return createPresenceNode(presence.availability, presence.id).addClass('dot')
  },

  getPresence (userId) {
    userId = api.trim(userId)
    if (!users[userId]) {
      this.addUser(userId, 'offline')
      try {
        api.getSocket().then(socket => {
          socket.emit('presence-get', userId, function (data) {
            exports.changePresence(userId, data)
          })
        })
      } catch (error) {
        if (ox.debug) console.error('Could not emit presence-get', error)
      }
    }
    return users[userId]
  },

  getAvailabilityString (presence) {
    switch (presence.availability) {
      case 'online':
        return gt('Online now')
      case 'busy':
        return gt('Busy')
      case 'absent':
        return gt('Absent')
      case 'invisible':
        return gt('Invisible')
      default: {
        if (!presence.lastSeen) return gt('Offline')
        // get last seen in minutes from now
        const duration = Math.ceil((_.now() - presence.lastSeen) / 60000)
        // this minute
        if (duration <= 1) return gt('Last seen a minute ago')
        // less than 1 hour
        // #. %1$d is number of minutes
        if (duration < 60) return gt('Last seen %1$d minutes ago', duration)
        // less than 24 hours -> time
        // #. %1$s is a time (e.g. 11:29 am)
        if (duration < 1440) return gt('Last seen at %1$s', moment(presence.lastSeen).format('LT'))
        // #. %1$s is a date (eg. 09.07.2020)
        return gt('Last seen on %1$s', moment(presence.lastSeen).format('L'))
      }
    }
  },

  changePresence (userId, changes) {
    const presence = this.getPresence(userId)
    if (changes.availability === presence.availability) return
    _.extend(presence, changes)
    const availability = presence.availability === 'invisible' ? 'offline' : presence.availability
    // update all DOM nodes for this user
    const $el = $(`.presence[data-id="${CSS.escape(presence.id)}"]`)
      .removeClass('online absent busy offline')
      .addClass(availability)
    const title = this.getAvailabilityString(presence)
    $el.find('.icon').attr('title', title)
    $el.find('.availability').text(title)
    if (api.isMyself(userId)) exports.trigger('change-own-availability', presence.availability)
  },

  async changeOwnAvailability (availability) {
    this.changePresence(api.userId, { availability })
    settings.set('availability', availability).save()
    // share might (soon) be: all, context, domain, (white) list
    const socket = await api.getSocket()
    socket.emit('presence-change', { availability, visibility: 'all' })
    // keep this line, even if it's double
    exports.trigger('change-own-availability', availability)
  },

  getMyAvailability () {
    return settings.get('availability', 'online')
  },

  addUser (userId, availability, lastSeen) {
    users[userId] = { id: userId, lastSeen: lastSeen || 0, availability }
  },

  users
}

// i18n
const names = {
  online: gt('Online'),
  absent: gt('Absent'),
  busy: gt('Busy'),
  offline: gt('Offline'),
  invisible: gt('Invisible')
}

// create svg-based template
const tmpl = $(
  '<div class="presence">' +
  '<span class="icon">' +
  '<svg role="img" viewbox="0 0 16 16" width="1em" height="1em" aria-hidden="true" fill="currentColor">' +
  // check
  '<path class="online" d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>' +
  // clock
  '<path class="absent" d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>' +
  // '<path class="absent" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>' +
  // dash
  '<path class="busy" d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>' +
  '</svg></span></div>'
)

function createPresenceNode (availability, id) {
  return createPresenceIcon(availability).attr('data-id', id)
}

function createPresenceIcon (availability) {
  const className = availability === 'invisible' ? 'offline' : availability
  return tmpl.clone()
    .addClass(className)
    .children('.icon').attr('title', names[availability]).end()
}

function updateUserPresences () {
  for (const userId in users) {
    if (ox.debug) console.log('Update presence for user:', userId)
    if (api.isMyself(userId)) continue
    delete users[userId]
    exports.getPresence(userId)
  }
}

(async () => {
  let socket
  try {
    socket = await api.getSocket()
  } catch (error) {
    if (ox.debug) console.error(error)
  }
  if (!socket) return
  // respond to events
  socket.on('presence-change', function (userId, presence) {
    exports.changePresence(userId, presence)
  })

  socket.on('connect', function () {
    // emit own presence from user settings on connect
    exports.changeOwnAvailability(exports.getMyAvailability())
    // we will do all updates here and not in the reconnect handler (which fires too early)
    updateUserPresences()
    if (reconnect) {
      ox.trigger('refresh^')
      ox.trigger('switchboard:reconnect')
    }
  })

  socket.on('reconnect', function () {
    // all updates after a reconnect have to be done in the connect handler
    // as the reconnect event fires too early to update i.e. the user presence.
    // We only track the state of the reconnect here
    // Order of events is: disconnect, reconnect_attempt, reconnect, connect
    reconnect = true
  })

  socket.on('disconnect', function () {
    for (const userId in users) {
      users[userId].availability = 'offline'
    }
    // update all DOM nodes for this user
    const $el = $('.presence:not(a[data-name="availability"] .presence)')
      .removeClass('online absent busy offline')
      .addClass('offline')
    const title = gt('Offline')
    $el.find('.icon').attr('title', title)
    $el.find('.availability').text(title)
    ox.trigger('switchboard:disconnect')
  })

  socket.emit('presence-get', api.userId, $.noop)
})()

exports.addUser(api.userId, exports.getMyAvailability(), _.now())

// add an event hub. we need this to publish presence state changes
_.extend(exports, Backbone.Events)

export default exports
