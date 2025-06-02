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

import ext from '@/io.ox/core/extensions'
import ModalView from '@/io.ox/backbone/views/modal'
import api from '@/io.ox/multifactor/api'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const POINT = 'multifactor/settings/views/u2fRegistrationView'
let INDEX = 0

let dialog
let def
let providerName

function open (provider, resp, _def) {
  providerName = provider
  def = _def
  dialog = openModalDialog(provider, resp, def)
  return dialog
}

function openModalDialog (provider, resp, def) {
  return new ModalView({
    async: true,
    point: POINT,
    title: gt('Confirm Code'),
    width: 640,
    enter: 'OK',
    model: new Backbone.Model({ device: resp, challenge: resp.challenge, def })
  })
    .build(function () {
    })
    .addCancelButton()
    .on('cancel', function () {
      def.reject()
    })
    .open()
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'header',
    render (baton) {
      const label = $('<label>').append(gt('Please touch/activate your device'))
        .append('<br>')
      const data = baton.model.get('challenge')
      const registrationData = {
        challenge: data.registerRequests[0].challenge,
        appId: data.registerRequests[0].appId,
        version: data.registerRequests[0].version
      }
      data.registeredKeys.forEach(function (reg) {
        reg.appId = window.location.origin
      })
      this.$body.append(
        label
      )
      window.u2f.register(data.registerRequests[0].appId, [registrationData], data.registeredKeys,
        function (data) {
          if (data.errorCode) {
            if (data.errorCode === 4) {
              yell('error', gt('Device is already registered'))
            } else {
              yell('error', gt('Problem registering device'))
              console.error(data)
            }
            baton.model.get('def').reject(data.errorCode)
            _.defer(baton.view.close)
            return
          }
          finishRegistration(baton.model.get('device'), data)
        })
    }
  }

)

function finishRegistration (device, reg) {
  const resp = {
    registrationData: reg.registrationData,
    clientData: reg.clientData
  }

  api.finishRegistration(providerName, device.deviceId, resp).then(function (data) {
    if (data && data.enabled) { // Good response.  Done
      dialog.close()
      def.resolve()
      return
    }
    let error
    if (data && data.error) { // Bad code
      error = gt('Failed to register device') + ' ' + data.error
    }
    yell('error', error)
    dialog.close()
    def.reject()
  }, function (error) {
    def.reject()
    dialog.close()
    yell('error', gt('Failed to register device.') + (error.error ? (' ' + error.error) : ''))
    console.error(error)
  })
}

export default {
  open
}
