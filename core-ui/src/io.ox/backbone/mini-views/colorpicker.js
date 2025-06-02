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

import DropdownView from '@/io.ox/backbone/mini-views/dropdown'
import '@/io.ox/backbone/mini-views/colorpicker.scss'

import gt from 'gettext'
import GridView from '@/io.ox/backbone/mini-views/gridview'

const defaultColors = [
  // same palette as tiny mce
  // #. color names for screen readers
  { value: '#BFEDD2', name: gt('Light Green') }, { value: '#FBEEB8', name: gt('Light Yellow') }, { value: '#F8CAC6', name: gt('Light Red') }, { value: '#ECCAFA', name: gt('Light Purple') }, { value: '#C2E0F4', name: gt('Light Blue') },
  { value: '#2DC26B', name: gt('Green') }, { value: '#F1C40F', name: gt('Yellow') }, { value: '#E03E2D', name: gt('Red') }, { value: '#B96AD9', name: gt('Purple') }, { value: '#3598DB', name: gt('Blue') },
  { value: '#169179', name: gt('Dark Turquoise') }, { value: '#E67E23', name: gt('Orange') }, { value: '#BA372A', name: gt('Dark Red') }, { value: '#843FA1', name: gt('Dark Purple') }, { value: '#236FA1', name: gt('Dark Blue') },
  { value: '#ECF0F1', name: gt('Light Gray') }, { value: '#CED4D9', name: gt('Medium Gray') }, { value: '#95A5A6', name: gt('Gray') }, { value: '#7E8C8D', name: gt('Dark Gray') }, { value: '#34495E', name: gt('Navy Blue') },
  { value: '#000000', name: gt('Black') }, { value: 'transparent', name: gt('No color') }
]
const colorpicker = DropdownView.extend({
  setup (options) {
    colorpicker.__super__.setup.call(this, options)
    this.$ul.addClass('colorpicker-container')

    const items = defaultColors.map(color =>
      $('<a href="#" tabindex="-1" aria-haspopup="false" aria-disabled="false" class="colorpicker-item" role="menuitem">')
        .attr({ 'data-name': this.name, title: color.name, 'data-value': color.value, 'aria-checked': this.model.get(this.name) === color.value })
        .css('background-color', color.value)
        .toggleClass('no-color', color.value === 'transparent')
        .append(color.value === 'transparent' && '<svg width="24" height="24"><path stroke="#000" stroke-width="2" d="M21 3L3 21" fill-rule="evenodd"></path></svg>')
        .on('click', e => {
          this.onClick(e)
          _.defer(() => this.close())
        })
    )

    const grid = new GridView({ items })
    this.append(grid.render().$el)
  }
})
export default colorpicker
