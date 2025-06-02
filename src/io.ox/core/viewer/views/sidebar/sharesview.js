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
import ox from '@/ox'
import PanelBaseView from '@/io.ox/core/viewer/views/sidebar/panelbaseview'
import capabilities from '@/io.ox/core/capabilities'
import api from '@/io.ox/contacts/api'
import { getFullName } from '@/io.ox/contacts/util'
import { createIcon, createButton } from '@/io.ox/core/components'
import Collection from '@/io.ox/core/collection'
import ext from '@/io.ox/core/extensions'
import * as filesUtil from '@/io.ox/files/util'

import gt from 'gettext'

// only changed by user interaction
let lastState = false

const SharesView = PanelBaseView.extend({

  className: 'viewer-shares-info',

  initialize (options) {
    PanelBaseView.prototype.initialize.apply(this, arguments)
    this.options = options || {}
    this.permissions = []
    if (this.model && capabilities.has('invite_guests') && !this.options.disableSharesInfo) {
      this.listenTo(this.model, 'change:com.openexchange.share.extendedPermissions change:com.openexchange.share.extendedObjectPermissions', this.renderExtended)
      this.on('open', this.renderExtended)
      this.togglePanel(lastState)
      this.on('toggle-by-user', state => { lastState = state })
    } else {
      this.$el.hide()
    }
  },

  renderTitle (count) {
    const jsonModel = this.model.toJSON()
    const collection = new Collection(jsonModel)
    collection.getProperties()
    const baton = ext.Baton({ data: jsonModel, model: this.model, collection })
    this.setPanelHeader(gt('Shares'), count || gt('None'), 'share-count')
    if (filesUtil.isShareable('invite', baton) || filesUtil.isShareable('link', baton)) {
      this.$('.sidebar-panel-title').append(
        createButton({ variant: 'toolbar', icon: { name: 'bi/share.svg', title: gt('Share'), className: 'bi-14' } })
          .attr({
            'aria-label': gt('Open sharing dialog'),
            'data-action': 'open-share-dialog'
          })
          .on('click', { model: this.model, isViewer: this.options.isViewer }, openShareDialog)
      )
    }
  },

  renderExtended () {
    if (!this.model) return this
    if (this.model.isVirtualFolder()) this.renderItems()
    else if (this.model.isFolder()) this.renderFolder()
    else this.renderFile()
    return this
  },

  renderFolder () {
    this.model.ensureExtendedPermissions() // fallback: lazy UI update when permissions are missing

    this.permissions = this.model.get('com.openexchange.share.extendedPermissions') || []
    this.renderItems()
  },

  renderFile () {
    this.model.ensureExtendedPermissions() // fallback: lazy UI update when permissions are missing

    this.permissions = this.model.get('com.openexchange.share.extendedObjectPermissions') || []

    this.renderItems()
  },

  renderItems () {
    if (!this.model) return this
    const list = this.permissions.filter(item => (item.type !== 'user' || item.entity !== ox.user_id) && !(item.type === 'anonymous' && (item.isInherited || !item.share_url)))
    this.renderTitle(list.length)
    this.$('.sidebar-panel-body').empty().append(
      $('<ul class="list-unstyled">').append(
        list.map(this.renderItem, this)
      )
    )
    return this
  },

  renderItem (item) {
    switch (item.type) {
      case 'user':
      case 'guest':
        return $('<li class="flex-row items-center mb-8">').append(
          api.getContactPhoto(item.contact, { size: 40, className: 'avatar me-8' }),
          $('<div class="flex-grow truncate">').append(
            $('<div class="text-medium truncate">').text(item.type === 'user' ? getFullName(item.contact) : item.contact.email1),
            $('<div class="text-gray truncate">').text(item.type === 'user' ? item.contact.email1 : gt('Guest'))
          )
        )
      case 'group':
        return $('<li class="flex-row items-center mb-8">').append(
          $('<div class="avatar initialsme-8" aria-hidden="true">').append(createIcon('bi/people.svg')),
          $('<div class="flex-grow truncate">').text(item.display_name + ' (' + gt('Group') + ')')
        )
      case 'anonymous':
        return $('<li class="flex-row items-center mb-8">').append(
          $('<div class="avatar initials me-8" aria-hidden="true">').append(createIcon('bi/link.svg')),
          $('<div class="flex-grow truncate">').append(
            $('<div class="text-medium truncate">').text(gt('Public link')),
            $('<a target="_blank" rel="noopener">').attr('href', item.share_url).text(item.share_url)
          )
        )
      default:
        return $()
    }
  },

  onDispose () {
    if (this.model) this.model = null
  }
})

function openShareDialog (e) {
  e.preventDefault()
  e.stopPropagation()
  const model = e.data.model
  ox.load(() => import('@/io.ox/files/share/permissions')).then(function ({ default: permissions }) {
    const collection = new Collection(model.toJSON())
    const baton = ext.Baton({ data: model.toJSON(), model, collection, isViewer: e.data.isViewer })
    collection.getProperties()
    const options = { hasLinkSupport: filesUtil.isShareable('link', baton) }
    permissions.share([model], options)
  })
}

export default SharesView
