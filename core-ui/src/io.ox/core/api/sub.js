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
import ox from '@/ox'
import http from '@/io.ox/core/http'
import apiFactory from '@/io.ox/core/api/factory'

/**
 * generalized API for pubsub
 */
export const api = apiFactory({
  module: 'subscriptions',
  requests: {
    all: {
      columns: 'id,folder,displayName,enabled',
      extendColumns: 'io.ox/core/api/pubsub/subscriptions/all'
    }
  },
  cid: () => { return 'default' }
})

/**
 * update publication/subscription
 */
api.update = function (data) {
  return removeFromCache({ id: data.id || '', folder: data.folder || data.entity.folder || '' })
    .then(function () {
      return http.PUT({
        module: 'subscriptions',
        params: {
          action: 'update'
        },
        data
      })
    })
}

/**
 * removes publication/subscription
 */
api.destroy = function (id) {
  const that = this
  return removeFromCache({ id })
    .then(function () {
      return that.remove(id)
    })
}

/**
 * create publication/subscription
 */
api.create = function (data) {
  return removeFromCache(data.entity).then(function () {
    return http.PUT({
      module: 'subscriptions',
      appendColumns: false,
      params: {
        action: 'new'
      },
      data
    })
  })
}

/**
 * refresh subscription
 */
api.refresh = function (data) {
  // triggered by global refresh
  if (!data) return $.Deferred()

  const folder = data.folder || data.attributes.folder || ''
  return removeFromCache(data).then(function () {
    return http.GET({
      module: 'subscriptions',
      appendColumns: false,
      params: {
        action: 'refresh',
        id: data.id,
        folder
      }
    })
  }).then(this.resolve, function (resp) {
    // special error 'verification needed': create clickable link
    const link = resp.error_params[0]
    if (resp.code === 'SUB-90112' && link) {
      resp.error_html = resp.error.replace(link, `<a href="${link}" title="${link}" target="_blank">Link</>`)
    }
    throw resp
  })
}

/**
 * provide single API reference by injecting sources `getAll`
 */
const sourcesAPI = apiFactory({
  module: 'subscriptionSources',
  requests: {
    all: {
      columns: 'id,displayName,icon,module,formDescription'
    }
  },
  cid: () => { return 'default' }
})
api.getSources = sourcesAPI.getAll

/**
 * clears cache
 */
const removeFromCache = (data) => {
  return $.when(
    api.caches.all.remove(api.cid('')),
    api.caches.get.grepRemove(`.${data.id}`),
    api.caches.get.grepRemove(`${data.folder}.`)
  )
}

const refresh = async () => {
  await Promise.all([
    api.caches.get.clear(),
    api.caches.all.clear()
  ])
  api.trigger('refresh:all')
}
ox.on('refresh^', refresh)
