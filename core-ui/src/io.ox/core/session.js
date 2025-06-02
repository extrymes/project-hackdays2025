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
import ox from '@/ox'

import http from '@/io.ox/core/http'
import config from '@/io.ox/core/boot/config'
import meta from '@/io.ox/core/locale/meta'

const TIMEOUTS = { AUTOLOGIN: 7000, LOGIN: 10000, FETCHCONFIG: 2000 }
let CLIENT = 'open-xchange-appsuite'
let isAutoLogin = false

const set = async function (data, locale) {
  if ('session' in data) setSession(data.session)
  // might have a domain; depends on what the user entered on login
  if ('user' in data) ox.user = data.user || ''
  if ('user_id' in data) ox.user_id = data.user_id || 0
  if ('context_id' in data) ox.context_id = data.context_id || 0
  // if the user has set the language on the login page, use this language instead of server settings lang
  ox.locale = locale || data.locale || meta.getValidDefaultLocale()
  _.setCookie('locale', ox.locale)
  $('html').attr('lang', ox.locale.split('_')[0])
  // update error message in index.html
  document.documentElement.dispatchEvent(new Event('languageChange'))
  ox.trigger('change:session', ox.session)
}

export function setSession (sessionId) {
  ox.session = sessionId || ''
  if (ox.serverConfig?.oidcLogin) sessionStorage.setItem('sessionId', ox.session)
}

export function autoLogin () {
  // Fetches the timeout value in parallel with the main HTTP request
  // if it takes too long. Falls back to values in TIMEOUTS if
  // fetching the config also takes too long.
  function withTimeout (httpCall, options) {
    const start = _.now()
    // Variables used for synchronization:
    // configTimer fetches the serverConfig,
    let configTimer = setTimeout(fetchConfig, TIMEOUTS.FETCHCONFIG)
    // xhrTimer aborts the HTTP request on timeout,
    let xhrTimer = setTimeout(abort, TIMEOUTS.AUTOLOGIN)
    // xhr cancels the timers on completion.
    const xhr = httpCall(options)

    // Cancel the timers if the HTTP request is finished before
    // the timeout.
    return xhr.always(function () {
      if (configTimer !== null) {
        clearTimeout(configTimer)
        configTimer = null
      }
      if (xhrTimer !== null) {
        clearTimeout(xhrTimer)
        xhrTimer = null
      }
    })

    // Fetch serverConfig manually if the request takes too long.
    function fetchConfig () {
      configTimer = null
      config.server().then(function (conf) {
        if (xhrTimer === null) return // too late
        if (!conf || !conf.autoLoginTimeout) return // use default

        // Restart the abort timer with the configured value,
        // adjusting for already elapsed time.
        clearTimeout(xhrTimer)
        xhrTimer = setTimeout(abort, Math.max(0,
          conf.autoLoginTimeout - (_.now() - start)))
      })
    }

    // Abort the HTTP request.
    function abort () {
      xhrTimer = null
      xhr.abort()
    }
  }

  // GET request
  return withTimeout(http.GET, {
    module: 'login',
    appendColumns: false,
    appendSession: false,
    processResponse: false,
    params: {
      action: 'autologin',
      client: that.client(),
      rampup: false,
      version: that.version()
    }
  })
    .then(function success (data) {
      ox.secretCookie = true
      isAutoLogin = true

      set(data)
      // global event
      ox.trigger('login', data)
      return data
    })
}

export const login = (function () {
  let pending = null

  return function login (options) {
    if (!ox.online) {
      // don't try when offline
      set({ session: 'offline', user: options.username }, options.locale)
      return $.when({ session: ox.session, user: ox.user })
    }

    // pending?
    if (pending !== null) return pending
    const params = _.extend(
      {
        action: 'login',
        name: '',
        password: '',
        // current browser locale; required for proper error messages
        locale: 'en_US',
        client: that.client(),
        version: that.version(),
        timeout: TIMEOUTS.LOGIN,
        rampup: false
      },
      _(options).pick('action', 'name', 'password', 'locale', 'rampup', 'rampUpFor', 'share', 'target', 'secret_code', 'staySignedIn')
    )

    if (options.forceLocale) params.storeLocale = true

    return (
      pending = http.POST({
        module: 'login',
        appendColumns: false,
        appendSession: false,
        processResponse: false,
        data: params
      })
        .then(
          function success (data) {
            // store session
            // we pass forceLocale (might be undefined); fallback is data.locale
            set(data, options.forceLocale)

            // global event
            ox.trigger('login', data)
            ox.secretCookie = !!options.staySignedIn

            return data
          },
          function fail (e) {
            if (ox.debug) console.error('Login failed!', e.error, e.error_desc || '')
            throw e
          }
        )
        .always(function () {
          pending = null
        })
    )
  }
}())

export function logout () {
  if (ox.online) {
    // POST request
    return http.POST({
      module: 'login',
      appendColumns: false,
      processResponse: false,
      data: {
        action: 'logout'
      }
    }).then(function () {
      ox.trigger('logout')
    })
  }
  return $.Deferred().resolve()
}

const that = {

  set,

  setSession,

  autoLogin,

  login,

  logout,

  setClient (client) {
    if (client) CLIENT = client
  },

  client () {
    return CLIENT
  },

  version () {
    // need to work with ox.version since we don't have the server config for auto-login
    return String(ox.version).split('.').slice(0, 3).join('.')
  },

  isAutoLogin () {
    return isAutoLogin
  }
}

export default that
