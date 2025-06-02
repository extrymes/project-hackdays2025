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
import ox from '@/ox'
import moment from '@/io.ox/core/moment'
import { hasFeature } from '@/io.ox/core/feature'

import { io } from 'socket.io-client'
import cap from '@/io.ox/core/capabilities'

let socket
const URI = ox.serverConfig.websocketUri ? ox.serverConfig.websocketUri : ox.abs
let isConnected = false
const debug = _.url.hash('socket-debug') || ox.debug
let connectionId = getId()
const options = {
  query: {
    session: ox.session,
    connection: connectionId
  },
  forceNew: true,
  reconnection: true,
  path: '/socket.io/appsuite',
  transports: ['websocket'], // do not change, middleware only support sockets not http polling
  reconnectionAttempts: 25, // max retries, each retry doubles the reconnectionDelay
  randomizationFactor: 0.0, // randomize reconnect delay by +/- (factor * delay) ( 0 <= factor <= 1)
  reconnectionDelay: 1000, // delay for the first retry
  reconnectionDelayMax: 10 * 60 * 1000 // 10 min. max delay between a reconnect (reached after approximately 10 retries)
}
ox.websocketlog = ox.websocketlog || []

function getId () {
  // ie 11 has the ms prefix
  const cryptoObj = window.crypto || window.msCrypto
  // better random numbers than Math.random
  return String(_.now()) + cryptoObj.getRandomValues(new window.Uint32Array(1))[0]
}

function log (event, reason) {
  try {
    ox.websocketlog.push({
      timestamp: _.now(),
      date: moment().format('D.M.Y HH:mm:ss'),
      event
    })
  } catch (e) {
    console.log(e)
  }
}

function connectSocket () {
  if (!hasFeature('pns')) ox.socketConnectionId = connectionId
  const def = $.Deferred()
  // connect Websocket
  if (debug) log('Websocket trying to connect...')
  socket = io(URI, options)
  // expose global variable for debugging
  if (debug) window.socket = socket
  socket.on('connect', function () {
    if (debug) log('Websocket connected!')
    isConnected = true
    def.resolve(socket)
  })
  socket.on('disconnect', function (reason) {
    if (debug) log(`Websocket disconnected: ${reason}`)
    isConnected = false
  })
  socket.on('reconnect', function () {
    if (debug) log('Websocket was reconnected')
    isConnected = true
  })
  socket.on('reconnecting', function () {
    if (debug) log('Websocket trying to reconnect')
  })
  socket.on('connect_error', function (error) {
    if (debug) log(`Websocket connection error: ${error}`)
    if (socket.io.backoff.attempts === options.reconnectionAttempts) {
      ox.trigger('socket:maxreconnections:reached')
      if (debug) log('Max reconnection attempts for socket reached, stopping reconnection.')
    }
    def.reject()
  })
  socket.on('connect_timeout', function () {
    if (debug) log('Websocket connection timeout')
    def.reject()
  })

  // close socket on invalid session
  socket.on('session:invalid', function () {
    if (debug) log('Websocket disconnected due to invalid session')
    if (socket.connected) socket.close()
  })

  ox.on('relogin:required', function () {
    if (debug) log('Websocket disconnected due to invalid session')
    if (socket.connected) socket.close()
  })

  // reconnect socket on new session
  ox.on('relogin:success', function () {
    if (socket.disconnected) {
      if (debug) log('Websocket reconnecting with new session')
      if (socket.disconnected) {
        if (!hasFeature('pns')) ox.socketConnectionId = connectionId = getId()
        // recreate URI to pass new session
        socket.io.uri = URI + '/?session=' + ox.session + '&connection=' + connectionId
        socket.connect()
      }
    }
  })
  // disconnect on logout
  ox.on('logout', function () {
    if (debug) log('Websocket disconnected on logout')
    if (socket.connected) socket.close()
  })

  return def
}

/**
 * returns a websocket which will be automatically connected if it's the first
 * call. All subsequent getSocket() calls will return the socket instance.
 * @return {[type]} Deferred object resolving with the socket.io object
 */
function getSocket () {
  // check for existing socket, browser support and capability
  if (socket === undefined && cap.has('websocket')) {
    return connectSocket()
  } else if (socket) {
    return $.Deferred().resolve(socket)
  }
  if (debug) log('No websocket support, connection not possible.')
  return $.Deferred().reject()
}

// getSocket will return a connected socket
export default {
  isConnected,
  getSocket,
  io
}
