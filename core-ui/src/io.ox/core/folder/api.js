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
import * as util from '@/io.ox/core/folder/util'
import sort from '@/io.ox/core/folder/sort'
import blocklist from '@/io.ox/core/folder/blacklist'
import getFolderTitle from '@/io.ox/core/folder/title'
import Bitmask from '@/io.ox/core/folder/bitmask'
import account from '@/io.ox/core/api/account'
import userAPI from '@/io.ox/core/api/user'
import jobsAPI from '@/io.ox/core/api/jobs'
import resourceAPI from '@/io.ox/core/api/resource'
import capabilities from '@/io.ox/core/capabilities'
import * as contactUtil from '@/io.ox/contacts/util'
import filestorageApi from '@/io.ox/core/api/filestorage'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings as calSettings } from '@/io.ox/calendar/settings'
import { addReadyListener } from '@/io.ox/core/events'

const api = {}

// add event hub
_.extend(api, Backbone.Events)

//
// Utility functions
//

function tree (id) {
  id = String(id)
  // use tree 0 for mail, use tree 1 for all other modules.
  // we need tree 1 for files so that 'altNames' works.
  return id === '1' || /^default\d+/.test(id) ? 0 : 1
}

function injectIndex (id, item, index) {
  item['index/' + id] = index
  return item
}

function renameDefaultCalendarFolders (items) {
  const renameItems = [].concat(items).filter(function (item) {
    // only for calendar
    if (!/^(addressbooks|contacts|calendar|tasks|event)$/.test(item.module)) return false
    // rename default calendar
    if (item.id === String(calSettings.get('chronos/defaultFolderId'))) return true
    // shared folders that have createdfrom data available
    if (util.is('shared', item) && item.created_from && userAPI.checkForName(item.created_from)) {
      // #. %1$s is the folder owner
      // #. %2$s is the folder title
      item.display_title = gt('%1$s: %2$s', userAPI.checkForName(item.created_from), item.title)
      return false
    }
    // there is no user 0, that is just a dummy
    if (item.created_by === 0) return false
    // any shared folder that has no name yet
    return item.display_title === undefined && util.is('shared', item)
  })
  const ids = _(renameItems)
    .chain()
    .pluck('created_by')
    .compact()
    .uniq()
    .value()

  if (ids.length === 0) return $.when(items)

  return userAPI.getList(ids).then(function (list) {
    const hash = _.object(ids, list)

    _(renameItems).each(function (item) {
      if (item.id === String(calSettings.get('chronos/defaultFolderId')) || item.title === gt('Calendar')) {
        item.display_title = contactUtil.getFullName(hash[item.created_by] || {}) || gt('Default calendar')
      } else if (hash[item.created_by]) {
        // #. %1$s is the folder owner
        // #. %2$s is the folder title
        item.display_title = gt('%1$s: %2$s', contactUtil.getFullName(hash[item.created_by]), item.title)
      }
    })

    return items
  })
}

function onChangeModelId (model) {
  delete pool.models[model.previous('id')]
  pool.models[model.id] = model
}

function unfetch (model) {
  pool.unfetch(model.id)
}

function isVirtual (id) {
  if (_.isArray(id)) [id] = id
  if (id === 'cal://0/allPublic') return true
  return /^virtual|^cal:\/\/0\/resource|^flat\/event\/resource/.test(id)
}

function isExternalFileStorage (data) {
  //
  const type = data instanceof Backbone.Model ? data.get('type') : data.type
  return type === 14
}

function isFlat (id) {
  return /^(addressbooks|contacts|calendar|tasks|event)$/.test(id)
}

function isNested (id) {
  return /^(mail|infostore)$/.test(id)
}

function getCollectionId (id, all) {
  return (all ? 'all/' : '') + String(id)
}

// no deep recursion needed here, children are sufficient
function calculateSubtotal (model) {
  return pool.getCollection(model.id).reduce(function (total, model) {
    // use account API so it works with non standard accounts as well
    const type = account.getType(model.get('id'))
    // don't count trash or spam root folders
    // also don't count all-unseen or it would just double the total number
    if (type === 'trash' || type === 'spam' || type === 'confirmed_spam' || model.id === 'virtual/all-unseen') return total
    return total + (model.get('subtotal') || 0) + (model.get('unread') || 0)
  }, 0)
}

function bubbleSubtotal (model, value, attribute) {
  // attribute may be subtotal or unread
  const previous = model._previousAttributes[attribute] !== undefined && model._previousAttributes[attribute] !== null ? model._previousAttributes[attribute] : 0
  const difference = value - previous
  const parent = pool.models[model.get('folder_id')]
  const virtualParents = model.get('virtual_parents')

  // system folders don't matter
  // bubble through the tree in parent direction
  if (difference !== 0 && parent && parent.get('module') !== 'system' && pool.collections[parent.get('id')]) {
    // unified folders contain the mails of the child folders as duplicates, so we don't need to adjust the subtotal
    if (!parent.is('unifiedfolder')) {
      parent.set('subtotal', calculateSubtotal(parent))
    }
  }

  // if this is a subfolder of a virtual folder we must bubble there too
  if (difference !== 0 && virtualParents && virtualParents.length > 0) {
    _(virtualParents).each(function (virtualParentId) {
      if (pool.models[virtualParentId] && pool.collections[virtualParentId]._byId[model.get('id')]) {
        pool.models[virtualParentId].set('subtotal', calculateSubtotal(pool.models[virtualParentId]))
      } else {
        // virtual folder does not exist anymore or this folder is no longer part of it's collection
        model.set('virtual_parents', _(model.get('virtual_parents')).without(virtualParentId))
      }
    })
  }
}

function onChangeSubtotal (model, value) {
  bubbleSubtotal(model, value, 'subtotal')
}

function onChangeUnread (model, value) {
  bubbleSubtotal(model, value, 'unread')
  // forward event
  api.trigger('change:unread', model, value)
}

//
// Model & Collections
//

const FolderModel = Backbone.Model.extend({

  constructor: function () {
    Backbone.Model.apply(this, arguments)
    this.set('virtual_parents', [])
    // only apply unread Events to mail or undefined folders (some virtual folders might have an undefined module)
    if (this.get('module') === 'mail' || this.get('module') === undefined) {
      this.on({
        'change:id': onChangeModelId,
        'change:subtotal': onChangeSubtotal,
        'change:unread': onChangeUnread
      })
    }
    if (this.get('id')?.includes('flat/event/resources') && !this.get('id')?.includes('flat/event/resources.general')) {
      this.on({ 'change:title': onChangeResourceGroupTitle })
    }
    if (this.is('resourceCalendar')) {
      // make sure we always have a proper resourceId. Might be missing if folder was not added to calendar
      if (this.get('resourceId') === undefined) this.set('resourceId', parseInt(this.get('id').replace('cal://0/resource', '')), { silent: true })
      this.on({ 'change:com.openexchange.calendar.extendedProperties': onChangeColor })
    }
  },

  // check if the current user has admin privileges
  isAdmin () {
    const bits = new Bitmask(this.get('own_rights'))
    return !!bits.get('admin')
  },

  getAccountDisplayName () {
    return filestorageApi.getAccountDisplayName(this.get('account_id'))
  },

  supportsInternalSharing () {
    if (this.is('system')) return false
    // drive: always enabled
    if (this.is('drive')) return true
    // mail: check gab (webmail, PIM, PIM+infostore) and folder capability (bit 0), see Bug 47229
    if (this.is('mail')) return capabilities.has('gab') && this.can('change:permissions') && !account.isExternal(this.get('account_id'))
    // contacts, calendar, tasks
    if (this.is('calendar') && this.is('private') && !this.supportsShares()) return false
    if (this.is('public')) return capabilities.has('edit_public_folders')
    // non-public foldes
    return capabilities.has('read_create_shared_folders')
  },

  supportsInviteGuests () {
    return !this.is('mail') && capabilities.has('invite_guests') && this.supportsInternalSharing()
  },

  // check if the folder can have shares
  supportsShares () {
    // for mail folders check "capabilities" bitmask
    if (this.is('mail') && (this.get('capabilities') & 1) === 1) return true
    // for other folders check supported_capabilities
    return this.supports('permissions')
  },

  // check if the folder can be shared (requires admin bit and the capability "permissions")
  isShareable () {
    return this.isAdmin() && this.supportsShares()
  },

  // checks if the folder supports a capability
  supports (capability) {
    return util.supports(capability, this.attributes)
  },

  // convenience function / maps to folderAPI.is(type, folder)
  is (type) {
    return util.is(type, this.attributes)
  },

  // convenience function / maps to folderAPI.can(action, folder)
  can (action) {
    return util.can(action, this.attributes)
  },

  getTitle () {
    return this.get('display_title') || this.get('title') || ''
  }
})

const FolderCollection = Backbone.Collection.extend({

  model: FolderModel,

  constructor: function (id) {
    Backbone.Collection.apply(this, arguments)
    this.id = id
    this.fetched = false
    this.on('remove', this.onRemove, this)

    // sort shared and hidden folders by title
    const isFlatShared = /^flat\/(contacts|calendar|tasks|event)\/shared$/.test(this.id)
    const isFlatHidden = /^flat\/(contacts|calendar|tasks|event)\/hidden$/.test(this.id)
    if (isFlatShared || isFlatHidden) {
      this.comparator = function (model) {
        return (model.get('display_title') || model.getTitle()).toLowerCase()
      }
    }
  },

  comparator (model) {
    return model.get('index/' + this.id) || 0
  },

  onRemove (model) {
    if (isFlat(model.get('module'))) return
    pool.getModel(this.id).set('subscr_subflds', this.length > 0)
    api.trigger('collection:remove', this.id, model)
  }
})

// collection pool
function Pool () {
  this.models = {}
  this.collections = {}
}

_.extend(Pool.prototype, {

  addModel (data) {
    if (data.attributes) return data

    const id = data.id
    let model = this.models[id]

    if (model === undefined) {
      // add new model
      this.models[id] = model = new FolderModel(data)
      api.trigger('pool:add', model)
    } else {
      // update existing model
      model.set(data)
    }
    return model
  },

  removeModels (accountId) {
    if (!accountId) return
    _.each(this.models, function (model, id) {
      if (!model.get('account_id')) return true
      if (model.get('account_id') !== accountId) return true
      api.trigger('remove', id, this.models[id].toJSON())
      delete this.models[id]
    }.bind(this))
  },

  addCollection (id, list, options) {
    // drop 'subfolders' attribute unless all=true (see bug 46677)
    if (options && !options.all) {
      _(list).each(function (data) {
        delete data.subfolders
      })
    }
    // transform list to models
    const models = _(list).map(this.addModel, this)
    // options
    options = options || {}
    // update collection
    const collection = this.getCollection(id)
    const type = collection.fetched ? 'set' : 'reset'
    // not expired
    collection.expired = false
    // remove old virtual parent references
    if (this.models[id] && isVirtual(id)) {
      _(collection.models).each(function (model) {
        model.set('virtual_parents', _(model.get('virtual_parents')).without(id))
      })
    }
    collection[type](models)
    collection.fetched = true
    // some virtual folders have type undefined. Track subtotal for them too.
    // be carefull with unified folders, we don't track the subtotal for them because the subfolders are the folders from the non unified accounts. This would double the counters as the mails are tracked 2 times
    if (this.models[id] && (this.models[id].get('module') === 'mail' || this.models[id].get('module') === undefined) && !this.models[id].is('unifiedfolder')) {
      let subtotal = 0
      for (let i = 0; i < models.length; i++) {
        // use account API so it works with non standard accounts as well
        const cType = account.getType(models[i].get('id'))
        if (cType !== 'trash' && cType !== 'spam' && cType !== 'confirmed_spam' && models[i].id !== 'virtual/all-unseen') {
          subtotal += (models[i].get('subtotal') || 0) + (models[i].get('unread') || 0)
          // add virtual parent references
          if (isVirtual(id)) {
            const newParents = models[i].get('virtual_parents')
            if (newParents) {
              newParents.push(id)
              models[i].set('virtual_parents', _.uniq(newParents))
            }
          }
        }
      }
      this.models[id].set('subtotal', subtotal)
    }

    if (options.reset) collection.trigger('reset')
  },

  removeCollection (id, options) {
    options = options || {}
    let collection = this.collections[id]
    const self = this
    const models = collection ? collection.models : []

    if (!collection) return

    // delete collection before recursion to avoid loops, just in case
    collection = null
    delete this.collections[id]

    _(models).each(function (model) {
      removeFromAllCollections(model.id)
      self.removeCollection(model.id, options)
    })

    if (options.removeModels && this.models[id]) {
      const data = this.models[id].toJSON()
      this.models[id] = null
      delete this.models[id]
      api.trigger('remove', id, data)
      api.trigger('remove:' + id, data)
      api.trigger('remove:' + data.module, data)
    }
  },

  getModel (id) {
    return this.models[id] || (this.models[id] = new FolderModel({ id }))
  },

  getCollection (id, all) {
    id = getCollectionId(id, all)
    return this.collections[id] || (this.collections[id] = new FolderCollection(id))
  },

  expire () {
    _(this.collections).each(function (collection) { collection.expired = true })
  },

  unfetch (id) {
    if (arguments.length === 0 || id === '0') {
      // no need for recursion; reset all collections
      return _(this.collections).each(function (collection) {
        collection.fetched = false
      })
    }
    const collection = this.collections[id]
    if (!collection) return
    collection.fetched = false
    collection.each(unfetch)
  }
})

// get instance
const pool = new Pool()

//
// Used by list() and ramp-up
//

function processListResponse (id, list) {
  // 1. apply blocklist
  list = blocklist.apply(list)
  // 2. apply custom order
  list = sort.apply(id, list)
  // 3. inject index
  _(list).each(injectIndex.bind(null, id))
  return list
}

const rampup = {}
addReadyListener('rampup', function (oxRampup) {
  //
  // Use ramp-up data
  //

  _(oxRampup.folder).chain().keys().each(function (data) {
    pool.addModel(oxRampup.folder[data])
  })

  _(oxRampup.folderlist || {}).each(function (list, id) {
  // make objects
    rampup[id] = _(list).map(function (data) {
      return _.isArray(data) ? http.makeObject(data, 'folders') : data
    })
  })
})

addReadyListener('i18n', function () {
  //
  // Define virtual folders
  //

  if (capabilities.has('webmail')) {
    // only define if the user actually has mail
    // otherwise the folder refresh tries to fetch 'default0'
    const unseen = pool.addModel({ module: 'mail', folder_id: 'default0/INBOX', id: 'virtual/all-unseen', title: gt('Unread') })
    // TODO: getTitle() is needed to render folder titles, as titles are not translated otherwise
    unseen.getTitle = () => gt('Unread')
  }

  if (!capabilities.has('guest') && capabilities.has('edit_public_folders')) {
    pool.addModel({
      folder_id: '1',
      id: 'cal://0/allPublic',
      module: 'calendar',
      permissions: [{ bits: 0, entity: ox.user_id, group: false }],
      standard_folder: true,
      supported_capabilities: [],
      title: gt('All my public appointments'),
      total: -1,
      type: 1,
      subscribed: true
    })
  }
})

//
// Propagate
// central hub to coordinate events and caches
// (see files/api.js for a full implementation for files)
//

const ready = $.when()

function propagate (arg) {
  if (arg instanceof Backbone.Model) {
    const model = arg; const data = model.toJSON(); const id = data.id

    // use exact comparison here or changes to 0 are ignored
    if (model.changed.total !== undefined && model.changed.total !== null) {
      api.trigger('update:total', id, data)
      api.trigger('update:total:' + id, data)
    }
    if (model.changed.unread !== undefined && model.changed.unread !== null) {
      api.trigger('update:unread', id, data)
      api.trigger('update:unread:' + id, data)
    }
    return
  }

  if (/^account:(create|delete|unified-enable|unified-disable)$/.test(arg)) {
    // need to refresh subfolders of root folder 1
    return list('1', { cache: false }).done(function () {
      virtual.refresh()
      api.trigger('refresh')
    })
  }

  return ready
}

//
// Define a virtual collection
//

function VirtualFolder (id, getter) {
  this.id = id
  this.getter = getter
}

VirtualFolder.prototype.concat = function () {
  return _.whenSome.apply(undefined, arguments).then(function (data) {
    if (data.rejected.length) _.each(data.rejected, function (data) { console.error(data) })
    return _(data.resolved).chain().flatten().compact().value()
  })
}

VirtualFolder.prototype.list = function () {
  const id = this.id
  return this.getter().done(function (array) {
    _(array).chain().map(function (folder) {
      // use current data of virtual folders (for example, unread count could be updated in the meantime)
      if (isVirtual(folder.id)) return _.extend(folder, pool.getModel(folder.id).toJSON())
      return folder
    }).each(injectIndex.bind(null, id)).value()
    pool.addCollection(getCollectionId(id), array)
    pool.getModel(id).set('subscr_subflds', array.length > 0)
  })
}

const virtual = {

  hash: {},

  list (id) {
    const folder = this.hash[id]
    return folder !== undefined ? folder.list() : $.Deferred().reject({ error: `virtual folder ${id} not hashed.` })
  },

  add (id, getter) {
    this.hash[id] = new VirtualFolder(id, getter)
    pool.getModel(id).set('subscr_subflds', true)
  },

  // DEPRECATED: `concat` of `folderAPI.virtual`, pending remove with 8.20. Use `this.concat` instead
  concat () {
    if (ox.debug) console.warn('`concat` of `folderAPI.virtual` is deprecated, pending remove with 8.20. Use `this.concat` instead.')
    return $.when.apply($, arguments).then(function () {
      return _(arguments).chain().flatten().map(injectIndex.bind(null, 'concat')).value()
    })
  },

  // reload single collection
  reload (id) {
    pool.getCollection(getCollectionId(id)).fetched = false
    this.list(id)
  },

  refresh () {
    _(this.hash).invoke('list')
  },

  getCollections () {
    return _(this.hash).keys().map(function (id) {
      return api.pool.getCollection(id)
    })
  }
}

function fail (error) {
  error = { error, code: 'UI-FOLDER' }
  console.warn('folder/api', error)
  api.trigger('error error:' + error.code, error)
  return $.Deferred().reject(error)
}

//
// Get a single folder
//

function get (id, options) {
  // avoid undefined / yep, untranslated
  if (id === undefined) return fail('Cannot fetch folder with undefined id')

  id = String(id)
  options = _.extend({ cache: true }, options)

  const model = pool.models[id]
  if (options.cache === true && model !== undefined && model.has('title')) return $.when(model.toJSON())

  // we have a special way to create resource calendars
  if (model?.is('resourceCalendar')) return $.when(addResourceCalendar(id))
  if (isVirtual(id)) return $.when({ id })

  // fetch GAB but GAB is disabled?
  if (id === contactUtil.getGabId() && !capabilities.has('gab')) {
    return fail(gt('Accessing global address book is not permitted'))
  }

  return http.GET({
    module: 'folders',
    params: {
      action: 'get',
      altNames: true,
      id,
      timezone: 'UTC',
      tree: tree(id)
    }
  })
    .fail(
      function (error) {
        api.trigger('error error:' + error.code, error, id)
        return error
      }
    )
    .pipe(function (data) {
      if (data.id === 'default0/virtual/flagged') data.title = gt('Flagged')
      // update/add model
      const model = pool.addModel(data)
      if (_(model.changed).size()) {
        // use module here, so apis only listen to their own folders
        api.trigger('changesAfterReloading:' + model.get('module'), model)
      }
      // propagate changes via api events
      propagate(model)
      // to make sure we always get the same result (just data; not timestamp)
      return data
    })
}

//
// Special case: Get multiple folders at once
//

function multiple (ids, options) {
  if (!ids || !ids.length) return $.when([])
  options = _.extend({ cache: true, errors: false }, options)

  try {
    http.pause()
    return $.when.apply($,
      _(ids).map(function (id) {
        return get(id, { cache: options.cache }).pipe(
          null,
          function fail (error) {
            // need to create a copy of the error, because http.resume will throw the same error if the /PUT multiple fails (see Bug 57323)
            error = _.extend({}, error)
            error.id = id
            return $.when(options.errors ? error : undefined)
          }
        )
      })
    )
      .pipe(function () {
        return _(arguments).toArray()
      })
      .pipe(function (responses) {
        // fail completely if no connection available, i.e. all requests fail with NOSERVER or OFFLINE (see bug 57323)
        if (!responses.length) return []
        if (_(responses).all({ code: 'OFFLINE' })) return reject('offline')
        if (_(responses).all({ code: 'NOSERVER' })) return reject('noserver')
        return responses
      })
  } finally {
    http.resume()
  }

  function reject (code) {
    return $.Deferred().reject({ error: http.messages[code], code: code.toUpperCase() })
  }
}

//
// Get subfolders
//

function list (id, options) {
  id = String(id)
  options = _.extend({ all: false, cache: true, force: false }, options)

  // already cached?
  const collectionId = getCollectionId(id, options.all)
  const collection = pool.getCollection(collectionId)
  if (collection.fetched && !collection.expired && options.cache === true) return $.when(collection.toJSON())

  // use rampup data?
  if (rampup[id] && !options.all) {
    const array = processListResponse(id, rampup[id])
    delete rampup[id]
    return renameDefaultCalendarFolders(array).then(function (list) {
      pool.addCollection(id, list)
      return list
    })
  }

  // flat?
  const data = /^flat\/([^/]+)\/([^/]+)$/.exec(id); let module; let section
  if (data) {
    module = data[1]
    section = data[2]
    return flat({ module, cache: options.cache }).then(function (sections) {
      return sections[section]
    })
  }

  // special handling for virtual folders
  if (isVirtual(id)) return virtual.list(id)

  return http.GET({
    module: 'folders',
    params: {
      action: 'list',
      all: options.all ? '1' : '0',
      altNames: true,
      parent: id,
      timezone: 'UTC',
      tree: tree(id),
      forceRetry: options.force,
      columns: options.columns

    },
    appendColumns: true
  })
    .then(renameDefaultCalendarFolders, function (error) {
      api.trigger('error error:' + error.code, error, id)
      throw error
    })
    .then(function (array) {
      array = processListResponse(id, array)
      pool.addCollection(collectionId, array, { all: options.all })
      // to make sure we always get the same result (just data; not timestamp)
      return array
    })
}

/**
 * Get multiple lists.
 */
function multipleLists (ids, options) {
  try {
    http.pause()
    return $.when.apply($,
      _(ids).map(function (id) {
        return list(id).then(
          null,
          function fail (error) {
            error = error || {}
            options = options || {}
            error.id = id
            return $.when(options.errors ? error : undefined)
          }
        )
      })
    )
      .then(function () {
        const lists = []
        _(arguments).toArray().forEach(function (list) {
          Array.prototype.push.apply(lists, list)
        })
        return lists
      })
  } finally {
    http.resume()
  }
}

//
// Get folder path
//

function path (id) {
  const result = []; let current = id; let data; let done = false

  // be robust
  if (id === undefined) return $.when([])

  // try to resolve via pool
  do {
    result.push(data = pool.getModel(current).toJSON())
    current = data.folder_id
    done = String(current) === '1' || current === id
  } while (current && !done)

  // resolve in reverse order (root > folder)
  if (done) return $.when(result.reverse())

  // you cannot get the path of virtual folders as they are purely a UI construct
  // just return the data from the pool if it's there
  if (isVirtual(id)) return pool.getModel(id).toJSON() ? $.when([pool.getModel(id).toJSON()]) : $.when([])

  return http.GET({
    module: 'folders',
    params: {
      action: 'path',
      altNames: true,
      id,
      tree: tree(id)
    },
    appendColumns: true
  })
    .then(function (data) {
      // loop over folders to remove root and add to pool
      return _(data)
        .filter(function (folder) {
          pool.addModel(folder)
          return folder.id !== '1'
        })
        .reverse()
    })
}

//
// Flat list
//

function makeObject (array) {
  return http.makeObject(array, 'folders')
}

function getSection (type) {
  if (type === 3) return 'shared'
  if (type === 2) return 'public'
  return 'private'
}

function getFlatCollectionId (module, section) {
  return 'flat/' + module + '/' + section
}

function getFlatCollection (module, section) {
  return pool.getCollection(getFlatCollectionId(module, section))
}

function getFlatViews () {
  return _(pool.collections).chain()
    .keys()
    .filter(function (id) {
      return /^flat/.test(id)
    })
    .map(function (id) {
      return id.split('/')[1]
    })
    .uniq()
    .value()
}

function injectVirtualCalendarFolder (array) {
  array.unshift(pool.getModel('cal://0/allPublic').toJSON())
}

function flat (options) {
  // all modules with flat foldertrees need the full request here as default (contacts/tasks/calendar)
  options = _.extend({ module: undefined, cache: true, force: false, all: true }, options)
  if (options.module === 'calendar') options.module = 'event'

  // missing module?
  if (ox.debug && !options.module) {
    console.warn('Folder API > flat() - Missing module', options)
    return $.Deferred().reject()
  }

  // already cached?
  const module = options.module
  const collection = getFlatCollection(module, 'private')
  const cached = {}

  // no caching if options.all is set to false
  if (options.all && collection.fetched && options.cache === true) {
    cached.private = collection.toJSON();
    ['public', 'shared', 'sharing', 'hidden'].forEach(function (section) {
      const collection = getFlatCollection(module, section)
      if (collection.fetched) cached[section] = collection.toJSON()
    })
    api.trigger('cache:flat:' + options.module)
    return $.when(cached)
  }

  api.trigger('before:flat:' + options.module)
  return http.GET({
    module: 'folders',
    appendColumns: true,
    params: {
      action: 'allVisible',
      altNames: true,
      content_type: module === 'contacts' || module === 'addressbooks' ? 'addressdata' : module,
      timezone: 'UTC',
      tree: 1,
      forceRetry: !!options.force,
      all: !!options.all
    }
  })
    .then(function (data) {
      const list = []
      const sections = _(data)
        .chain()
        .map(function (section, id) {
          const obj = _(section)
            .chain()
            .map(makeObject)
            .filter(function (folder) {
              const isAdmin = !!new Bitmask(folder.own_rights).get('admin')
              // read access?
              if (!util.can('read', folder) && !util.can('change:permissions', folder) && !isAdmin) return false
              // otherwise
              return true
            })
            .value()

          list.push(obj)
          return [id, obj]
        })
        .object()
        .value()

      return renameDefaultCalendarFolders(_(list).flatten()).then(function () {
        return sections
      })
    })
    .then(function (data) {
      const sections = {}
      let hidden = []
      let sharing = []
      const hash = settings.get(['folder/hidden'], {})
      let collectionId
      // inject public section if not presend
      if (module === 'event' && !data.public) data.public = []

      // loop over results to get proper objects and sort out hidden folders
      _(data).each(function (section, id) {
        let array = _(section).filter(function (folder) {
          // store section / easier than type=1,2,3
          if (hash[folder.id]) { hidden.push(folder); return false }
          // sharing?
          if (util.is('shared-by-me', folder)) sharing.push(folder)
          // otherwise
          return true
        })
        // inject 'All my public appointments' for calender/public
        if (module === 'event' && id === 'public') injectVirtualCalendarFolder(array)
        // process response and add to pool
        collectionId = getFlatCollectionId(module, id)
        array = processListResponse(collectionId, array)
        sections[id] = array
        // only cache when options.all is set or we get strange side effects
        if (!options.all) return
        pool.addCollection(collectionId, array, { reset: true })
      })
      // add collection for hidden folders
      collectionId = getFlatCollectionId(module, 'hidden')
      hidden = processListResponse(collectionId, hidden)
      sections.hidden = hidden
      // only cache when options.all is set or we get strange side effects
      if (options.all) pool.addCollection(collectionId, hidden, { reset: true })
      // add collection for folders shared by me
      collectionId = getFlatCollectionId(module, 'sharing')
      sharing = processListResponse(collectionId, sharing)
      sections.sharing = sharing
      // only cache when options.all is set or we get strange side effects
      if (options.all) pool.addCollection(collectionId, sharing, { reset: true })

      api.trigger('after:flat:' + options.module)
      // done
      return sections
    })
}

//
// Update folder
//

function update (id, changes, options) {
  if (!_.isObject(changes) || _.isEmpty(changes)) return

  // update model
  options = _.extend({ silent: false }, options)
  const model = pool.getModel(id).set(changes, { silent: options.silent })

  if (!options.silent) api.trigger('before:update before:update:' + id, id, model)
  if (isVirtual(id)) return $.when()

  // build data object
  const data = { folder: changes }

  if (options.notification && !_.isEmpty(options.notification)) {
    data.notification = options.notification
  }

  return jobsAPI.enqueue(http.PUT({
    module: 'folders',
    params: {
      action: 'update',
      id,
      timezone: 'UTC',
      tree: tree(id),
      cascadePermissions: options.cascadePermissions,
      ignoreWarnings: options.ignoreWarnings,
      // special parameter for long running operations (drive folder move/copy)
      allow_enqueue: options.enqueue
    },
    data,
    appendColumns: false
  }))
    .done(function () {
      const data = model.toJSON()
      if (!blocklist.visible(data)) api.trigger('warn:hidden', data)
    })
    .then(
      function (newId) {
        // id change? (caused by rename or move)
        if (id !== newId) model.set('id', newId)
        if (options.cascadePermissions) refresh()
        // trigger events
        if (!options.silent) {
          api.trigger('update update:' + id, id, newId, model.toJSON())
          if ('permissions' in changes) api.trigger('change:permissions', id)
          if ('subscribed' in changes) api.trigger('change:subscription', id, changes)
        }
        // fetch subfolders of parent folder to ensure proper order after rename/move
        if (id !== newId || changes.title || changes.folder_id) {
          return list(model.get('folder_id'), { cache: false })
            .then(function () {
              pool.getCollection(model.get('folder_id')).sort()

              // used by drive to respond to updated foldernames in icon/list view
              // note: this is moved inside the 'list' deferred chain, otherwise the drive list reload
              // could refresh with old data when having high latency/slow connections see #62552 and #56749
              if ('title' in changes) api.trigger('rename', id, model.toJSON())

              if ('title' in changes) api.trigger('after:rename', id, model.toJSON())
              return newId
            })
        }
      }, function (error) {
        // get fresh data for the model (the current ones are wrong since we applied the changes early to be responsive)
        api.get(id, { cache: false })
        if (error && error.code && error.code === 'FLD-0018') {
          error.error = gt('Could not save settings. There has to be at least one user with administration rights.')
        }
        if (!options.silent) {
          api.trigger('update:fail', error, id)
        }
        throw error
      }
    )
}

//
// Move folder
//

function move (id, target, options) {
  // doesn't make sense but let's silently finish
  if (id === target) return $.when()

  options = options || {}

  // prepare move
  const model = pool.getModel(id)
  const folderId = model.get('folder_id')

  removeFromAllCollections(model)

  // trigger event
  api.trigger('before:move', model.toJSON(), target)

  // set unread to 0 to update subtotal attributes of parent folders (bubbles through the tree)
  model.set('unread', 0)

  return update(id, { folder_id: target }, options).then(
    function success (newId) {
      const cont = function (data) {
        if (data.error) {
          // re-add folder
          pool.getModel(folderId).set('subscr_subflds', true)
          virtual.refresh()
          pool.getCollection(folderId).add(model)
          throw data
        }
        // update new parent folder
        pool.getModel(target).set('subscr_subflds', true)
        // update all virtual folders
        virtual.refresh()
        // add folder to collection
        pool.getCollection(target).add(model)
        // trigger event
        api.trigger('move', id, data)
      }

      // check if we have a long running job
      if (newId && (newId.code === 'JOB-0003' || newId.job)) {
        api.trigger('new:longrunningjob')
        jobsAPI.on('finished:' + (newId.job || newId.data.job), cont)
        return
      }
      cont(newId)
    },
    function fail (error) {
      // re-add folder
      pool.getModel(folderId).set('subscr_subflds', true)
      pool.getCollection(folderId).add(model)
      virtual.refresh()
      throw error
    }
  )
}

//
// Create folder
//

function create (id, options) {
  id = String(id)

  // get parent folder first - actually just to inherit 'module';
  return get(id).then(function (parent) {
    // default options
    options = _.extend({
      module: parent.module,
      subscribed: 1,
      title: gt('New Folder'),
      silent: false
    }, options)
    // inherit permissions for private flat non-calendar folders
    if (isFlat(options.module) && options.module !== 'calendar' && options.module !== 'event' && !(parent.id === '2' || util.is('public', parent))) {
      // empty array doesn't work; we have to copy the admins
      options.permissions = _(parent.permissions).filter(function (item) {
        return !!(item.bits & 268435456)
      })
    }
    const params = {
      action: 'new',
      autorename: true,
      folder_id: id
    }
    if (options.module !== 'event') params.tree = tree(id)

    // a bit of a missmatch, here although we are in contacts, use addressdata as module to call the new api (parameter is module but it seems mw uses it as content_type)
    if (options.module === 'contacts') options.module = 'addressdata'

    return http.PUT({
      module: 'folders',
      params,
      data: options,
      appendColumns: false
    })
      .then(function getNewFolder (newId) {
        return get(newId)
      })
      .then(function reloadSubFolders (data) {
        // and back again...
        if (options.module === 'addressdata') options.module = 'contacts'
        return (
          isFlat(options.module) ? flat({ module: options.module, cache: false }) : list(id, { cache: false })
        )
          .then(function () {
            // make sure to return new folder data
            return data
          })
      })
      .done(function checkVisibility (data) {
        // trigger event if folder will be hidden
        if (!blocklist.visible(data) && !options.silent) api.trigger('warn:hidden', data)
      })
      .done(function updateParentFolder (data) {
        pool.getModel(id).set('subscr_subflds', true)
        virtual.refresh()

        if (!options.silent) {
          api.trigger('create', data)
          api.trigger('create:' + id.replace(/\s/g, '_'), data)
        }
      })
      .fail(function fail (error) {
        if (!options.silent) api.trigger('create:fail', error, id)
      })
  })
}

//
// Remove folder
//

function removeFromAllCollections (model) {
  _(pool.collections).invoke('remove', model)
}

let currentlyDeleted = []
function isBeingDeleted (id) {
  return _(currentlyDeleted).contains(id)
}

function remove (ids) {
  // ensure array
  if (!_.isArray(ids)) ids = [ids]

  // local copy for model data
  const hash = {}

  _(ids).each(function (id) {
    // get model
    const model = pool.getModel(id); const data = hash[id] = model.toJSON()
    // trigger event
    api.trigger('before:remove', data)
    // set unread to 0 to update subtotal attributes of parent folders (bubbles through the tree)
    model.set('unread', 0)
    // update collection (now)
    removeFromAllCollections(model)
    delete pool.models[id]
    model.trigger('destroy')
  })
  if (isVirtual(ids)) return $.when({ ids })

  const params = {
    action: 'delete',
    failOnError: true,
    tree: tree(ids[0]),
    extendedResponse: true
  }

  // delete on server
  return http.PUT({
    module: 'folders',
    params,
    data: ids,
    appendColumns: false
  })
    .done(function (response) {
      response = response || []
      _(ids).each(function (id, index) {
        const data = hash[id]
        api.trigger('remove', id, data)
        api.trigger('remove:' + id, data)
        api.trigger('remove:' + data.module, data)
        // get refreshed the model data for folders moved to the trash folder. If they are removed completely we remove the collection
        // flat models don't have a collection, so no need to remove here
        if (!isFlat(data.module)) {
          // see if this folder was moved to trash or deleted completely
          if (api.is('trash', data) || (response[index] && _.isEmpty(response[index].new_path))) {
            api.pool.removeCollection(id, { removeModels: true })
          } else {
            currentlyDeleted.push(id)
            // use new path if available, else use id
            const pathOrId = (response[index] ? response[index].new_path : id)
            api.get(pathOrId, { cache: false }).fail(function (error) {
              // folder does not exist
              if (error.code === 'FLD-0008' || error.code === 'IMAP-1002') {
                api.pool.removeCollection(id, { removeModels: true })
              }
            }).always(function () {
              currentlyDeleted = _(currentlyDeleted).without(id)
            })
          }
        }
        // if this is a trash folder trigger special event (quota updates)
        if (account.is('trash', id)) api.trigger('cleared-trash')
      })
    })
    .fail(function () {
      _(ids).each(function (id) {
        api.trigger('remove:fail', id)
      })

      // use refresh to rollback the folderdata
      refresh()
    })
}

/**
 * Restore a bunch of folderModels to their originally source.
 *
 * @param {api.Model[]} list Array of folderModels
 */
function restore (list) {
  // ensure array
  if (!_.isArray(list)) list = [list]

  const ids = []

  _(list).each(function (model) {
    const id = model.get('id')

    ids.push(id)

    // remove model from collections
    _(api.pool.collections).invoke('remove', model)
    model.set('unread', 0)
  })

  // restore on server
  return http.PUT({
    module: 'folders',
    params: {
      action: 'restore',
      tree: tree(ids[0])
    },
    data: ids,
    appendColumns: false
  })
    .done(function () {
      _(list).each(function (model) {
        const id = model.get('id')
        api.get(id, { cache: false }).done(function () {
          refresh()
          api.trigger('restore', model.toJSON())
        })
          .fail(function (error) {
            // folder does not exist
            if (error.code === 'FLD-0008' || error.code === 'IMAP-1002') {
              removeFromAllCollections(model)
            }
          })
      })
    })
    .fail(function () {
      _(list).each(function (model) {
        api.propagate('restore:fail', model.toJSON())
      })
    })
}

//
// Clear/empty folder
//

function clear (id) {
  api.trigger('before:clear', id)

  // be responsive (updates folder counters instantly. Waiting for the request may be slow)
  if (api.pool.models[id]) {
    api.pool.models[id].set({
      total: 0,
      unread: 0
    })
  }
  return jobsAPI.enqueue(http.PUT({
    module: 'folders',
    appendColumns: false,
    params: {
      action: 'clear',
      tree: tree(id),
      allow_enqueue: true
    },
    data: [id]
  }))
    .done(function () {
      if ((api.pool.models[id] && api.pool.models[id].is('trash')) || account.is('trash', id)) {
        // clear collections
        if (api.pool.collections[id]) {
          api.pool.collections[id].each(function (model) {
            api.pool.removeCollection(model.id, { removeModels: true })
          })
        }
        // if this is a trash folder trigger special event (quota updates)
        api.trigger('cleared-trash')
      }
      refresh().always(() => {
        api.trigger('clear', id)
      })
    })
}

//
// Provide text node
//

function updateTextNode (data) {
  this.nodeValue = data.display_title || data.title || data.id
}

function getTextNode (id) {
  const node = document.createTextNode('')
  get(id).done(updateTextNode.bind(node))
  return node
}

function getDeepLink (data) {
  const app = 'io.ox/' + (data.module === 'infostore' ? 'files' : data.module)
  const folder = encodeURIComponent(data.id)

  return ox.abs + ox.root + '/#!&app=' + app + '&folder=' + folder
}

//
// ignoreSentItems()
// check a list of object if they originate from more than one folder
// if so remove items from "sent" folder; useful for delete/move actions and threads
//

function fromSameFolder (list) {
  return _(list).chain().pluck('folder_id').uniq().value().length <= 1
}

function isNotSentFolder (obj) {
  return !account.is('sent', obj.folder_id)
}

function ignoreSentItems (list) {
  // not array or just one?
  if (!_.isArray(list) || list.length === 1) return list
  // all from same folder?
  if (fromSameFolder(list)) return list
  // else: exclude sent items
  return _(list).filter(isNotSentFolder)
}

//
// Reload folder
//

function getFolderId (arg) {
  if (_.isString(arg)) return arg
  return arg ? arg.folder_id : null
}

function reload () {
  _.chain(arguments).flatten().map(getFolderId).compact().uniq().each(function (id) {
    // register function call once
    if (!reload.hash[id]) reload.hash[id] = _.debounce(get.bind(null, id, { cache: false }), reload.wait)
    api.trigger('reload:' + id)
    reload.hash[id]()
  })
}

// to debounce reloading folders
reload.hash = {}
// interval
reload.wait = 2000

//
// Hide/show (flat) folder
//

function hide (id) {
  // get model & module
  const model = pool.getModel(id); const module = model.get('module')
  // change state
  settings.set(['folder/hidden', id], true).save()
  // reload sections; we could handle this locally
  // but this is a dead-end when it comes to sorting
  api.trigger('hide', id)
  flat({ module, cache: false })
}

function show (id) {
  // get model & module
  const model = pool.getModel(id); const module = model.get('module')
  // change state
  settings.remove(['folder/hidden', id]).save()
  // reload sections; we could handle this locally
  // but this is a dead-end when it comes to sorting
  api.trigger('show', id)
  flat({ module, cache: false })
}

function toggle (id, state) {
  if (state === true) show(id); else hide(id)
}

function onChangeResourceGroupTitle (model) {
  const title = model.get('title')
  const [folder, previousTitle] = model.get('id').split('.')
  if (title === previousTitle) return
  const oldGroup = calSettings.get(`resources/groups/${previousTitle}`)
  calSettings.set(`resources/groups/${title}`, { ...oldGroup, title, folderId: `${folder}.${title}` })
    .remove(`resources/groups/${previousTitle}`)
    .save()
}

function onChangeColor (model) {
  // resource calendar is not added to the calendar, so no need to change colors
  if (!calSettings.get(`resources/folders/${model.get('resourceId')}`)) return
  const folders = calSettings.get('resources/folders', [])
  const updatedFolder = folders[model.get('resourceId')]
  updatedFolder['com.openexchange.calendar.extendedProperties'] = model.get('com.openexchange.calendar.extendedProperties')
  calSettings.set(`resources/folders/${model.get('resourceId')}`, updatedFolder).save()
}

//
// Change unseen count
//

const changeUnseenCounter = (function () {
  const hash = {}; const wait = 500

  function cont (id) {
    delete hash[id]
    reload(id)
  }

  function fetch (id) {
    if (hash[id]) clearTimeout(hash[id])
    hash[id] = setTimeout(cont, wait, id)
  }

  return function changeUnseenCounter (id, delta) {
    const model = pool.getModel(id)
    model.set('unread', Math.max(0, model.get('unread') + delta))
    fetch(id)
  }
}())

function setUnseenCounter (id, unread) {
  pool.getModel(id).set('unread', Math.max(0, unread))
}

function setUnseenMinimum (id, min) {
  const model = pool.getModel(id)
  model.set('unread', Math.max(min || 0, model.get('unread')))
}

//
// Refresh all folders
//

function refresh () {
  pool.expire()
  // pause http layer to get one multiple
  http.pause()
  const defs = []
  // loop over all non-flat folders, get all parent folders, apply unique, and reload if they have subfolders
  _(api.pool.models).chain()
    .filter(function (model) {
      return !isFlat(model.get('module'))
    })
    .invoke('get', 'folder_id').uniq().compact().without('0')
    .each(function (id) {
      defs.push(list(id, { cache: false }))
    })
  // loop over flat views
  _(getFlatViews()).each(function (module) {
    defs.push(flat({ module, cache: false }))
  })

  // we cannot use virtual.refresh right after the multiple returns, because it does not wait for the callback functions of the requests to finish. This would result in outdated models in the pool
  // use always to keep the behavior of the multiple (ignores errors)
  Promise.allSettled(defs).then(function () {
    api.trigger('after:folder:refresh^')
    virtual.refresh()
  })

  return http.resume()
}

ox.on('please:refresh refresh^', refresh)
ox.on('account:delete', pool.removeModels.bind(pool))

// If there is a new filestorage refresh the folders
filestorageApi.on('create update', refresh)

//
// Get standard mail folders
//
// We cannot rely on account API because folders might not yet exist, especially Archive.
// We assume that all folders for external accounts exist; we further assume that standard folders
// for primary account are located below inbox. Therefore, we fetch subfolders and look for
// standard folders based on account data. I think that someone someday will report "Folder not found"
// for external accounts; then we take another round. Would be cool if backend would just
// provide a list of existing standard folders but that seems to be rocket science.

function getStandardMailFolders () {
  // get all external standard folders
  const external = _(account.getStandardFolders()).filter(function (id) {
    return !/^default0/.test(id)
  })

  // get inbox' subfolders
  const inbox = account.getInbox(); const collection = pool.getCollection(inbox)

  // get all internal standard folders (_.chain() doesn't work here for whatever reason)
  const internal = _(collection.pluck('id')).filter(account.isStandardFolder)

  return internal.concat(external)
}

// Check if "altnamespace" is enabled (mail server setting)
const altnamespace = function () {
  return account.altnamespace()
}

//
// Special lookup for
//

function getExistingFolder (type) {
  const defaultId = util.getDefaultFolder(type)
  if (defaultId) return $.Deferred().resolve(defaultId)
  if (type === 'mail') return $.Deferred().resolve('default0' + getDefaultSeparator() + 'INBOX')
  if (type === 'infostore') return $.Deferred().resolve(10)
  return flat({ module: type }).then(function (data) {
    for (const section in data) {
      if (section === 'hidden') continue
      const list = data[section]
      if (list && list[0] && list[0].id) return list[0].id
    }
    return null
  })
}

function getDefaultSeparator () {
  return mailSettings.get('defaultseparator', '/')
}

function getMailFolderSeparator (id) {
  let base = id.split(getDefaultSeparator())[0]
  const separators = mailSettings.get('separators') || {}
  if (!/^default\d+$/.test(base)) return '/'
  base = base.replace('default', '')
  if (separators[base]) return separators[base]
  return getDefaultSeparator()
}

// register pool in util function. Needed for some checks. Cannot be done with require folderAPI or we would either be asynchronous or have circular dependencies
util.registerPool(pool)

function removeFromPool (id) {
  if (!id || !pool.models[id]) return
  removeFromAllCollections(pool.models[id])
  delete pool.models[id]
  delete pool.collections[id]
}

// creates a folder in the pool from resource data
async function addResourceCalendar (folderId) {
  const resourceId = parseInt(folderId.replace('cal://0/resource', ''))
  const resourceData = await resourceAPI.get({ id: resourceId })
  return pool.addModel({
    id: folderId,
    resourceId,
    module: 'calendar',
    standard_folder: false,
    title: resourceData.display_name,
    own_rights: 0,
    permissions: [{ bits: 0, entity: ox.user_id, group: false }],
    subscribed: true,
    'com.openexchange.calendar.extendedProperties': {}
  }).toJSON()
}

// publish api
_.extend(api, {
  FolderModel,
  FolderCollection,
  Pool,
  pool,
  calculateSubtotal,
  get,
  list,
  multiple,
  path,
  flat,
  update,
  move,
  create,
  remove,
  restore,
  isBeingDeleted,
  clear,
  reload,
  hide,
  show,
  toggle,
  refresh,
  bits: util.bits,
  is: util.is,
  can: util.can,
  supports: util.supports,
  virtual,
  isVirtual,
  isExternalFileStorage,
  isFlat,
  isNested,
  getFlatCollection,
  getFlatViews,
  getDefaultFolder: util.getDefaultFolder,
  getExistingFolder,
  getStandardMailFolders,
  getDefaultSeparator,
  getMailFolderSeparator,
  getTextNode,
  getDeepLink,
  getFolderTitle,
  ignoreSentItems,
  processListResponse,
  changeUnseenCounter,
  setUnseenCounter,
  setUnseenMinimum,
  getSection,
  Bitmask,
  propagate,
  altnamespace,
  injectIndex,
  multipleLists,
  renameDefaultCalendarFolders,
  removeFromPool
})

export default api
