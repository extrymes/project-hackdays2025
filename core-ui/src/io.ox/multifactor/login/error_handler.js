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

import ox from '@/ox'
// boot/util adds event listeners to the ox object.
import '@/io.ox/core/boot/util'

import http from '@/io.ox/core/http'
import auth from '@/io.ox/multifactor/auth'

ox.on('http:error', function (response) {
  // Check for multifactor error
  if (!(/(MFA-0001|MFA-0015)/i).test(response.code)) return

  http.disconnect()
  auth.reAuthenticate().then(function () {
    http.reconnect()
  }, function () {
    if ((/^MFA-0001/i).test(response.code)) {
      console.error('MF login failed, reload required')
      ox.session = ''
      http.resetDisconnect(response)
      ox.trigger('relogin:required')
    } else {
      http.resetDisconnect(response, { filter: res => res.options.module.startsWith('multifactor'), silent: true })
    }
  })
})
