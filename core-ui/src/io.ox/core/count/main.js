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

import api from '@/io.ox/core/count/api'
import ox from '@/ox'
import '@/io.ox/core/count/timing'
import '@/io.ox/core/count/errors'
import '@/io.ox/core/count/eyeballtime'
import '@/io.ox/core/count/lifetime'
import '@/io.ox/core/count/nps'
import '@/io.ox/core/count/sendmail'
import '@/io.ox/core/count/appointments'

if (!api.disabled) {
  // track browser and unique visit once on setup
  api.add('browser')
  api.add('device', { platform: api.platform, device: api.device })
  api.add('unique', { id: ox.context_id + '/' + ox.user_id })
}
