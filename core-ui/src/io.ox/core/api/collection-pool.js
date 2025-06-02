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
import ox from '@/ox'
import backbone from '@/io.ox/core/api/backbone'

const pools = {}
const collections = {}
// to avoid unnecessary/endless recursion
let skip = false
let skipRemove = false
const Collection = backbone.Collection.extend({
  _removeModels (models, options) {
    models = _(models).filter(function (model) {
      return model.preserve !== true
    })
    return backbone.Collection.prototype._removeModels.call(this, models, options)
  }
})

function propagateRemove (module, model) {
  if (skip || skipRemove) return
  try {
    _(collections[module]).each(function (entry) {
      const target = entry.collection.get(model.cid)
      if (!target) return
      target.preserve = model.preserve
      skip = true
      entry.collection.remove(target)
    })
    // these errors need to be caught, otherwise the code just stops working silently, without giving a hint what happened, causes bug 65985 for example
  } catch (e) {
    if (ox.debug) console.warn('error in collection pool propagateRemove', e)
  } finally {
    // use try/finally to make sure we always reset 'skip'
    skip = false
  }
}

function propagateChange (module, model) {
  if (skip) return
  try {
    _(collections[module]).each(function (entry) {
      const cid = model.changed.cid ? model.previous('cid') : model.cid
      const target = entry.collection.get(cid)
      if (!target) return
      skip = true
      const data = model.toJSON()
      delete data.index
      target.set(data)
    })
    // these errors need to be caught, otherwise the code just stops working silently, without giving a hint what happened, causes bug 65985 for example
  } catch (e) {
    if (ox.debug) console.warn('error in collection pool propagateChange', e)
  } finally {
    // use try/finally to make sure we always reset 'skip'
    skip = false
  }
}

function gc (hash) {
  // Garbage Collection
  // ------------------
  // concept:
  // - on first refresh, all collections are marked as expired
  // - collections that are still used in UI will be updated and therefore "expired" will be set to false
  // - models that are in active collections are collected
  // - all remaining models will be removed

  // hash to track referenced models
  let models = {}

  // look for expired collection
  _(hash).each(function (entry, id) {
    // ignore detail collection
    if (id === 'detail') return
    // ignore search collections cause their lack of proper reset handling
    if (id.indexOf('search') === 0) return
    if (entry.collection.expired) {
      // remove collections if marked as expired
      entry.collection.reset()
      delete hash[id]
    } else {
      // track all referenced models
      entry.collection.each(function (model) {
        models[model.cid] = true
        _(this.getDependentModels(model.cid)).each(function (model) {
          models[model.cid] = true
        })
      }, this)
    }
  }, this)

  // loop over detail collection to find expired models
  let expired = this.get('detail').filter(function (model) {
    if (model['index/virtual/favorites/infostore'] !== undefined) return false
    if (model['index/virtual/favoriteFiles/infostore'] !== undefined) return false
    return !models[model.cid]
  })

  // remove expired models from detail collection
  this.get('detail').remove(expired, { silent: true })

  // clean up
  expired = models = null

  // mark all collections as expired
  _(hash).each(function (entry, id) {
    // ignore detail collection and those with gc=false, e.g. all-visible
    if (id === 'detail' || entry.collection.gc === false) return
    // mark as expired
    entry.collection.expire()
  })
}

function Pool (module, options) {
  const hash = collections[module] || (collections[module] = {})

  options = options || {}
  this.Collection = options.Collection || Collection
  this.Model = options.Model || backbone.Model

  this.getCollections = function () {
    return hash
  }

  this.get = function (cid) {
    const entry = hash[cid]

    if (entry) {
      entry.access = _.now()
      return entry.collection
    }

    // register new collection
    const collection = new this.Collection()
    hash[cid] = { access: _.now(), collection }

    // add attributes
    collection.expired = false
    collection.complete = false
    collection.pagination = true
    collection.sorted = true

    collection.expire = function () {
      this.expired = true
      this.trigger('expire')
    }

    collection.setComplete = function (state) {
      if (!this.pagination) state = true
      if (state === this.complete) return
      this.complete = state
      this.trigger('complete', state)
    }

    // to simplify debugging
    collection.cid = cid

    // propagate changes in all collections
    return collection.on({
      remove: propagateRemove.bind(this, module),
      change: propagateChange.bind(this, module)
    })
  }

  this.getModule = function () {
    return module
  }

  this.gc = function () {
    gc.call(this, hash)
  }

  // clear pool on global refresh
  ox.on('refresh^', _.throttle(gc.bind(this, hash), 5000))
}

// create new pool / singleton per module
// avoids having different instances per module
Pool.create = function (module, options) {
  return pools[module] || (pools[module] = new Pool(module, options))
}

// inspect
Pool.inspect = function () {
  _(pools).each(function (pool, module) {
    let count = 0; const collections = pool.getCollections()
    _(collections).each(function (entry) {
      count += _(entry.collection).size()
    })
    console.debug('Pool:', module, 'Model count:', count, 'Collections:', collections)
  })
}

// don't propagate remove events; usually during a collection.set
Pool.preserve = function (fn) {
  skipRemove = true
  if (fn) fn()
  skipRemove = false
}

_.extend(Pool.prototype, {

  getDefault () {
    return new this.Collection()
  },

  propagate (type, data) {
    if (type === 'change') {
      propagateChange.call(this, this.getModule(), new this.Model(data))
    }
  },

  map: _.identity,

  add (cid, data) {
    if (arguments.length === 1) { data = cid; cid = 'detail' }
    const collection = this.get(cid)
    data = _([].concat(data)).map(this.map, collection)

    collection.add(data, { merge: true, parse: true })

    return collection
  },

  // resolve a list of composite keys (cids) to models
  // skips items that are a model already
  resolve (list) {
    const collection = this.get('detail'); const Model = this.Model
    return _([].concat(list)).map(function (item) {
      return item instanceof Model ? item : collection.get(_.cid(item)) || {}
    })
  },

  getDetailModel (data) {
    const cid = _.cid(data); const collection = this.get('detail'); let model

    if ((model = collection.get(cid))) return model

    model = new this.Model(data)

    // add to pool unless it looks like a nested object
    if (data.folder_id !== undefined && data.parent === undefined) collection.add(model)

    return model
  },

  grep () {
    const args = arguments

    function contains (memo, str) {
      return memo && this.indexOf(str) > -1
    }

    return _(this.getCollections())
      .chain()
      .filter(function (entry, id) {
        return _(args).reduce(contains.bind(id), true)
      })
      .pluck('collection')
      .value()
  },

  getByFolder (id) {
    return this.grep('folder=' + id + '&')
  },

  getBySorting (sort, folder) {
    return this.grep('folder=' + folder + '&', 'sort=' + sort)
  },

  // used by garbage collector to resolve threads
  getDependentModels (/* cid */) {
    return []
  },

  resetFolder (ids) {
    // get list of collections for each folder, then put them in one array and remove duplicates
    // should work if ids is an array of folder ids or a single id as a string
    const self = this
    const list = _([].concat(ids)).chain().map(function (id) { return self.getByFolder(id) }).flatten().uniq()
    list.invoke('expire')
    return list
  },

  preserveModel (cid, state) {
    _(this.getCollections()).each(function (entry) {
      const model = entry.collection.get(cid)
      if (model) model.preserve = !!state
    })
  }
})

export default Pool
