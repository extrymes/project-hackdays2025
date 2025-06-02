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
import DisposableView from '@/io.ox/backbone/views/disposable'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import attachmentAPI from '@/io.ox/core/api/attachment'
import { getHumanReadableSize } from '@/io.ox/core/strings'
import capabilities from '@/io.ox/core/capabilities'
import '@/io.ox/core/pim/actions'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const CalendarActionDropdownView = ActionDropdownView.extend({
  tagName: 'li',
  className: 'flex-row zero-min-width pull-right'
})

function AttachmentList (options) {
  const self = this
  _.extend(this, {

    draw (baton) {
      if (self.processArguments) {
        baton = self.processArguments.apply(this, $.makeArray(arguments))
      }

      const $node = $('<ul class="attachment-list view list-unstyled">').appendTo(this)

      function drawAttachment (list, title, filesize) {
        if (options.module === 1) {
          list = list.map(function (att) {
            // files api can only handle old folder ids
            // TODO: check if that can be changed
            // until then cut off the additional cal://0/ etc from the folder
            att.folder = baton.model.get('folder').split('/')
            att.folder = att.folder[att.folder.length - 1]
            att.module = 1
            att.attached = parseInt(baton.model.get('id'), 10)
            att.model = baton.model
            return att
          })
        }
        const dropdown = new CalendarActionDropdownView({
          point: 'io.ox/core/tk/attachment/links',
          title: title || list.filename,
          data: list,
          customize () {
            if (dropdown.disposed) return
            const node = this
            const icon = node.find('svg')
            const text = node.text().trim()
            const size = filesize > 0 ? getHumanReadableSize(filesize, 0) : '\u00A0'
            node.addClass('attachment text-left bg-dark zero-min-width py-8 flex-grow').text('').append(
              // no template string here because filename is user content and could cause XSS
              $('<div class="filename ellipsis flex-grow mr-4">').attr('title', text).text(text),
              $('<div class="filesize text-gray pl-4">').text(size),
              icon
            )
            // use normal size for 'All attachments'
            if (list.length > 1) {
              dropdown.$el.removeClass('pull-right')
              node.removeClass('flex-grow')
            }
          }
        })
        dropdown.$toggle.attr('tabindex', null)
        $node.append(dropdown.$el)
      }

      function redraw (e, obj) {
        const callback = function (attachments) {
          if (!attachments.length) return $node.append(gt('None'))
          attachments.forEach(a => drawAttachment([a], a.filename, a.size))
          if (attachments.length > 1) {
            drawAttachment(attachments, gt('All attachments'))
          }
        }

        if (obj && (obj.module !== options.module || obj.id !== baton.data.id || obj.folder !== (baton.data.folder || baton.data.folder_id))) {
          return
        }

        if (options.module === 1) {
          callback(baton.model.get('attachments'))
          return
        }
        $node.empty()
        attachmentAPI.getAll({
          module: options.module,
          id: baton.data.id,
          folder: baton.data.folder || baton.data.folder_id
        }).done(callback)
      }

      attachmentAPI.on('attach detach', redraw)
      $node.on('dispose', function () {
        attachmentAPI.off('attach detach', redraw)
      })

      redraw()
    }

  }, options)
}

export const fileUploadWidget = function (options) {
  options = _.extend({
    buttontext: gt('Add attachments'),
    drive: false,
    multi: true,
    icon: ''
  }, options)

  const node = $('<div class="btn-file-wrapper">')
  const id = _.uniqueId('form-control-label-')

  // #. Used as button label when adding an attachment from the 'drive' app
  // #. %1$s: name of 'drive' app
  const driveButton = $('<button type="button" class="btn btn-default" data-action="add-internal">').text(gt('Add from %1$s', gt.pgettext('app', 'Drive')))
  const input = $(`<input name="file" type="file" class="file-input" aria-labelledby="${id}" ${options.multi ? 'multiple="true"' : ''} tabindex="-1">`)
  const uploadButton = $(`<button type="button" id="${id}" class="btn btn-default btn-file">`).append(
    options.icon ? createIcon('bi/plus-circle.svg') : $(),
    $.txt(options.buttontext)
  )

  // event handlers
  input.on({
    'focus input': () => uploadButton.addClass('active'),
    'blur input ': () => uploadButton.removeClass('active')
  })

  if (options.drive && _.device('!smartphone') && capabilities.has('infostore')) {
    node.append(
      $('<div class="btn-group">').append(uploadButton, input, driveButton)
    )
  } else {
    node.append(uploadButton, input)
  }

  uploadButton.on({
    click: e => {
      if (!$(e.target).is('button')) return
      // Note: BUG #55335 - Filepicker fails to open in Firefox
      if (e.type === 'click' || /^(13|32)$/.test(e.which)) {
        e.preventDefault()
        input.focus() // Note: BUG #34034 - FF needs to focus the input-element first
        input.trigger('click')
        uploadButton.focus() // Reset focus to button
      }
    }
  })

  return node
}

const ProgressView = DisposableView.extend({
  className: 'attachments-progress-view ml-12',
  // #. headline for a progress bar
  label: gt('Uploading attachments'),
  initialize (options) {
    const self = this
    // cid needed (create with _.ecid)
    this.objectCid = options.cid
    attachmentAPI.on('progress:' + this.objectCid, this.updateProgress.bind(self))

    options = options || {}
    this.label = options.label || this.label
    this.callback = options.callback || $.noop
  },
  render () {
    this.$el.append($('<label>').text(this.label),
      $('<div class="progress">').append(this.progress = $('<div class="progress-bar">'))
    )
    // for chaining
    return this
  },
  updateProgress (e, progressEvent) {
    if (!progressEvent.total || !this.progress) return

    const width = Math.max(0, Math.min(100, Math.round(progressEvent.loaded / progressEvent.total * 100)))

    this.progress.css('width', `${width}%`)
    if (width !== 100) return
    this.callback()
  },
  dispose () {
    attachmentAPI.off(`progress:${this.objectCid}`)
  }
})

export default {
  AttachmentList,
  fileUploadWidget,
  ProgressView
}
