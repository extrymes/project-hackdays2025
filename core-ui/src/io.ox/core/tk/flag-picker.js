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
import api from '@/io.ox/mail/api'
import { getColor } from '@/io.ox/mail/util'
import folderAPI from '@/io.ox/core/folder/api'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import '@/io.ox/core/tk/flag-picker.scss'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

/* eslint-disable no-multi-spaces */

// order is important! Colors will be rendered in this order in the dropdown
const colors = [
  // #. used as a color label: Color None
  { actionName: 'none',       label: gt('None'),        number: 0 },
  { actionName: 'red',        label: gt('Red'),         number: 1 },
  { actionName: 'orange',     label: gt('Orange'),      number: 7 },
  { actionName: 'yellow',     label: gt('Yellow'),      number: 10 },
  { actionName: 'lightgreen', label: gt('Light green'), number: 6 },
  { actionName: 'green',      label: gt('Green'),       number: 3 },
  { actionName: 'cyan',       label: gt('Cyan'),        number: 9 },
  { actionName: 'blue',       label: gt('Blue'),        number: 2 },
  { actionName: 'purple',     label: gt('Purple'),      number: 5 },
  { actionName: 'pink',       label: gt('Pink'),        number: 8 },
  { actionName: 'gray',       label: gt('Gray'),        number: 4 }]

/* eslint-enable no-multi-spaces */

const preParsed = {
  div: $('<div>'),
  list: $('<ul class="dropdown-menu" role="menu">'),
  listItem: $('<li>'),
  menuItemLink: $('<a href="#" role="menuitem" class="io-ox-action-link">'),
  listDivider: $('<li class="divider" role="separator">'),
  setColorLink: $('<a href="#">').attr('aria-label', gt('Set color'))
}

const that = {

  appendDropdown (node, data) {
    node.addClass('dropdown-toggle btn btn-toolbar')
    node.parent().addClass('dropdown flag-picker')

    const list = preParsed.list.clone()
      .on('click', 'a', { data }, that.change)
      .append(
        _(colors).map(color => {
          const $nodes = color.number === 0 ? preParsed.listDivider.clone() : $()
          const $flag = this.createFlag(color.number).find('svg').addClass('color-flag')
          return preParsed.listItem.clone()
            .append(
              preParsed.menuItemLink.clone()
                .append($.txt(color.label), $flag)
                .attr({ 'data-color': color.number, 'data-action': `color-${color.actionName}` })
            )
            .add($nodes)
        })
      )

    new Dropdown({
      el: node.parent(),
      $toggle: node,
      $ul: list
    }).render()
  },

  createFlag: color => $('<div aria-hidden=true>').attr({ title: gt('Set color') })
    .append(createIcon(color ? 'bi/flag-fill.svg' : 'bi/flag.svg')
      .addClass(`bi-18 flag_${color}`)
      .attr({ 'data-color': color })),

  draw (node, baton) {
    const data = baton.data
    const color = getColor(data)
    let link

    node.append(
      preParsed.div.clone().append(
        link = preParsed.setColorLink.clone().append(this.createFlag(color).addClass('flag-dropdown-icon'))
      )
    )

    this.appendDropdown(link, data)

    // listen for change event
    if (baton.view) baton.view.listenTo(baton.model, 'change:color_label', this.update)
  },

  change (e) {
    e.preventDefault()
    let data = e.data.data
    const color = $(e.currentTarget).attr('data-color') || '0'
    data = folderAPI.ignoreSentItems(data)
    api.flag(data, color).then(function () {
      if (e.clientX && e.clientY) return
      $('.io-ox-mail-window:visible .list-item[tabindex="0"]').trigger('focus')
    })
  },

  update (model) {
    // set proper icon class
    const color = getColor(model.toJSON())
    this.$el.find('.flag-dropdown-icon').replaceWith(
      this.createFlag(color).addClass('flag-dropdown-icon')
    )
  },

  // attach flag-picker behavior on existing node
  attach ($el, options) {
    const that = this
    this.appendDropdown($el, options.data)
    const view = options.view
    if (!view) return
    const model = view.model
    if (!model) return
    const update = function ($el) {
      if (this.disposed) return
      $el.attr('class', 'dropdown-toggle btn btn-toolbar flags')
      const color = getColor(this.model.toJSON())
      if (color) $el.addClass('color-flag colored flag_' + color)
      $el.empty().append(that.createFlag(color))
    }.bind(view, $el)
    view.listenTo(model, 'change:color_label', update)
    update()
  },

  colorName (val) {
    if (!_.isNumber(val)) return
    return colors.find(color => color.number === val)?.label
  }
}

export default that
