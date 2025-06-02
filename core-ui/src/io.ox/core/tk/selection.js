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
import Events from '@/io.ox/core/event'
import ext from '@/io.ox/core/extensions'
import Collection from '@/io.ox/core/collection'

import '@/io.ox/core/tk/draghelper'
import gt from 'gettext'

function joinTextNodes (nodes, delimiter) {
  nodes = nodes.map(function () {
    return $.trim($(this).attr('title') || $(this).text())
  })
  return $.makeArray(nodes).join(delimiter || '')
}

function defaultMessage (items) {
  const title = joinTextNodes(this.find('.selected .drag-title'), ', ')
  return title || gt.ngettext('%1$d item', '%1$d items', items.length, items.length)
}

const Selection = function (container, options) {
  options = _.extend({
    draggable: false,
    dragMessage: defaultMessage,
    dragCssClass: undefined,
    dragType: '',
    dropzone: false,
    dropzoneSelector: '.selectable',
    dropType: '',
    scrollpane: container,
    focus: '[tabindex]',
    markable: false
  }, options)

  this.classFocus = 'focussed'
  this.classSelected = 'selected'

  // add event hub
  Events.extend(this)

  const self = this
  let multiple = true
  let editable = false
  let editableSelector = '.vgrid-cell'
  let selectedItems = {}
  let bHasIndex = true
  let observedItems = []
  let observedItemsIndex = {}
  const empty = {}
  let last = empty
  let prev = empty
  let clear
  // marker mode
  let mark
  let fastMark
  let clearMarks
  let isMarker = $.noop
  // trick for smooth updates
  let lastIndex = -1
  let lastValidIndex = 0
  let mobileSelectMode

  const isSelectable = function (e) {
    return !$(e.target).hasClass('not-selectable')
  }

  const isCheckbox = function (e) {
    const closest = $(e.target).closest(editableSelector)
    return editable && closest.length
  }

  const isMultiple = function (e) {
    return multiple && e && (e.metaKey || e.ctrlKey)
  }

  const isRange = function (e) {
    return e && e.shiftKey && multiple
  }

  const hasMultiple = function () {
    return _.size(selectedItems) > 1
  }

  const changed = function (opt) {
    const list = self.get()
    self.trigger('change', list, opt)
    if (list.length === 0) {
      self.trigger('empty')
    }
  }
  // mobile action, used on smartphone instead of "changed"
  const selectOnly = function () {
    const list = self.get()
    self.trigger('_m_change', list)
    if (list.length === 0) {
      self.trigger('empty')
    }
  }
  // apply selection
  const apply = function (id, e, touchstart) {
    const _isRange = isRange(e)
    const isSingle = !_isRange && isMarker(e)
    // range?
    if (_isRange) {
      // range selection
      self.selectRange(prev, id)
      // remember
      last = id
    } else {
      // single selection
      if (isMarker(e)) {
        mark(id)
      } else {
        toggle(id)
      }
      // remember
      last = prev = id
      lastValidIndex = getIndex(id)
    }
    if (!touchstart) {
      // event
      changed()
    } else if (isCheckbox(e) || mobileSelectMode) {
      // check if select mode
      // check if checkbox tap
      // else call apply again without touchstart
      e.preventDefault()
      selectOnly()
    } else {
      apply(id, e)
    }

    if (isSingle) {
      getNode(id).addClass('last-selected')
    } else {
      properlyMarkSelectedItems()
    }
  }

  const markFirst = function (e) {
    if (bHasIndex && observedItems.length) {
      const
        item = observedItems[0]
      const obj = item.data

      clear(e)
      mark(obj)

      const
        key = self.serialize(obj)
      const $node = getNode(key)

      $node.focus()
    }
  }

  const selectFirst = function (e, giveFocus) {
    if (bHasIndex && observedItems.length) {
      const item = observedItems[0]
      clear(e)
      apply(item.data, e)
      self.trigger('select:first', item.data)

      // whether the selected item should get the focus
      if (giveFocus) {
        const
          key = self.serialize(item.data)
        const $node = getNode(key)

        $node.focus()
      }
    }
  }

  const selectPrevious = function (e) {
    if (bHasIndex) {
      const index = getIndex(last) - 1; let item
      if (index >= 0) {
        item = observedItems[index]
        clear(e)
        apply(item.data, e)
        self.trigger('select:previous', item.data)
      }
    }
  }

  const selectLast = function (e) {
    if (bHasIndex && observedItems.length) {
      const index = observedItems.length - 1
      const item = observedItems[index]
      clear(e)
      apply(item.data, e)
      self.trigger('select:last', item.data)
    }
  }

  const selectNext = function (e) {
    if (bHasIndex) {
      const index = getIndex(last) + 1; let item
      if (index < observedItems.length) {
        item = observedItems[index]
        clear(e)
        apply(item.data, e)
        self.trigger('select:next', item.data)
      }
    }
  }

  // key handler
  const fnKey = function (e) {
    // also trigger keyboard event to internal hub
    self.trigger('keyboard', e, e.which)

    // process event
    switch (e.which) {
      case 38:
        e.preventDefault()
        if ($(e.target).hasClass('folder-options-badge dropdown-opened')) return
        // cursor up
        if (e.metaKey) {
          selectFirst(e)
        } else {
          selectPrevious(e)
        }
        break
      case 36:
        selectFirst(e)
        break
      case 35:
        selectLast(e)
        break
      case 32:
        // last is the current selected/focussed
        if (options.markable) {
          e.preventDefault()
          // only deselect via space when a marker is active
          if (!$(e.target).hasClass('marked')) return
          toggle(last)
          // toggle() is called directly instead of apply(), therefore changed()
          // must be called too to get consistent fired events at toggling items
          changed()
        }
        break
      case 40:
        e.preventDefault()
        if ($(e.target).hasClass('folder-options-badge dropdown-opened')) return
        // cursor down
        if (e.metaKey) {
          selectLast(e)
        } else {
          selectNext(e)
        }
        break
        // [Del], [Backspace] or [fn+Backspace] (macOS) > delete item
      case 8:
      case 46:
        e.preventDefault()
        self.trigger('selection:delete', self.get())
        break
                // no default
    }
  }

  const clickHandler = function (e) {
    let node, key, id
    if (!e.isDefaultPrevented()) {
      node = $(this)
      key = node.attr('data-obj-id')
      id = bHasIndex ? (observedItems[getIndex(key)] || {}).data : key
      // checkbox click?
      if (id !== undefined && isCheckbox(e) && isSelectable(e)) {
        apply(id, e)
      }
    }
  }

  const dblClickHandler = function (e) {
    let node, key
    if (!e.isDefaultPrevented()) {
      node = $(this)
      key = node.attr('data-obj-id')
      self.trigger('selection:doubleclick', key)
    }
  }

  const mousedownHandler = function (e) {
    let node, key, id, handleMouseDown
    // we check for isDefaultPrevented because elements inside .selectable
    // might also react on mousedown/click, e.g. folder tree open/close toggle
    if (!e.isDefaultPrevented()) {
      node = $(this)
      key = node.attr('data-obj-id')
      id = bHasIndex ? (observedItems[getIndex(key)] || {}).data : key

      // clear all marks on mousedown in markable mode
      // to prevent a marked element without a focus (focus is set
      // due to this mouse event to a different target)
      if (options.markable) { clearMarks() }

      handleMouseDown = function () {
        // exists?
        if (id !== undefined && !isCheckbox(e)) {
          // explicit multiple?
          if (isMultiple(e)) {
            apply(id, e)
            return
          }
          // selected?
          if (isSelected(id)) {
            // but one of many?
            if (hasMultiple()) {
              node.addClass('pending-select')
            }
          } else {
            if (isRange(e)) {
              //  must NOT be set when 'prev' is already set -> otherwise bug 56087
              if (prev === empty) prev = self.get()[0] || empty
            }
            clear()
            apply(id, e)
          }
        }
      }
      if (_.device('!smartphone')) {
        // adding timeouts to avoid strange effect that occurs across different browsers.
        // if we do too much inside these event handlers, the mousedown and mouseup events
        // do not trigger a click. this still happens if timeout interval if too short,
        // for example, 10 msecs. (see Bug 27794 - Sorting menu remains open)
        setTimeout(handleMouseDown, 50)
      } else {
        // no timeouts on smartphones otherwise mobile toolbars are drawn with no or previous selection see bug 34488
        handleMouseDown()
      }
    }
  }

  const mouseupHandler = function (e) {
    let node, key, id, handleMouseUp
    if (!e.isDefaultPrevented()) {
      node = $(this)
      key = node.attr('data-obj-id')
      id = bHasIndex ? (observedItems[getIndex(key)] || {}).data : key
      handleMouseUp = function () {
        // exists?
        if (id !== undefined) {
          if (node.hasClass('pending-select') && isSelectable(e)) {
            clear()
            apply(id, e)
          }
        }
        // remove helper classes
        container.find('.pending-select').removeClass('pending-select')
      }
      if (_.device('!smartphone')) {
        // see above (mousedownHandler)
        setTimeout(handleMouseUp, 50)
      } else {
        // see above (mousedownHandler)
        handleMouseUp()
      }
    }
  }

  const getIndex = function (id) {
    return bHasIndex ? observedItemsIndex[self.serialize(id)] : -1
  }

  const getNode = function (id) {
    // for documentation purposes: this line has been manually escaped before. looks like $.escapeSelector covers those cases.
    // Bug 24543 - mail selection with courier context broken (App Suite 7; commit: ee4ff9a11c0bb113c49ac0c7ae7bedee8039b2fe)
    // Bug 26915 - After deleting a file the file is still visible in the UI (App Suite 7; commit fbc89130b51308b94986ab22641270432438b0c1)
    return $(`.selectable[data-obj-id="${CSS.escape(self.serialize(id))}"]`, container)
  }

  const isSelected = function (id) {
    return selectedItems[self.serialize(id)] !== undefined
  }

  const fastSelect = function (id, node) {
    const key = self.serialize(id)
    selectedItems[key] = id
    const $node = (node || getNode(key))
    // set focus?
    if (container.has(document.activeElement).length) $node.focus()
    // cleanup all tabIndex targets: there should be only one tabindex=0
    // at a time in the list, this must be done when setting the selection,
    // not at deselecting/cleaning, because otherwise it will not work
    // with a multi-selection (e.g. shift+up/down)
    clearTabIndex()

    return $node
      .addClass(`${self.classSelected} last-selected`)
      .attr({
        'aria-selected': 'true',
        tabindex: 0
      })
      .end()
  }

  const select = function (id, silent) {
    // `id` is not an identifier at all but the very selected object.
    if (id) {
      fastSelect(id).intoViewport(options.scrollpane)
      last = id
      lastIndex = getIndex(id)
      if (prev === empty) {
        prev = id
        lastValidIndex = lastIndex
      }
      if (silent !== true) {
        // append additional argument - the selected object that is named `id`.
        self.trigger('select', self.serialize(id), id) // 'select', fileId, fileObject
      }
    }
  }

  const deselect = function (id) {
    const key = self.serialize(id)
    delete selectedItems[key]
    getNode(key)
      .removeClass(self.classSelected)
      .attr({
        'aria-selected': 'false',
        tabindex: -1
      })

    self.trigger('deselect', key)

    // When deselecting an item the following two points are important to restore a correct tabindex state:

    // 1) when there is a marker active: give it a tabindex=0 at deselect (e.g. move the marker on a selected
    // item and deselect -> marker should have tabindex=0)
    if (options.markable && container.find('.marked').length > 0) {
      container.find('.marked').attr({ tabindex: 0 })

      // 2) as long as one selected item exists: give a tabindex = 0 to the item that was last selected,
      // otherwise there is no tabindex = 0 in the list
    } else if (_.size(selectedItems) > 0) {
      getNode(getLastSelectedItem()).attr({ tabindex: 0 })
    }
  }

  const getLastSelectedItem = function () {
    // get the last selected item from the selection
    return _.last(self.get())
  }

  const toggle = function (id) {
    if (isSelected(id)) {
      // keep at least one selected in markable mode (so only for drive filepicker)
      if (options.markable && !hasMultiple()) return

      deselect(id)
    } else {
      select(id)
    }
  }

  const update = function (updateIndex) {
    if (container.is(':hidden')) return

    updateIndex = updateIndex || false
    if (updateIndex) self.clearIndex()

    // get nodes
    const nodes = $('.selectable:visible', container)
    let i = 0; let node = null

    // clear
    nodes.removeClass(self.classSelected)

    for (; i < nodes.length; i++) {
      node = nodes.eq(i)
      // is selected?
      const objID = node.attr('data-obj-id')
      if (updateIndex) {
        self.addToIndex(objID)
      }
      if (isSelected(objID)) {
        node.addClass(self.classSelected).attr({ 'aria-selected': 'true' }) // 56085: the selection had a wrong aria-selected=false values before
      }
    }

    properlyMarkSelectedItems(nodes)
  }

  const properlyMarkSelectedItems = function (items) {
    items = items || container.find('.selectable')
    for (let i = items.length - 1, isSelected = false; i >= 0; i--) {
      const item = items.get(i)
      if (item.classList.contains('selected')) {
        item.classList.toggle('last-selected', !isSelected)
        isSelected = true
      } else {
        isSelected = false
      }
    }
  }

  const clearTabIndex = function () {
    // set tabindex to -1 for all selectable items
    container.find('.selectable[tabindex="0"]').attr({ tabindex: -1 })
  }

  clear = function () {
    // clear hash
    selectedItems = {}
    // clear nodes
    container.find('.selectable.' + self.classSelected).removeClass(self.classSelected).attr({
      'aria-selected': 'false',
      tabindex: -1
    })
  }

  // mark option block
  if (options.markable) {
    const clearOriginal = clear; let markedItem

    this.classMarked = 'marked'

    // overwrite
    isMarker = function (e) {
      // only use the marker when ctrl is pressed in addition to arrow up/down
      return multiple && e && (e.which === 38 || e.which === 40) && e.ctrlKey
    }
    // clear wrapper
    clear = function (e) {
      // clear mark
      clearMarks()
      if (isMarker(e)) return
      // call original clear
      clearOriginal(e)
    }
    fastMark = function (id, node) {
      const key = self.serialize(id)
      markedItem = id
      const $node = (node || getNode(key))
      // set focus?
      if (container.has(document.activeElement).length) $node.focus()
      const guid = $node.attr('id') || _.uniqueId('option-')
      // cleanup all tabIndex, there should be only one tabindex=0 at a time in the list
      clearTabIndex()

      return $node
        .addClass(self.classMarked)
        .attr({
          tabindex: 0,
          id: guid
        })
        // apply a11y
        // TODO: when descent attribute was set voiceover doesn't notifies user about changed selection when using 'select with space'
        .parent('[role="listbox"]')
        .attr('aria-activedescendant', guid)
        .end()
    }
    mark = function (id, silent) {
      if (id) {
        fastMark(id).intoViewport(options.scrollpane)
        last = id
        lastIndex = getIndex(id)
        if (prev === empty) {
          prev = id
          lastValidIndex = lastIndex
        }
        if (silent !== true) {
          // append additional argument - the marked object that is named `id`.
          self.trigger('mark', self.serialize(id), id)
        }
      }
    }
    clearMarks = function () {
      if (markedItem) {
        const key = self.serialize(markedItem)
        markedItem = undefined
        getNode(key)
          .removeClass(self.classMarked)
          .attr('tabindex', -1)
          .parent('[role="listbox"]')
          .removeAttr('aria-activedescendant')
        markedItem = undefined
      }
    }
  }

  /**
   * Serialize object to get a flat key
   */
  this.serialize = function (obj) {
    if (typeof obj === 'object') {
      return (obj.folder_id !== undefined) ? _.cid(obj) : obj.id
    }
    return obj
  }

  this.setSerializer = function (fn) {
    this.serialize = function (obj) {
      return typeof obj === 'object' ? fn(obj) : obj
    }
  }

  /**
   * Initialize
   */
  this.init = function (all) {
    // store current selection
    const tmp = this.get()
    const hash = _.clone(selectedItems)

    // clear list
    clear()
    observedItems = new Array(all.length)
    observedItemsIndex = {}
    last = prev = empty

    // reset index but ignore 'empty runs'
    if (all.length > 0) lastIndex = -1

    // build index
    let i = 0; const $i = all.length; let data; let cid; let updateLast = true
    for (; i < $i; i++) {
      data = all[i]
      cid = this.serialize(data)
      observedItems[i] = { data, cid }
      observedItemsIndex[cid] = i
      if (cid in hash && updateLast) {
        lastValidIndex = lastIndex = i
        last = cid
        updateLast = false
      }
    }

    $('.selectable', container).each(function () {
      const node = $(this)
      const cid = node.attr('data-obj-id')
      if (cid in hash) {
        node.addClass(self.classSelected).attr({
          'aria-selected': 'true',
          tabindex: 0
        })
      } else {
        node.removeClass(self.classSelected).attr({
          'aria-selected': 'false',
          tabindex: -1
        })
      }
    })

    selectedItems = hash

    // fire event?
    if (!_.isEqual(tmp, this.get())) changed()
    return this
  }

  this.insertAt = function (list, pos) {
    // vars
    const $l = list.length
    const insert = []
    // check for conflict, i.e. at least one item is already on the list
    const conflict = _(list).reduce(function (memo, obj) {
      const cid = self.serialize(obj)
      insert.push({ data: obj, cid })
      return memo || (cid in observedItemsIndex)
    }, false)
    // no conflict?
    if (!conflict) {
      // insert into list
      observedItems.splice.apply(observedItems, [pos, 0].concat(insert))
      // shift upper index
      _(observedItemsIndex).each(function (value, key) {
        if (value >= pos) {
          observedItemsIndex[key] += $l
        }
      })
      // add to index
      _(list).each(function (obj, i) {
        observedItemsIndex[self.serialize(obj)] = pos + i
      })
    }
  }

  this.remove = function (list) {
    // loop over index and mark items to remove with null
    _(list).each(function (obj) {
      const cid = self.serialize(obj)
      const index = observedItemsIndex[cid]
      if (index !== undefined) {
        observedItems.splice(index, 1, null)
      }
    })
    // compact; remove nulled items now
    observedItems = _(observedItems).compact()
    // reset index
    observedItemsIndex = {}
    _(observedItems).each(function (item, i) {
      observedItemsIndex[item.cid] = i
    })
  }

  /**
   * Update
   */
  this.update = function () {
    update()
    return this
  }

  this.updateIndex = function () {
    update(true)
    return this
  }

  this.debug = function () {
    console.debug('selection', {
      selected: selectedItems,
      observed: observedItems,
      index: observedItemsIndex
    })
  }

  this.clearIndex = function () {
    observedItems = []
    observedItemsIndex = {}
    return this
  }

  this.addToIndex = function (obj) {
    const cid = this.serialize(obj)
    if (observedItemsIndex[cid] === undefined) {
      observedItemsIndex[cid] = observedItems.length
      observedItems.push({ data: obj, cid })
    }
    return this
  }

  this.removeFromIndex = function (list) {
    const hash = {}; let index = 0
    // build hash of CIDs to delete
    _([].concat(list)).each(function (obj) {
      hash[self.serialize(obj)] = true
    })
    // reset index
    observedItemsIndex = {}
    // rebuild list
    observedItems = _(observedItems).filter(function (item) {
      const cid = item.cid
      if (cid in hash) return false
      observedItemsIndex[cid] = index++
      return true
    })
  }

  this.hasIndex = function (flag) {
    bHasIndex = !!flag
    return this
  }

  this.getObservedItems = function () {
    return observedItemsIndex
  }

  /**
   * Set multiple mode
   */
  this.setMultiple = function (flag) {
    multiple = !!flag
    return this
  }

  /**
   * Set editable mode
   */
  this.setEditable = function (flag, selector) {
    editable = !!flag
    editableSelector = selector || '.vgrid-cell'
    last = prev = empty
    lastIndex = -1
    return this
  }

  /**
   * Get selection
   */
  this.get = function () {
    const list = []; let id = ''
    for (id in selectedItems) {
      list.push(selectedItems[id])
    }
    return list
  }

  this.unique = function (list) {
    list = list || this.get()
    const hash = {}
    return _(list).filter(function (obj) {
      const key = _.isString(obj) ? obj : _.cid(obj)
      return key in hash ? false : (hash[key] = true)
    })
  }

  /**
   * Get complete selection. Useful for threaded mails, for example. Defaults to get().
   */
  this.unfold = this.get

  /**
   * Clear selection
   */
  this.clear = function (silent) {
    // internal clear
    clear()
    // trigger event
    if (silent !== true) {
      self.trigger('clear')
      changed()
    }
    return this
  }

  /**
   * Set focus
   */

  this.focus = function () {
    if ($.contains(container, document.activeElement)) return

    if (this.get().length === 0) return this.selectFirst(true)

    const key = this.serialize(_.last(this.get()))
    const $node = getNode(key)

    $node.focus()
  }

  /**
   * Select item
   */
  this.select = function (id) {
    // `id` is not an identifier at all but the very selected object.
    select(id)
    changed()
    return this
  }

  /**
   * Deselect item
   */
  this.deselect = function (id) {
    deselect(id)
    changed()
    return this
  }

  /**
   * Set selection
   */
  this.set = function (list, silent) {
    // previous
    const previous = this.get()
    const self = this
    let hash = {}
    let updateLast = true

    // clear
    clear()

    // reset last index
    lastIndex = -1

    $('.selectable', container).each(function () {
      const node = $(this); const cid = node.attr('data-obj-id')
      hash[cid] = node
    })

    _(!list || _.isArray(list) ? list : [list]).each(function (elem, index) {
      const cid = self.serialize(elem); let item; let node
      // existing node?
      if (cid in hash) {
        if (typeof elem === 'string' && bHasIndex && (item = observedItems[getIndex(elem)]) !== undefined) {
          node = fastSelect(item.data, hash[cid])
        } else {
          node = fastSelect(elem, hash[cid])
        }
        // put first item into viewport
        if (index === 0) node.intoViewport(options.scrollpane)
      } else {
        selectedItems[cid] = elem
      }
      // update last / lastIndex
      if (updateLast) {
        lastIndex = getIndex(cid)
        last = cid
        updateLast = false
      }
    })

    hash = null

    // event?: check ids type-independent (strings vs. integer)
    if (!_.isEqual(_(previous).map(self.serialize), _(this.get()).map(self.serialize)) && silent !== true) changed()

    return this
  }

  this.equals = function (list) {
    return _.isEqual(list, this.get())
  }

  this.selectRange = function (a, b) {
    let i, item, reverse

    if (bHasIndex) {
      // get indices
      a = getIndex(a)
      b = getIndex(b)
      reverse = a > b
      // loop while keeping direction (see Bug 29047)
      for (i = a; reverse ? i >= b : i <= b; reverse ? i-- : i++) {
        // get id
        item = observedItems[i]
        // select first OR last one, depending on if upward or downwards selected
        if (i === b) {
          select(item.data)
        } else {
          // fast & simple
          selectedItems[item.cid] = item.data
        }
      }
      // fast update - just updates existing nodes instead of looking for thousands
      this.update()
    }
    return this
  }

  this.markFirst = function () {
    markFirst()
    return this
  }

  //  @param {Boolean} [giveFocus]
  //   Optional parameter. When it is 'true', the focus is set to the selected element.
  this.selectFirst = function (giveFocus) {
    selectFirst(null, giveFocus)
    return this
  }

  this.selectLast = function () {
    selectLast()
    return this
  }

  this.selectSmart = function () {
    if (this.get().length === 0) {
      this.selectFirst()
    }
    return this
  }

  this.selectNext = selectNext

  this.selectAll = function () {
    if (bHasIndex && observedItems.length) {
      // _(observedItems).each(function (item) {
      let i = 0; const $i = observedItems.length; let item
      for (; i < $i; i++) {
        item = observedItems[i]
        if (i === 0 || i === ($i - 1)) {
          select(item.data, true)
        } else {
          // fast & simple
          selectedItems[item.cid] = item.data
        }
      }
      this.update()
      if (mobileSelectMode) {
        selectOnly()
      } else {
        changed()
      }
    }
  }

  this.resetLastIndex = function () {
    lastValidIndex = -1
  }

  this.setLastIndex = function (obj) {
    prev = obj
    lastValidIndex = getIndex(obj)
    return this
  }

  this.selectIndex = function () {
    const item = observedItems[lastValidIndex]
    if (item !== undefined) {
      this.select(item.data)
    }
  }

  this.selectLastIndex = function () {
    if (lastValidIndex !== -1) {
      const item = observedItems[lastValidIndex] || _.last(observedItems)
      if (item !== undefined) {
        this.select(item.data)
      }
    }
  }

  /**
   * Is selected?
   */
  this.isSelected = function (id) {
    return isSelected(id)
  }

  this.getIndex = function (obj) {
    return getIndex(obj)
  }

  this.isEmpty = function () {
    return _.isEmpty(selectedItems)
  }

  this.contains = function (ids) {
    const list = [].concat(ids)
    return !!list.length && _(list).inject(function (memo, id) {
      id = _.isObject(id) ? self.serialize(id) : id
      return memo && id in observedItemsIndex
    }, true)
  }

  this.getLastIndex = function () {
    return lastValidIndex
  }

  /**
   * Keyboard support
   */
  this.keyboard = function (con, flag) {
    // keyboard support (use keydown! IE does not react on keypress with cursor keys)
    $(con)[flag ? 'on' : 'off']('keydown', fnKey)
    return this
  }

  /**
   * Retrigger current selection
   */
  this.retrigger = function (force) {
    if (force) {
      const tmp = this.get()
      this.clear()
      this.set(tmp)
    } else if (mobileSelectMode) {
      selectOnly()
    } else {
      changed()
    }
  }

  this.retriggerUnlessEmpty = function () {
    if (this.get().length) {
      changed({ retriggerUnlessEmpty: true })
    }
  }

  this.destroy = function () {
    this.clear()
    this.keyboard(false)
    this.events.destroy()
    container.off('mousedown mouseup contextmenu')
    selectedItems = observedItems = observedItemsIndex = last = null
  }

  this.setMobileSelectMode = function (state) {
    mobileSelectMode = state
  }

  this.getMobileSelectMode = function () {
    return mobileSelectMode
  }

  // bind general click handler
  container.on('contextmenu', function (e) { e.preventDefault() })
    .on('mousedown', '.selectable', mousedownHandler)
    .on('mouseup', '.selectable', mouseupHandler)
    .on('click', '.selectable', clickHandler)
    .on('dblclick', '.selectable', dblClickHandler)
    .on('focus', '.selectable', function () {
      container.addClass('has-focus')
    })
    .on('blur', '.selectable', function () {
      _.delay(function () {
        if (container.find(':focus').length === 0) {
          container.removeClass('has-focus')

          // clear marks when the focus moves out of the container, e.g. clicked outside
          // by mouse or tab
          if (options.markable) {
            clearMarks()
            // restore a valid tabindex
            getNode(getLastSelectedItem()).attr({ tabindex: 0 })

            // 56086
            // TODO: revisit when a focus indicator is implemented: it sets 'last'
            // to the last selected element and doesn't leave it at the last focused element
            // -> I think it should jump back to the previous focused element like it happens without
            // this line below, but since unselected focused element are not handled so far it feels
            // very wrong to jump back to an element without a visual indicator.
            if (getLastSelectedItem()) {
              // just set 'last' to the last selected item, prev should stay in case of a multiselection
              // it's also important when the marker (ctrl+arrows) are used to restore a correct 'last' item
              last = getLastSelectedItem()
            }
          }
        }
      }, 10)
    });

  /*
        * DND
        */
  (function () {
    let data
    let source
    let helper = null
    let fast
    let expandTimer
    const deltaLeft = 15
    const deltaTop = 15
    // move helper
    let px = 0; let py = 0; let x = 0; let y = 0
    const abs = Math.abs

    function move (e) {
      // use fast access
      x = e.pageX + deltaLeft
      y = e.pageY + deltaTop
      if (abs(px - x) >= 5 || abs(py - y) >= 5) {
        fast.left = x + 'px'
        fast.top = y + 'px'
        px = x
        py = y
      }
    }

    function firstMove () {
      // trigger DOM event
      container.trigger('selection:dragstart')
    }

    function toggle () {
      this.trigger('click')
    }

    function over (e) {
      // avoid handling bubbling events
      if (e.isDefaultPrevented()) return

      e.preventDefault()
      const arrow = $(this).find('.folder-arrow')

      // css hover doesn't work!
      $(this).addClass('dnd-over')

      if (arrow.length) {
        clearTimeout(expandTimer)
        expandTimer = setTimeout(toggle.bind(arrow), 1500)
      }
    }

    function out () {
      clearTimeout(expandTimer)
      $(this).removeClass('dnd-over')
    }

    //
    // Auto-Scroll
    //

    const scroll = (function () {
      let y = 0; let timer = null

      return {
        move (e) {
          y = e.pageY - $(this).offset().top
        },
        out () {
          clearInterval(timer)
          timer = null
        },
        over () {
          if (timer) return
          const height = this.clientHeight
          timer = setInterval(function () {
            const threshold = Math.round(y / height * 10) - 5
            const sign = threshold < 0 ? -1 : +1
            const abs = Math.abs(threshold)
            if (abs > 2) this.scrollTop += sign * (abs - 2) * 2
          }.bind(this), 5)
        }
      }
    }())

    function drag (e) {
      // unbind
      $(document).off('mousemove.dnd', drag)
      // create helper
      helper = $('<div class="drag-helper">')
      ext.point('io.ox/core/tk/draghelper').invoke('draw', helper,
        new ext.Baton({
          container,
          data,
          source,
          dragMessage: options.dragMessage
        }))
      // get fast access
      fast = helper[0].style
      // initial move
      px = py = x = y = 0
      move(e)
      // replace in DOM
      helper.appendTo(document.body)
      // bind
      $(document).on('mousemove.dnd', move)
        .one('mousemove.dnd', firstMove)
        .on('mouseover.dnd', '.folder-tree', scroll.over)
        .on('mouseout.dnd', '.folder-tree', scroll.out)
        .on('mousemove.dnd', '.folder-tree', scroll.move)
        .on('mouseover.dnd', '.selectable', over)
        .on('mouseout.dnd', '.selectable', out)
    }

    function remove () {
      if (helper !== null) {
        helper.remove()
        helper = fast = null
      }
    }

    function stop () {
      // stop auto-scroll
      scroll.out()
      // unbind handlers
      $(document).off('mousemove.dnd mouseup.dnd mouseover.dnd mouseout.dnd')
      $('.dropzone').each(function () {
        const node = $(this); const selector = node.attr('data-dropzones');
        (selector ? node.find(selector) : node).off('mouseup.dnd')
      })
      $('.dnd-over').removeClass('dnd-over')
      // trigger DOM event
      container.trigger('selection:dragstop')
      // revert?
      if (helper !== null) {
        remove()
      }
    }

    function drop (e) {
      // avoid multiple events on parent tree nodes
      if (e.isDefaultPrevented()) return
      e.preventDefault()
      // process drop
      clearTimeout(expandTimer)
      const target = $(this).attr('data-obj-id') || $(this).attr('data-cid') || $(this).attr('data-id')
      const baton = new ext.Baton({ data, dragType: options.dragType, dropzone: this, target })
      $(this).trigger('selection:drop', [baton])
    }

    function resist (e) {
      const deltaX = Math.abs(e.pageX - e.data.x)
      const deltaY = Math.abs(e.pageY - e.data.y)
      if (deltaX > 15 || deltaY > 15) {
        // get data now
        data = self.unique(self.unfold())
        // empty?
        if (data.length === 0) {
          const cid = source.attr('data-obj-id')
          data = cid ? [_.cid(cid)] : []
        }
        // check permissions - need 'delete' access for a move
        const collection = new Collection(data)
        collection.getProperties()
        if (collection.isResolved() && !collection.has('delete')) {
          $(document).off('mousemove.dnd mouseup.dnd')
        } else {
          // bind events
          $('.dropzone').each(function () {
            const node = $(this); const selector = node.attr('data-dropzones');
            (selector ? node.find(selector) : node).on('mouseup.dnd', drop)
          })
          $(document).off('mousemove.dnd').on('mousemove.dnd', drag)
        }
      }
    }

    function start (e) {
      e.preventDefault()
      // remember source now
      source = $(this)
      // bind new events
      $(document)
        .on('mousemove.dnd', { x: e.pageX, y: e.pageY }, resist)
        .on('mouseup.dnd', stop)
        // prevent text selection and kills the focus

      const selectable = $(e.target).closest(options.focus);
      (options.focus && selectable.length ? selectable : container).focus()
    }

    // drag & drop
    if (_.device('!touch')) {
      // draggable?
      if (options.draggable) {
        container.on('mousedown.dnd', '.selectable', start)
      }
      // dropzone?
      if (options.dropzone) {
        container.addClass('dropzone')
          .attr('data-dropzones', options.dropzoneSelector)
          .on('drop', function (e, baton) {
            baton.dropType = options.dropType
            self.trigger('selection:drop', baton)
          })
      }
    }
  }())
}

Selection.extend = function (obj, node, options) {
  // extend object
  return (obj.selection = new Selection(node, options || {}))
}

export default Selection
