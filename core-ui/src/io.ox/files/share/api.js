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
import Events from '@/io.ox/core/event'
import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'

// wrapping model for infostore files and folders in sharing context
const Share = Backbone.Model.extend({

  initialize () {
    this.cid = this.isFolder() ? 'folder.' + this.get('id') : _.cid(this.attributes)
  },

  isFile () {
    return this.has('folder_id')
  },

  isFolder () {
    return !this.has('folder_id')
  },

  getFolderModel () {
    const id = this.isFile() ? this.get('folder_id') : this.get('id')
    return folderAPI.pool.getModel(id)
  },

  isAdmin () {
    // for files we don't have the parent folder information
    // use shareable attribute instead
    if (this.isFile()) return !!this.get('shareable')
    // Check if ACLs enabled and only do that for mail component,
    // every other component will have ACL capabilities (stored in DB)
    if (this.get('module') === 'mail' && !(this.get('capabilities') & 1)) return false
    // for infostore/drive we need to check 'supported_capabilities' first
    if (this.get('module') === 'infostore' && _(this.get('supported_capabilities')).indexOf('permissions') === -1) return false
    // finally: check folder bits
    return folderAPI.Bitmask(this.get('own_rights')).get('admin') >= 1
  },

  isExtendedPermission () {
    return this.has('com.openexchange.share.extended' + (this.isFolder() ? 'Permissions' : 'ObjectPermissions'))
  },

  getEntity () {
    // mail folders show up with "null" so test if its inside our defaultfolders (prevent shared folders from showing wrong owner)
    // shared folder only have admins, no owner, because it's not possible to determine the right one
    return this.get('created_by') || (folderAPI.is('insideDefaultfolder', this.attributes) ? ox.user_id : null)
  },

  getIdentifier () {
    return this.get('created_from') && this.get('created_from').identifier
  },

  getDisplayName () {
    return this.get('com.openexchange.file.sanitizedFilename') || this.get('filename') || this.get('title') || ''
  },

  getFolderID () {
    return this.isFolder() ? this.get('id') : this.get('folder_id')
  },

  getFileType: filesAPI.Model.prototype.getFileType,

  types: filesAPI.Model.prototype.types,

  getExtension () {
    const parts = String(this.get('title') || '').split('.')
    return parts.length === 1 ? '' : parts.pop().toLowerCase()
  },

  getPermissions () {
    if (this.isFolder()) {
      return this.get('com.openexchange.share.extendedPermissions') || this.get('permissions')
    }
    return this.get('com.openexchange.share.extendedObjectPermissions') || this.get('object_permissions')
  },

  setPermissions (value) {
    const
      attrs = this.attributes

    if (this.isFolder()) {
      if ('com.openexchange.share.extendedPermissions' in attrs) {
        this.attributes['com.openexchange.share.extendedPermissions'] = value
      } else if ('permissions' in attrs) {
        this.attributes.permissions = value
      }
    } else if ('com.openexchange.share.extendedObjectPermissions' in attrs) {
      this.attributes['com.openexchange.share.extendedObjectPermissions'] = value
    } else if ('object_permissions' in attrs) {
      this.attributes.object_permissions = value
    }
    return this
  },

  loadExtendedPermissions: (function () {
    function fetchFile (model, options) {
      return api.getFileShare(model.pick('id', 'folder_id'), options).done(function (data) {
        model.set(data)
      })
    }

    function fetchFolder (model, options) {
      if (options.cache && model.has('com.openexchange.share.extendedPermissions')) {
        // use existing model
        return $.when()
      }

      // bypass cache (once) to have all columns (incl. 3060)
      return folderAPI.get(model.id, { cache: false }).done(function (data) {
        // omit "folder_id" otherwise a folder is regarded as file (might need some improvement)
        data = _(data).omit('folder_id')
        model.set(data)
      })
    }

    return function (options) {
      options = _.extend({ cache: true }, options)
      return this.isFolder() ? fetchFolder(this, options) : fetchFile(this, options)
    }
  }()),

  reload () {
    return this.loadExtendedPermissions({ cache: false })
  }

})

const SharesCollection = Backbone.Collection.extend({ model: Share })

const api = {

  Model: Share,

  collection: new SharesCollection(),

  /**
   * get a temporary link and related token
   * @param  { object }        data
   * @return {jQuery.Deferred}      returns related token
   */
  getLink (data, shareModel) {
    return http.PUT({
      module: 'share/management',
      params: {
        action: 'getLink',
        timezone: 'UTC'
      },
      data: _(data).pick('module', 'folder', 'item')
    }).then(function (data, timestamp) {
      api.trigger('new:link')
      ox.trigger('please:refresh')
      filesAPI.trigger('share:link:new', shareModel)
      return { data, timestamp }
    })
  },

  /**
   * update link
   * @param  { object }        data
   * @return {jQuery.Deferred}      empty data and timestamp
   */
  updateLink (data, timestamp) {
    return http.PUT({
      module: 'share/management',
      params: {
        action: 'updateLink',
        timezone: 'UTC',
        timestamp: timestamp || _.now()
      },
      // see SoftwareChange Request SCR-97: [https://jira.open-xchange.com/browse/SCR-97]
      data: _(data).pick('module', 'folder', 'item', 'expiry_date', 'includeSubfolders', 'password')
    })
  },

  /**
   * send invitation related to a link target
   * @param  { object }        data target data
   * @return {jQuery.Deferred}      empty data and timestamp
   */
  sendLink (data) {
    return http.PUT({
      module: 'share/management',
      params: {
        action: 'sendLink'
      },
      data: _(data).pick('module', 'folder', 'item', 'recipients', 'message')
    })
  },

  /**
   * delete a link
   * @param  { object }        data target data
   * @return {jQuery.Deferred}      empty data and timestamp
   */
  deleteLink (data, timestamp, shareModel) {
    return http.PUT({
      module: 'share/management',
      params: {
        action: 'deleteLink',
        timezone: 'UTC',
        timestamp: timestamp || _.now()
      },
      data: _(data).pick('module', 'folder', 'item')
    }).then(function (result) {
      api.trigger('remove:link', data)
      api.trigger('remove:link:' + data.module + ':' + data.folder + (data.item ? ':' + data.item : ''))
      ox.trigger('please:refresh')
      filesAPI.trigger('share:link:remove', shareModel)
      return result
    })
  },

  /**
   * get all shares by folder and files API
   * @return {jQuery.Deferred} an array with share data
   */
  all () {
    return $.when(
      this.allFolderShares(),
      this.allFileShares()
    ).then(function (folder, files) {
      return [].concat(folder[0], files[0])
    })
  },

  /**
   * get all shares by folder API
   * @return {jQuery.Deferred} an array with share data
   */
  allFolderShares () {
    return http.GET({
      module: 'folders',
      params: {
        action: 'shares',
        content_type: 'infostore',
        tree: 0,
        all: 0,
        altNames: true,
        columns: '1,2,5,300,301,302,305,317,3060',
        timezone: 'UTC'
      }
    })
  },

  /**
   * get all shares by files API
   * @return {jQuery.Deferred} an array with share data
   */
  allFileShares () {
    return http.GET({
      module: 'files',
      params: {
        action: 'shares',
        content_type: 'infostore',
        tree: 0,
        all: 0,
        altNames: true,
        columns: '1,2,5,20,109,700,7010,7040,703,702',
        timezone: 'UTC'
      }
    })
  },

  /**
   * get a single shared folder
   * @return {jQuery.Deferred} an object with share data
   */
  getFolderShare (id) {
    const columns = [
      'id',
      'created_by',
      'created_from',
      'last_modified',
      'title',
      'module',
      'type',
      'own_rights',
      'com.openexchange.share.extendedPermissions'
    ]

    return http.GET({
      module: 'folders',
      params: {
        action: 'get',
        id,
        tree: 0
      }
    }).then(function (data) {
      return _(data).pick(function (value, key) {
        return columns.indexOf(key) >= 0
      })
    })
  },

  /**
   * get a single shared file
   * @return {jQuery.Deferred} an object with share data
   */
  getFileShare (obj, options) {
    options = _.extend({ cache: true }, options)

    return filesAPI.get(obj).then(function (data) {
      if (options.cache && data['com.openexchange.share.extendedObjectPermissions']) return data

      return http.PUT({
        module: 'files',
        params: { action: 'list', columns: '7010' },
        data: [{ id: obj.id, folder: obj.folder_id }]
      })
        .then(function (array) {
          const model = filesAPI.pool.get('detail').get(_.cid(obj))
          model.set(array[0])
          return model.toJSON()
        })
    })
  },

  /**
   * get a share
   * @param  {string}          token
   * @return {jQuery.Deferred}       a JSON object with share data
   */
  get (token) {
    return http.GET({
      module: 'share/management',
      params: {
        action: 'get',
        timezone: 'UTC',
        token
      }
    })
  },

  revoke (collection, model) {
    let changes

    if (model.isFolder()) {
      collection.reset(_(model.getPermissions()).where({ entity: ox.user_id }))
      changes = { permissions: collection.toJSON() }
      return folderAPI.update(model.get('id'), changes)
    }
    changes = { object_permissions: [], 'com.openexchange.share.extendedObjectPermissions': [] }
    return filesAPI.update(model.pick('folder_id', 'id'), changes)
  },

  // resend invitation/notification
  // module is infostore oder folders
  // id is either folder_id or file id
  // entity is group/user/guest id
  resend (type, id, entity) {
    const module = type === 'file' ? 'infostore' : 'folders'
    const params = { action: 'notify', id }

    if (module === 'folders') params.tree = 1

    return http.PUT({
      module,
      params,
      data: { entities: [entity] },
      appendColumns: false
    })
  },

  /**
   * get a link to open a federated share as guest user
   * @return {object} a file descriptor
   */
  getFederatedSharingRedirectUrl (item) {
    const baseUrl = ox.abs + ox.root
    const apiUrl = '/api/files?action=backwardLink'
    const sessionParam = '&session=' + encodeURIComponent(ox.session)
    const redirectParam = '&redirect=true'
    const folderParam = '&folder=' + encodeURIComponent(item.folder_id)
    const itemParam = '&item=' + encodeURIComponent(item.id)

    return baseUrl + apiUrl + sessionParam + redirectParam + folderParam + itemParam
  }
}

Events.extend(api)

export default api
