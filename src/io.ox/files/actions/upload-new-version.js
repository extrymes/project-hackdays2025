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

import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import attachments from '@/io.ox/core/tk/attachments'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

export default function (data) {
  /**
   * notifications lazy load
   */
  function notify () {
    const self = this; const args = arguments
    yell.apply(self, args)
  }

  // Check if previous file was encrypted
  function isEncrypted () {
    return (data.meta && data.meta.Encrypted)
  }

  /**
   * Process the upload of the new version.
   *
   * @param  {File}           file           The file object to upload.
   * @param  {string}         [comment = ''] The version comment (optional).
   * @return {jQuery.Promise}                The upload result promise.
   */
  function process (file, comment) {
    if (!file) { return $.Deferred().reject() }
    const obj = {
      file,
      id: data.id,
      folder: data.folder_id,
      version_comment: comment || '',
      params: isEncrypted() ? { cryptoAction: 'Encrypt' } : {} // If previous file encrypted new version should also be
    }

    if (folderAPI.pool.getModel(data.folder_id).supports('extended_metadata')) {
      obj.version_comment = comment || ''
    }
    return filesAPI.versions.upload(obj)
      .fail(notify)
  }

  const $input = attachments.fileUploadWidget({
    multi: false,
    buttontext: gt('Select file')
  }).addClass('inline-block p-4 pb-8')
    // workaround: fileUploadWidget is clipping the overflow, use padding and transform
    // to make the button focus visible while keeping the button aligned
    .css('transform', 'translate(-4px,0)')

  const guid = _.uniqueId('form-control-label-')
  const $description = $('<div>').append(
    $('<label>').attr('for', guid).text(gt('Version comment')),
    $('<textarea rows="6" class="form-control">').attr('id', guid)
  )

  const filename = $('<div class="form-group">').css('font-size', '14px').hide()

  new ModalDialog({ title: gt('Upload new version'), async: true })
    .build(function () {
      this.$body.append(
        $input.on('change', function () {
          if ($input.find('input[type="file"]')[0].files.length === 0) {
            filename.text('').hide()
          } else {
            filename.text($input.find('input[type="file"]')[0].files[0].name).show()
          }
        }),
        filename,
        folderAPI.pool.getModel(data.folder_id).supports('extended_metadata') ? $description : ''
      )
    })
    .addCancelButton()
    .addButton({ label: gt('Upload'), action: 'upload' })
    .on('upload', function () {
      const $node = this.$body
      const files = $node.find('input[type="file"]')[0].files
      const comment = (folderAPI.pool.getModel(data.folder_id).supports('extended_metadata') ? $node.find('textarea').val() : '')

      process(_.first(files), comment).then(this.close, this.idle)
        .fail(function () {
          if (files.length === 0) notify('info', gt('You have to select a file to upload.'))
          _.defer(function () { $node.focus() })
        })
    })
    .open()
};
