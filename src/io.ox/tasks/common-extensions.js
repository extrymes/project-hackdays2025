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

import ox from '@/ox'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import * as util from '@/io.ox/tasks/util'
import api from '@/io.ox/tasks/api'
import yell from '@/io.ox/core/yell'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const extensions = {

  dueDate: (function () {
    function onClick (e) {
      e.preventDefault()
      const data = e.data.data
      const finderId = $(e.currentTarget).val() || 't'
      ox.load(() => Promise.all([
        import('@/io.ox/backbone/views/modal').then(({ default: ModalDialog }) => ModalDialog)
      ])).then(function ([ModalDialog]) {
        const endTime = util.computePopupTime(finderId, { daysOnly: true }).endDate
        const modifications = {
          end_time: endTime,
          id: data.id,
          folder_id: data.folder_id || data.folder
        }

        // check if startDate is still valid with new endDate, if not, show dialog
        if (data.start_time && data.start_time > endTime) {
          new ModalDialog({
            title: gt('Inconsistent dates'),
            // #. If the user changes the duedate of a task, it may be before the start date, which is not allowed
            // #. If this happens the user gets the option to change the start date so it matches the due date
            description: gt('The due date cannot be before start date. Adjust start date?')
          })
            .addCancelButton()
            .addButton({ label: gt('Adjust start date'), action: 'datechange' })
            .on('cancel', function () { yell('info', gt('Canceled')) })
            .on('datechange', function () {
              modifications.start_time = modifications.end_time
              api.update(modifications).done(function () {
                yell('success', gt('Changed due date'))
              })
            })
            .open()
        } else {
          api.update(modifications).done(function () {
            yell('success', gt('Changed due date'))
          })
        }
      })
    }

    return function (baton) {
      const data = baton.first()

      const $ul = $('<ul class="dropdown-menu" role="menu">')
        .append(
          util.buildDropdownMenu({ bootstrapDropdown: true, daysOnly: true })
        )
        .on('click', 'li > a:not([data-action="close-menu"])', { data }, onClick)

      this.attr({
        'aria-haspopup': 'true',
        'data-action': 'change-due-date',
        'data-toggle': 'dropdown'
      })

      this.append(createIcon('bi/chevron-down.svg').addClass('bi-12 ms-4'))

      new Dropdown({
        el: this.parent(),
        $toggle: this,
        $ul
      }).render()

      this.parent().addClass('dropdown')
    }
  }())
}

export default extensions
