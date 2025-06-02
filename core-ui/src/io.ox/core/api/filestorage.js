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

/* This is not the files, drive or infostore api, use 'io.ox/files/api' for that!
*  This api provides functions for integrating external filestorages, like Dropbox or Google Drive
*  Before the first use of this api please check the rampup attribute. If it is false call the rampup function to make sure caches are correctly filled.
*  Otherwise functions like isStorageAvailable or getAccountForOauth don't work correctly. Those functions were designed without deferreds so they can be used in if statements
*/
import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import ext from '@/io.ox/core/extensions'

// stores configuration information, needed when creating accounts, is filled after getAllServices was called. Keys are serviceIds of OAuth accounts
const serviceConfigsCache = {}
// stores all available services
const servicesCache = new Backbone.Collection()
// stores all filestorage accounts is filled after getAllAccounts was called
const accountsCache = new Backbone.Collection()
// stores the qualified account ids so it's easy to see if a folder belongs to a folderstorage account
let idsCache = []
// utility function to add to idsCache
const addToIdsCache = function (accounts) {
  // xox cross ox / xctx cross context
  // there are integers behind those that represent module numbers (8 is files for example) so make sure to check fuzzy enough
  const services = ['googledrive', 'dropbox', 'boxcom', 'onedrive', 'xox', 'xctx']

  ext.point('io.ox/core/filestorage/service-list').invoke('customize', services)

  _(accounts).each(function (account) {
    account = account.get ? account.toJSON() : account
    _(services).each(function (service) {
      if (account.filestorageService && account.filestorageService.indexOf(service) === 0) idsCache.push(account.qualifiedId)
    })
  })
  // we don't want duplicates
  idsCache = _.uniq(idsCache)
}
const api = {
  // if the api is ready to use or rampup function must be called
  rampupDone: false,
  // if the rampup failed, because server does not support external storages etc this attribute is true, so you don't call rampup again every time
  rampupFailed: false,
  // always call this function if the rampupDone attribute is false or api will function incorrectly see comments above
  rampup () {
    // if rampup was called before there is no need to do it again.
    if (api.rampupDone) {
      return $.Deferred().resolve()
    } else if (api.rampupFailed) {
      $.Deferred().reject()
    }

    // pre fill caches and set rampupDone to true
    // set rampupFailed to true otherwise
    http.pause()
    const servicesReady = api.getAllServices()
    const accountsReady = api.getAllAccounts()
    return http.resume()
      .then(function (data) {
        let error = false
        _(data).each(function (item) {
          if (item.error) {
            error = true
          }
        })

        if (!error) {
          // no errors everything is ready and caches are up to date.
          api.rampupDone = true
          api.rampupFailed = false
        } else {
          // something went wrong, for example filestorages are not enabled on the server
          // set rampupfailed to true to indicate that a rampup was tried before but failed for whatever reasons
          api.rampupDone = false
          api.rampupFailed = true
        }
      })
      .fail(function (e) {
        // something went wrong, for example filestorages are not enabled on the server
        // set rampupfailed to true to indicate that a rampup was tried before but failed for whatever reasons
        api.rampupFailed = true
        return e
      })
      // make sure that this promise only resolves when the services and accounts are fully setup
      .then(() => servicesReady)
      .then(() => accountsReady)
  },
  getAccountsCache () {
    return accountsCache
  },
  // returns a collection with all available file storage services
  getAllServices (filestorageService, useCache) {
    useCache = useCache === undefined ? true : useCache

    if (useCache && servicesCache.length) {
      return $.Deferred().resolve(servicesCache)
    }
    const params = {
      action: 'all'
    }
    if (filestorageService) {
      params.filestorageService = filestorageService
    }
    return http.GET({
      module: 'fileservice',
      params
    })
      .then(function (services) {
        servicesCache.reset(services)
        _(services).each(function (service) {
          try {
            if (service.configuration && service.configuration.length > 0 && service.configuration[0].options) {
              serviceConfigsCache[service.configuration[0].options.type] = {
                filestorageService: service.id,
                configuration: {
                  type: service.configuration[0].options.type
                }
              }
            }
          } catch (e) {
            console.error(e)
          }
        })
        return servicesCache
      })
  },
  // returns a model of the file storage service
  getService (id, useCache) {
    useCache = _.defaultValue(useCache, true)

    if (!id) {
      return $.Deferred().reject()
    }

    if (useCache && servicesCache.length) {
      const service = servicesCache.get(id)
      if (service) {
        return $.Deferred().resolve(service)
      }
    }
    return http.GET({
      module: 'fileservice',
      params: {
        action: 'get',
        id
      }
    })
      .then(function (service) {
        return new Backbone.Model(service)
      })
  },

  // returns a collection with all file storage accounts
  getAllAccounts (useCache) {
    useCache = _.defaultValue(useCache, true)

    if (useCache && accountsCache.length > 0) {
      return $.Deferred().resolve(accountsCache)
    }
    return http.GET({
      module: 'fileaccount',
      params: {
        action: 'all',
        connectionCheck: true
      }
    })
      .then(function (accounts) {
        accountsCache.reset(accounts)
        addToIdsCache(accounts)
        return accountsCache
      })
  },

  // returns a model of the file storage account
  getAccount (options, useCache) {
    useCache = _.defaultValue(useCache, true)

    if (!options.id || !options.filestorageService) {
      return $.Deferred().reject()
    }

    if (useCache && accountsCache.length > 0) {
      const data = accountsCache.get(options.id)
      if (data) {
        return $.Deferred().resolve(data)
      }
    }
    return http.GET({
      module: 'fileaccount',
      params: {
        action: 'get',
        id: options.id,
        filestorageService: options.filestorageService
      }
    })
      .then(function (account) {
        return new Backbone.Model(account)
      })
  },
  // plain function to create filestorage accounts
  // to create filestorage accounts from existing oauth accounts use createAccountFromOauth
  createAccount (options) {
    return http.PUT({
      module: 'fileaccount',
      params: {
        action: 'new'
      },
      data: options
    })
      .then(function (accountId) {
        return api.getAccount({ id: accountId, filestorageService: options.filestorageService }).then(function (account) {
          accountsCache.add(account)
          addToIdsCache([account])
          api.trigger('create', accountsCache.get(account))

          import('@/io.ox/core/api/account').then(function ({ default: accountAPI }) {
            accountAPI.trigger('create:account')
          })

          return accountsCache.get(account)
        })
      })
  },
  // utility function to create a filestorage account from an existing oauth account
  // fails if rampup was not done before (configscache empty)
  createAccountFromOauth (oauthAccount, options) {
    options = options || {}

    if (!oauthAccount) {
      return $.Deferred().reject()
    }
    const account = api.getAccountForOauth(oauthAccount)
    // allow only one account per Oauth, 2 storages for the same Oauth account don't make sense
    if (account) {
      return $.Deferred().reject({
        code: 'EEXISTS' // cSpell:disable-line
      })
    }
    const config = _.copy(serviceConfigsCache[oauthAccount.serviceId], true)
    if (config) {
      config.displayName = options.displayName || oauthAccount.displayName
      config.configuration.account = String(oauthAccount.id)
      return api.createAccount(config)
    }
    // no config found
    return $.Deferred().reject()
  },
  deleteAccount (data, o) {
    let model
    const options = o || {}

    if (data.attributes) {
      model = data
      data = data.attributes
    }

    // identity-like
    function cleanStorage (value) {
      accountsCache.remove(data)
      idsCache = _(idsCache).without(data.qualifiedId)
      api.trigger('delete', model || data)
      import('@/io.ox/core/folder/api').then(function ({ default: api }) {
        ox.trigger('account:delete', data.qualifiedId)
        api.propagate('account:delete')
      })
      return value
    }

    // hint: middleware removes filestorage accounts automatically when an OAuth account is deleted
    const def = options.softDelete
    // softDelete options only cleans the caches
      ? $.Deferred().resolve()
    // fail-case: may be it was deleted already
      : http.PUT({
        module: 'fileaccount',
        params: {
          action: 'delete',
          id: data.id,
          filestorageService: data.filestorageService
        }
      })

    return def.then(cleanStorage, cleanStorage)
  },
  // convenience method
  remove (data, o) {
    return api.deleteAccount(data, o)
  },
  // utility function to find storage accounts for a given oauth account, also used to limit storage accounts to one per oauth account
  // fails if rampup was not done before (configscache empty)
  getAccountForOauth (oauthAccount) {
    let account

    _(accountsCache.models).each(function (item) {
      if (item.get('configuration') && item.get('configuration').account === String(oauthAccount.id)) {
        account = item
      }
    })
    return account
  },
  // updates an existing account, id and filestorageService must be present
  updateAccount (options) {
    return http.PUT({
      module: 'fileaccount',
      params: {
        action: 'update'
      },
      data: options
    })
      .then(function () {
        return api.getAccount({ id: options.id, filestorageService: options.filestorageService }, false).then(function (account) {
          accountsCache.add(account, { merge: true })

          api.trigger('update', accountsCache.get(account))

          return accountsCache.get(account)
        })
      })
  },

  // returns true or false if there is a filestorage Service available for the given Oauth Account serviceId.
  // If serviceId is undefined an array with ids for all available serviceIds is returned
  // fails if rampup was not done before (configscache empty)
  isStorageAvailable (serviceId) {
    return serviceId ? !!serviceConfigsCache[serviceId] : _.keys(serviceConfigsCache)
  },

  // We need to keep Oauth Accounts and filestorage accounts in sync, there might be cases with strange configurations that need to be cleaned up to work properly
  // We don't want Oauth accounts without filestorage accounts and vice versa
  // Checks if every Oauth account has a proper filestorage account, if not creates one
  // Checks if every filestorage account has a proper Oauth account, if not removes it
  // if there are multiple filestorage accounts for one Oauth account, only one is kept
  consistencyCheck () {
    if (!api.rampupDone || api.rampupFailed) {
      return
    }
    import('@/io.ox/oauth/keychain').then(async function ({ getAPI }) {
      // use a collection for convenience
      try {
        const accountsWithStorage = {}
        const oauthAPI = await getAPI()
        const oauthAccounts = oauthAPI.accounts
        _(accountsCache.models).each(function (account) {
          // let's use a hardcoded list here to not accidentally delete filestorages we are not interested in
          if (account.get('filestorageService') === 'googledrive' || account.get('filestorageService') === 'dropbox' ||
                                account.get('filestorageService') === 'onedrive' || account.get('filestorageService') === 'boxcom') {
            if (account.get('configuration') && account.get('configuration').account) {
              const oauthId = account.get('configuration').account
              if (oauthAccounts.get(oauthId) && !accountsWithStorage[oauthId]) {
                accountsWithStorage[oauthId] = true
              } else {
                // there is a Filestorage Account without OauthAccount: oauthAccounts.get(account.configuration.account) failed
                // or we have one Oauth Account with multiple filestorageAccounts: accountsWithStorage[account.configuration.account] is true
                api.deleteAccount(account)
              }
            }
          }
        })
        // Wait until backend finds a solution for Bug 42049 and update UI accordingly
        // We don't want to create unnecessary accounts in the meantime
        /* _(oauthAccounts.models).each(function (account) {
            // check if we have oauth accounts without fileStorage that need one
            if (!accountsWithStorage[account.id] && api.isStorageAvailable(account.get('serviceId'))) {
                api.createAccountFromOauth(account.attributes);
            }
        }); */
      } catch (e) {
        if (ox.debug) console.error(e)
      }
    })
  },
  // function to check if a folder is a folder from an external Storage
  // folder.account_id must be present
  // if options.type is true, isExternal returns the type of folderstorage instead of a boolean
  // options.root checks if the folder is also the root folder
  isExternal (folder, o) {
    if (!api.rampupDone) {
      if (ox.debug) console.warn('using isExternal without rampup. Please use await FileStorageApi.rampup() before calling this function')
      return false
    }
    if (!folder || !folder.account_id) return false
    let isExternal = _(idsCache).indexOf(folder.account_id) !== -1
    const options = o || {}

    if (isExternal && (options.type || options.root)) {
      const model = accountsCache.findWhere({ qualifiedId: folder.account_id })
      if (options.root) {
        isExternal = folder.id === model.get('rootFolder')
      }
      if (isExternal && options.type) {
        isExternal = model.get('filestorageService')
      }
    }
    return isExternal
  },

  // mainly for federated sharing

  getAllGuestUserIdentifier () {
    // works with the cache to be synchronous, please keep it this way
    return _.compact(_(accountsCache.pluck('metadata')).map(function (entry) { return entry && entry.guestUserIdentifier }))
  },

  getAccountMetaData (accountId) {
    // works with the cache to be synchronous, please keep it this way
    const account = accountsCache.findWhere({ qualifiedId: accountId })
    return account ? account.get('metadata') : null
  },

  getAccountUrl (accountId) {
    // works with the cache to be synchronous, please keep it this way
    const account = accountsCache.findWhere({ qualifiedId: accountId })
    const accountConf = account ? account.get('configuration') : null
    return accountConf ? accountConf.url : null
  },

  isFederatedAccount (accountId) {
    // works with the cache to be synchronous, please keep it this way
    const accountMeta = api.getAccountMetaData(accountId)
    return accountMeta ? _.has(accountMeta, 'guestUserIdentifier') : null
  },

  getAccountDisplayName (accountId) {
    // works with the cache to be synchronous, please keep it this way
    const account = accountsCache.findWhere({ qualifiedId: accountId })
    return account ? account.get('displayName') : null
  }

}

// add event support
Events.extend(api);

(async function () {
  try {
    const { default: folderApi } = await import('@/io.ox/core/folder/api')
    // remove external file storage when root folder gets deleted
    folderApi.on('remove:infostore', function (data) {
      const externalAcccountId = /.*:\/\/(\d+)/.exec(data.account_id)
      if (externalAcccountId === null || !externalAcccountId[1]) return
      // root folder might has a '/' suffix
      const isRootFolder = new RegExp('^' + data.account_id + '/?$').test(data.id)
      if (!isRootFolder) return
      accountsCache.remove(externalAcccountId[1])
    })
  } catch (err) {
    console.error(err)
  }
})()

export default api
