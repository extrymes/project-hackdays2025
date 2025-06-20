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

const cache = {
  config: {}
}

window.c = cache
const api = {

  enabledDevices () {
    if (cache.onboardingDevices) return $.when(cache.onboardingDevices)

    return api.config().then(function (config) {
      const f = {}
      _(config.devices).each(function (device) {
        f[device.id] = device.enabled
      })
      cache.onboardingDevices = f
      return f
    })
  },

  config (device) {
    if (!device && !_.isEmpty(cache.config)) return $.when(cache.config)
    if (device && cache.config[device]) return $.when(cache.config[device])

    return http.GET({
      module: 'onboarding',
      params: {
        action: 'config',
        client: device
      }
    }).then(function (config) {
      if (device) {
        cache.config[device] = config
      } else {
        cache.config = config
      }
      return config
    })
  },

  execute (scenario, action, data) {
    return http.PUT({
      module: 'onboarding',
      params: {
        action: 'execute',
        id: scenario,
        action_id: action
      },
      data,
      // get warnings
      processResponse: false
    })
  },

  getUrl (scenario, action, client) {
    return ox.apiRoot + '/onboarding?action=execute' +
                    '&id=' + scenario +
                    '&action_id=' + action +
                    '&client=' + (client || '') +
                    '&session=' + ox.session
  }
}

export default api
