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
import ext from '@/io.ox/core/extensions'

let storage = {}
let instances = {}

function resolve (val) {
  return $.Deferred().resolve(val)
  // $.Deferred().resolve(); wrapped by setTimeout(..., 0)
  // return _.wait(0).then(function () { return val; });
}

function SimpleStorage (id) {
  storage[id] = {}
  _.extend(this, {
    clear () {
      storage[id] = {}
      return resolve()
    },
    get (key) {
      key = String(key)
      return resolve(
        key in storage[id] ? JSON.parse(storage[id][key]) : null
      )
    },
    set (key, data) {
      // use stringify to work with copies
      storage[id][String(key)] = JSON.stringify(data)
      return resolve(key)
    },
    remove (key) {
      delete storage[id][String(key)]
      return resolve()
    },
    keys () {
      let key; const tmp = []
      for (key in storage[id]) {
        tmp.push(key)
      }
      return resolve(tmp)
    }
  })
}

const that = {
  id: 'simple',
  index: 1000,
  getInstance (theId) {
    if (!instances[theId]) {
      return (instances[theId] = new SimpleStorage(theId))
    }
    return instances[theId]
  },
  getStorageLayerName () {
    return 'cache/simple'
  },
  isUsable () {
    return true
  },
  gc () {
  },
  clear () {
    storage = {}
    instances = {}
  },
  dump () {
    console.debug('fluent', storage)
  }
}

ext.point('io.ox/core/cache/storage').extend(that)

export default that
