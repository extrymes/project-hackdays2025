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

import api from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import gt from 'gettext'

function handler (id, options) {
  api.remove(id, options).fail(function (error) {
    // special errormessage, backend message will confuse user (reads could not create folder on a remove action)
    // happens when yu try to delete a special system folder from an external account
    if (error && error.code === 'IMAP-2015') {
      yell('error', gt('Could not delete folder. This can be due to insufficient permissions in your trash folder or this might be a special folder that cannot be deleted.'))
      return
    }
    yell(error)
  })
}

export default function (id, options) {
  // #. 'Delete calendar' and 'Delete folder' as header of modal dialog to delete a shared calendar or folder.
  const model = api.pool.getModel(id)
  const deleteTitle = model.get('module') === 'calendar' ? gt('Delete calendar') : gt('Delete folder')
  const deleteNotice = model.get('module') === 'calendar' ? gt('Do you really want to delete calendar "%s"?', model.get('title')) : gt('Do you really want to delete folder "%s"?', model.get('title'))
  const shareNotice = model.get('module') === 'calendar' ? gt('This calendar is shared with others. It won\'t be available for them any more.') : gt('This folder is shared with others. It won\'t be available for them any more.')

  new ModalDialog({ title: deleteTitle, description: model.get('permissions').length > 1 ? shareNotice : deleteNotice })
    .addCancelButton()
    .addButton({ label: gt('Delete'), action: 'delete' })
    .on('delete', function () { handler(id, options) })
    .open()
};
