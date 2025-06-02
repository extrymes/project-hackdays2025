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

import { createIcon, icon, buttonWithIcon, buttonWithText } from '@/io.ox/core/components'
import gt from 'gettext'

export default {
  appendIconText (target, text, type, activeColor) {
    target = $(target)
    // handle smartphones
    if (_.device('smartphone')) {
      let icon
      if (type === 'color') {
        target.addClass('widget-color-' + activeColor)
        icon = createIcon('bi/droplet.svg')
      } else {
        icon = createIcon(type === 'edit' ? 'bi/pencil.svg' : 'bi/power.svg')
      }
      return target.empty().append(icon)
    }
    return target.text(text)
  },
  widgetTitle (title) {
    console.warn('This is only user for old lists. Please use "io.ox/backbone/mini-views/settings-list-view" or "makeTitle" instead.')
    return $('<span class="widget-title pull-left">').text(title)
  },
  makeTitle (title) {
    return $('<div class="list-item-title flex-grow">').text(title)
  },
  makeSubTitle (title, label) {
    return $('<div class="list-item-subtitle ellipsis">').append(
      label ? $('<label>').text(label + ':') : $(),
      $('<span>').text(title)
    )
  },
  makeControls () {
    return $('<div class="list-item-controls">')
  },
  controlsDelete ({ ariaLabel, title = gt('Delete') } = {}) {
    return buttonWithIcon({ ariaLabel, className: 'btn btn-toolbar remove', icon: icon('bi/x-lg.svg'), tooltip: title })
      .attr('data-action', 'delete')
      .addClass('ms-8')
  },
  controlsEdit ({ ariaLabel, label = gt('Edit'), action = 'edit' } = {}) {
    return buttonWithText({ ariaLabel, className: 'btn btn-toolbar action', text: label })
      .attr('data-action', action)
      .addClass('ms-8')
  },
  controlsToggle (label = '') {
    return buttonWithText({ className: 'btn btn-toolbar action', text: label })
      .attr('data-action', 'toggle')
  },
  applyToggle (label = '') {
    return buttonWithText({ className: 'btn btn-toolbar action', text: label })
      .attr('data-action', 'apply')
      .addClass('ms-8')
  },
  dragHandle (title, statusClass) {
    return $('<a href="#" role="button" aria-pressed="false">')
      .addClass('text-gray drag-handle ' + statusClass).attr('title', title)
      .append(createIcon('bi/grip-vertical.svg').addClass('bi-16'))
      .on('click', $.preventDefault)
  },
  controlProcessSub ({ icon = '', title = gt('Process subsequent rules') } = {}) {
    return buttonWithIcon({ className: 'btn btn-toolbar action', icon: createIcon(icon).addClass('bi-18'), tooltip: title })
      .attr('data-action', 'toggle-process-subsequent')
  },
  drawError (account) {
    if (!account || !account.get('hasError')) return ''

    return $('<div class="error-message">').text(account.get('error'))
  },
  drawWarning (text) {
    return $('<div class="warning-message">').text(text)
  }
}
