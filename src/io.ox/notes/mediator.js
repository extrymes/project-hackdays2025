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
import moment from '@open-xchange/moment'

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/files/api'
import TreeNodeView from '@/io.ox/core/folder/node'
import TreeView from '@/io.ox/core/folder/tree'
import FolderView from '@/io.ox/core/folder/view'
import ListView from '@/io.ox/core/tk/list'
import CollectionLoader from '@/io.ox/core/api/collection-loader'
import DetailView from '@/io.ox/notes/detail-view'

import '@/io.ox/notes/toolbar'

import gt from 'gettext'

export default function (app) {
  app.mediator({

    window (app) {
      app.getWindow().nodes.main.append(
        app.left = $('<div class="leftside border-right">'),
        app.right = $('<div class="rightside">')
      )
    },

    'folder-structure' () {
      ext.point('io.ox/core/foldertree/notes/app').extend({
        id: 'topics',
        index: 100,
        draw (tree) {
          this.append(
            new TreeNodeView({
              filter () { return true },
              folder: tree.options.root,
              headless: true,
              open: true,
              icons: true,
              iconClass: 'sticky-note',
              tree,
              parent: tree
            })
              .render().$el
          )
        }
      })
    },

    'folder-view' (app) {
      // tree view
      const root = app.settings.get('folder/root')
      app.treeView = new TreeView({ app, icons: true, module: 'notes', contextmenu: true, root })
      FolderView.initialize({ app, tree: app.treeView })
      app.folderView.resize.enable()
    },

    sidepanel (app) {
      ext.point('io.ox/notes/sidepanel').extend({
        id: 'tree',
        index: 100,
        draw (baton) {
          // add border & render tree and add to DOM
          this.addClass('border-right').append(
            $('<div class="section-header">').text(gt('Topics')),
            baton.app.treeView.$el
          )
        }
      })

      const node = app.getWindow().nodes.sidepanel
      ext.point('io.ox/notes/sidepanel').invoke('draw', node, ext.Baton({ app }))
    },

    'list-view' (app) {
      const NotesListView = ListView.extend({
        ref: 'io.ox/notes/listview'
      })

      ext.point('io.ox/notes/listview/item').extend(
        {
          id: 'last_modified',
          index: 100,
          draw (baton) {
            const lastModified = moment(baton.data.lastModified)
            const isToday = lastModified.isSame(moment(), 'day')
            const str = lastModified.format(isToday ? 'LT' : 'l')

            this.append(
              $('<span class="last_modified gray">').text(str)
            )
          }
        },
        {
          id: 'title',
          index: 200,
          draw (baton) {
            const title = String(baton.data.title).replace(/\.txt$/, '')
            this.append(
              $('<div class="title drag-title">').text(title)
            )
          }
        },
        {
          id: 'note_preview',
          index: 300,
          draw (baton) {
            const notePreview = baton.data.meta.note_preview || gt('Preview not available')
            this.append(
              $('<div class="preview gray">').text(notePreview)
            )
          }
        }
      )

      app.listView = new NotesListView({ app, draggable: false, ignoreFocus: true })
      app.listView.model.set({ folder: app.folder.get() })
      app.listView.toggleCheckboxes(false)
      window.list = app.listView

      app.left.append(app.listView.$el)
    },

    'auto-select' (app) {
      app.listView.on('first-content', function () {
        app.listView.selection.select(0)
      })
    },

    'connect-loader' (app) {
      const collectionLoader = new CollectionLoader({
        module: 'files',
        getQueryParams (params) {
          return {
            action: 'all',
            folder: params.folder,
            columns: '1,2,3,5,20,23,108,700,702,703,704,705,707',
            sort: params.sort || '5',
            order: params.order || 'desc',
            timezone: 'utc'
          }
        },
        PRIMARY_PAGE_SIZE: 100,
        SECONDARY_PAGE_SIZE: 200
      })

      collectionLoader.each = function (data) {
        api.pool.add('detail', data)
      }

      app.listView.connect(collectionLoader)
    },

    'folder:change' (app) {
      app.on('folder:change', function (id) {
        // marker so the change:sort listener does not change other attributes (which would be wrong in that case)
        app.changingFolders = true
        app.listView.model.set('folder', id)
        app.folder.getData()
        app.changingFolders = false
      })
    },

    selection (app) {
      let currentCid = null

      app.showDetailView = function (cid) {
        if (currentCid === cid) return
        this.right.empty().append(new DetailView({ cid }).$el)
        currentCid = cid
      }

      app.showEmptyDetailView = function () {
        this.right.empty()
        currentCid = null
      }

      const react = _.debounce(function (type, list) {
        if (type === 'one' || type === 'action') {
          app.showDetailView(list[0])
        } else {
          app.showEmptyDetailView()
        }
      }, 10)

      app.listView.on({
        'selection:empty' () {
          react('empty')
        },
        'selection:one' (list) {
          react('one', list)
        },
        'selection:multiple' (list) {
          react('multiple', list)
        },
        'selection:action' (list) {
          if (list.length === 1) react('action', list)
        }
      })
    },

    refresh (app) {
      ox.on('refresh^', function () {
        _.defer(function () { app.listView.reload() })
      })
    }
  })

  app.mediate()
};
