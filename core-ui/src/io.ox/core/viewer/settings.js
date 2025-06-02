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

import { settings } from '@/io.ox/core/settings'

const Settings = {

  /**
   * Returns the sidebar open state.
   * Mobile devices don't store the state,the result is always 'false'.
   * On desktop the state is stored in the settings and defaulted to 'true'.
   */
  getSidebarOpenState () {
    return _.device('desktop') ? settings.get('viewer/sidebarOpenState', true) : false
  },

  /**
   * Store the sidebar state on desktop.
   * Mobile devices don't sore the state.
   */
  setSidebarOpenState (state) {
    if (_.device('desktop')) {
      settings.set('viewer/sidebarOpenState', state).save()
    }
  },

  /**
   * Returns the last active sidebar navigation tab
   */
  getSidebarActiveTab () {
    return settings.get('viewer/sidebarActiveTab', 'thumbnail')
  },

  /**
   * Saves the active sidebar tab.
   * @param {string} tabId id string of the navigation tab: 'thumbnail' or 'detail'
   */
  setSidebarActiveTab (tabId) {
    settings.set('viewer/sidebarActiveTab', tabId).save()
  }

}

export default Settings
