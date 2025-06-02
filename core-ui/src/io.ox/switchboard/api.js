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
import io from 'socket.io-client'
import http from '@/io.ox/core/http'
import { httpClient } from '@/io.ox/core/http-client'
import * as util from '@/io.ox/contacts/util'
import capabilities from '@/io.ox/core/capabilities'
import { hasFeature } from '@/io.ox/core/feature'
import { settings as switchboardSettings } from '@/io.ox/switchboard/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { ready } from '@/io.ox/core/events'
import jwtDecode from 'jwt-decode'
import moment from '@/io.ox/core/moment'

function isExpired (token) {
  const currentTime = Math.floor(Date.now() / 1000)
  return jwtDecode(token).exp - 120 < currentTime
}

const api = {

  online: false,
  host: '',

  // will both be set below
  socket: undefined,
  userId: undefined,
  domain: '',
  token: undefined,
  jwt: undefined,

  // just to make sure we always use the same string
  trim (userId) {
    return String(userId || '').toLowerCase().trim()
  },

  isOnline () {
    return this.online
  },

  isMyself (id) {
    return this.trim(id) === this.userId
  },

  isGAB (baton) {
    // call only works for users, so
    // make sure we are in global address book
    return baton.array().every(function (data) {
      return String(data.folder_id) === util.getGabId() && data.email1
    })
  },

  isInternal () { return false },

  propagate (type, to, payload) {
    const def = $.Deferred()
    this.socket.emit('propagate', { type, to, payload }, function (result) {
      def.resolve(result)
    })
    return def
  },

  supports (type) {
    const host = api.host
    switch (type) {
      case 'history':
        return switchboardSettings.get('callHistory/enabled', !!host) && hasFeature('presence')
      default:
        return false
    }
  },

  // DEPRECATED: `getConference` of `switchboard/api.js`, pending remove with 8.20. Use `getConference` from `io.ox/conference/util` instead
  getConference (conferences) {
    if (ox.debug) console.warn('`getConference` of `switchboard/api.js` is deprecated, pending remove with 8.20. Use `getConference` from `io.ox/conference/util` instead')
    if (!Array.isArray(conferences) || !conferences.length) return
    // we just consider the first one
    const conference = conferences[0]
    const params = conference.extendedParameters
    if (!params || !params['X-OX-TYPE']) return
    return {
      id: params['X-OX-ID'],
      joinURL: conference.uri,
      owner: params['X-OX-OWNER'],
      params,
      type: params['X-OX-TYPE']
    }
  },

  async fetchJwt () {
    try {
      if (!api.host) throw new Error('Switchboard API loaded without host configuration')
      const { token } = await http.GET({
        module: 'token',
        params: { action: 'acquireToken' }
      })
      const appsuiteApiBaseUrl = switchboardSettings.get('appsuiteApiBaseUrl', '')
      const json = {
        token,
        userId: api.userId,
        appsuiteApiBaseUrl,
        appsuiteApiPath: ox.apiRoot !== '/appsuite/api' ? ox.apiRoot : undefined
      }
      return await api.client.post('token', { json }).json()
    } catch (error) {
      const message = await error.response.json()
      console.error(`Could not get a JWT from switchboard: ${message?.error || error.message}`)
    }
  },

  async getJwt () {
    const storedJwt = sessionStorage.getItem('switchboardJWT')
    if (storedJwt) {
      try {
        if (!isExpired(storedJwt)) return storedJwt
      } catch (error) {
        sessionStorage.removeItem('switchboardJWT')
        if (ox.debug) console.error(`Switchboard: Could not decode JWT: ${error.message}`)
      }
    }
    const jwt = await api.fetchJwt()
    if (jwt) sessionStorage.setItem('switchboardJWT', jwt)
    return jwt
  }
}

function pushToWebsocketlog (event, data = {}) {
  if (!ox.debug) return
  const websocketData = {
    timestamp: _.now(),
    date: moment().format('D.M.Y HH:mm:ss'),
    event,
    via: 'switchboard'
  }
  if (Object.keys(data).length) websocketData.data = data
  try {
    ox.websocketlog.push(websocketData)
  } catch (e) {
    console.log(e)
  }
}

async function subscribeToPNS () {
  try {
    return await http.PUT({
      module: 'pns',
      params: { action: 'subscribe' },
      data: {
        client: 'switchboard',
        transport: 'webhook',
        topics: [
          'ox:calendar:updates', 'ox:mail:new'
        ],
        expires: moment().add(coreSettings.get('refreshInterval', 300000), 'ms').add(1, 'm').valueOf()
      }
    })
  } catch (error) {
    if (ox.debug) console.error('Switchboard: Could not subscribe to PNS:', error)
    throw error
  }
}

function reconnect () {
  if (!hasFeature('presence')) return
  if (!api.host) {
    console.error('Switchboard API loaded without host configuration', switchboardSettings.get())
    return (api.socket = io('localhost'))
  }
  return api.getJwt()
    .catch((error) => { if (ox.debug) console.error(`Switchboard: Could not get JWT: ${error.message}`) })
    .then(function (token) {
      if (api.socket) {
        pushToWebsocketlog('Switchboard: Reconnecting with new token')
        api.socket.io.opts.query.token = token
        api.socket.connect()
        return
      }

      const appsuiteApiBaseUrl = switchboardSettings.get('appsuiteApiBaseUrl', '')
      const appsuiteUrl = `https://${api.host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      const query = { userId: api.userId, token }
      // Only send redirect uri if not default "/appsuite/api"
      if (ox.apiRoot !== '/appsuite/api') query.appsuiteApiPath = ox.apiRoot
      if (appsuiteApiBaseUrl) query.appsuiteApiBaseUrl = appsuiteApiBaseUrl

      api.socket = io(appsuiteUrl, {
        query,
        // reconnect with a max delay of 5 minutes; no attempt limit
        reconnectionDelayMax: 5 * 60 * 1000,
        transports: ['websocket']
      })
        .once('connect', async function () {
          if (ox.debug) console.log('%cConnected to switchboard service', 'background-color: green; color: white; padding: 4px 8px;')
          pushToWebsocketlog('Switchboard: Connected to switchboard service')
          if (hasFeature('pns')) {
            try {
              await subscribeToPNS()
              ox.on('refresh^', subscribeToPNS)
              pushToWebsocketlog('Switchboard: Subscribed to PNS')
            } catch (error) {
              console.log(error)
              pushToWebsocketlog('Switchboard: Could not subscribe to PNS')
            }
          }
        })
        .on('connect', function () {
          resetRetryDelay()
          api.online = true
          if (hasFeature('pns')) ox.socketConnectionId = api.socket.id
        })
        .on('disconnect', function () {
          pushToWebsocketlog('Switchboard: Disconnected from switchboard service')
          api.online = false
        })
        .on('reconnect', function (attemptNumber) {
          pushToWebsocketlog('Switchboard: Reconnected to switchboard service on attempt #' + attemptNumber + '.')
        })
        .on('reconnect_attempt', function (attemptNumber) {
          pushToWebsocketlog('Switchboard: Reconnect attempt #' + attemptNumber)
        })
        .on('reconnect_failed', function () {
          pushToWebsocketlog('Switchboard: Reconnect failed. Giving up.')
        })
        .on('error', function (err) {
          if (ox.debug) console.error('Socket error:', err)
          // disconnect socket
          api.socket.disconnect()
          // continue unless acquireToken call fails (see OXUIB-525)
          if (sessionStorage.getItem('switchboardJWT')) retry()
        })

      if (capabilities.has('webmail') && hasFeature('pns')) {
        api.socket.on('ox:mail:new', function (data) {
          // simple event forwarding
          // don't log sensitive data here (data object)
          pushToWebsocketlog('ox:mail:new', { folder: data.folder, id: data.id })
          ox.trigger('socket:mail:new', data)
        })
      }

      if (capabilities.has('calendar') && hasFeature('pns')) {
        // only call update by push max every 10s, to reduce load
        let throttleCache = []
        const sendUpdateEvent = _.throttle(function () {
          const data = {
            folders: _(throttleCache).chain().pluck('folders').flatten().compact().unique().value(),
            invitations: _(throttleCache).chain().pluck('needsAction').flatten().compact().unique(function (event) {
              return event.id + '.' + event.folder + '.' + event.recurrenceId
            }).value()
          }
          ox.trigger('socket:calendar:updates', data)
          throttleCache = []
        }, 10000)

        api.socket.on('ox:calendar:updates', function (data) {
          // simple event forwarding
          // don't log sensitive data here (data object)
          if (ox.debug) {
            pushToWebsocketlog('ox:calendar:updates',
              {
                folders: data.folders,
                invitations: data.needsAction,
                myEvent: data.sourceToken === api.socket.id
              }
            )
          }
          throttleCache.push(data)
          if (data.sourceToken !== api.socket.id) sendUpdateEvent()
        })
      }
      return api.socket
    })
}

// retry (and avoid duplicate calls)
let retrying = false
// we start with 4 seconds and double the delay every attempt
// 4s, 8s, 16s, 32s, 64s, 128s, 256s, 300s
let retryDelay = 4
// maximum is 5 minutes
const retryDelayMax = 300

function retry () {
  if (retrying) return
  retrying = true
  setTimeout(function () {
    retrying = false
    retryDelay = Math.min(retryDelay * 2, retryDelayMax)
    reconnect()
  }, retryDelay * 1000)
}

function resetRetryDelay () {
  retryDelay = 4
}

ready(() => {
  api.host = switchboardSettings.get('host')
  if (!capabilities.has('switchboard')) return
  if (!api.host) return ox.debug ? console.error('Switchboard API loaded without host configuration', switchboardSettings.get()) : undefined
  api.client = httpClient.extend({
    prefixUrl: `https://${api.host.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/v1`,
    retry: {
      methods: ['post'], // post is not in the defaults
      limit: Infinity,
      backoffLimit: 30 * 1000
    }
  })

  const user = ox.rampup.user
  api.userId = api.trim(user.email1 || user.email2 || user.email3)
  // create a simple heuristic based on domain
  // to check whether people are internal users
  const domain = api.userId.replace(/^.*?@/, '')
  const regInternal = new RegExp('@' + _.escapeRegExp(domain) + '$', 'i')
  api.isInternal = function (id) {
    return regInternal.test(id)
  }

  ox.websocketlog = ox.websocketlog || []
  const initialConnect = reconnect()
  api.getSocket = () => initialConnect
})

export default api
