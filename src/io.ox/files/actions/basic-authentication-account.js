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

import ModalDialog from '@/io.ox/backbone/views/modal'
import filestorageApi from '@/io.ox/core/api/filestorage'
import yell from '@/io.ox/core/yell'
import ext from '@/io.ox/core/extensions'

import gt from 'gettext'

function createNonOauthAccount (action, service) {
  const def = $.Deferred()
  const baton = ext.Baton({})

  function assembleData (dialog) {
    return {
      displayName: dialog.$body.find('.add-storage-account-displayname').val().trim(),
      configuration: {
        login: dialog.$body.find('.add-storage-account-login').val().trim(),
        password: dialog.$body.find('.add-storage-account-password').val().trim(),
        url: dialog.$body.find('.add-storage-account-url').val().trim()
      }
    }
  }

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'displayname',
    index: 100,
    draw () {
      let input; const self = this
      this.append(
        $('<div class="form-group">').append(
          $('<label for="add-storage-account-displayname">').text(gt('Display name')),
          input = $('<input id="add-storage-account-displayname" type="text" class="form-control add-storage-account-displayname" autocomplete="section-addAccount new-displayname">') // ??
        )
      )

      input.on('change', function () {
        const alert = self.find('.alert')
        if (alert.length && alert.attr('errorAttributes').indexOf('displayname') !== -1) {
          alert.remove()
        }
      })
    }
  })

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'login',
    index: 100,
    draw () {
      let input; const self = this
      this.append(
        $('<div class="form-group">').append(
          $('<label for="add-storage-account-login">').text(gt('Your user name')),
          input = $('<input id="add-storage-account-login" type="text" class="form-control add-storage-account-login" autocomplete="section-addAccount new-username">') // ??
        )
      )

      input.on('change', function () {
        const alert = self.find('.alert')
        if (alert.length && alert.attr('errorAttributes').indexOf('login') !== -1) {
          alert.remove()
        }
      })
    }
  })

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'password',
    index: 200,
    draw () {
      let input; const self = this
      this.append(
        $('<div class="form-group">').append(
          $('<label for="add-storage-account-password">').text(gt('Your password')),
          input = $('<input id="add-storage-account-password" type="password" class="form-control add-storage-account-password" autocomplete="section-addAccount new-password">')
        )
      )

      input.on('change', function () {
        const alert = self.find('.alert')
        if (alert.length && alert.attr('errorAttributes').indexOf('password') !== -1) {
          alert.remove()
        }
      })
    }
  })

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'url',
    index: 200,
    draw () {
      let input; const self = this
      this.append(
        $('<div class="form-group">').append(
          $('<label for="add-storage-account-url">').text(gt('Your url')),
          input = $('<input id="add-storage-account-url" type="text" class="form-control add-storage-account-url" autocomplete="section-addAccount new-url">')
        )
      )

      input.on('change', function () {
        const alert = self.find('.alert')
        if (alert.length && alert.attr('errorAttributes').indexOf('url') !== -1) {
          alert.remove()
        }
      })
    }
  })

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'security-hint',
    index: 300,
    draw () {
      if (window.location.protocol !== 'https:') return
      this.append($('<div class="help-block">').text(gt('Your credentials will be sent over a secure connection only')))
    }
  })

  ext.point('io.ox/files/add-account/wizard').extend({
    id: 'feedback',
    index: 1000000000000,
    draw () {
      this.append(
        $('<div class="alert-placeholder">')
      )
    }
  })

  new ModalDialog({
    model: new Backbone.Model(),
    title: gt('Add storage account'),
    enter: action === 'create' ? 'add' : 'update',
    async: true
  })
    .build(function () {
      baton.popup = this
      // invoke extensions
      ext.point('io.ox/files/add-account/wizard').invoke('draw', this.$body, baton)

      if (action === 'update') {
        this.$body.find('.add-storage-account-displayname').val(service.get('displayName'))
        this.$body.find('.add-storage-account-login').val(service.get('configuration').login)
        this.$body.find('.add-storage-account-password').val(service.get('configuration').password)
        this.$body.find('.add-storage-account-url').val(service.get('configuration').url)
      }
    })
    .addCancelButton()
    .addButton(action === 'create' ? { label: gt('Add'), action: 'add' } : { label: gt('Update'), action: 'update' })
    .on('add', function () {
      const createOptions = assembleData(this)
      createOptions.filestorageService = service.get('id')

      return filestorageApi.createAccount(createOptions)
        .then(function () {
          def.resolve()
          baton.popup.close()
          yell('success', gt('Account added successfully'))
        }, function (error) {
          yell('error', error.error)
          baton.popup.idle()
        })
    })
    .on('update', function () {
      const updateOptions = assembleData(this)
      updateOptions.id = service.get('id')
      updateOptions.filestorageService = service.get('filestorageService')

      return filestorageApi.updateAccount(updateOptions)
        .done(function () {
          const errorAttributes = ['hasError', 'error', 'error_params', 'error_id', 'error_desc', 'error_stack', 'code', 'status']
          _.each(errorAttributes, function (val) {
            service.unset(val)
          })
          service.set('displayName', updateOptions.displayName)
          service.set('configuration', updateOptions.configuration)
          def.resolve()
          baton.popup.close()
          filestorageApi.trigger('refresh:basicAccount', service.get('qualifiedId'))
          yell('success', gt('Account updated successfully'))
        }).fail(function () {
          yell('error', gt('The entered credential or authentication information does not work'))
          baton.popup.idle()
        })
    })
    .on('open', function () {
      const self = this
      this.$footer.find('[data-action="add"]').prop('disabled', true)
      this.$body.on('keyup', 'input', function () {
        const values = []
        _.each(self.$el.find('input'), function (el) {
          if (el.value !== '') {
            values.push(el.value)
          }
        })
        if (values.length === 4) {
          self.$footer.find('[data-action="add"]').prop('disabled', false)
        } else {
          self.$footer.find('[data-action="add"]').prop('disabled', true)
        }
      })
    })
    .open()
  return def
}

export default createNonOauthAccount
