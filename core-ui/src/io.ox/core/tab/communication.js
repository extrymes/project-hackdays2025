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

// DEFINITIONS --------------------------------------------------

/**
 * @typedef {object} windowNameObject
 * @property {string} windowName   the name of the current window
 * @property {string} windowType   is the current window a child or parent tab values: 'parent' or 'child'
 * @property {string} [parentName] the name of the opener
 */

// PRIVATE --------------------------------------------------

let initialized = false

// object with the windowName properties
const windowNameObject = {}

/**
 * Initialize localStorage listener if localStorage is available
 */
function initialize () {
  if (!window.localStorage) return

  initListener()
  initialized = true
}

/**
 * initialize the localStorage listener
 */
function initListener () {
  const KEYS = TabCommunication.DEFAULT_STORAGE_KEYS
  window.addEventListener('storage', async function (e) {
    // limit this handler to know keys (i.e. avoid conflicting with other use-cases)
    if (e.key !== KEYS.COMMUNICATION && e.key !== KEYS.SESSION) return

    const eventData = e.newValue || JSON.stringify({})
    let data

    try {
      data = JSON.parse(eventData) || {}
    } catch (error) {
      data = {}
      if (ox.debug) console.warn('TabCommunication.initListener', error)
    }

    if (!data.propagate) return
    if (data.targetWindow && data.targetWindow !== windowNameObject.windowName) return
    if (data.exceptWindow && data.exceptWindow === windowNameObject.windowName) return

    switch (e.key) {
      case KEYS.COMMUNICATION:
        TabCommunication.handleListener(data)
        break
      case KEYS.SESSION: {
        const { default: tabSession } = await import('@/io.ox/core/tab/session')
        tabSession.handleListener(data)
        break
      }
      default:
        break
    }
  })
}

// PUBLIC --------------------------------------------------

const TabCommunication = {
  // events object to trigger changes
  events: _.extend({}, Backbone.Events),

  /**
   * Keys to handle the localStorage
   * @readonly
   * @enum {string}
   */
  DEFAULT_STORAGE_KEYS: { COMMUNICATION: 'appsuite.window-communication', SESSION: 'appsuite.session-management' },

  /**
   * Write a new localStorage item to spread to all other tabs or to a
   * specified tab.
   *
   * @param {string} key                    the key to trigger event
   * @param {object} [options]              the keys not described below are passed as parameters to the other windows.
   * @param {string} [options.exceptWindow] propagate to all windows except this
   * @param {string} [options.targetWindow] propagate to this window
   * @param {string} [options.storageKey]   key to use in the localStorage. Default key is TabHandling.DEFAULT_STORAGE_KEYS.COMMUNICATION
   */
  propagate (key, options) {
    options = options || {}
    let jsonString; let propagateToSelfWindow
    const storageKey = options.storageKey || this.DEFAULT_STORAGE_KEYS.COMMUNICATION
    const parameters = _.omit(options, 'targetWindow', 'exceptWindow', 'storageKey')

    // propagateToAll means that the event is triggered on the own window via the event and not via the localStorage
    if (!options.exceptWindow && !options.targetWindow) {
      options.exceptWindow = windowNameObject.windowName
      propagateToSelfWindow = true
    }

    try {
      jsonString = JSON.stringify({
        propagate: key,
        parameters,
        date: Date.now(),
        exceptWindow: options.exceptWindow,
        targetWindow: options.targetWindow
      })
    } catch (e) {
      jsonString = JSON.stringify({})
      if (ox.debug) console.warn('TabCommunication.propagate', e)
    }
    window.localStorage.setItem(storageKey, jsonString)
    this.clearStorage(storageKey)

    if (propagateToSelfWindow) { this.events.trigger(key, parameters) }
  },

  /**
   * Clear Storage for TabCommunication
   */
  clearStorage (storageKey) {
    try {
      window.localStorage.removeItem(storageKey)
    } catch (e) {
      if (ox.debug) console.warn('TabCommunication.clearStorage', e)
    }
  },

  /**
   * Ask for other windows by localStorage
   *
   * @returns {jQuery.Deferred}
   */
  async otherTabsLiving () {
    const { default: tabAPI } = await import('@/io.ox/core/api/tab')
    tabAPI.propagate('get-active-windows', { exceptWindow: windowNameObject.windowName })
    const def = $.Deferred()
    const timeout = setTimeout(function () {
      def.reject()
    }, 100)

    this.events.listenToOnce(this.events, 'propagate-active-window', def.resolve)

    return def.done(function () {
      window.clearTimeout(timeout)
    })
  },

  /**
   * Set ox-object params. Returns true if the parameters were set.
   *
   * @param   {object}  parameters parameter to set
   * @returns {boolean}
   */
  updateOxObject (parameters) {
    if (!parameters) return false

    _.extend(ox, parameters)
    return true
  },

  /**
   * Tell specified window, that an active tab exist
   *
   * @param {string} targetWindow windowName for propagation
   */
  async getActiveWindows (targetWindow) {
    if (!ox.session) return
    const { default: tabAPI } = await import('@/io.ox/core/api/tab')
    tabAPI.propagate('propagate-active-window', { targetWindow, windowName: windowNameObject.windowName })
  },

  /**
   * Set the current windowNameObject
   *
   * @param {windowNameObject} newWindowNameObject
   */
  setWindowNameObject (newWindowNameObject) {
    _.extend(windowNameObject, newWindowNameObject)
  },

  /**
   * handles all trigger from the localStorage with the key TabHandling.DEFAULT_STORAGE_KEYS.COMMUNICATION
   * @param {object} data                an object which contains the propagation parameters
   * @param {string} data.propagate      the key of the propagation event
   * @param {object} data.parameters     the parameters passed over the the localStorage
   * @param {string} [data.exceptWindow] excluded window from propagation
   */
  handleListener (data) {
    switch (data.propagate) {
      case 'show-in-drive':
        ox.load(() => import('@/io.ox/files/actions/show-in-drive')).then(function ({ default: action }) {
          action(data.parameters)
        })
        break
      case 'get-active-windows':
        TabCommunication.getActiveWindows(data.exceptWindow)
        break
      case 'update-ox-object':
        TabCommunication.updateOxObject(data.parameters)
        break
        // use 'default' to just forward propagated events
      default:
        TabCommunication.events.trigger(data.propagate, data.parameters)
        break
    }
  }
}

if (util.checkTabHandlingSupport() && !initialized) {
  initialize()
}

export default TabCommunication
