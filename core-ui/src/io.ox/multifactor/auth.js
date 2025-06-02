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

import api from '@/io.ox/multifactor/api'
import selectDeviceView from '@/io.ox/multifactor/views/selectDeviceView'
import deviceAuthenticator from '@/io.ox/multifactor/deviceAuthenticator'
import yell from '@/io.ox/core/yell'
import lost from '@/io.ox/multifactor/lost'

let authenticating = false
let authProcess

const auth = {

  getAuthentication (authInfo) {
    if (authenticating) {
      return authProcess
    }
    authenticating = true
    const def = authProcess = $.Deferred()
    authInfo.def = def
    if (authInfo.error && authInfo.error.backup) {
      lost(authInfo)
      return def
    }
    api.getDevices().then(function (list) {
      if (list && list.length > 0) {
        if (list && list.length > 1) {
          selectDeviceView.open(list, authInfo)
        } else {
          const device = list[0]
          authInfo = _.extend(authInfo, { providerName: device.providerName, device })
          deviceAuthenticator.getAuth(authInfo)
        }
      } else {
        // No primary methods.  Check if some backup devices exist
        api.getDevices('BACKUP').then(function (list) {
          if (list && list.length > 0) {
            lost(authInfo)
            return def
          }
          def.reject()
        })
      }
    }, function (fail) {
      def.reject(fail)
    })
    return def
  },

  doAuthentication: authenticate,

  reAuthenticate () {
    return authenticate({ reAuth: true })
  }

}

function notifyFailure (message) {
  yell('error', message)
  $('#io-ox-core').show() // May be hidden in login
  $('.multifactorBackground').hide() // If covered with background, hide
}

function authenticate (authInfo) {
  authInfo = authInfo || {}
  const def = $.Deferred()
  ox.idle()
  auth.getAuthentication(authInfo).then(function (data) {
    authenticating = false
    if (data) {
      api.doAuth(data.provider, data.id, data.response, data.parameters).then(function (data) {
        def.resolve(data)
      }, function (rejection) {
        authInfo.error = {
          backup: data.backup === true
        }
        if (rejection.code && (/MFA-002[1-3]/).test(rejection.code)) {
          authInfo.error.text = rejection.error
        } else {
          if (rejection) notifyFailure(rejection.error)
          window.setTimeout(function () {
            def.reject()
          }, 3000)
          return
        }
        authenticate(authInfo).then(def.resolve, def.reject)
      })
    } else {
      def.reject()
    }
  }, function (data) {
    authenticating = false
    if (data && data.error) {
      notifyFailure(data.error)
      window.setTimeout(function () {
        def.reject()
      }, 3000)
      return
    }
    def.reject(data)
  })
  return def
}

export default auth
