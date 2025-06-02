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
import DisposableView from '@/io.ox/backbone/views/disposable'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

/**
 * The PanelBaseView is intended as a base view for the SidebarView sub views
 * and is responsible for creating and handling the panel.
 * Triggers 'open' and 'close' events at 'this.$el' when the panel body is opened / closed.
 */
const PanelBaseView = DisposableView.extend({

  // overwrite constructor to keep initialize intact
  initialize (options) {
    const panelId = _.uniqueId('panel-')

    // we only need the DOM element at this point
    this.$el.addClass('sidebar-panel')

    // ensure we have options
    options = _.extend({ fixed: false }, options)

    this.viewerEvents = options.viewerEvents || null

    if (options.fixed) {
      // static variant
      this.$el.append(
        // header
        $('<div class="sidebar-panel-heading">').append(
          // title
          $('<h3 class="sidebar-panel-title">').text('\u00a0')
        ),
        // body
        $('<div class="sidebar-panel-body">')
      )
    } else {
      // dynamic variant
      this.$el.append(
        // header
        $('<div class="sidebar-panel-heading flex-row">').append(
          // button
          $('<a href="#" class="panel-toggle-btn" role="button" aria-expanded="false">').attr({ title: gt('Toggle panel'), 'aria-controls': panelId }).append(
            $('<span class="sr-only">').text(gt('Open description panel')),
            createIcon('bi/chevron-right.svg').addClass('bi-14 toggle-icon')
          ),
          // title
          $('<h3 class="sidebar-panel-title flex-grow">').text('\u00a0')
        ),
        // body
        $('<div class="sidebar-panel-body panel-collapsed" aria-hidden="true">').attr({ id: panelId })
      )

      this.$el.on('click', '.sidebar-panel-heading', this.onTogglePanel.bind(this))
    }
  },

  /**
   * Set the panel header title.
   *
   * @param {string} title The title.
   */
  setPanelHeader (title = '\u00a0', count = '', countClassName = null) {
    this.$('.sidebar-panel-title').empty().append(
      $('<span class="me-8">').text(title),
      $('<span class="count">').addClass(countClassName).toggle(!!count).text(count || '')
    )
    return this
  },

  /**
   * Set new content to the panel body.
   */
  setPanelBody () {
    const panelBody = this.$('.sidebar-panel-body')
    panelBody.empty().append.apply(panelBody, arguments)
  },

  /**
   * Appends content to the panel body.
   */
  appendToPanelBody () {
    const panelBody = this.$('.sidebar-panel-body')
    panelBody.append.apply(panelBody, arguments)
  },

  /**
   * Panel toggle handler
   */
  onTogglePanel (e) {
    e.preventDefault()
    this.togglePanel()
    const state = !this.$('.sidebar-panel-body').hasClass('panel-collapsed')
    this.trigger('toggle-by-user', state)
  },

  /**
   * Toggles the panel depending on the state.
   * State 'true' opens the panel, 'false' closes the panel and
   * an unset state toggles the panel.
   *
   * @param {boolean} state The panel state.
   */
  togglePanel (state) {
    // determine current state if undefined
    if (state === undefined) {
      state = this.$('.sidebar-panel-body').hasClass('panel-collapsed')
    }

    // panel is already in correct state, nothing to do
    // please note: removing this line can cause a lot of flickering and overlapping version requests
    if (state === !this.$('.sidebar-panel-body').hasClass('panel-collapsed')) return

    // toggle state
    this.$('.sidebar-panel-body').toggleClass('panel-collapsed', !state).attr('aria-hidden', !state)
    this.$('.panel-toggle-btn').attr('aria-expanded', state)
    this.$('.panel-toggle-btn > .sr-only').text(state ? gt('Close description panel') : gt('Open description panel'))
    this.$('.toggle-icon').replaceWith(createIcon(state ? 'bi/chevron-down.svg' : 'bi/chevron-right.svg').addClass('bi-14 toggle-icon'))
    this.$el.trigger(state ? 'open' : 'close')
    this.trigger(state ? 'open' : 'close')
    return this
  },

  render () {
    return this
  }

})

export default PanelBaseView
