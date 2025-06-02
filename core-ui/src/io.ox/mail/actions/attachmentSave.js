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

import api from '@/io.ox/mail/api'
import yell from '@/io.ox/core/yell'
import picker from '@/io.ox/core/folder/picker'
import folderAPI from '@/io.ox/core/folder/api'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/files/settings'
import gt from 'gettext'

export default {

  multiple (list) {
    const id = settings.get('folderpopup/last') || coreSettings.get('folder/infostore')

    picker({
      async: true,
      button: gt('Save'),
      folder: id,
      module: 'infostore',
      persistent: 'folderpopup',
      root: '9',
      settings,
      title: gt('Save attachment'),
      hideTrashfolder: true,

      done (target, dialog) {
        // do not use "gt.ngettext" for plural without count
        yell('busy', (list.length === 1) ? gt('Saving attachment ...') : gt('Saving attachments ...'))

        api.saveAttachments(list, target).then(
          function (response) {
            const errors = [].concat(response).filter((res) => { return res.error })
            if (errors.length >= 1) {
              errors.forEach((res) => { yell(res.error) })
            } else {
              yell('success', (list.length === 1) ? gt('Attachment has been saved') : gt('Attachments have been saved'))
            }
            folderAPI.reload(target, list)
          },
          // fail
          yell
        )

        dialog.close()
      },

      disable (data) {
        return !folderAPI.can('create', data)
      }
    })
  }
}
