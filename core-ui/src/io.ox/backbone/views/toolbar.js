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

import _ from '@/underscore'
import $ from '@/jquery'

import DisposableView from '@/io.ox/backbone/views/disposable'
import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/backbone/views/actions/util'
import { createButton, createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

//
// Toolbar.
//
// options:
// - point: extension point id to render items
// - inline (bool; default false): use as inline images; primarily uses different CSS classes
// - dropdown (bool; default true): move "lo" priority items into dropdown (if more than 2 "hi")
// - simple (bool; default false): defines whether simple collection checks should be used, i.e. no folder-specific stuff
// - align (string; default "left"): defines default alignment (left or right)
// - strict (boolean; default "true"): update only if selection has changed

const ToolbarView = DisposableView.extend({
  events: {
    'click a[data-action]': 'onClick',
    'click button[data-action]': 'onClick',
    'focus > ul > li > button': 'onFocus'
  },

  // we use the constructor here not to collide with initialize()
  constructor: function (options) {
    // add central extension point
    this.options = {
      inline: false,
      point: '',
      dropdown: true,
      simple: false,
      strict: true,
      align: 'left',
      closeButton: false,
      ...options
    }
    this.setPoint(this.options.point)
    DisposableView.prototype.constructor.apply(this, arguments)
    this.$el
      .addClass(this.options.inline ? 'inline-toolbar-container' : 'classic-toolbar-container')
      .toggleClass('text-right', this.options.align === 'right')
      .append(this.createToolbar())
    this.selection = null
    if (this.options.data) this.setData(this.options.data)

    // _finalizeRender is added to the prototype, but for the _.lfo function
    // we a different instance for each toolbar.
    this.finalizeRender = function ($toolbar) { this._finalizeRender($toolbar) }
  },

  _finalizeRender ($toolbar) {
    if (this.disposed) return
    this.injectMoreDropdown($toolbar)
    this.injectCloseButton($toolbar)
    this.replaceToolbar($toolbar)
    this.initButtons($toolbar)
    this.ready()
  },

  render (baton) {
    if (!baton) return this
    const items = this.point.list()
      .map(util.processItem.bind(null, baton))
      .map(util.createItem.bind(null, baton))
    const $toolbar = this.createToolbar().append(_(items).pluck('$li'))
    util.waitForMatches(items, _.lfo(true, this, this.finalizeRender, $toolbar))
    return this
  },

  createToolbar () {
    const title = this.options.title ? gt('%1$s toolbar. Use cursor keys to navigate.', this.options.title) : gt('Actions. Use cursor keys to navigate.')
    return $('<ul role="toolbar">')
      .addClass(this.options.inline ? 'inline-toolbar' : 'classic-toolbar')
      .attr({ 'aria-label': title })
    // always avoid clearing the URL hash
      .on('click', 'a', $.preventDefault)
  },

  replaceToolbar ($toolbar) {
    // identify focused element and try to focus the same element later
    const focus = $.contains(this.el, document.activeElement); let selector
    if (focus) {
      const activeElement = $(document.activeElement)
      const action = activeElement.data('action')
      if (action) selector = `[data-action="${CSS.escape(action)}"]`
      // try to select the element at the same position as before
      else selector = '> li:eq(' + activeElement.closest('li').index() + ') ' + activeElement.prop('tagName') + ':first'
    }
    this.$('> ul').tooltip('hide').replaceWith($toolbar)
    if (selector) this.$(selector).focus()
    return this
  },

  injectMoreDropdown ($toolbar) {
    // remove hidden elements first
    $toolbar.find('li.hidden').remove()
    // get elements with lower priority
    const $lo = $toolbar.children('[data-prio="lo"]')
    // hide $lo if all items are disabled (we had this behavior before)
    // reason: no disabled items at the end of the list & no useless dropdown
    if ($lo.length === $lo.children('a.disabled').length) return $lo.remove()
    // injecting dropdown menus must be allowed by configuration
    // avoid useless dropdown menus with no items
    if (!this.options.dropdown || !$lo.length) return
    // count hi
    const $hi = $toolbar.children('[data-prio="hi"]:not(.hidden)')
    // draw dropdown
    const $ul = util.createDropdownList().toggleClass('dropdown-menu-right', $hi.length > 1)
    const $dropdown = util.createListItem().addClass('dropdown more-dropdown').append(
      util.createDropdownToggle()
        .attr('data-action', 'more')
        .append(createIcon('bi/three-dots.svg').addClass('bi-18'))
        .addActionTooltip(_.device('smartphone') ? gt('Actions') : gt('More actions')),
      $ul
    )
    // close tooltip when opening the dropdown
    $dropdown.on('shown.bs.dropdown', function () { $(this).find('a').tooltip('hide') })
    // $ul is descendent of <body> for smartphones, so events bubble differently
    if (_.device('smartphone')) {
      util.bindActionEvent($ul)
    } else {
      util.addBackdrop($dropdown)
    }
    $dropdown.on('dispose', function () { $ul.remove() })

    $dropdown.insertAfter($lo.last())
    // replace icons by text
    $lo.find('> button').replaceWith(function () {
      return $('<a>')
        .attr({
          'data-action': $(this).attr('data-action'),
          href: '#',
          tabindex: -1,
          role: 'menuitem',
          draggable: false
        })
        .data({ baton: $(this).data('baton') })
        .text($(this).attr('aria-label'))
    })
    $ul.append($lo)
    util.injectSectionDividers($ul)
  },

  injectCloseButton ($toolbar) {
    if (!this.options.closeButton) return
    $toolbar.append(
      $('<li role="presentation">').append(
        createButton({ variant: 'link', tabindex: -1, icon: { name: 'bi/x-lg.svg', title: gt('Close') } })
          .attr('data-action', 'close')
      )
    )
  },

  getButtons () {
    return this.$('> ul > li > a').not(':hidden')
  },

  disableButtons () {
    // remove action attributes (also from dropdown menus) and event handlers
    this.$('a[data-action]').attr('data-action', null)
    this.getButtons().off().tooltip('hide').tooltip('disable')
  },

  initButtons ($toolbar) {
    this.getButtons().attr('tabindex', -1)
    $toolbar.find('> li > a:not(.disabled), > li > button').first().attr('tabindex', 0)
  },

  // selection is expected to be array of object
  // - object must provide id and folder_id
  // - object_permissions if available
  // we serialize this array to check whether selection has really changed
  // this allows checking the selection for e2e testing
  // options can be object or function that returns options
  setSelection (selection, options) {
    // this function might be called through debounce(), so async, so check disposed
    if (this.disposed || !_.isArray(selection)) return

    // just join array; we could sort() as well but that's just a theoretical case
    const serialized = selection.map(util.cid).join(',')
    // not changed?
    if (this.options.strict && this.selection === serialized) return this.ready()
    this.selection = serialized
    this.disableButtons()

    return util.setSelection.call(this, selection, options)
  },

  setData: util.setData,

  setPoint (point) {
    this.point = _.isString(point) ? ext.point(point) : point
    return this
  },

  ready () {
    // this event can be used for e2e testing; toolbar is ready
    this.trigger('ready ready:' + this.selection, this.selection)
  },

  onFocus (e) {
    this.getButtons().attr('tabindex', -1)
    $(e.currentTarget).attr('tabindex', 0)
  },

  onClick (e) {
    util.invokeByEvent(e)
  }
})

export default ToolbarView
