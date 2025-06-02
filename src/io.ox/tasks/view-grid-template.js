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

import VGrid from '@/io.ox/core/tk/vgrid'
import * as util from '@/io.ox/tasks/util'
import '@/io.ox/tasks/style.scss'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

// grid-based list for portal
const gridTemplate = {
  // main grid template
  main: {
    build () {
      let title, status, endTime, user, progress, privateFlag
      this.addClass('tasks').append(
        $('<div class="first-row">').append(
          title = $('<div class="title" aria-hidden="true">'),
          endTime = $('<span class="end_date" aria-hidden="true">'),
          privateFlag = createIcon('bi/eye-slash.svg').addClass('private-flag').hide()
        ),
        $('<div class="second-row">').append(
          user = createIcon('bi/people.svg').addClass('participants').hide(),
          $('<div class="progress" aria-hidden="true">').hide().append(
            progress = $('<div class="progress-bar" style="width: 0%">')
          ),
          status = $('<span class="status" aria-hidden="true">')
        )
      )

      return { title, private_flag: privateFlag, end_time: endTime, status, user, progress }
    },

    set (task, fields, index, prev, grid) {
      let data = task; let ariaLabel = data.title
      if (!data.badge && data.badge !== '') {
        // check for empty string also to avoid double processing (see bug 36610)
        // data needs to be processed first
        data = util.interpretTask(task, { noOverdue: grid.prop('sort') !== 'urgency' })
      }

      // important. with addClass old classes aren't removed correctly
      fields.status.attr('class', 'status ' + data.badge)
        .text(data.status || '\u00A0')
      ariaLabel = ariaLabel + ', ' + data.status

      fields.title.text(data.title)
      if (!task.full_time) {
        fields.title.addClass('not-fulltime')
      }
      fields.end_time.text(data.end_time)

      if (task.end_time) {
        // #. followed by date or time to mark the enddate of a task
        ariaLabel = ariaLabel + ', ' + gt('ends:') + ' ' + util.getSmartEnddate(task)
      }

      if (data.participants && data.participants.length) {
        fields.user.show()
        // #. message for screen readers in case selected task has participants
        ariaLabel = ariaLabel + ', ' + gt('has participants')
      } else {
        fields.user.hide()
      }

      if (data.private_flag) {
        fields.private_flag.show()
        ariaLabel = ariaLabel + ', ' + gt('private')
      } else {
        fields.private_flag.hide()
      }

      if (data.percent_completed > 0 && data.percent_completed < 100) {
        fields.progress.css('width', data.percent_completed + '%').parent().show()
        // #. %1$s how much of a task is completed in percent, values from 0-100
        // #, c-format
        ariaLabel = ariaLabel + ', ' + gt('Progress %1$s %', data.percent_completed)
      } else {
        fields.progress.parent().hide()
      }

      this.attr({
        'data-index': index,
        'aria-label': ariaLabel + '.'
      })
    }
  },

  drawSimpleGrid (taskList) {
    // use template
    const tmpl = new VGrid.Template({
      tagName: 'li',
      defaultClassName: 'vgrid-cell list-unstyled'
    })
    const $div = $('<div>')

    // add template
    tmpl.add(gridTemplate.main)

    _(taskList).each(function (data, i) {
      const clone = tmpl.getClone()
      clone.update(data, i)
      clone.appendTo($div).node
        .attr('data-cid', _.cid(data))
        .css('position', 'relative')
        .data('object-data', data)
        .addClass('hover')
    })

    return $div
  }
}
export default gridTemplate
