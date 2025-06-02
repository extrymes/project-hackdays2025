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
import AbstractView from '@/io.ox/backbone/mini-views/abstract'

const GridView = AbstractView.extend({
  tagName: 'div', // don't use ul, because that triggers bootstraps arrow key handling

  lastFocused: null, // keep track of last focused item so we can decide if we need to restore the last focus
  events: {
    keydown: 'handleKeydown',
    focusin: 'handleFocusin'
  },

  initialize (options) {
    this.options = {
      label: null,
      items: [],
      ...options
    }
  },
  handleFocusin (e) {
    // restore focus to last focussed element
    if (!this.lastFocused) return

    $(this.lastFocused).focus()
    this.lastFocused = null
  },
  handleKeydown (e) {
    if (e.which === 13) return $(e.target).trigger('click')
    if (![37, 38, 39, 40].includes(e.which)) return // handle arrow-keys only

    const $target = $(e.target)

    // calculate width of this item and of the wrapper item, assume all child items are of the same size
    const width = $target.outerWidth(true)
    const wrapperWidth = this.$el.innerWidth()
    const itemsPerRow = Math.floor(wrapperWidth / width)
    const index = $target.index()
    const totalElements = this.$el.children().length
    const totalRows = Math.ceil(totalElements / itemsPerRow)
    const currentRow = Math.floor(index / itemsPerRow)
    const currentCol = index - currentRow * itemsPerRow

    let target = -1
    let stopPropagation = true
    switch (e.which) {
      case 37: // left
        if (currentCol > 0) target = index - 1
        break
      case 39: // right
        if (currentCol + 1 < itemsPerRow) target = index + 1
        break
      case 38: // up
        if (currentRow > 0) {
          target = index - itemsPerRow
          this.lastFocused = null
        } else {
          if (index > 0) {
            // lets stop this event, and resubmit as if it were on the first item
            this.lastFocused = e.target
            e.target = this.$el.children().first()[0]
            this.$el.trigger(e)
          } else {
            // on last element, let this event go through to bootstrap
            stopPropagation = false
          }
        }
        break
      case 40: // down
        if (currentRow + 1 < totalRows) {
          target = index + itemsPerRow
          this.lastFocused = null
        } else {
          if (index + 1 < totalElements) {
            // lets stop this event, and resubmit as if it were on the last item
            this.lastFocused = e.target
            e.target = this.$el.children().last()[0]
            this.$el.trigger(e)
          } else {
            // on last element, let this event go through to bootstrap
            stopPropagation = false
          }
        }
        break
    }

    // stop event and focus target element
    if (stopPropagation) {
      e.stopImmediatePropagation()
      e.stopPropagation()
      if (target !== -1) {
        this.$el.children().eq(target).focus()
      }
    }
  },

  // try to render items and keep track of focus, allowing to 2d arrow-key navigate.
  // Jumps to next/previous item when reaching bottom/top
  render () {
    this.$el
      .addClass('gridview')
      .attr('role', 'grid') // https://www.w3.org/TR/wai-aria/#grid
      .attr('aria-label', this.options.label)
      .append(this.options.items)
    return this
  }
})

export default GridView
