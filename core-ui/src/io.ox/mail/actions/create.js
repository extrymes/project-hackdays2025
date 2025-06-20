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
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import ox from '@/ox'
import contactAPI from '@/io.ox/contacts/api'
import userAPI from '@/io.ox/core/api/user'
import yell from '@/io.ox/core/yell'
import * as calendarUtil from '@/io.ox/calendar/util'

import { settings } from '@/io.ox/core/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import gt from 'gettext'

const throbber = setTimeout(function () { ox.busy(true) }, 500)

function idle () {
  clearTimeout(throbber)
  ox.idle()
}

function fetch (data) {
  return userAPI.get()
    .then(function (user) {
      // filter current user (is added automatically as organizer);
      const useraddresses = _.compact([user.email1, user.email2, user.email3])
      return _.chain([].concat(data.to, data.cc, data.from))
        .compact()
        .map(function (obj) { return obj[1] })
        .unique()
        .reject(function (mail) { return _.contains(useraddresses, mail) })
        .value()
    })
    .then(function (recipients) {
      // resolve data by mail
      const apiCalls = _(recipients).map(function (mail) {
        return contactAPI.advancedsearch(mail)
          .then(function (list) {
            // ensure minimal contact data
            return list[0] || { email1: mail, display_name: mail, mail_field: 0 }
          })
      })
      return $.when.apply($, apiCalls)
    })
    .fail(function () {
      idle()
      yell('error', gt('Error while resolving mail addresses. Please try again.'))
    })
}

function launchCalendar (attendees, title) {
  const refDate = moment().startOf('hour').add(1, 'hours')
  const data = {
    attendees,
    summary: title,
    folder_id: calendarSettings.get('chronos/defaultFolderId'),
    startDate: { value: refDate.format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() },
    endDate: { value: refDate.add(1, 'hours').format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() }
  }

  ox.launch(() => import('@/io.ox/calendar/edit/main'))
    .finally(idle)
    .then(function (app) {
      app.create(data)
      // set dirty
      app.model.toSync = data
    })
}

function launchContacts (members, title) {
  ox.launch(() => import('@/io.ox/contacts/distrib/main'))
    .finally(idle)
    .then(function (app) {
      app.create(settings.get('folder/contacts'), {
        distribution_list: members,
        display_name: title
      })
    })
}

export default {
  createAppointment (baton) {
    fetch(baton.data).then(function (/* contact, contact... */) {
      // map contacts to participants and create new appointment
      const participants = []
      _(arguments).each(function (contact) {
        // fuzzy check is ok here, internal_userid = 0 is reserved for external contacts
        if (contact.internal_userid) {
          contact.type = 1
          contact.user_id = contact.internal_userid
        } else {
          contact.type = 5
          contact.mail = contact.email1
        }

        participants.push(calendarUtil.createAttendee(contact))
      })
      launchCalendar(participants, baton.data.subject)
    })
  },
  createDistributionList (baton) {
    baton.data = Array.isArray(baton.data) ? baton.data[0] : baton.data
    fetch(baton.data).then(function (/* contact, contact... */) {
      // map contacts to members
      const members = []
      _(arguments).each(function (contact) {
        members.push(
          contact.id
            ? { id: contact.id, folder_id: contact.folder_id, display_name: contact.display_name, mail: contact.email1, mail_field: 1 }
            : { type: 5, display_name: contact.display_name, mail: contact.email1 }
        )
      })
      launchContacts(members, baton.data.subject)
    })
  }
}
