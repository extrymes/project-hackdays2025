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
import { isValidMailAddress } from '@/io.ox/core/util'
import keychainModel from '@/io.ox/keychain/model'
import AccountAPI from '@/io.ox/core/api/account'
import folderAPI from '@/io.ox/core/folder/api'
import validation from '@/io.ox/backbone/validation'
import { settings as mailSettings } from '@/io.ox/mail/settings'

import gt from 'gettext'

const AccountModel = keychainModel.Account.extend({

  defaults: {
    // some conditional defaults defined in view-form.render (pop3)
    spam_handler: 'NoSpamHandler',
    transport_auth: 'mail',
    transport_password: null
  },

  validation: {
    name: {
      required: true,
      msg: gt('The account must be named')
    },
    primary_address: [
      {
        required: true,
        msg: gt('This field is mandatory')
      }, {
        fn: 'isMailAddress'
      }
    ],
    reply_to (value) {
      if (!value || !value.trim()) return
      if (value.split(',').every((address) => { return isValidMailAddress(address) })) return
      return gt('This is not a valid email address. If you want to specify multiple addresses, please use a comma to separate them.')
    },
    login (value) {
      // for setups without any explicit login name for primary account
      if (this.attributes.id !== 0 && $.trim(value) === '') {
        return gt('This field is mandatory')
      }
    },
    password (value) {
      // if we have an id we are in edit mode, not create new account mode. Here we don't get the password from the server, so this field may be empty.
      if (this.attributes.id === undefined && (!value || value === '')) {
        return gt('This field is mandatory')
      }
    },
    mail_server: {
      required () {
        return !this.isHidden()
      },
      msg: gt('This field is mandatory')
    },
    mail_port: [
      {
        required () {
          return !this.isHidden()
        },
        msg: gt('This field is mandatory')
      },
      {
        fn (val) {
          const temp = validation.formats.number(val)
          if (temp === true) {
            // strangely if the validation returns true here, it is marked as invalid...
            return false
          }
          return temp
        }
      }
    ],
    transport_server: {
      required () {
        return !this.isHidden() && !this.get('secondary') && mailSettings.get('features/allowExternalSMTP', true)
      },
      msg: gt('This field is mandatory')
    },
    transport_port: [
      {
        required () {
          return !this.isHidden() && mailSettings.get('features/allowExternalSMTP', true)
        },
        msg: gt('This field is mandatory')
      },
      {
        fn (val) {
          const temp = validation.formats.number(val)
          if (temp === true) {
            // strangely if the validation returns true here, it is marked as invalid...
            return false
          }
          return temp
        }
      }
    ]
  },

  isHidden () {
    // convention with backend
    return this.attributes.id === 0 && !this.attributes.mail_server
  },

  isMailAddress (newMailaddress) {
    const regEmail = /@/.test(newMailaddress)

    if (!regEmail) return gt('This is not a valid email address')
  },

  initialize () {

  },

  validationCheck (data, options) {
    data = _.extend({ unified_inbox_enabled: false, transport_auth: 'mail' }, data || this.toJSON())
    data.name = data.personal = data.primary_address
    // don't send transport_login/password if transport_auth is mail
    if (data.transport_auth === 'mail') {
      delete data.transport_login
      delete data.transport_password
      if (!mailSettings.get('features/allowExternalSMTP', true)) {
        delete data.transport_server
        delete data.transport_port
        delete data.transport_auth
      }
    }
    return AccountAPI.validate(data, options)
  },

  save (obj) {
    const id = this.get('id')
    const model = this

    if (id !== undefined) {
      // get account to determine changes
      return AccountAPI.get(id).then(function (account) {
        const changes = { id }
        // primary mail account only allows editing of display name, unified mail and default folders
        const keys = id === 0
          ? ['personal', 'name', 'unified_inbox_enabled', 'sent_fullname', 'trash_fullname', 'drafts_fullname', 'spam_fullname', 'archive_fullname', 'reply_to']
          : model.keys()

        // compare all attributes
        _(model.pick(keys)).each(function (value, key) {
          if (!_.isEqual(value, account[key])) changes[key] = value
        })

        // don't send transport_login/password if transport_auth is mail
        if (model.get('transport_auth') === 'mail') {
          delete changes.transport_login
          delete changes.transport_password
        }

        return AccountAPI.update(changes).done(function () {
          let def = $.when()
          folderAPI.pool.unfetch('default' + id)
          if (typeof changes.unified_inbox_enabled !== 'undefined') {
            def = mailSettings.ensureData().then(function (settings) {
              // reload settings to fetch unifiedInboxIdentifier
              return settings.reload()
            }).then(function () {
              folderAPI.pool.unfetch('1')
            })
          } else if (id === 0) {
            // reload settings before folder refresh when the primary account is changed to get correct default folders (virtual standard relies on these settings)
            def = mailSettings.ensureData().then(function (settings) {
              // reload settings to fetch unifiedInboxIdentifier
              return settings.reload()
            })
          }
          def.then(function () {
            folderAPI.refresh()
          })
        })
      }).then(function () {
        model.trigger('sync', model)
      })
    }

    if (obj) {
      obj = _.extend({ unified_inbox_enabled: false }, obj)
      obj.name = obj.primary_address
      model.attributes = obj
      model.attributes.spam_handler = 'NoSpamHandler'
    }

    if (!mailSettings.get('features/allowExternalSMTP', true) && model.get('transport_auth') === 'mail') {
      model.unset('transport_login', { silent: true })
      model.unset('transport_password', { silent: true })
      model.unset('transport_auth', { silent: true })
      model.unset('transport_port', { silent: true })
    }

    return AccountAPI.create(model.attributes)
  },

  destroy () {
    AccountAPI.remove([this.attributes.id])
  }

})

export default AccountModel
