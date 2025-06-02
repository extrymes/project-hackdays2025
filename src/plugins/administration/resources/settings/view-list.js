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

import ListView from '@/io.ox/core/tk/list'
import Contextmenu from '@/io.ox/core/tk/list-contextmenu'
import ext from '@/io.ox/core/extensions'
import detailPopup from '@/io.ox/core/detail-popup'
import { resourceCollection } from '@/io.ox/core/api/resource'
import { hasFeature } from '@/io.ox/core/feature'
import { createIcon } from '@/io.ox/core/components'
import { device } from '@/browser'
import '@/plugins/administration/resources/settings/toolbar'
import '@/plugins/administration/resources/settings/style.scss'

import gt from 'gettext'

//
// List items
//

ext.point('administration/resources/listview/item').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    const $li = this.closest('.list-item')
    const ariaLabel = `${gt('Resource')} ${baton.model.get('display_name')}`

    $li.attr({
      tabindex: 0,
      'data-detail-popup': 'resource',
      'aria-label': ariaLabel
    })

    this.addClass('bold flex-row').append(
      $('<div class="ellipsis flex-grow">').text(
        baton.model.get('display_name')
      )
    )

    if (!hasFeature('managedResources')) return

    // extend aria-label
    $li.attr({
      'aria-label': `${ariaLabel}, ${
        baton.model.hasDelegates()
        ? gt('Resource delegates manually accept or decline the booking request.')
        : gt('Booking requests are automatically accepted if the resource is free.')
      }`
    })

    if (!baton.model.hasDelegates()) return

    // delegates icon
    this.append($('<div class="pl-8">')
      // #. tooltip indicating that there are delegates for this resource
      .addActionTooltip(gt('Resource delegates')).removeAttr('aria-label')
      .append(createIcon('bi/people.svg')))
  }
})

//
// Context menu
//

ext.point('administration/resources/listview/contextmenu').extend({
  id: 'edit',
  ref: 'administration/resources/edit',
  index: 100,
  section: 'organize',
  title: gt('Edit')
}, {
  id: 'delete',
  ref: 'administration/resources/delete',
  index: 200,
  section: 'organize',
  title: gt('Delete')
})

export const ResourceListView = ListView.extend(Contextmenu).extend({

  attributes: {
    'aria-label': gt('Resource list')
  },

  initialize (options = {}) {
    options = {
      ignoreFocus: false,
      pagination: false,
      selection: { behavior: 'normal-single' },
      ref: 'administration/resources/listview',
      ...options
    }
    ListView.prototype.initialize.call(this, options)
    if (!device('smartphone')) this.$el.addClass('rounded border-bright border-top border-left border-right border-bottom')

    this.toggleCheckboxes(false)
    this.setCollection(resourceCollection)
    this.collection.fetch()

    this.on('selection:action', this.showDetails)
  },

  render () {
    ListView.prototype.render.call(this)
    this.$el.attr('role', 'listbox')
    return this
  },

  showDetails (list, e) {
    // already handled by global click handler for `[data-detail-popup]`
    if (e.type === 'click') return
    const [id] = list
    detailPopup.call({ type: 'resource', e, data: { cid: id }, selector: '.list-item' })
  },

  getCompositeKey (model) {
    return model.id
  }
})
