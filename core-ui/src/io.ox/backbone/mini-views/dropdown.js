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
import AbstractView from '@/io.ox/backbone/mini-views/abstract'
import a11y from '@/io.ox/core/a11y'
import { createIcon } from '@/io.ox/core/components'
import { addReadyListener } from '@/io.ox/core/events'

let invoke
addReadyListener('settings', async () => {
  const { invoke: invokeFunc } = await import('@/io.ox/backbone/views/actions/util')
  invoke = invokeFunc
})

function getLabel (value) {
  if (_.isFunction(value)) return value()
  if (_.isObject(value)) return value
  return $.txt(value)
}

// Bootstrap dropdown

const Dropdown = AbstractView.extend({

  tagName: 'div',
  className: 'dropdown',

  events: {
    'show.bs.dropdown': 'onShow',
    'shown.bs.dropdown': 'onShown',
    'hidden.bs.dropdown': 'resetDropdownOverlay',
    'keydown *[data-toggle="dropdown"]': 'onKeyDownToggle',
    ready: 'onReady',
    contextmenu: 'onContextMenu'
  },

  onContextMenu (e) {
    e.preventDefault()
  },

  onReady () {
    if (_.device('smartphone') && !this.options.dontProcessOnMobile) return
    if (this.smart === false && !this.$overlay) return
    if (!this.$el.hasClass('open')) return
    this.resetDimensions()
    this.adjustBounds()
  },

  resetDimensions () {
    this.$ul.css({ width: 'auto', height: 'auto' })
    return this
  },

  resetDropdownOverlay () {
    // force cleanup backdrop on mobile
    $(document).trigger('click.bs.dropdown.data-api')

    if (!this.$overlay) return
    this.$ul.removeAttr('data-original-id')
    this.$placeholder.before(this.$ul).detach()
    this.$el.removeClass('open')
    this.$ul.attr('style', this.$ul.data('style') || '').removeData('style')
    this.$overlay.remove()
    this.$toggle.attr('aria-expanded', false)
    delete this.$overlay
    if (this.lastEvent && this.lastEvent.which === 9) {
      if (this.lastEvent.shiftKey) a11y.getPreviousTabbable(this.$toggle).focus()
      else a11y.getNextTabbable(this.$toggle).focus()
      delete this.lastEvent
    }
  },

  setDropdownOverlay () {
    const self = this

    this.$overlay = $('<div class="smart-dropdown-container dropdown open" role="navigation">', this.onReady.bind(this))
      .addClass(this.$el.prop('className'))

    this.$ul.data('style', this.$ul.attr('style'))
    this.adjustBounds()

    this.$ul.attr('data-original-id', this.$placeholder.attr('id'))
    // replaceWith and detach ($.fn.replaceWith is replaceWith and remove)
    this.$ul.before(this.$placeholder).detach()
    $('body').append(
      this.$overlay.append(
        $('<div class="abs">').on('mousewheel touchmove', false)
          .on('click contextmenu', function (e) {
            e.stopPropagation()
            self.resetDropdownOverlay()
            return false
          }),
        this.$ul
      )
    )
  },

  adjustBounds () {
    const isDropUp = !!this.options.dropup
    const bounds = this.$ul.get(0).getBoundingClientRect()
    if (this.useToggleWidth) bounds.width = this.$toggle.outerWidth()
    const margins = {
      top: parseInt(this.$ul.css('margin-top') || 0, 10),
      left: parseInt(this.$ul.css('margin-left') || 0, 10)
    }
    let top = bounds.top
    let left = bounds.left
    // prefer data over bounds (to avoid misalignment)
    const minWidth = this.getMinWidth()

    const data = this.$ul.data()
    if (data.top) top = data.top
    if (data.left) left = data.left
    const positions = {
      top: top - margins.top,
      left: left - margins.left,
      right: 'auto', /* rtl */
      width: bounds.width < minWidth ? minWidth : bounds.width,
      // width: totalWidth,
      height: 'auto'
    }
    const offset = this.$toggle.offset()
    const width = this.$toggle.outerWidth()
    const availableWidth = $(window).width()
    const availableHeight = $(window).height()
    const topbar = $('#io-ox-appcontrol')

    if (isDropUp) {
      const top = this.$el.get(0).getBoundingClientRect().top
      positions.top = top - bounds.height
      // adjust height
      positions.height = bounds.height
      positions.height = Math.min(availableHeight - this.margin - positions.top, positions.height)

      // outside viewport?
      positions.left = Math.max(this.margin, positions.left)
      positions.left = Math.min(availableWidth - positions.width - this.margin, positions.left)
    } else if ((top + bounds.height > availableHeight - this.margin)) {
      // hits bottom

      // left or right?
      if ((offset.left + width + bounds.width + this.margin) < availableWidth) {
        // enough room on right side
        positions.left = offset.left + width + this.margin
      } else {
        // position of left side
        positions.left = offset.left - bounds.width - this.margin
      }

      // move dropdown up
      positions.top = availableHeight - this.margin - bounds.height
      // don't overlap topbar or banner
      positions.top = Math.max(positions.top, topbar.offset().top + topbar.height())
      // adjust height
      positions.height = bounds.height
      positions.height = Math.min(availableHeight - this.margin - positions.top, positions.height)
    } else {
      // outside viewport?
      positions.left = Math.max(this.margin, positions.left)
      positions.left = Math.min(availableWidth - positions.width - this.margin, positions.left)
    }

    // overflows top
    if (positions.top < 0) {
      positions.height = positions.height + positions.top
      positions.top = 0
      this.$overlay.addClass('scrollable')
    }

    if (this.$toggle.data('fixed')) positions.left = bounds.left
    this.$ul.css(positions)
  },

  onShow () {
    this.trigger('open')
  },

  onShown () {
    if (this.smart === false) return
    if (_.device('smartphone') && !this.options.dontProcessOnMobile) return
    this.setDropdownOverlay()
    if (this.$overlay.hasClass('scrollable')) this.$ul.scrollTop(this.$ul.height())
  },

  onKeyDownToggle (e) {
    // select first or last item, if already open
    if (!this.$el.hasClass('open') || !this.$overlay) return
    // special focus handling, because the $ul is no longer a child of the view
    const items = a11y.getTabbable(this.$ul)
    if (e.which === 40) items.first(':visible').focus()
    if (e.which === 38) items.last(':visible').focus()
    // special close handling on ESC
    if (e.which === 27) {
      this.$toggle.trigger('click')
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  },

  onKeyDownMenu (e) {
    if (e.which !== 9) return
    this.lastEvent = e
  },

  open () {
    if (this.$el.hasClass('open') || this.$overlay) return
    this.$toggle.trigger('click')
  },

  close () {
    if (this.$el.hasClass('open') || this.$overlay) this.$toggle.trigger('click')
  },

  onClick (e) {
    const node = $(e.currentTarget)
    const href = node.attr('href')
    const name = node.attr('data-name')
    const value = node.data('value')
    const toggleValue = node.data('toggle-value')
    const toggle = node.data('toggle')
    const keep = this.options.keep || node.attr('data-keep-open') === 'true'
    // do not handle links with valid href attribute
    if (href && href.length !== 0 && href !== '#') return
    e.preventDefault()
    // keep drop-down open?
    if (keep) e.stopPropagation()
    // ignore plain links
    if (node.hasClass('disabled')) return
    // make sure event bubbles up
    if (!e.isPropagationStopped() && this.$overlay && this.$placeholder && !this.options.noDetach) {
      // to use jquery event bubbling, the element, which triggered the event must have the correct parents
      // therefore, the target element is inserted at the original position before event bubbling
      // the element only remains at that position while the event bubbles
      const $temp = $('<div class="hidden">')
      node.before($temp).detach()
      this.$placeholder.append(node)
      // lazy metrics support
      this.$el.trigger(_.extend({}, e, { type: 'mousedown' }))

      this.$el.trigger(e)
      $temp.replaceWith(node)
    }
    // always forward event
    this.trigger('click', node.data())
    // return if model or value is missing
    if (!this.model) return
    if (!this.options.allowUndefined && value === undefined) return
    // finally update value
    let nextValue = value
    if (toggle) {
      if (toggleValue === undefined) {
        // boolean toggle
        nextValue = !this.model.get(name)
      } else {
        // alternate between 2 non boolean values
        nextValue = this.model.get(name) === value ? toggleValue : value
      }
    }
    if (this.options.saveAsArray) nextValue = [nextValue]
    this.model.set(name, nextValue)
  },

  setup () {
    this.$ul = this.options.$ul || this.$ul || $('<ul class="dropdown-menu" role="menu">')
    this.$placeholder = $('<div class="hidden">').attr('id', _.uniqueId('dropdown-placeholder-'))
    this.smart = this.options.smart
    this.margin = this.options.margin || 8
    this.useToggleWidth = this.options.useToggleWidth
    // support right alignment
    if (this.options.alignRight) this.$ul.addClass('dropdown-menu-right')
    // not so nice but we need this for mobile support
    // if $ul pops out on the overlay, this line is also required
    this.$ul.on('click', 'a, button', $.proxy(this.onClick, this))
    this.$ul.on('keydown', 'a, button', $.proxy(this.onKeyDownMenu, this))

    if (this.model) this.listenTo(this.model, 'change', this.options.update || this.update)
    if (this.options.dontProcessOnMobile) {
      this.$el.attr('dontProcessOnMobile', true)
      this.$ul.attr('dontProcessOnMobile', true)
    }
  },

  update () {
    if (!this.model) return
    _(this.model.changed).each((value, name) => {
      // loop over changes list items
      this.$ul.find(`[data-name="${CSS.escape(name)}"]`).each(function () {
        const $el = $(this)
        $el.attr('aria-checked', _.isEqual($el.data('value'), value))
      })
    })
    // update drop-down toggle
    this.label()
  },

  label () {
    // extend this class for a custom implementation
  },

  stringify (value) {
    return _.isObject(value) ? JSON.stringify(value) : value
  },

  append (fn, options) {
    (options && options.group ? this.$ul.find('[role="group"]:last') : this.$ul).append(
      $('<li role="presentation">').append(fn)
    )
    return this
  },

  option (name, value, text, options) {
    options = _.extend({ prefix: '', toggleValue: undefined, radio: false }, options)

    const currentValue = this.model ? this.model.get(name) : undefined
    const checked = _.isEqual(currentValue, value)
    const role = options.radio ? 'menuitemradio' : 'menuitemcheckbox'
    const plainText = _.isFunction(text) ? $('<div>').append(text()).text() : text
    const ariaLabel = options.prefix ? [options.prefix, plainText].join(' ') : undefined
    const $checkMark = $('<div class="checkmark">')
    const $option = $('<a href="#" draggable="false">')
      .attr({
        role,
        'aria-checked': checked,
        'data-keep-open': options.keepOpen ? true : undefined,
        'data-name': name,
        'data-value': this.stringify(value),
        // you may use toggle with boolean values or provide a toggleValue ('toggleValue' is the option not checked value, 'value' is the option checked value)
        'data-toggle': _.isBoolean(value) || options.toggleValue !== undefined,
        'data-toggle-value': options.toggleValue,
        'aria-label': ariaLabel,
        title: options.title,
        tabindex: '-1'
      })

    if (options.color) $checkMark.css('background-color', options.color)

    $option
    // in firefox draggable=false is not enough to prevent dragging...
      .on('dragstart', false)
    // store original value
      .data('value', value)
      .append(
        $checkMark,
        options.icon || $(),
        _.isFunction(text) ? text() : $.txt(text),
        options.illustration || $()
      )

    return this.append($option, _.pick(options, 'group'))
  },

  // used to manually prevent the popup from closing.The only exception is a direct click on the toggle button. Make sure to reset this or the popup stays open when you don't want to
  forceOpen (state) {
    this.$el.attr('forceOpen', state)
  },

  link (name, text, callback, options) {
    options = options || {}
    const link = (options.$el || $('<a href="#" draggable="false" role="menuitem" tabindex="-1">'))
      .attr('data-name', name)
    // in firefox draggable=false is not enough to prevent dragging...
      .on('dragstart', false)
      .append(
        // bug #54320 - no need for <span>
        $.txt(text)
      )
    if (options.data) link.data(options.data)
    if (callback) link.on('click', {}, callback)
    return this.append(link, _.pick(options, 'group'))
  },

  action (id, text, baton) {
    this.link(id, text, function (e) {
      e.preventDefault()
      if ($(this).prop('disabled')) return
      baton.e = e
      baton.folder_id = baton.app.folder.get()
      invoke(id, baton)
    })
  },

  header (text) {
    this.$ul.append(
      $('<li class="dropdown-header" role="separator">').append(
        $('<span aria-hidden="true">').text(text)
      )
    )
    return this
  },

  group (text, nodes) {
    this.header(text)
    this.$ul.append(
      $('<div role="group">').attr('aria-label', text).append(nodes)
    )
    return this
  },

  headlessGroup (text) {
    this.$ul.append($('<div role="group">').attr('aria-label', text))
    return this
  },

  divider () {
    this.$ul.append('<li class="divider" role="separator">')
    return this
  },

  render () {
    $(this.$el, function () {
      this.trigger('ready')
    }.bind(this))
    const label = getLabel(this.options.label)
    let ariaLabel = this.options.aria ? this.options.aria : null
    const buttonToggle = this.options.buttonToggle
    const $toggle = buttonToggle
      ? $('<button type="button" draggable="false" class="btn">').addClass(buttonToggle === true ? 'btn-default' : buttonToggle)
      : $('<a href="#" draggable="false">')

    if (_.isString(label)) ariaLabel += (' ' + label)

    this.$el.append(
      this.$toggle = this.options.$toggle || this.$toggle || $toggle.attr({
        'aria-label': ariaLabel,
        'data-action': this.options.dataAction,
        title: this.options.title || null,
        // in firefox draggable=false is not enough to prevent dragging...
        ondragstart: _.device('firefox') ? 'return false;' : null
      })
        .append(
          $('<span class="dropdown-label">').append(label),
          this.options.caret ? createIcon('bi/chevron-down.svg').addClass('bi-12 ms-4') : []
        ),
      this.$ul
    )
    // update custom label
    this.label()
    this.ensureA11y()
    return this
  },

  ensureA11y () {
    const items = this.$ul.children('li')

    this.$toggle.attr({
      'aria-haspopup': true,
      'aria-expanded': false,
      'data-toggle': 'dropdown'
    })

    if (this.$toggle.is('a')) this.$toggle.attr('role', 'button')

    if (this.options.tabindex) this.$toggle.attr('tabindex', this.options.tabindex)

    this.$ul
      .not('[role]')
      .attr({ role: 'menu' })

    items
      .filter(':not([role])')
      .attr({ role: 'presentation' })

    items
      .find('a:not([role])')
      .attr({ role: 'menuitem', tabindex: '-1' })
  },

  getMinWidth () {
    const minWidthElement = document.querySelector('a[data-name=dropdown-min-width]')
    if (!minWidthElement) return -1
    const style = getComputedStyle(minWidthElement)
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = `${style.fontSize} ${style.fontFamily}`
    const text = ctx.measureText(minWidthElement.innerText)
    // add padding
    return Math.ceil(text.width) + 40
  },

  prepareReuse () {
    if (this.$toggle) this.$toggle.remove()
    if (this.$ul) this.$ul.empty()
    return this
  },

  dispose () {
    // remove overlay if dropdown code is removed
    if (this.$overlay) this.$overlay.remove()
    if (this.$ul) this.$ul.remove()
    AbstractView.prototype.dispose.call(this, arguments)
  }

})

export default Dropdown
