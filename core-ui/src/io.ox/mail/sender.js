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
import _ from '@/underscore'

import ox from '@/ox'
import * as util from '@/io.ox/mail/util'
import accountAPI from '@/io.ox/core/api/account'
import userAPI from '@/io.ox/core/api/user'
import deputyAPI from '@/io.ox/core/deputy/api'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/mail/settings'

function getDefaultSendAddress () {
  return $.trim(settings.get('defaultSendAddress', ''))
}

function getAddresses (options) {
  return $.when(
    accountAPI.getAllSenderAddresses(options),
    capabilities.has('deputy') ? deputyAPI.getGranteeAddresses() : [],
    accountAPI.getPrimaryAddress()
  )
}

function updateDefaultNames (list) {
  // collect first to trigger a valid 'change:customDisplayNames' settings event
  const original = settings.get('customDisplayNames', {}); const names = _.extend({}, original)
  list.forEach(function (sender) {
    names[sender.email] = _.extend({}, names[sender.email], { defaultName: sender.name })
  })
  if (_.isEqual(original, names)) return
  settings.set('customDisplayNames', names).save()
}

const SenderModel = Backbone.Model.extend({
  idAttribute: 'email',
  quoted () {
    return util.formatSender(this.get('name'), this.get('email'))
  },
  unquoted () {
    return util.formatSender(this.get('name'), this.get('email'), false)
  },
  is (type) {
    return this.get('type') === type
  },
  toArray (options) {
    const opt = _.extend({ name: true }, options)
    const address = this.get('email')
    // disabled
    if (!opt.name) return [null, address]
    // default or custom
    const custom = settings.get(['customDisplayNames', address], {})
    const name = (custom.overwrite ? custom.name : this.get('name')) || ''
    return [name, address]
  }
})
const SenderList = Backbone.Collection.extend({
  model: SenderModel,
  initialize () {
    // initial ready deferred
    this.fetched = $.Deferred()
    this.update({ useCache: false }).done(this.fetched.resolve)
    this.listenTo(ox, 'account:create account:delete account:update', this.update.bind(this, { useCache: false }))
    this.listenTo(settings, 'change:defaultSendAddress', this.update)
  },
  ready (callback) {
    return this.fetched.done(callback.bind(this, this))
  },
  comparator (a1, a2) {
    if (a1.is('default')) return -1
    if (a2.is('default')) return 1
    return a1.toString().toLowerCase() < a2.toString().toLowerCase() ? -1 : 1
  },
  update (options) {
    return getAddresses(options).then((addresses, deputyAddresses, primary) => {
      const hash = {}
      // set "type" at index 2
      const sender = settings.get('features/allowExternalSMTP', true) ? addresses : [addresses[0]];
      [
        ...sender.map(address => address.concat(address[1] === primary[1] ? 'primary' : 'common')),
        ...deputyAddresses.map(address => address.concat('deputy'))
      ].forEach(function (address) {
        // build temporary hash
        hash[address[1]] = { name: address[0], email: address[1], type: address[2] }
      })
      // set default
      const address = hash[getDefaultSendAddress()] || hash[primary[1]] || {}
      address.type = 'default'
      // updateDefaultNames
      const list = Object.values(hash)
      updateDefaultNames(list)
      // collection
      this.reset(list)
    })
  },
  getAsArray (email, options) {
    const model = this.get(email)
    if (!model) return
    return model.toArray(options)
  },
  getCommon () {
    return this.filter(function (model) {
      return !model.is('deputy')
    })
  },
  getDeputies () {
    return this.filter(function (model) {
      return model.is('deputy')
    })
  },

  toArray () {
    this.map(function (model) { return model.toArray() })
  }
})

const that = {

  collection: new SenderList(),

  /**
   * user data
   * accessible for testing purposes
   * @return {jQuery.Deferred} resolves as user object
   */
  getUser () {
    return userAPI.get({ id: ox.user_id })
  },

  /**
   * default send address from settings
   * @return {string}
   */
  getDefaultSendAddress,

  /**
   * internal and external accounts
   * accessible for testing purposes
   * @return {jQuery.Deferred} resolves as array of arrays
   */
  getAccounts (options) {
    return accountAPI.getAllSenderAddresses(options)
  },

  /**
   * display name
   * accessible for testing purposes
   * @return {jQuery.Deferred} resolves as string
   */
  getDisplayName () {
    return accountAPI.getDefaultDisplayName()
  },

  /**
   * primary address
   * accessible for testing purposes
   * @deprecated
   * @return {jQuery.Deferred} resolves as array
   */

  // DEPRECATED: `getPrimaryAddress` of `mail/sender.js`, pending remove with 8.20. Use `accountAPI.getPrimaryAddress` instead
  getPrimaryAddress () {
    if (ox.debug) console.warn('`getPrimaryAddress` of `mail/sender.js` is deprecated, pending remove with 8.20. Use `accountAPI.getPrimaryAddress` instead')
    return accountAPI.getPrimaryAddress()
  },

  /**
   * list of normalised arrays (display_name, value)
   * accessible for testing purposes
   * @return {jQuery.Deferred} resolves as array
   */
  getAddresses,

  // DEPRECATED: `getAddressesCollection` of `mail/sender.js`, pending remove with 8.20. Use `collection` instead
  getAddressesCollection () {
    if (ox.debug) console.warn('`getAddressesCollection` of `mail/sender.js` is deprecated, pending remove with 8.20. Use `collection` instead.')
    return that.collection
  }
}

export default that
