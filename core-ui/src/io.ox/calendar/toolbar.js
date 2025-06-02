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
// import actionsUtil from '@/io.ox/backbone/views/actions/util'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import api from '@/io.ox/calendar/api'
import capabilities from '@/io.ox/core/capabilities'
import { invoke } from '@/io.ox/backbone/views/actions/util'
import { inlineLinks } from '@/io.ox/calendar/actions'
import '@/io.ox/calendar/style.scss'
import _ from '@/underscore'

import gt from 'gettext'

if (!_.device('smartphone')) {
  // define links for classic toolbar
  const point = ext.point('io.ox/calendar/toolbar/links')

  // transform into extensions

  let index = 0

  _(inlineLinks).each(function (extension) {
    // copy extension point and exclude invoke method, extensions must not have their own invoke method
    const { invoke, ...ext } = extension
    ext.index = index += 100
    point.extend(ext)
  })

  let INDEX = 0
  ext.point('io.ox/topbar/settings-dropdown').extend(
    {
      id: 'mini-calendar',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        this
          .group(gt('Calendar options'))
          .option('showMiniCalendar', true, gt('Show mini calendar'), { group: true })
          .divider()
      }
    },
    {
      id: 'checkboxes',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (baton.app.props.get('layout') !== 'list') return
        this.group(gt('List options'))
        this.option('checkboxes', true, gt('Checkboxes'), { radio: true, group: true })
        this.option('checkboxes', false, gt('Simple'), { radio: true, group: true })
          .divider()
      }
    },
    {
      id: 'calendar-print',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (!capabilities.has('calendar-printing')) return
        if (baton.app.props.get('layout') === 'year') return
        this
          .link('print', gt('Print'), print.bind(null, baton))
          .divider()
      }
    },
    {
      id: 'google',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (!capabilities.has('calendar_google')) return
        this.action('io.ox/calendar/actions/google', gt('Subscribe to Google calendar'), baton)
      }
    },
    {
      id: 'shared',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (!capabilities.has('edit_public_folders || read_create_shared_folders || caldav')) return
        this.action('io.ox/calendar/actions/subscribe', gt('Subscribe to shared calendars'), baton)
      }
    }, {
      id: 'ical',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (!capabilities.has('calendar_ical')) return
        this.action('io.ox/calendar/actions/ical', gt('Import from URL'), baton)
      }
    }, {
      id: 'import',
      index: INDEX += 100,
      render (baton) {
        if (baton.appId !== 'io.ox/calendar') return
        if (_.device('smartphone')) return
        this.action('io.ox/calendar/actions/import', gt('Import file'), baton)
        this.divider()
      }
    }
  )

  function print (baton, e) {
    e.preventDefault()
    if (baton.app.perspective && baton.app.perspective.getName() === 'list') {
      const selection = baton.app.listView.selection.get()
      if (!selection.length) return
      baton = baton.clone()
      baton.data = selection.map(_.cid)
      invoke('io.ox/calendar/detail/actions/print-appointment', baton)
    } else {
      invoke('io.ox/calendar/detail/actions/print', ext.Baton({ app: baton.app, window: baton.app.getWindow() }))
    }
  }

  // classic toolbar
  ext.point('io.ox/calendar/listview/header').extend({
    id: 'toolbar',
    index: 100,
    render (baton) {
      // don't use strict mode here. We also want to update the toolbar when the selected folder changes, not only when the selection changes (permissions for the selected folder might be different)
      const app = baton.app
      const toolbarView = new ToolbarView({ point: 'io.ox/calendar/toolbar/links', title: app.getTitle(), strict: false })
      this.append(toolbarView.$el)

      // selection is array of strings
      app.updateToolbar = function (selection) {
        const options = { data: [], models: [], folder_id: this.folder.get(), app: this }
        const list = selection.map(_.cid)
        toolbarView.setSelection(list, function () {
          if (!list.length || list.length > 100) return options
          return api.getList(list).then(function (models) {
            options.models = models
            options.data = _(models).invoke('toJSON')
            return options
          })
        })
      }

      app.forceUpdateToolbar = function (selection) {
        toolbarView.selection = null
        this.updateToolbar(selection)
      }

      app.updateToolbar([])
      // update toolbar on selection change
      app.listView.on('selection:change', function () {
        // prevent unneeded redraws if new selection matches current selection
        if (_.isEqual(_.compact((toolbarView.selection || '').split(',').sort()), _.compact(getSelection(app).sort()))) return
        app.updateToolbar(getSelection(app))
      })
      // update toolbar on model changes
      app.listView.on('collection:change', _.debounce(() => {
        app.updateToolbar(getSelection(app))
      }), 0)
      // folder change
      app.on('folder:change', function () {
        app.updateToolbar(getSelection(app))
      })
      app.getWindow().on('change:perspective change:initialPerspective', function () {
        _.defer(function () { app.forceUpdateToolbar(getSelection(app)) })
      })
    }
  })

  function getSelection (app) {
    return app.perspective && app.perspective.getName() === 'list' ? app.listView.selection.get() : []
  }
}
