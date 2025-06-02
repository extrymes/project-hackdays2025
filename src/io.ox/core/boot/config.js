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
import ox from '@/ox'

import util from '@/io.ox/core/boot/util'
import http from '@/io.ox/core/http'
import manifests from '@/io.ox/core/manifests'
import capabilities from '@/io.ox/core/capabilities'

let userConfigFetched = false

async function propagate (data, isUser = false) {
  // Parallel fetch of general config can take longer than
  // the user config.
  if (!isUser && userConfigFetched) return
  userConfigFetched = isUser

  ox.serverConfig = data || {}

  if (isUser && (ox.debug || window.puppeteer)) {
    try {
      const config = window.puppeteer?.serverConfig || JSON.parse(_.getCookie('serverConfig') || '{}')
      Object.assign(ox.serverConfig, config)
    } catch (e) {
      console.log('Could not parse custom server config', e)
    }
  }

  // transform language array (hash keeps insertion order if keys are not array indices)
  if (_.isArray(ox.serverConfig.languages)) {
    ox.serverConfig.languages = _(ox.serverConfig.languages).object()
  }
  capabilities.reset({ isUser })
  await manifests.reload()

  // now we're sure the server is up
  ox.trigger('server:up')
}

async function fetch (type) {
  let data

  // try rampup data
  if (type === 'user' && (data = ox.rampup.serverConfig)) {
    await propagate(data, true)

    return data
  }

  util.debug('Load config (' + type + ') ... ')

  // fetch fresh manifests
  data = await http.GET({
    module: 'apps/manifests',
    params: { action: 'config', version: ox.version },
    appendSession: type === 'user',
    failOnError: true
  })
  await propagate(data, type === 'user')
  util.debug('Load config (' + type + ') DONE', data)
  return data
}

export default {

  server: _.memoize(function () {
    return fetch('server')
  }),

  user: _.memoize(function () {
    return fetch('user')
  })
}
