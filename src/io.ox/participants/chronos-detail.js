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
import ext from '@/io.ox/core/extensions'
import * as contactsUtil from '@/io.ox/contacts/util'
import * as calendarUtil from '@/io.ox/calendar/util'
import * as coreUtil from '@/io.ox/core/util'
import '@/io.ox/participants/style.scss'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

// Options
// - inlineLinks: false or extensionpoint id
// - halo: true or false -> link halo views
function ParticipantsView (baton, options) {
  options = Object.assign({
    inlineLinks: false,
    halo: true
  }, options)

  this.draw = function (limit = 20) {
    const groups = groupAttendees(baton.model, false)
    const total = groups.total
    const hitsLimit = total > (limit + 5)
    const $el = $('<ul class="participant-list m-0 p-0">').toggleClass('truncated', hitsLimit)
    let rest = limit + (hitsLimit ? 0 : 5)
    if (!total) return $el

    Object.entries(groups.entries).forEach(([id, { entries, title }]) => {
      if (rest <= 0 || id === 'total') return
      const subset = entries
        .sort((a, b) => a.sort_name < b.sort_name ? -1 : 1)
        .slice(0, rest)
      rest -= entries.length
      if (!subset.length) return
      $el.append(
        $('<li class="m-0 p-0 mb-16">').append(
          $('<h2 class="participant-list-header flex-row">').append(
            $('<span class="me-8">').text(title),
            getStats(id)
          ),
          $('<ul class="m-0 p-0">').append(
            subset.map(entry => drawParticipant(entry, baton.model, options))
          )
        )
      )
    })

    function getStats (id) {
      const group = groups.entries[id]
      if (group.total <= 1) return $()
      const nodes = [$('<span class="label label-subtle me-auto">').text(group.total)]
      if (group.total > 5) {
        const { accepted, maybe, declined } = group
        if (accepted > 0) nodes.push(getLabel(accepted, gt('Accepted: %d', accepted), 'green'))
        if (maybe > 0) nodes.push(getLabel(maybe, gt('Maybe: %d', maybe), 'yellow'))
        if (declined > 0) nodes.push(getLabel(declined, gt('Declined: %d', declined), 'red'))
      }
      return nodes
    }

    function getLabel (count, title, color) {
      return $(`<span class="label label-subtle subtle-${color} ms-4">`).attr('title', title).text(count)
    }

    return $el
  }
}

function groupAttendees (appointment) {
  let total = 0
  const stats = { total: 0, accepted: 0, maybe: 0, declined: 0, unconfirmed: 0 }
  const entries = {
    // only used if organizer is not attending
    organizer: { entries: [], title: gt('Organizer'), ...stats },
    participants: { entries: [], title: gt('Participants'), ...stats },
    resources: { entries: [], title: gt('Resources'), ...stats }
  }
  const attendees = (appointment.get('attendees') || []).slice()
  mergeOrganizer(attendees, appointment.get('organizer'))
  attendees.forEach(attendee => {
    const id = getGroupId(appointment, attendee)
    const group = entries[id]
    if (!group) return
    total++
    group.entries.push(injectSortName(attendee))
    group.total++
    switch (attendee.partStat) {
      case 'ACCEPTED': group.accepted++; break
      case 'TENTATIVE': group.maybe++; break
      case 'DECLINED': group.declined++; break
      default: group.unconfirmed++; break
    }
  })
  return { total, entries }
}

function mergeOrganizer (attendees, organizer) {
  if (!organizer) return
  organizer.isParticipant = false
  organizer.isOrganizer = true
  attendees.forEach(attendee => {
    // despite different URIs, it's the same user (cp. OXUIB-2219)
    // compare both entity and uri; make sure not to compare undefined
    const isOrganizer =
      (attendee.entity && attendee.entity === organizer.entity) ||
      (attendee.uri && attendee.uri === organizer.uri)
    if (isOrganizer) {
      attendee.isOrganizer = true
      organizer.isParticipant = true
    }
    attendee.isParticipant = !attendee.cuType || attendee.cuType === 'INDIVIDUAL'
    attendee.isOptional = attendee.role === 'OPT-PARTICIPANT'
  })
  if (!organizer.isParticipant) attendees.unshift(organizer)
  return attendees
}

function getGroupId (appointment, attendee) {
  if (attendee.cuType === 'RESOURCE') return 'resources'
  if (attendee.isParticipant) return 'participants'
  if (attendee.isOrganizer) return 'organizer'
}

function drawParticipant (data, appointment, options) {
  options = Object.assign({ halo: true }, options)
  const statusClass = calendarUtil.getConfirmationClass(data.partStat)
  const $el = $('<li class="participant m-0 p-0">').addClass(statusClass)
  const baton = new ext.Baton({ data, options, appointment })
  ext.point('io.ox/participants/chronos/item').invoke('draw', $el, baton)
  return $el
}

// used to display participants in calendar detail views when chronos api is used

ext.point('io.ox/participants/chronos/item').extend(
  {
    index: 100,
    id: 'status',
    draw (baton) {
      const data = baton.data
      const isNotParticipatingOrganizer = data.isOrganizer && !data.isParticipant
      const confirm = isNotParticipatingOrganizer
        ? 'bi/slash-circle.svg'
        : calendarUtil.getConfirmationSymbol(data.partStat)
      this.append(
        $('<span class="status me-8" aria-hidden="true">').append(
          createIcon(confirm).addClass('bi-14')
        )
      )
    }
  },
  {
    index: 200,
    id: 'resource',
    draw (baton) {
      let data = baton.data
      const name = calendarUtil.getAttendeeName(data)
      if (data.cuType !== 'RESOURCE') return
      if (!baton.options.halo) return this.append($.txt(name))
      if (data.resource) data = data.resource
      this.append(
        $('<a href="#" role="button" data-detail-popup="resource">')
          .attr('title', data.display_name || name)
          // 'looksLikeResource' duck check
          .data(Object.assign(data, { email1: data.mailaddress || data.email }))
          .append($.txt(data.display_name || name))
      )
    }
  },
  {
    index: 300,
    id: 'person',
    draw (baton) {
      const data = baton.data
      if (data.cuType === 'RESOURCE') return

      const opt = { html: $(data.full_name), ...data }
      if (!baton.options.halo) opt.$el = $('<span>')
      if (data.entity) opt.user_id = data.entity

      this.append(
        coreUtil.renderPersonalName(opt, data).addClass('me-8'),
        !data.entity && data.email ? $('<span class="text-gray me-8">').text(`<${data.email}>`) : $(),
        // pause for screen reader
        $('<span class="sr-only">').text(', ' + calendarUtil.getConfirmationLabel(data.partStat) + '.')
      )

      if (data.isOptional) {
        this.append($('<span class="label label-subtle subtle-green me-8">').text(gt('Optional')))
      }

      if (data.isParticipant && data.isOrganizer) {
        this.append($('<span class="label label-subtle label-organizer me-8">').text(gt('Organizer')))
      }
    }
  },
  {
    index: 400,
    id: 'comment',
    draw (baton) {
      const data = baton.data
      const comment = baton.data.cuType !== 'RESOURCE' ? data.comment : ''
      this.append(
        $('<span class="comment">').toggleClass('localized-quote', !!comment).text(comment || '')
      )
    }
  }
)

const sortPartStat = { ACCEPTED: 1, TENTATIVE: 2, DECLINED: 3, 'NEEDS-ACTION': 4 }

function injectSortName (obj) {
  const organizer = obj.isOrganizer ? 0 : 1
  const prefix = `${organizer}.${sortPartStat[obj.partStat] || 5}`
  const data = obj.contact || contactsUtil.deriveNameParts(obj.cn)
  obj.full_name = contactsUtil.getFullName(data, true)
  obj.sort_name = `${prefix}.${contactsUtil.getSortName(data)}`
  return obj
}

export default ParticipantsView
