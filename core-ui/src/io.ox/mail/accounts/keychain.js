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
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import accountAPI from '@/io.ox/core/api/account'
import userAPI from '@/io.ox/core/api/user'
import capabilities from '@/io.ox/core/capabilities'
import Events from '@/io.ox/core/event'
import AccountModel from '@/io.ox/mail/accounts/model'
import filestorageAPI from '@/io.ox/core/api/filestorage'
import { triggerReady } from '@/io.ox/core/events'

import gt from 'gettext'

const moduleDeferred = $.Deferred()

ext.point('io.ox/keychain/model').extend({
  id: 'mail',
  index: 100,
  accountType: 'mail',
  wrap (thing) {
    return new AccountModel(thing)
  }
})

let accounts = {}
let fileAccounts = {}

function init (evt, data) {
  ox.on('account:update', async (id) => {
    const account = await accountAPI.get(id)
    if (!account) return
    _.findWhere(accounts, { id: account.id }).name = account.name
  })

  return $.when(accountAPI.all().then(function (allAccounts) {
    const accounts = {}
    _(allAccounts).each(function (account) {
      accounts[account.id] = account
      account.accountType = 'mail'
      account.displayName = account.name || account.primary_address
      /* read display name from users vcard, if personal field is unset
       * this is needed for internal accounts, at the moment
       * FIXME: save one API call here, if data.personal can be assured
       */
    })
    return accounts
  }, function () {
    return {}
  }), filestorageAPI.getAllAccounts().then(function (allFileAccounts) {
    const accounts = {}
    allFileAccounts = allFileAccounts.models
    _(allFileAccounts).each(function (account) {
      // show federated sharing accounts when debugging mode is true, helps developing and is also a convenient way to remove broken accounts (offers delete action)
      const filterRegex = (ox.debug ? /owncloud|nextcloud|webdav|xox\d+|xctx\d+/ : /owncloud|nextcloud|webdav/)
      if (filterRegex.test(account.get('filestorageService'))) {
        account = account.attributes

        const error = account.hasError ? { message: account.error } : account.status = 'ok'
        accounts[account.id] = account
        account.accountType = 'fileAccount'
        account.status = error
      }
    })
    return accounts
  }, function () {
    return {}
  })).always(function (allAccounts, allFileAccounts) {
    accounts = allAccounts
    fileAccounts = allFileAccounts
    if (data) {
      accounts[data.id] = data
      data.accountType = 'mail'
      data.displayName = data.name || data.primary_address
      /* read display name from users vCard, if personal field is unset
       * this is needed for internal accounts, at the moment
       * FIXME: save one API call here, if data.personal can be assured
       */
      userAPI.getName(ox.user_id).then(function (name) {
        data.personal = data.personal || name
      })
    }

    if (evt) {
      evt = evt.namespace ? evt.type + '.' + evt.namespace : evt.type
      if (evt === 'create:account') {
        extension.trigger('create')
        extension.trigger('refresh.all')
        return
      }
      extension.trigger(evt)
    }
  })
}

init().always(function () {
  triggerReady('accounts')
  moduleDeferred.resolve({ message: 'Loaded mail keychain' })
})
accountAPI.on('create:account refresh.all refresh.list', init)
filestorageAPI.on('update', init)

function trigger (evt) {
  return function () {
    extension.trigger(evt)
  }
}

accountAPI.on('deleted', trigger('deleted'))
accountAPI.on('updated', trigger('updated'))

const extension = {
  id: 'mail',
  index: 100,
  // displayName appears in drop-down menu
  displayName: gt('Mail account'),
  actionName: 'mailaccount',
  canAdd () {
    return capabilities.has('multiple_mail_accounts')
  },
  getAll () {
    return _(accounts).map(function (account) { return account })
  },
  get (id) {
    return accounts[id]
  },
  getStandardAccount () {
    return accounts[0]
  },
  hasStandardAccount () {
    return !!accounts[0]
  },
  createInteractively (e) {
    const def = $.Deferred()
    import('@/io.ox/mail/accounts/settings').then(function ({ default: mailSettings }) {
      mailSettings.mailAutoconfigDialog(e).done(function () {
        def.resolve()
      }).fail(def.reject)
    })

    return def
  },
  remove (account) {
    const removed = accountAPI.remove([account.id])
    delete accounts[account.id]
    return removed
  },
  update (account) {
    return accountAPI.update(account)
  }
}

const extensionFileservice = {
  id: 'fileservice',
  index: 200,
  actionName: 'fileservice',
  getAll () {
    return _(fileAccounts).map(function (account) { return account })
  },
  get (id) {
    return fileAccounts[id]
  }
}

Events.extend(extension)
Events.extend(extensionFileservice)

ext.point('io.ox/keychain/api').extend(extension)
ext.point('io.ox/keychain/api').extend(extensionFileservice)

export default moduleDeferred
