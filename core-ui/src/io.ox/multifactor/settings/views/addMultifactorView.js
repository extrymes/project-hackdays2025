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
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import ModalView from '@/io.ox/backbone/views/modal'
import constants from '@/io.ox/multifactor/views/constants'
import addDeviceView from '@/io.ox/multifactor/settings/views/addDevice'

import '@/io.ox/multifactor/auth'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

const POINT = 'multifactor/settings/addMultifactor'
let INDEX = 0

let def
let dialog

function open (providers, backup) {
  dialog = openModalDialog(providers, backup)
  def = new $.Deferred()
  return def
}

function openModalDialog (providers, backup) {
  const dialog = new ModalView({
    async: true,
    point: POINT,
    title: backup ? gt('Add Recovery Option') : gt('Add Verification Option'),
    enter: 'add',
    model: new Backbone.Model({ providers, backup })
  })
    .on('cancel', () => def.reject)
    .addButton()
    .open()
  dialog.$el.addClass('verification-options')
  return dialog
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'backupHelp',
    render (baton) {
      if (baton.model.get('backup')) {
        const label = $('<p class="backupDescr">').append(gt('In the event you lose or are unable to use your authentication device, your account will be locked out unless you set up a recovery method. We strongly recommend that you do so now.'))
          .append('<br>')
        this.$body.append(
          label
        )
      }
    }
  },
  {
    index: INDEX += 100,
    id: 'selector',
    render (baton) {
      const providers = baton.model.get('providers')
      if (!providers || providers.length === 0) {
        this.$body.append($('<div>').append(gt('No providers available')))
        return
      }
      const node = this
      const options = providers.map(provider => getProviderSelection(provider, baton.model.get('backup')))
      node.$body.append(options)
    }
  }

)

function getProviderSelection (provider, backup) {
  let icon
  let text
  switch (provider.name) {
    case constants.SMS:
      icon = constants.SMS_ICON
      text = gt('Code via text message')
      break
    case 'WebAuthn':
      // Currently not allowing new
      return
    case constants.U2F:
      if (!window.u2f || location.protocol !== 'https:') return
      text = gt('Yubikey, Google Security Keys, or compatible FIDO device')
      icon = constants.U2F_ICON
      break
    case 'YUBIKEY':
      text = gt('Use Yubikey\'s One Time Password System')
      icon = 'bi/person-badge.svg'
      break
    case constants.TOTP:
      text = gt('Google Authenticator or compatible')
      icon = constants.TOTP_ICON
      break
    case constants.BACKUP:
      text = gt('Backup code to access your account.')
      icon = constants.BACKUP_ICON
      break
    default: {
      const baton = new ext.Baton()
      ext.point('io.ox/multifactor/addDevice/' + provider.name).invoke('render', this, baton)
      if (baton.data.text) {
        text = baton.data.text
        icon = baton.data.icon
      } else {
        text = gt('Unknown system')
        icon = 'bi/exclamation-triangle.svg'
      }
    }
  }
  const button = $('<button class="btn btn-default flex flex-grow justify-start width-100 mb-8">')
    .on('click', function (e) {
      addDevice(provider.name, backup)
      e.preventDefault()
    })
  const iconCol = createIcon(icon).addClass('bi-18 mfIcon')
  const textCol = $('<span class="ml-16">').append(text)
  return button.append(iconCol).append(textCol)
}

function addDevice (name, backup) {
  addDeviceView.start(name, def, backup)
  dialog.close()
}

export default {
  open
}
