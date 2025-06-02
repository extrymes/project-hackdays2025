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
import moment from '@open-xchange/moment'

import ext from '@/io.ox/core/extensions'

import viewGrid from '@/io.ox/calendar/view-grid-template'

import gt from 'gettext'

ext.point('io.ox/halo/contact:renderer').extend({
  id: 'appointments',
  handles (type) {
    return type === 'com.openexchange.halo.events'
  },
  draw (baton) {
    if (baton.data.length === 0) return

    const node = this; const def = $.Deferred()

    // TODO: unify with portal code (copy/paste right now)

    node.append($('<h2 class="widget-title clear-title">').text(gt('Shared Appointments')))
    viewGrid.drawSimpleGrid(baton.data).appendTo(node)
    // mark vgrid cells to prevent unwanted close event (bug 41822)
    node.find('.vgrid-cell').attr('data-detail-popup', 'appointment')
    def.resolve()

    return def
  }
})

ext.point('io.ox/halo/contact:requestEnhancement').extend({
  id: 'request-appointments',
  enhances (type) {
    return type === 'com.openexchange.halo.events'
  },
  enhance (request) {
    request.params.rangeStart = moment().utc().format('YYYYMMDD[T]HHmmss[Z]')
    request.params.rangeEnd = moment().utc().add(10, 'days').format('YYYYMMDD[T]HHmmss[Z]')
  }
})
