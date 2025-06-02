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
import Backbone from '@/backbone'

import ModalDialog from '@/io.ox/backbone/views/modal'
import fileUpload from '@/io.ox/files/upload/main'
import ext from '@/io.ox/core/extensions'
import strings from '@/io.ox/core/strings'
import '@/io.ox/files/upload/style.scss'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

let INDEX = 0
const UploadEntry = Backbone.View.extend({
  initialize (baton) {
    const self = this

    this.dialog = baton.dialog
    this.model = baton.model
    this.index = baton.index

    this.model.on('change:progress', function () {
      const val = Math.round(self.model.get('progress') * 100)

      if (self.model.get('progress') === 1) {
        // upload is finished
        self.$el.find('.progress').addClass('invisible')
        self.$el.find('.remove-icon')
          .off('click')
          .empty()
          .append(createIcon('bi/check-lg.svg'))
      } else {
        const progress = self.$el.find('.progress-bar')
        progress
          .css({ width: val + '%' })
          .attr({ 'aria-valuenow': val })
        progress.find('.sr-only').text(
          // #. %1$s progress of currently uploaded files in percent
          gt('%1$s completed', val + '%')
        )
      }
    })

    this.model.on('change:abort', function (object, val) {
      if (val) {
        const parent = self.$el.parent()

        self.remove()

        const list = parent.find('.upload-entry')
        list.each(function (counter, el) {
          $(el).attr({ index: counter })
        })

        if (list.length === 0) {
          self.dialog.close()
        }
      }
    })
  },
  render () {
    const val = Math.round(this.model.get('progress') * 100)
    const removeIcon = $('<div class="remove-icon">')

    this.$el.attr('data-cid', this.model.cid)
      .addClass('upload-entry')
      .append(
        $('<div class="file-name">').text(this.model.get('file').name),
        $('<div class="file-size">').text(_.noI18n(strings.fileSize(this.model.get('file').size) + '\u00A0')),
        removeIcon,
        $('<div class="progress">').addClass(this.model.get('progress') < 1 ? '' : 'invisible').append(
          $('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">')
            .attr('aria-valuenow', val)
            .css({ width: val + '%' })
            .append(
              $('<span class="sr-only">').text(
                // #. %1$s progress of currently uploaded files in percent
                gt('%1$s completed', val + '%')
              )
            )
        )
      )

    if (this.model.get('progress') < 1) {
      removeIcon.append(
        $('<a href=# class="remove-link">').text(gt('Cancel'))
      )
    } else {
      removeIcon.append(
        createIcon('bi/check-lg.svg')
      )
    }
  },
  events: {
    'click .remove-link': 'removeEntry'
  },
  removeEntry (e) {
    e.preventDefault()
    fileUpload.abort(this.$el.attr('data-cid'))
  }
})
const show = function () {
  const container = $('<div class="view-upload-wrapper">')

  const dialog = new ModalDialog({ title: gt('Upload progress') })
    .addButton({ label: gt('Close'), action: 'close' })
    .build(function () {
      this.$body.append(
        container
      )
    })
    .on('close', function () {
      fileUpload.collection.each(function (model) {
        // remove all change listeners from the models in the collection
        model.off('change:progress')
        model.off('change:abort')
      })
    })
    .open()

  ext.point('io.ox/files/upload/files').invoke('draw', container, { collection: fileUpload.collection, dialog })
}

ext.point('io.ox/files/upload/files').extend({
  index: INDEX += 100,
  id: 'files',
  draw (baton) {
    baton.container = this

    baton.collection.each(function (model, index) {
      const entry = new UploadEntry(
        _.extend(baton, { model, index })
      )

      entry.render()
      baton.container.append(entry.el)
    })
  }
})

export default { show }
