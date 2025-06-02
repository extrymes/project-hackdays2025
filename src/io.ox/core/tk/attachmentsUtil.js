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
import strings from '@/io.ox/core/strings'
import pre from '@/io.ox/preview/main'
import capabilities from '@/io.ox/core/capabilities'
import ext from '@/io.ox/core/extensions'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

/**
 * duck checks
 * @param  {object} file
 * @return {object}      data
 */
const identify = function (file) {
  let data
  if (file.disp && file.disp === 'attachment') {
    // mail attachment (server)
    data = {
      type: file.type || file.content_type || '',
      module: 'mail',
      group: file.type ? 'file' : 'reference'
    }
  } else if (file.content_type && file.content_type === 'message/rfc822') {
    // forwarded mail (local/server)
    data = {
      type: 'eml',
      module: 'mail',
      group: 'reference'
    }
  } else if (file.display_name || file.email1) {
    // contacts vcard reference (local)
    data = {
      type: 'vcf',
      module: 'contacts',
      group: 'reference'
    }
  } else if (file.id && file.folder_id) {
    // infostore file reference(local)
    data = {
      type: file.type || file.content_type || '',
      module: 'infostore',
      group: 'reference'
    }
  } else if (file instanceof $ && file[0].tagName === 'INPUT') {
    // file input: old mode for IE9 (local)
    data = {
      type: file.val().split('.').length > 1 ? file.val().split('.').pop() : '',
      module: 'mail',
      group: 'input'
    }
  } else if (window.File && file instanceof window.File) {
    // file api elem: upload or dnd (local)
    data = {
      type: file.type || file.content_type || '',
      module: 'any',
      group: 'file'
    }
  }
  return data || {}
}
/**
 * create preview node with attached file property
 * @param  {object}      file      (or wrapper object)
 * @param  {jQuery}      rightside (optional: needed for mail to let the popup check for events in the editor iframe)
 * @return {jQuery.Node}           textnode
 */
const createPreview = function (file, rightside) {
  return !self.hasPreview(file)
    ? $()
    : $('<a href="#" class="attachment-preview">')
      .data({
        file,
        // app: app,
        rightside
      })
      .text(gt('Preview'))
}
const updatePopup = function (popup, content, type) {
  if (type === 'text/plain') {
    // inject image as data-url
    popup.css({ width: '100%', height: '100%' })
      .append(
        $('<div>')
          .css({
            width: '100%',
            height: '100%'
          })
          .html(_.escape(content).replace(/\n/g, '<br>'))
      )
  } else {
    // use content
    popup.css({ width: '100%', height: '100%' })
      .append(
        $('<div>')
          .css({
            width: '100%',
            height: '100%',
            backgroundImage: 'url(' + content + ')',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: 'contain'
          })
      )
  }
}

const self = {
  /**
   * get details
   * @param  {object} file (or wrapper object)
   * @param  {string} key  (optional)
   * @return { any }
   */
  get (obj, key) {
    const file = obj.file ? obj.file : obj
    const data = identify(file)
    return key ? data[key] : data
  },
  /**
   * checks for preview support
   * @param  {object}  file (or wrapper object)
   * @return {boolean}
   */
  hasPreview (file) {
    const data = self.get(file)
    const isImage = (/^image\/(png|gif|jpe?g|bmp)$/i).test(data.type)
    const isText = (/^text\/(plain)$/i).test(data.type)
    let isOffice = false

    if (capabilities.has('text')) {
      // if we have office support let's check those files too
      if (file.file) {
        isOffice = new pre.Preview({ mimetype: file.file.content_type, filename: file.file.filename }).supportsPreview()
      } else {
        isOffice = new pre.Preview({ mimetype: file.content_type, filename: file.filename }).supportsPreview()
      }
    }

    // nested mail
    if (data.type === 'eml') {
      return new pre.Preview({ mimetype: 'message/rfc822', parent: file.parent }).supportsPreview()
      // form input (IE9)
    } else if (data.group === 'input') {
      return false
      // vcard
    } else if (data.group === 'reference') {
      return true
      // local file content via fileReader
    } else if (window.FileReader && (isImage || isText)) {
      return true
      // office
    } else if (isOffice) {
      return true
    }
    // stored file
    return (/(png|gif|jpe?g|bmp)$/i).test(data.type) || (/(txt)$/i).test(data.type)
  },
  /**
   * returns node
   * @param  {object} file    wrapper object
   * @param  {object} options
   * @return {jquery}         node
   */
  node (obj, options) {
    const caller = this
    let icon; let info
    const opt = $.extend({
      showpreview: true,
      rightside: $(),
      labelmax: 30
    }, options)
    // normalisation
    let name = obj.name || obj.filename || obj.subject || '\u00A0'
    let size = obj.file_size || obj.size || 0

    // prepare data
    size = (size !== 0) ? _.noI18n(strings.fileSize(size) + '\u00A0 ') : ''

    if (obj.group !== 'vcard') {
      // default
      icon = createIcon('bi/paperclip.svg')
      info = $('<span class="filesize">').text(size)
    } else {
      // vcard
      icon = createIcon('bi/card-list.svg')
      info = $('<span class="filesize">').text('vCard\u00A0')
      // lazy way; use contactsUtil.getFullName(attachment) for the perfect solution
      name = obj.file.display_name || obj.file.email1 || ''
    }

    // create node
    const $node = $('<div>').addClass(this.itemClasses).append(
      // file
      $('<div class="item file">').addClass(this.fileClasses).append(
        icon,
        $('<div class="row-1">').text(_.ellipsis(name, { max: opt.labelmax, charpos: 'middle' })),
        $('<div class="row-2">').append(
          info,
          opt.showpreview ? createPreview(obj.file, opt.rightside) : $(),
          $.txt('\u00A0')
        ),
        // remove
        $('<a href="#" class="remove">').attr('title', gt('Remove attachment'))
          .append(createIcon('bi/trash.svg'))
          .on('click', function (e) {
            e.preventDefault()
            if (!('remove' in caller)) {
              console.error('Caller should provide a remove function.')
            }
            caller.remove(obj)
          })
      )
    )

    if (options.ref) {
      const fileObj = JSON.parse(JSON.stringify(obj))
      fileObj.name = name
      fileObj.size = size
      ext.point(options.ref).invoke('customize', $node, fileObj)
    }

    return $node
  },

  /**
   * preview handler
   * @param {object} popup
   * @param {object} e
   * @param {object} target
   */
  preview (popup, e, target) {
    e.preventDefault()

    const file = target.data('file')
    const data = self.get(file); let preview; let reader

    // close if editor is selected (causes overlapping, bug 27875)
    if (target.data('rightside')) {
      (target.data('rightside') || $())
        .find('iframe').contents().find('body')
        .one('click', this.close)
    }

    // nested message
    if (data.type === 'eml') {
      preview = new pre.Preview({
        data: { nested_message: file },
        mimetype: 'message/rfc822',
        parent: file.parent
      }, {
        width: popup.parent().width(),
        height: 'auto'
      })
      if (preview.supportsPreview()) {
        preview.appendTo(popup)
        popup.append($('<div>').text('\u00A0'))
      }
      // referenced contact vcard
    } else if (data.module === 'contacts') {
      import('@/io.ox/contacts/view-detail').then(function ({ default: view }) {
        popup.append(view.draw(file))
      })
      // infostore
    } else if (data.module === 'infostore') {
      import('@/io.ox/files/api').then(function ({ default: filesAPI }) {
        const prev = new pre.Preview({
          name: file.filename,
          filename: file.filename,
          mimetype: file.file_mimetype,
          size: file.file_size,
          dataURL: filesAPI.getUrl(file, 'bare'),
          version: file.version,
          id: file.id,
          folder_id: file.folder_id
        }, {
          width: popup.parent().width(),
          height: 'auto'
        })
        if (prev.supportsPreview()) {
          popup.append(
            $('<h4>').addClass('mail-attachment-preview').text(file.filename)
          )
          prev.appendTo(popup)
          popup.append($('<div>').text('\u00A0'))
        }
      })
      // attachments
    } else if (file.atmsgref) {
      import('@/io.ox/mail/api').then(function ({ default: mailAPI }) {
        const pos = file.atmsgref.lastIndexOf('/')
        file.parent = {
          folder_id: file.atmsgref.substr(0, pos),
          id: file.atmsgref.substr(pos + 1)
        }
        const prev = new pre.Preview({
          data: file,
          filename: file.filename,
          source: 'mail',
          folder_id: file.parent.folder_id,
          id: file.parent.id,
          attached: file.id,
          parent: file.parent,
          mimetype: file.content_type,
          dataURL: mailAPI.getUrl(file, 'view')
        }, {
          width: popup.parent().width(),
          height: 'auto'
        })
        if (prev.supportsPreview()) {
          popup.append(
            $('<h4>').addClass('mail-attachment-preview').text(file.filename)
          )
          prev.appendTo(popup)
          popup.append($('<div>').text('\u00A0'))
        }
      })
      // file reader
    } else {
      reader = new FileReader()
      reader.onload = function (e) {
        try {
          return updatePopup(popup, e.target.result, file.type)
        } finally {
          reader = reader.onload = null
        }
      }

      if (file.type === 'text/plain') {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    }
  }

}
export default self
