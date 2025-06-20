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
import ext from '@/io.ox/core/extensions'
import { settings } from '@/io.ox/core/settings'

let refresh;

(function () {
  let next = _.now()
  // only trigger every 10 seconds
  const REFRESH_THROTTLE = 10000

  ext.point('io.ox/core/refresh').extend({
    action: _.throttle(function () {
      if (ox.online && ox.session !== '') {
        try {
          // trigger global event
          ox.trigger('refresh^')
        } catch (e) {
          console.error('io.ox/core/refresh:default', e.message, e)
        }
      }
    }, REFRESH_THROTTLE),
    reset () {
      next = _.now() + parseInt(settings.get('refreshInterval', 300000), 10)
    }
  })

  function check () {
    if (_.now() > next) {
      ext.point('io.ox/core/refresh').invoke('action')
      ext.point('io.ox/core/refresh').invoke('reset')
    }
  }

  refresh = function () {
    ext.point('io.ox/core/refresh').invoke('action')
    ext.point('io.ox/core/refresh').invoke('reset')
  }
  settings.on('change:refreshInterval', function () {
    ext.point('io.ox/core/refresh').invoke('reset')
  })

  ext.point('io.ox/core/refresh').invoke('reset')
  // check every 10 seconds
  setInterval(check, 10000)
}())

export default refresh
