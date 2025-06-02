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
import mini from '@/io.ox/backbone/mini-views/common'

import gt from 'gettext'

const POINT = 'multifactor/views/backupProvider'
let INDEX = 0

let dialog
let def
let lastResponse

function open (challenge, authInfo) {
  dialog = openModalDialog(challenge, authInfo)
  def = authInfo.def
  if (lastResponse) $('#recovery').val(lastResponse)
  return dialog
}

function openModalDialog (challenge, authInfo) {
  return new ModalView({
    async: true,
    point: POINT,
    title: constants.AuthenticationTitle,
    width: 640,
    enter: 'OK',
    className: `${constants.AuthDialogClass} modal flex`,
    model: new Backbone.Model({
      provider: authInfo.providerName,
      deviceId: authInfo.device.id,
      challenge,
      error: authInfo.error
    })
  })
    .build(function () {
    })
    .addButton({ label: constants.OKButton, action: 'OK' })
    .addCancelButton()
    .on('cancel', function () {
      def.reject()
    })
    .addAlternativeButton({ label: gt('Upload Recovery File'), action: 'Upload' })
    .on('OK', function () {
      const recoveryCode = $('#recovery').val()
      lastResponse = recoveryCode
      if (recoveryCode && recoveryCode !== '') {
        const resp = {
          response: recoveryCode,
          id: authInfo.device.id,
          provider: authInfo.providerName
        }
        def.resolve(resp)
      } else {
        def.reject()
      }
      if (dialog) dialog.close()
    })
    .on('open', function () {
      $('#verification').focus()
    })
    .on('Upload', function () {
      uploadRecovery().then(function (data) {
        const resp = {
          response: data,
          id: authInfo.device.id,
          provider: authInfo.providerName
        }
        def.resolve(resp)
        dialog.close()
      })
    })
    .open()
}

// Get recovery string from file
function uploadRecovery () {
  const deferred = $.Deferred()
  const fileInput = $('<input type="file" name="file" class="file">')
    .css('display', 'none')
    .on('change', function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader()
        reader.addEventListener('load', function (e) {
          deferred.resolve(e.target.result)
        })
        reader.readAsBinaryString(this.files[0])
      } else {
        deferred.reject()
      }
    })
  $('.recoveryDiv').append(fileInput)
  fileInput.click()
  return deferred
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'header',
    render () {
      this.$body.append($('<p>').text(gt('Please enter the recovery code')))
    }
  },
  {
    index: INDEX += 100,
    id: 'selection',
    render () {
      const Model = Backbone.Model.extend({
        initialize () {
          this.on('change:recovery', this.validateVerification)
        },
        validateVerification () {
          const valid = this.get('recovery').replaceAll(' ', '').length === 32
          if (valid) this.trigger('valid:recovery')
          else this.trigger('invalid:recovery', gt('Recovery code must be 32 characters long.'))
          return valid
        }
      })

      const model = new Model()

      const label = $('<label for="recovery">').text(gt('Recovery code'))
      const inputView = new mini.InputView({
        name: 'recovery',
        model,
        placeholder: '',
        autocomplete: false,
        validate: true
      })

      const errorView = new mini.ErrorView({ name: 'recovery', model })

      this.$body.append(
        $('<div class="form-group">').append(
          label,
          inputView.render().$el.attr('id', 'recovery'),
          errorView.render().$el
        )
      )
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
        if (lastResponse) {
          console.log(lastResponse)
        }
      }
    }
  }

)

export default {
  open
}
