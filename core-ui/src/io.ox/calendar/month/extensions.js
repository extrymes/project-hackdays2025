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
import * as util from '@/io.ox/calendar/util'
import moment from '@open-xchange/moment'
import $ from '@/jquery'

ext.point('io.ox/calendar/month/view/appointment').extend({
  id: 'start-time',
  index: 100,
  draw (baton) {
    const contentContainer = this.children('.appointment-content')
    const titleContainer = contentContainer.children('.title-container')
    titleContainer.replaceWith(titleContainer.children())
    const model = baton.model
    if (util.isAllday(model)) return
    const start = moment.max(baton.startDate.clone(), model.getMoment('startDate'))
    contentContainer.prepend($('<span class="start">').text(start.tz(moment().tz()).format('LT')))
  }
})
