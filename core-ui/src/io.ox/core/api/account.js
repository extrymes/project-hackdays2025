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
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import userAPI from '@/io.ox/core/api/user'
import { addReadyListener } from '@/io.ox/core/events'
import { getMailFullName } from '@/io.ox/contacts/util'
import { settings } from '@/io.ox/mail/settings'

const api = {
  cache: {}
}

Events.extend(api)

// quick hash for sync checks
let idHash = {}
let hiddenHash = {}
let typeHash = {}
let replyToHash = {}
let separator = '/'
let isAltnamespace = false
let regParseAccountId
let regUnified

settings.ready(() => {
  // default separator
  separator = settings.get('defaultseparator', '/')
  isAltnamespace = settings.get('namespace', 'INBOX/') === ''
  regParseAccountId = new RegExp('^default\\d+' + separator + '[^' + separator + ']+' + separator)
  regUnified = new RegExp('^default\\d+' + separator + '[^' + separator + ']+$')
})

const process = function (data) {
  const isArray = _.isArray(data)
  data = isArray ? data : [data]

  const rPath = /^default\d+/

  const fix = function (type) {
    const account = this
    const prefix = 'default' + account.id + separator
    const field = type + '_fullname'
    let folder
    // check if folder path is not defined
    if (!account[field]) {
      // only fix primary account (see US 91604548 / Bug 37439)
      if (account.id !== 0) return
      folder = settings.get(['folder', type])
      if (!folder) {
        // fix fullname only if we have a short name
        if (account[type]) {
          folder = isAltnamespace ? 'default0' : settings.get('folder/inbox')
          folder += separator + account[type]
        } else {
          // empty string simply to avoid null value
          folder = ''
        }
      }
      this[field] = folder
    } else if (!rPath.test(this[field])) {
      // missing prefix
      this[field] = prefix + this[field]
    }
  }

  data.forEach(account => {
    ['trash', 'sent', 'drafts', 'spam', 'archive', 'confirmed_spam', 'confirmed_ham'].forEach(fix, account)
  })

  return isArray ? data : data[0]
}

export function altnamespace () {
  return !!isAltnamespace
}

/**
 * is unified
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isUnified (id) {
  // extend if number
  if (/^\d+$/.test(id)) id = 'default' + id
  // get identifier (might be null)
  const identifier = settings.get('unifiedInboxIdentifier')
  if (!identifier || identifier === 'null') return false
  // compare against unifiedInboxIdentifier (having just a number would be smarter)
  const match = String(id).match(/^(default\d+)/)
  return !!match && identifier === (match[1] + separator + 'INBOX')
}

/**
 * is unified folder
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isUnifiedFolder (id) {
  return regUnified.test(id) && isUnified(id)
}

/**
 * is unified root folder
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isUnifiedRoot (id) {
  return isUnified(id) && id.split(separator).length === 1
}

/**
 * is account folder
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isAccount (id) {
  if (_.isNumber(id)) return id in idHash
  const match = String(id).match(/^default(\d+)/)
  return match && match[1] in idHash
}

/**
 * is primary folder
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isPrimary (id) {
  return (/^default0/).test(id)
}

/**
 * is external folder
 * @param  {string}    id (folder_id)
 * @return { boolean }
 */
export function isExternal (id) {
  return isAccount(id) && !isPrimary(id)
}

/**
 * is disabled secondary account
 * @param  {object}  data (id, primary_address, folder_id)
 * @return {boolean}
 */
export function isHidden (data) {
  if (data.id) return isAccount(data.id) && !!hiddenHash[data.id]
  if (data.primary_address) return _.values(hiddenHash).indexOf(data.primary_address) >= 0
  if (data.folder_id) return !!hiddenHash[data.folder_id.split(separator)[0]]
  return false
}

/**
 * get unified mailbox name
 * @return { deferred} returns array or null
 */
export function getUnifiedMailboxName () {
  return getUnifiedInbox().then(function (inbox) {
    return inbox === null ? null : inbox.split(separator)[0]
  })
}

export function getUnifiedInbox () {
  const name = settings.get('unifiedInboxIdentifier', null)
  // name might be "null" (a string), should be null instead (see Bug 35439)
  return $.when(name === 'null' ? null : name)
}

export function getInbox () {
  return settings.get('folder/inbox')
}

/**
 * check folder type
 * @param  {string}    type (foldertype, example is 'drafts')
 * @param  {type}      id   [optional]
 * @return { boolean }
 */
export const is = (function () {
  const unifiedFolders = {
    inbox: /^default\d+\DINBOX(?:\/|$)/,
    sent: /^default\d+\DSent(?:\/|$)/,
    trash: /^default\d+\DTrash(?:\/|$)/,
    drafts: /^default\d+\DDrafts(?:\/|$)/,
    spam: /^default\d+\DSpam(?:\/|$)/
  }

  function is (type, id) {
    if (api.isUnified(id)) {
      const re = unifiedFolders[type]
      return Boolean(re && re.test(id))
    } else if (type === 'inbox') {
      return typeHash[id] === type
    }
    // loop of all types to also check if a subfolder is of a type
    return _(typeHash).some(function (defaultType, defaultId) {
      const isSubfolder = (id).indexOf(defaultId + separator) === 0
      return defaultType === type && (defaultId === id || isSubfolder)
    })
  }

  // use memoize to speed things up (yep, no reset if someone changes default folders)
  return _.memoize(
    function (type, id) {
      type = String(type || '').split('|')
      id = String(id || '')
      return _(type).reduce(function (memo, type) {
        return memo || is(type, id)
      }, false)
    },
    function hash (type, id) {
      return type + ':' + id
    }
  )
}())

/**
 * return folders for accounts
 * @param  {string}  type      ('inbox', 'send', 'drafts')
 * @param  {integer} accountId [optional]
 * @return { array}            folders
 */
export function getFoldersByType (type, accountId) {
  return _(typeHash)
    .chain()
    .map(function (value, key) {
      if (accountId !== undefined && key.indexOf(accountId) === -1) return false
      return value === type ? key : false
    })
    .compact()
    .value()
}

export function getStandardFolders () {
  return _(typeHash).keys()
}

export function isStandardFolder (id) {
  return typeHash[id] !== undefined
}

export function isMalicious (id, blocklist) {
  if (!id) return
  // includes simple subfolder checks
  if (is('spam', id)) return true
  if (is('confirmed_spam', id)) return true
  return _(blocklist).some(function (folder) {
    return folder === id || (id).indexOf(folder + separator) === 0
  })
}

export function getReplyToAddress (primary) {
  return replyToHash[primary]
}

export function getType (id) {
  if (id === 'virtual/all-unseen') return 'unseen'
  if (id === 'default0/virtual/flagged') return 'flagged'
  return typeHash[id]
}

export function getTypes () {
  return typeHash
}

export function inspect () {
  return { accounts: idHash, types: typeHash }
}

/**
 * get account id
 * @param  {string|number} str    (folder_id|account_id)
 * @param  {boolean}       strict
 * @return { integer}             account id
 */
export function parseAccountId (str, strict) {
  if (typeof str === 'number') {
    // return number
    return str
  } else if (/^default(\d+)/.test(String(str))) {
    // is not unified mail?
    if (!isUnified(str)) {
      return parseInt(str.replace(/^default(\d+)(.*)$/, '$1'), 10)
    }
    // strip off unified prefix
    const tail = str.replace(regParseAccountId, '')
    if (tail !== str && /^default\d+/.test(tail)) {
      return parseAccountId(tail, strict)
    }
    if (!strict) {
      return 0
    }
    const m = str.match(/^default(\d+)/)
    return m && m.length ? parseInt(m[1], 10) : 0
  }
  // default account
  return 0
}

/**
 * get the primary address for a given account
 * @param  {string}    accountId [optional: default account will be used instead]
 * @return { deferred}            returns array (name, primary address)
 */
export function getPrimaryAddress (accountId) {
  return get(accountId || 0)
    .then(ensureDisplayName)
    .then(function (account) {
      if (!account) return $.Deferred().reject(account)

      // use user-setting for primary account and unified folders
      if (accountId === 0 || !account.transport_url || isUnified(accountId)) {
        return getDefaultAddress()
      }

      return [account.personal, account.primary_address]
    })
    .then(function (address) {
      return getAddressArray(address[0], address[1])
    })
}

export function getDefaultAddress () {
  return get(0).then(ensureDisplayName).then(function (account) {
    const defaultSendAddress = $.trim(settings.get('defaultSendAddress', ''))
    return [account.personal, defaultSendAddress || account.primary_address]
  })
}

/*
     * get valid address for account
     */
export function getValidAddress (data) {
  return getAllSenderAddresses().then(function (a) {
    if (_.isEmpty(a)) return
    // set correct display name
    if (!_.isEmpty(data.from)) {
      data.from = a.filter(function (from) {
        return from[1] === data.from[0][1].toLowerCase()
      })
    }
    if (!_.isEmpty(data.from)) return data
    // use primary account as fallback
    return getPrimaryAddress().then(function (defaultAddress) {
      return _.extend(data, { from: [defaultAddress] })
    })
  })
}

/**
 * get primary address from folder
 * @param  {string}    folderId
 * @return {deferred}           object with properties 'displayname' and 'primaryaddress'
 */
export function getPrimaryAddressFromFolder (folderId) {
  // get account id (strict)
  const accountId = parseAccountId(folderId, true)

  // get primary address
  return getPrimaryAddress(isUnified(accountId) ? 0 : accountId)
}

export function getAddressesFromFolder (folderId) {
  // get account id (strict)
  const accountId = parseAccountId(folderId, true)
  const unified = isUnified(accountId)

  // get primary address and aliases
  return $.when(
    getPrimaryAddress(unified ? 0 : accountId),
    getSenderAddresses(unified ? 0 : accountId)
  ).then(function (primary, all) {
    return {
      primary,
      aliases: _.reject(all, function (address) {
        return primary[1] === address[1]
      })
    }
  })
}

export function getDefaultDisplayName () {
  return userAPI.get({ id: ox.user_id }).then(function (data) {
    return getMailFullName(data)
  })
}

// make sure account's personal is set
const ensureDisplayName = function (account) {
  // no account given or account already has "personal"
  // one space is a special marker not to use any default display name
  if (!account || (account.personal && (account.personal === ' ' || $.trim(account.personal) !== ''))) {
    return $.Deferred().resolve(account)
  }

  return getDefaultDisplayName().then(function (personal) {
    account.personal = personal
    return account
  })
}

export function trimAddress (address) {
  address = $.trim(address)
  // apply toLowerCase only for mail addresses, don't change phone numbers
  return address.indexOf('@') > -1 ? address.toLowerCase() : address
}

function getAddressArray (name, address) {
  name = $.trim(name || '')
  address = trimAddress(address)
  return [name !== address ? name : '', address]
}

/**
 * get sender address
 * @param  {object}          account
 * @return {jQuery.Deferred}         returns array the personal name and a list of (alias) addresses
 */
export function getSenderAddress (account) {
  // just for robustness
  if (!account) return []

  if (!account.addresses) {
    return [getAddressArray(account.personal, account.primary_address)]
  }

  // looks like addresses contains primary address plus aliases
  const addresses = _(String(account.addresses || '').toLowerCase().split(',')).map($.trim).sort()

  // build common array of [displayName, email]
  return _(addresses).map(function (address) {
    const isAlias = address !== account.primary_address
    const anonymouse = isAlias && settings.get('features/anonymousAliases', false)
    const displayName = anonymouse ? '' : account.personal
    return getAddressArray(displayName, address)
  })
}

/**
 * get a list of addresses that can be used when sending mails
 * @param  {string}    accountId [optional: default account will be used instead]
 * @return { deferred}           returns array the personal name and a list of (alias) addresses
 */
export function getSenderAddresses (accountId) {
  return get(accountId || 0)
    .then(ensureDisplayName)
    .then(getSenderAddress)
}

/**
 * get all sender addresses
 * @return { promise} returns array of arrays
 */
export function getAllSenderAddresses (options) {
  return all(options)
    .then(function (list) {
      // only consider external accounts with a transport_url (see bug 48344)
      // primary account is assumed to always work even without a transport_url
      return _(list).filter(function (account) {
        return account.id === 0 || !!account.transport_url
      })
    })
    .then(function (list) {
      return $.when.apply($, _(list).map(ensureDisplayName))
    })
    .then(function () {
      return _(arguments).flatten(true)
    })
    .then(function (list) {
      return $.when.apply($, _(list).map(getSenderAddress))
    })
    .then(function () {
      return _(arguments).flatten(true)
    })
    .then(function (addresses) {
      return addresses
    })
}

addReadyListener('rampup', function (rampup) {
  rampup.accounts.forEach(data => {
    const account = process(http.makeObject(data, 'account'))
    api.cache[account.id] = account
  })
})

/**
 * get all accounts
 * @return { deferred} returns array of account object
 */
export function all (options) {
  const opt = _.extend({ useCache: true }, options)

  function load () {
    if (_(api.cache).size() > 0 && opt.useCache) {
      // cache hit
      return $.Deferred().resolve(_(api.cache).values())
    }
    // cache miss, refill cache on success
    return http.GET({
      module: 'account',
      params: { action: 'all' },
      appendColumns: true,
      processResponse: true
    })
      .then(function (data) {
        // process and add to cache
        data = process(data)
        api.cache = {}
        data.forEach(account => {
          api.cache[account.id] = process(account)
        })
        return data
      })
  }

  return load().done(function (list) {
    idHash = {}
    hiddenHash = {}
    typeHash = {}
    replyToHash = {}
    // add check here
    list.forEach(account => {
      // hidden secondary account
      if (account.secondary) hiddenHash['default' + account.id] = account.deactivated ? account.primary_address : false
      // remember account id
      idHash[account.id] = true
      // add inbox first
      typeHash['default' + account.id + '/INBOX'] = 'inbox'
      replyToHash[account.primary_address] = account.reply_to
      // remember types (explicit order!)
      ;['drafts', 'sent', 'spam', 'trash', 'archive'].forEach(type => {
        // fullname is favored over short name
        const shortName = account[type]
        const fullName = account[type + '_fullname']
        const name = fullName || shortName
        // check to avoid unwanted overrides
        if (!typeHash[name]) typeHash[name] = type
      })
    })
  })
}

/**
 * get mail account
 * @param  {string}    id
 * @return { deferred}    returns account object
 */
export function get (id) {
  const getter = function () {
    return all().then(function () {
      return api.cache[id]
    })
  }

  return api.cache[id] ? $.Deferred().resolve(api.cache[id]) : getter()
}

/**
 * create mail account
 * @param  {object}     data (attributes)
 * @fires  api#create:account (data)
 * @return { deferred }
 */
export function create (data) {
  return http.PUT({
    module: 'account',
    params: { action: 'new' },
    data,
    appendColumns: false
  })
    .then(function (data) {
      // reload all accounts
      return reload().then(function () {
        ox.trigger('account:create')
        api.trigger('create:account', { id: data.id, email: data.primary_address, name: data.name })
        import('@/io.ox/core/folder/api').then(({ default: folderAPI }) => folderAPI.propagate('account:create'))
        return data
      })
    })
}

/**
 * delete mail account
 * @param  {object}     data (attributes)
 * @fires  api#refresh.all
 * @fires  api#delete
 * @return { deferred }
 */
export function remove (data) {
  return http.PUT({
    module: 'account',
    params: { action: 'delete' },
    data,
    appendColumns: false
  })
    .done(function () {
      const accountId = (api.cache[data] || {}).root_folder
      // remove from local cache
      delete api.cache[data]
      ox.trigger('account:delete', accountId)
      api.trigger('refresh.all')
      api.trigger('delete')
      import('@/io.ox/core/folder/api').then(({ default: folderAPI }) => folderAPI.propagate('account:delete'))
    })
}

/**
 * validate account data
 * @param  {object}    data (account object)
 * @return { deferred}      returns boolean
 */
export function validate (data, params) {
  params = _.extend({
    action: 'validate'
  }, params)

  return http.PUT({
    module: 'account',
    appendColumns: false,
    params,
    data,
    // needed or http.js does not give the warnings back
    processData: false
  })
  // make it always successful but either true or false, if false we give the warnings back
    .then(
      function success (response) {
        return $.Deferred().resolve(response.data, response.category === 13 ? response : undefined)
      },
      function fail (response) {
        return $.Deferred().resolve(response.data, response)
      }
    )
}

/**
 * update account
 * @param  {object}    data (account)
 * @return { deferred}      returns new account object
 */
export function update (data) {
  // don't send computed data
  delete data.mail_url
  delete data.transport_url
  // update
  return http.PUT({
    module: 'account',
    params: { action: 'update' },
    data,
    appendColumns: false
  })
    .then(function (result) {
      const id = result.id

      // detect changes
      if (api.cache[id]) {
        const enabled = result.unified_inbox_enabled
        if (api.cache[id].unified_inbox_enabled !== enabled) {
          import('@/io.ox/core/folder/api').then(({ default: folderAPI }) => folderAPI.propagate(enabled ? 'account:unified-enable' : 'account:unified-disable'))
        }
      }

      function reload () {
        if (_.isObject(result)) {
          // update call returned the new object, just return it
          return $.Deferred().resolve(result)
        }
        // update call didn’t return the new account -> get the data ourselves
        return http.GET({
          module: 'account',
          params: { action: 'get', id: data.id },
          appendColumns: false
        })
      }

      return reload().done(function (result) {
        // add folder type full names
        result = process(result)
        // update call returned the new account (this is the case for mail)
        api.cache[id] = result
      })
        .done(function (result) {
          api.trigger('refresh.all')
          api.trigger('update', result)
          ox.trigger('account:update', id)
          if (!('deactivated' in data)) return
          ox.trigger('account:status', { deactivated: data.deactivated, root_folder: result.root_folder })
        })
    })
}

/**
 * get autoconfig for given emailaddress
 * @param  {object}    data (email, password)
 * @return { deferred}      returns best available mail server settings (may be incomplete or empty)
 */
export function autoconfig (data) {
  return http.POST({
    module: 'autoconfig',
    data: _.extend({
      action: 'get'
    }, data)
  })
}

/**
 * jslob testapi
 * @return { deferred }
 */
export function configtestAll () {
  return http.GET({
    module: 'jslob',
    params: {
      action: 'all'
    }
  })
}

/**
 * jslob testapi
 * @return { deferred }
 */
export function configtestList (data) {
  return http.PUT({
    module: 'jslob',
    params: {
      action: 'list'
    },
    data
  })
}

/**
 * jslob testapi
 * @return { deferred }
 */
export function configtestUpdate (data, id) {
  return http.PUT({
    module: 'jslob',
    params: {
      action: 'update',
      id
    },
    data
  })
}

/**
 * jslob testapi
 * @return { deferred }
 */
export function configtestSet (data, id) {
  return http.PUT({
    module: 'jslob',
    params: {
      action: 'set',
      id
    },
    data
  })
}

/**
 * gets the status for one or all accounts
 * @param  { string }   id account id
 * @return { deferred }
 */
export function getStatus (id) {
  const p = { action: 'status' }
  // id 0 is the default account, so use an exact check here
  if (id !== undefined) p.id = id

  return http.GET({
    module: 'account',
    params: p
  })
}

export function getPrimaryName () {
  if (!api.cache[0]) return ''
  const name = api.cache[0].name
  if (!/^(email|e-mail)$/i.test(name)) return name
  return String(api.cache[0].primary_address).toLowerCase().split('@')[1] || ''
}

/**
 * bind to global refresh; clears caches and trigger refresh.all
 * @fires  api#refresh.all
 * @return { promise }
 */

export function reload () {
  return all({ useCache: false })
}

export function refresh () {
  return reload().done(function () {
    api.trigger('refresh.all')
  })
}

Object.assign(api, {
  all,
  altnamespace,
  autoconfig,
  configtestAll,
  configtestList,
  configtestSet,
  configtestUpdate,
  create,
  get,
  getAddressArray,
  getAddressesFromFolder,
  getAllSenderAddresses,
  getDefaultAddress,
  getDefaultDisplayName,
  getFoldersByType,
  getInbox,
  getPrimaryAddress,
  getPrimaryAddressFromFolder,
  getPrimaryName,
  getReplyToAddress,
  getSenderAddress,
  getSenderAddresses,
  getStandardFolders,
  getStatus,
  getType,
  getTypes,
  getUnifiedInbox,
  getUnifiedMailboxName,
  getValidAddress,
  inspect,
  is,
  isAccount,
  isExternal,
  isHidden,
  isMalicious,
  isPrimary,
  isStandardFolder,
  isUnified,
  isUnifiedFolder,
  isUnifiedRoot,
  parseAccountId,
  refresh,
  reload,
  remove,
  trimAddress,
  update,
  validate
})

ox.on('refresh^', refresh)

export default api
