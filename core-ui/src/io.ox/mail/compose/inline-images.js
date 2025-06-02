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
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import attachments from '@/io.ox/core/tk/attachments'
import yell from '@/io.ox/core/yell'
import http from '@/io.ox/core/http'

import gt from 'gettext'

const api = {
  inlineImage (data) {
    try {
      const editor = data.editor || (window.tinyMCE && window.tinyMCE.activeEditor)
      if ('FormData' in window) {
        // image broken, don't upload it and show error message
        if (data.file.size === 0 && data.file.type === '' && !data.file.name) {
          // #. broken image inside a mail
          return $.Deferred().reject({ error: {}, message: gt('One of the embedded images could not be used.') })
        }
        const formData = new FormData()
        // avoid the generic blob filename
        if (!data.file.name) {
          const type = data.file.type.replace('image/', '') || 'png'
          formData.append('file', data.file, 'image.' + type)
        } else {
          formData.append('file', data.file)
        }
        return http.UPLOAD({
          module: 'file',
          params: { action: 'new', module: 'mail', type: 'image' },
          data: formData,
          fixPost: true
        }).done(function (response) {
          // used to add the keepalive timers
          if (!editor) return
          $(editor.getElement()).trigger('addInlineImage', response.data[0])
        })
      }
      return http.FORM({
        module: 'file',
        form: data.form,
        params: { module: 'mail', type: 'image' }
      }).done(function (response) {
        // used to add the keepalive timers
        if (!editor) return
        $(editor.getElement()).trigger('addInlineImage', response.data[0])
      })
    } catch (e) {
      // print error to console for debugging
      console.debug(e)
      // #. generic error message if inserting an image into a mail failed.
      return $.Deferred().reject({ error: e, message: gt('Error while uploading your image') })
    }
  },
  getInsertedImageUrl: function (data) {
    const url = ox.apiRoot + '/file'
    const urlParams = $.param({
      action: 'get',
      id: data.data[0],
      session: ox.session
    })
    return url + '?' + urlParams
  }
}

const POINT = 'io.ox/mail/compose/inline-images/'

ext.point(POINT + 'title').extend({
  id: 'default',
  draw () {
    this.$title.text(gt('Insert inline image'))
  }
})

ext.point(POINT + 'file_upload').extend({
  id: 'default',
  draw (baton) {
    baton.$.file_upload = attachments.fileUploadWidget()
    this.append(
      baton.$.file_upload
    )
  }
})

ext.point(POINT + 'buttons').extend({
  id: 'default',
  draw () {
    this.addCancelButton()
      .addButton({ label: gt('Insert'), action: 'insert' })
  }
})

export default {
  api,
  show () {
    const dialog = new ModalDialog({ async: true })
    const baton = new ext.Baton({ $: {} })
    const def = $.Deferred()
    let form

    dialog.build(function () {
      form = $('<form accept-charset="UTF-8" enctype="multipart/form-data" method="POST">')
      this.$body.append(form)

      ext.point(POINT + 'title').invoke('draw', this.$title, baton)
      ext.point(POINT + 'file_upload').invoke('draw', form, baton)
      ext.point(POINT + 'buttons').invoke('draw', this, baton)

      this.$el.addClass('inline-images').parent().css('z-index', 999999) // Get high!;
    })
    dialog.on('insert', function () {
      const file = baton.$.file_upload.find('input[type=file]')
      const popup = this
      const failHandler = function (data) {
        if (data && data.error) {
          yell('error', data.error)
        }
        popup.idle()
      }

      popup.busy()

      if (!(/\.(gif|bmp|tiff|jpe?g|gmp|png|heic?f?)$/i).test(file.val())) {
        yell('error', gt('Please select a valid image File to insert'))
        popup.idle()
        def.reject()
      } else {
        return api.inlineImage({
          file: file[0].files ? file[0].files[0] : [],
          form
        }).then(function (data) {
          popup.close()
          def.resolve(api.getInsertedImageUrl(data))
        }).fail(failHandler)
      }
    })
      .open()
    return def
  }
}
