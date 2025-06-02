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

// cSpell:ignore saveas

import $ from '@/jquery'
import _ from '@/underscore'

import FolderApi from '@/io.ox/core/folder/api'
import FilesApi from '@/io.ox/files/api'
import { validateFilename } from '@/io.ox/files/util'
import ModalDialog from '@/io.ox/backbone/views/modal'
import ConverterUtils from '@/io.ox/core/tk/doc-converter-utils'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/files/settings'
import gt from 'gettext'

export default function (baton) {
  const model = baton.models[0]
  const isAccessWrite = FolderApi.can('create', FolderApi.pool.models[model.get('folder_id')].toJSON())

  let filename = model.getDisplayName()
  const len = filename.length
  const idx = filename.lastIndexOf('.')
  filename = filename.substring(0, ((idx >= 0) ? idx : len))

  let errorMessage

  // notifications lazy load
  function notify () {
    const self = this
    const args = arguments
    yell.apply(self, args)
  }

  function save (name) {
    const fileOptions = {
      documentformat: 'pdf',
      saveas_filename: name + '.pdf',
      saveas_folder_id: (isAccessWrite ? model.get('folder_id') : settings.get('folder/documents'))
    }
    return ConverterUtils.sendConverterRequest(model, fileOptions)
      .done(function (response) {
        if (('id' in response) && ('filename' in response)) {
          /*
           * fixing Bug #63558 ... "Save as pdf:=> JQuery exception"
           *
           * - rejected promise was due to not providing `FilesApi.trigger`
           * with a minimal viable file descriptor which was expected with
           * introducing `api.on('add:file add:version', preconvertPDF);`
           * as of "ui/io.ox/files/main.js"
           */
          FilesApi.trigger('add:file', { id: response.id, folder_id: fileOptions.saveas_folder_id })

          if (!isAccessWrite) {
            notify('info', gt('The PDF has been saved to "/drive/myfiles/documents" due to not having write access for the current folder.'))
          }
        } else {
          errorMessage = ConverterUtils.getErrorTextFromResponse(response) || ConverterUtils.getErrorText('importError')
          notify('error', errorMessage)
        }
      })
      .fail(function (response) {
        notify('error', ConverterUtils.getErrorTextFromResponse(response))
      })
  }

  /**
   * user have to confirm if name doesn't contains a file extension
   * @return {jQuery.Promise}
   */
  function process (name) {
    const warnings = validateFilename(name)

    if (warnings.length) {
      warnings.forEach(warning => notify('warning', warning))
      return $.Deferred().reject()
    }

    // show confirm dialog if necessary
    return save.call(this, name)
  }

  new ModalDialog({ title: gt('Save as PDF'), enter: 'save', async: true })
    .build(function () {
      this.$body.append(
        this.$input = $('<input type="text" name="name" class="form-control">')
      )
      this.$input.focus().val(filename).get(0).setSelectionRange(0, filename.lastIndexOf('.'))
    })
    .addCancelButton()
    .addButton({ label: gt('Save'), action: 'save' })
    .on('save', function () {
      const name = this.$input.val()
      process(name).then(this.close, this.idle).fail(function () {
        _.defer(function () { this.$input.focus() })
      })
    })
    .open()
};
