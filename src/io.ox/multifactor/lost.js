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

import api from '@/io.ox/multifactor/api'
import deviceAuthenticator from '@/io.ox/multifactor/deviceAuthenticator'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

function failBackup (def, message) {
  notifyFailure(message.value ? message.value : message)
  window.setTimeout(function () {
    def.reject()
  }, 10000)
}

function notifyFailure (message) {
  $(document.body).append(yell('error', message)) // append to document body rather than core
}

function handleLost (authInfo) {
  api.getDevices('BACKUP').then(function (devices) {
    if (devices.length === 0) {
      failBackup(authInfo.def, gt('There are no backup devices available for this account. Please notify support for help.'))
      return
    }
    const device = devices[0]
    const authDef = $.Deferred()
    authInfo.providerName = device.providerName
    authInfo.device = device
    deviceAuthenticator.getAuth(authInfo)
    authDef.then(function (data) {
      if (data) {
        data.backup = true // mark this as a backup / lost action
        authInfo.def.resolve(data)
        return
      }
      failBackup(authInfo.def, gt('Authentication failure. Please try reloading the page.'))
    }, function (fail) {
      failBackup(authInfo.def, fail)
    })
  })
}

export default handleLost
