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

import { createIcon } from '@/io.ox/core/components'
import BaseView from '@/io.ox/core/viewer/views/types/baseview'

/**
 * Base class for media viewers (audio and video).
 */
export default class MediaView extends BaseView {
  /**
   * Initialization after construction. Subclasses MUST create the following instance properties:
   *
   * - {JQuery<HTMLMediaElement>} $media       Either an `<audio>` or a `<video>` element.
   * - {number} [coverWidth=280]               Width of the cover image, in CSS pixels.
   * - {number} [coverHeight=280]              Height of the cover image, in CSS pixels.
   * - {string} [coverUrl]                     URL of a cover image to be shown for the media file.
   * - {string} [coverIcon]                    A background icon to be displayed if no cover is available.
   * - {string} [playTooltip]                  A tooltip for the "play" button.
   * - {boolean} [showCoverWhenPlaying=false]  Whether to keep the cover image visible when playing the .
   * - {string} loadErrorMessage               Error message to be displayed when loading the media file fails.
   */
  initialize () {
    this.isPrefetched = false
  }

  /**
   * Creates and renders the media slide.
   *
   * @returns {this} the MediaView instance.
   */
  render () {
    // show a playback screen before starting to download the media file
    const $container = $('<div class="viewer-displayer-item viewer-displayer-media">')
    const $coverBox = $('<div class="media-cover-box">').appendTo($container)
    $coverBox.css({ width: this.coverWidth || 280, height: this.coverHeight || 280 })
    $coverBox.append(createIcon(this.coverIcon).addClass('media-cover-icon'))
    if (this.coverUrl) {
      const $coverImg = $('<img class="media-cover-image">')
      $coverBox.addClass('has-cover').append($coverImg)
      // we don't know if the cover URL is valid until we load it from the server
      $coverImg.one('error', () => {
        $coverBox.removeClass('has-cover')
        $coverImg.remove()
      })
      $coverImg.attr('src', _.unescapeHTML(this.coverUrl))
    }
    $coverBox.append(createIcon('bi/play-circle.svg').addClass('play-button'))
    $coverBox.attr('title', this.playTooltip || '')
    $container.append(this.$media.hide())
    this.$el.append($container)

    // register play handler, use 'loadeddata' because 'canplay' is not always triggered on Firefox
    this.$media.on('loadeddata', () => {
      this.$el.idle()
      this.$media.show()[0].play()
    })

    // show notification and "Download" button on load error
    this.$media.on('error', () => {
      // this method removes everything from `this.$el`
      this.displayDownloadNotification(this.loadErrorMessage)
    })

    // start loading the media file after clicking the play button
    $container.one('click', () => {
      this.$el.busy()
      $container.addClass('playback-started')
      this.$media.attr('src', _.unescapeHTML(this.getPreviewUrl() || ''))
      this.$media[0].load()
    })

    return this
  }

  /**
   * "Prefetches" the audio slide.
   * In order to save memory and network bandwidth audio files are not prefetched.
   *
   * @returns {this} the MediaView instance.
   */
  prefetch () {
    this.isPrefetched = true
    return this
  }

  /**
   * Everything has been done in "render()".
   *
   * @returns {this} the MediaView instance.
   */
  show () {
    return this
  }

  /**
   * "Unloads" the media slide by removing the src attribute from the media
   * element and calling load() again.
   *
   * @returns {this} the MediaView instance.
   */
  unload () {
    this.onDispose()
    this.isPrefetched = false
    return this
  }

  /**
   * Destructor function of this view.
   */
  onDispose () {
    // remove event listeners from media element
    this.$media.off().hide()
    // work around for Chrome bug #234779, HTML5 video request stay pending (forever)
    // https://code.google.com/p/chromium/issues/detail?id=234779
    this.$media[0].pause()
    this.$media.removeAttr('src')
    this.$media[0].load()
  }
}
