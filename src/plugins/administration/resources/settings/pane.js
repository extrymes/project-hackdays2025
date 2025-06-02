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

import ext from '@/io.ox/core/extensions'
import DisposableView from '@/io.ox/backbone/views/disposable'
import * as util from '@/io.ox/core/settings/util'
import { ResourceListView } from '@/plugins/administration/resources/settings/view-list'
import { st } from '@/io.ox/settings/index'

import '@/io.ox/core/api/backbone'
import '@/plugins/administration/resources/settings/view-detail'
import '@/plugins/administration/resources/settings/style.scss'

import gt from 'gettext'

//
// Entry point
//

ext.point('plugins/administration/resources/settings/detail').extend({
  draw () {
    this.append(
      util.header(
        st.RESOURCES,
        'ox.appsuite.user.sect.calendar.resources.html'
      ),
      new MainView().render().$el
    )
  }
})

//
// Main view
//

const MainView = DisposableView.extend({

  className: 'resource-administration settings-body flex-col',

  events: {
    'dblclick .list-item': 'onDoubleClick'
  },

  initialize () {
    this.listView = new ResourceListView()
    this.on('dispose', function () {
      this.$el.parent().addClass('scrollable-pane').removeClass('abs')
    })
  },

  render () {
    this.$el.append(
      $('<section class="settings-section flex-col flex-grow min-h-0 mb-0">').append(
        $('<div class="leading-6 mt-8 mb-24">').append(
          $('<button type="button" class="btn btn-primary" data-name="create">')
            .text(gt('Create new resource'))
            .on('click', async () => {
              const { default: editDialog } = await import('@/plugins/administration/resources/settings/view-edit')
              editDialog.open()
            })
        ),
        this.listView.render().$el
      )
    )
    return this
  },

  async onDoubleClick (e) {
    const { default: editDialog } = await import('@/plugins/administration/resources/settings/view-edit')
    editDialog.open({ id: $(e.currentTarget).attr('data-cid') })
  }
})
