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

// import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'

const point = ext.point('io.ox/settings/pane/tools')
const id = 'io.ox/core/sub'

// point.extend({
//   id,
//   title: gt('Subscriptions'),
//   ref: 'io.ox/core/sub',
//   index: 100,
//   load: () => import('@/io.ox/core/sub/settings/pane.js')
// })

addReadyListener('capabilities:user', (capabilities) => {
  if (capabilities.has('subscription')) return
  point.disable(id)
})
