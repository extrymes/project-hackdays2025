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

import _ from '@/underscore'

import api from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

function isFile (o) {
  // isFile is only defined on file models
  return o.isFile && o.isFile()
}

function process (list) {
  const files = list.filter(isFile)
  const folders = list.filter(item => !isFile(item))

  // delete files
  api.remove(files.map(file => file.toJSON())).fail(e => {
    if (e && e.code && e.code === 'IFO-0415') {
      // do not use "gt.ngettext" for plural without count
      yell('error', (list.length === 1)
        ? gt('This file has not been deleted, as it is locked by its owner.')
        : gt('These files have not been deleted, as they are locked by their owner.')
      )
    } else {
      // do not use "gt.ngettext" for plural without count
      const msg = (list.length === 1) ? gt('This file has not been deleted') : gt('These files have not been deleted')
      yell('error', _.noI18n(msg + '\n' + e.error))
    }

    api.trigger('reload:listview')
  })

  // delete folders
  api.trigger('beforedelete', folders.map(folder => folder.toJSON()))
  folderAPI.remove(folders.map(model => model.get('id')))
}

export default function (list) {
  list = Array.isArray(list) ? list : [list]

  // do not use "gt.ngettext" for plural without count
  const deleteNotice = (list.length === 1)
    ? gt('Do you really want to delete this item?')
    : gt('Do you really want to delete these items?')

  // do not use "gt.ngettext" for plural without count
  const shareNotice = (list.length === 1)
    ? gt('This file or folder is shared with others. It will not be available for them anymore.')
    : gt('Some files or folders are shared with others. They will not be available for them anymore.')

  function isShared () {
    const result = list.findIndex(model => {
      return model.get('object_permissions') ? model.get('object_permissions').length !== 0 : model.get('permissions').length > 1
    })

    if (result !== -1) return true
  }

  // #. 'Delete item' and 'Delete items' as a header of a modal dialog to confirm to delete files from drive.
  new ModalDialog({
    // do not use "gt.ngettext" for plural without count
    title: (list.length === 1) ? gt('Delete item') : gt('Delete items'),
    description: isShared() ? shareNotice : deleteNotice
  })
    .addCancelButton()
    .addButton({ label: gt('Delete'), action: 'delete' })
    .on('delete', function () {
      _.defer(function () { process(list) })
    })
    .open()
}
