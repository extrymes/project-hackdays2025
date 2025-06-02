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
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import '@/io.ox/core/tk/upload'
import '@/io.ox/core/dropzone'
import extensions from '@/io.ox/tasks/common-extensions'
import api from '@/io.ox/tasks/api'
import { settings } from '@/io.ox/tasks/settings'

import '@/io.ox/tasks/actions'
import '@/io.ox/tasks/style.scss'
import gt from 'gettext'

if (!_.device('smartphone')) {
// define links for classic toolbar
  const point = ext.point('io.ox/tasks/toolbar/links')

  const meta = {
    //
    // --- HI ----
    //
    edit: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Edit'),
      tooltip: gt('Edit task'),
      icon: 'bi/pencil.svg',
      drawDisabled: true,
      ref: 'io.ox/tasks/actions/edit'
    },
    'change-due-date': {
      prio: 'hi',
      mobile: 'lo',
      // #. Task: "Due" like in "Change due date"
      title: gt('Due'),
      tooltip: gt('Change due date'),
      icon: 'bi/clock.svg',
      ref: 'io.ox/tasks/actions/placeholder',
      customize: extensions.dueDate
    },
    done: {
      prio: 'hi',
      mobile: 'hi',
      // #. Task: Done like in "Mark as done"
      title: gt('Done'),
      tooltip: gt('Mark as done'),
      icon: 'bi/check-circle.svg',
      ref: 'io.ox/tasks/actions/done'
    },
    undone: {
      prio: 'hi',
      mobile: 'hi',
      // #. Task: Undone like in "Mark as undone"
      title: gt('Undone'),
      tooltip: gt('Mark as undone'),
      icon: 'bi/play.svg',
      ref: 'io.ox/tasks/actions/undone'
    },
    delete: {
      prio: 'hi',
      mobile: 'hi',
      title: gt('Delete'),
      tooltip: gt.pgettext('tooltip', 'Delete task'),
      icon: 'bi/trash.svg',
      ref: 'io.ox/tasks/actions/delete'
    },
    //
    // --- LO ----
    //
    export: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Export'),
      drawDisabled: true,
      ref: 'io.ox/tasks/actions/export'
    },
    confirm: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Change confirmation'),
      ref: 'io.ox/tasks/actions/confirm'
    },
    print: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Print'),
      drawDisabled: true,
      ref: 'io.ox/tasks/actions/print'
    },
    move: {
      prio: 'lo',
      mobile: 'lo',
      title: gt('Move'),
      ref: 'io.ox/tasks/actions/move',
      drawDisabled: true,
      section: 'file-op'
    }
  }

  // transform into extensions

  let index = 0

  _(meta).each(function (extension, id) {
    extension.id = id
    extension.index = (index += 100)
    point.extend(extension)
  })

  // classic toolbar
  ext.point('io.ox/tasks/mediator').extend({
    id: 'toolbar',
    index: 10000,
    setup (app) {
    // yep strict false (otherwise toolbar does not redraw when changing between empty folders => tasks are created in the wrong folder)
      const toolbarView = new ToolbarView({ point: 'io.ox/tasks/toolbar/links', title: app.getTitle(), strict: false })

      app.right.parent().addClass('classic-toolbar-visible').prepend(toolbarView.$el)

      // list is array of object (with id and folder_id)
      app.updateToolbar = function (list) {
        const options = { data: [], folder_id: this.folder.get(), app: this }
        toolbarView.setSelection(list, function () {
          if (!list.length) return options
          return (list.length <= 100 ? api.getList(list) : $.when(list)).pipe(function (data) {
            options.data = data
            return options
          })
        })
      }

      app.forceUpdateToolbar = function (list) {
        toolbarView.selection = null
        this.updateToolbar(list)
      }
    }
  })

  ext.point('io.ox/tasks/mediator').extend({
    id: 'update-toolbar',
    index: 10200,
    setup (app) {
      app.updateToolbar([])
      // update toolbar on selection change as well as any model change (seen/unseen flag)
      app.getGrid().selection.on('change', function (e, list) {
        app.updateToolbar(list)
      })
      // update whenever a task changes
      api.on('update', function () {
        app.forceUpdateToolbar(app.getGrid().selection.get())
      })
    }
  })
}

ext.point('io.ox/topbar/settings-dropdown').extend(
  {
    id: 'tasks-list-options',
    index: 100,
    render (baton) {
      if (baton.appId !== 'io.ox/tasks') return
      if (settings.get('selectionMode') === 'alternative') return
      this
        .group(gt('List options'))
        .option('listViewLayout', 'checkboxes', gt('Checkboxes'), { radio: true, group: true })
        .option('listViewLayout', 'simple', gt('Simple'), { radio: true, group: true })
        .divider()
    }
  },
  {
    id: 'subscribe-shared-tasks',
    index: 300,
    render (baton) {
      if (baton.appId !== 'io.ox/tasks') return
      this.action('io.ox/tasks/actions/subscribe-shared', gt('Subscribe to shared task folders'), baton)
      this.divider()
    }
  }
)
