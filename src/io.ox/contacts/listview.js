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
import * as util from '@/io.ox/contacts/util'

import '@/io.ox/contacts/style.scss'

import gt from 'gettext'

// used for "old" mobile search result only

ext.point('io.ox/contacts/listview/item').extend({
  id: 'default',
  draw (baton) {
    ext.point('io.ox/contacts/listview/item/default').invoke('draw', this, baton)
  }
})

/* default */

ext.point('io.ox/contacts/listview/item/default').extend({
  id: 'row1',
  index: 100,
  draw (baton) {
    const row = $('<div class="list-item-row">')
    ext.point('io.ox/contacts/listview/item/default/row1').invoke('draw', row, baton)
    this.append(row)
  }
})

ext.point('io.ox/contacts/listview/item/default/row1').extend({
  id: 'fullname',
  index: 200,
  draw (baton) {
    const data = baton.data
    const fullname = $.trim(util.getFullName(data))
    const name = $.trim(data.yomiLastName || data.yomiFirstName || data.display_name || util.getMail(data))

    return fullname
      ? this.append($('<div class="fullname">').html(util.getFullName(data, true)))
      : this.append($('<div class="fullname">').text(name))
  }
})

ext.point('io.ox/contacts/listview/item/default').extend({
  id: 'row2',
  index: 200,
  draw (baton) {
    const row = $('<div class="list-item-row">')
    ext.point('io.ox/contacts/listview/item/default/row2').invoke('draw', row, baton)
    this.append(row)
  }
})

ext.point('io.ox/contacts/listview/item/default/row2').extend({
  id: 'bright',
  index: 200,
  draw (baton) {
    const text = baton.data.mark_as_distributionlist ? gt('Distribution list') : $.trim(util.getJob(baton.data))
    this.append(
      $('<span class="bright">').text(text)
    )
  }
})
