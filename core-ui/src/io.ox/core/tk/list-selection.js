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
import { settings } from '@/io.ox/core/settings'
import 'velocity-animate'
import { createIcon } from '@/io.ox/core/components'

const SELECTABLE = '.selectable'
const SWIPEDELETE = '.swipe-button.delete'
const SWIPEMORE = '.swipe-button.more'
const isTouch = _.device('touch')
const isLegacyWebview = _.device('android') && _.browser.android < '4.4'
const defaultBehavior = settings.get('selectionMode', 'normal')
// mobile stuff
const THRESHOLD_X = 20 // touchmove threshold for mobiles in PX
const THRESHOLD_STICK = 40 // threshold in px
const THRESHOLD_REMOVE = 250 // px
const LOCKDISTANCE = 190
const MOVE_UP_TIME = 200
const UNFOLD_TIME = 100
const UNFOLD_TIME_FULL = 50
const RESET_CELL_TIME = 100
const CELL_HEIGHT = '-84px' // todo: calculate this
let cell
let recentWindowsKey = false

function Selection (view, options) {
  options = _.isObject(options) ? options : {}

  this.view = view
  this.behavior = options.behavior || defaultBehavior
  this._direction = 'down'
  this._lastPosition = -1

  switch (this.behavior) {
    case 'normal':
      _.extend(this, normalBehavior)
      break
    case 'normal-single':
      _.extend(this, normalBehavior, singleBehavior)
      break
    case 'alternative':
      _.extend(this, normalBehavior, alternativeBehavior)
      break
    // simpleBehavior based selections need to define their own focus styles (`.focus-indicator`)
    case 'simple':
      _.extend(this, simpleBehavior)
      break
    case 'single':
      _.extend(this, simpleBehavior, singleBehavior)
      break
    default:
      console.error('Unknown selection behavior', this.behavior)
      break
  }

  this.registerEvents()
}

const prototype = {

  // returns array of composite keys (strings)
  get () {
    // don't return jQuery's result directly, because it doesn't return a "normal" array (tests might fail)
    return _(this.view.$el.find(SELECTABLE + '.selected')).map(function (node) {
      return $(node).attr('data-cid')
    })
  },

  resolve () {
    const view = this.view
    return this.get().map(function (cid) {
      return view.collection.get(cid)
    })
  },

  getItems (filter) {
    const items = this.view.$el.find(SELECTABLE)
    return filter ? items.filter(filter) : items
  },

  getNode (cid) {
    return this.getItems().filter(`[data-cid="${CSS.escape(cid)}"]`)
  },

  getPosition (items) {
    items = items || this.getItems()
    const pos = items.index(items.filter('.precursor'))
    if (pos !== this._lastPosition) this._direction = pos < this._lastPosition ? 'up' : 'down'
    this._lastPosition = pos
    return pos
  },

  getDirection () {
    return this._direction
  },

  check (nodes) {
    nodes.removeClass('last-selected').addClass('selected').attr('aria-selected', true)
    nodes.last().addClass('last-selected')
    this.triggerSelectEvent('add', nodes)
  },

  uncheck (nodes) {
    nodes.removeClass('selected no-checkbox').attr({ 'aria-selected': false, tabindex: '-1' })
    this.triggerSelectEvent('remove', nodes)
  },

  toggle (node) {
    if (node.hasClass('selected')) this.uncheck(node); else this.check(node)
  },

  triggerSelectEvent (type, nodes) {
    const ids = nodes.map(function () { return $(this).attr('data-cid') }).toArray()
    this.view.trigger('selection:' + type, ids)
  },

  set (list, focus) {
    if (!_.isArray(list)) return

    let items = this.getItems(); const hash = {}

    this.clear()

    // convert array to hash, then loop over all DOM nodes once (faster)
    _(list).each(function (item) {
      const cid = typeof item === 'string' ? item : _.cid(item)
      hash[cid] = true
    })

    items = items.filter(function () {
      const cid = $(this).attr('data-cid')
      return (cid in hash)
    })

    this.check(items)

    if (items.length) {
      const node = items.last().attr('tabindex', '0')
      if (focus) node.focus()
    }

    this.triggerChange()
  },

  triggerAction (e) {
    const cid = $(e.currentTarget).attr('data-cid')
    this.view.trigger('selection:action', [cid], e)
  },

  triggerDouble (e) {
    const cid = $(e.currentTarget).attr('data-cid')
    this.view.trigger('selection:doubleclick', [cid])
  },

  triggerChange (items, currentTargetCID) {
    items = items || this.getItems()
    // default event
    const list = this.get(); let events = 'selection:change'
    // empty, one, multiple
    if (list.length === 0) {
      events += ' selection:empty'
    } else if (list.length === 1) {
      events += ' selection:one'
    } else if (list.length > 1) {
      events += ' selection:multiple'
    }
    // to keep correct select all checkbox state
    // if the folder only contains one item, we must check the checkbox status
    if (items && items.length > 0 && items.length === list.length && (items.length !== 1 || !$(items[0]).hasClass('no-checkbox'))) {
      events += ' selection:all'
    } else {
      events += ' selection:subset'
    }
    this.view.trigger(events, list, currentTargetCID)
  },

  clear (items) {
    items = items || this.getItems()
    this.resetTabIndex(items)
    this.resetCheckmark(items)
    this.reset()
  },

  // a collection reset implies a clear
  reset () {
    this.triggerChange()
  },

  remove (cid, node) {
    node = node || this.getNode(cid)
    if (!node.is('.selected')) return
    this.triggerChange()
  },

  isRange (e) {
    return e && e.shiftKey
  },

  isCheckmark (e) {
    return e && $(e.target).is('.list-item-checkmark, .checkmark, .checkbox')
  },

  isMultiple (e) {
    return e && (e.metaKey || e.ctrlKey || /35|36/.test(e.which) || this.isCheckmark(e))
  },

  isEmpty () {
    return _.isEmpty(this.get())
  },

  resetTabIndex (items, skip) {
    items = items.filter('[tabindex="0"]')
    items.not(skip).attr('tabindex', '-1')
  },

  resetCheckmark (items) {
    items = items.filter('.selected').removeClass('selected no-checkbox').attr('aria-selected', false)
    this.triggerSelectEvent('remove', items)
  },

  // resets all (usually one) items with swipe-left class
  // return true if an item had to be reset
  resetSwipe (items) {
    const nodes = items.filter('.swipe-left')
    nodes.removeClass('swipe-left').find('.swipe-left-content').remove()
    return !!nodes.length
  },

  focus (index, items, focus) {
    items = items || this.getItems()
    const node = items.eq(index).attr('tabindex', 0)

    if (focus !== false) node.focus()
    return node
  },

  pick (index, items, e, focus) {
    let node
    const isRange = this.isRange(e)
    const isSingle = !isRange && !this.isMultiple(e)

    items = items || this.getItems()

    if (isRange) {
      // range select
      this.pickRange(index, items)
    } else {
      // single select
      items.removeClass('precursor')
      node = this.focus(index, items, focus).addClass('precursor')
      if (this.isMultiple(e)) this.pickMultiple(node, items)
      else this.pickSingle(node)
    }

    if (isSingle) {
      node.addClass('last-selected')
    } else {
      // mark selection ranges properly; using reverse order
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
  },

  pickRange (index, items) {
    const cursor = this.getPosition(items, index)
    const start = Math.min(index, cursor)
    const end = Math.max(index, cursor)

    // remove no-checkbox class for range select
    $(items.slice(start, end + 1)).removeClass('no-checkbox')
    this.check(items.slice(start, end + 1))
    this.focus(index, items)
  },

  pickMultiple (node, items) {
    // already selected but checkbox is not yet marked
    if (node.hasClass('selected no-checkbox')) {
      node.removeClass('no-checkbox')
    } else {
      // remove selected items without checked checkbox in true multi selection
      items.filter('.no-checkbox').removeClass('selected no-checkbox').attr('aria-selected', false)
      this.toggle(node)
    }
  },

  pickSingle (node) {
    this.check(node)
  },

  // just select one item (no range; no multiple)
  select (index, items, focus) {
    items = items || this.getItems()
    if (index >= items.length) return
    this.resetCheckmark(items)
    this.resetTabIndex(items, items.eq(index))
    this.pick(index, items, null, focus)
    this.selectEvents(items)
  },

  // events triggered by selection function
  selectEvents (items) {
    this.triggerChange(items)
  },

  selectAll (items) {
    items = _.isString(items) ? this.getItems(items) : (items || this.getItems())
    const slice = items.slice(0, items.length)
    slice.removeClass('no-checkbox precursor')
    slice.first().addClass('precursor')
    this.check(slice)
    this.focus(0, items)
    this.triggerChange(items)
  },

  selectNone () {
    this.clear()
    this.triggerChange()
  },

  move (step) {
    const items = this.getItems()
    let index = this.getPosition() + step
    if (index < 0) {
      index = 0
    } else if (index >= items.length) {
      index = items.length - 1
    }
    this.select(index, items)
  },

  previous () {
    this.move(-1)
    this.view.trigger('selection:action', this.get())
  },

  next () {
    this.move(1)
    this.view.trigger('selection:action', this.get())
  },

  // to anticipate a removal of multiple items
  dodge () {
    const items = this.getItems()
    const selected = items.filter('.selected')
    const length = selected.length
    const first = items.index(selected.first())
    const last = items.index(selected.last())
    const tail = items.length - 1
    const apply = this.select.bind(this)
    let direction = this.getDirection()
    const focus = $.contains(this.view.el, document.activeElement)

    // All: if all items are selected we dodge by clearing the entire selection
    if (items.length === length) return this.clear()

    // special case: always dodge upwards if end of selection is end of list, see OXUIB-510
    if (last === tail) direction = 'up'

    // up and enough room
    if (direction === 'up' && first > 0) return apply(first - 1, items, focus)

    // down and enough room
    if (direction === 'down' && last < tail) return apply(last + 1, items, focus)

    // otherwise: iterate over list to find a free spot
    items.slice(first).each(function (index) {
      if (!$(this).hasClass('selected')) {
        apply(first + index, items, focus)
        return false
      }
    })
  },

  onCursor (e) {
    // cursor left/right have no effect in a list
    const grid = this.view.$el.hasClass('grid-layout')
    const cursorLeftRight = /37|39/.test(e.which)
    if (!grid && cursorLeftRight) return

    // get current index
    const items = this.getItems()
    const current = $(document.activeElement)
    let index = (items.index(current) || 0)

    const { width, wrap } = this.getGridState(items)
    const column = index % width
    // compute new index
    const cursorUpDown = /38|40|35|36/.test(e.which)
    const cursorBack = /37|38|36/.test(e.which)
    const step = grid && cursorUpDown ? width : 1
    if (grid && cursorUpDown && wrap >= 0) {
      // fix traveling across a line wrap
      if (cursorBack && index > wrap && (index - step) < wrap) index = wrap
      else if (!cursorBack && index <= wrap && (index + step) > wrap) index = wrap + 1
      else index += cursorBack ? -step : +step
    } else {
      index += cursorBack ? -step : +step
    }

    // move to very last element on cursor down or end?
    if (step > 1 && /40|35/.test(e.which) && index >= items.length && column >= (items.length % width)) index = items.length - 1

    // out of bounds?
    index = this.outOfBounds(index, items)
    if (index === false) return

    // prevent default to avoid unwanted scrolling
    e.preventDefault()

    // jump to top/bottom OR range select / single select
    if (this.isMultiple(e)) {
      index = (/38|36/.test(e.which) ? 0 : -1)
    }

    const currentTarget = items.eq(index)
    this.resetTabIndex(items, currentTarget)
    this.resetCheckmark(items)
    this.pick(index, items, e)
    // just call get position to update "direction"
    this.getPosition()
    // alternative selection mode needs this, has no effect in default mode
    if (this.isMultiple(e) || this.isRange(e)) {
      this.triggerChange(items, currentTarget.attr('data-cid'))
    } else {
      this.selectEvents(items)
    }
  },

  getGridState (items) {
    return {
      width: parseInt(this.view.$el.attr('grid-count') || 1, 10),
      // TODO: too specific; this should ideally be somewhere else. but let's first have a fix
      wrap: items.index(items.filter('.file-type-folder + :not(.file-type-folder):first')) - 1
    }
  },

  // defines behaviour when index out of bounds should be selected by arrow keys
  outOfBounds (index, items) {
    if (index < 0) return false
    if (index >= items.length) {
      // scroll to very bottom if at end of list (to keep a11y support)
      this.view.$el.scrollTop(0xFFFFFF)
      return false
    }
    return index
  },

  onPageUpDown (e) {
    e.preventDefault()
    const items = this.getItems(); const height = items.first().outerHeight()
    if (!height) return
    const step = Math.floor(this.view.$el.height() / height)
    if (e.which === 33) this.move(-step); else this.move(step)
  },

  onKeydown (e) {
    switch (e.which) {
      // [enter] > action
      // [space] > action
      case 13:
      case 32:
        this.triggerAction(e)
        break

        // [Ctrl|Cmd + A] > select all
        // [a] > archive
      case 65:
      case 97:
        if (e.ctrlKey || e.metaKey || recentWindowsKey) {
          e.preventDefault()
          this.selectAll()
        }
        break

        // Windows key (workaround for incomplete detection)
      case 91:
        recentWindowsKey = true
        setTimeout(function () { recentWindowsKey = false }, 2000)
        break

        // [Del], [Backspace] or [fn+Backspace] (macOS) > delete item
      case 8:
      case 46:
        // ignore combinations like ctrl+shift+del (see bug 55469)
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        this.view.trigger('selection:delete', this.get(), e.shiftKey)
        break

        // home/end cursor left/right up/down
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
        this.onCursor(e)
        break

        // page up/down
      case 33:
      case 34:
        this.onPageUpDown(e)
        break
                // no default
    }
  },

  onMousedown () {
    this.view.mousedown = true
  },
  onMouseup () {
    this.view.mousedown = false
  },

  onClick (e, options) {
    options = options || {}

    // consider mousedown only if unselected and not in multiple-mode
    if (e.type === 'mousedown' && !this.isMultiple(e) && $(e.currentTarget).is('.selected')) return
    // ignore clicks in multiple-mode
    if (e.type === 'click' && this.isMultiple(e)) return

    const items = this.getItems()
    const current = $(e.currentTarget)
    const index = items.index(current) || 0
    const previous = this.get()

    if (isTouch && this.resetSwipe(items)) return
    if (e.isDefaultPrevented()) return
    if (!this.isMultiple(e)) this.resetCheckmark(items)
    this.resetTabIndex(items, items.eq(index))

    // range select / single select
    this.pick(index, items, e)

    // support custom events
    if (options.customEvents) return
    // always trigger in multiple mode (sometimes only checkbox is changed)
    if (!_.isEqual(previous, this.get())) this.triggerChange(items, $(e.currentTarget).attr('data-cid'))
  },

  onSwipeDelete (e) {
    e.preventDefault()
    const node = $(this.currentSelection).closest(SELECTABLE)
    const cid = node.attr('data-cid')
    const cellsBelow = node.nextAll()
    const self = this
    const resetStyle = function () {
      this.removeAttr('style')
      // reset velocity's transform cache manually
      _(this).each(function (listItem) {
        // assigning the value directly leads to a typeerror on ios
        // like $(listItem).data('velocity').transformCache = {}
        const c = $(listItem).data('velocity')
        c.transformCache = {}
        $(listItem).data('velocity', c)
      })
      self.view.off('remove-mobile', resetStyle)
    }
    if (cellsBelow.length > 0) {
      // animate cell and delete mail afterwards
      cellsBelow.velocity({
        translateY: CELL_HEIGHT
      }, {
        duration: MOVE_UP_TIME,
        complete () {
          self.view.on('remove-mobile', resetStyle, cellsBelow)
          self.view.trigger('selection:delete', [cid])
          self.currentSelection.swipeCell.remove()
          self.currentSelection.swipeCell = null
          $(self.view).removeClass('unfolded')
          self.currentSelection.unfolded = self.unfold = false
        }
      })
    } else {
      self.view.on('remove-mobile', resetStyle, cellsBelow)
      self.view.trigger('selection:delete', [cid])
      self.currentSelection.swipeCell.remove()
      self.currentSelection.swipeCell = null
      $(self.view).removeClass('unfolded')
      self.currentSelection.unfolded = self.unfold = false
    }
  },

  onSwipeMore (e) {
    e.preventDefault()
    const node = $(this.currentSelection).closest(SELECTABLE)
    const cid = node.attr('data-cid')
    const self = this
    // propagate event
    this.view.trigger('selection:more', [cid], $(this.currentSelection.btnMore))
    // wait for popup to open, rest cell afterwards
    _.delay(function () {
      self.resetSwipeCell.call(self.currentSelection, self)
    }, 250)
  },

  isAnyCellUnfolded () {
    return !!this.unfold
  },

  resetSwipeCell (selection, a, instant) {
    const self = this
    try {
      selection.startX = 0
      selection.startY = 0
      selection.unfold = false
      selection.target = null
      selection.otherUnfolded = false
      if (!instant) {
        $(self).velocity({
          translateX: [0, a]
        }, {
          duration: RESET_CELL_TIME,
          complete () {
            $(self).removeAttr('style')
            $(self).removeClass('unfolded')
            if (self.swipeCell) self.swipeCell.remove()
            self.swipeCell = null
          }
        })
      } else {
        $(self).removeAttr('style')
        $(self).removeClass('unfolded')
        if (self.swipeCell) self.swipeCell.remove()
        self.swipeCell = null
      }
    } catch (e) {
      console.warn('something went wrong during reset', e)
    }
  },

  onTouchStart (e) {
    const touches = e.originalEvent.touches[0]
    const currentX = touches.pageX; const currentY = touches.pageY
    const t = $(this).css('transition', '')
    // var unfold indicates if any node is unfolded
    // var unfolded indicates if currently touched node is unfolded
    this.startX = currentX
    this.startY = currentY
    this.distanceX = 0
    this.unfold = this.remove = this.scrolling = this.isMoving = false

    // check if this node is already opened
    this.unfolded = t.hasClass('unfolded') // mark current node as unfolded once
    this.otherUnfolded = t.siblings().hasClass('unfolded') // is there another node unfolded

    // check if other nodes than the current one are unfolded
    // if so, close other nodes and stop event propagation
    if (!this.unfolded && this.otherUnfolded) {
      e.data.resetSwipeCell.call(e.data.currentSelection, e.data, -LOCKDISTANCE)
    }
  },

  onTouchMove (e) {
    const touches = e.originalEvent.touches[0]
    const currentX = touches.pageX
    // return early on multitouch
    if (e.originalEvent.touches.length > 1) return

    this.distanceX = (this.startX - currentX) * -1 // invert value
    this.scrolling = false

    // try to swipe to the right at the start
    if (currentX > this.startX && !this.unfolded && this.distanceX <= THRESHOLD_X) {
      return // left to right is not allowed at the start
    }

    if (e.data.isScrolling) {
      this.scrolling = true
      return // return early on a simple scroll
    }

    // special handling for already unfolded cell
    if (this.unfolded) {
      this.distanceX += -190 // add already moved pixels
    }

    if (Math.abs(this.distanceX) > THRESHOLD_X || this.isMoving) {
      e.preventDefault() // prevent further scrolling
      this.isMoving = true
      e.data.view.isSwiping = true
      if (!this.target) {
        // do expensive jquery select only once
        this.target = $(e.currentTarget)
      }
      if (!this.swipeCell) {
        // append swipe action cell once, will be removed afterwards
        this.swipeCell = $('<div class="swipe-option-cell">').append(
          this.btnDelete = $('<div class="swipe-button delete">').append(createIcon('bi/trash.svg')),
          this.btnMore = $('<div class="swipe-button more">').append(this.faBars = createIcon('bi/grip-vertical.svg'))
        ).css('height', this.target.outerHeight() + 'px')
        this.target.before(this.swipeCell)
      }
      // translate the moved cell
      if ((this.distanceX + THRESHOLD_X <= 0) || (this.unfolded && this.distanceX <= 0)) {
        const translation = this.unfolded ? this.distanceX : this.distanceX + THRESHOLD_X
        this.target.css({
          transform: 'translate3d(' + translation + 'px,0,0)'
        })
      }
      // if delete threshold is reached, enlarge delete button over whole cell
      if (Math.abs(this.distanceX) >= THRESHOLD_REMOVE && !this.expandDelete) {
        this.expandDelete = true
        this.btnDelete.css('width', '100%')
        this.btnMore.css('width', 0)
        this.faBars.css('opacity', 0)
      } else if (this.expandDelete && Math.abs(this.distanceX) <= THRESHOLD_REMOVE) {
        // remove style
        this.expandDelete = false
        this.btnDelete.css('width', '95px')
        this.faBars.css('opacity', 1)
        this.btnMore.removeAttr('style')
      }
    }
  },

  onTouchEnd (e) {
    if (this.scrolling) return // return if simple list scroll

    this.remove = this.unfold = e.data.view.isSwiping = false
    this.isMoving = false
    // left to right on closed cells is not allowed, we have to check this in touchmove and touchend
    if ((this.distanceX > 0) && !this.unfolded) {
      // always reset the cell to prevent half-opened cells
      e.data.resetSwipeCell.call(this, e.data, 0, true)
      return
    }

    // check for tap on unfolded cell
    if (this.unfolded && this.distanceX <= 10) {
      e.data.resetSwipeCell.call(e.data.currentSelection, e.data, this.distanceX === 0 ? -LOCKDISTANCE : this.distanceX)
      return false // don't do a select after this
    }

    if (this.otherUnfolded && Math.abs(this.distanceX) <= 10) {
      // other cell is opened, handle this as cancel action
      return false
    }
    if (Math.abs(this.distanceX) >= THRESHOLD_STICK) {
      // unfold automatically and stay at a position
      this.unfold = true
    }

    if (this.expandDelete) {
      // remove cell after this threshold
      this.remove = true
      this.unfold = false
    }

    cell = $(this) // save for later animation

    if (this.unfold) {
      this.expandDelete = false

      cell.velocity({
        translateX: [-LOCKDISTANCE, this.distanceX]
      }, {
        duration: UNFOLD_TIME,
        complete () {
          cell.addClass('unfolded')
        }
      })

      e.data.unfold = true
      e.data.currentSelection = this // save this for later use
    } else if (this.remove) {
      const self = this
      const theView = e.data.view
      const resetStyle = function () {
        this.removeAttr('style')
        // reset velocity's transform cache manually
        _(this).each(function (listItem) {
          const vel = $(listItem).data('velocity')
          if (vel) vel.transformCache = {}
        })
        theView.off('remove-mobile', resetStyle)
      }

      $(this).velocity({
        translateX: ['-100%', this.distanceX]
      }, {
        duration: UNFOLD_TIME_FULL,
        complete () {
          self.btnMore.remove()
          self.startX = self.startY = 0
          cell.data('velocity').transformCache = {}

          const cellsBelow = $(self).nextAll()

          if (cellsBelow.length > 0) {
            cellsBelow.velocity({
              translateY: CELL_HEIGHT
            }, {
              duration: MOVE_UP_TIME,
              complete () {
                const node = $(self).closest(SELECTABLE)
                const cid = node.attr('data-cid')
                // bind reset event
                theView.on('remove-mobile', resetStyle, cellsBelow)
                theView.trigger('selection:delete', [cid])
                self.swipeCell.remove()
                self.swipeCell = null
                $(self).removeClass('unfolded')
                self.unfolded = self.unfold = false
              }
            })
          } else {
            const node = $(self).closest(SELECTABLE)
            const cid = node.attr('data-cid')
            // bind reset event
            theView.on('remove-mobile', resetStyle, cellsBelow)
            theView.trigger('selection:delete', [cid])
            self.swipeCell.remove()
            self.swipeCell = null
            $(self).removeClass('unfolded')
            self.unfolded = self.unfold = false
          }
        }
      })
    } else if (this.distanceX) {
      e.data.resetSwipeCell.call(this, e.data, Math.abs(this.distanceX))
      return false
    }

    // maybe the deletion will be canceled, keep reference for reverting
    // the transformation
    ox.off('delete:canceled').on('delete:canceled', function () {
      cell.removeAttr('style')
      cell.nextAll().velocity({
        translateY: -CELL_HEIGHT
      })
    })
  },

  onSwipeLeft (e) {
    const node = $(e.currentTarget)
    if (node.hasClass('swipe-left')) return
    this.resetSwipe(this.getItems())
    this.renderInplaceRemove(node)
    node.addClass('swipe-left')
  },

  onSwipeRight (e) {
    this.resetSwipe($(e.currentTarget))
  },

  inplaceRemoveScaffold: $('<div class="swipe-left-content">').append(createIcon('bi/trash.svg')),

  renderInplaceRemove (node) {
    node.append(this.inplaceRemoveScaffold.clone())
  },

  onTapRemove (e) {
    e.preventDefault()
    // prevent a new select happening on the deleted cell
    e.stopImmediatePropagation()
    const node = $(e.currentTarget).closest(SELECTABLE)
    const cid = node.attr('data-cid')
    // propagate event
    this.view.trigger('selection:delete', [cid])
  },

  onFocus () {
    const items = this.getItems()
    const first = items.filter('[tabindex="0"]:first')
    let index = items.index(first)
    if (index > 0) return this.focus(index, items)
    // if no item has tabindex '0' index would be -1 which will translate to the last element of the selection in this.focus(index, items)
    index = 0
    const focus = true
    this.select(index, items, focus)
  },

  getBehavior () {
    return this.behavior
  }
}

const normalBehavior = {

  registerEvents () {
    this.view.$el
      .on('mousedown', $.proxy(this.onMousedown, this))
      .on('mouseup', $.proxy(this.onMouseup, this))
    // normal click/keyboard navigation
      .on('keydown', SELECTABLE, $.proxy(this.onKeydown, this))
      .on('mousedown click', SELECTABLE, $.proxy(this.onClick, this))
    // help accessing the list via keyboard if focus is outside
      .on('focus', $.proxy(function () {
        if (this.view.mousedown) return
        this.onFocus()
      }, this))
      .on('click', SELECTABLE, $.proxy(function (e) {
        if (!this.isMultiple(e)) this.triggerAction(e)
      }, this))
    // double click
      .on('dblclick', SELECTABLE, $.proxy(function (e) {
        if (e.ctrlKey || e.metaKey) return
        this.triggerDouble(e)
      }, this))
    // avoid context menu
      .on('contextmenu', function (e) { e.preventDefault() })

    if (this.view.options.swipe) {
      if (isTouch && _.device('android || ios') && !isLegacyWebview) {
        this.view.$el
          .on('touchstart', SELECTABLE, this, this.onTouchStart)
          .on('touchmove', SELECTABLE, this, this.onTouchMove)
          .on('touchend', SELECTABLE, this, this.onTouchEnd)
          .on('click', SWIPEDELETE, $.proxy(function (e) {
            this.onSwipeDelete(e)
          }, this))
          .on('click', SWIPEMORE, _.debounce(e => {
            this.onSwipeMore(e)
          }, 20, true))
      } else if (isTouch) {
        this.view.$el
          .on('swipeleft', SELECTABLE, $.proxy(this.onSwipeLeft, this))
          .on('swiperight', SELECTABLE, $.proxy(this.onSwipeRight, this))
          .on('click', '.swipe-left-content', $.proxy(this.onTapRemove, this))
      }
    }
  }
}

const alternativeBehavior = {

  pickSingle (node) {
    node.addClass('selected no-checkbox').attr('aria-selected', true)
    // remove select all checkbox;
    this.view.trigger('selection:subset')
  },

  onKeydown (e) {
    // spacebar
    if (e.which === 32) {
      e.preventDefault()
      let selection = this.getItems().filter('.selected')
      if (selection.length === 1) {
        selection.find('.list-item-checkmark').trigger('mousedown')
      } else if (selection.length === 0) {
        // if the currently focussed element is in our items list we select it
        selection = $(this.getItems()[this.getItems().index($(document.activeElement))])
        selection.find('.list-item-checkmark').trigger('mousedown')
      }
    } else {
      // use standard method
      prototype.onKeydown.call(this, e)
    }
  },

  outOfBounds (index, items) {
    if (index < 0) return 0

    if (index >= items.length) {
      index = items.length - 1
      // scroll to very bottom if at end of list (to keep a11y support)
      this.view.$el.scrollTop(0xFFFFFF)
    }
    return index
  },

  onClick (e) {
    const previous = this.get()
    const currentTarget = $(e.currentTarget)
    const mousedownSelect = (e.type === 'mousedown' && !this.isMultiple(e) && !currentTarget.is('.selected'))

    prototype.onClick.call(this, e, { customEvents: mousedownSelect })
    if (mousedownSelect) {
      this.selectEvents()
    }
    // trigger events (if only checkbox is changed the events are not triggered by normal function)
    if (_.isEqual(previous, this.get()) && e.type === 'mousedown' && this.isMultiple(e)) this.triggerChange(this.getItems(), currentTarget.attr('data-cid'))
  },

  // normal select now triggers selection:action instead of the usual events (item will be shown in detail view and checkbox is not checked)
  selectEvents (items) {
    items = items || this.getItems()
    const layout = (this.view.app && this.view.app.props.get('layout')) || 'list'
    // in list layout we need the old events or mails open when they are not supposed to (for example when moving with arrow keys)
    if (layout === 'list') {
      this.triggerChange(items)
    } else {
      const list = this.get()
      let events = 'selection:change selection:action'

      // to keep correct select all checkbox state
      // if the folder only contains one item, we must check the checkbox status
      if (items && items.length > 0 && items.length === list.length && (items.length !== 1 || !$(items[0]).hasClass('no-checkbox'))) {
        events += ' selection:all'
      } else {
        events += ' selection:subset'
      }

      if (list.length > 1) {
        events += ' selection:multiple'
      }

      this.view.trigger(events, list)
    }
  }
}

const simpleBehavior = {

  registerEvents () {
    this.view.$el.addClass('focus-indicator')

    this.view.$el
      .on('click', SELECTABLE, $.proxy(this.onClick, this))
      .on('keydown', SELECTABLE, $.proxy(this.onKeydown, this))
      .on('focus', $.proxy(this.onFocus, this))
      .on('mousedown', $.proxy(this.onMousedown, this))
      .on('mouseup', $.proxy(this.onMouseup, this))

    this.view.on('selection:empty', $.proxy(this.onSelectionEmpty, this))
  },

  isMultiple () {
    // allow select/deselect via space
    return true
  },

  isRange () {
    return false
  },

  onSelectionEmpty () {
    if (this.getItems().parent().find('li:focus').length > 0) return
    this._lastposition = -1
  },

  onFocus () {
    // prevent focus on scrollbar mouse clicks: see bug 57293
    if (this.view.mousedown) return

    const items = this.getItems()
    const first = items.filter('[tabindex="0"]:first')
    const index = items.index(first)

    this.focus(index > -1 ? index : 0, items)
  },

  onClick (e) {
    const items = this.getItems()
    const currentTarget = $(e.currentTarget)
    const index = items.index(currentTarget)

    this.resetTabIndex(items, items.eq(index))
    this.pick(index, items, e)
    this.triggerChange(items, currentTarget.attr('data-cid'))
    this.setPosition(e)
  },

  onKeydown (e) {
    switch (e.which) {
      // enter or space
      case 13:
      case 32:
        this.onSpace(e)
        break

        // cursor up/down
      case 38:
      case 40:
        this.onCursor(e)
        break

        // [Ctrl|Cmd + A] > select all
      case 65:
      case 97:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.selectAll()
        }
        break

        // [Ctrl|Cmd + D] > Deselect all
      case 68:
      case 100:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.selectNone()
          this.focus(0)
        }
        break

                // no default
    }
  },

  onSpace (e) {
    // actually same as a click
    this.onClick(e)
    e.preventDefault()
  },

  setPosition (e, index) {
    this._lastposition = _.isUndefined(index) ? this.getItems().index($(e.target).closest('li')) || 0 : index
  },

  getPosition (items, index) {
    return this._lastposition > -1 ? this._lastposition : index
  },

  onCursor (e) {
    // get current index
    const items = this.getItems()
    const current = $(document.activeElement)
    let index = (items.index(current) || 0)
    const cursorDown = e.which === 40

    // prevent default to avoid unwanted scrolling
    e.preventDefault()
    if (!/^(40|38)$/.test(e.which)) return

    index += cursorDown ? +1 : -1
    index = this.outOfBounds(index, items)

    if (this.isRange(e)) {
      // range select includes previous node
      this.setPosition(e)
      return this.pickRange(index, items)
    }

    // simple select includes only current node
    this.triggerChange(items, current.attr('data-cid'))
    this.setPosition(e, index)
    this.focus(index, items)
  }
}

const singleBehavior = {

  isMultiple () {
    return false
  },

  isRange () {
    return false
  },

  onClick (e) {
    const currentTarget = $(e.currentTarget)
    this.set([currentTarget.attr('data-cid')])
  }
}

_.extend(Selection.prototype, prototype)

export default Selection
