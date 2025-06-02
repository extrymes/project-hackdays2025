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

import ox from '@/ox'
import apps from '@/io.ox/core/api/apps'
import openSettings from '@/io.ox/settings/util'
import ext from '@/io.ox/core/extensions'

function openApp (appId) {
  ox.launch(apps.get(appId).load)
}

const point = ext.point('io.ox/shortcuts')

point.extend({
  id: 'open-mail',
  action: 'Open Mail',
  perform (baton) {
    openApp('io.ox/mail')
  }
})

point.extend({
  id: 'open-calendar',
  action: 'Open Calendar',
  perform (baton) {
    openApp('io.ox/calendar')
  }
})

point.extend({
  id: 'open-contacts',
  action: 'Open Address Book',
  perform (baton) {
    openApp('io.ox/contacts')
  }
})

point.extend({
  id: 'open-tasks',
  action: 'Open Tasks',
  perform (baton) {
    openApp('io.ox/tasks')
  }
})

point.extend({
  id: 'open-portal',
  action: 'Open Portal',
  perform (baton) {
    openApp('io.ox/portal')
  }
})

point.extend({
  id: 'open-drive',
  action: 'Open Drive',
  perform (baton) {
    openApp('io.ox/files')
  }
})

point.extend({
  id: 'open-settings',
  action: 'Open Settings',
  perform (baton) {
    const app = ox.ui.App.getCurrentApp()
    openSettings(`virtual/settings/${app.id}`)
  }
})
