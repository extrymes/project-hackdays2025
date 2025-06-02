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
import http from '@/io.ox/core/http'
import Backbone from '@/backbone'
import { mediator } from '@/io.ox/core/notifications/util'
import gt from 'gettext'

mediator('io.ox/notifications/adapter', {

  general (api) {
    const type = 'general'
    const detail = ''
    const label = gt('General')
    const adapter = new Adapter({ type, detail, label, api })

    adapter.cid = data => `${type}:${data.id}`

    adapter.on = (eventname, model, value) => {
      if (!eventname === 'close') return
      api.collection.remove(model)
    }
  }
})

// use as constructor (new Adapter(...))
export function Adapter (opt) {
  const adapter = {
    type: opt.type,
    api: opt.api,
    detail: opt.detail,
    label: opt.label,
    autoOpen: opt.autoOpen,
    persistence: !!opt.persistence,

    // convenience function
    changeAutoOpen (newValue) {
      this.autoOpen = newValue
      // maybe we already have something to open. Trigger event to force a possible auto open
      this.api.collection.trigger('autoOpen')
    },

    cid (data) {
      return `${this.type}:${data.folder_id || data.folder}/${data.id}`
    },

    add (data, options = {}) {
      options = { merge: true, ...options }
      data.type = this.type
      data.detail = this.detail
      data.label = this.label
      data.cid = this.cid(data)
      return this.api.collection.add(data, options)
    },

    clear () {
      this.api.collection.remove(this.list())
    },

    // removes items that are in the collection but not in the array of items to display
    // use this when resetting notifications of a specific type. This function gets rid of no longer valid notifications (dismissed by other client etc)
    prune (items) {
      const itemsInCollection = this.list()
      const itemCIDs = items.map(item => this.cid(item))
      itemsInCollection.forEach(collectionItem => { if (!itemCIDs.includes(collectionItem.get('cid'))) this.remove(collectionItem) })
    },

    remove (data) {
      return this.api.collection.remove(data instanceof Backbone.Model ? data : this.cid(data))
    },

    list () {
      return this.api.collection.where({ type: this.type })
    },

    fetch () {
      return Promise.resolve()
    },

    readyToShow (model) {
      // exclude models that are currently waiting for requests to finish by default
      return !model.get('pendingRequest')
    },

    // overwrite with something that returns a timestamp or string. Anything sortable should work
    getSortName (model) {
      return model.get('type')
    }
  }

  // add adapter to registry
  adapter.api.registry[opt.type] = adapter
  return adapter
}

export const Model = Backbone.Model.extend({
  idAttribute: 'cid',
  defaults: {
    category: 'general'
  },
  initialize () {
    this.on('change:pendingRequest', model => this.collection.trigger('pendingRequest'))
  },
  // convenience functions
  getAdapter () {
    return api.registry[this.get('type')]
  },
  getSortName () {
    return this.getAdapter().getSortName(this)
  }
})

function onlyReady (model) {
  const adapter = model.getAdapter()
  return adapter.readyToShow(model)
}

function onlyNonDelayed (model) {
  const adapter = model.getAdapter()
  return adapter.getShowtime ? !adapter.readyToShow(model) : false
}

function ofCategory (category) {
  return model => !category || model.get('category') === category
}

function getToday () {
  return new Date().toISOString().slice(0, 10)
}

const getPersistenceHashMap = sessionStorageKey => {
  const map = new Map()

  // key: cid, value: type
  map.save = () => {
    const types = Object.keys(api.registry).filter(type => api.registry[type].persistence)
    const list = Array.from(map.entries()).filter(pair => { return types.includes(pair[1]) })
    if (!list.length) return
    sessionStorage.setItem(sessionStorageKey, JSON.stringify({ list, date: getToday() }))
  }

  map.add = function (models) {
    const list = [].concat(models)
    if (!list.length) return
    list.forEach(model => { this.set(_.cid(model), model.get('type')) })
    // save to local storage to persist page reload
    this.save()
  }

  // initial load
  const stored = JSON.parse(sessionStorage.getItem(sessionStorageKey))
  if (!stored || stored?.date !== getToday()) {
    sessionStorage.removeItem(sessionStorageKey)
  } else {
    stored.list.forEach(pair => {
      const [cid, type] = pair
      map.set(cid, type)
    })
  }

  return map
}

export const hashMap = getPersistenceHashMap('io.ox/notifications/seen')

export const Collection = Backbone.Collection.extend({

  initialize () {
    this.on('add', _.debounce(this.fetch.bind(this)), 500)
    this.on('add remove', _.debounce(this.updateNextPendingNotification, 300))

    // redirect model events to adapter
    this.on('action', (action, model, value) => {
      model.getAdapter().on(action, model, value)
    })
  },

  model: Model,

  // negate value for descending sort
  comparator: model => -model.getSortName(),

  // use the adapter cid function to generate a unique id
  modelId: attrs => api.registry[attrs.type || 'general'].cid(attrs),

  getUnseen () {
    return this.filter(onlyReady).filter(model => !hashMap.has(_.cid(model)))
  },

  async fetch () {
    this.trigger('fetch:start')
    this.fetching = true
    http.pause()
    const promises = this.models.map((model) => {
      const adapter = model.getAdapter()
      return adapter && adapter.fetch(model)
    })
    http.resume()
    await Promise.allSettled(promises)
    this.sort()
    this.fetching = false
    this.trigger('fetch:done')
  },

  // returns all models that are ready to show (collection may contain preloaded notifications that should be shown in the future)
  getCurrent (category) {
    return this.filter(onlyReady).filter(ofCategory(category))
  },

  // updates the timer to the next pending notification
  updateNextPendingNotification () {
    // clear old timer
    clearTimeout(this.nextPendingNotificationTimer)
    // get next timer that for a notification that's not yet ready to show
    const nextNotification = this.chain()
      .filter(onlyNonDelayed)
      .sort(model => model.getAdapter().getShowtime(model))
      .first().value()

    if (!nextNotification) return
    const adapter = nextNotification.getAdapter()
    this.nextPendingNotificationTimer = setTimeout(function () {
      this.trigger('notificationReady')
      this.updateNextPendingNotification()
    }.bind(this), adapter.getShowtime(nextNotification) - Date.now())
  }
})

export const registry = {}
export const collection = new Collection()

// convenience function to add a simple notification
export function addNotification (title, { category = 'general', type = 'general' } = {}) {
  return registry.general.add({
    id: _.uniqueId('model'), title, category, type
  })
}

const api = {
  collection,
  registry,
  hashMap,
  addNotification
}

_.extend(api, Backbone.Events)

export default api
