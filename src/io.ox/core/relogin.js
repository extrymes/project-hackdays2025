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

import ext from '@/io.ox/core/extensions'
import { login, setSession } from '@/io.ox/core/session'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import util from '@/io.ox/core/boot/util'
import ModalDialog from '@/io.ox/backbone/views/modal'
import Stage from '@/io.ox/core/extPatterns/stage'
import http from '@/io.ox/core/http'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

ext.point('io.ox/core/relogin').extend({
  id: 'default',
  render () {
    this.$body.append(
      $('<div>').text(gt('You have to sign in again'))
    )
    this.addButton({ action: 'ok', label: gt('Ok') })
    this.on('ok', function () {
      this.trigger('relogin:continue')
    })
  }
}, {
  id: 'password',
  index: 100,
  render (baton) {
    if (!settings.get('features/reloginPopup', !ox.serverConfig.oidcLogin && !ox.serverConfig.samlLogin)) return
    // no pwd for guests via link or guests that actually have not set a password
    if (capabilities.has('guest && anonymous') || (capabilities.has('guest') && settings.get('password/emptyCurrent'))) return

    const guid = _.uniqueId('form-control-label-')
    this.$header.append(
      $('<div>').text(gt('Please sign in again to continue'))
    )
    this.$body.append(
      $('<label>').attr('for', guid).text(gt('Password')),
      $('<input type="password" name="relogin-password" class="form-control">').attr('id', guid)
    )
    this
      .addButton({ className: 'btn-default', label: gt('Cancel'), action: 'cancel' })
      .addButton({ action: 'relogin', label: gt('Sign in') })
      .on('cancel', function () {
        ox.trigger('relogin:cancel')
        gotoLogoutLocation()
      })
      .on('relogin', function () {
        const self = this.busy()
        // relogin
        login({
          name: ox.user,
          password: this.$body.find('input').val(),
          rampup: false,
          staySignedIn: ox.secretCookie
        }).then(
          function success () {
            yell('close')
            self.$body.find('input').val('')
            self.trigger('relogin:success')
            self.close()
          },
          function fail (e) {
            // improve standard error message ;-)
            if (e.code === 'LGI-0006') {
              e.error = gt('Please enter correct password')
            }
            yell({
              headline: gt('Failed to sign in'),
              type: 'error',
              message: e.error
            })
            self.idle()
            self.$body.find('input').focus().select()
            self.trigger('relogin:fail', e)
          }
        )
      })

    baton.preventDefault()
  }
})

function getReason (error) {
  return error && error.code === 'SES-0205'
    ? gt('Your IP address has changed')
    : gt('Your session is expired')
}

function getLoginLocation () {
  const location = capabilities.has('guest')
    ? settings.get('customLocations/guestLogin') || ox.serverConfig.guestLoginLocation
    : settings.get('customLocations/login') || ox.serverConfig.loginLocation
  return _.url.vars(location || ox.loginLocation || '')
}

function getLogoutLocation () {
  const location = capabilities.has('guest')
    ? settings.get('customLocations/guestLogout') || ox.serverConfig.guestLogoutLocation
    : settings.get('customLocations/logout') || ox.serverConfig.logoutLocation
  return _.url.vars(location || ox.logoutLocation || '')
}

function gotoLoginLocation () {
  _.url.redirect(getLoginLocation())
}

function gotoLogoutLocation () {
  _.url.redirect(getLogoutLocation())
}

ext.point('io.ox/core/boot/login').replace({
  id: 'default',
  relogin (baton) {
    if (baton.data.reloginState !== 'success') return gotoLoginLocation()
  }
})

function showDialog (error) {
  const def = $.Deferred()
  const dialog = new ModalDialog({
    async: true,
    enter: 'relogin',
    backdrop: 'static',
    focus: 'input',
    title: getReason(error),
    point: 'io.ox/core/relogin'
  })
    .build(function () {
      this.$el.addClass('relogin')
    }).on('open', function () {
      $('html').addClass('relogin-required')
      $('#io-ox-core').addClass('blur')
    }).on('relogin:continue', function () {
      def.resolve({ reason: 'relogin:continue' })
    })
    .on('relogin:success', function () {
      def.resolve({ reason: 'relogin:success' })
    })
    .open()
  ox.on('login:success', closeDialog)

  function closeDialog () {
    if (!dialog || dialog.disposed) return
    dialog.trigger('relogin:continue')
    dialog.close()
  }

  return def.done(function () {
    ox.off('login:success', closeDialog)
    $('html').removeClass('relogin-required')
    $('#io-ox-core').removeClass('blur')
  })
}

ext.point('io.ox/core/boot/login').extend({
  id: 'userPrompt',
  index: 5000,
  relogin (baton) {
    return showDialog(baton.data.error).then(function (result) {
      if (result && result.reason === 'relogin:success') baton.data.reloginState = 'success'
    })
  }
})

let queue = []; let pending = false
async function relogin (request, deferred, error) {
  if (!ox.online) return

  if (!pending) {
    ox.trigger('before:relogin')

    util.debugSession('relogin process START')

    // enqueue last request
    queue = (request && deferred) ? [{ request, deferred }] : []

    // set flag
    pending = true

    const baton = ext.Baton.ensure({ error, reloginState: 'pending' })

    function abortWithSuccess (loginData) {
      util.debugSession('relogin abort with success', _.clone(loginData), _.clone(baton.data))
      // we know that we have a new valid session from the event
      baton.data.reloginState = 'success'
      baton.data.receivedSession = loginData ? loginData.session : ''
      Stage.abortAll('io.ox/core/boot/login')
    }

    ox.on('login:success', abortWithSuccess)

    Stage.run('io.ox/core/boot/login', baton, { methodName: 'relogin' })
      .then(function () {
        // must always be called
        ox.off('login:success', abortWithSuccess)

        if (baton.data.reloginState !== 'success') return

        // With very bad timing, it is possible that a late returning request with a session error
        // removes ox.session (see http.js) while in a running relogin unwanted, resulting in a
        // empty ox.session. The root problem is that ox.session can be removed in a running relogin process.
        // This edge-case is more likely to happen when the relogin was 'abortedWithSuccess', because it's faster
        // this way, but at the same time it can be solved in almost all cases simply by using the received session
        // from this login. So try to repair the session with this data.
        if (!ox.session) {
          util.debugSession('relogin success but no session, trying to repair')
          // note: baton is by reference, 'receivedSession' is always the session
          // received by the latest 'login:success' events
          setSession(baton.data.receivedSession)
        }

        // process finished, we have a valid session
        // needed to reload documents in single tab cases (either real single tab config or just one tab left open)
        ox.trigger('relogin:success')

        if (util.checkTabHandlingSupport()) {
          import('@/io.ox/core/api/tab').then(function ({ default: tabAPI }) {
            util.debugSession('propagateLogin', ox.session)
            tabAPI.propagate('propagateLogin', {
              session: ox.session,
              language: ox.language,
              theme: ox.theme,
              user: ox.user,
              user_id: ox.user_id,
              context_id: ox.context_id,
              relogin: true,
              exceptWindow: tabAPI.getWindowName(),
              storageKey: tabAPI.DEFAULT_STORAGE_KEYS.SESSION
            })
          })
        }

        // process queue
        let i = 0; let item
        for (; (item = queue[i]); i++) {
          if (!item.request.noRetry) {
            http.retry(item.request)
              .done(item.deferred.resolve)
              .fail(item.deferred.fail)
          }
        }
        util.debugSession('relogin process DONE')
        // set flag
        pending = false
      })
  } else if (request && deferred) {
    // enqueue last request
    queue.push({ request, deferred })
  }
}

ox.off('relogin:required', util.relogin)
ox.on('relogin:required', relogin)

export default relogin
