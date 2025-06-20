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

import api from '@/io.ox/keychain/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

export default {
  show () {
    new ModalDialog({
      title: gt('Recover external account passwords'),
      description: gt('You recently changed your password. Please provide your last password to recover passwords for external accounts.'),
      easyOut: false,
      async: true,
      width: 500,
      enter: 'migrate'
    })
      .build(function () {
        const guid = _.uniqueId('form-control-label-')
        this.$body.append($('<fieldset role="presentation" class="form-group row">').append($('<div class="col-md-12">').append(
          $('<label>').attr('for', guid).text(gt('Your old password')),
          $('<input type="password" name"recovery-password" class="form-control">').attr('id', guid)
        )))
      })
      .addButton({ label: gt('Remove passwords'), action: 'ignore', className: 'btn-default', placement: 'left' })
      .addButton({ label: gt('Remind me again'), className: 'btn-default', action: 'cancel' })
      .addButton({ label: gt('Recover'), action: 'migrate' })
      .on('cancel', function () {
        this.$body.find('input').val('')
      })
      .on('ignore', function () {
        const self = this.busy()
        return api.cleanUp().done(function () {
          self.close()
        }).fail(function (e) {
          yell({
            headline: gt('Error'),
            type: 'error',
            message: e.error
          })
          self.idle()
        })
      })
      .on('migrate', function () {
        const self = this.busy()
        // recover accounts
        return api.migrateFromOldSecret(this.$body.find('input').val()).done(function migrationSuccessful () {
          self.$body.find('input').val('')
          self.close()

          Promise.all([import('@/io.ox/core/folder/api'), import('@/io.ox/core/api/account')], function ([{ default: api }, { default: accountAPI }]) {
            api.list('1', { cache: false }).done(function () {
              api.virtual.refresh()
            })
            accountAPI.trigger('account:recovered')
          })

          // process queue
        }).fail(function migrationFailed (e) {
          yell({
            headline: gt('Failed to recover accounts'),
            type: 'error',
            message: e.error
          })
          self.idle()
          self.$body.find('input').focus().select()
        })
      })
      .open()
  }
}
