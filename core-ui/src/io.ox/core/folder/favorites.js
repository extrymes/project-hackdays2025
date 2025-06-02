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
import TreeNodeView from '@/io.ox/core/folder/node'
import api from '@/io.ox/core/folder/api'
import ext from '@/io.ox/core/extensions'
import upsell from '@/io.ox/core/upsell'

import { settings } from '@/io.ox/core/settings'
import '@/io.ox/files/favorites'
import gt from 'gettext'

_('mail contacts calendar tasks'.split(' ')).each(function (module) {
  // skip if no capability (use capabilities from upsell to work in demo mode)
  if (module === 'mail' && !upsell.has('webmail')) return
  if (module !== 'mail' && !upsell.has(module)) return

  // register collection
  const id = 'virtual/favorites/' + module
  const model = api.pool.getModel(id)
  const collection = api.pool.getCollection(id)
  // track folders without permission or that no longer exist
  const invalid = {}

  function store (ids) {
    settings.set(getSettingsKey(module), ids).save()
  }

  function storeCollection () {
    const ids = _(collection.pluck('id')).filter(function (id) {
      return !invalid[id]
    })
    store(ids)
  }

  // define virtual folder
  api.virtual.add(id, function () {
    const cache = !collection.expired && collection.fetched
    return api.multiple(getFavorites(module), { errors: true, cache }).then(function (response) {
      // remove non-existent entries
      const list = _(response).filter(function (item) {
        // FLD-0008 -> not found
        // FLD-0003 -> permission denied
        // ACC-0002 -> account not found (see bug 46481)
        // FLD-1004 -> folder storage service no longer available (see bug 47089)
        // IMAP-1002 -> mail folder "..." could not be found on mail server (see bug 47847)
        // FILE_STORAGE-0004 -> The associated (infostore) account no longer exists
        if (item.error && /^(FLD-0008|FLD-0003|ACC-0002|FLD-1004|IMAP-1002|FILE_STORAGE-0004)$/.test(item.code)) {
          invalid[item.id] = true
          return false
        }
        delete invalid[item.id]
        return true
      })
      _(list).each(api.injectIndex.bind(api, id))
      model.set('subscr_subflds', list.length > 0)
      // if there was an error we update settings
      if (list.length !== response.length) _.defer(storeCollection)
      return list
    }).then(api.renameDefaultCalendarFolders)
  })

  // respond to change events
  collection.on('add', function (model) {
    delete invalid[model.id]
  })

  collection.on('add remove change:id', storeCollection)

  // response to rename for mail folders
  if (module === 'mail') {
    api.on('rename', function (id, data) {
      if (data.module !== 'mail') return
      getAffectedSubfolders(collection, id).forEach(function (model) {
        model.set('id', data.id + model.get('id').substr(id.length))
        storeCollection()
      })
    })

    api.on('remove:mail', function (data) {
      getAffectedSubfolders(collection, data.id).forEach(function (model) {
        collection.remove(model)
        storeCollection()
      })
    })
  } else if (module === 'infostore') {
    // Add infos for the filesview
    model.set('title', gt('Favorites'))
    model.set('folder_id', '9')
    model.set('own_rights', 1)
    model.set('standard_folder', true)
  }

  const extension = {
    id: 'favorites',
    index: 1,
    draw (tree) {
      this.append(
        new TreeNodeView({
          empty: false,
          folder: id,
          indent: !api.isFlat(module),
          open: false,
          parent: tree,
          section: true,
          sortable: true,
          title: gt('Favorites'),
          tree,
          icons: tree.options.icons
        })
          .render().$el.addClass('favorites')
      )

      // store new order
      tree.on('sort:' + id, store)
    }
  }

  ext.point('io.ox/core/foldertree/' + module + '/app').extend(_.extend({}, extension))
  ext.point('io.ox/core/foldertree/' + module + '/popup').extend(_.extend({}, extension))
})

function getFavorites (module) {
  // migrate to chronos API?
  if (module === 'calendar' && settings.get('favorites/chronos') === undefined) migrateCalendar()
  return settings.get(getSettingsKey(module), [])
}

// since 7.10 we use another path for calendar not to lose favorites (see bug 58508)
function getSettingsKey (module) {
  return 'favorites/' + (module === 'calendar' ? 'chronos' : module)
}

function migrateCalendar () {
  const ids = _(settings.get('favorites/calendar', [])).map(function (id) { return 'cal://0/' + id })
  settings.set('favorites/chronos', ids).save()
}

function getAffectedSubfolders (collection, id) {
  return collection.filter(model => {
    const modelId = model.get('id')
    return modelId && modelId.indexOf(id + api.getMailFolderSeparator(modelId)) === 0
  })
}

function remove (id, model, module) {
  model = model || api.pool.getModel(id)
  module = module || model.get('module')
  if (!module) return
  const collectionId = 'virtual/favorites/' + module
  const collection = api.pool.getCollection(collectionId)
  collection.remove(model)
  api.trigger('favorite:remove')
}

function add (id, model) {
  model = model || api.pool.getModel(id)
  if (!model.get('module')) return
  const collectionId = 'virtual/favorites/' + model.get('module')
  const collection = api.pool.getCollection(collectionId)
  model.set('index/' + collectionId, true, { silent: true })
  collection.add(model)
  collection.sort()
  api.trigger('favorite:add')
}

//
// Folder API listeners
//

api.on('collection:remove', function (id, model) {
  remove(id, model)
})

//
// Add to contextmenu
//

function onAdd (e) {
  add(e.data.id)
}

function onRemove (e) {
  remove(e.data.id, undefined, e.data.module)
}

function a (action, text) {
  return $('<a href="#" role="menuitem" tabindex="-1">')
    .attr('data-action', action).text(text)
  // always prevent default
    .on('click', $.preventDefault)
}

function disable (node) {
  return node.attr('aria-disabled', true).removeAttr('tabindex').addClass('disabled')
}

function addLink (node, options) {
  if (options.data.module === 'infostore') return
  const link = a(options.action, options.text)
  if (options.enabled) link.on('click', options.data, options.handler); else disable(link)
  node.append($('<li role="presentation">').append(link))
  return link
}

ext.point('io.ox/core/foldertree/contextmenu/default').extend({
  id: 'toggle-favorite',
  // place after "Add new folder"
  index: 1010,
  draw (baton) {
    if (_.device('smartphone')) return
    const id = baton.data.id
    const module = baton.module
    const favorites = getFavorites(module)
    const isFavorite = _(favorites).indexOf(id) > -1

    // don't offer for trash folders
    if (api.is('trash', baton.data)) return

    addLink(this, {
      action: 'toggle-favorite',
      data: { id, module },
      enabled: true,
      handler: isFavorite ? onRemove : onAdd,
      text: isFavorite ? gt('Remove from favorites') : gt('Add to favorites')
    })
  }
})

export default { add, remove }
