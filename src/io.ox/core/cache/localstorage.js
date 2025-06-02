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
import ox from '@/ox'

// 1MB
const MAX_LENGTH = 1024 * 1024

const QUEUE_DELAY = 5000

let queue = { timer: null, list: [] }
// fluent backup cache
let fluent = {}
// access time
const access = {}
// Instances
let instances = {}

function syncSet (cid, json) {
  try {
    window.localStorage.removeItem(cid)
    window.localStorage.setItem(cid, json)
  } catch (e) {
    if (e.name === 'QUOTA_EXCEEDED_ERR') {
      console.warn('localStorage: Exceeded quota!', e, 'Object size', Math.round(json.length / 1024) + 'Kb')
      that.gc()
    }
  }
}

function deferredSet (cid, json) {
  if (queue.timer === null) {
    queue.timer = setTimeout(function () {
      _(queue.list).each(function (obj) {
        syncSet(obj.cid, obj.json)
      })
      queue = { timer: null, list: [] }
    }, QUEUE_DELAY)
  } else {
    queue.list.push({ cid, json })
  }
}

function WebStorage (id) {
  const reg = new RegExp('^' + id.replace(/\./g, '\\.') + '\\.')

  _.extend(this, {
    clear () {
      // loop over all keys (do this in two loops due to very strange async-ish behaviour in some browsers)
      let i = 0; const $i = window.localStorage.length; let key; const tmp = []
      for (; i < $i; i++) {
        // copy?
        if (reg.test(key = window.localStorage.key(i))) {
          tmp.push(key)
        }
      }
      // loop over tmp and remove items
      _(tmp).each(function (key) {
        window.localStorage.removeItem(key)
      })
      // clear backup cache
      for (key in fluent) {
        if (reg.test(key)) {
          delete fluent[key]
        }
      }
      return $.when()
    },

    get (key) {
      // fetch first, then GC
      const cid = id + '.' + key; const inFluent = cid in fluent; let data; const def = $.Deferred()

      // try to be fast without blocking
      if (inFluent) {
        data = JSON.parse(fluent[cid])
        def.resolve(data)
        access[cid] = _.now()
      } else {
        setTimeout(function () {
          const item = window.localStorage.getItem(cid)
          if (item !== null) {
            access[cid] = _.now()
            data = JSON.parse(fluent[cid] = item)
            def.resolve(data)
          } else {
            def.resolve(null)
          }
        }, 0)
      }

      return def
    },

    set (key, data) {
      const cid = id + '.' + key

      // use fluent cache to be fast
      data = JSON.stringify(data)
      fluent[cid] = data
      access[cid] = _.now()

      if (data.length <= MAX_LENGTH) {
        if (/app-cache\.index\.savepoints$/.test(cid)) {
          // need to be sync here; otherwise failover fails
          syncSet(cid, data)
        } else {
          // don't block
          deferredSet(cid, data)
        }
      }

      return $.Deferred().resolve(key)
    },

    remove (key) {
      const cid = id + '.' + key
      delete fluent[cid]
      // do this sync
      window.localStorage.removeItem(cid)
      return $.when()
    },

    keys () {
      let i; let $i; let key; const tmp = []
      // loop over all keys
      for (i = 0, $i = window.localStorage.length; i < $i; i++) {
        // get key by index
        key = window.localStorage.key(i)
        // match?
        if (reg.test(key)) {
          tmp.push(key.substr(id.length + 1))
        }
      }
      // loop over backup cache
      for (key in fluent) {
        if (reg.test(key)) {
          tmp.push(key.substr(id.length + 1))
        }
      }
      return $.Deferred().resolve(_(tmp).uniq())
    }
  })
}

const that = {
  id: 'localstorage',
  index: 200,
  dump () {
    console.debug('fluent', fluent, 'access', access)
  },

  getStorageLayerName () {
    return 'cache/localstorage'
  },

  isUsable () {
    return window.localStorage
  },

  gc () {
    let cid; let items = []; let removed = 0; let i = 0; let $i

    // loop #1: get number of items
    for (cid in access) {
      items.push([cid, access[cid]])
    }

    // sort by access date
    items.sort(function (a, b) { return a[1] - b[1] })

    // loop #2: remove oldest 30%
    for ($i = Math.floor(items.length / 3); i < $i; i++) {
      window.localStorage.removeItem(items[i][0])
      removed++
    }

    console.warn('GC. items', items.length, 'removed', removed)
    items = null
  },

  getInstance: (function () {
    let firstRun = true

    function clear () {
      // clear caches due to version change?
      const ui = JSON.parse(window.localStorage.getItem('appsuite-ui') || '{}')
      if (ui.version !== ox.version && _.url.hash('keep-data') !== 'true') {
        if (ox.debug === true) {
          console.warn('LocalStorage: Clearing persistent caches due to UI update')
        }

        // DOCS-392: Temporary save data from the local storage to restore it later.
        // Background:
        // (1) The 'permanentCache' contains quite big office web-font data, which will NEVER change and that should not be cleared from localStorage when possible.
        // (2) These cached web-fonts should survive a version change to reduce traffic.
        // (3) note: This 'clear()' method is not only called at a version change, but also at other circumstances (e.g. logout->login->real browser refresh).
        // (4) note: When the key doesn't exists in localStorage, 'getItem' returns 'null' (see w3c spec)
        // (5) note: The allocated data for this var is quite big, so it should be assured that the js GC can delete it later

        // the keys of all storage items to be restored
        const savepointId = _(['appsuite.cache', ox.user, ox.locale, 'app-cache.index.savepoints']).compact().join('.')
        const RESTORE_ITEM_KEYS = [
          savepointId, // keep savepoints after version update
          'openpgp-private-keys',
          'appsuite.office-fonts', // webfonts used in Documents applications (DOCS-392)
          'appsuite.window-handling', // multi-tab GUI (DOCS-1063)
          'appsuite.office-debug' // debugging settings for Documents
        ]

        // read the values of all storage items to be restored
        const restoreItems = RESTORE_ITEM_KEYS.map(function (key) {
          return { key, value: window.localStorage.getItem(key) }
        })

        window.localStorage.clear()
        window.localStorage.setItem('appsuite-ui', JSON.stringify({ version: ox.version }))

        // restore all values saved above
        if (restoreItems) {
          restoreItems.forEach(function (entry) {
            try {
              window.localStorage.setItem(entry.key, entry.value)
            } catch (err) {
              console.warn('cannot restore item "' + entry.key + '" in local storage', err)
            }
          })
        }
      }
      firstRun = false
    }

    return function (id) {
      if (firstRun) clear()
      if (!instances[id]) {
        return (instances[id] = new WebStorage(id))
      }
      return instances[id]
    }
  }()),

  clear () {
    fluent = {}
    instances = {}

    // keep files in cache to improve relogin performance, delete anything else
    const fileList = _.toArray(JSON.parse(window.localStorage.getItem('file-toc')))
    const allKeys = _(window.localStorage).keys()

    fileList.push('file-toc')

    // Docs-392: This key is used for office web-fonts that are stored in localStorage.
    // This key should never be deleted out of the localStorage when possible
    // (e.g. do not delete them at logout).
    fileList.push('appsuite.office-fonts')
    fileList.push('appsuite.window-handling')
    fileList.push('appsuite.office-debug')

    const toDelete = _.difference(allKeys, fileList)

    _(toDelete).each(function (key) {
      window.localStorage.removeItem(key)
    })
  }

}

ext.point('io.ox/core/cache/storage').extend(that)

export default that
