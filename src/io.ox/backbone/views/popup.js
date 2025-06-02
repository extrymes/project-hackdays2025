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
import ox from '@/ox'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import a11y from '@/io.ox/core/a11y'
import gt from 'gettext'
import { createButton } from '@/io.ox/core/components'

const PopupView = ExtensibleView.extend({

  $container: $('#io-ox-core'),

  className: 'detail-popup flex-col',

  constructor: function () {
    ExtensibleView.prototype.constructor.apply(this, arguments)
    // basic markup
    this.$el.attr('tabindex', -1).css('zIndex', $.zIndex()).append(
      this.$header = $('<div class="popup-header flex-row">').append(
        this.$toolbar = $('<div class="popup-toolbar">'),
        $('<div class="popup-close">').append(
          createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Close') } })
            .attr('data-action', 'close')
        )
      ),
      this.$body = $('<div class="popup-body">'),
      this.$footer = $('<div class="popup-footer">')
    )
    // handle close
    this.$el.on('click', '[data-action="close"]', () => this.close())
    this.$el.on('keydown', e => {
      if (e.which === 27) {
        e.stopImmediatePropagation()
        this.close()
      } else if (e.which === 9) a11y.trapFocus(this.el, e)
    })
    // watch out for bubbling remove events (e.g. appointment deleted)
    this.$el.on('view:remove', () => this.close())
    // watch out for "outer" clicks
    const handleOuterClick = e => {
      const ignoreList = [
        '.detail-popup',
        '[data-detail-popup]',
        `.modal-dialog:not(.${this.cid}-parent)`,
        '.floating-window',
        '.io-ox-viewer'
      ]

      if ($(e.target).closest(ignoreList.join(', ')).length || !document.contains(e.target)) return
      this.close()
    }
    $(document).on('click popup', handleOuterClick)
    this.on('dispose', () => {
      $(document).off('click popup', handleOuterClick)
      this.$container.removeClass(`${this.cid}-parent`)
    })
  },

  snap (e) {
    let reference = e.target.closest(this.options.selector || '*')
    if (!reference || reference.length === 0) return
    if (reference.get) reference = reference.get(0)
    this.reference = reference

    // support clicks inside modal dialogs
    const modalContainer = reference.closest('.modal-dialog')
    this.$container = modalContainer ? $(modalContainer) : this.$container

    if (this.$container.hasClass('modal-dialog')) {
      // ignore popup parent in `ignoreList` of `handleOuterClick`
      this.$container.addClass(`${this.cid}-parent`)
    }

    const rect = reference.getBoundingClientRect()
    const rectContainer = this.$container.get(0).getBoundingClientRect()
    const vw = this.$container.width()
    const vh = this.$container.height()
    const mx = (vw / 2 >> 0) + rectContainer.left
    const my = (vh / 2 >> 0) + rectContainer.top
    // if pageX and pageY are zero/undefined, it's probably a keyboard event (enter)
    const keyboard = [e.pageX, e.pageY].filter(Boolean).length === 0
    const px = keyboard ? (rect.left + rect.right) / 2 >> 0 : e.pageX
    const py = keyboard ? (rect.top + rect.bottom) / 2 >> 0 : e.pageY
    this.lastSnap = $.extend({ px, py, vw, vh, mx, my }, rect)
  },

  show ({ center = false } = {}) {
    if (center) {
      this.$el.height(500).css({
        top: '200px',
        left: 'calc(50% - 300px)'
      }).appendTo(this.$container)
    } else {
      this.align()
    }
    this.previousActiveElement = document.activeElement
    this.$el.focus()
    return this
  },

  align () {
    if (!this.lastSnap) return
    // append to DOM otherwise we don't get a height
    this.$el.addClass('invisible').appendTo(this.$container)
    const inset = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' }
    const r = this.lastSnap
    const width = this.$el.width()
    const height = this.$el.height()
    if (r.px < r.mx) {
      inset.left = Math.min(r.right + 8 >> 0, r.vw - width - 8)
    } else {
      inset.right = Math.min(Math.max(8, r.vw - r.left + 8), r.vw - width - 8)
    }

    if (r.py < r.my) {
      if ((r.top + height) > (r.vh - 40)) inset.bottom = 40
      else inset.top = Math.max(16, r.top >> 0)
    } else {
      if ((r.bottom - height) < 40) inset.top = 40
      else inset.bottom = Math.max(16, r.vh - r.bottom >> 0)
    }
    if (!_.device('smartphone')) this.$el.css(inset)
    this.$el.removeClass('invisible')
  },

  close () {
    if (!this.disposed) {
      this.trigger('close')
      this.restoreFocus()
      this.$el.remove()
    }
    return this
  },

  restoreFocus () {
    if (!this.previousActiveElement) return
    // restore focus on previous element but only if current popup has the focus
    const active = document.activeElement

    if (!$(this.previousActiveElement).is(':visible')) return ox.trigger('restoreFocus:failed', this.previousActiveElement)

    if (this.el === active || $.contains(this.el, active)) this.previousActiveElement.focus()
  },

  busy () {
    this.$('button, :input').each(function (key, val) {
      val = $(val)
      val[val.prop('disabled') ? 'data' : 'prop']('disabled', true)
    })
    return this
  },

  idle () {
    this.$('button, input').each(function (key, val) {
      val = $(val)
      val[val.data('disabled') ? 'removeData' : 'prop']('disabled', false)
    })
    return this
  }
})

export default PopupView
