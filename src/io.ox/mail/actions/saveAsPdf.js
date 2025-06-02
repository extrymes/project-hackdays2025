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

import picker from '@/io.ox/core/folder/picker'
import folderApi from '@/io.ox/core/folder/api'
import mailApi from '@/io.ox/mail/api'
import filesApi from '@/io.ox/files/api'
import gt from 'gettext'
import yell from '@/io.ox/core/yell'

function hasBlockedImages (baton) {
  const threadView = baton?.threadView || baton?.app?.threadView
  if (threadView?.collection.models[0]) return threadView.collection.models[0].hasBlockedExternalImages
  const mail = baton.first()
  return mail.view === 'noimg' && mail.modified === 1
}

export default function openDialog (baton) {
  const mail = baton.first()
  picker({
    button: gt('Save'),
    module: 'infostore',
    persistent: 'folderpopup',
    root: folderApi.getDefaultFolder('infostore'),
    title: gt('Choose folder'),
    async: true,
    addClass: 'pdf-export-picker',

    done (driveFolderId, dialog) {
      dialog.busy(true)
      // breaks unit tests if done via css
      dialog.$('.modal-content').css('height', 'auto')

      mailApi.saveAsPDF({
        mailId: mail.id,
        mailFolderId: mail.folder_id,
        driveFolderId,
        includeExternalImages: !hasBlockedImages(baton),
        callback () {
          dialog.close()
          yell('info', gt('PDF file is being created. This might take a while.'))
        }
      }).then(
        (pdfId) => {
          filesApi.propagate('add:file', { id: pdfId, folder: driveFolderId })
          yell('success', gt('PDF file was created successfully.'))
        },
        (error) => {
          console.error(error)
          yell('error', gt('Could not create PDF file.'))
        })
        .always(dialog.close)
    },

    disable (data, options) {
      return !folderApi.can('create', data) || (options && /^virtual/.test(options.folder))
    }
  })
}
