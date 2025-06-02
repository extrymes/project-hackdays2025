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
import FilesAPI from '@/io.ox/files/api'
import MailAPI from '@/io.ox/mail/api'
import AttachmentAPI from '@/io.ox/core/api/attachment'
import DisposableView from '@/io.ox/backbone/views/disposable'
import Util from '@/io.ox/core/viewer/util'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import ext from '@/io.ox/core/extensions'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const // hash map of document zoom levels
  zoomLevelMap = {}
// hash map of document scroll positions
const scrollPositionMap = {}

/**
 * The base class for filetype views.
 */
const BaseView = DisposableView.extend({

  // create slide root node
  // <div class="swiper-slide" role="option" aria-selected="false">
  className: 'swiper-slide scrollable focusable',
  attributes: { role: 'option', 'aria-selected': 'false' },

  /**
   * Creates a file notification node with file name, icon and the notification text.
   *
   * @param {string|string[]} notification  the notification String, if omitted no notification text will be added.
   * @param {string} icon                   an icon to be applied on the file icon.
   *
   * @returns {JQuery}  The notification root element.
   */
  createNotificationNode (notification, icon) {
    icon = icon || Util.getIcon(this.model)

    return $('<div class="viewer-displayer-notification">').append(
      createIcon(icon),
      _.getArray(notification).filter(Boolean).map(text => $('<p class="apology">').text(text))
    )
  },

  /**
   * Gives user a good notification message if something went awry.
   *
   * @param {string} notification a notification string to be displayed.
   * @param {string} icon         an icon to be applied on the file icon.
   *
   * @returns {JQuery}  The notification root element.
   */
  displayNotification (notification, icon) {
    const notificationNode = this.createNotificationNode(notification, icon)
    this.$el.idle().empty().append(notificationNode).removeClass('exclude-dark')
    return notificationNode
  },

  /**
   * Gives the user a notification message with a download button to download the file.
   *
   * @param {string} notification         The notification message, when empty no text is displayed at all
   * @param {string} [iconClass]          A CSS class name to be applied on the file icon.
   * @param {string} [buttonDescription]  Alternative message string for the "Download" button.
   *
   * @returns {JQuery}  The notification root element.
   */
  displayDownloadNotification (notification, icon, buttonDescription) {
    buttonDescription = buttonDescription || gt('Please download the file using the button below.')
    const notificationNode = this.displayNotification([notification, buttonDescription], icon)

    let fileSize = Util.renderItemSize(this.model)
    fileSize = fileSize.indexOf('-') === 0 ? '' : ' (' + fileSize + ')'

    // #. %1$s is the file size "Download 2mb" for example
    const downloadButton = $('<button type="button" class="btn btn-primary btn-file">').text(gt('Download %1$s', fileSize)).attr('aria-label', gt('Downlad')).attr('id', 'downloadviewerfile')
    notificationNode.append(downloadButton)
    downloadButton.on('click', () => {
      const data = this.model.isFile() ? this.model.toJSON() : this.model.get('origData')
      // Tested: No
      actionsUtil.invoke(Util.getRefByModelSource(this.model.get('source')), ext.Baton({ model: this.model, data }))
    })
    return notificationNode
  },

  /**
   * Gets preview URLs of file types from their respective APIs.
   *
   * @returns {string} previewURL
   */
  getPreviewUrl (options) {
    const prevUrl = this.model.get('url') || (this.model.get('origData') ? this.model.get('origData').url : false)
    if (prevUrl) return prevUrl

    // turn off sharding #53731
    options = _.extend(options || {}, { noSharding: true })

    if (this.model.get('file_options')) {
      options = _.extend(options, this.model.get('file_options'))
    }

    if (this.model.isFile()) {
      const modelJSON = this.model.toJSON()
      if (options && !_.isEmpty(options.version)) {
        modelJSON.version = options.version
      }
      return FilesAPI.getUrl(modelJSON, 'thumbnail', options)
    } else if (this.model.isMailAttachment() || this.model.isComposeAttachment()) {
      return MailAPI.getUrl(this.model.get('origData'), 'view', options)
    } else if (this.model.isPIMAttachment()) {
      return AttachmentAPI.getUrl(this.model.get('origData'), 'view', options)
    } else if (this.model.isEncrypted()) {
      // Guard
      return (this.model.get('guardUrl')) // Will eventually be removed
    }
    return null
  },

  /**
   * Wether this slide is currently visible to the user or not.
   */
  isVisible () {
    return this.$el.hasClass('swiper-slide-active')
  },

  /**
   * Returns a previously stored zoom level for the given Drive model file id.
   *
   * @param   {string} fileId The file model id.
   * @returns {number}        the zoom level.
   */
  getInitialZoomLevel (fileId) {
    return zoomLevelMap[fileId]
  },

  /**
   * Stores the zoom level for the given Drive model file id.
   *
   * @param {string} fileId    The file model id.
   * @param {number} zoomLevel the zoom level.
   */
  setInitialZoomLevel (fileId, zoomLevel) {
    if (_.isNumber(zoomLevel)) {
      zoomLevelMap[fileId] = zoomLevel
    }
  },

  /**
   * Removes the zoom level specified by the the Drive model file id.
   *
   * @param {string} fileId The file model id.
   */
  removeInitialZoomLevel (fileId) {
    if (fileId in zoomLevelMap) {
      delete zoomLevelMap[fileId]
    }
  },

  /**
   * Returns a previously stored scroll position for the given Drive model file id.
   *
   * @param   {string} fileId The file model id.
   * @returns {number}        the scroll position.
   */
  getInitialScrollPosition (fileId) {
    return scrollPositionMap[fileId]
  },

  /**
   * Stores the scroll position for the given Drive model file id.
   *
   * @param {string} fileId         The file model id.
   * @param {number} scrollPosition the scroll position.
   */
  setInitialScrollPosition (fileId, scrollPosition) {
    if (_.isNumber(scrollPosition)) {
      scrollPositionMap[fileId] = scrollPosition
    }
  },

  /**
   * Removes the scroll position specified by the the Drive model file id.
   *
   * @param {string} fileId The file model id.
   */
  removeInitialScrollPosition (fileId) {
    if (fileId in scrollPositionMap) {
      delete scrollPositionMap[fileId]
    }
  }

})

export default BaseView
