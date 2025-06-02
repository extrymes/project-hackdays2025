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

// cSpell:ignore nohalo, sendby

import ext from '@/io.ox/core/extensions'
import userAPI from '@/io.ox/core/api/user'
import folderAPI from '@/io.ox/core/folder/api'
import * as coreUtil from '@/io.ox/core/util'
import * as util from '@/io.ox/calendar/util'
import { getMapService } from '@/io.ox/contacts/util'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import gt from 'gettext'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'
import { createIcon } from '@/io.ox/core/components'

function getTitle (baton, options) {
  options = options || {}
  const data = baton.data.event || baton.data
  let result = _.isUndefined(data.summary) ? gt('Private') : (data.summary || '\u00A0')

  if (options.parse) {
    result = coreUtil.urlify(result)
  }

  return result
}

const extensions = {

  h1 (baton) {
    this.append($('<h1 class="subject">').append(getTitle(baton, { parse: true })))
  },

  h2 (baton) {
    this.append($('<h2 class="subject">').text(getTitle(baton)))
  },

  locationDetail (baton) {
    if (!baton.data.location) return
    const $location = $('<div class="location">').append(coreUtil.urlify(baton.data.location).replace(/\n/g, '<br>'))
    this.append($location)
    // add map service unless it contains a link
    const containsUrl = /https?:\/\//i.test(baton.data.location)
    if (containsUrl) return
    const service = getMapService(baton.data.location)
    if (service.id === 'none') return
    $location.append(
      service.$el
        .attr('title', service.title)
        .append(createIcon('bi/map.svg').addClass('ms-8'))
    )
  },

  time (baton) {
    this.append(
      $('<div class="time">').text(util.getTimeInterval(baton.data))
    )
  },

  dateSimple (baton) {
    this.append(
      $('<div class="date">').text(util.getDateInterval(baton.data))
    )
  },

  datetime (baton) {
    const data = baton.data.event || baton.data
    this.append(
      util.getDateTimeIntervalMarkup(data, { zone: moment().tz(), noTimezoneLabel: true })
    )
  },

  date (baton, options) {
    this.append(
      util.getDateTimeIntervalMarkup(baton.data, options)
    )
  },

  recurrence (baton) {
    // use recurrence root if available (is requested for series exceptions)
    const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(baton.recurrenceRoot || baton.model || baton.data)
    if (recurrenceString === '') return
    this.append(
      $('<div class="recurrence">').text(recurrenceString)
    )
  },

  privateFlag (baton) {
    if (!util.isPrivate(baton.data)) return
    // #. appointment flag: 'secret' does not show up for other users in any cases; 'private' may be shown to other users under certain conditions
    const isPrivate = util.isPrivate(baton.data, true)
    const label = isPrivate ? gt('Secret') : gt('Private')
    this.append(
      (isPrivate ? createIcon('bi/person-circle.svg') : createIcon('bi/eye-slash.svg').attr('title', label).tooltip()).addClass('private-flag'),
      $('<span class="sr-only">').text(label)
    )
  },

  additionalFlags (baton) {
    if (_.isEmpty(util.returnIconsByType(baton.data).property)) return
    const node = $('<div class="flags">')
    this.append(
      node.append(util.returnIconsByType(baton.data).property)
    )
  },

  note (baton) {
    if (!baton.data.description) return

    this.append(
      $('<div class="note">').html(util.getNote(baton.data))
    )
  },

  detail (baton, options = {}) {
    // we don't show details for private appointments in shared/public folders (see bug 37971)
    const data = baton.data
    const folder = options.minimaldata ? {} : folderAPI.pool.getModel(data.folder)
    const createdBy = data.createdBy || {}
    if (util.isPrivate(data) && createdBy.entity !== ox.user_id && !folderAPI.is('private', folder)) return false

    const node = $('<table class="details-table expandable-content">')
    ext.point('io.ox/calendar/detail/details').invoke('draw', node, baton, options)
    const shownAs = util.getShownAs(baton.model || baton.data)
    this.append(
      $('<fieldset class="details expandable">').append(
        $('<legend class="io-ox-label">').append(
          $('<a href="#" class="expandable-toggle" role="button" aria-expanded="false">').append(
            $('<h2>').text(gt('Shown as %1$s', shownAs))
          ),
          $.txt(' '),
          createIcon('bi/chevron-right.svg').addClass('ms-4 bi-12 expandable-indicator'),
          createIcon('bi/chevron-down.svg').addClass('ms-4 bi-12 expandable-indicator')
        ),
        node
      ).addClass(options.minimaldata ? 'open' : '')
    )
  },

  sentBy (baton) {
    if (!baton.data.organizer || !baton.data.organizer.sentBy) return

    const sentBy = baton.data.organizer.sentBy
    this.append(
      $('<tr>').append(
        $('<th>').text(gt('Sent by')),
        $('<td class="detail sendby">').append(
          coreUtil.renderPersonalName({
            $el: baton.sendbyNode,
            name: sentBy.cn,
            email: sentBy.email,
            user_id: sentBy.entity
          },
          _.extend({}, baton.data, { nohalo: baton.isConflictView }))
        )
      )
    )
  },

  shownAs (baton) {
    // only show when marked as free
    if (!util.hasFlag(baton.model || baton.data, 'transparent')) return
    this.append(
      $('<tr>').append(
        $('<th>').text(gt('Shown as')),
        $('<td>').append(util.getShownAs(baton.model || baton.data)
        )
      )
    )
  },

  folder (baton) {
    if (!baton.data.folder) return
    this.append(
      $('<tr>').append(
        $('<th>').text(gt('Calendar')),
        $('<td>').attr('data-folder', baton.data.folder).append(folderAPI.getTextNode(baton.data.folder))
      )
    )
  },

  created (baton) {
    if (!baton.data.created && !baton.data.createdBy) return
    const entity = (baton.data.createdBy || {}).entity
    // if we don't have an entity, this might be an external creator (federated sharing etc)
    const userData = baton.data.createdBy && !entity
      ? {
          $el: $('<span>'),
          name: baton.data.createdBy.cn,
          email: baton.data.createdBy.email
        }
      : {
          html: userAPI.getTextNode(entity),
          user_id: entity
        }

    this.append(
      $('<tr>').append(
        $('<th>').text(gt('Created')),
        $('<td class="created">').append(
          baton.data.created
            ? [
                $('<span>').text(util.getDate(baton.data.created)),
                $('<span>').text(' \u2013 ')
              ]
            : [],
          baton.data.createdBy ? coreUtil.renderPersonalName(userData, _.extend({}, baton.data, { nohalo: baton.isConflictView })) : []
        )
      )
    )
  },

  modified (baton) {
    if (!baton.data.lastModified && !baton.data.modifiedBy) return
    // if we don't have an entity, this might be an external creator (federated sharing etc)
    const userData = baton.data.modifiedBy && !baton.data.modifiedBy.entity
      ? {
          $el: $('<span>'),
          name: baton.data.modifiedBy.cn,
          email: baton.data.modifiedBy.email
        }
      : {
          html: userAPI.getTextNode(baton.data.modifiedBy.entity),
          user_id: baton.data.modifiedBy.entity
        }

    this.append(
      $('<tr>').append(
        $('<th>').text(gt('Modified')),
        $('<td class="modified">').append(
          baton.data.lastModified ? [$('<span>').text(util.getDate(baton.data.lastModified))] : [],
          baton.data.lastModified && baton.data.modifiedBy ? $('<span>').text(' \u2013 ') : [],
          baton.data.modifiedBy ? coreUtil.renderPersonalName(userData, _.extend({}, baton.data, { nohalo: baton.isConflictView })) : []
        )
      )
    )
  }

}

export default extensions
