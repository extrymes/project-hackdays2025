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

import TreeNodeView from '@/io.ox/core/folder/node'
import folderAPI from '@/io.ox/core/folder/api'
import ext from '@/io.ox/core/extensions'
import upsell from '@/io.ox/core/upsell'
import gt from 'gettext'
import $ from '@/jquery'

if (upsell.has('infostore')) {
  const folders = [
    // we might get a few more over time
    { id: 'virtual/files/recent', index: 2, title: gt('Recent files'), className: 'recent mb-16' }
    // { id: 'virtual/files/shares', index: 3, title: gt('My shares'), className: 'shares' }
  ]

  folders.forEach(folder => {
    const collectionId = folder.id
    const model = folderAPI.pool.getModel(collectionId)
    folderAPI.pool.getCollection(collectionId)

    // Add infos for the filesview
    model.set({
      title: folder.title,
      folder_id: '9',
      own_rights: 1,
      standard_folder: true
    })

    // this folder has no child folders
    folderAPI.virtual.add(collectionId, function () {
      return $.when([])
    })

    const extension = {
      id: folder.id,
      index: folder.index,
      draw (tree) {
        this.append(
          new TreeNodeView({
            empty: true,
            folder: collectionId,
            indent: true,
            open: false,
            parent: tree,
            sortable: true,
            title: folder.title,
            tree,
            icons: tree.options.icons
          })
            .render().$el.addClass(folder.className)
        )
      }
    }

    ext.point('io.ox/core/foldertree/infostore/app').extend(_.extend({}, extension))
    ext.point('io.ox/core/foldertree/infostore/popup').extend(_.extend({}, extension))
  })

  folderAPI.virtual.add('virtual/files/shares', function () {
    return $.when([])
  })
}
