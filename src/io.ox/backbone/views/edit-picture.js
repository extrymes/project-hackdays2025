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
import { device } from '@/browser'
import Backbone from '@/backbone'

import ModalDialog from '@/io.ox/backbone/views/modal'
import capture from '@/io.ox/backbone/views/capture-media'
import mediaDevices from '@/io.ox/core/media-devices'
import { settings as coreSettings } from '@/io.ox/core/settings'
import { createIcon } from '@/io.ox/core/components'

import 'croppie/croppie.min.js'
import 'croppie/croppie.css'
import '@/io.ox/backbone/views/edit-picture.scss'
import gt from 'gettext'

export default {

  getDialog (opt) {
    return new ModalDialog({
      title: opt.title || gt('Change photo'),
      point: 'io.ox/backbone/crop',
      width: device('!smartphone') ? '35rem' : '',
      async: true,
      model: opt.model || new Backbone.Model(),
      focus: 'button[data-action="upload"]'
    })
      .inject({
        load () {
          // used for standalone version of pictureUpload
          this.model.set('save', false)
          return $.when()
            .then(() => {
              let file = this.model.get('pictureFile')
              if (_.isFunction(file)) file = file()
              return file
            })
            .then((file) => {
              let imageUrl = this.model.get('image1_url')
              // add unique identifier to prevent caching bugs
              if (imageUrl) imageUrl = imageUrl + '&' + $.param({ uniq: Date.now() })
              // a) dataUrl (webcam photo)
              if (_.isString(file)) return file
              // b) server image (or blank)
              if (!file || !file.lastModified) return imageUrl
              // c) local file
              return getContent(file)
            })
            .then(this.setImage.bind(this))
            .fail(() => {
              this.$errormsg.show()
              this.model.unset('pictureFile')
              this.load()
            })
        },
        storeState (opt) {
          const current = { ...this.model.get('crop'), ...this.$body.croppie('get') }
          // degree value TO croppie's orientation ids
          if (opt && opt.rotate) current.orientation = mapOrientation(current.orientation)
          this.model.set('crop', current)
        },
        setImage (imageUrl) {
          this.toggleEmpty(!imageUrl)
          // restore latest state
          const options = { zoom: 0.0, ...this.model.get('crop'), url: imageUrl }
          if (!imageUrl) return
          this.$('.cr-boundary, .cr-slider-wrap').show()
          return this.$body.croppie('bind', options)
        },
        toggleEmpty (empty) {
          this.$el.toggleClass('empty', empty)
          this.$body.find('button, :input').prop('disabled', empty)
        },
        onApply () {
          const width = coreSettings.get('properties/contactImageMaxWidth', 500)
          this.storeState()
          this.$body
            .croppie('result', { type: 'blob', size: { width }, format: 'jpeg', quality: 1.0, circle: false })
            .then(function (blob) {
              // store info
              const scaled = new window.File([blob], 'cropped.jpeg', { type: 'image/jpeg' })
              // trigger proper change events
              this.model.unset('pictureFileEdited', { silent: true })
              this.model.set('pictureFileEdited', scaled)
              // dialog
              this.idle()
              this.close()
            }.bind(this))
        },
        onRemovePhoto () {
          this.idle()
          this.toggleEmpty(true)
          this.model.unset('pictureFile')
        },
        onCancel () {
          // restore initial state of the model
          this.model.set(this.model.initialState)
          delete this.model.initialState
          this.idle()
        },
        onUserMedia () {
          capture.getDialog().open().on('ready', function (dataURL) {
            this.model.set('pictureFile', dataURL)
            this.setImage(dataURL)
          }.bind(this))
        },
        onRotate (deg) {
          this.$body.croppie('rotate', deg)
          this.storeState({ rotate: true })
        }
      })
      .extend({
        toolbar () {
          this.$header.append(
            $('<div class="upper-toolbar">').append(
              $('<button type="button" class="btn btn-default" data-action="upload">').text(gt('Upload a photo')),
              mediaDevices.isSupported()
                ? $('<button type="button" class="btn btn-default" data-action="usermedia">').text(gt('Take a photo'))
                : $()
            )
              .on('click', 'button', function (e) {
                this.trigger('action', $(e.currentTarget).data('action'))
              }.bind(this))
          )
        },
        errormsg () {
          this.$errormsg = $('<p class="alert alert-danger">')
            .append(gt('Unable to set image. Image might be too large or malformed.'))
            .append($('<span class="sr-only">').text(gt('Image was reset to previous image.')))
            .hide()

          this.$body.append($('<div role="alert">').append(this.$errormsg))
        },
        default () {
          this.$el.addClass('edit-picture')
          // reserve some more space for the stacked buttons on small devices
          // boundary is outer dark area, viewort is the visible part of the image.
          let boundaryWidth, boundaryHeight, viewport
          if (device('small')) {
            boundaryWidth = '100%'
            boundaryHeight = 240
            viewport = 180
          } else {
            boundaryWidth = '100%'
            boundaryHeight = 360
            viewport = 320
          }
          const options = {
            viewport: { width: viewport, height: viewport, type: 'circle' },
            boundary: { width: boundaryWidth, height: boundaryHeight },
            showZoomer: true,
            enableResize: false,
            enableOrientation: true
          }
          this.$body.croppie(options)
        },
        'slider-label' () {
          const $body = this.$body
          // increase step size and add slider label
          const id = _.uniqueId('slider-')
          $body.on('update', update)
            .find('input.cr-slider')
            .attr({ id, step: '0.01' })
            .before($('<label id="zoom" class="control-label sr-only">').attr('for', id))
          // use percentage
          function update () {
            // update label
            const $slider = $body.find('input.cr-slider')
            const min = $slider.attr('min')
            let max = $slider.attr('max')
            const step = $slider.attr('step')
            const current = $body.croppie('get').zoom
            const zoom = ((current - min) * 100 / (max - min))
            const text = zoom
              // #. image zoom, %1$d is the zoom level of the preview picture in percent
              ? gt('Zoom: %1$d%', zoom.toFixed(0))
              // #. noun. label for the zoom slider in case the zoom is undefined or 0
              : gt('Zoom')
            // remove 'blind spot' at range end (last step would exceed max)
            $slider.attr('max', max = max - ((max - min) % step))
            // maps absolute numbers to percentage
            $body.find('#zoom').text(text)
          }
        },
        'croppie-focus' () {
          this.$body.find('.cr-boundary').on('mousedown click', function () {
            $(this).find('.cr-viewport.cr-vp-circle').focus()
          })
        },
        'inline-actions' () {
          this.$body.append(
            $('<div class="inline-actions">').append(
              // ROTATE LEFT
              $('<button type="button" class="btn btn-default" data-action="rotate-left">').append(
                createIcon('bi/arrow-counterclockwise.svg'),
                // #. button to rotate a contact image
                $.txt(gt('Rotate left'))
              ),
              // ROTATE RIGHT
              $('<button type="button" class="btn btn-default" data-action="rotate-right">').append(
                createIcon('bi/arrow-clockwise.svg'),
                // #. button to rotate a contact image
                $.txt(gt('Rotate right'))
              )
            )
              .on('click', 'button', function (e) {
                this.trigger('action', $(e.currentTarget).data('action'))
              }.bind(this))
          )
        }
      })
      .addAlternativeButton({ label: gt('Remove photo'), action: 'remove' })
      .addCancelButton()
      .addButton({ label: gt('Apply'), action: 'apply' })
      .on('open', function () {
        this.busy()
        this.load().always(this.idle)
      })
      .on('action', function (action) {
        switch (action) {
          case 'usermedia':
            this.onUserMedia()
            break
          case 'rotate-left':
            this.onRotate(90)
            break
          case 'rotate-right':
            this.onRotate(-90)
            break
          case 'upload':
            this.trigger('upload')
            break
          case 'remove':
            this.onRemovePhoto()
            break
          case 'cancel':
            this.onCancel()
            break
          case 'apply':
            // used for standalone version of pictureUpload
            this.model.set('save', true)
            delete this.model.initialState

            // existing image was removed so update model
            if (this.$el.hasClass('empty')) {
              if (this.model.get('image1_url')) {
                this.trigger('reset')
                this.model.set('image1_url', '')
              }
              this.model.set('image1_data_url', '')
              this.model.unset('pictureFile')
              this.model.unset('pictureFileEdited')
              this.model.unset('crop')

              this.idle()
              return this.close()
            }

            // image from server, no new file, no image manipulation. Do nothing
            if (this.model.get('image1_url') && !this.model.get('pictureFile') && !this.model.get('crop')) {
              this.idle()
              return this.close()
            }

            // apply changes
            this.onApply()
            break
                    // no default
        }
      })
  }
}

function getContent (file) {
  const def = $.Deferred()
  const reader = new window.FileReader()
  reader.onload = function (e) { def.resolve(e.target.result) }
  reader.onerror = function (e) { def.reject(undefined, e) }
  reader.readAsDataURL(file)
  return def
}

function mapOrientation (num) {
  // 1 = 0°, 6: 90°, 3: 180°, 8: 270°
  const ids = [1, 6, 3, 8]
  const index = Math.max(ids.indexOf(num), 0) + 1
  return ids[index % 4]
}
