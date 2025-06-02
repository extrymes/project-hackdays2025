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

import MediaView from '@/io.ox/core/viewer/views/types/mediaview'

import gt from 'gettext'

/**
 * The video file type.
 *
 */
export default class VideoView extends MediaView {
  initialize () {
    super.initialize()

    // create and initialize the video element
    this.$media = $('<video>', {
      controls: true,
      disablepictureinpicture: true, // cspell:disable-line
      controlslist: 'nodownload',
      type: this.model.get('file_mimetype') || ''
    }).append(
      $('<div>').text(gt('Your browser does not support the video format of this file.'))
    )

    // other configuration
    this.coverWidth = 280
    this.coverHeight = 360
    this.coverIcon = 'bi/film.svg'
    this.playTooltip = gt('Start video')
    this.loadErrorMessage = gt('Error while playing the video. Either your browser does not support the format or you have connection problems.')
  }
}
