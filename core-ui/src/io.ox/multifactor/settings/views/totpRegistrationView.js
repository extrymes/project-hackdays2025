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
import mini from '@/io.ox/backbone/mini-views/common'
import api from '@/io.ox/multifactor/api'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const POINT = 'multifactor/settings/views/totpRegistrationView'
let INDEX = 0

let dialog
let def

function open (provider, result, _def) {
  dialog = openModalDialog(provider, result)
  def = _def
  return dialog
}

function openModalDialog (provider, result) {
  return new ModalView({
    async: true,
    point: POINT,
    title: gt('Authenticator Registration'),
    enter: 'OK',
    focus: '#verification',
    model: new Backbone.Model({ device: result }),
    width: 400
  })
    .build(function () {
    })
    .addCancelButton()
    .addButton({ label: gt('Ok'), action: 'OK' })
    .on('OK', function () {
      const response = $('#verification').val().replace(/\s/g, '') // get value removing any padding
      if (response && response !== '') {
        finalize(provider, result, response)
      } else {
        def.reject()
      }
    })
    .on('cancel', function () {
      def.reject()
    })
    .open()
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'header',
    render () {
      this.$body.append($('<p class="mb-0">').text(gt('Scan the QR code with your authenticator.')))
    }
  },
  {
    index: INDEX += 100,
    id: 'qr',
    render (baton) {
      const { url, base64Image } = baton.model.get('device').challenge
      const qrCode = $(`<img id="qrcode" src="data:image/png;base64, ${base64Image}" class="block ms-auto me-auto" style="width: 220px;">`)
        .attr('title', gt('Click to copy URL to clipboard'))
        .on('click', () => navigator.clipboard.writeText(url))
      this.$body.append(qrCode)
    }
  },
  {
    index: INDEX += 100,
    id: 'code',
    render (baton) {
      const description = $('<p>').text(gt('If scanning does not work, you may be able to enter the following setup code.'))
      const code = $('<div>').append($('<div id="code" class="flex justify-center selectable-text font-mono font-bold mb-16">').append(
        formatSharedSecret(baton.model.get('device').challenge.sharedSecret)))
      this.$body.append(description, code)
    }
  },
  {
    index: INDEX += 100,
    id: 'prompt',
    render () {
      this.$body.append(
        $('<p>').text(gt('Once complete, please enter an authentication code to verify everything is configured properly.'))
      )
    }
  },
  {
    index: INDEX += 100,
    id: 'verification',
    render () {
      const Model = Backbone.Model.extend({
        initialize () {
          this.on('change:verification', this.validateVerification)
        },
        validateVerification () {
          const valid = /^\d*$/.test(this.get('verification'))
          if (valid) this.trigger('valid:verification')
          else this.trigger('invalid:verification', gt('Only numbers allowed'))
          return valid
        }
      })

      const model = new Model()

      const label = $('<label for="verification">').text(gt('Authentication code'))
      const inputView = new mini.InputView({
        name: 'verification',
        model,
        placeholder: '',
        autocomplete: false,
        validate: true
      })

      const errorView = new mini.ErrorView({ name: 'verification', model })

      this.$body.append(
        $('<div class="form-group">').append(
          label,
          inputView.render().$el.attr('id', 'verification'),
          errorView.render().$el
        )
      )
    }
  }
)

// Format the shared secret for easier display
function formatSharedSecret (secret) {
  if (!secret) return ''
  secret = secret.trim().replace(/(\w{4})/g, '$1 ').replace(/(^\s+|\s+$)/, '')
  return secret.slice(0, 19) + '<br>' + secret.slice(20)
}

// Display error message
function showError (error) {
  yell('error', error)
}

// Complete registration with confirmation code
function finalize (provider, device, response) {
  const resp = {
    secret_code: response
  }

  api.finishRegistration(provider, device.deviceId, resp).then(function (data) {
    if (data && data.enabled) { // Good response.  Done
      dialog.close()
      def.resolve()
      return
    }
    let error
    if (data && data.error) { // Bad code
      error = gt('Bad input or server error. Please try again.') + ' ' + data.error
    }
    showError(error)
    dialog.idle()
    $('#verification').focus()
  }, function (data) {
    if (data && data.code === 'MFA-0021') {
      showError(gt('Bad verification code. Please try again'))
      dialog.idle()
      $('#verification').focus()
      return
    }
    showError(gt('Bad input or server error. Please try again.') + ' ' + data.error)
    dialog.close()
    def.reject()
    console.error(data)
  })
}

export default {
  open
}
