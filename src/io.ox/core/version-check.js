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

import gt from 'gettext'
import _ from '@/underscore'
import $ from '@/jquery'
import ox from '@/ox'

// unregister service worker and clear caches
async function unregister () {
  const registration = await navigator.serviceWorker.getRegistration()
  if (ox.debug) console.log('Service worker will be unregistered')
  if (registration && registration.active) {
    try {
      await registration.unregister()
      if (ox.debug) console.log('Service worker unregistered successfully')
    } catch (err) {
      if (ox.debug) console.error('Service worker unregistration failed', err)
    }
  }
}

export async function registerWorker () {
  // check support
  if ('serviceWorker' in navigator) {
    // use of url parameter "useSW" overrules default behavior
    // default behavior: no sw when working with vite dev mode (causes cache problems when switching branches etc)
    if (_.url.hash('useSW') === 'false' || (!_.url.hash('useSW') && import.meta.env.MODE === 'development')) {
      if (ox.debug) console.log('Unregister Service Worker due to dev-mode')
      return unregister()
    }
    try {
      await navigator.serviceWorker.register('service-worker.js')
      const registration = await navigator.serviceWorker.ready
      const permission = await navigator.permissions?.query({
        name: 'periodic-background-sync'
      }).catch(() => {})
      if (permission?.state === 'granted') {
        registration.periodicSync.register('POLL', {
          minInterval: 60 * 1000
        })
      } else {
        setInterval(() => {
          navigator.serviceWorker.controller?.postMessage('POLL')
        }, 60 * 1000)
      }
      // forward events
      navigator.serviceWorker.addEventListener('message', message => {
        if (!message?.data.type) return
        ox.trigger('serviceworker:' + message?.data.type, message?.data)
      })
      // loosly coupled
      ox.once('serviceworker:NEW_VERSION', function showAppReloadBanner () {
        $('#io-ox-banner')
          .empty()
          .append(
            $.txt(gt('There is an update available! Please reload the app.')),
            $('<button type="button" class="btn btn-default ms-8">')
              .text(gt('Reload now'))
              .on('click', () => location.reload())
          )
          .slideDown()
      })
      ox.on('printLogs', () => {
        navigator.serviceWorker.controller?.postMessage('PRINT_LOGS')
      })
      if (_.url.hash('useSW') === 'debug') {
        navigator.serviceWorker.controller?.postMessage('ENABLE_DEBUG')
      }
      navigator.serviceWorker.oncontrollerchange = function () {
        if (_.url.hash('useSW') === 'debug') {
          navigator.serviceWorker.controller?.postMessage('ENABLE_DEBUG')
        }
      }

      const cache = await caches.open('defaultcache')
      const response = await cache.match('/version')
      ox.currentServiceWorkerVersion = response.headers.get('version')
    } catch (error) {
      console.warn('Service worker error', error)
    }
  } else {
    console.warn('This browser doesn\'t support service workers. Version checks will not work. Please update your browser')
  }
}

export function getWorker () { return navigator.serviceWorker.controller }
