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
import Backbone from '@/backbone'
import ox from '@/ox'
import util from '@/io.ox/core/boot/util'

// PRIVATE --------------------------------------------------

let initialized = false
// state whether an outdated session is detected in any tab for this user
let outdatedSessionDetected = false

// whether a relogin process is currently running
let inRelogin = false
/**
 * Initialize localStorage listener if localStorage is available
 */
function initialize () {
  if (!window.localStorage) return

  initListener()
  initialized = true
}

/**
 * Initialize listener for storage events and listener for propagation
 */
function initListener () {
  TabSession.events.listenTo(TabSession.events, 'propagateLogin', function (parameters) {
    import('@/io.ox/core/boot/login/tabSession').then(function ({ default: tabSessionLogin }) {
      tabSessionLogin(parameters)
    })
  })

  // invalidate session for all tabs to prevent sharing of outdated sessions
  // case: tab1 has session lost, user opens a new tab via bookmark, new tab
  //       must not get an outdated session from tab1
  ox.on('relogin:required', function () {
    util.debugSession('TabSession: received relogin:required')
    if (outdatedSessionDetected) { return }

    // while relogin process is running, sessions may change back and forth,
    // but only the final result is important, so ignore
    if (inRelogin) { return }

    outdatedSessionDetected = true
    propagateOutdatedSession()
  })

  // must be done at the endpoint of every process were a new session by MW is possibly provided,
  // login and relogin are such endpoints
  ox.on('login:success', function () {
    util.debugSession('TabSession: received login:success')
    outdatedSessionDetected = false
  })

  ox.on('before:relogin', function () {
    util.debugSession('TabSession: received before:relogin')
    inRelogin = true
  })
  ox.on('relogin:success', function () {
    util.debugSession('TabSession: received relogin:success')
    outdatedSessionDetected = false
    inRelogin = false
  })
}

function bySameUser (parameters) {
  return (ox.user_id === parameters.user_id) && (ox.user === parameters.user) && (ox.context_id === parameters.context_id)
}

async function propagateOutdatedSession () {
  util.debugSession('TabSession: called propagateOutdatedSession')
  const { default: tabAPI } = await import('@/io.ox/core/api/tab')
  const userData = {
    user: ox.user,
    user_id: ox.user_id,
    context_id: ox.context_id
  }
  tabAPI.propagate('propagateOutdatedSession', _.extend(userData, {
    exceptWindow: tabAPI.getWindowName(),
    storageKey: tabAPI.DEFAULT_STORAGE_KEYS.SESSION
  }))
}

// PUBLIC --------------------------------------------------

const TabSession = {
  // events object to trigger changes
  events: _.extend({}, Backbone.Events),

  /**
   * Ask over localStorage if another tab has a session
   */
  async propagateGetSession () {
    util.debugSession('TabSession: called propagateGetSession')
    if (ox.session) return
    const windowName = window.name || JSON.stringify({})
    let windowNameObject
    const { default: tabAPI } = await import('@/io.ox/core/api/tab')

    try {
      windowNameObject = JSON.parse(windowName)
    } catch (e) {
      windowNameObject = {}
      if (ox.debug) console.warn('TabSession.propagateGetSession', e)
    } finally {
      if (windowNameObject.loggingOut) {
        delete windowNameObject.loggingOut
        window.name = JSON.stringify(windowNameObject)
      } else {
        const param = {}
        if (_.url.hash('session')) _.extend(param, { session: _.url.hash('session') })
        tabAPI.propagate('requestGetSession', { parameters: param, exceptWindow: tabAPI.getWindowName(), storageKey: tabAPI.DEFAULT_STORAGE_KEYS.SESSION })
      }
    }
  },

  /**
   * Perform a login workflow (i.e. ask for a session and wait for an event)
   *
   * @returns {jQuery.Deferred}
   */
  login () {
    const def = $.Deferred()
    const isTokenLogin = _.url.hash('serverToken') && _.url.hash('clientToken')
    const isSessionUrlLogin = _.url.hash('session') // e.g. login via link as guest or anon user

    if (isTokenLogin || isSessionUrlLogin) { return def.reject() }

    if (ox.session && ox.secretCookie && ox.language && ox.theme && ox.user && ox.user_id) {
      return def.resolve({
        session: ox.session,
        secretCookie: ox.secretCookie,
        user: ox.user,
        user_id: ox.user_id,
        language: ox.language,
        theme: ox.theme
      })
    }

    const timeout = setTimeout(function () {
      def.reject()
    }, 50)

    this.propagateGetSession()

    this.events.listenTo(TabSession.events, 'responseGetSession', async function (loginData) {
      def.resolve(loginData)
    })

    return def.done(function () {
      window.clearTimeout(timeout)
    })
  },

  /**
   * Send a session over localStorage to other tabs
   *
   * @param {object} parameters parameters to be propagated
   */
  async propagateSession (parameters) {
    util.debugSession('TabSession: called propagateSession', parameters)
    const { default: tabAPI } = await import('@/io.ox/core/api/tab')

    // the login process is finished when session, user and user_id are set in the ox object
    if (!ox.session || !ox.user || !ox.user_id) {
      return
    }
    // - tabAPI will be enabled or disabled late during login, do not reply before initialization is done (ox.tabHandlingEnabled === true)
    // - checking capabilities for guests would work too, but it's slower and timing is critical here to stay below 50ms
    if (!ox.tabHandlingEnabled || tabAPI.getGuestMode()) {
      return
    }

    if (outdatedSessionDetected) return
    util.debugSession('responseGetSession')
    tabAPI.propagate('responseGetSession', {
      session: ox.session,
      language: ox.language,
      theme: ox.theme,
      user: ox.user,
      user_id: ox.user_id,
      context_id: ox.context_id,
      exceptWindow: tabAPI.getWindowName(),
      storageKey: tabAPI.DEFAULT_STORAGE_KEYS.SESSION
    })
  },

  /**
   * handles all trigger from the localStorage with the key TabHandling.DEFAULT_STORAGE_KEYS.SESSION
   * @param {object} data            an object which contains the propagation parameters
   * @param {string} data.propagate  the key of the propagation event
   * @param {object} data.parameters the parameters passed over the the localStorage
   */
  async handleListener (data) {
    switch (data.propagate) {
      case 'requestGetSession':
        util.debugSession('TabSession: received requestGetSession')
        this.propagateSession(data.parameters)
        break
      case 'responseGetSession':
        this.events.trigger(data.propagate, data.parameters)
        // the trigger is time critical, thus log late
        util.debugSession('TabSession: received responseGetSession', _.clone(data.parameters))
        break
      case 'propagateLogout': {
        util.debugSession('TabSession: received propagateLogout')
        if (ox.signin) return
        this.events.trigger('before:propagatedLogout')
        const { default: main } = await import('@/io.ox/core/main')
        main.logout({
          force: true,
          skipSessionLogout: true,
          autologout: data.parameters && data.parameters.autologout
        })
        break
      }
      case 'propagateLogin':
        util.debugSession('TabSession: received propagateLogin', data && _.clone(data.parameters), ox.signin)

        // always use the newest session by the same user in the tab cluster, but override on the signin were no user exists
        if (!ox.signin && !bySameUser(data.parameters)) { return }
        // no error case known currently, but as a safety check to make sure that a damaged login event can't break this tab
        if (!data.parameters.session) { return }

        this.events.trigger(data.propagate, data.parameters)
        break
      case 'propagateOutdatedSession':
        util.debugSession('TabSession: received propagateOutdatedSession')
        if (!bySameUser(data.parameters)) return
        // late arriving requests can invalidate the session again in a relogin process, ignore these
        if (inRelogin) return
        util.debugSession('TabSession: outdated session detected')
        outdatedSessionDetected = true
        break
      default:
        break
    }
  }
}

if (util.checkTabHandlingSupport() && !initialized) {
  initialize()
}

export default TabSession
