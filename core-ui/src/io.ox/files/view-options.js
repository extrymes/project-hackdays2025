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

import ext from '@/io.ox/core/extensions'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import BreadcrumbView from '@/io.ox/core/folder/breadcrumb'
import FolderAPI from '@/io.ox/core/folder/api'
import FileStorage from '@/io.ox/core/api/filestorage'
import * as FolderUtil from '@/io.ox/core/folder/util'
import { createIcon, createButton } from '@/io.ox/core/components'

import gt from 'gettext'

//
// Mark as secondary toolbar
//

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/top').extend({
  id: 'secondary',
  index: 100,
  draw () {
    this.addClass('secondary-toolbar')
  }
})

//
// View dropdown
//

ext.point('io.ox/files/view-options').extend({
  id: 'sort',
  index: 100,
  draw () {
    this.data('view')
      .option('sort', 702, gt('Name'), { radio: true })
      .option('sort', 5, gt('Date'), { radio: true })
      .option('sort', 704, gt('Size'), { radio: true })
  }
})

ext.point('io.ox/files/view-options').extend({
  id: 'order',
  index: 200,
  draw () {
    this.data('view')
      .divider()
      .option('order', 'asc', gt('Ascending'), { radio: true })
      .option('order', 'desc', gt('Descending'), { radio: true })
  }
})

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/top').extend({
  id: 'dropdown-container',
  index: 900,
  draw (baton) {
    const dropdownContainer = $('<div class="dropdown-container">')
    if (_.device('smartphone')) dropdownContainer.addClass('pull-right')
    ext.point('io.ox/files/listviewcontrol/list-view/toolbar/dropdowns').invoke('draw', dropdownContainer, baton)
    this.append(dropdownContainer)
  }
})

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/dropdowns').extend({
  id: 'dropdown',
  index: 100,
  draw (baton) {
    const dropdown = new Dropdown({
      // #. Sort options drop-down
      label: gt.pgettext('dropdown', 'Sort by'),
      model: baton.app.props,
      caret: true
    })

    ext.point('io.ox/files/view-options').invoke('draw', dropdown.$el, baton)
    this.append(dropdown.render().$el.addClass('grid-options toolbar-item').on('dblclick', function (e) {
      e.stopPropagation()
    }))
  }
})

//
// Select dropdown
//

function changeSelection (e) {
  e.preventDefault()

  const list = e.data.list
  const type = $(this).attr('data-name')

  // need to defer that otherwise the list cannot keep the focus
  _.defer(function () {
    if (type === 'all') {
      list.selection.selectAll()
    } else if (type === 'files') {
      list.selection.selectNone()
      list.selection.selectAll(':not(.file-type-folder)')
    } else if (type === 'none') {
      list.selection.selectNone()
    }
  })
}

ext.point('io.ox/files/select/options').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    this.data('view')
      .header(gt('Select'))
      .link('all', gt('All'))
      .link('files', gt('All files'))
      .link('none', gt('None'))

    this.data('view')
      .divider()
    // #. Verb: (to) filter documents by file type
      .header(gt.pgettext('verb', 'Filter'))
      .option('filter', 'pdf', gt('PDFs'), { radio: true })
      .option('filter', 'text', gt('Text documents'), { radio: true })
      .option('filter', 'sheet', gt('Spreadsheets'), { radio: true })
      .option('filter', 'presentation', gt('Presentations'), { radio: true })
      .option('filter', 'image', gt('Images'), { radio: true })
      .option('filter', 'audio', gt('Music'), { radio: true })
      .option('filter', 'video', gt('Videos'), { radio: true })
      .option('filter', 'all', gt('All'), { radio: true })

    this.data('view').$ul.on('click', 'a', { list: baton.app.listView }, changeSelection)

    const self = this
    /**
     * Show Filter only if a infostore folder is selected.
     */
    function toggleFilter () {
      baton.app.folder.getData().done(async function (folder) {
        await FileStorage.rampup()
        if (baton.app.props.get('searching') || FileStorage.isExternal(folder) || FolderUtil.is('attachmentView', folder)) {
          self.data('view').$ul.children().slice(4).hide()
        } else {
          self.data('view').$ul.children().slice(4).show()
        }
      })
    }

    this.data('view').$el.one('click', function () {
      toggleFilter()
    })

    baton.app.on('folder:change', function () {
      toggleFilter()
    })

    baton.app.props.on('change:searching', toggleFilter)
  }
})

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/dropdowns').extend({
  id: 'select',
  index: 200,
  draw (baton) {
    if (_.device('smartphone')) return

    const dropdown = new Dropdown({
      // #. Sort options drop-down
      label: gt.pgettext('dropdown', 'Select'),
      model: baton.app.props,
      caret: true,
      dataAction: 'select'
    })

    ext.point('io.ox/files/select/options').invoke('draw', dropdown.$el, baton)

    this.append(
      dropdown.render().$el.addClass('grid-options toolbar-item pull-right')
    )
  }
})

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/top').extend({
  id: 'move-up',
  index: 2100,
  draw (baton) {
    if (_.device('!smartphone')) return

    this.append(
      $('<div class="grid-options toolbar-item pull-left">').append(
        $('<a href="#" role="button">').append(
          createIcon('bi/arrow-up-square.svg').addClass('folder-up')
        ).attr({
          title: gt('Switch to parent folder')
        }).on('click', function (e) {
          e.preventDefault()

          const app = baton.app
          const folder = app.folder

          folder.getData().done(function (data) {
            // 51093: 9 is root for Drive / 1 is root for external storages
            if (data.folder_id === '9' || data.folder_id === '1') {
              app.pages.goBack()
            } else {
              folder.set(data.folder_id)
            }
          })
        })
      )
    )
  }
})

//
// Breadcrumb
//

ext.point('io.ox/files/listviewcontrol/list-view/toolbar/top').extend({
  id: 'breadcrumb',
  index: 300,
  draw (baton) {
    if (_.device('smartphone')) return
    const $el = $('<div class="breadcrumb-view flex-grow">')
    const results = $('<div class="toolbar-item text-bold flex-grow">').text(gt('Search results')).hide()
    this.append($el, results)
    FolderAPI.get('9').then((drivePath) => {
      const view = new BreadcrumbView({ el: $el[0], app: baton.app, rootAlwaysVisible: true, linkReadOnly: true, defaultRootPath: drivePath, backToSearchButton: true })
      view.render().$el.addClass('toolbar-item')
      baton.app.props.on('change:searching', function (model, value) {
        view.$el.toggle(!value)
        results.toggle(value)
      })
    })
  }
})

//
// Folder view toggle
//

ext.point('io.ox/files/sidepanel').extend({
  id: 'toggle-folderview',
  index: 1000,
  draw (baton) {
    const guid = _.uniqueId('control')
    this.addClass('bottom-toolbar').append(
      $('<div class="generic-toolbar bottom visual-focus" role="region">').attr('aria-labelledby', guid).append(
        createButton({ variant: 'toolbar', icon: { name: 'bi/layout-sidebar.svg', title: gt('Close folder view') } })
          .addClass('btn-translucent-white')
          .attr({ id: guid, 'data-action': 'close-folder-view' })
          .on('click', () => baton.app.folderView.toggle(false))
      )
    )
  }
})
