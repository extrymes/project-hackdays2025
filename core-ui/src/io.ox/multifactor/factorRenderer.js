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

import ext from '@/io.ox/core/extensions'
import constants from '@/io.ox/multifactor/views/constants'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import { icon } from '@/io.ox/core/components'

import '@/io.ox/backbone/mini-views/settings-list-view.scss'

import gt from 'gettext'

let duplicates = {}

// Create table entry for the device
function createLi (iconType, type, deviceObj, enableControls) {
  const li = $('<li class="settings-list-item multifactordevice">')
    .attr({
      'data-deviceId': deviceObj.id,
      'data-deviceName': deviceObj.name,
      'data-provider': deviceObj.providerName
    })

  const editButton = listUtils.appendIconText(listUtils.controlsEdit({ ariaLabel: gt('Edit %1$s', deviceObj.name) }), gt('Edit'), 'edit').addClass('mfEdit')
  const deleteButton = listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', deviceObj.name) }).addClass('mfDelete')

  const controls = $('<div class="list-item-controls">').append(editButton, deleteButton)

  return li.append(
    icon(iconType).addClass('bi-18 mfIcon').attr('aria-hidden', true),
    $('<div class="mfTitle">').append(
      $('<div class="mfName">').text(deviceObj.name),
      $('<div class="list-item-title">').text(type)
    ),
    enableControls && controls)
}

// Create Table entry based on provider type
function getDeviceLi (device, enableControls) {
  let baton
  switch (device.providerName) {
    case constants.SMS:
      return createLi(constants.SMS_ICON, gt('SMS Code'), device, enableControls)
    case 'WEB-AUTH':
      return createLi('bi/cpu.svg', gt('Web auth'), device, enableControls)
    case constants.U2F:
      if (!enableControls && duplicates.u2f) return // Only display one u2f device when authenticating
      duplicates.u2f = true
      return createLi(constants.U2F_ICON, gt('Security Token'), device, enableControls)
    case 'YUBIKEY':
      return createLi(constants.YUBIKEY_ICON, gt('Yubikey'), device, enableControls)
    case constants.TOTP:
      return createLi(constants.TOTP_ICON, gt('Google Authenticator'), device, enableControls)
    case constants.BACKUP:
      return createLi(constants.BACKUP_ICON, gt('Recovery code'), device, enableControls)
    default:
      baton = new ext.Baton()
      ext.point('io.ox/multifactor/device/' + device.providerName).invoke('render', this, baton)
      if (baton.data.text) {
        return createLi(baton.data.icon, baton.data.text, device, enableControls)
      }
      // what's the purpose of this string? removed gt call for
      // this
      return $('<span>').append('UNKNOWN')
  }
}

function doRender (devices, enableControls) {
  duplicates = {}
  const ul = $('<ul class="list-group list-unstyled settings-list-view">')
  devices.forEach(function (device) {
    ul.append(getDeviceLi(device, enableControls))
  })
  return ul
}

const renderer = {
  renderDeletable (devices) {
    return doRender(devices, true)
  },
  renderList (devices) {
    return doRender(devices, false)
  }
}

export default renderer
