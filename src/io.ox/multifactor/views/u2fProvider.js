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
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import ModalView from '@/io.ox/backbone/views/modal'
import constants from '@/io.ox/multifactor/views/constants'
import HelpLink from '@/io.ox/backbone/mini-views/helplink'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const POINT = 'multifactor/views/u2fProvider'
let INDEX = 0

let dialog
let def

function open (challenge, authInfo) {
  dialog = openModalDialog(challenge, authInfo)
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
      error: authInfo.error,
      device: authInfo.device
    })
  })
    .build(function () {
    })
    .addCancelButton()
    .addAlternativeButton({ label: constants.LostButton, action: 'lost', className: authInfo.device.backup ? 'hidden' : 'btn-default' })
    .on('cancel', function () {
      def.reject()
    })
    .on('open', function () {
      if (window.u2f) {
        doAuthentication(authInfo.providerName, authInfo.device, challenge)
      } else {
        doWebAuthn(authInfo.providerName, authInfo.device, challenge)
      }
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
    id: 'help',
    render () {
      const help = new HelpLink({
        base: 'help',
        href: 'ox.appsuite.user.sect.security.multifactor.securitykey.html',
        tabindex: '-1',
        simple: !ox.ui.createApp // If ui not fully loaded, simple help only
      }).render().$el
      this.$header.append(help.addClass('mfHelp'))
    }
  },
  {
    index: INDEX += 100,
    id: 'header',
    render () {
      let label
      if (window.u2f || navigator.credentials) {
        label = $('<label>').append(
          gt('You secured your account with 2-step verification. Please use your authentication token to complete verification.'))
      } else {
        label = $('<p>').append(gt('This browser is not compatible with your configured authentication device. Please use Chrome browser, or Firefox with U2F enabled.'))
      }
      this.$body.append(label)
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
// Converts a Base64 String to a Uint8 - ArrayBuffer
function bufferDecode (value) {
  // eslint-disable-next-line no-undef
  return Uint8Array.from(atob(value), function (c) { return c.charCodeAt(0) })
}

function bufferUrlDecode (value) {
  return bufferDecode(base64UrlToBase64(value))
}

// Converts a base64URL encoded string to pure base64
function base64UrlToBase64 (input) {
  // Replace non-url compatible chars with base64 standard chars
  input = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  // Pad out with standard base64 required padding characters
  const pad = input.length % 4
  if (pad) {
    if (pad === 1) {
      throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding')
    }
    input += new Array(5 - pad).join('=')
  }
  return input
}

// ArrayBuffer to URLBase64URL
function bufferUrlEncode (value) {
  // eslint-disable-next-line no-undef
  return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '')
}

// U2F support deprecated.  Using Webauthn to perform the U2F authentication
function doWebAuthn (provider, device, data) {
  const publicKey = data.credentialsGetJson.publicKey
  publicKey.challenge = bufferUrlDecode(publicKey.challenge)
  publicKey.allowCredentials.forEach(function (listItem) {
    listItem.id = bufferUrlDecode(listItem.id)
  })
  navigator.credentials.get(data.credentialsGetJson)
    .then(function (assertion) {
      data = {
        id: assertion.id,
        response: {
          authenticatorData: bufferUrlEncode(assertion.response.authenticatorData),
          signature: bufferUrlEncode(assertion.response.signature),
          clientDataJSON: bufferUrlEncode(assertion.response.clientDataJSON),
          userHandle: bufferUrlEncode(assertion.response.userHandle)
        },
        clientExtensionResults: assertion.getClientExtensionResults(),
        type: assertion.type,
        rawId: bufferUrlEncode(assertion.rawId)
      }
      // Success
      yell.close() // Remove any previous notification alerts/errors
      dialog.close()
      const resp = {
        parameters: data,
        id: device.id,
        provider: 'WebAuthn'
      }
      def.resolve(resp)
    }, function (fail) {
      // TODO: evaluate error messages and display propper error
      yell(fail)
    })
}

//  Use the classic U2F implementation.  Currently only firefox supported

function doAuthentication (provider, device, data) {
  const appId = data.signRequests[0].appId
  const challenge = data.signRequests[0].challenge

  window.u2f.sign(appId, challenge, data.signRequests,
    function (response) {
      if (response.errorCode) {
        let error, recoverable
        switch (response.errorCode) {
          case 2:
            // #. Error message when trying to use a USB Keyfob to verify identity, maybe wrong website
            error = gt('Bad parameters for authenticating with this key. Possibly wrong URL domain for this key.')
            recoverable = false
            break
          case 3:
            // #. Error message when trying to use a USB Keyfob to verify identity.  Some configuration is wrong
            error = gt('Configuration not supported')
            recoverable = false
            break
          case 4:
            // #. Error message when trying to use a USB Keyfob to verify identity.  Probably wrong key
            error = gt('This device is not eligible for this request. Wrong hardware key?')
            recoverable = false
            break
          case 5:
            error = gt('Timeout')
            recoverable = true
            break
          default:
            // #. Error message when trying to use a USB Keyfob to verify identity  Error with authenticating
            error = gt('Error authenticating. Please reload browser and try again.')
            recoverable = false
            break
        }
        if (dialog) {
          yell('error', error)
          if (recoverable) {
            doAuthentication(provider, device, data)
          } else {
            window.setTimeout(function () {
              if (dialog) { // might be closed with user selecting lost
                dialog.close()
                def.reject()
              }
            }, 5000)
          }
        }

        return
      }
      // Success
      yell.close() // Remove any previous notification alerts/errors
      const resp = {
        parameters: response,
        id: device.id,
        provider
      }
      dialog.close()
      def.resolve(resp)
    })
}

export default {
  open
}
