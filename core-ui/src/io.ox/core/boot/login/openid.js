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
import util from '@/io.ox/core/boot/util'
import session from '@/io.ox/core/session'
import http from '@/io.ox/core/http'
import ext from '@/io.ox/core/extensions'
import config from '@/io.ox/core/boot/config'

ext.point('io.ox/core/logout').extend({
  id: 'OIDC',
  index: 'last',
  logout () {
    const def = $.Deferred()
    if (ox.serverConfig.oidcLogin !== true) return def.resolve()
    sessionStorage.removeItem('sessionId')
    window.location.href = oidcUrlFor({
      flow: 'logout',
      redirect: true,
      client: session.client(),
      version: session.version(),
      deeplink: window.location.href,
      session: ox.session
    })
    return def
  }
})

function oidcUrlFor (params) {
  return [ox.apiRoot, ox.serverConfig.oidcPath, '/init?', $.param(params)].join('')
}

function waitForResponse () {
  const def = new $.Deferred()
  function listener (event) {
    if (event.origin !== ox.abs) return
    session.setSession(event.data)
    def.resolve(event.data)
    window.removeEventListener('message', listener)
  }
  window.addEventListener('message', listener, false)
  window.setTimeout(function () {
    window.removeEventListener('message', listener)
    if (def.state() === 'pending') def.reject({ reason: 'timeout' })
  }, 10000)
  return def
}

function silentRelogin () {
  const params = {
    flow: 'login',
    redirect: false,
    client: session.client(),
    version: session.version(),
    uriFragment: '#login_type=propagateSession'
  }
  const url = oidcUrlFor(params)
  const frame = $('<iframe>').appendTo('body')
  return $.ajax(url).then(function (res) {
    const def = $.Deferred()
    frame.one('load', _.debounce(function () {
      // try to fail early
      try {
        if (frame[0].contentDocument.body.innerHTML.length === 0) def.reject({ reason: 'relogin:failed' })
      } catch (e) {
        def.reject(e)
      }
    }, 500))
    frame.attr('src', res.redirect)
    waitForResponse()
      .then(def.resolve, def.reject)
      .always(function () {
        frame.remove()
      })
    return def
  })
}

ext.point('io.ox/core/relogin').extend({
  id: 'openid_connect_retry',
  after: 'default',
  async render () {
    const dialog = this
    function retry () {
      silentRelogin().then(function () {
        if (!dialog || dialog.disposed) return
        dialog.trigger('relogin:success')
        dialog.close()
      }, function (result) {
        // bind retry to lifetime of dialog, e.g. 'abortWithSuccess' does close the dialog
        if (!dialog || dialog.disposed) return
        if (result.reason === 'timeout') retry()
      })
    }

    if (ox.serverConfig.oidcLogin !== true) return
    // retry forever when running into timeout
    retry()
  }
})

ext.point('io.ox/core/boot/login').extend({
  id: 'openid_connect',
  after: 'autologin',
  async login (baton) {
    // make sure at least the server config has been loaded
    await config.server()
    if (ox.serverConfig.oidcLogin !== true) return
    // take a shortcut?
    const sessionId = sessionStorage.getItem('sessionId')
    if (sessionId) {
      // failOnError is needed to avoid the 'relogin:required' event in this case
      try {
        const data = await http.GET({ module: 'system', params: { action: 'whoami', session: sessionId }, appendSession: false, failOnError: true })
        session.set(data)
        ox.trigger('login:success', data)
        return
      } catch (e) {
        sessionStorage.removeItem('sessionId')
      }
    }
    return openIdConnectLogin({ flow: 'login' })
  },
  relogin (baton) {
    if (ox.serverConfig.oidcLogin !== true) return
    util.debug('Open ID Relogin ...')
    return silentRelogin().then(function () {
      baton.stopPropagation()
      baton.preventDefault()
      baton.data.reloginState = 'success'
      return { reason: 'relogin:success' }
    }, function () {
      // let some other extension handle this
      return $.when({ reason: 'relogin:continue' })
    })
  }
})

function openIdConnectLogin (options) {
  util.debug('Open ID Login ...')
  options = _.extend({ flow: 'login' }, options)
  const params = {
    flow: options.flow,
    redirect: true,
    client: session.client(),
    version: session.version()
  }
  if (!_.isEmpty(window.location.hash)) params.uriFragment = decodeURIComponent(window.location.hash.replace(/^#/, ''))

  window.setTimeout(() => (window.location.href = oidcUrlFor(params)), 0)
  // defer "forever", since we are redirecting
  return $.Deferred()
}

export default openIdConnectLogin
