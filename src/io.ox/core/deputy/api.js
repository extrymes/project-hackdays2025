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
import userAPI from '@/io.ox/core/api/user'
import * as util from '@/io.ox/contacts/util'

// simple caches for requests used in mail compose.
let granteeAddressCache = []
let granteeAddressFolderCache = {}
let availableModules = []

const api = {
  getAll () {
    return http.GET({
      module: 'deputy',
      params: {
        action: 'all'
      }
    })
  },
  create (model) {
    const params = _.clone(model.attributes)
    delete params.userData
    return http.PUT({
      module: 'deputy',
      params: {
        action: 'new'
      },
      data: params
    }).done(() => {
      ox.trigger('please:refresh')
    })
  },
  remove (model) {
    return http.PUT({
      module: 'deputy',
      params: {
        action: 'delete',
        deputyId: model.get('deputyId')
      }
    }).done(() => {
      ox.trigger('please:refresh')
    })
  },
  update (model) {
    const params = _.clone(model.attributes)
    delete params.userData
    return http.PUT({
      module: 'deputy',
      params: {
        action: 'update',
        deputyId: model.get('deputyId')
      },
      data: params
    }).done(() => {
      ox.trigger('please:refresh')
    })
  },
  getAvailableModules () {
    if (availableModules.length) return $.when(availableModules)

    return http.GET({
      module: 'deputy',
      params: {
        action: 'available'
      }
    }).then(function (modules) {
      availableModules = modules
      return modules
    })
  },

  // returns deputy data where the current user is deputy
  reverse () {
    return http.GET({
      module: 'deputy',
      params: {
        action: 'reverse'
      }
    })
  },

  // utility function that returns a list of senders, that granted deputy rights to the current user, with "allowed to send mails" permissions
  getGranteeAddresses (useCache) {
    useCache = useCache || true
    const def = $.Deferred()

    if (useCache && granteeAddressCache.length) return def.resolve(granteeAddressCache)

    def.then(function (result) {
      granteeAddressCache = result
      return result
    })

    // ignore errors, just send an empty array then
    api.reverse(useCache).then(function (grantedPermissions) {
      const addresses = _(grantedPermissions).chain().map(function (deputyData) {
        // can there be more than one address?
        return deputyData.granteeAddresses ? [deputyData.granteeId, deputyData.granteeAddresses[0]] : false
      }).compact().valueOf()

      const userIds = _(addresses).chain().map(function (address) { return address[0] }).uniq().compact().valueOf()

      userAPI.getList(userIds).then(function (users) {
        _(addresses).each(function (address) {
          address[0] = util.getDisplayName(_(users).findWhere({ id: address[0] }))
        })
        def.resolve(addresses)
      }, function () {
        def.resolve([])
      })
      return def
    }, function () {
      def.resolve([])
    })

    return def
  },

  // utility function that returns the mail address from a folder you are allowed to send mails from as a deputy
  getGranteeAddressFromFolder (id, useCache) {
    useCache = useCache || true
    if (!id) return $.when([])
    const def = $.Deferred()

    if (useCache && granteeAddressFolderCache[id]) return def.resolve(granteeAddressFolderCache[id])

    def.then(function (result) {
      granteeAddressFolderCache[id] = result
      return result
    })

    // ignore errors, just send an empty array then
    api.reverse().then(function (grantedPermissions) {
      const deputyData = _(grantedPermissions).find(function (data) {
        return data.sendOnBehalfOf && data.modulePermissions && data.modulePermissions.mail && _(data.modulePermissions.mail.folderIds).contains(id)
      })

      // no fitting mail address for this folder
      if (!deputyData) return def.resolve([])

      userAPI.get({ id: deputyData.granteeId }).then(function (user) {
        def.resolve([util.getDisplayName(user), deputyData.granteeAddresses[0]])
      }, function () {
        def.resolve([])
      })
      return def
    }).fail(function () {
      def.resolve([])
    })

    return def
  }
}

// clear caches on refresh
ox.on('refresh^', function () {
  granteeAddressCache = []
  granteeAddressFolderCache = {}
  availableModules = []
})

export default api
