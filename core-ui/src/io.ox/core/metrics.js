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

const that = {

  // get time since t0
  getTime () {
    return _.now() - ox.t0
  },

  // format milliseconds, e.g. 0.75s
  formatTimestamp (ms) {
    return (Math.ceil(ms / 100) / 10).toFixed(2) + 's'
  },

  // listen to some demo events and generate console output
  debug () {
    ox.on('login core:load core:ready app:start app:ready app:stop', function () {
      const t = that.formatTimestamp(that.getTime())
      console.log('Event', t)
    })
  }
}

export default that
