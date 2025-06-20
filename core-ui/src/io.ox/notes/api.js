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

import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import http from '@/io.ox/core/http'
import { settings } from '@/io.ox/notes/settings'

function map (cid) {
  // return existing file model
  return filesAPI.pool.get('detail').get(cid)
}

const api = {

  get (obj) {
    return $.when(
      filesAPI.get(obj),
      $.ajax({ type: 'GET', url: filesAPI.getUrl(obj, 'view') + '&' + _.now(), dataType: 'text' })
    )
      .then(function (data, text) {
        return { data, content: text[0] }
      })
  },

  resolve (list, json) {
    const models = _(list).chain().map(map).compact().value()
    return json === false ? models : _(models).invoke('toJSON')
  },

  getModel (cid) {
    return filesAPI.pool.get('detail').get(cid)
  },

  addToPool (data) {
    filesAPI.pool.get('detail').add(data)
  },

  create (options) {
    options = _.extend({
      content: '',
      folder: this.getDefaultFolder(),
      title: 'New note'
    }, options)
    // yep, not yet translated
    const filename = options.title.toLowerCase() + '.txt'
    const blob = new window.Blob([options.content], { type: 'text/plain' })

    return filesAPI.upload({ addVersion: false, file: blob, filename, folder: options.folder, title: options.title })
      .done(function (data) {
        filesAPI.pool.get('detail').add(data)
      })
  },

  update (file, changes) {
    if (_.isString(file)) file = _.cid(file)
    return filesAPI.update(file, changes)
  },

  updateContent (file, content) {
    const blob = new window.Blob([content], { type: 'text/plain' })
    return filesAPI.versions.upload({ id: file.id, folder: file.folder_id, file: blob, filename: file.filename, preview: file.preview })
  },

  createDefaultFolders () {
    const defaultInfoStoreFolder = folderAPI.getDefaultFolder('infostore')
    let rootFolder
    let defaultFolder
    // use separated deferred object to return progress
    const def = $.Deferred().notify(0.20, 'Creating root folder')

    folderAPI.create(defaultInfoStoreFolder, { title: 'Notes' })
      .done(function (data) {
        rootFolder = data.id
        settings.set('folder/root', rootFolder).save()
      })
      .then(function () {
        def.notify(0.40, 'Creating default folder')
        // add default folder
        return folderAPI.create(rootFolder, { title: 'General' }).done(function (data) {
          defaultFolder = data.id
          settings.set('folder/default', defaultFolder).save()
        })
      })
      .then(function () {
        def.notify(0.60, 'Creating topics')
        http.pause();
        // yep, not yet translated
        ['Ideas', 'Meetings', 'Shopping', 'Todo lists', 'Work'].forEach(function (title) {
          folderAPI.create(rootFolder, { title })
        })
        return http.resume()
      })
      .then(function () {
        def.notify(0.80, 'Creating welcome note')
        return api.createWelcomeNote()
      })
      .then(function () {
        def.notify(1.00)
        // short delay to have a visual break
        return _.wait(300)
      })
      .then(function () {
        return defaultFolder
      })
      .then(def.resolve, def.reject)

    return def
  },

  createWelcomeNote () {
    return this.create({
      content: 'With **OX Notes** you can create simple todo or shopping lists, ' +
                    'easily take meetings minutes, or quickly write down your ideas.\n\n' +
                    '- [x] Make a list\n- [x] Have a break\n- [x] Mark the first two items as done\n- [x] Be proud to have finished three items yet\n- [ ] So much done. Have a beer!\n\n' +
                    'You can create numbered lists: \n# First item\n# Second item\n\n' +
                    '_You can highlight important parts_ and you can ~cross out parts~.\n\n' +
                    'Links are automatically detected, of course: http://www.open-xchange.com\n\n' +
                    'And, finally, you can integrate **images**:\n\n' +
                    '![](api/files?action=document&folder=13894&id=13894/63583&delivery=view&scaleType=contain&width=1024)',
      title: 'Welcome to OX Notes'
    })
  },

  getRootFolder () {
    return settings.get('folder/root')
  },

  getDefaultFolder () {
    return settings.get('folder/default')
  }
}

export default api
