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

import ext from '@/io.ox/core/extensions'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ListView from '@/io.ox/core/tk/list'
import groupAPI from '@/io.ox/core/api/group'
import members from '@/plugins/administration/groups/settings/members'
import toolbar from '@/plugins/administration/groups/settings/toolbar'
import Contextmenu from '@/io.ox/core/tk/list-contextmenu'
import * as util from '@/io.ox/core/settings/util'

import gt from 'gettext'

const GroupListView = ListView.extend(Contextmenu)

//
// Entry point
//

ext.point('plugins/administration/groups/settings/detail').extend({
  draw () {
    this.append(
      util.header(
        gt('Groups'),
        'ox.appsuite.user.sect.calendar.groups.html'
      ),
      new View().render().$el
    )
  }
})

//
// Main view
//

const View = DisposableView.extend({

  className: 'group-administration settings-body flex-col',

  events: {
    'dblclick .list-item': 'onDoubleClick'
  },

  onDoubleClick (e) {
    const id = $(e.currentTarget).attr('data-cid')
    // "All users" and "Guests" cannot be edited
    if (id === '0' || id === '2147483647') return
    import('@/plugins/administration/groups/settings/edit').then(function ({ default: edit }) {
      edit.open({ id })
    })
  },

  initialize () {
    import('@/plugins/administration/groups/settings/style.scss')
    // define list view component
    this.listView = new GroupListView({ ignoreFocus: true, pagination: false, ref: 'administration/groups/listview' })
    this.listView.toggleCheckboxes(false)
    this.listView.getCompositeKey = function (model) { return model.id }

    // load all groups
    this.listView.setCollection(groupAPI.collection)
    this.load()

    // respond to selection change
    this.listenTo(this.listView, 'selection:change', function (items) {
      this.show(items)
      this.toolbar.update(items)
    })

    // respond to model change
    this.listenTo(groupAPI.collection, 'change', function (model) {
      this.$('.detail-pane h2').text(model.get('display_name'))
    })

    // toolbar
    this.toolbar = toolbar.create()

    this.on('dispose', function () {
      this.$el.parent().addClass('scrollable-pane').removeClass('abs')
    })
  },

  load () {
    groupAPI.getAll({ columns: '1,700,701,702' }, false).done(function (list) {
      if (this.disposed) return
      groupAPI.collection.reset(list, { parse: true })
    }.bind(this))
  },

  show (items) {
    if (items.length !== 1) return
    const model = groupAPI.getModel(items[0])

    this.$('.detail-pane').empty().append(
      // display name
      $('<h2>').text(model.get('display_name')),
      // members
      new members.View({ model }).render().$el
    )
  },

  render () {
    this.$el.append(
      $('<section class="settings-section flex-grow flex-col min-h-0 mb-0">').append(
        // toolbar
        this.toolbar.render().update().$el.addClass('mb-16'),
        // below toolbar
        $('<div class="flex-grow flex-row min-h-0">').append(
          this.listView.render().$el.attr('aria-label', gt('List of Groups')),
          $('<div class="detail-pane flex-grow">')
        )
      )
    )
    return this
  }
})

//
// List view item
//

ext.point('administration/groups/listview/item').extend({
  draw (baton) {
    const length = baton.model.get('members').length

    this.append(
      // display name
      $('<div class="bold">').text(baton.model.get('display_name')),
      // number of members
      $('<div class="gray">').text(
        // #. %1$d is the number of members
        gt.ngettext('%1$d member', '%1$d members', length, length)
      )
    )
  }
})

//
// Context menu
//

const items = [
  { id: 'administration/groups/edit', section: 'organize', title: gt('Edit') },
  { id: 'administration/groups/delete', section: 'organize', title: gt('Delete') }
]

ext.point('administration/groups/listview/contextmenu').extend(
  items.map(function (item, index) {
    return _.extend({
      id: item.id,
      index: (index + 1) * 100,
      title: item.title,
      ref: item.id,
      section: item.section
    }, item)
  })
)

export default View
