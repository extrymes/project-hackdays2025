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
import $ from '@/jquery'

import BaseView from '@/io.ox/core/viewer/views/types/baseview'

import gt from 'gettext'

const LOAD_TIMEOUT = 90000

const TextView = BaseView.extend({

  initialize (options) {
    _.extend(this, options)
    this.isPrefetched = false
    this.xhr = null
    this.loadTimeoutId = null
    this.listenTo(this.viewerEvents, 'viewer:zoom:in', this.onZoomIn)
    this.listenTo(this.viewerEvents, 'viewer:zoom:out', this.onZoomOut)
    this.$el.on('scroll', _.throttle(this.onScrollHandler.bind(this), 500))
  },

  render () {
    // handle zoom events
    this.size = 13
    // quick hack to get rid of flex box
    this.$el.empty().css('display', 'block')
    return this
  },

  /**
   * Data load handler.
   */
  onDataLoaded (text) {
    // if the request was successful clear load timeout
    this.clearLoadTimeout()

    const filesize = this.model.get('file_size')
    // work around for large files in drive, no content is provided and also no error
    if (_.isNumber(filesize) && (filesize > 0) && _.isEmpty(text)) {
      this.onError()
    } else {
      this.$el.idle()
      this.$el.addClass('swiper-no-swiping').append(
        $('<div class="white-page letter plain-text">').text(text)
      )
    }
  },

  /**
   * Load error handler.
   */
  onError () {
    this.displayNotification(gt('Sorry, there is no preview available for this file.'))
  },

  /**
   * Load timeout handler.
   * An additional timer if the AJAX request gets stalled.
   * Aborts the running AJAX request and handles the error.
   */
  onLoadTimeout () {
    this.clearLoadTimeout()
    this.abortAjaxRequest()
    this.onError()
  },

  /**
   * Clear the load timeout.
   * Prevents invocation of the load timeout handler.
   */
  clearLoadTimeout () {
    if (this.loadTimeoutId) {
      window.clearTimeout(this.loadTimeoutId)
      this.loadTimeoutId = null
    }
  },

  /**
   * Abort AJAX request
   */
  abortAjaxRequest () {
    if (this.xhr) {
      this.xhr.abort()
      this.xhr = null
    }
  },

  /**
   * "Prefetches" the text file
   *
   * @returns {Backbone.View} the TextView instance.
   */
  prefetch () {
    // simply load the document content via $.ajax
    const previewUrl = this.getPreviewUrl()

    this.$el.busy()
    // send AJAX request
    this.xhr = $.ajax({ url: previewUrl, dataType: 'text', context: this }).done(this.onDataLoaded).fail(this.onError)
    // start additional timer to detect if AJAX request gets stalled
    this.loadTimeoutId = window.setTimeout(this.onLoadTimeout.bind(this), LOAD_TIMEOUT)

    this.isPrefetched = true
    return this
  },

  /**
   * "Shows" the text file.
   * For text files all work is already done in prefetch()
   *
   * @returns {Backbone.View} the TextView instance.
   */
  show () {
    return this
  },

  /**
   * Unloads the text file
   *
   * @returns {Backbone.View} the TextView instance.
   */
  unload () {
    this.$el.find('.white-page').remove()
    this.isPrefetched = false
    return this
  },

  setFontSize (value) {
    this.size = Math.min(Math.max(value, 9), 21)
    this.$('.white-page').css('fontSize', this.size)
  },

  onZoomIn () {
    this.setFontSize(this.size + 2)
  },

  onZoomOut () {
    this.setFontSize(this.size - 2)
  },

  /**
   * Scroll event handler that blends in navigation controls
   */
  onScrollHandler () {
    this.viewerEvents.trigger('viewer:blendnavigation')
  },

  /**
   * Destructor function of this view.
   * Aborts the AJAX request and clears the load timeout.
   */
  onDispose () {
    this.abortAjaxRequest()
    this.clearLoadTimeout()
    this.$el.css('display', '')
  }

})

export default TextView
