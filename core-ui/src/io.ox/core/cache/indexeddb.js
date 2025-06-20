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

const SCHEMA = 1
// 1MB
const MAX_LENGTH = 1024 * 1024
let instances = {}
const moduleDefined = $.Deferred()
let db
let defunct = false
let opened

// Android 4.1.x do have a indexedDB implementation in their stock browser!
// Cool, but this implementation is based on old spec of indexedDB. That's not so cool
// and will make the script down here break on each newer Android device.

// we test for this by looking for the IDBVersionChangeEvent which these devices do not have
if ((defunct = !(window.IDBVersionChangeEvent !== undefined && window.indexedDB))) {
  // return $.when()
}

function IndexedDBStorage (id) {
  let fluent = {}
  const removed = {}
  let myDB
  // OP(opened);
  const dbOpened = $.Deferred()

  const opened = window.indexedDB.open('appsuite.cache', SCHEMA)
  opened.onupgradeneeded = function (e) {
    // Set up object stores
    myDB = e.target.result
    myDB.createObjectStore('cache', { keyPath: 'key' })
  }
  OP(opened).then(dbOpened.resolve, dbOpened.reject)

  function operation (fn, readwrite) {
    return dbOpened.then(function (db) {
      try {
        const tx = db.transaction('cache', readwrite ? 'readwrite' : 'readonly')
        return fn(tx.objectStore('cache'))
      } catch (e) {
        console.error('IndexedDB.operation()', e.message, e)
        return $.Deferred().reject(e)
      }
    })
  }

  function read (fn) {
    return operation(fn, false)
  }

  function readwrite (fn) {
    return operation(fn, true)
  }

  const queue = {

    hash: {},

    flush: _.debounce(function () {
      // get shallow copy
      dbOpened.then(function (db) {
        const tx = db.transaction('cache', 'readwrite')
        const store = tx.objectStore('cache')
        // loop
        _(queue.hash).each(function (data, key) {
          key = String(id + '//' + key)
          store.put({ key, data })
        })
        queue.hash = {}
      })
    }, 500),

    clear () {
      this.hash = {}
    },

    add (key, data) {
      this.hash[key] = data
      this.flush()
    },

    remove (key) {
      delete this.hash[key]
    }
  }

  _.extend(this, {

    clear () {
      _(fluent).each(function (obj, key) {
        removed[key] = true
      })
      fluent = {}
      queue.clear()
      return readwrite(function (tx) {
        return OP(tx.clear(), 'clear')
      })
    },

    get (key) {
      if (_.isUndefined(key) || _.isNull(key)) {
        return $.Deferred().resolve(null)
      }
      key = String(key)
      if (key in removed) {
        return $.Deferred().resolve(null)
      }
      if (key in fluent) {
        try {
          return $.Deferred().resolve(JSON.parse(fluent[key]))
        } catch (e) {
          console.error('Failed to deserialize cached data', key, 'cache', id, 'data', { data: fluent[key] }, e.message, e)
          return $.Deferred().resolve(null)
        }
      }
      return read(function (cache) {
        key = String(id + '//' + key)

        return OP(cache.get(key))
          .then(function (obj) {
            if (_.isUndefined(obj) || _.isNull(obj)) {
              return obj
            }
            key = key.substr(String(id + '//').length)
            obj.key = key
            return obj
          })
          .then(function found (obj) {
            if (!_.isUndefined(obj) && !_.isNull(obj)) {
              try {
                const data = JSON.parse(obj.data)
                fluent[key] = obj.data
                return $.Deferred().resolve(data)
              } catch (e) {
                // ignore broken values
                console.error('Failed to deserialize cached data', key, 'cache', id, 'data', { data: obj.data }, e.message, e)
                return $.Deferred().resolve(null)
              }
            } else {
              return $.Deferred().resolve(null)
            }
          })
      })
    },

    set (key, data) {
      key = String(key)
      try {
        data = JSON.stringify(data)
        fluent[key] = data
        delete removed[key]
      } catch (e) {
        console.error('Could not serialize', id, key, data)
      }
      // don't wait for this
      // don't store too large items
      if (data.length <= MAX_LENGTH) {
        queue.add(key, data)
      }
      return $.Deferred().resolve(key)
    },

    remove (key) {
      key = String(key)
      if (fluent[key]) {
        delete fluent[key]
        removed[key] = true
      }
      queue.remove(key)
      return readwrite(function (cache) {
        key = String(id + '//' + key)
        return OP(cache.delete(key), 'delete')
      })
    },

    keys () {
      return read(function (cache) {
        const def = $.Deferred()
        const keys = []

        function iter (cursor) {
          keys.push(cursor.key)
        }

        ITER(cache.openCursor()).step(iter).end(function () {
          def.resolve(keys)
        }).fail(def.reject)

        return def
      })
        .then(function (keys) {
          return keys.filter(function (key) {
            return key.indexOf(String(id + '//')) === 0
          }).map(function (key) {
            return key.substr(String(id + '//').length)
          })
        })
        .then(function (keys) {
          // merge keys from fluent cache
          return _(keys).chain().union(_(fluent).keys()).uniq().value()
        })
    },

    close () {
      if (myDB) {
        myDB.close()
      }
    }
  })
}

const that = {
  id: 'indexeddb',
  index: 100,
  getInstance (id) {
    if (!instances[id]) {
      return (instances[id] = new IndexedDBStorage(id))
    }
    return instances[id]
  },
  getStorageLayerName () {
    return 'cache/indexeddb' // cSpell:disable-line
  },
  isUsable () {
    return !defunct
  },
  gc () {
  },
  clear () {
    if (!defunct) {
      return destroyDB()
    }
  }
}

// Adapter for IndexedDB operations to the familiar deferreds
function OP (request, type) {
  const def = $.Deferred()
  request.onerror = function (e) {
    if (ox.debug === true) {
      console.warn('IndexedDB: error request', request, type, e)
    }
    def.reject(e)
  }
  request.onblocked = function (e) {
    if (ox.debug === true) {
      console.warn('IndexedDB: blocked request', request, type, e)
    }
    def.reject(e)
  }
  // stupid stupid workaround for stupid stupid runtime bug / or API is hard to understand
  // clear seems to return far too early; maybe browser bug.
  // Occurred during folder tree debugging.
  if ((type === 'clear' || type === 'delete') && request.transaction) {
    request.transaction.oncomplete = function (e) {
      def.resolve(e.target.result)
    }
  } else {
    request.onsuccess = function (e) { def.resolve(e.target.result) }
  }
  return def
}

function ITER (request) {
  const callbacks = {
    step: [],
    end: [],
    fail: []
  }; let failed = false; let ended = false

  request.onerror = function (event) {
    if (!failed && !ended) {
      _(callbacks.fail).each(function (fn) {
        fn(event)
      })
    }
    failed = true
  }

  request.onsuccess = function (event) {
    if (failed || ended) {
      return
    }
    if (event.target.result) {
      _(callbacks.step).each(function (fn) {
        fn(event.target.result)
      })
      event.target.result.continue()
    } else {
      _(callbacks.end).each(function (fn) {
        fn()
      })
      ended = true
    }
  }

  const that = {
    step (fn) {
      callbacks.step.push(fn)
      return that
    },
    end (fn) {
      callbacks.end.push(fn)
      return that
    },
    fail (fn) {
      callbacks.fail.push(fn)
      return that
    }
  }

  return that
}

function initializeDB () {
  const tx = db.transaction('meta', 'readwrite')
  return OP(tx.objectStore('meta').put({
    id: 'default',
    version: ox.version
  }))
}

function destroyDB () {
  // Drop all databases
  const def = $.Deferred()
  const clearInstances = _(instances).chain()
    .values()
    .map(function (db) {
      return db.clear()
    })

  $.when.apply($, clearInstances).then(function () {
    instances = {}
    OP(window.indexedDB.deleteDatabase('cache'), 'deleteDatabase').then(
      def.resolve,
      def.reject
    )
  })

  return def
}

// Open the Meta-Database
try {
  opened = window.indexedDB.open('appsuite.cache.metadata', SCHEMA)

  opened.onupgradeneeded = function (e) {
    // Set up object stores
    const db = e.target.result
    db.createObjectStore('meta', { keyPath: 'id' })
  }

  OP(opened).then(
    function success (theDB) {
      db = theDB
      if (!db) {
        defunct = true
        moduleDefined.resolve(that)
        return
      }

      // Setup
      db.onerror = function (event) {
        console.error('IndexedDB error: ', event.target.errorCode, event)
      }

      const tx = db.transaction('meta')

      OP(tx.objectStore('meta').get('default')).done(function (meta) {
        let setupCompleted = null
        if (!meta) {
          setupCompleted = initializeDB()
        } else if (ox.online && (meta.version !== ox.version || meta.cleanUp) && _.url.hash('keep-data') !== 'true') {
          meta.cleanUp = true
          if (ox.debug === true) {
            console.warn('IndexedDB: Clearing persistent caches due to UI update')
          }
          setupCompleted = destroyDB().done(function () {
            meta.cleanUp = false
            meta.version = ox.version
            OP(db.transaction('meta', 'readwrite').objectStore('meta').put(meta))
          })
        } else {
          setupCompleted = $.when()
        }
        setupCompleted.then(
          function setupSuccess () {
            moduleDefined.resolve(that)
          },
          function setupFail () {
            defunct = true
            console.warn('Failed to use IndexedDB')
            moduleDefined.resolve(that)
          }
        )
      })
    },
    function fail () {
      defunct = true
      console.warn('Failed to use IndexedDB')
      moduleDefined.resolve(that)
    }
  )
} catch (e) {
  defunct = true
  console.warn('Failed to use IndexedDB', e.message)
  moduleDefined.resolve(that)
}

export default moduleDefined.done(function (storage) {
  ext.point('io.ox/core/cache/storage').extend(storage)
})
