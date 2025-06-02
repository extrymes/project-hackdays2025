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
import moment from '@open-xchange/moment'

import * as util from '@/io.ox/calendar/util'
import { manifestManager } from '@/io.ox/core/manifests'

export default async function (model) {
  // reduce data
  const copy = model.pick(
    'color class folder location description participants attendees transp summary attendeePrivileges alarms'.split(' ')
  )

  // check isBefore once for the startDate; then reuse that information for endDate (see bug 44647)
  let needsShift = false
  const isAllday = util.isAllday(model)
  const format = isAllday ? 'YYYYMMDD' : 'YYYYMMDD[T]HHmmss';

  // copy date/time
  ['startDate', 'endDate'].forEach(function (field) {
    const ref = model.getMoment(field)
    // set date to today, keep time, then use same weekday
    const d = moment({ hour: ref.hour(), minute: ref.minute() }).weekday(ref.weekday())
    const target = moment.max(d, ref)

    // shift about one week?
    if (needsShift || target.isBefore(moment()) || target.isSameOrBefore(ref)) {
      target.add(1, 'w')
      needsShift = true
    }

    // if this is the endDate and the appointment is an all day appointment we need to subtract 1 day
    // (see bug 63806)
    if (field === 'endDate' && isAllday) target.subtract(1, 'day')

    copy[field] = { value: target.format(format), tzid: model.get(field).tzid }
  })

  const location = model.get('location')
  const conferences = model.get('conferences')
  if (conferences) {
    // don't copy location if it's a conference link
    if (conferences.filter(c => c.uri === location).length) copy.location = ''
    for (const conference of conferences) {
      // attempt to delete dial-in information from description
      if (conference?.extendedParameters?.['X-OX-TYPE'] === 'zoom' && copy.description) {
        // a notification is displayed if the exact dial-in information was not present
        copy.warnOldDialInInfo = true
        try {
          const [plugin] = (await manifestManager.loadPluginsFor('conference')).filter((plugin) => {
            return plugin?.getMeeting && plugin?.getDialInInfo
          })
          if (!plugin) throw new Error('No conference plugin found')
          const { getMeeting, getDialInInfo } = plugin
          const meeting = await getMeeting(conference.extendedParameters['X-OX-ID'])
          const dialInInfo = getDialInInfo(meeting)
          if (copy.description.indexOf(dialInInfo) > -1) {
            copy.warnOldDialInInfo = false
            copy.description = copy.description.replace(dialInInfo, '').trim()
          }
        } catch (error) {
          console.warn(error)
        }
      }
    }
  }
  // clean up attendees (remove confirmation status comments etc)
  copy.attendees = util.cleanupAttendees(copy.attendees, 'role')

  // use ox.launch to have an indicator for slow connections
  ox.load(() => import('@/io.ox/calendar/edit/main')).then(async function ({ default: edit }) {
    const app = edit.getApp()
    await app.launch()
    app.create(copy)
  })
};
