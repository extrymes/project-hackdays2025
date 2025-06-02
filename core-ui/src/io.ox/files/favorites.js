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
import folderAPI from '@/io.ox/core/folder/api'
import filesAPI from '@/io.ox/files/api'
import ext from '@/io.ox/core/extensions'
import upsell from '@/io.ox/core/upsell'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'

const FOLDERS_INFOSTORE_PATH = 'favorites/infostore'
const FILES_INFOSTORE_PATH = 'favoriteFiles/infostore'

// skip if no capability (use capabilities from upsell to work in demo mode)
addReadyListener('upsell', () => {
  if (!upsell.has('infostore')) return
  const // register collection
    collectionId = 'virtual/favorites/infostore'
  const model = folderAPI.pool.getModel(collectionId)
  const collection = folderAPI.pool.getCollection(collectionId)

  // Add infos for the filesview
  model.set('title', gt('Favorites'))
  model.set('folder_id', '9')
  model.set('own_rights', 1)
  model.set('standard_folder', true)

  function storeFolders (elements) {
    settings.set(FOLDERS_INFOSTORE_PATH, elements)
  }

  function storeFiles (elements) {
    settings.set(FILES_INFOSTORE_PATH, elements)
  }

  function addFavoriteIndex (model) {
    if (!model?.toJSON) {
      return model
    }
    const fileModel = new filesAPI.Model(model.toJSON())
    fileModel.set('index/' + collectionId, true, { silent: true })
    return fileModel
  }

  /**
   * Add a folder to the collection
   * @param {Integer}           id    Additional parameters
   * @param {Folder|File|false} model Folder model
   */
  function addFavorite (id, model) {
    model = model || folderAPI.pool.getModel(id)

    addFavorites([model])
  }

  function addFavorites (models) {
    if (!models || models.length === 0) return

    const folderSettings = settings.get(FOLDERS_INFOSTORE_PATH, [])
    const fileSettings = settings.get(FILES_INFOSTORE_PATH, [])

    let updateFolders = false
    let updateFiles = false
    const collectionModels = []

    models.forEach(function (model) {
      if (model && model.attributes && model.attributes.id) {
        if (model.attributes.folder_name) {
          if (folderSettings.indexOf(model.attributes.id) < 0) {
            folderSettings.push(model.attributes.id)
            collectionModels.push(addFavoriteIndex(model))
            updateFolders = true
          }
        } else {
          const file = {
            id: model.attributes.id,
            folder_id: model.attributes.folder_id
          }

          if (!containsFile(fileSettings, file)) {
            fileSettings.push(file)
            collectionModels.push(addFavoriteIndex(model))
            updateFiles = true
          }
        }
      }
    })

    if (updateFolders) {
      storeFolders(folderSettings)
    }
    if (updateFiles) {
      storeFiles(fileSettings)
    }
    const update = collectionModels.length

    if (update) {
      settings.save()
      collection.add(collectionModels)
      triggerCollectionUpdate()
    }

    return update
  }

  function removeFavorites (models) {
    if (!models || models.length === 0) return

    const folders = []
    const files = []
    const removeModels = []

    function addRemoveModel (model) {
      removeModels.push(addFavoriteIndex(model))
    }

    models.forEach(function (obj) {
      const id = obj
      if (typeof obj === 'object' && obj.attributes && obj.attributes.id) {
        if (obj.attributes.folder_name) {
          folders.push(obj.id)
          addRemoveModel(obj)
        } else if (obj.attributes.folder_id) {
          files.push({
            id: obj.attributes.id,
            folder_id: obj.attributes.folder_id
          })
          addRemoveModel(obj)
        }
      } else if (typeof obj === 'object' && obj.id) {
        if (obj.folder_name) {
          folders.push(obj.id)
          addRemoveModel(obj)
        } else if (obj.folder_id) {
          files.push({
            id: obj.id,
            folder_id: obj.folder_id
          })
          addRemoveModel(obj)
        }
      } else {
        let model = filesAPI.pool.get('detail').get(id)
        if (model && model.attributes && model.attributes.folder_id) {
          files.push({
            id: model.attributes.id,
            folder_id: model.attributes.folder_id
          })
          addRemoveModel(model)
        } else {
          model = folderAPI.pool.getModel(id)
          if (model && model.attributes && model.attributes.folder_name) {
            folders.push(id)
            addRemoveModel(model)
          }
        }
      }
    })

    let updateCollection = false
    if (folders.length > 0) {
      const folderSettings = settings.get(FOLDERS_INFOSTORE_PATH, [])

      const newFolderSettings = folderSettings.filter(function (folder) {
        return folders.indexOf(folder) < 0
      })
      if (folderSettings.length !== newFolderSettings.length) {
        updateCollection = true
        storeFolders(newFolderSettings)
      }
    }

    if (files.length > 0) {
      const fileSettings = settings.get(FILES_INFOSTORE_PATH, [])

      const newFileSettings = fileSettings.filter(function (file) {
        return !containsFile(files, file)
      })
      if (fileSettings.length !== newFileSettings.length) {
        updateCollection = true
        storeFiles(newFileSettings)
      }
    }

    if (updateCollection) {
      settings.save()
      collection.remove(removeModels)
      triggerCollectionUpdate()
    }

    return updateCollection
  }

  function containsFile (files, file) {
    return _.find(files, function (removeFile) {
      return removeFile.id === file.id && removeFile.folder_id === file.folder_id
    })
  }

  /**
   * Trigger to update sorting in myFavoriteListView (drive).
   */
  function triggerCollectionUpdate () {
    collection.trigger('update:collection')
  }

  function refreshCollection () {
    // get saved favorites from setting
    const folderSettings = settings.get(FOLDERS_INFOSTORE_PATH, [])
    const fileSettings = settings.get(FILES_INFOSTORE_PATH, [])

    const folderDef = $.Deferred()
    const fileDef = $.Deferred()

    folderAPI.multiple(folderSettings, { errors: true, cache: false }).then(function (responses) {
      // remove non-existent entries
      const folderList = _(responses).filter(function (item) {
        if (item.error && /^(FLD-0008|FLD-0003|ACC-0002|FLD-1004|IMAP-1002|FILE_STORAGE-0004)$/.test(item.code)) {
          return false
        }
        return true
      })

      folderDef.resolve(folderList)
    })

    filesAPI.getList(fileSettings, { cache: false, errors: true, fullModels: true }).then(function (responses) {
      const fileList = _(responses).filter(function (response) {
        return !response.error
      })
      fileDef.resolve(fileList)
    })

    return $.when(folderDef, fileDef).then(function (favoriteFolders, favoriteFiles) {
      const returnList = []
      const folders = []
      const files = []
      _.each(favoriteFolders, function (folder) {
        if (folder) {
          folderAPI.injectIndex.bind(folderAPI, folder)
          let folderModel = folderAPI.pool.getModel(folder.id)
          if (!folderAPI.is('trash', model.toJSON())) {
            // convert folder model into file model
            folderModel = new filesAPI.Model(folderModel.toJSON())
            filesAPI.pool.add('detail', folderModel.toJSON())
            returnList.push(folderModel)

            folders.push(folder.id)
          }
        }
      })

      _.each(favoriteFiles, function (file) {
        if (file) {
          const model = folderAPI.pool.getModel(file.attributes.folder_id)
          if (!folderAPI.is('trash', model.toJSON())) {
            folderAPI.injectIndex.bind(folderAPI, file)
            returnList.push(file)

            files.push({
              id: file.attributes.id,
              folder_id: file.attributes.folder_id
            })
          }
        }
      })

      storeFolders(folders)
      storeFiles(files)
      settings.save()

      collection.reset(returnList)
      collection.fetched = true
      collection.expired = false

      model.set('subscr_subflds', favoriteFolders.length > 0)
      triggerCollectionUpdate()

      return returnList
    })
  }

  /**
   * Definition for virtual folder
   */
  folderAPI.virtual.add(collectionId, function () {
    return refreshCollection()
  })

  // Folder API listener ----------------------------------------------------

  folderAPI.on('rename', function (id, data) {
    const changedModel = collection.get(_.cid(data))
    if (changedModel) {
      changedModel.set('title', data.title)
      triggerCollectionUpdate()
    }
  })

  // error:FLD-1004 is storage was removed (dropbox, googledrive folder etc)
  // error:OAUTH-0040 token no longer valid
  folderAPI.on('error:FLD-1004 remove move collection:remove', function (id, data) {
    removeFavorites([data])
  })

  // Files API listener -----------------------------------------------------

  filesAPI.on('rename description add:version remove:version change:version', function (obj) {
    let id = obj
    if (typeof obj === 'object') {
      id = (obj.folder_id !== undefined) ? _.cid(obj) : obj.id
    } else {
      obj = _.cid(obj)
    }

    filesAPI.get(obj).done(function (file) {
      const changedModel = collection.get(id)
      if (changedModel) {
        changedModel.set('com.openexchange.file.sanitizedFilename', file['com.openexchange.file.sanitizedFilename'])
        changedModel.set('title', file.filename)
        triggerCollectionUpdate()
      }
    })
  })

  filesAPI.on('remove:file favorites:remove move', function (list) {
    removeFavorites(list)
  })

  filesAPI.on('favorites:add', function (files) {
    addFavorites(files)
  })

  // Folder tree view extensions --------------------------------------------

  const extension = {
    id: 'favorites',
    index: 1,
    draw (tree) {
      this.append(
        new TreeNodeView({
          empty: true,
          folder: collectionId,
          indent: true,
          open: false,
          parent: tree,
          sortable: true,
          title: gt('Favorites'),
          tree,
          icons: tree.options.icons
        })
          .render().$el.addClass('favorite-files')
      )
    }
  }

  // Add folder tree view to drive app
  ext.point('io.ox/core/foldertree/infostore/app').extend(_.extend({}, extension))
  // Add folder tree view to popup dialog e.g. Portal 'Open Document' dialog
  ext.point('io.ox/core/foldertree/infostore/popup').extend(_.extend({}, extension))

  //
  // Folder View ------------------------------------------------------------
  //

  /**
   * Add contextmenu entry 'Add to Favorites' or 'Remove from favorites'
   *
   * @param {Element} node    to add the context menu entry
   * @param {object}  options
   */
  function addContextMenuEntry (node, options) {
    if (options.data.module !== 'infostore') return

    const link = $('<a href="#" role="menuitem">').attr('data-action', options.action).text(options.text).on('click', $.preventDefault) // always prevent default

    if (options.enabled) {
      link.on('click', options.data, options.handler)
    } else {
      link.attr('aria-disabled', true).removeAttr('tabindex').addClass('disabled')
    }

    node.append($('<li role="presentation">').append(link))
  }

  /**
   * Function for add listener
   * @param {Event} e
   */
  function addFolder (e) {
    if (addFavorite(e.data.id)) {
      folderAPI.trigger('favorite:add')
    }
  }

  /**
   * Function for remove listener
   * @param {Event} e
   */
  function removeFolder (e) {
    if (removeFavorites([e.data.id])) {
      folderAPI.trigger('favorite:remove')
    }
  }

  ext.point('io.ox/core/foldertree/contextmenu/default').extend({
    id: 'toggle-infostore-favorite',
    // place after "Add new folder"
    index: 1010,
    draw (baton) {
      const id = baton.data.id
      const module = baton.module

      // stored favorites from settings
      const favorites = settings.get(FOLDERS_INFOSTORE_PATH, [])
      const favoriteFiles = settings.get(FILES_INFOSTORE_PATH, [])

      _.each(favoriteFiles, function (file) {
        favorites.push(file.id)
      })

      // checks if given element is in the favorite setting
      const isFavorite = _.find(favorites, function (elemId) {
        if (elemId === id) {
          return true
        }
      })

      // don't offer for trash folders
      if (folderAPI.is('trash', baton.data)) return

      addContextMenuEntry(this, {
        action: 'toggle-infostore-favorite',
        data: { id, module },
        enabled: true,
        handler: isFavorite ? removeFolder : addFolder,
        text: isFavorite ? gt('Remove from favorites') : gt('Add to favorites')
      })
    }
  })
})
