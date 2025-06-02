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
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import ModalView from '@/io.ox/backbone/views/modal'
import constants from '@/io.ox/multifactor/views/constants'
import HelpLink from '@/io.ox/backbone/mini-views/helplink'

import gt from 'gettext'

const POINT = 'multifactor/views/totpProvider'
let INDEX = 0

let dialog
let def

function open (challenge, authInfo) {
  dialog = openModalDialog(challenge, authInfo)
  dialog.$header.addClass('help')
  def = authInfo.def
  return dialog
}

function openModalDialog (challenge, authInfo) {
  return new ModalView({
    async: true,
    point: POINT,
    title: authInfo.reAuth ? constants.ReAuthenticationTitle : constants.AuthenticationTitle,
    enter: 'OK',
    model: new Backbone.Model({
      provider: authInfo.providerName,
      deviceId: authInfo.device.id,
      challenge,
      error: authInfo.error
    })
  })
    .build(function () {
    })
    .addCancelButton()
    .addButton({ label: constants.OKButton, action: 'OK' })
    .addAlternativeButton({ label: constants.LostButton, action: 'lost', className: authInfo.device.backup ? 'hidden' : 'btn-default' })
    .on('OK', function () {
      const response = $('#authentication').val().replace(/\s/g, '')
      if (response && response !== '') {
        const resp = {
          response,
          id: authInfo.device.id,
          provider: authInfo.providerName
        }
        def.resolve(resp)
      } else {
        def.reject()
      }
      dialog.close()
    })
    .on('cancel', function () {
      def.reject()
    })
    .on('open', function () {
      _.defer(function () {
        $('#authentication').focus()
      })
    })
    .on('lost', function () {
      dialog.close()
      import('@/io.ox/multifactor/lost').then(function ({ default: lost }) {
        lost(authInfo)
      })
    })
    .open()
}

// Input should only be 0-9
function inputChanged (e) {
  $(e.target).toggleClass('mfInputError', e.target.value.match(/[0-9\s]*/)[0] !== e.target.value)
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'help',
    render () {
      const help = new HelpLink({
        base: 'help',
        href: 'ox.appsuite.user.sect.security.multifactor.authenticator.html ',
        tabindex: '-1',
        simple: !ox.ui.createApp // If ui not fully loaded, simple help only
      }).render().$el
      this.$header.append(help.addClass('mfHelp'))
    }
  },
  {
    index: INDEX += 100,
    id: 'help',
    render () {
      const label = $('<p style="multifactor-help">')
        .append(gt('You secured your account with 2-step verification. Please enter the verification code from the Authenticator App.'))
        .append('<br>')
      this.$body.append(
        label
      )
    }
  },
  {
    index: INDEX += 100,
    id: 'header',
    render () {
      const label = $('<label for="authentication">').append(gt('Authentication Code:'))
        .append('<br>')
      this.$body.append(label)
    }
  },
  {
    index: INDEX += 100,
    id: 'selection',
    render () {
      const input = $('<input type="text" class="form-control mfInput" id="authentication">')
        .keyup(inputChanged)
      const selection = $('<div class="multifactorAuthDiv">')
        .append(input)
      this.$body.append(selection)
    }
  },
  {
    index: INDEX += 100,
    id: 'error',
    render (baton) {
      const error = baton.model.get('error')
      if (error && error.text) {
        const label = $('<label class="multifactorError">').append(error.text)
        this.$body.append(label)
      }
    }
  }

)

export default {
  open
}
