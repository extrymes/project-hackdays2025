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

import ext from '@/io.ox/core/extensions'
import mobile from '@/io.ox/backbone/views/actions/mobile'
import * as util from '@/io.ox/calendar/util'
import _ from '@/underscore'
import '@/io.ox/calendar/actions'

import gt from 'gettext'

const meta = {
  create: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Create appointment'),
    icon: 'bi/plus-lg.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/detail/actions/create'
  },
  listView: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('List view'),
    icon: 'bi/list.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/actions/switch-to-list-view'
  },
  calendarView: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Calendar view'),
    icon: 'bi/table.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/actions/switch-to-month-view'
  },
  next: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Show next month'),
    icon: 'bi/chevron-right.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/actions/showNext'
  },
  prev: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Show previous month'),
    icon: 'bi/chevron-left.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/actions/showPrevious'
  },
  today: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Today'),
    drawDisabled: true,
    ref: 'io.ox/calendar/actions/showToday'
  },
  move: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Move'),
    icon: 'bi/folder-symlink.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/detail/actions/move'
  },
  delete: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Delete'),
    icon: 'bi/trash.svg',
    drawDisabled: true,
    ref: 'io.ox/calendar/detail/actions/delete'
  },
  export: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Export'),
    drawDisabled: true,
    ref: 'io.ox/calendar/detail/actions/export'
  }
}

const points = {
  monthView: 'io.ox/calendar/mobile/toolbar/month',
  weekView: 'io.ox/calendar/mobile/toolbar/week',
  listView: 'io.ox/calendar/mobile/toolbar/list',
  listViewMulti: 'io.ox/calendar/mobile/toolbar/list/multiselect',
  detailView: 'io.ox/calendar/mobile/toolbar/detailView'
}

// clone all available links from inline links (larger set)
ext.point(points.detailView + '/links').extend(
  ext.point('io.ox/calendar/links/inline').list().map(function (item) {
    item = _(item).pick('id', 'index', 'prio', 'mobile', 'icon', 'title', 'ref', 'section', 'sectionTitle')
    return item
  })
)

mobile.addAction(points.monthView, meta, ['create', 'listView', 'prev', 'today', 'next'])
mobile.addAction(points.weekView, meta, ['create', 'listView', 'prev', 'today', 'next'])
mobile.addAction(points.listView, meta, ['calendarView'])
mobile.addAction(points.listViewMulti, meta, ['move', 'delete'])
mobile.createToolbarExtensions(points)

const updateToolbar = _.debounce(function (list) {
  if (!list) return
  // extract single object if length === 1
  list = list.length === 1 ? list[0] : list
  // draw toolbar
  const baton = ext.Baton({ data: list, app: this })

  const current = this.pages.getCurrentPage()
  current.navbar.setBaton(baton)

  this.pages.getToolbar('month').setBaton(baton)
  this.pages.getToolbar('week:day').setBaton(baton)
  this.pages.getToolbar('list').setBaton(baton)
  this.pages.getSecondaryToolbar('list').setBaton(baton)
}, 10)

function prepareUpdateToolbar (app) {
  let list = app.pages.getCurrentPage().name === 'list' ? app.listView.selection.get() : []
  list = _(list).map(function (item) {
    if (_.isString(item)) item = _.extend(util.cid(item), { flags: app.listView.selection.getNode(item).attr('data-flags') || '' })
    return item
  })
  app.updateToolbar(list)
}

// some mediator extensions
// register update function and introduce toolbar updating
ext.point('io.ox/calendar/mediator').extend({
  id: 'toolbar-mobile',
  index: 10100,
  setup (app) {
    if (_.device('!smartphone')) return
    app.updateToolbar = updateToolbar
  }
})

ext.point('io.ox/calendar/mediator').extend({
  id: 'update-toolbar-mobile',
  index: 10300,
  setup (app) {
    if (_.device('!smartphone')) return
    app.updateToolbar([])
    // update toolbar on selection change
    app.listView.on('selection:change', function () {
      prepareUpdateToolbar(app)
    })
    // folder change
    app.on('folder:change', function () {
      prepareUpdateToolbar(app)
    })
    app.getWindow().on('change:perspective change:initialPerspective', function () {
      _.defer(prepareUpdateToolbar, app)
    })
  }
})

ext.point('io.ox/calendar/mediator').extend({
  id: 'change-mode-toolbar-mobile',
  index: 10400,
  setup (app) {
    if (!_.device('smartphone')) return
    // if multiselect is triggered, show secondary toolbar with other options based on selection
    app.props.on('change:checkboxes', function (model, state) {
      app.pages.toggleSecondaryToolbar('list', state)
    })
  }
})
