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
import * as util from '@/io.ox/calendar/util'
import '@/io.ox/core/tk/reminder-util.scss'
import moment from '@open-xchange/moment'

import gt from 'gettext'

function buildActions (node, values) {
  const guid = _.uniqueId('reminder-label-')
  node.append(
    $('<label>').text(gt('Remind me again')).attr('for', guid),
    $('<select class="dateselect" data-action="selector">').attr('id', guid).append(function () {
      let ret = '<option value="0">' + gt("Don't remind me again") + '</option>'
      for (let i = 0; i < values.length; i++) {
        ret += '<option value="' + values[i][0] + '">' + values[i][1] + '</option>'
      }
      return ret
    // prevent opening of detail view when using the select box
    }).on('click', e => e.stopPropagation()),
    $('<button type="button" class="btn btn-primary btn-sm remindOkBtn" data-action="ok">').text(gt('OK'))
  )
}

const draw = function (node, model, options, taskMode) {
  node.forwardPopupClick()
  let info
  // aria label
  let label
  const actions = $('<div class="reminder-actions">')

  // find out remindertype
  if (taskMode) {
    node.attr({ 'data-detail-popup': 'task' })
    // task
    info = $('<a class="notification-info" role="button">').append(
      $('<span class="span-to-div title">').text(model.get('title')),
      $('<span class="span-to-div info-wrapper">').append(
        $('<span class="end_date">').text(model.get('end_time')),
        $('<span class="status pull-right">').text(model.get('status')).addClass(model.get('badge'))
      ),
      $('<span class="sr-only">').text(gt('Press to open Details'))
    )

    // #. %1$s task title
    // #, c-format
    label = gt('Reminder for task %1$s.', model.get('title'))
  } else {
    node.attr({ 'data-detail-popup': 'appointment' })
    const strings = util.getDateTimeIntervalMarkup(model.attributes, { output: 'strings', zone: moment().tz() })
    // appointment
    info = $('<a class="notification-info" role="button">').append(
      $('<span class="span-to-div time">').text(strings.timeStr),
      $('<span class="span-to-div date">').text(strings.dateStr),
      $('<span class="span-to-div title">').text(model.get('summary')),
      $('<span class="span-to-div location">').text(model.get('location')),
      $('<span class="sr-only">').text(gt('Press to open Details'))
    )
    // #. %1$s appointment title
    // #, c-format
    label = gt('Reminder for appointment %1$s.', model.get('summary'))
  }

  node.attr({
    'data-cid': model.get('cid'),
    'model-cid': model.cid,
    'aria-label': label,
    role: 'listitem',
    tabindex: 0
  }).addClass('reminder-item clearfix')
  buildActions(actions, options, model)

  node.append(info, actions)
}

export default { draw }
