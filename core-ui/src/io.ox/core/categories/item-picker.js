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
import '@/io.ox/calendar/color-picker.scss'
import DisposableView from '@/io.ox/backbone/views/disposable'
import { createIcon } from '@/io.ox/core/components'
import '@/io.ox/core/categories/style.scss'
import _ from '@/underscore'

const ItemPicker = DisposableView.extend({
  className: 'io-ox-item-picker',
  initialize (opt) {
    this.opt = {
      attribute: 'color',
      items: [],
      ItemView: ItemIconView,
      ...opt
    }
  },

  events: {
    change: 'onChange'
  },

  onChange (e) {
    this.model.set(this.opt.attribute, e.target.value)
  },

  render () {
    this.$el.empty().append(
      this.opt.items.map(item => {
        const id = _.uniqueId('itemview')
        const $label = $(`<label for='${id}'>`).append(new this.opt.ItemView(item).render().$el)
        const $input = $(`<input type="radio" name="${this.opt.attribute}" value='${item.value}' id='${id}' data-name='${item.label}'/>`)
          .attr({ checked: item.value === this.model.get(this.opt.attribute) })
        return $('<span>').append($input, $label)
      })
    )
    return this
  }
})

const ItemColorView = Backbone.View.extend({
  className: 'item-picker-item btn btn-link color-box-link item-picker-item-color',
  initialize (opt) {
    this.opt = opt
  },
  render () {
    const $item = $('<span class="item-picker-item-unchecked">Aa</span>')
    const $checkedItem = $('<span class="item-picker-item-checked">').append(createIcon('bi/check-lg.svg'))
    const $srLabel = $('<span class="sr-only">').text(this.opt.label)
    const $titlewrapper = $('<span aria-hidden="true">').attr('title', this.opt.label)
    this.$el
      .css({
        borderColor: this.opt.border,
        color: this.opt.foreground,
        backgroundColor: this.opt.background
      })
      .append($titlewrapper.append($item, $checkedItem), $srLabel)
    return this
  }
})

const ItemIconView = Backbone.View.extend({
  className: 'item-picker-item btn btn-link color-box-link item-picker-item-icon',
  initialize (opt) {
    this.opt = opt
  },
  render () {
    const $srLabel = $('<span class="sr-only">').text(this.opt.label)
    let $icon
    if (this.opt.value === 'none') {
      $icon = $('<div class="icon-outer" title="No icon">').append($('<div class="icon-inner">'))
    } else {
      $icon = $('<div>').attr({ title: this.opt.label }).append(createIcon(this.opt.value))
    }
    this.$el.empty().append($icon, $srLabel)

    return this
  }
})

export { ItemPicker, ItemColorView, ItemIconView }
