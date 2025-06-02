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

import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import api from '@/io.ox/tasks/api'

import gt from 'gettext'

export default function (data) {
  const numberOfTasks = data.length

  // build popup
  const popup = new ModalDialog({
    // do not use "gt.ngettext" for plural without count
    title: (numberOfTasks === 1)
      // #. header for a modal dialog to confirm the deletion of one task
      ? gt('Delete task')
      // #. header for a modal dialog to confirm the deletion of multiple tasks
      : gt('Delete tasks'),
    // do not use "gt.ngettext" for plural without count
    description: (numberOfTasks === 1)
      ? gt('Do you really want to delete this task?')
      : gt('Do you really want to delete these tasks?'),
    async: true
  })
    .addCancelButton()
    .addButton({ label: gt('Delete'), action: 'deleteTask' })
    .on('deleteTask', function () {
      api.remove(data).done(function () {
        // do not use "gt.ngettext" for plural without count
        yell('success', (numberOfTasks === 1)
          ? gt('Task has been deleted')
          : gt('Tasks have been deleted')
        )
        popup.close()
      })
        .fail(function (result) {
          if (result.code === 'TSK-0019') { // task was already deleted somewhere else. everythings fine, just show info
            yell('info', gt('Task has been deleted already'))
          } else if (result.error) {
            // there is an error message from the backend
            popup.idle()
            yell('error', result.error)
          } else {
            // show generic error message
            // do not use "gt.ngettext" for plural without count
            yell('error', (numberOfTasks === 1)
              ? gt('The task could not be deleted.')
              : gt('The tasks could not be deleted.')
            )
          }
          popup.idle().close()
        })
    }).open()
}
