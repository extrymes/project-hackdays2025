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
import mobile from '@/io.ox/backbone/views/actions/mobile'
import api from '@/io.ox/contacts/api'

import gt from 'gettext'

// define links for each page

const meta = {
  create: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('New contact'),
    icon: 'bi/plus-lg.svg',
    drawDisabled: true,
    ref: 'io.ox/contacts/actions/create'
  },
  send: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Send email'),
    icon: 'bi/envelope.svg',
    ref: 'io.ox/contacts/actions/send',
    drawDisabled: true
  },
  export: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Export'),
    ref: 'io.ox/contacts/actions/export',
    drawDisabled: true
  },
  vcard: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Send as vCard'),
    ref: 'io.ox/contacts/actions/vcard',
    drawDisabled: true
  },
  invite: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Invite to appointment'),
    icon: 'bi/calendar.svg',
    ref: 'io.ox/contacts/actions/invite',
    drawDisabled: true
  },
  edit: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Edit'),
    icon: 'bi/pencil.svg',
    ref: 'io.ox/contacts/actions/update',
    drawDisabled: true

  },
  delete: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('Delete'),
    icon: 'bi/trash.svg',
    drawDisabled: true,
    ref: 'io.ox/contacts/actions/delete'
  },
  move: {
    mobile: 'lo',
    title: gt('Move'),
    drawDisabled: true,
    ref: 'io.ox/contacts/actions/move'
  },
  copy: {
    mobile: 'lo',
    title: gt('Copy'),
    drawDisabled: true,
    ref: 'io.ox/contacts/actions/copy'
  }
}

const points = {
  listView: 'io.ox/contacts/mobile/toolbar/listView',
  detailView: 'io.ox/contacts/mobile/toolbar/detailView'
}

mobile.addAction(points.listView, meta, ['create'])
mobile.addAction(points.detailView, meta, ['edit', 'send', 'invite', 'vcard', 'delete', 'move', 'copy'])
mobile.createToolbarExtensions(points)

const updateToolbar = _.debounce(function (contact) {
  const self = this
  // get full data, needed for require checks for example
  api.get(contact).done(function (data) {
    if (!data) return
    const baton = ext.Baton({ data, app: self })
    // handle updated baton to pageController
    self.pages.getToolbar('detailView').setBaton(baton)
  })
}, 50)

// some mediator extensions
// register update function and introduce toolbar updating
ext.point('io.ox/contacts/mediator').extend({
  id: 'toolbar-mobile',
  index: 10100,
  setup (app) {
    if (_.device('!smartphone')) return
    app.updateToolbar = updateToolbar
  }
})

ext.point('io.ox/contacts/mediator').extend({
  id: 'update-toolbar-mobile',
  index: 10300,
  setup (app) {
    if (!_.device('smartphone')) return

    // folder change
    app.grid.on('change:ids', function () {
      app.folder.getData().done(function (data) {
        const baton = ext.Baton({ data, app })
        // handle updated baton to pageController
        app.pages.getToolbar('listView').setBaton(baton)
      })
    })

    // single select
    app.grid.selection.on('select pagechange:detailView', function () {
      // don't override secondary toolbar
      if (app.props.get('checkboxes') === true) return

      const data = app.grid.selection.get()
      app.updateToolbar(data[0])
    })

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
    // multiselect
    app.grid.selection.on('change', function (e, list) { updateSecondaryToolbar(list) })
    app.props.on('change:checkboxes', function () { updateSecondaryToolbar(app.grid.selection.get()) })
  }
})

ext.point('io.ox/contacts/mediator').extend({
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
