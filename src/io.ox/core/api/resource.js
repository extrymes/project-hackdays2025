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

import ox from '@/ox'
import http from '@/io.ox/core/http'
import apiFactory from '@/io.ox/core/api/factory'
import { ResourceCollection } from '@/io.ox/core/api/resource-model'

const apiFactoryBase = apiFactory({
  module: 'resource',
  keyGenerator (obj) { return String(obj.id) },
  requests: {
    search: {
      action: 'search',
      getData (pattern) { return { pattern } }
    }
  }
})

export const resourceCollection = new ResourceCollection()

export const resourceAPI = {

  ...apiFactoryBase,

  collection: resourceCollection,

  // Overwrite default getAll as action=all doesn't accept columns.
  getAllIds: apiFactoryBase.getAll,

  getAll () {
    return this.search('*').done(list => this.collection.reset(list, { parse: true }))
  },

  create (data) {
    return http.PUT({
      module: 'resource',
      params: { action: 'new' },
      data,
      appendColumns: false
    }).then(resource => {
      const { id } = resource
      return this.get({ id }).then(responseData => {
        this.collection.add(responseData, { parse: true })
        this.trigger('create', responseData)
        this.clearCaches()
      })
    })
  },

  remove (id) {
    this.trigger('before:remove', id)
    return http.PUT({
      module: 'resource',
      params: {
        action: 'delete',
        timestamp: Date.now() + (20 * 365 * 1000 * 60 * 60 * 24)
      },
      data: { id },
      appendColumns: false
    }).then(() => {
      this.collection.remove({ id })
      this.trigger('remove', id)
      this.trigger(`remove:${id}`)
      this.clearCaches()
      this.collection.fetch()
    })
  },

  update (data) {
    return http.PUT({
      module: 'resource',
      params: {
        action: 'update',
        id: data.id,
        timestamp: Date.now() + (20 * 365 * 1000 * 60 * 60 * 24)
      },
      data,
      appendColumns: false
    }).then(() => {
      const model = this.collection.get(data.id)
      if (model) model.set(data)
      this.trigger('update', data)
      this.trigger(`update:${data.id}`)
      this.clearCaches()
      this.collection.fetch()
    })
  },

  clearCaches () {
    // clear "old" apiFactory based caches
    this.caches.all.clear()
    this.caches.list.clear()
    this.caches.get.clear()
  }
}

// clear caches and fetch via `getAll`
ox.on('refresh^', () => resourceAPI.refresh().then(resourceCollection.fetch))

export default resourceAPI
