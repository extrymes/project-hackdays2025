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
import FilesAPI from '@/io.ox/files/api'

import gt from 'gettext'

const COVER_SIZE = 280

/**
 * The audio file type.
 *
 */
export default class AudioView extends MediaView {
  initialize () {
    super.initialize()

    // create and initialize the audio element
    this.$media = $('<audio>', {
      controls: true,
      type: this.model.getMimeType() || ''
    }).append(
      $('<div>').text(gt('Your browser does not support the audio format of this file.'))
    )

    // other configuration
    this.coverWidth = this.coverHeight = COVER_SIZE
    this.coverUrl = FilesAPI.getUrl(this.model.toJSON(), 'cover', { width: COVER_SIZE, height: COVER_SIZE })
    this.coverIcon = 'bi/music-note-beamed.svg'
    this.playTooltip = gt('Play audio')
    this.showCoverWhenPlaying = true
    this.loadErrorMessage = gt('Error while playing the audio file. Either your browser does not support the format or you have connection problems.')
  }
}
