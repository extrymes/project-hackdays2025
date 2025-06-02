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
import Backbone from '@/backbone'
import locale from '@/io.ox/core/locale'
import folderAPI from '@/io.ox/core/folder/api'
import gt from 'gettext'

const FolderInfoView = Backbone.View.extend({
  tagName: 'li',
  className: 'folder-info flex-col truncate',
  attributes: {
    role: 'presentation'
  },
  initialize (options) {
    this.app = options.app
    this.listenTo(this.app, 'folder:change', this.onChangeFolder)
    this.listenTo(this.app.props, 'change:searching', this.update)
    this.onChangeFolder()
  },
  render () {
    this.$el.append(
      $('<div class="folder-name truncate">'),
      $('<div class="folder-count text-gray">')
    )
    this.update()
    return this
  },
  update () {
    const searching = this.app.props.get('searching')
    const title = searching ? gt('Search results') : this.model.getTitle()
    const total = this.getTotal()
    const text = this.getText(total)
    this.$('.folder-name').text(title)
    this.$('.folder-count').toggle(!searching).text(text)
  },
  getTotal () {
    const isVirtual = this.model.id?.startsWith('virtual/')
    const total = this.model.has('total_ids')
      ? this.model.get('total_ids')
      : this.model.get(isVirtual ? 'unread' : 'total')
    // total might not be provided by the folder implementation (e.g. contacts since 7.10.6)
    if (!total && total !== 0) return undefined
    return locale.number(total || 0, 0)
  },
  getText (total) {
    if (total === undefined) return '\u00a0'
    switch (this.app.get('name')) {
      case 'io.ox/mail':
        return gt.ngettext('%1$d message', '%1$d messages', total, total)
      case 'io.ox/contacts':
        return gt.ngettext('%1$d contact', '%1$d contacts', total, total)
      case 'io.ox/tasks':
        return gt.ngettext('%1$d task', '%1$d tasks', total, total)
      default:
        return gt.ngettext('%1$d entry', '%1$d entries', total, total)
    }
  },
  onChangeFolder () {
    if (this.model) this.stopListening(this.model)
    this.model = folderAPI.pool.getModel(this.app.folder.get())
    this.listenTo(this.model, 'change:title change:total change:total_ids', this.update)
    if (this.model.id?.startsWith('virtual/')) this.listenTo(this.model, 'change:unread', this.update)
    this.update()
  }
})

export default FolderInfoView
