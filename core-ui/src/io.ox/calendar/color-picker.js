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

import ox from '@/ox'
import { colors, sanitizeHue, deriveAppointmentColors } from '@/io.ox/calendar/util'
import '@/io.ox/calendar/color-picker.scss'
import DisposableView from '@/io.ox/backbone/views/disposable'
import _ from '@/underscore'
import $ from '@/jquery'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

export default DisposableView.extend({

  className: 'io-ox-calendar-color-picker',
  initialize (opt) {
    this.opt = _.extend({
      noColorOption: false,
      attribute: 'color'
    }, opt)

    this.onClickColor = this.onClickColor.bind(this)

    // allow custom getter and setter
    if (this.opt.getValue) this.getValue = this.opt.getValue
    if (this.opt.setValue) this.setValue = this.opt.setValue

    this.listenTo(this.model, `change:${this.opt.attribute}`, this.onChangeColor)
    ox.on('themeChange', () => this.setColors())
  },

  setColors () {
    if (!this.$el) return
    this.$el.empty()
    this.render()
  },

  getValue () {
    return this.model.get(this.opt.attribute)
  },

  setValue (value) {
    this.model.set(this.opt.attribute, value)
  },

  onChangeColor (e) {
    const prev = this.$(`[data-value="${this.model.previous(this.opt.attribute)}"]`)
    const current = this.$(`[data-value="${this.model.get(this.opt.attribute)}"]`)
    prev.find('svg').remove()
    prev.css('box-shadow', '')
    prev.append($('<span class="color-picker-example" aria-hidden="true">').text('Aa'))
    current.find('.color-picker-example').remove()
    const color = current.css('border-color')
    current.css('box-shadow', `0 0 0 2px ${color}`).append(createIcon('bi/check-lg.svg'))
  },

  onClickColor (e) {
    this.setValue($(e.currentTarget).data('value'))
  },

  onKeyDown (e) {
    if (![37, 38, 39, 40].includes(e.which)) return // short-circuit for not-arrow-keys

    const $origin = $(e.target)
    const $newtarget = [37, 38].includes(e.which) ? $origin.prev() : $origin.next()
    $origin.attr({ tabindex: -1 })
    $newtarget.attr({ tabindex: 0 }).focus()
  },

  renderOption (color, idx) {
    const colors = deriveAppointmentColors(color.value)
    const checked = sanitizeHue(this.getValue()) === color.value
    const $button = $('<a type="button" class="btn btn-link color-box-link">')
      .attr({
        id: _.uniqueId('color-label-'),
        role: 'menuitemradio',
        'aria-checked': checked,
        'data-name': this.opt.attribute,
        'data-value': checked ? this.getValue() : color.value,
        tabindex: checked || (!checked && idx === 0) ? 0 : '-1',
        title: color.label
      })
      .css({
        borderColor: colors.border,
        color: colors.foreground,
        backgroundColor: colors.background
      })
      .append(
        $('<span class="sr-only">').text(color.label),
        checked ? createIcon('bi/check-lg.svg') : $('<span class="color-picker-example" aria-hidden="true">').text('Aa')
      )
      .on('click', this.onClickColor)
      .on('keydown', this.onKeyDown)

    if (checked) $button.css('box-shadow', `0 0 0 2px ${colors.border}`)
    return $button
  },

  render () {
    if (this.opt.noColorOption) {
      this.$el.append(
        this.renderOption({ label: gt('no color') })
          .addClass('no-color')
      )
    }

    this.$el.append(
      colors.map((color, idx) => this.renderOption(color, idx))
    )

    return this
  }

})
