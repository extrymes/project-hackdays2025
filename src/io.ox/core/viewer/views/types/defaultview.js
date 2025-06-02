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

import BaseView from '@/io.ox/core/viewer/views/types/baseview'

import gt from 'gettext'

/**
 * Default file type for OX Viewer. Displays a generic file icon
 * and the file name. This type acts as a fallback in cases if the
 * current file is not supported by OX Viewer.
 *
 * Implements the ViewerType interface.
 *
 * @interface ViewerType (render, prefetch, show, unload)
 *
 */
const DefaultView = BaseView.extend({

  initialize () {
    this.isPrefetched = false
  },

  /**
   * Creates and renders the default slide.
   *
   * @returns {Backbone.View} the DefaultView instance.
   */
  render () {
    this.$el.empty().append(
      this.displayDownloadNotification(gt('There is no preview for this file type.'))
    )

    return this
  },

  /**
   * "Prefetches" the default slide.
   *
   * @returns {Backbone.View} the DefaultView instance.
   */
  prefetch () {
    this.isPrefetched = true
    return this
  },

  /**
   * "Shows" the default slide.
   *
   * @returns {Backbone.View} the DefaultView instance.
   */
  show () {
    return this
  },

  /**
   * "Unloads" the default slide.
   *
   * @returns {Backbone.View} the DefaultView instance.
   */
  unload () {
    this.isPrefetched = false
    return this
  }

})

// returns an object which inherits BaseView
export default DefaultView
