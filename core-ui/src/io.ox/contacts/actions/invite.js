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

import api from '@/io.ox/contacts/api'
import capabilities from '@/io.ox/core/capabilities'
import * as calendarUtil from '@/io.ox/calendar/util'
import * as util from '@/io.ox/contacts/util'

export default function (list) {
  let def = null
  let distLists = []

  function mapContact (obj) {
    if (obj.distribution_list && obj.distribution_list.length) {
      distLists.push(obj)
      return
    } else if ((obj.internal_userid || obj.user_id) && (obj.field === 'email1' || !obj.field)) {
      // internal user
      return { type: 1, user_id: obj.internal_userid || obj.user_id, display_name: obj.display_name, email1: obj.email1 }
    }
    // external user
    return { type: 5, display_name: obj.display_name, mail: obj[obj.field] || obj.mail || obj.email1 || obj.email2 || obj.email3 }
  }

  function filterContact (obj) {
    return obj.type === 1 || !!obj.mail
  }

  function filterForDistlists (list) {
    const cleaned = []
    _(list).each(function (single) {
      if (!single.mark_as_distributionlist) {
        cleaned.push(single)
      } else {
        distLists = distLists.concat(single.distribution_list || [])
      }
    })
    return cleaned
  }

  // check for anonymous contacts
  if (list.length === 1 && (list[0].id === 0 || String(list[0].folder_id) === '0' || list[0].folder_id === null)) {
    const address = list[0].email1 || list[0].email2 || list[0].email3
    def = $.Deferred().resolve([{ type: 5, mail: address }])
  } else {
    def = api.getList(list, true, {
      check (obj) {
        return obj.mark_as_distributionlist || obj.internal_userid || obj.email1 || obj.email2 || obj.email3
      }
    })
      .then(function (list) {
        // set participants
        const participants = _.chain(filterForDistlists(list)).map(mapContact).flatten(true).filter(filterContact).value()
        const externalParticipants = []

        distLists = _.union(distLists)
        // remove external participants without contact or they break the request
        _(distLists).each(function (participant) {
          if (!participant.id) {
            externalParticipants.push(participant)
          }
        })
        distLists = _.difference(distLists, externalParticipants)
        distLists = util.validateDistributionList(distLists)

        return api.getList(distLists)
          .then(function (obj) {
            // make sure we use the mail address given in the distributionlist
            obj = _(obj).map(function (contact, index) {
              if (distLists[index].mail_field) {
                contact.field = 'email' + distLists[index].mail_field
              }
              return contact
            })
            const resolvedContacts = _.chain([].concat(obj, externalParticipants))
              .map(mapContact)
              .flatten(true)
              .filter(filterContact)
              .value()
            return participants.concat(resolvedContacts)
          })
      })
  }

  def.then(function (participants) {
    Promise.all([
      import('@/io.ox/calendar/edit/main'),
      import('@/io.ox/core/folder/api')
    ]).then(function ([{ default: m }, { default: folderAPI }]) {
      $.when(launchApp(), getDefaultFolder()).done(function (calendar, folderId) {
        const app = calendar
        const refDate = moment().startOf('hour').add(1, 'hours')
        const attendees = _.map(participants, function (participant) {
          return calendarUtil.createAttendee(participant)
        })

        app.create({
          attendees,
          folder: folderId,
          startDate: { value: refDate.format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() },
          endDate: { value: refDate.add(1, 'hours').format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() }
        })
      })

      function getDefaultFolder () {
        if (!capabilities.has('guest')) return folderAPI.getDefaultFolder('calendar')
        // guest case
        const alreadyFetched = folderAPI.getFlatCollection('calendar', 'shared').fetched
        return alreadyFetched
          ? folderAPI.getFlatCollection('calendar', 'shared').models[0].get('id')
          : folderAPI.flat({ module: 'calendar' }).then(function (sections) {
            return (sections.shared[0] || {}).id
          })
      }

      async function launchApp () {
        const app = m.getApp()
        await app.launch()
        return app
      }
    })
  })
};
