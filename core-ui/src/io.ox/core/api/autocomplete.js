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
import http from '@/io.ox/core/http'
import contactsAPI from '@/io.ox/contacts/api'
import resourceAPI from '@/io.ox/core/api/resource'
import groupAPI from '@/io.ox/core/api/group'
import * as util from '@/io.ox/contacts/util'
import ext from '@/io.ox/core/extensions'
import { settings } from '@/io.ox/contacts/settings'

function Autocomplete (options) {
  const that = this

  this.options = $.extend({
    users: false,
    contacts: false,
    distributionlists: false,
    resources: false,
    groups: false,
    split: true,
    limit: 0
  }, options)

  this.cache = {}
  this.apis = []

  if (options.users) {
    this.apis.push({ type: 'user', api: contactsAPI })
  }
  if (options.contacts) {
    this.apis.push({ type: 'contact', api: contactsAPI })
  }
  if (options.resources) {
    this.apis.push({ type: 'resource', api: resourceAPI })
  }
  if (options.groups) {
    this.apis.push({ type: 'group', api: groupAPI })
  }

  // create separate objects for each email value
  this.fields = this.options.split ? ['email1', 'email2', 'email3'] : ['email1']

  if (options.extPoint) ext.point(options.extPoint + '/autocomplete/customize').invoke('customize', this)
  ext.point('io.ox/core/api/autocomplete/customize').invoke('customize', this)

  // If contacts auto-collector might have added new contacts
  contactsAPI.on('maybeNewContact', function () {
    that.cache = {}
  })
}

Autocomplete.prototype = {

  /**
   * search
   * @param  {string}          query
   * @return {jQuery.Deferred}       returns results
   */
  search (query) {
    query = typeof query !== 'string' ? '' : $.trim(query).toLowerCase()

    const self = this
    const options = {
      admin: settings.get('showAdmin', false),
      emailAutoComplete: false,
      limit: this.options.limit
    }

    if (query in this.cache) {
      // cache hit
      return $.Deferred().resolve(this.cache[query])
    }
    // cache miss
    try {
      http.pause()
      return $.when.apply($,
        _(self.apis).map(function (module) {
          // prefer autocomplete over search
          return (module.api.autocomplete || module.api.search)(query, options)
        })
      )
        .then(function () {
          // unify and process
          // TODO: Review / Refactor this!
          let retData = []
          const data = _(arguments).toArray()
          _(self.apis).each(function (module, index) {
            const items = _(data[index]).map(function (data) {
              data.type = module.type
              return data
            })
            retData = retData.concat(items)

            if (/contact|custom|user/.test(module.type)) {
              retData = self.processContactResults(retData, query)
              // results may exceed limit after processing
              if (options.limit) {
                retData = retData.slice(0, options.limit)
              }
            }
          })
          // add to cache
          return (self.cache[query] = retData)
        })
    } finally {
      http.resume()
    }
  },

  /**
   * process contact results
   * @param  {string}   type
   * @param  {object[]} data (contains results array)
   * @return {object[]}
   */
  processContactResults (data, query) {
    let tmp = []; let hash = {}; const self = this; let users = {}

    // improve response
    // 1/2: resolve email addresses
    _(data).each(function (obj) {
      if (!/contact|custom|user/.test(obj.type)) {
        // filter input from other apis
        tmp.push(obj)
      } else if (obj.mark_as_distributionlist) {
        // filter distribution lists
        if (self.options.distributionlists) tmp.push(obj)
      } else {
        // process each field
        _.each(self.fields, function (field) {
          if (obj[field]) {
            // magic for users beyond global address book
            if (String(obj.folder_id) !== util.getGabId() && obj.type === 'user') return
            // remove users from contact api results
            if (self.options.users && String(obj.folder_id) === util.getGabId() && obj.type === 'contact') return
            // convert user from contact api to real user
            if (obj.type === 'user' && obj.internal_userid) {
              obj.contact_id = obj.id
              obj.id = obj.internal_userid
              delete obj.internal_userid
            }

            const clone = _.extend({}, obj)
            // store target value
            clone.field = field
            if (obj[field] === query) {
              tmp.unshift(clone)
            } else {
              tmp.push(clone)
            }
            // when there is a contact with the same email as a user we prefer the user, so we must store them to check
            if (obj.type === 'user') {
              users[obj.sort_name + '_' + obj[field]] = true
            }
          }
        })
      }
    })

    // check hash for double entries, prefer users if we have a double entry
    function inHash (obj, type) {
      if (type === 'contact' && users[obj]) {
        return false
      }
      return hash[obj] ? false : (hash[obj] = true)
    }

    // 2/2: remove email duplicates, prefer users over contacts
    tmp = _(tmp).filter(function (obj) {
      if (obj.mark_as_distributionlist) {
        return inHash(_.cid(obj))
      }
      return inHash(obj.sort_name + '_' + obj[obj.field], obj.type)
    })
    hash = null
    users = null
    return tmp
  }
}

export default Autocomplete
