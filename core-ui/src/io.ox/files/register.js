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

import ui from '@/io.ox/core/desktop'
import icons from '@/io.ox/core/main/icons'
import manifests from '@/io.ox/core/manifests'
import gt from 'gettext'

ui.createApp({
  id: 'io.ox/files',
  name: 'io.ox/files',
  title: gt.pgettext('app', 'Drive'),
  requires: 'infostore',
  refreshable: true,
  searchable: true,
  settings: () => import('@/io.ox/files/settings/pane.js'),
  icon: icons['io.ox/files'],
  load: () => manifests.manager.loadPluginsFor('io.ox/files').then(() => import('@/io.ox/files/main'))
})

ui.createApp({
  name: 'io.ox/files/detail',
  requires: 'infostore',
  refreshable: true,
  load: () => manifests.manager.loadPluginsFor('io.ox/files').then(() => import('@/io.ox/files/detail/main'))
})
