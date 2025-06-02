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
import ModalDialog from '@/io.ox/backbone/views/modal'
import logout from '@/io.ox/core/main/logout'

import tabApi from '@/io.ox/core/api/tab'
import visibilityApi from '@/io.ox/core/tk/visibility-api-util'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext';

(function () {
  // check only in this interval to optimize script performance
  let CHECKINTERVAL = 10
  // threshold for warning dialog in seconds
  let WARNINGSTART = 30
  // init logout interval
  let interval = 0
  // main timeout reference
  let timeout = null
  // checker timeout reference
  let checker = null
  // remember timeout init
  let timeoutStart
  // init warning dialog
  let dialog = null
  let changed = false
  // tab handling: only the leader can propagate to other tabs
  let leader = false
  // tab handling: pause the logout timer
  let pause = false

  const getTimeLeft = function () {
    return Math.ceil((timeoutStart + interval - _.now()) / 1000)
  }

  let getInterval = function () {
    return parseInt(settings.get('autoLogout', 0), 10)
  }

  // clear current timeout and reset activity status
  let resetTimeout = function () {
    clearTimeout(timeout)
    timeout = setTimeout(function () {
      logout({ autologout: true })
    }, interval)
    timeoutStart = _.now()
    changed = false
  }

  const isAutoLogoutRunning = function () {
    return timeout !== null && checker !== null
  }

  let propagatePause = $.noop

  // check activity status
  const check = function () {
    if (ox.tabHandlingEnabled && pause) { propagatePause() }

    if (changed && dialog === null) {
      resetTimeout()
    } else {
      const timeLeft = getTimeLeft()

      if (timeLeft <= WARNINGSTART && dialog === null) {
        // show warning dialog
        let countdown = timeLeft
        const getString = function (sec) {
          return gt.ngettext(
            'You will be automatically signed out in %1$d second',
            'You will be automatically signed out in %1$d seconds',
            sec, sec
          )
        }
        const node = $('<span>').text(getString(countdown))
        const countdownTimer = setInterval(function () {
          if (countdown <= 0) {
            // make sure, this does not run again in a second
            clearInterval(countdownTimer)
            logout({ autologout: true })
          } else {
            countdown--
            node.text(getString(countdown))
          }
        }, 1000)

        clearTimeout(timeout)
        if (dialog) {
          ox.off('logout:failed', dialog.logoutFailed)
          dialog.close()
        }

        dialog = new ModalDialog({
          async: true,
          title: gt('Automatic sign out'),
          backdrop: true
        })
          .build(function () {
            this.$body.append(node)
            this.$el.addClass('auto-logout-dialog')
          })
          .addCancelButton()
          .addButton({ action: 'retry', label: gt('Retry'), className: 'btn-default' })
          .addButton({ action: 'force', label: gt('Sign out now') })
          .open()

        dialog.on('close', function () {
          resetTimeout()
          clearInterval(countdownTimer)
          dialog = null
          ox.handleLogoutError = false
        })
        dialog.on('force', function () {
          resetTimeout()
          clearInterval(countdownTimer)
          if (dialog.$el.hasClass('logout-failed')) {
            dialog.pause()
            const sure = new ModalDialog({
              async: true,
              title: gt('Are you sure?'),
              backdrop: true
            })
              .build(function () {
                this.$body.append($('<div class="alert alert-danger">').text(gt('Forcing sign-out may cause data loss.')))
              })
              .addCancelButton()
              .addButton({ action: 'force', label: gt('Force sign-out') })
              .open()

            sure.on('cancel', function () {
              dialog.resume()
            })
            sure.on('force', function () {
              logout({ force: true })
              dialog.close()
              this.close()
            })
          } else {
            logout()
          }
        })
        dialog.on('retry', function () {
          resetTimeout()
          clearInterval(countdownTimer)
          logout()
        })

        dialog.logoutFailed = function (error) {
          if (!dialog) return
          // property to prevent yells from popping up (bad for screen readers)
          // the error is part of the dialog here
          ox.handleLogoutError = true

          // work with strings or error objects
          const errorText = error[0] && error[0].error ? error[0].error : error[0]

          dialog.idle()
          dialog.$el.toggleClass('logout-failed', true)
          dialog.$el.find('[data-action="force"]').text(gt('Force sign-out'))
          dialog.$body.empty().append(
            $('<div class="alert alert-danger">').append(
              $('<div>').text(gt('Logout failed.')),
              (_.isString(errorText) ? $('<div>').text(errorText) : '')
            )
          )
        }

        ox.on('logout:failed', dialog.logoutFailed)
      }
    }
  }

  const change = function () {
    changed = true
  }

  const start = function () {
    interval = getInterval()

    if (interval > 0 && timeout === null) {
      // bind mouse, keyboard and touch events to monitor user activity
      $(document).on('mousedown mousemove scroll touchstart touchmove keydown', change)
      // start timeout
      resetTimeout()
      // check every x seconds to reduce setTimeout operations
      checker = setInterval(check, 1000 * CHECKINTERVAL)
    }
  }

  const stop = function () {
    if (checker && timeout) {
      clearTimeout(timeout)
      clearInterval(checker)
      timeout = checker = null

      if (ox.tabHandlingEnabled) { interval = 0 }

      $(document).off('mousedown mousemove scroll touchstart touchmove keydown', change)
    }
  }

  const restart = function () {
    stop()
    start()
  }

  const debug = function () {
    CHECKINTERVAL = 1
    WARNINGSTART = 10
    getInterval = function () { return 12000 }
    restart()
  }

  ox.autoLogout = {
    start,
    stop,
    restart,
    debug,
    logout: logout.bind(null, { autologout: true })
  }

  if (ox.tabHandlingEnabled) {
    function propagateLeaderChanged () {
      tabApi.propagate('propagateLeaderChanged', { exceptWindow: tabApi.getWindowName() })
    }

    function propagateResetTimeout () {
      tabApi.propagate('propagateResetAutoLogoutTimeout', { exceptWindow: tabApi.getWindowName() })
    }

    function propagateSettingsAutoLogout (val) {
      tabApi.propagate('propagateSettingsAutoLogout', { val, exceptWindow: tabApi.getWindowName() })
    }

    // overwrite propagatePause for tabHandling
    propagatePause = function propagatePause () {
      tabApi.propagate('propagatePause', {})
    }

    function receivedResetTimeout () {
      leader = false
      // resetTimeout doesn't cancel the logout when the dialog is open
      // better to close the dialog first
      if (dialog) { dialog.close() }

      if (isAutoLogoutRunning()) { resetTimeout() }
    }

    function receivedChangedAutoLogoutSetting (propagateData) {
      const value = parseInt(propagateData.val, 10)

      // do not start/stop when settings were received from other tab.
      // this setting change must not be propagated again to other tabs (be careful with endless-loop here)
      settings.set('autoLogout', value, { silent: true })

      // make sure that we start/stop the timers without propagation
      if (value === 0) {
        stop()
      } else {
        start()
      }
    }

    function receivedLeaderChanged () {
      leader = false
      // leader change is always propagated, but resetTimeout must not be called when no timer is running (instant logout + overhead)
      if (isAutoLogoutRunning()) { resetTimeout() }
    }

    function receivedNewLeaderStatus () {
      // do not reset self
      // TODO: check
      leader = true
      propagateLeaderChanged()
    }

    function receivedBeforeLogout () {
      // important to close the dialog first before calling stop,
      // because closing the dialog calls a reset and stop set interval to 0
      if (dialog) { dialog.close() }
      stop()
    }

    function receivedPause () {
      // never silent
      if (leader) { resetTimeout() }
    }

    function startPause () {
      pause = true
    }

    function stopPause () {
      pause = false
    }

    resetTimeout = function () {
      clearTimeout(timeout)
      // just for safety
      if (interval <= 0) { return }
      timeout = setTimeout(function () {
        logout({ autologout: true })
      }, interval)
      timeoutStart = _.now()
      changed = false

      // small delta for resets from other tabs that the leader has a small safety buffer
      if (!leader) { timeoutStart = _.now() + 1000 }
      // taking lead for the timer
      if (leader) { propagateResetTimeout() }
    }

    // propagate new timeout setting to other tabs
    settings.on('change:autoLogout', propagateSettingsAutoLogout)

    // got reset from other tab
    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'propagateResetAutoLogoutTimeout', receivedResetTimeout)
    // got new auto logout setting value from other tab
    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'propagateSettingsAutoLogout', receivedChangedAutoLogoutSetting)
    // received new leader status from other tab
    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'nextWindowActive', receivedNewLeaderStatus)
    // received a pause ping, could be in any tab
    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'propagatePause', receivedPause)
    // received the leader state from other tab
    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'propagateLeaderChanged', receivedLeaderChanged)

    // received a logout from another tab
    tabApi.sessionEvents.listenTo(tabApi.sessionEvents, 'before:propagatedLogout', receivedBeforeLogout)

    $(visibilityApi).on('visibility-changed', function (e, data) {
      if (data.currentHiddenState === false) {
        leader = true
        propagateLeaderChanged()

        if (isAutoLogoutRunning()) {
          resetTimeout()
        }
      }
    })

    function getNextWindowName () {
      // can be optimized, but this is flexible in case of code changes at the moment
      const nextCandidate = _.first(_.filter(tabApi.getWindowList(), function (item) { return item.windowName !== tabApi.getWindowName() }))
      return nextCandidate ? nextCandidate.windowName : ''
    }

    tabApi.communicationEvents.listenTo(tabApi.communicationEvents, 'beforeunload', function (unsavedChanges) {
      // we must always set a new leader when the tab is closed
      // better set the state too often (self repairing...)
      if (!unsavedChanges) {
        const next = getNextWindowName()
        if (next) { tabApi.propagate('nextWindowActive', { targetWindow: next }) }
      }
    })

    // needed for use-case upload
    _.extend(ox.autoLogout, { start: stopPause, stop: startPause })

    // init
    leader = true
    propagateLeaderChanged()
  }

  settings.on('change:autoLogout', function (val) {
    if (parseInt(val, 10) === 0) return stop()
    start()
  })

  start()
}())
