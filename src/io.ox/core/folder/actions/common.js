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
import mailAPI from '@/io.ox/mail/api'
import folderAPI from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import account from '@/io.ox/core/api/account'
import http from '@/io.ox/core/http'
import apps from '@/io.ox/core/api/apps'

import gt from 'gettext'

export default {

  selectOnly (e) {
    const app = apps.get('io.ox/calendar')
    if (app.folders.isSingleSelection()) app.folders.reset()
    else app.folders.setOnly(e.data.folder.id)
  },

  refreshCalendar (e) {
    yell('warning', gt('Refreshing calendar might take some time...'))
    import('@/io.ox/calendar/api').then(function ({ default: calendarApi }) {
      calendarApi.refreshCalendar(e.data.folder.id).then(function () {
        yell('success', gt('Successfully refreshed calendar'))
      }, yell).always(function () {
        folderAPI.pool.unfetch(e.data.folder.id)
        folderAPI.refresh()
      })
    })
  },

  markFolderSeen (e) {
    mailAPI.allSeen(e.data.folder)
  },

  moveAll (source) {
    ox.load(() => import('@/io.ox/core/folder/actions/move')).then(function ({ default: move }) {
      move.all({ button: gt('Move all'), source })
    })
  },

  expunge (id) {
    yell('busy', gt('Cleaning up ...'))
    mailAPI.expunge(id).done(function () {
      yell('success', gt('The folder has been cleaned up.'))
    })
  },

  clearFolder: (function () {
    function clear (id, module) {
      folderAPI.clear(id).done(function () {
        yell('success', getMessage(module))
      })
    }

    function getMessage (module) {
      switch (module) {
        case 'mail': return gt('All messages have been deleted')
          // dedicated message for drive because "empty" does not remove folders
        case 'infostore': return gt('All files have been deleted')
        default: return gt('The folder has been emptied')
      }
    }

    return function (id) {
      folderAPI.get(id).done(function (folder) {
        // #. 'Delete all messages' as header et´´text to confirm to empty a selected folder and delete all messages via a modal dialog.
        new ModalDialog({ title: gt('Delete all messages'), description: gt('Do you really want to empty folder "%s"?', folderAPI.getFolderTitle(folder.title, 30)) })
          .addCancelButton()
        // #. empty is a verb in this case. Used when the contents of a folder should be deleted
          .addButton({ label: gt('Empty folder'), action: 'delete' })
          .on('delete', function () {
            if (account.is('spam|confirmed_spam', id)) {
              http.pause()
              mailAPI.allSeen(id)
              clear(id, folder.module)
              http.resume()
            } else {
              clear(id, folder.module)
            }
          })
          .open()
      })
    }
  }())
}
