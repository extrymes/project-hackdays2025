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

import ext from '@/io.ox/core/extensions'
import '@/io.ox/backbone/views/toolbar'
import mobile from '@/io.ox/backbone/views/actions/mobile'
import api from '@/io.ox/tasks/api'

import '@/io.ox/tasks/actions'

import gt from 'gettext'

const meta = {
  create: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('New task'),
    icon: 'bi/plus-lg.svg',
    drawDisabled: true,
    ref: 'io.ox/tasks/actions/create'
  },
  edit: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/pencil.svg',
    title: gt('Edit'),
    ref: 'io.ox/tasks/actions/edit',
    drawDisabled: true
  },
  delete: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/tasks/actions/delete',
    drawDisabled: true
  },
  done: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/check.svg',
    title: gt('Mark as done'),
    ref: 'io.ox/tasks/actions/done',
    drawDisabled: true
  },
  undone: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Mark as undone'),
    ref: 'io.ox/tasks/actions/undone'
  },
  confirm: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Change confirmation'),
    ref: 'io.ox/tasks/actions/confirm'
  },
  move: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Move'),
    ref: 'io.ox/tasks/actions/move'
  },
  export: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Export'),
    ref: 'io.ox/tasks/actions/export'
  }
}

const points = {
  listView: 'io.ox/tasks/mobile/toolbar/listView',
  detailView: 'io.ox/tasks/mobile/toolbar/detailView'
}

mobile.addAction(points.listView, meta, ['create'])
mobile.addAction(points.detailView, meta, ['edit', 'done', 'delete', 'undone', 'confirm', 'move', 'export'])
mobile.createToolbarExtensions(points)

const updateToolbar = _.debounce(function (task) {
  const self = this
  // get full data, needed for require checks for example
  api.get(task).done(function (data) {
    if (!data) return
    const baton = ext.Baton({ data, app: self })
    // handle updated baton to pageController
    self.pages.getToolbar('detailView').setBaton(baton)
  })
}, 50)

// some mediator extensions
// register update function and introduce toolbar updating
ext.point('io.ox/tasks/mediator').extend({
  id: 'toolbar-mobile',
  index: 10100,
  setup (app) {
    if (_.device('!smartphone')) return
    app.updateToolbar = updateToolbar
  }
})

ext.point('io.ox/tasks/mediator').extend({
  id: 'update-toolbar-mobile',
  index: 10300,
  setup (app) {
    if (!_.device('smartphone')) return

    api.on('update', function (e, data) {
      app.updateToolbar(data)
    })

    // folder change
    app.grid.on('change:ids', function () {
      app.folder.getData().done(function (data) {
        const baton = ext.Baton({ data, app })
        // handle updated baton to pageController
        app.pages.getToolbar('listView').setBaton(baton)
      })
    })

    function updateNavbar (list) {
      const baton = ext.Baton({ data: list, app })
      const current = app.pages.getCurrentPage()
      current.navbar.setBaton(baton)
    }

    // multiselect
    function updateSecondaryToolbar (list) {
      if (app.props.get('checkboxes') !== true) return
      if (list.length === 0) {
        // reset to remove old baton
        app.pages.getSecondaryToolbar('listView')
          .setBaton(ext.Baton({ data: [], app }))
        return
      }
      api.getList(list).done(function (data) {
        if (!data) return
        const baton = ext.Baton({ data, app })
        // handle updated baton to pageController
        app.pages.getSecondaryToolbar('listView').setBaton(baton)
      })
    }

    // simple select
    app.grid.selection.on('pagechange:detailView', function () {
      // update toolbar on each pagechange
      const data = app.grid.selection.get()
      app.updateToolbar(data[0])
    })

    app.grid.selection.on('change', function (e, list) {
      updateNavbar(list)
      updateSecondaryToolbar(list)
    })
    app.props.on('change:checkboxes', function () { updateSecondaryToolbar(app.grid.selection.get()) })
  }
})

ext.point('io.ox/tasks/mediator').extend({
  id: 'change-mode-toolbar-mobile',
  index: 10400,
  setup (app) {
    if (!_.device('smartphone')) return
    // if multiselect is triggered, show secondary toolbar with other options based on selection
    app.props.on('change:checkboxes', function (model, state) {
      app.pages.toggleSecondaryToolbar('listView', state)
    })
  }
})
