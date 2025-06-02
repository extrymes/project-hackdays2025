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

import print from '@/io.ox/core/print'
import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import * as contactsUtil from '@/io.ox/contacts/util'
import userAPI from '@/io.ox/core/api/user'
import groupAPI from '@/io.ox/core/api/group'
import resourceAPI from '@/io.ox/core/api/resource'
import * as coreUtil from '@/io.ox/core/util'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'

import gt from 'gettext'

function injectInternalConfirmations (users, confirmations) {
  _(users).each(function (user) {
    const obj = confirmations[user.id] || {}
    user.status = obj.status || 0
    user.comment = obj.comment || ''
    // polish display_name
    user.display_name = contactsUtil.getFullName(user)
  })
  return users
}

function injectExternalConfirmations (contacts, confirmations) {
  _(contacts).each(function (contact) {
    const obj = confirmations[contact.mail] || {}
    contact.status = (obj && obj.status) || 0
    contact.comment = (obj && obj.comment) || ''
    // fix missing display_name
    contact.display_name = contact.display_name ? contact.display_name + ' <' + contact.mail + '>' : contact.mail
  })
  return contacts
}

function injectResourceConfirmations (resources) {
  _(resources).each(function (resource) {
    resource.status = 1
    resource.comment = ''
  })
  return resources
}

function getConfirmationListsForAttendees (internal) {
  const states = { unconfirmed: [], accepted: [], declined: [], tentative: [] }
  const map = { 'NEEDS-ACTION': 'unconfirmed', ACCEPTED: 'accepted', DECLINED: 'declined', TENTATIVE: 'tentative' }
  _(internal || []).each(function (obj) {
    const state = map[obj.partStat] || 'unconfirmed'
    states[state].push(obj)
  })
  // sort by display_name
  _(states).each(function (list, state) {
    states[state] = _(list).sortBy('cn')
  })
  return states
}

function getConfirmationLists (internal, external, resources) {
  const states = { unconfirmed: [], accepted: [], declined: [], tentative: [] }
  // 0 = unconfirmed, 1 = accepted, 2 = declined, 3 = tentative
  const map = { 0: 'unconfirmed', 1: 'accepted', 2: 'declined', 3: 'tentative' }
  _([].concat(internal || [], external || [], resources || [])).each(function (obj) {
    const state = map[obj.status] || 'unconfirmed'
    states[state].push(obj)
  })
  // sort by display_name
  _(states).each(function (list, state) {
    states[state] = _(list).sortBy('display_name')
  })
  return states
}

function getString (list) {
  return _(list).map(function (obj) {
    return '<span class="person">' + _.escape(obj.display_name || obj.cn) + '</span>' +
      (obj.comment ? ' <i class="comment">&quot;' + _.escape(obj.comment) + '&quot;</i>' : '')
  }).join('\u00A0\u00A0\u2022\u00A0 ')
}

function getContent (data) {
  // soft-break long words (like long URLs)
  return coreUtil.breakableText($.trim(data.description))
}

function unify (data, userList, groupList, resourceList, externalContacts) {
  // chronos api
  if (data.startDate || data.endDate || data.attendees) {
    // get lists per confirmation state
    const internal = _(data.attendees).where({ cuType: 'INDIVIDUAL' }).concat(_(data.attendees).where({ cuType: undefined }))
    const resources = _(data.attendees).where({ cuType: 'RESOURCE' }) || []
    const states = getConfirmationListsForAttendees(internal)
    const numParticipants = _(states).reduce(function (sum, list) { return sum + list.length }, 0)
    // return unified lists
    return {
      // lists
      internal,
      resources,
      // states
      unconfirmed: states.unconfirmed,
      accepted: states.accepted,
      declined: states.declined,
      tentative: states.tentative,
      // string
      strings: {
        unconfirmed: getString(states.unconfirmed),
        accepted: getString(states.accepted),
        declined: getString(states.declined),
        tentative: getString(states.tentative),
        resources: getString(resources)
      },
      // flags
      numParticipants,
      hasUnconfirmed: states.unconfirmed.length > 0,
      hasAccepted: states.accepted.length > 0,
      hasDeclined: states.declined.length > 0,
      hasTentative: states.tentative.length > 0,
      hasResources: resources.length > 0
    }
  }
  // calendar or tasks api
  const usersInGroups = _.chain(groupList).pluck('members').flatten().uniq().value()
  return userAPI.getList(usersInGroups).then(function (resolvedUsers) {
    // inject confirmations
    const confirmations = util.getConfirmations(data)
    const internal = injectInternalConfirmations([].concat(userList || [], resolvedUsers || []), confirmations)
    const external = injectExternalConfirmations(externalContacts, confirmations)
    const resources = injectResourceConfirmations(resourceList)
    // get lists per confirmation state
    const states = getConfirmationLists(internal, external, resources)
    const numParticipants = _(states).reduce(function (sum, list) { return sum + list.length }, 0)
    // return unified lists
    return {
      // lists
      internal,
      external,
      resources,
      // states
      unconfirmed: states.unconfirmed,
      accepted: states.accepted,
      declined: states.declined,
      tentative: states.tentative,
      // string
      strings: {
        unconfirmed: getString(states.unconfirmed),
        accepted: getString(states.accepted),
        declined: getString(states.declined),
        tentative: getString(states.tentative)
      },
      // flags
      numParticipants,
      hasUnconfirmed: states.unconfirmed.length > 0,
      hasAccepted: states.accepted.length > 0,
      hasDeclined: states.declined.length > 0,
      hasTentative: states.tentative.length > 0
    }
  })
}

function load (data) {
  const list = data.participants

  // get internal users
  const users = _.chain(list)
    .filter(function (obj) { return obj.type === 1 })
    .map(function (obj) { return obj.id })
    .value()
  // get user groups
  const groups = _.chain(list)
    .filter(function (obj) { return obj.type === 2 })
    .map(function (obj) { return { id: obj.id } })
    .value()
  // get resources
  const resources = _.chain(list)
    .filter(function (obj) { return obj.type === 3 })
    .map(function (obj) { return { id: obj.id } })
    .value()
  // get external participants
  const external = _.chain(list)
    .filter(function (obj) { return obj.type === 5 })
    .sortBy(function (obj) { return obj.mail })
    .value()

  const fetchUsers = users.length ? userAPI.getList(users) : $.Deferred().resolve([])

  return $.when(fetchUsers, groupAPI.getList(groups), resourceAPI.getList(resources))
    .then(function (userList, groupList, resourceList) {
      return unify(data, userList, groupList, resourceList, external)
    })
}

function getDate (data) {
  const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(data)
  const date = util.getDateTimeIntervalMarkup(data, { output: 'strings', zone: moment().tz() }).dateStr
  return date + (recurrenceString !== '' ? ' \u2013 ' + recurrenceString : '')
}

function getTime (data) {
  return util.getDateTimeIntervalMarkup(data, { output: 'strings', zone: moment().tz() }).timeStr
}

function process (data) {
  data = data.get ? data.attributes : data
  return _.extend(unify(data), {
    original: data,
    subject: data.summary,
    location: $.trim(data.location),
    content: getContent(data),
    date: getDate(data),
    time: getTime(data)
  })
}

export default {

  // publish this, can also be used to print tasks
  load,

  open (selection, win) {
    print.smart({

      get (obj) {
        return api.get(obj)
      },

      title: selection.length === 1 ? selection[0].title : undefined,

      i18n: {
        accepted: gt('Accepted'),
        declined: gt('Declined'),
        tentative: gt('Tentatively accepted'),
        unconfirmed: gt('Unconfirmed'),
        resources: gt('Resources')
      },

      process,
      selection,
      selector: '.appointment',
      window: win
    })
  }
}
