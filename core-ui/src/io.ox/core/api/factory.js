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
import cache from '@/io.ox/core/cache'
import Events from '@/io.ox/core/event'
import ext from '@/io.ox/core/extensions'
import backbone from '@/io.ox/core/api/backbone'

const DELIM = '//'

const fix = function (obj) {
  const clone = _.copy(obj, true)
  clone.folder = clone.folder || clone.folder_id
  // to avoid trash in requests
  delete clone.folder_id
  return clone
}

const GET_IDS = 'id: folder_id:folder folder: recurrence_position:'.split(' ')

/**
 * reduce object to id, folder, recurrence_position
 * @param  {object|string} obj
 * @return {object}
 */
const reduce = function (obj) {
  return !_.isObject(obj)
    ? obj
    : _(GET_IDS).reduce(function (memo, prop) {
      const p = prop.split(':'); const source = p[0]; const target = p[1] || p[0]
      if (source in obj) { memo[target] = obj[source] }
      return memo
    }, {})
}

const factory = function (o = {}) {
  // extend default options (deep)
  o = $.extend(true, {
    // globally unique id for caches
    id: null,
    // for caches
    // ~ use default
    keyGenerator: null,
    // module
    module: '',
    // for all, list, and get
    requests: {
      all: { action: 'all', timezone: 'utc' },
      list: { action: 'list', timezone: 'utc' },
      get: { action: 'get', timezone: 'utc' },
      search: { action: 'search', timezone: 'utc' },
      remove: { action: 'delete' }
    },
    cid (o) {
      return o.folder + DELIM + (o.sortKey || o.sort) + '.' + o.order + '.' + (o.max || o.limit || 0)
    },
    done: {},
    fail: {},
    pipe: {},
    params: {},
    filter: null
  }, o)

  // use module as id?
  o.id = o.id || o.module

  _.each(o.requests, function (request) {
    if (!request.extendColumns) return
    request.columns = factory.extendColumns(request.extendColumns,
      o.module, request.columns)
    delete request.extendColumns
  })

  // create 3 caches for all, list, and get requests
  const caches = {
    all: new cache.SimpleCache(o.id + '-all'),
    // no persistant cache for list, because burst-writes block read (stupid queue implementation)
    list: new cache.ObjectCache(o.id + '-list', false, o.keyGenerator),
    get: new cache.ObjectCache(o.id + '-get', false, o.keyGenerator)
  }

  // hash to track very first cache hit
  const readThrough = {}

  // track last_modified
  const lastModified = {}

  const api = {

    DELIM,

    options: o,

    cid: o.cid,

    /**
     * requests data for all ids
     * @param  {object}          options
     * @param  {boolean}         useCache        (default is true)
     * @param  {object}          cache           (default is cache.all)
     * @param  {boolean}         processResponse (default is true)
     * @fires api#update: + id
     * @return {jQuery.Deferred}
     */
    getAll (options, useCache, cache, processResponse) {
      // merge defaults for 'all'
      const opt = $.extend({}, o.requests.all, options || {})
      const cid = o.cid(opt)

      // use cache?
      useCache = useCache === undefined ? true : !!useCache
      cache = cache || caches.all

      // cache miss?
      const getter = function () {
        const params = o.params.all ? o.params.all(_.copy(opt, true)) : opt
        return http.GET({
          module: o.module,
          params,
          processResponse: processResponse === undefined ? true : processResponse
        })
          .then(function (data) {
            // deferred
            const ready = $.when()
            // do we have the last_modified columns?
            if (/(^5,|,5,|5$)/.test(params.columns)) {
              return $.when.apply($,
                _(data).map(function (obj) {
                  const cid = _.cid(obj)
                  // do we see this item for the first time?
                  if (lastModified[cid] === undefined) {
                    lastModified[cid] = obj.last_modified
                    return ready
                  } else if (obj.last_modified > lastModified[cid]) {
                    // do we see a newer item now?
                    lastModified[cid] = obj.last_modified
                    return $.when(
                      api.caches.list.remove(cid),
                      api.caches.get.remove(cid)
                    )
                      .done(function () {
                        api.trigger('update:' + _.ecid(obj), obj)
                      })
                  }
                  return undefined
                })
              )
                .then(function () { return data })
            }
            return data
          }, function (error) {
            api.trigger('error error:' + error.code, error)
            throw error
          })
          .then(function (data) {
            return (o.pipe.all || _.identity)(data, opt)
          })
          .then(function (data) {
            // add to cache
            return $.when(cache.add(cid, data)).then(function () {
              return data
            })
          })
      }

      const hit = function () {
        if (ox.serverConfig.persistence === false) return
        if (!(cid in readThrough)) {
          readThrough[cid] = true
          setTimeout(function () {
            api.refresh()
          }, 5000)
        }
      }

      return (useCache ? cache.get(cid, getter, hit) : getter())
        .then(o.pipe.allPost)
        .done(o.done.all || $.noop)
    },

    /**
     * requests data for multiple ids
     * @param  {Array}           ids
     * @param  {boolean}         useCache (default is true)
     * @param  {object}          options
     * @return {jQuery.Deferred}
     */
    getList (ids, useCache, options) {
      // be robust
      ids = ids ? [].concat(ids) : []
      // custom filter
      if (o.filter) { ids = _(ids).filter(o.filter) }
      // use cache?
      options = options || {}
      useCache = useCache === undefined ? true : !!useCache
      // async getter
      const getter = function () {
        const params = _.extend({}, o.requests.list)
        if (options.allColumns) {
          params.columns = http.getAllColumns(o.module, true)
        }
        if (options.unseen) {
          params.unseen = true
        }
        return http.fixList(ids, http.PUT({
          module: o.module,
          params,
          data: http.simplify(ids)
        }))
          .then(function (data) {
            return (o.pipe.list || _.identity)(data)
          })
          .then(function (data) {
            // add to cache
            const method = options.allColumns ? 'add' : 'merge'
            // merge with or add to 'get' cache
            return $.when(caches.list.add(data), caches.get[method](data)).then(function () {
              return data
            })
          })
      }
      // empty?
      if (ids.length === 0) {
        return $.Deferred().resolve([]).done(o.done.list || $.noop)
      }
      // cache miss?
      return (useCache ? caches.list.get(ids, getter) : getter())
        .then(o.pipe.listPost)
        .done(o.done.list || $.noop)
    },

    /**
     * requests data for a single id
     * @param  {object}          options
     * @param  {boolan}          useCache (default is true)
     * @fires api#refresh.list
     * @return {jQuery.Deferred}          (resolve returns response)
     */
    get (options, useCache) {
      // merge defaults for get
      const opt = $.extend({}, o.requests.get, options)
      // use cache?
      useCache = useCache === undefined ? true : !!useCache
      // cache miss?
      const getter = function () {
        return http.GET({
          module: o.module,
          params: fix(opt)
        })
          .then(function (data) {
            return (o.pipe.get || _.identity)(data, opt)
          }, function (error) {
            api.trigger('error error:' + error.code, error)
            throw error
          })
          .then(function (data) {
            // use cache?
            if (useCache) {
              // add to cache
              return $.when(
                caches.get.add(data),
                caches.list.merge(data).done(function (ok) {
                  if (ok) {
                    api.trigger('refresh.list')
                  }
                })
              ).then(function () {
                return data
              })
            }
            return data
          })
          .fail(function (e) {
            _.call(o.fail.get, e, opt, o)
          })
      }
      return (useCache ? caches.get.get(opt, getter, o.pipe.getCache) : getter())
        .then(o.pipe.getPost)
        .done(o.done.get || $.noop)
    },

    /**
     * remove elements from list
     * @param  {object[]} list
     * @param  {object}   hash   (ids of items to be removed)
     * @param  {Function} getKey
     * @return {object[]}        (cleaned list)
     */
    localRemove (list, hash, getKey) {
      return _(list).filter(function (o) {
        return hash[getKey(o)] !== true
      })
    },

    /**
     * update or invalidates all, list and get cache
     * @param  {object[]}       ids
     * @param  {boolean}        silent (do not fire events)
     * @fires  api#delete: + id
     * @return {jQuery.Promise}
     */
    updateCaches (ids, silent) {
      // be robust
      ids = ids || []
      ids = _.isArray(ids) ? ids : [ids]

      // find affected mails in simple cache
      let hash = {}
      let folders = {}
      const getKey = cache.defaultKeyGenerator
      let defs

      _(ids).each(function (o) {
        hash[getKey(o)] = folders[o.folder_id] = true
      })

      if (ids.length < 100) {
        // loop over each folder and look for items to remove
        defs = _(folders).map(function (value, folderId) {
          // grep keys
          const cache = api.caches.all
          return cache.grepKeys(folderId + DELIM).then(function (keys) {
            // loop
            return $.when.apply($, _(keys).map(function (key) {
              // now get cache entry
              return cache.get(key).then(function (data) {
                if (data) {
                  if ('data' in data) {
                    data.data = api.localRemove(data.data, hash, getKey)
                  } else {
                    data = api.localRemove(data, hash, getKey)
                  }
                  return cache.add(key, data)
                }
                return $.when()
              })
            }))
          })
        })
        // remove from object caches
        if (ids.length) {
          defs.push(api.caches.list.remove(ids))
          defs.push(api.caches.get.remove(ids))
        }
      } else {
        // clear allcache due to performace
        defs = [api.caches.all.clear()]
        // remove from object caches
        if (ids.length) {
          defs.push(api.caches.list.clear())
          defs.push(api.caches.get.clear())
        }
      }

      // reset trash?
      if (api.resetTrashFolders) {
        defs.push(api.resetTrashFolders())
      }
      // clear
      return $.when.apply($, defs).done(function () {
        // trigger item specific events to be responsive
        if (!silent) {
          _(ids).each(function (obj) {
            api.trigger('delete:' + _.ecid(obj))
          })
        }
        hash = folders = defs = ids = null
      })
    },

    /**
     * remove ids from
     * @param  {object[]}        ids
     * @param  {object}          options (local: only locally, force: force delete)
     * @fires  api#refresh.all
     * @fires  api#delete (ids)
     * @fires  api#beforedelete (ids)
     * @fires  api#refresh:all:local
     * @return {jQuery.Deferred}
     */
    remove (ids, options) {
      // be robust
      ids = ids || []
      ids = _.isArray(ids) ? ids : [ids]
      options = _.extend({ local: false, force: false }, options || {})
      const opt = $.extend({}, o.requests.remove, { timestamp: _.then() })
      const data = http.simplify(ids)
      // force?
      if (options.force) {
        opt.harddelete = true
      }
      // update folder
      const update = function (result) {
        // remove affected folder from cache
        const folders = {}
        _(ids).each(function (o) { folders[o.folder_id] = o.folder_id })
        return $.when.apply(
          $, _(folders).map(function (id) {
            return api.caches.all.grepRemove(id + DELIM)
          })
        )
          .then(function () {
            return $.Deferred()[result.error ? 'reject' : 'resolve'](result)
          })
      }
      // done
      const done = function () {
        api.trigger('refresh.all')
        api.trigger('delete', ids)
      }
      api.trigger('beforedelete', ids)
      // remove from caches first
      return api.updateCaches(ids).then(function () {
        // trigger visual refresh
        api.trigger('refresh:all:local')
        // delete on server?
        if (options.local !== true) {
          return http.PUT({
            module: o.module,
            params: opt,
            data,
            appendColumns: false
          })
            .then(update, update)
            .always(done)
        }
        return done()
      })
    },

    /**
     * has entries in 'all' cache for specific folder
     * @param  {string}          folder (id)
     * @param  {string}          sort   (column)
     * @param  {string}          order
     * @return {jQuery.Deferred}        (resolves returns boolean)
     */
    needsRefresh (folder, sort, order) {
      return caches.all.keys(folder + DELIM + sort + '.' + order).then(function (data) {
        return data !== null
      })
    },

    reduce,

    caches
  }

  /**
   * search
   * @param  {string}          query   description
   * @param  {object}          options
   * @return {jQuery.Deferred}
   */
  api.search = function (query, options) {
    // merge defaults for search
    const opt = $.extend({}, o.requests.search, options || {})
    const getData = opt.getData

    options = options || {}

    if (o.requests.search.omitFolder && options.omitFolder !== false) {
      delete opt.folder
    }

    // remove omitFolder & getData functions
    delete opt.omitFolder
    delete opt.getData

    return http.PUT({
      module: o.module,
      params: opt,
      data: getData(query, options)
    })
      .then(function (data) {
        return (o.pipe.search || _.identity)(data)
      })
  }

  // add advancedsearch?
  if (o.requests.advancedsearch) {
    /**
     * advancedsearch
     * @param  {string}          query   description
     * @param  {object}          options
     * @return {jQuery.Deferred}
     */
    api.advancedsearch = function (query, options) {
      // merge defaults for search
      const opt = $.extend({}, o.requests.advancedsearch, options || {})
      const getData = opt.getData

      options = options || {}

      if (o.requests.advancedsearch.omitFolder && options.omitFolder !== false) {
        delete opt.folder
      }

      // remove omitFolder & getData functions
      delete opt.omitFolder
      delete opt.getData

      return http.PUT({
        module: o.module,
        params: opt,
        data: getData(query, options)
      })
        .then(function (data) {
          // make sure we always have the same response
          return data
        })
    }
  }

  Events.extend(api)

  /**
   * bind to global refresh; clears caches and trigger refresh.all
   * @fires api#refresh.all
   * @return {jQuery.Promise}
   */
  api.refresh = function () {
    if (ox.online) {
      // clear 'all & list' caches
      return $.when(
        api.caches.all.clear(),
        api.caches.list.clear()
      ).done(function () {
        // trigger local refresh
        api.trigger('refresh.all')
      })
    }
    return $.when()
  }

  ox.on('refresh^', function () {
    // write it this way so that API's can overwrite refresh
    api.refresh()
  })

  // basic model with custom cid / collection using custom models
  api.Model = backbone.Model
  api.Collection = backbone.Collection

  return api
}

factory.reduce = reduce

/**
 * Extends a columns parameter using an extension point.
 * The columns parameter is a comma-separated list of (usually numeric)
 * column IDs. The extension point must provide a method 'columns' which
 * returns an array of field names or column IDs to add.
 * @param   {string} id      The name of the extension point.
 * @param   {string} module  The module used to map columns to field names.
 * @param   {string} columns The initial value of the columns parameter.
 * @returns {string}         The extended columns parameter.
 */
factory.extendColumns = function (id, module, columns) {
  // avoid duplication by using a hash instead of an array
  const hash = {}
  // a map from field names to column IDs
  const cols = {}
  // http has only the reverse version of what we need
  const fields = http.getColumnMapping(module)
  _.each(fields, function (field, col) { cols[field] = col })

  _.each(columns.split(','), function (col) { hash[col] = 1 })

  _.chain(ext.point(id).invoke('columns')).flatten(true)
    .each(function (field) { hash[cols[field] || field] = 1 })

  return _.keys(hash).join()
}

export default factory
