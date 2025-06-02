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
import Pool from '@/io.ox/core/api/collection-pool'
import http from '@/io.ox/core/http'

const methods = { load: 'reset', paginate: 'add', reload: 'set' }

function toHash (array) {
  const hash = {}
  _(array).each(function (i) { hash[i] = true })
  return hash
}

function CollectionLoader (options) {
  _.extend(this, { columns: '1,20', module: 'mail', ignore: 'limit max' }, options)
  this.pool = Pool.create(this.module, { Collection: this.Collection, Model: this.Model })
  this.ignore = toHash(String(this.ignore).split(' '))
  this.collection = null
  this.loading = false
  this.timestamp = _.now()

  function apply (collection, type, params, loader, data) {
    // determine current page size
    const PAGE_SIZE = type === 'load' ? loader.PRIMARY_PAGE_SIZE : loader.SECONDARY_PAGE_SIZE
    collection.timestamp = _.now()
    // don't use loader.collection to avoid cross-collection issues (see bug 38286)
    if (type === 'paginate' && collection.length > 0) {
      // check if first fetched item matches last existing item
      // use case: reload on new messages; race-conditions with external clients
      let first = _(data).first(); let last = collection.last().toJSON()
      // use "head" item to compare threads
      if (last && last.head) last = last.head
      if (first && first.head) first = first.head
      // compare
      if (_.cid(first) !== _.cid(last)) {
        if (ox.debug) console.warn('paginate compare fail', _.cid(first), _.cid(last), data)
        // check d0901724d8050552b5b82c0fdd5be1ccfef50d99 for details
        params.thread = params.action === 'threadedAll'
        loader.reload(params, PAGE_SIZE)
        return
      }
    }

    Pool.preserve(function () {
      const method = methods[type]
      if (collection.preserve && type === 'reload') {
        // avoid "remove" and "sort" events
        // used by all-unseen, for example
        collection[method](data, { parse: true, add: true, remove: false, sort: false })
      } else {
        // normal case
        collection[method](data, { parse: true })
      }
    })

    // track completeness
    // load: always complete if we get less than requested
    // paginate: the first data element is the last currently visible element in the list, therefore <=1 is already complete
    // reload: keep the previous state. no need to trigger complete
    // reload and length === PRIMARY_PAGE_SIZE: load gets triggered to get new paginated items

    if (type === 'load') collection.setComplete(data.length < PAGE_SIZE)
    else if (type === 'paginate') collection.setComplete(data.length <= 1)

    if (type === 'reload' && data.length === loader.PRIMARY_PAGE_SIZE) {
      collection.setComplete(data.length <= 1)
      type = 'load'
    }
    collection.trigger(type)
  }

  function fail (collection, type, e) {
    collection.timestamp = _.now()
    collection.trigger(type + ':fail', e)
  }

  function process (params, type) {
    // get offset
    const offset = type === 'paginate' ? Math.max(this.collection.length - 1, 0) : 0
    // trigger proper event
    this.collection.trigger('before:' + type)
    // create callbacks
    const cbApply = _.lfo(apply, this.collection, type, params, this)
    const cbFail = _.lfo(fail, this.collection, type)
    // fetch data
    return this.fetch(params, this.collection)
      .then((data) => {
        this.addIndex(offset, params, data)
        stopLoading.call(this)
        this.done()
        cbApply(data)
      })
      .catch((e) => {
        stopLoading.call(this)
        this.done()
        cbFail(e)
        this.fail(e)
      })
  }

  function startLoading () {
    this.loading = true
    this.collection.loading = true
    this.collection.trigger('loading')
  }

  function stopLoading () {
    if (!this.loading) return
    this.loading = false
    this.collection.loading = false
    this.collection.trigger('loading')
  }

  this.load = function (params) {
    params = this.getQueryParams(params || {})
    // params are false for virtual folders
    if (params === false) return
    if (this.useLimit) params.limit = '0,' + this.PRIMARY_PAGE_SIZE
    const collection = this.collection = this.getCollection(params)
    if (!this.useLimit) this.collection.pagination = false
    stopLoading.call(this)

    if (this.isBad(params.folder) || ((collection.length > 0 || collection.complete) && !collection.expired && collection.sorted && !collection.preserve)) {
      // reduce too large collections
      const pageSize = collection.CUSTOM_PAGE_SIZE || this.PRIMARY_PAGE_SIZE
      if (collection.length > pageSize) {
        collection.reset(collection.first(pageSize), { silent: true })
        collection.complete = false
      }
      _.defer(function () {
        collection.trigger(collection.complete ? 'reset load cache complete' : 'reset load cache')
      })
      return collection
    }

    startLoading.call(this)
    _.defer(process.bind(this), params, 'load')
    return collection
  }

  this.paginate = function (params) {
    const collection = this.collection
    if (this.loading) return collection

    // offset is collection length minus one to allow comparing last item and first fetched item (see above)
    const offset = Math.max(0, collection.length - 1)
    params = this.getQueryParams(_.extend({ offset }, params))
    if (this.isBad(params.folder)) return collection
    if (this.useLimit) params.limit = offset + ',' + (collection.length + this.SECONDARY_PAGE_SIZE)

    startLoading.call(this)

    _.defer(process.bind(this), params, 'paginate')
    return collection
  }

  this.reload = function (params, tail) {
    const collection = this.collection
    if (this.loading) return collection

    params = this.getQueryParams(_.extend({ offset: 0 }, params))
    if (this.isBad(params.folder)) return collection
    // see Bug #59875
    if (this.useLimit) {
      // calculate maxLimit correctly (times paginate was done * secondary_page_size + initial page size)
      const maxLimit = Math.ceil((collection.length - this.PRIMARY_PAGE_SIZE) / this.SECONDARY_PAGE_SIZE) * this.SECONDARY_PAGE_SIZE + this.PRIMARY_PAGE_SIZE
      // in case we have an empty folder (drive), rightHand will be 0. See Bug #60086
      const rightHand = Math.max(collection.length + (tail || 0), maxLimit)
      params.limit = '0,' + (rightHand === 0 ? this.PRIMARY_PAGE_SIZE : rightHand)
    }

    startLoading.call(this)

    _.defer(process.bind(this), params, 'reload')
    return collection
  }
}

function ignore (key) {
  return !this.ignore[key]
}

function map (key) {
  const value = this[key]
  return key + '=' + (_.isString(value) ? value : JSON.stringify(value))
}

_.extend(CollectionLoader.prototype, {

  // highly emotional and debatable default
  PRIMARY_PAGE_SIZE: 50,
  SECONDARY_PAGE_SIZE: 200,
  useLimit: true,

  cid (obj) {
    return _(obj || {}).chain()
      .keys()
      .filter(ignore, this)
      .map(map, obj)
      .value().sort().join('&') || 'default'
  },

  getDefaultCollection () {
    return this.pool.getDefault()
  },

  getCollection (params) {
    const cid = this.cid(params)
    return this.pool.get(cid)
  },

  before (/* offset, params, data */) {
  },

  each (/* obj, index, offset, params */) {
  },

  after (/* offset, params, data */) {
  },

  addIndex (offset, params, data) {
    this.before(offset, params, data)
    _(data).each(function (obj, index) {
      obj.index = offset + index
      this.each(obj, index, offset, params)
    }, this)
    this.after(offset, params, data)
  },

  noSelect () {
    return false
  },

  virtual () {
    return false
  },

  isBad (value) {
    return !value && value !== 0
  },

  fetch (params) {
    const module = this.module
    const key = module + '/' + _.cacheKey(_.extend({ session: ox.session }, params))
    const rampup = ox.rampup[key]
    const noSelect = this.noSelect(params)
    const virtual = this.virtual(params)
    const self = this

    if (rampup) {
      delete ox.rampup[key]
      return $.when(rampup)
    }

    if (noSelect) return $.when([])
    if (virtual) return $.when(virtual)

    return http.wait().then(function () {
      return self.httpGet(module, params).then(function (data) {
        // apply filter
        if (self.filter) data = _(data).filter(self.filter)
        // useSlice helps if server request doesn't support "limit"
        return self.useSlice ? Array.prototype.slice.apply(data, params.limit.split(',')) : data
      })
    })
  },

  httpGet (module, params) {
    if (this.useSlice) params = _(params).omit('limit')
    return http.GET({ module, params })
  },

  getQueryParams () {
    return {}
  },

  done () {
  },

  fail (/* error */) {
  }
})

export default CollectionLoader
