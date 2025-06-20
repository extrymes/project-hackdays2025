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

// cspell:ignore countid

import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'
import uuids from '@/io.ox/core/uuids'
import { settings } from '@/io.ox/core/settings'

// we always need to expose the API even if tracking is disabled
const api = _.extend({ queue: [], add: _.noop }, Backbone.Events)
const url = settings.get('count/url') || settings.get('tracker/url')
const enabled = url && !ox.debug && settings.get('count/enabled', true)
const chunkSize = 100
const platform = _(['windows', 'macos', 'ios', 'android']).find(_.device)
const device = _(['smartphone', 'desktop', 'tablet']).find(_.device)

// count/disabled is _only_ for dev purposes!
api.disabled = settings.get('count/disabled', !enabled)
// return mock/noop API so that consumers don't have to worry
if (!api.disabled) {
  function getUUID () {
    if (window.localStorage) {
      let uuid = window.sessionStorage.getItem('countid')
      if (!uuid) {
        uuid = uuids.randomUUID()
        window.sessionStorage.setItem('countid', uuid)
      }
      return uuid
    }
    return uuids.randomUUID()
  }

  api.uuid = getUUID()

  const delay = parseInt(settings.get('count/delay', 15), 10) * 1000
  const brand = settings.get('count/brand') || settings.get('tracker/brand')
  const toggles = settings.get('count/stats', {})
  let intervalId

  // overwrite with real function
  api.add = function (stat, data) {
    if (toggles[stat] === false) return
    data = _.extend({ stat }, data)
    if (brand) data.brand = brand
    api.trigger('add', data)
    api.queue.push(data)
  }

  api.stat = function (id) {
    return toggles[id] !== false
  }

  api.platform = platform
  api.device = device

  function send () {
    if (api.queue.length === 0) return
    // for large queues ensure we only send chunks of 100 entries to avoid "entity too large" issues
    const data = api.queue.slice(0, chunkSize)
    api.queue = api.queue.slice(chunkSize, api.queue.length)
    api.trigger('sync', data)
    if (url === 'debug') return console.debug('count', data)
    $.post({ url, contentType: 'application/json', data: JSON.stringify(data), timeout: 10000 }).fail(function (xhr) {
      // stop in case of 403 Forbidden (which means we have an invalid API token)
      if (xhr.status === 403) {
        api.trigger('forbidden')
        return clearInterval(intervalId)
      }
      if (xhr.status === 413) {
        // last line of defense, maybe messed up content in queue causing
        // request entity too large error. In this case clear the queue
        api.queue = []
        return
      }
      // reschedule data for retransmission in case switchboard is not available
      api.trigger('fail', data);
      [].push.apply(api.queue, data)
    })
  }

  // send first payload after 3s, then use longer interval
  setTimeout(function () {
    send()
    intervalId = setInterval(send, delay)
  }, 3000)
}

export default api
