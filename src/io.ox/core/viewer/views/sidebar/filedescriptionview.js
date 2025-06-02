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
import PanelBaseView from '@/io.ox/core/viewer/views/sidebar/panelbaseview'
import Ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import FilesAPI from '@/io.ox/files/api'
import { createButton } from '@/io.ox/core/components'
import gt from 'gettext'

const POINT = 'io.ox/core/viewer/sidebar/description'

// Extensions for the file description text
Ext.point(POINT + '/text').extend({
  index: 10,
  id: 'description-text',
  draw (baton) {
    const $body = this.find('.sidebar-panel-body')
    const $title = this.find('.sidebar-panel-title')
    $body.empty()

    const description = baton.data
    if (!_.isString(description)) return
    $body.append(
      $('<div class="description mb-8">')
        .attr('title', gt('Description text'))
        .text(description.length > 0 ? description : '-')
    )

    baton.view.hasWritePermissions()
      .then(() => {
        if (!baton.view.isCurrentVersion()) return
        $title.find('[data-action="edit-description"]').show()
      })
      .fail(() => {
        $title.find('[data-action="edit-description"]').hide()
      })
  }
})

// only changed by user interaction
let lastState = null

/**
 * The FileDescriptionView is intended as a sub view of the SidebarView and
 * is responsible for displaying the file description.
 */
const FileDescriptionView = PanelBaseView.extend({

  className: 'viewer-filedescription',

  events: {
    'click .description': 'onEdit',
    'dblclick .description': 'editDescription',
    'click [data-action="edit-description"]': 'editDescription'
  },

  onEdit (e) {
    e.preventDefault()
    const touchDevice = _.device('smartphone || tablet')
    const empty = !this.model.get('description')
    if (touchDevice || empty) this.editDescription()
  },

  initialize () {
    PanelBaseView.prototype.initialize.apply(this, arguments)
    this.firstRender = false
    if (this.model && this.model.isFile()) {
      this.renderHeader()
      // attach event handlers
      this.listenTo(this.model, 'change:description', this.render)
      if (this.model.get('description')) this.render()
      // listen to version display events
      this.listenTo(this.viewerEvents, 'viewer:display:version', this.onDisplayTempVersion.bind(this))
      this.on('toggle-by-user', state => {
        lastState = state
      })
    } else {
      this.$el.hide()
    }
  },

  renderHeader () {
    this.setPanelHeader(gt('Description'))
    this.$('.sidebar-panel-title').append(
      // was: .description-button
      createButton({ variant: 'toolbar', icon: { name: 'bi/pencil.svg', title: gt('Edit description'), className: 'bi-14' } })
        .attr({ 'aria-label': gt('Edit description'), 'data-action': 'edit-description' })
        .on('click', (e) => {
          e.stopPropagation()
          this.editDescription()
        })
    )
  },

  render () {
    if (!this.model) return
    if (!this.model.isFile()) return
    // - automatically show description when existing, but allow manual override
    // - firstRender is needed e.g. when removing a description, while in automatic show/hide mode
    if (this.firstRender && lastState === null) {
      this.togglePanel(!!this.model.get('description'))
    } else if (lastState !== null) {
      this.togglePanel(lastState)
    }
    this.firstRender = true
    Ext.point(POINT + '/text').invoke('draw', this.$el, Ext.Baton({ data: this.model.get('description'), view: this }))
    return this
  },

  /**
   * Invoke action to edit description
   */
  editDescription () {
    this.hasWritePermissions().done(function (baton) {
      actionsUtil.invoke('io.ox/files/actions/edit-description', Ext.Baton({ data: baton, isViewer: true }))
    })
  },

  hasWritePermissions () {
    if (!this.model) return $.Deferred().reject()
    return actionsUtil.checkAction('io.ox/files/actions/edit-description', this.model.toJSON())
  },

  isCurrentVersion () {
    return (this.model && this.model.get('current_version') !== false)
  },

  /**
   * Handles display temporary file version events.
   *
   * @param {object} versionData The JSON representation of the version.
   */
  onDisplayTempVersion (versionData) {
    if (!versionData) { return }
    this.model = new FilesAPI.Model(versionData)
    this.render()
  },

  /**
   * Destructor function of this view.
   */
  onDispose () {
    if (this.model) this.model = null
  }
})

export default FileDescriptionView
