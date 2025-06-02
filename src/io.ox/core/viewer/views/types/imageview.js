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
import BaseView from '@/io.ox/core/viewer/views/types/baseview'

import gt from 'gettext'

const RETINA_FACTOR = 2

/**
 * The image file type. Implements the ViewerType interface.
 *
 * @interface ViewerType (render, prefetch, show, unload)
 *
 */
const ImageView = BaseView.extend({

  initialize () {
    this.isPrefetched = false
  },

  /**
   * Creates and renders the image slide.
   *
   * @returns {Backbone.View} the ImageView instance.
   */
  render () {
    const image = $('<img class="viewer-displayer-item viewer-displayer-image hidden">')
    const imageSize = this.getImageSize()
    const options = _.extend({ scaleType: 'contain' }, imageSize)
    let previewUrl = this.getPreviewUrl(options)
    const filename = this.model.get('filename') || ''

    this.$el.empty()

    if (previewUrl) {
      previewUrl = _.unescapeHTML(previewUrl)
      image.attr({ 'data-src': previewUrl, alt: filename })
      image.on('load', this.onLoadSuccess.bind(this))
      image.on('error', this.onLoadError.bind(this))

      this.$el.append($('<div class="viewer-displayer-item-container">').append(image))
    }

    return this
  },

  /**
   * Image load handler
   */
  onLoadSuccess () {
    this.$el.idle()
    this.$el.find('img.viewer-displayer-image').removeClass('hidden')
  },

  /**
   * Image load error handler
   */
  onLoadError () {
    this.displayDownloadNotification(gt('Sorry, there is no preview available for this image.'))
  },

  /**
   * Returns an object with the width and the height to apply to the image.
   *
   * @returns {object} And object containing the width and the height for the image.
   */
  getImageSize () {
    // since this node is not yet part of the DOM we look
    // for the carousel's dimensions directly
    const retina = _.device('retina')
    const carousel = $('.viewer-displayer:visible')
    // on retina screen request larger previews to render sharp images
    const width = retina ? carousel.width() * RETINA_FACTOR : carousel.width()
    const height = retina ? carousel.height() * RETINA_FACTOR : carousel.height()
    // use floor to make sure that the image size will never be bigger than the reported values (scrollbar)
    const size = { width: Math.floor(width), height: Math.floor(height) }

    return size
  },

  /**
   * Generates a Base64 preview URL for files that have been added
   * from local file system but are not yet uploaded to the server.
   *
   * @return {Promise} A Promise that if resolved contains the Base64 preview URL.
   */
  getLocalFilePreviewUrl () {
    const fileObj = this.model.get('fileObj') || this.model.get('originalFile')
    const size = this.getImageSize()

    return import('@/io.ox/contacts/widgets/canvasresize').then(function ({ default: canvasResize }) {
      const options = _.extend({
        crop: false,
        quality: 80
      }, size)

      return canvasResize(fileObj, options)
    })
  },

  /**
   * "Prefetches" the image slide by transferring the image source from the 'data-src'
   * to the 'src' attribute of the <img> HTML element, or by generating a Base64 URL
   * for local files.
   *
   * @return {Promise}
   */
  async prefetch () {
    if (this.isPrefetched) return

    const image = this.$el.find('img.viewer-displayer-image')
    if (image.length === 0) return

    this.$el.busy()

    // handle local file that has not yet been uploaded to the server
    if (this.model.get('group') === 'localFile') {
      const previewUrl = await this.getLocalFilePreviewUrl()
      if (previewUrl) image.attr('src', previewUrl)
    } else {
      image.attr('src', image.attr('data-src'))
    }

    // set to pixel values instead of 100% in order to make it work with retina and scaled browser windows
    image.css({ maxWidth: this.$el.width() + 'px', maxHeight: this.$el.height() + 'px' })

    this.isPrefetched = true
  },

  /**
   * "Shows" the image slide.
   * For images all work is already done in prefetch()
   *
   * @returns {Backbone.View} the ImageView instance.
   */
  show () {
    return this
  },

  /**
   * "Unloads" the image slide by replacing the src attribute of the image to an
   * Base64 encoded, 1x1 pixel GIF image.
   *
   * @returns {Backbone.View} the ImageView instance.
   */
  unload () {
    const imageToUnLoad = this.$el.find('img.viewer-displayer-image')

    if (imageToUnLoad.length > 0) {
      imageToUnLoad.attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=')
    }

    this.isPrefetched = false
    return this
  },

  /**
   * Destructor function of this view.
   */
  onDispose () {
    this.unload()
    this.$el.find('img.viewer-displayer-image').off()
    this.$el.off()
  }

})

// returns an object which inherits BaseView
export default ImageView
