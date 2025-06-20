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

function Selection (view) {
  this.view = view

  this.view.$el
    .on('click contextmenu', '.selectable', $.proxy(this.onClick, this))
    .on('keydown', '.selectable', $.proxy(this.onKeydown, this))
  // bug 54193: do not set focus
    .on('mousedown contextmenu', '.selectable', function (e) { e.preventDefault() })

  if (view.options.dblclick) this.view.$el.on('dblclick', $.proxy(this.onDblClick, this))

  this.view.$el.addClass('dropzone')
    .attr('data-dropzones', '.selectable')
    .on('drop', function (e, baton) {
      if (!baton) return
      baton.dropType = view.module
      view.selection.trigger('selection:drop', baton)
    })

  this.selectableVirtualFolders = {}
  this.unselectableFolders = {}
}

function triggerEvent (event) {
  if (event === 'change') this.triggerChange.apply(this, _(arguments).toArray().splice(1))
  else this.view.trigger.apply(this.view, arguments)
}

_.extend(Selection.prototype, {

  /**
   * Returns the node from the tree view
   * @param {string}        id       id to select
   * @param {jQuery.Node[]} items    nodes to check
   * @param {boolean}       favorite select favorites first
   */
  byId (id, items, favorite) {
    items = items || this.getItems()
    // use first, we might have duplicates
    const elements = items.filter(`[data-id="${CSS.escape(id)}"]`)
    let returnElement = elements.first()

    if (elements.length !== 1) {
      elements.each(function () {
        if (favorite && $(this).parentsUntil('.tree-container', '.folder.favorites').length) {
          returnElement = $(this)
        } else if (!favorite && !$(this).parentsUntil('.tree-container', '.folder.favorites').length) {
          returnElement = $(this)
        }
      })
    }

    return returnElement
  },

  get (attribute) {
    return this.view.$el.find('.selectable.selected').attr(attribute || 'data-id')
  },

  /**
   * Select the folder in the tree view
   * @param {string}  id       node to select
   * @param {boolean} favorite select favorites first
   */
  set (id, favorite) {
    const items = this.getItems()
    const node = this.byId(id, items, favorite)
    const index = items.index(node)
    // not found?
    if (index === -1) return
    // check if already selected to avoid event loops.
    // just checking hasClass('selected') doesn't work.
    // we use get() to support duplicates!
    if (this.get() === id) return
    this.uncheck(items)
    this.pick(index, items, { focus: false })
  },

  // returns true if successful
  preselect (id) {
    const node = this.check(this.byId(id))
    if (node.length > 0) {
      this.view.$container.attr('aria-activedescendant', node.attr('id'))
      return true
    }
    return false
  },

  scrollIntoView (id) {
    // scroll viewport to top (see bug 38411)
    const node = this.byId(id)
    if (node.length) {
      node[0].scrollIntoView(true)
      this.view.trigger('scrollIntoView', id)
    }
  },

  onClick (e) {
    // ignore native checkbox
    if ($(e.target).is(':checkbox')) return

    // avoid double selections
    if (e.isDefaultPrevented()) return
    e.preventDefault()

    // only select in mobile edit mode when clicking on the label
    if (this.view.app && this.view.app.props && this.view.app.props.get('mobileFolderSelectMode') === true && !$(e.target).hasClass('folder-label')) return

    if (e.type === 'contextmenu') e.stopPropagation()
    // ignore keyboard contextmenu events
    if (e.type === 'contextmenu' && e.which === 0) return

    const items = this.getItems()
    const current = $(e.currentTarget)
    const index = items.index(current) || 0

    // trigger action event
    this.view.trigger('selection:action', items, index)

    // Bug 64624: remove selection from tree when drive is the previewed folder
    if (this.view.app && this.view.app.get('name') === 'io.ox/files' && this.view.app.folder.get() === '9') current.removeClass('selected')

    // do nothing if already selected
    if (current.hasClass('selected')) return

    this.resetTabIndex(items, items.eq(index))
    this.uncheck(items)
    this.pick(index, items)
  },

  onDblClick (e) {
    // ignore native checkbox
    if ($(e.target).is(':checkbox')) return
    if ($(e.target).closest('.contextmenu-control').length > 0) return

    const target = $(e.target)
    const node = target.closest('.folder')
    const folder = node.attr('data-id')
    if (this.view.options.instantTrigger) return this.triggerEventInstant('dblclick', e, folder)
    this.triggerEvent('dblclick', e, folder)
  },

  onKeydown (e) {
    if (!/38|40/.test(e.which)) return

    // Prevent scrolling on contextmenu-control
    if ($(e.target).hasClass('contextmenu-control')) return e.preventDefault()

    // bubbling?
    if (!$(e.target).hasClass('selectable')) return

    this.onCursorUpDown(e)
  },

  onCursorUpDown (e) {
    const items = this.getItems().filter(':visible')
    const current = $(document.activeElement)
    const up = e.which === 38
    const index = (items.index(current) || 0) + (up ? -1 : +1)

    if (index >= items.length || index < 0) return

    // avoid duplicates and unwanted scrolling
    if (e.isDefaultPrevented()) return
    e.preventDefault()

    // trigger action event
    this.view.trigger('selection:action', items, index)

    // sort?
    if (e.altKey && current.parent().parent().attr('data-sortable') === 'true') {
      return this.move(current, up)
    }

    this.resetTabIndex(items, items.eq(index))
    this.uncheck(items)
    this.pick(index, items)
  },

  move (item, up) {
    // move element
    if (up) item.insertBefore(item.prev()); else item.insertAfter(item.next())
    // refocus
    item.focus()
    // get folder and ids
    const folder = item.parent().parent().attr('data-id')
    const ids = _(item.parent().children('.selectable')).map(function (node) {
      return $(node).attr('data-id')
    })
    // trigger proper event
    this.view.trigger('sort sort:' + folder, ids)
  },

  pick (index, items, options) {
    const opt = _.extend({ focus: true }, options)
    const node = opt.focus ? this.focus(index, items) : (items || this.getItems()).eq(index)
    this.check(node)
    this.view.$container.attr('aria-activedescendant', node.attr('id'))
    if (this.view.options.instantTrigger) return this.triggerEventInstant('change', items)
    this.triggerEvent('change', items)
  },

  resetTabIndex (items, skip) {
    items = items.filter('[tabindex="0"]')
    items.not(skip).attr('tabindex', -1)
  },

  focus (index, items) {
    items = items || this.getItems()
    const node = items.eq(index).attr('tabindex', '0')
    // use native focus here. jQuery has problems to focus some nodes (subfolders with disabled class that were initially invisible (parent folder collapsed))
    // see OXUIB-2193
    node[0]?.focus()
    // workaround for chrome's CSS bug:
    // styles of "selected" class are not applied if focus triggers scrolling.
    // idea taken from http://forrst.com/posts/jQuery_redraw-BGv
    if (_.device('chrome')) node.hide(0, function () { $(this).css('display', '') })
    return node
  },

  check (nodes) {
    if (this.view.disposed) return $()
    // const width = this.view.$el.width()
    return nodes.addClass('selected').attr({ 'aria-selected': true, tabindex: 0 })
    // .find('.folder-label:first').each(function () {
    //   // special handling for settings for now
    //   if (nodes.length === 1 && (nodes.first().attr('data-id') && nodes.first().attr('data-id').indexOf('virtual/settings') === 0)) return
    //   const left = $(this).position().left
    //   const maxWidth = width - left - 42
    //   $(this).css('max-width', Math.max(maxWidth, 120))
    // })
    // .end()
  },

  uncheck (items) {
    items = items || this.getItems()
    items.filter('.selected')
      .removeClass('selected').attr({ 'aria-selected': false, tabindex: -1 })
      // .find('.folder-label').css('max-width', 'initial')
    return this
  },

  getItems () {
    if (this.view.disposed) return $()
    return this.view.$('.selectable')
  },

  addSelectableVirtualFolder (id) {
    this.selectableVirtualFolders[id] = true
    return this
  },

  addUnselectableFolder (id) {
    this.unselectableFolders[id] = true
    return this
  },

  // when synchronous event handling is needed
  triggerEventInstant: triggerEvent,
  // default use: debounce and asynchronous handling, reduces load when folder is changed fast
  triggerEvent: _.debounce(triggerEvent, 300),

  triggerChange (items) {
    const self = this
    const item = (items || this.getItems()).filter('.selected').first()
    const id = item.attr('data-id')
    // Only true for files in Drive
    const showInDrive = item.attr('data-show-in-drive')
    const isVirtual = /^(default0\/)?virtual/.test(id) && !id.includes('flat/event/resource')
    if (showInDrive) {
      Promise.all([import('@/io.ox/core/extensions'), import('@/io.ox/files/api'), import('@/io.ox/backbone/views/actions/util')]).then(function ([{ default: ext }, { default: api }, actionsUtil]) {
        const models = api.pool.get('detail').get(id)
        // Tested: No (no clue how to get here)
        actionsUtil.invoke('io.ox/files/actions/show-in-folder', ext.Baton({
          models: [models],
          app: self.view.app,
          alwaysChange: true
        }))
      })
    } else if (self.view && !self.unselectableFolders[id]) {
      self.view.trigger(isVirtual && !self.selectableVirtualFolders[id] ? 'virtual' : 'change', id, item)
    }
  }
})

export default Selection
