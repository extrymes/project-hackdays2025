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

import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import print from '@/io.ox/core/print'
import folderAPI from '@/io.ox/core/folder/api'
import _ from '@/underscore'
import moment from '@open-xchange/moment'

function getFilter (start, end) {
  return function (event) {
    const eventStart = event.getMoment('startDate')
    const eventEnd = event.getMoment('endDate')
    if (util.isAllday(event)) eventEnd.subtract(1, 'day')
    // check if appointment is on that day
    if (start.isAfter(eventEnd)) return false
    if (end.isSameOrBefore(eventStart)) return false
    return true
  }
}

function sortBy (event) {
  return util.isAllday(event) ? -1 : util.getMomentInLocalTimezone(event.get('startDate')).valueOf()
}

function map (event) {
  // if declined use base grey color
  const folder = folderAPI.pool.models[event.get('folder')]
  const color = util.getAppointmentColor(folder.attributes, event) || '#e8e8e8'

  return {
    time: util.isAllday(event) ? undefined : util.getMomentInLocalTimezone(event.get('startDate')).format('LT'),
    title: event.get('summary'),
    color: util.getForegroundColor(color),
    backgroundColor: color
  }
}

export default {

  open (selection, win) {
    print.smart({
      selection: [selection.folders],

      get () {
        const collection = api.getCollection({
          start: selection.start,
          end: selection.end,
          folders: selection.folders,
          view: 'month'
        })
        return collection.sync().then(function () {
          const currentMonth = moment(selection.current).month()
          const weekStart = moment(selection.start)
          const end = moment(selection.end)
          const weeks = []

          // loop over weeks
          for (; end.diff(weekStart) > -1; weekStart.add(1, 'week')) {
            const start = weekStart.clone()
            const weekEnd = weekStart.clone().add(1, 'week')
            const days = []

            // loop over days
            for (; weekEnd.diff(start) > 0; start.add(1, 'day')) {
              const dayEnd = start.clone().add(1, 'day')
              days.push({
                date: start.date(),
                events: collection
                  .chain()
                  .filter(getFilter(start, dayEnd))
                  .sortBy(sortBy)
                  .map(function (event) {
                    return map(event)
                  })
                  .value(),
                className: start.month() === currentMonth ? 'in' : 'out'
              })
            }

            weeks.push({
              days
            })
          }
          return weeks
        })
      },

      meta: {
        labels: _(_.range(7)).map(function (num) {
          return moment().weekday(num).format('dddd')
        }),
        title: selection.title + ' - ' + moment(selection.current).formatCLDR('yMMMM')
      },

      selector: '.calendar-month-view',

      window: win
    })
  }
}
