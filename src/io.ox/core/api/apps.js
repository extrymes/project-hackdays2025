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

import Backbone from '@/backbone'
import _ from '@/underscore'
import upsell from '@/io.ox/core/upsell'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const defaultList = [
  'io.ox/mail', 'io.ox/calendar', 'io.ox/contacts', 'io.ox/tasks',
  'io.ox/files', 'io.ox/portal', 'io.ox/notes',
  'io.ox/office/portal/text', 'io.ox/office/portal/spreadsheet', 'io.ox/office/portal/presentation'
]

function validApp (app) { return app && !this.blocklist[app.id] }

const AppID = Backbone.Model.extend({
  constructor: function AppID (id, options) {
    Backbone.Model.call(this, { id }, options)
  }
})

const LauncherCollection = Backbone.Collection.extend({ model: AppID })

const AppsCollection = Backbone.Collection.extend({
  initialize () {
    this.blocklist = _.reduce(
      settings.get('apps/blacklist', '').split(','),
      function (memo, id) { memo[id] = true; return memo },
      {})
    this.launcher = new LauncherCollection(defaultList)
    if (settings.contains('apps/list')) {
      const list = settings.get('apps/list').split(',')
      this._launcher = new LauncherCollection(list)
    } else {
      this._launcher = this.launcher
    }
    this._launcher.on('all', function () {
      const args = Array.prototype.slice.call(arguments)
      args[0] = 'launcher:' + args[0]
      this.trigger.apply(this, args)
    }, this)
  },
  comparator (model) {
    const index = defaultList.indexOf(model.get('id'))
    if (index < 0) return Number.MAX_SAFE_INTEGER
    return index
  },
  getByCID (cid) {
    return _.findWhere(this.models, { cid })
  },
  forLauncher: function getAppsForLauncher () {
    return _.filter(this._launcher.map(this.get.bind(this)), validApp, this)
  },
  getAvailableApps () {
    return this.forLauncher()
      .filter(model => upsell.has(model.get('requires')))
      .map(model => ({ label: model.getTitle(), value: model.get('id') }))
      .concat([{ label: gt('None'), value: 'none' }])
  },
  getOpenFloatingWindows () {
    return this.where({ floating: true, state: 'running' })
  }
})

export function minimizeFloatingWindows (apps) {
  apps.forEach(({ attributes: { window } }) => window.floating.model.set('minimized', true))
}
export function restoreFloatingWindows (apps) {
  apps.forEach(({ attributes: { window } }) => window.floating.model.set('minimized', false))
}

export default new AppsCollection()
