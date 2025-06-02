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
import $ from '@/jquery'
import ext from '@/io.ox/core/extensions'
import { subscribe, subscribeShared } from '@/io.ox/contacts/extensions'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import api from '@/io.ox/contacts/api'
import { settings } from '@/io.ox/contacts/settings'
import '@/io.ox/contacts/actions'
import '@/io.ox/contacts/style.scss'
import gt from 'gettext'
import { createButton } from '../core/components'

if (!_.device('smartphone')) {
  // define links for classic toolbar
  const point = ext.point('io.ox/contacts/toolbar/links')

  const meta = {
    //
    // --- HI ----
    //
    edit: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Edit'),
      icon: 'bi/pencil.svg',
      drawDisabled: true,
      ref: 'io.ox/contacts/actions/update'
    },
    send: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Send email'),
      icon: 'bi/envelope.svg',
      ref: 'io.ox/contacts/actions/send'
    },
    invite: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Invite to appointment'),
      icon: 'bi/calendar-plus.svg',
      ref: 'io.ox/contacts/actions/invite'
    },
    delete: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Delete'),
      tooltip: gt('Delete contact'),
      icon: 'bi/trash.svg',
      drawDisabled: true,
      ref: 'io.ox/contacts/actions/delete'
    },
    //
    // --- LO ----
    //
    vcard: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Send as vCard'),
      drawDisabled: true,
      ref: 'io.ox/contacts/actions/vcard'
    },
    move: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Move'),
      ref: 'io.ox/contacts/actions/move',
      drawDisabled: true,
      section: 'file-op'
    },
    copy: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Copy'),
      ref: 'io.ox/contacts/actions/copy',
      drawDisabled: true,
      section: 'file-op'
    },
    print: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Print'),
      drawDisabled: true,
      ref: 'io.ox/contacts/actions/print',
      section: 'export'
    },
    export: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Export'),
      drawDisabled: true,
      ref: 'io.ox/contacts/actions/export',
      section: 'export'
    },
    'add-to-portal': {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Add to portal'),
      ref: 'io.ox/contacts/actions/add-to-portal',
      section: 'export'
    }
  }

  // transform into extensions

  let index = 0

  _(meta).each(function (extension, id) {
    extension.id = id
    extension.index = (index += 100)
    point.extend(extension)
  })

  ext.point('io.ox/contacts/mediator').extend({
    id: 'toolbar',
    index: 10000,
    setup (app) {
      // yep strict false (otherwise toolbar does not redraw when changing between empty folders => contacts are created in the wrong folder)
      const toolbarView = new ToolbarView({ point: 'io.ox/contacts/toolbar/links', title: app.getTitle(), strict: false })
      const limit = settings.get('toolbar/limits/fetch', 100)

      app.getWindow().nodes.body.find('.rightside').addClass('classic-toolbar-visible').prepend(
        toolbarView.$el
      )

      // list is array of object (with id and folder_id)
      app.updateToolbar = function (list) {
        const options = { data: [], folder_id: this.folder.get(), app: this }
        toolbarView.setSelection(list, function () {
          if (!list.length) return options
          return (list.length <= limit ? api.getList(list) : $.when(list)).then(function (data) {
            options.data = data
            return options
          })
        })
      }
    }
  })

  ext.point('io.ox/contacts/mediator').extend({
    id: 'update-toolbar',
    index: 10200,
    setup (app) {
      app.updateToolbar([])
      // update toolbar on selection change as well as any model change (seen/unseen flag)
      app.getGrid().selection.on('change', function (e, list) {
        app.updateToolbar(list)
      })
      api.on('update', function () {
        app.updateToolbar(app.getGrid().selection.get())
      })
    }
  })

  ext.point('io.ox/contacts/vgrid/toolbar').extend({
    id: 'dropdown',
    index: 200,
    draw (baton) {
      const dropdown = new Dropdown({
        tagName: 'li',
        className: 'dropdown grid-options toolbar-item margin-left-auto',
        attributes: { role: 'presentation' },
        $toggle: createButton({ href: '#', variant: 'none', icon: { name: 'bi/three-dots.svg', title: gt('More contact options') } }),
        dataAction: 'sort',
        model: baton.app.props,
        tabindex: -1
      })
      ext.point('io.ox/contacts/list-options').invoke('draw', dropdown.$el, baton)
      this.append(
        dropdown.render().$el
          .find('.dropdown-menu')
          .addClass('dropdown-menu-right')
          .end()
          .on('dblclick', function (e) { e.stopPropagation() })
      )
    }
  })

  ext.point('io.ox/contacts/list-options').extend({
    id: 'select-all',
    index: 100,
    draw (baton) {
      const view = this.data('view')
      view.link('select-all', gt('Select all'), function () {
        baton.app.grid.selection.selectAll()
      })
    }
  })

  ext.point('io.ox/contacts/list-options').extend({
    id: 'sort',
    index: 200,
    draw () {
      this.data('view')
        .divider()
        .header(gt('Sort by'))
        .option('sort', 607, gt('Last name'), { radio: true })
        .option('sort', 501, gt('First name'), { radio: true })
        .divider()
        .header(gt('Sort order'))
        .option('order', 'asc', gt('Ascending'), { radio: true })
        .option('order', 'desc', gt('Descending'), { radio: true })
    }
  })
}

let INDEX = 100
ext.point('io.ox/topbar/settings-dropdown').extend(
  {
    id: 'contacts-list-options',
    index: INDEX += 100,
    render (baton) {
      if (baton.appId !== 'io.ox/contacts') return
      this
        .group(gt('List options'))
        .option('listViewLayout', 'avatars', gt('Contact pictures'), { radio: true, group: true })
      if (settings.get('selectionMode') !== 'alternative') {
        this.option('listViewLayout', 'checkboxes', gt('Checkboxes'), { radio: true, group: true })
      }
      this.option('listViewLayout', 'simple', gt('Simple'), { radio: true, group: true })
        .divider()
    }
  },
  {
    id: 'subscribe',
    index: INDEX += 100,
    render: subscribe
  },
  {
    id: 'subscribe-shared-contacts',
    index: INDEX += 100,
    render: subscribeShared
  }
)
