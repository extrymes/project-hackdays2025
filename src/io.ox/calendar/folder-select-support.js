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

import folderAPI from '@/io.ox/core/folder/api'
import http from '@/io.ox/core/http'
import capabilities from '@/io.ox/core/capabilities'
import _ from '@/underscore'
import $ from '@/jquery'
import ox from '@/ox'
import { settings } from '@/io.ox/calendar/settings'

// list of error codes where a folder should be removed from the selection
const removeList = [
  'FLD-1004', // folder storage service no longer available
  'FLD-0008', // folder not found
  'FLD-0003', // permission denied
  'CAL-4060', // folder is not supported
  'CAL-4030' // permission denied
]

function setFolders (list, opt) {
  const self = this
  opt = opt || {}
  this.folders = _(list).unique()
  sort.call(this)
  _.defer(function () {
    if (opt.silent !== true) self.app.trigger('folders:change', self.folders)
    settings.set('selectedFolders', self.folders).save()
  })
}

function sort () {
  const base = _(folderAPI.pool.models).keys().length
  const failed = []
  const sorted = _(this.folders).sortBy(function (folderId) {
    const folder = folderAPI.pool.models[folderId]
    if (!folder) return failed.push(folderId)
    if (folderAPI.is('private', folder.attributes)) return folder.get('index/flat/event/private')
    if (folderAPI.is('public', folder.attributes)) return folder.get('index/flat/event/public') + base
    if (folderAPI.is('shared', folder.attributes)) return folder.get('index/flat/event/shared') + base * base
  })
  if (failed.length === 0) this.folders = sorted
  // Keep this for debugging purposes
  // else console.error('Sort was impossible due to missing folders in cache. ', failed);
}

function FolderSelection (app) {
  _.extend(this, {
    folders: [],
    prevFolders: undefined,
    singleSelection: false,
    app,
    ready: new Promise(resolve => app.once('folders:change', resolve))
  })

  const self = this
  let initialList = settings.get('selectedFolders')
  if (!initialList) {
    // this is the case for new users or when upgrading to the new calendar. all private appointments and allPublic should be checked
    folderAPI.flat({ module: 'calendar', all: true }).then(function (data) {
      initialList = _(data.private).pluck('id')
      if (!capabilities.has('guest') && capabilities.has('edit_public_folders')) initialList.push('cal://0/allPublic')
      if (app.folder.get() !== folderAPI.getDefaultFolder('calendar')) initialList.push(app.folder.get())
      // fallback if no object has been added. Maybe the case for guests
      if (initialList.length === 0) initialList = _(data.shared).pluck('id')
      setFolders.call(self, initialList)
      // make sure that all check mark symbols are rendered
      _(self.folders).each(self.repaintNode.bind(self))
    })
  } else if (initialList.length === 0) {
    // fallback, when the user deselected all his calendars
    initialList = [folderAPI.getDefaultFolder('calendar')]
    setFolders.call(this, initialList)
  } else {
    setFolders.call(this, initialList)
  }

  settings.on('change:selectedFolders', function (list) {
    if (_.isEqual(self.folders, list)) return
    setFolders.call(self, list)
  })

  // react to folder subscription change
  folderAPI.on('change:subscription', function (id, changes) {
    if (changes.subscribed === false) {
      self.remove(id)
    }
  })
}

FolderSelection.prototype.isSingleSelection = function () {
  return this.singleSelection
}

FolderSelection.prototype.getData = function () {
  const self = this

  http.pause()
  const response = $.when.apply($, this.folders.map(function (folder) {
    // allow some virtual folders
    if (/^(cal:\/\/0\/allPublic)$/.test(folder)) return { id: folder }
    return folderAPI.get(folder).then(function success (folder) {
      if (!folder.subscribed) return
      return folder
    }, function fail (err) {
      if (!_(removeList).contains(err.code)) return
      self.remove(folder)
    })
  }))
  http.resume()

  return response.then(function () {
    const folders = _(arguments).chain().toArray().compact().value()
    return folderAPI.renameDefaultCalendarFolders(folders)
  })
}

FolderSelection.prototype.isSelected = function (id) {
  const list = this.prevFolders ? this.prevFolders : this.folders
  if (_.isObject(id)) id = id.id
  return list.indexOf(id) >= 0
}

FolderSelection.prototype.list = function () {
  return this.folders
}

FolderSelection.prototype.add = function (folder, opt) {
  if (this.singleSelection) this.reset()
  const list = [].concat(this.folders)
  list.push(folder)
  this.repaintNode(folder)
  setFolders.call(this, list, opt)
}

FolderSelection.prototype.remove = function (folder, opt) {
  if (this.singleSelection) this.reset()
  const list = _(this.folders).filter(function (f) {
    return String(f) !== String(folder)
  })
  this.repaintNode(folder)
  setFolders.call(this, list, opt)
}

FolderSelection.prototype.setOnly = function (folder) {
  this.singleSelection = true
  if (!this.prevFolders) this.prevFolders = this.folders
  this.folders = [].concat([folder])
  this.app.folderView.tree.$el.addClass('single-selection')
  _.defer(this.app.trigger.bind(this.app, 'folders:change', this.folders))
}

FolderSelection.prototype.selectGroupOnly = function (folders) {
  if (!this.prevFolders) this.prevFolders = this.folders
  this.folders = folders
  this.app.folderView.tree.$el.addClass('single-selection')
  this.singleSelection = true

  _.defer(this.app.trigger.bind(this.app, 'folders:change', this.folders))
}

FolderSelection.prototype.reset = function () {
  this.singleSelection = false
  if (!this.prevFolders) return
  this.folders = this.prevFolders
  this.prevFolders = undefined
  this.app.folderView.tree.$el.removeClass('single-selection')
  _.defer(this.app.trigger.bind(this.app, 'folders:change', this.folders))
}

FolderSelection.prototype.repaintNode = function (id) {
  if (!this.app || !this.app.treeView) {
    if (ox.debug) console.log('Cannot repaint node: ' + id)
    return
  }
  const nodes = this.app.treeView.$(`[data-id="${CSS.escape(id)}"]`)
  nodes.each(function () {
    const node = $(this).data('view')
    if (!node) return
    _.delay(node.repaint.bind(node), 20)
  })
}

export default function (app) {
  app.folders = new FolderSelection(app)
};
