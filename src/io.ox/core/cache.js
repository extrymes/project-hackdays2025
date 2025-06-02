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
import $ from '@/jquery'
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import '@/io.ox/core/cache/indexeddb'
import '@/io.ox/core/cache/localstorage'
import '@/io.ox/core/cache/simple'

// default key generator
let preferredPersistentCache = null
const storages = {}
const defaultKeyGenerator = function (data) {
  if (typeof data === 'object' && data) {
    data = 'data' in data ? data.data : data
    return (data.folder_id || data.folder || 0) + '.' + data.id
  }
  return ''
}

ox.cache = {

  usePersistence () {
    return true
    // return ox.secretCookie === true && ox.serverConfig.persistence !== false
  },

  clear () {
    return $.when.apply($,
      ext.point('io.ox/core/cache/storage').map(function (storage) {
        return storage.clear && storage.isUsable() ? storage.clear() : $.when()
      }).value()
    )
  }
}

ext.point('io.ox/core/cache/storage').each(function (storage) {
  if (storage.isUsable() && _.isNull(preferredPersistentCache)) {
    preferredPersistentCache = storage.id
  }
  storages[storage.id] = storage
})

// #!&cacheStorage=localstorage
preferredPersistentCache = _.url.hash('cacheStorage') ? _.url.hash('cacheStorage') : preferredPersistentCache

/**
 *  @class CacheStorage
 */
const CacheStorage = (function () {
  return function (name, persistent, options) {
    if (/app-cache\.index$/.test(name) && window.localStorage) {
      // due to the sync behavior of localstorage, we can rescue
      // the savepoints to a persistent cache.
      options = options || {}
      options.persistent = 'localstorage'
    }

    const opt = _.extend({
      fluent: 'simple',
      persistent: preferredPersistentCache
    }, options || {})
    const persistentCache = storages[opt.persistent]
    const fluentCache = storages[opt.fluent]
    // use persistent storage?
    const persist = (persistent === true && ox.cache.usePersistence() && persistentCache.isUsable() && _.url.hash('persistence') !== 'false'
      ? function () {
        return ox.user !== ''
      }
      : function () {
        return false
      })

    // define id now; user & locale should never change on-the-fly
    const id = _(['appsuite.cache', ox.user, ox.locale, name || '']).compact().join('.')

    const getStorageLayer = function () {
      let layer = null
      if (persist()) {
        layer = persistentCache
      } else {
        layer = fluentCache
      }

      const instance = layer.getInstance(id)
      return instance
    }

    this.clear = function () {
      return getStorageLayer().clear()
    }

    this.get = function (key) {
      return getStorageLayer().get(key)
    }

    this.set = function (key, data) {
      return getStorageLayer().set(key, data)
    }

    this.remove = function (key) {
      return getStorageLayer().remove(key)
    }

    this.keys = function () {
      return getStorageLayer().keys()
    }
  }
}())

/**
 *  @class Simple Cache
 */
const SimpleCache = function (name, persistent) {
  // private fields
  const index = new CacheStorage(name + '.index', persistent)

  if (!name) {
    // not funny!
    throw new Error('Each object cache needs a unique name!')
  }

  // clear cache
  this.clear = function () {
    return index.clear()
  }

  this.add = function (key, data, timestamp) {
    // timestamp
    timestamp = timestamp !== undefined ? timestamp : _.now()
    // add/update?
    return index.get(key).then(function (getdata) {
      if (getdata !== null) {
        if (timestamp >= getdata.timestamp) {
          return index.set(key, {
            data,
            timestamp
          })
            .then(function () {
              return data
            })
        }
        return getdata.data
      }
      return index.set(key, {
        data,
        timestamp
      })
        .then(function () {
          return data
        })
    })
  }

  // get from cache
  this.get = function (key, getter, readThroughHandler) {
    return index.get(key).then(function (o) {
      if (o !== null) {
        if (readThroughHandler) { readThroughHandler(o.data) }
        return o.data
      }
      return getter ? getter() : null
    })
  }

  // get timestamp of cached element
  this.time = function (key) {
    return index.get(key).then(function (o) {
      return o !== null ? o.timestamp : 0
    })
  }

  // remove from cache (key|array of keys)
  this.remove = function (key) {
    // is array?
    if (_.isArray(key)) {
      let i = 0; const $i = key.length; const c = []
      for (; i < $i; i++) {
        c.push(index.remove(key[i]))
      }

      return $.when.apply(null, c)
    }
    return index.remove(key)
  }

  // grep remove
  this.grepRemove = function (pattern) {
    let i = 0; let $i = 0
    if (typeof pattern === 'string') {
      pattern = new RegExp(_.escapeRegExp(pattern))
    }

    const remover = function (key) {
      if (pattern.test(key)) {
        return index.remove(key)
      }
    }

    return index.keys().then(function (keys) {
      $i = keys.length

      const c = []
      for (; i < $i; i++) {
        c.push(remover(keys[i]))
      }

      return $.when.apply(null, c)
    })
  }

  // list keys
  this.keys = function () {
    return index.keys()
  }

  // grep keys
  this.grepKeys = function (pattern) {
    return index.keys().done(function (keys) {
      const $i = keys.length; let i = 0
      const tmp = []; let key
      if (typeof pattern === 'string') {
        pattern = new RegExp(_.escapeRegExp(pattern))
      }

      for (; i < $i; i++) {
        key = keys[i]
        if (pattern.test(key)) {
          tmp.push(key)
        }
      }
      return tmp
    })
  }

  function getData (data) {
    return data && data.data ? data.data : null
  }

  // list values
  this.values = function () {
    return index.keys().then(function (keys) {
      return $.when.apply($,
        _(keys).map(function (key) { return index.get(key).then(getData) })
      )
        .then(function () {
          return _(arguments).compact()
        })
    })
  }

  // get size
  this.size = function () {
    return index.keys().then(function (keys) {
      return keys.length
    })
  }
}

/**
 *  @class Flat Cache
 */
const ObjectCache = function (name, persistent, keyGenerator) {
  // inherit
  SimpleCache.call(this, name, persistent)

  // key generator
  this.keyGenerator = _.isFunction(keyGenerator) ? keyGenerator : defaultKeyGenerator

  // get from cache
  const get = this.get
  this.get = function (key, getter, readThroughHandler) {
    // array?
    if (_.isArray(key)) {
      const self = this; const def = new $.Deferred()

      $.when.apply($,
        _(key).map(function (o) {
          return self.get(o)
        })
      )
        .done(function () {
          // contains null?
          let args
          const containsNull = _(arguments).reduce(function (memo, o) {
            return memo || o === null
          }, false)
          if (containsNull) {
            if (getter) {
              getter().then(def.resolve, def.reject)
            } else {
              def.resolve(null)
            }
          } else {
            args = $.makeArray(arguments)
            if (readThroughHandler) { readThroughHandler(args) }
            def.resolve(args)
          }
        })
      return def
    }
    // simple value
    let tmpKey
    if (typeof key === 'string' || typeof key === 'number') {
      tmpKey = key
    }
    tmpKey = this.keyGenerator(key)
    return get(tmpKey, getter, readThroughHandler)
  }

  // add to cache
  const add = this.add
  this.add = function (data, timestamp) {
    if (_.isArray(data)) {
      timestamp = timestamp !== undefined ? timestamp : _.now()
      let i = 0; const $i = data.length; const self = this

      const adder = function (data, timestamp) {
        return self.add(data, timestamp).then(function () {
          return self.keyGenerator(data)
        })
      }
      const c = []
      for (; i < $i; i++) {
        c.push(adder(data[i], timestamp))
      }

      return $.when.apply($, c).then(function () {
        return _(arguments).without(null)
      })
    }
    // get key
    const key = String(this.keyGenerator(data))

    return add(key, data, timestamp).then(function () {
      return key
    })
  }

  this.merge = function (data, timestamp) {
    let changed = false; const self = this

    if (_.isArray(data)) {
      timestamp = timestamp !== undefined ? timestamp : _.now()
      let i = 0; const $i = data.length

      const merger = function (check) {
        changed = changed || check
      }

      const c = []
      for (; i < $i; i++) {
        c.push(this.merge(data[i], timestamp).then(merger))
      }

      return $.when.apply(null, c).then(function () {
        return changed
      })
    }
    const key = String(this.keyGenerator(data))
    return get(key).then(function (target) {
      if (target !== null) {
        let id
        for (id in target) {
          if (data[id] !== undefined) {
            changed = changed || !_.isEqual(target[id], data[id])
            if (id !== 'last_modified') target[id] = data[id]
          }
        }
        if (changed) {
          return self.add(target, timestamp).then(function () {
            return changed
          })
        }
        return changed
      }
      return false
    })
  }

  const remove = this.remove
  this.remove = function (data) {
    const def = new $.Deferred(); const tmpGenerator = this.keyGenerator

    const keygen = function (data) {
      // simple value
      if (typeof data === 'string' || typeof data === 'number') {
        return data
      }
      // object, so get key
      return String(tmpGenerator(data))
    }

    if (_.isArray(data)) {
      let i = 0; const $i = data.length; let doneCounter = 0

      const resolver = function () {
        doneCounter++
        if (doneCounter === $i) {
          def.resolve()
        }
      }

      const remover = function (key) {
        remove(keygen(key)).done(resolver).fail(resolver)
      }

      for (; i < $i; i++) {
        remover(data[i])
      }
    }
    remove(keygen(data)).done(def.resolve).fail(def.reject)

    return def
  }

  this.dedust = function (data, prop) {
    // get cid
    const cid = String(this.keyGenerator(data))

    return get(cid).then(function (co) {
      if (co !== null && co[prop] !== data[prop]) {
        remove(cid)
        return true
      }
      return false
    })
  }
}

// debug!
window.dumpStorage = function () {
  let i = 0; const $i = localStorage.length; let key; let value
  for (; i < $i; i++) {
    // get key by index
    key = localStorage.key(i)
    try {
      value = JSON.parse(localStorage.getItem(key))
      console.debug('#', i, 'key', key, 'value', value)
    } catch (e) {
      console.error('key', key, e)
    }
  }
}

export default {
  defaultKeyGenerator,
  CacheStorage,
  SimpleCache,
  ObjectCache
}
