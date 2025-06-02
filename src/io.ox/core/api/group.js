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
import Backbone from '@/backbone'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import apiFactory from '@/io.ox/core/api/factory'

// generate basic API
const api = apiFactory({
  module: 'group',
  keyGenerator (obj) {
    return String(obj.id)
  },
  requests: {
    all: {
      columns: '1,20',
      extendColumns: 'io.ox/core/api/group/all',
      // display_name
      sort: '500',
      order: 'asc'
    },
    list: {
    },
    get: {
    },
    search: {
      action: 'search',
      columns: '1,20,500,524',
      extendColumns: 'io.ox/core/api/group/search',
      getData (query) {
        return { pattern: query }
      }
    }
  }
})

// helper: simply clear "old" caches on update
function clearCaches () {
  api.caches.all.clear()
  api.caches.list.clear()
  api.caches.get.clear()
}

//
// Backbone Model & Collection
//

const Model = Backbone.Model.extend({

  defaults: {
    display_name: '',
    members: [],
    name: ''
  },

  initialize () {
    const members = this.get('members')
    if (_.isString(members) && members !== '') {
      // "all" sends comma-separated string, "get" sends array; happy debugging!
      this.set('members', members.split(',').map(function (id) {
        return parseInt(id, 10)
      }), { silent: true })
    }

    this.on('change:display_name', function () {
      this.set('name', this.getName())
    })

    this.set('name', this.getName())
  },

  getName: (function () {
    const tr = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }

    return function () {
      if (this.has('id') && this.get('name')) return this.get('name')
      return this.get('display_name').trim().toLowerCase()
        .replace(/[äöüß]/g, function (match) {
          return tr[match]
        })
        .replace(/\W+/g, '_')
    }
  }())
})

const Collection = Backbone.Collection.extend({
  comparator (model) {
    return (model.get('display_name') || '').toLowerCase()
  },
  model: Model
})

api.collection = new Collection()

api.getModel = function (id) {
  return api.collection.get(id) || new Model()
}

//
// Create new group
//
api.create = function (data) {
  return http.PUT({
    module: 'group',
    params: { action: 'new' },
    data,
    appendColumns: false
  })
    .then(function (data) {
      return api.get({ id: data.id }).done(function (data) {
        api.collection.add(data, { parse: true })
        api.trigger('create', data)
        clearCaches()
      })
    })
}

//
// Update group
//
api.update = function (data) {
  return http.PUT({
    module: 'group',
    params: { action: 'update', id: data.id, timestamp: _.then() },
    data: _(data).pick('name', 'display_name', 'members'),
    appendColumns: false
  })
    .done(function () {
      const model = api.collection.get(data.id)
      if (model) model.set(data)
      api.trigger('update', data)
      clearCaches()
    })
}

//
// get fresh data for a group (is used for the guest group in some places)
//
api.refreshGroup = function (id) {
  if (!api.collection.get(id)) return $.when()
  return api.get({ id }, false).done(function (data) {
    return api.collection.get(id).set(data)
  })
}

//
// Delete group
//
api.remove = function (id) {
  api.trigger('before:remove', id)
  return http.PUT({
    module: 'group',
    params: { action: 'delete', timestamp: _.then() },
    data: { id },
    appendColumns: false
  })
    .done(function () {
      const model = api.collection.get(id)
      if (model) api.collection.remove(model)
      api.trigger('remove', id)
      clearCaches()
    })
}

/**
 * @param  {string}          id
 * @return {jQuery.Deferred}    done handler returns name (string)
 */
api.getName = function (id) {
  return api.get({ id }).then(function (data) {
    return data.display_name || data.name || ''
  })
}

// DEPRECATED: `getTextNode`, pending remove with 8.20. Use `getName` instead
api.getTextNode = function (id) {
  if (ox.debug) console.warn('`getTextNode` is deprecated, pending remove with 8.20. Use `getName` instead.')
  let node = document.createTextNode('')
  api.get({ id })
    .done(function (data) {
      node.nodeValue = data.display_name
    })
    .always(function () {
      // use defer! otherwise we return null on cache hit
      _.defer(function () {
        // don't leak
        node = null
      })
    })
  return node
}

export default api
