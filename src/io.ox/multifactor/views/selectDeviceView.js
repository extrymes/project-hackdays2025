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
import deviceAuthenticator from '@/io.ox/multifactor/deviceAuthenticator'
import constants from '@/io.ox/multifactor/views/constants'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

const POINT = 'multifactor/views/selectDeviceView'
let INDEX = 0

let dialog
let def

function open (device, authInfo) {
  // Some devices don't need to be individually selected, like U2f
  device = groupDevices(device)
  def = authInfo.def
  if (device.length === 1) { // If only one after grouping, proceed to auth
    _.extend(authInfo, { device: device[0], providerName: device[0].providerName })
    return deviceAuthenticator.getAuth(authInfo)
  }
  dialog = openModalDialog(device, authInfo)
  dialog.$el.addClass('verification-options')
  return dialog
}

function openModalDialog (devices, authInfo) {
  return new ModalView({
    async: true,
    point: POINT,
    title: authInfo.reAuth ? constants.ReAuthenticationTitle : constants.SelectDeviceTitle,
    width: 500,
    model: new Backbone.Model({ devices, authInfo })
  })
    .build(function () {
    })
    .addButton()
    .addAlternativeButton({ label: constants.LostButton, action: 'lost', className: 'btn-default' })
    .on('cancel', function () {
      def.reject()
    })
    .on('lost', function () {
      dialog.close()
      dialog = null
      import('@/io.ox/multifactor/lost').then(function ({ default: lost }) {
        lost(authInfo)
      })
    })
    .open()
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'header',
    render () {
      this.$body.append($('<p>').text(gt('Please select a device to use for additional authentication')))
    }
  },
  {
    index: INDEX += 100,
    id: 'selection',
    render (baton) {
      const options = baton.model.get('devices').map(device => {
        const iconName = constants[`${device.providerName}_ICON`]
        const icon = createIcon(iconName).addClass('bi-18 mfIcon')
        const deviceName = $('<span class="ml-16">').text(device.name)
        return $('<button class="btn btn-default flex flex-grow justify-start width-100 mb-8">')
          .append(icon, deviceName)
          .on('click', function (e) {
            e.preventDefault()
            const authInfo = baton.model.get('authInfo')
            authInfo.providerName = device.providerName
            authInfo.device = device
            deviceAuthenticator.getAuth(authInfo)
            dialog.close()
          })
      })
      this.$body.append(options)
    }
  },
  {
    index: INDEX += 100,
    id: 'error',
    render (baton) {
      const error = baton.model.get('authInfo').error
      if (error && error.text) {
        const div = $('<div class="multifactorError">').append(error.text)
        this.$body.append(div)
      }
    }
  }

)

const groupItems = ['U2F', 'WEB-AUTH']
let grouped = {}

function groupDevices (devices) {
  const newList = []
  devices.forEach(function (device) {
    if (groupItems.includes(device.providerName)) {
      if (!grouped[device.providerName]) {
        newList.push(device)
        grouped[device.providerName] = true
      } else {
        newList.forEach(function (dev) {
          if (dev.providerName === device.providerName) dev.name = '' // Wipe grouped names
        })
      }
    } else {
      newList.push(device)
    }
  })
  grouped = {} // reset
  return newList
}

export default {
  open
}
