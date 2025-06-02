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

import Backbone from '@/backbone'
import $ from '@/jquery'
import _ from '@/underscore'

import ox from '@/ox'
import { addReadyListener } from '@/io.ox/core/events'
import ext from '@/io.ox/core/extensions'
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import yell from '@/io.ox/core/yell'
import folderAPI from '@/io.ox/core/folder/api'
import haloAPI from '@/plugins/halo/api'
import filestorageApi from '@/io.ox/core/api/filestorage'
import OAuth from '@/io.ox/oauth/backbone'

import gt from 'gettext'

const accounts = new OAuth.Account.Collection()
const point = ext.point('io.ox/keychain/api')
const ServiceModel = Backbone.Model.extend({
  initialize () {
    const keychainAPI = new OAuthKeychainAPI(this.toJSON())

    // add initialized listener before extending (that triggers the initialized event)
    keychainAPI.one('initialized', function () {
      // trigger refresh if we have accounts or the settings account list might miss Oauth accounts due to race conditions
      if (accounts.length > 0) {
        keychainAPI.trigger('refresh.all')
      }
    })

    point.extend(keychainAPI)

    this.keychainAPI = keychainAPI
  },
  canAdd (options) {
    if (_.isFunction(this.keychainAPI.canAdd)) {
      return this.keychainAPI.canAdd(options)
    }
    const service = this
    const scopes = [].concat(options.scopes || [])
    return scopes.reduce(function hasAvailableScope (acc, scope) {
      return acc && _(service.get('availableScopes')).contains(scope)
    }, true)
  }
})
const ServiceCollection = Backbone.Collection.extend({
  model: ServiceModel,
  forAccount (account) {
    return this.get(account.get('serviceId'))
  },
  withShortId (shortId) {
    return this.filter(function (service) {
      return simplifyId(service.id) === shortId
    })[0]
  }
})
let services

const generateId = function () {
  generateId.id = generateId.id + 1
  return generateId.id
}

generateId.id = 1

function simplifyId (id) {
  return id.substring(id.lastIndexOf('.') + 1)
}

function chooseDisplayName (service) {
  // check if model or simple json
  if (service.toJSON) service = service.toJSON()

  const names = {}; let name; let counter = 0
  _(accounts.forService(service.id)).each(function (account) {
    names[account.get('displayName')] = 1
  })

  // #. %1$s is the display name of the account
  // #. e.g. My Xing account
  name = gt('My %1$s account', service.displayName)

  while (names[name]) {
    counter++
    // #. %1$s is the display name of the account
    // #. %2$d number, if more than one account of the same service
    // #. e.g. My Xing account
    name = gt('My %1$s account (%2$d)', service.displayName, counter)
  }

  return name
}

// Extension
function OAuthKeychainAPI (service) {
  const self = this

  Events.extend(this)

  this.id = simplifyId(service.id)
  this.displayName = service.displayName

  function outgoing (account) {
    if (!account) {
      return account
    }
    account.accountType = self.id
    return account
  }

  this.getAll = function () {
    return _(accounts.forService(service.id)).chain()
      .map(function (account) { return account.toJSON() })
      .sortBy(function (account) { return account.id })
      .map(outgoing)
      .value()
  }

  this.get = function (id) {
    return outgoing(accounts.get(id).toJSON())
  }

  this.getStandardAccount = function () {
    return outgoing(_(this.getAll()).first())
  }

  this.hasStandardAccount = function () {
    return this.getAll().length > 0
  }

  this.createInteractively = function (popupWindow, scopes) {
    scopes = [].concat(scopes || [])

    const def = $.Deferred()
    const self = this

    // the popup must exist already, otherwise we run into the popup blocker
    if (!popupWindow) return def.reject()

    const newAccount = new OAuth.Account.Model({
      displayName: chooseDisplayName(service),
      serviceId: service.id,
      popup: popupWindow
    })

    newAccount.enableScopes(scopes)

    return newAccount.save().then(function (account) {
      // needed for some portal plugins (xing, etc.)
      self.trigger('create', account)
      ox.trigger('refresh-portal')
      yell('success', gt('Account added successfully'))
      return account
    }, function (error) {
      yell('error', gt('Account could not be added'))
      throw error
    })
  }

  this.remove = function (account) {
    account = accounts.get(account.id)

    // use wait so the model is not removed if there is a server error
    return account.destroy({ wait: true }).then(function () {
      let filestorageAccount
      // if rampup failed, ignore filestorages, maybe the server does not support them
      if (filestorageApi.rampupDone) {
        filestorageAccount = filestorageApi.getAccountForOauth(account.toJSON())
        // if there is a filestorageAccount for this Oauth account, remove it too
        if (filestorageAccount) {
          // use softDelete parameter to only cleanup caches. Backend removes the filestorage account automatically, so we don't need to send a request
          filestorageApi.deleteAccount(filestorageAccount, { softDelete: true })
        }
      }
    })
  }

  this.update = function (data) {
    const account = accounts.get(data.id)
    account.set(data)

    return account.save().then(function () {
      let filestorageAccount
      // if rampup failed, ignore filestorages, maybe the server does not support them
      if (filestorageApi.rampupDone) {
        filestorageAccount = filestorageApi.getAccountForOauth(account.toJSON())
      }

      // if there is a filestorageAccount for this Oauth account, update it too. Changes foldername in drive
      if (filestorageAccount) {
        const options = filestorageAccount.attributes
        options.displayName = account.get('displayName')

        return $.when(account.toJSON(), filestorageApi.updateAccount(options))
      }
      return account.toJSON()
    }).done(function () {
      self.trigger('refresh.list', account.toJSON())
    })
  }

  this.reauthorize = function (account) {
    account = accounts.get(account.id)
    if (!account) return $.Deferred().reject()

    return account.reauthorize().then(function () {
      ox.trigger('refresh-portal')
      return account.toJSON()
    }, function (e) {
      yell('error', e.error)
      throw e
    })
  }
}

function getAllAcccounts () {
  return http.GET({
    module: 'oauth/accounts',
    params: { action: 'all' }
  })
}

function setupAccountBindings () {
  accounts.listenTo(accounts, 'add remove', function (model) {
    const service = services.forAccount(model)
    service.keychainAPI.trigger('refresh.all refresh.list', model.toJSON())
    // Some standard event handlers
    haloAPI.halo.refreshServices()
  })
  accounts.listenTo(folderAPI, 'remove update', function (folder) {
    const relatedAccount = accounts.filter(function (a) {
      return a.get('associations').map(function (as) { return as.folder }).indexOf(folder) >= 0
    })[0]
    if (!relatedAccount) return
    getAllAcccounts().then(function (data) {
      accounts.reset(data)
      if (relatedAccount.get('enabledScopes').includes('drive')) filestorageApi.trigger('reset')
    })
  })
}

filestorageApi.rampup().then(function () {
  // perform consistency check for filestorage accounts (there might be cases were they are out of sync)
  // we delay it so it doesn't prolong appsuite startup
  _.delay(filestorageApi.consistencyCheck, 5000)
})

let apiCache
export async function getAPI () {
  if (apiCache) return apiCache

  const api = {
    accounts,
    chooseDisplayName
  }

  await new Promise(resolve => {
    addReadyListener('rampup', rampup => {
      services = api.services = new ServiceCollection()
      if (rampup.oauth?.services) services.add(rampup.oauth.services)
      if (rampup.oauth?.accounts) accounts.add(rampup.oauth.accounts)
      setupAccountBindings()
      api.serviceIDs = services.map(service => simplifyId(service.id))
      resolve()
    })
  })

  apiCache = api
  return api
}

export default getAPI()
