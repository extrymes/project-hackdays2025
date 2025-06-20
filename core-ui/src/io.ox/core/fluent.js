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

import _ from '@/underscore'

function FluentCache () {
  this.hash = {}
}

_.extend(FluentCache.prototype, {

  // get composite key
  serialize: _.cid,

  // get particular key
  getKey (obj) {
    return _.isObject(obj) ? this.serialize(obj) : String(obj)
  },

  // get cached item
  get (key) {
    key = this.getKey(key)
    return this.hash[key]
  },

  // add item
  set (key, data) {
    if (key === undefined) return

    if (arguments.length === 1 && _.isObject(key)) {
      data = key
      key = this.getKey(key)
    }

    if (data === undefined) return

    this.hash[key] = data
  },

  // check if the cache contains an item
  has (key) {
    key = this.getKey(key)
    return key in this.hash
  },

  // remove by explicit composite key
  remove (key) {
    key = this.getKey(key)
    delete this.hash[key]
  },

  // remove by pattern
  purge (pattern) {
    if (typeof pattern !== 'string') return
    for (const key in this.hash) {
      if (key.indexOf(pattern) > -1) delete this.hash[key]
    }
  },

  // remove all entries
  clear () {
    this.hash = {}
  },

  // get all keys
  keys () {
    return _(this.hash).keys().sort()
  }
})

export default FluentCache
