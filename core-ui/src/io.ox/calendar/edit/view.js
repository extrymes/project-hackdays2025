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

import views from '@/io.ox/backbone/views'
import '@/io.ox/calendar/edit/extensions'

const CalendarEditView = views.point('io.ox/calendar/edit/section').createView({

  tagName: 'form',

  className: 'io-ox-calendar-edit container',

  init () {
    this.collapsed = false
  },

  render () {
    const self = this
    const rows = []
    const rowPerExtensionId = {}

    this.point.each(function (extension) {
      let row = null
      if (extension.nextTo) {
        row = rowPerExtensionId[extension.nextTo]
        if (!row) {
          row = []
          rows.push(row)
        }
      } else {
        row = []
        rows.push(row)
      }
      rowPerExtensionId[extension.id] = row
      row.push(extension)
    })

    _(rows).each(function (row) {
      const $rowNode = $('<div class="row">').appendTo(self.$el)
      _(row).each(function (extension) {
        $rowNode.addClass(extension.rowClass || '')
        extension.invoke('draw', $rowNode, self.baton)
      })
    })
    if (_.device('smartphone')) this.options.app.get('window').nodes.header.show()
    return this
  }

})

export default CalendarEditView
