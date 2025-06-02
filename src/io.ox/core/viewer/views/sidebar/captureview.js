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
import moment from '@open-xchange/moment'
import PanelBaseView from '@/io.ox/core/viewer/views/sidebar/panelbaseview'
import ViewerUtil from '@/io.ox/core/viewer/util'
import gt from 'gettext'

// only changed by user interaction
let lastState = true

const CaptureView = PanelBaseView.extend({

  className: 'viewer-capture-info',

  initialize (options) {
    PanelBaseView.prototype.initialize.apply(this, arguments)
    this.options = options || {}
    this.$el.hide()
    if (this.model && this.model.isFile()) {
      // #. Capture is used a section title for image meta data, like camera model, ISO value, aperture, etc
      this.setPanelHeader(gt('Capture'))
      this.togglePanel(lastState)
      this.listenTo(this.model, 'change:media', this.render)
      this.on('toggle-by-user', state => { lastState = state })
    }
  },

  render () {
    if (!this.model) return this
    const media = this.model.get('media')
    if (!media) return this
    // check for advanced EXIF data
    const camera = [media.camera_make, media.camera_model].filter(Boolean).join(' ') || ''
    if (!camera) return this
    this.$el.show()
    const captureDate = this.model.get('capture_date') ? moment(this.model.get('capture_date')).format('ll LT') : ''
    const resolution = media.width && media.height ? media.width + ' x ' + media.height : ''
    const size = ViewerUtil.renderItemSize(this.model)
    const iso = media.camera_iso_speed ? 'ISO ' + media.camera_iso_speed : ''
    const length = media.camera_focal_length || ''
    const aperture = media.camera_aperture || ''
    const exposure = media.camera_exposure_time || ''
    this.$('.sidebar-panel-body').empty().append(
      $('<div class="capture-info">').append(
        $('<div class="text-bold">').text(camera),
        $('<div>').text(captureDate),
        $('<div class="flex-row justify-between">').append(
          $('<div>').text(resolution),
          $('<div>').text(size)
        ),
        $('<div class="flex-row justify-between border-top">').append(
          $('<div>').text(iso),
          $('<div>').text(length),
          $('<div>').text(aperture),
          $('<div>').text(exposure)
        )
      )
    )
    return this
  },

  onDispose () {
    if (this.model) this.model = null
  }
})

export default CaptureView
