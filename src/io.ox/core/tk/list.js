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
import Backbone from '@/backbone'
import ox from '@/ox'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ContextMenuUtils from '@/io.ox/backbone/mini-views/contextmenu-utils'
import Selection from '@/io.ox/core/tk/list-selection'
import dnd from '@/io.ox/core/tk/list-dnd'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import { createIcon } from '@/io.ox/core/components'

const keyEvents = {
  13: 'enter',
  27: 'escape',
  32: 'space',
  37: 'cursor:left',
  38: 'cursor:up',
  39: 'cursor:right',
  40: 'cursor:down'
}
// PULL TO REFRESH constants
const PTR_START = 5 // Threshold when pull-to-refresh starts
const PTR_TRIGGER = 150 // threshold when refresh is done
const PTR_MAX_PULLDOWN = 300 // max distance where the PTR node can be dragged to
const PTR_ROTATE_ANGLE = 360 // total rotation angle of the spinner while pulled down

// helper
function NOOP () { return $.when() }

const ListView = DisposableView.extend({

  tagName: 'ul',
  className: 'list-view',

  scaffold: $('<li class="list-item">').append(
    $('<div class="list-item-checkmark">'),
    $('<div class="list-item-content">'),
    $('<div class="list-item-swipe-content">')
  ),

  busyIndicator: $('<li class="busy-indicator" role="presentation">').append(createIcon('bi/chevron-down.svg')),

  // disabled by default via 'hidden class'
  notification: $('<li class="abs notification hidden" role="presentation">'),

  pullToRefreshIndicator: $('<div class="pull-to-refresh" style="transform: translate3d(0, -70px,0)">').append(
    $('<div class="spinner slight-drop-shadow" style="opacity: 1">')
      .append(createIcon('bi/arrow-clockwise.svg').attr('id', 'ptr-spinner'))
  ),

  onItemFocus () {
    this.toggleFocus(true)
  },

  onItemBlur () {
    if (this.mousedown) return
    this.toggleFocus(false)
  },

  onKeepFocus (e) {
    if (e.target !== this.el) return
    // ignore fake clicks
    if (!e.pageX) return
    // restore focus
    this.restoreFocus()
  },

  // note: empty function that is overridden in listview.js
  onContextMenu () {

  },

  restoreFocus (greedy) {
    // try to find the correct item to focus
    const items = this.getItems()
    const selectedItems = items.filter('.selected')
    if (selectedItems.length === 0) {
      if (greedy) this.selection.select(0, items)
      return
    }
    if (selectedItems.length === 1) {
      // only one item, just focus that
      selectedItems.focus()
    } else if (selectedItems.filter(document.activeElement).length === 1) {
      // the activeElement is in the list, focus it
      selectedItems.filter(document.activeElement).focus()
    } else {
      // just use the last selected item to focus
      selectedItems.last().focus()
    }
  },

  onItemKeydown (e) {
    if (keyEvents[e.which]) this.trigger(keyEvents[e.which], e)
    ContextMenuUtils.macOSKeyboardHandler(e)
    if (e.isKeyboardEvent) this.onContextMenu(e)
  },

  // use throttle instead of debounce in order to respond during scroll momentum
  onScroll: _.throttle(function () {
    if (this.disposed || this.isBusy || !this.loader.collection || this.collection.complete || !this.$el.is(':visible')) return

    const height = this.$el.outerHeight()
    const scrollTop = this.el.scrollTop
    const scrollHeight = this.el.scrollHeight
    const bottom = scrollTop + height

    // two competing concepts:
    // a) the user wants to see the end of the list; some users feel better; more orientation. Less load on server.
    // b) powers users hate to wait; never want to see the end of the list. More load on server.
    // we're know using b) by preloading if the bottom edge exceeds 80%
    if (bottom / scrollHeight < 0.80) return

    // show indicator & fetch next page
    this.addBusyIndicator()
    this.processPaginate()
  }, 20),

  onLoad () {
    this.idle()
    // trigger scroll event after initial load
    // takes care of the edge-case that the initial list cannot fill the viewport (see bug 37728)
    if (!this.isComplete()) this.onScroll()
  },

  onComplete (complete) {
    this.toggleComplete(complete !== false) // default: true
  },

  // load more data (wraps paginate call)
  processPaginate () {
    if (this.isComplete() || this.isBusy || !this.supportsPagination()) return
    this.paginate()
  },

  // support for custom keys, e.g. needed to identify threads or folders
  getCompositeKey (model) {
    return model.isFolder && model.isFolder() ? 'folder.' + model.get('id') : model.cid
  },

  // called when the view model changes (not collection models)
  onModelChange () {
    if (this.disposed) return
    this.load()
  },

  empty () {
    this.idle()
    this.toggleComplete(false)
    this.getItems().remove()
    delete this.currentLabel
    this.$('.list-item-label').remove()
    if (this.selection) this.selection.reset()
    this.$el.scrollTop(0)
  },

  renderNotification (type, error) {
    const baton = ext.Baton({ app: this.app, options: this.options, listView: this, error })
    const point = ext.point(this.ref + '/notification/' + type)
    const isEmpty = !this.collection.length
    const $notification = this.$('.notification').attr('role', type === 'error' ? 'alert' : 'presentation').empty()
    if (isEmpty && point.keys().length) {
      point.invoke('draw', $notification, baton)
    }
    $notification.toggleClass('hidden', !isEmpty)
    this.$el.addClass('complete')
    $('html').addClass('complete')
  },

  renderEmpty () {
    this.renderNotification('empty')
  },

  renderError (error) {
    this.idle()
    this.renderNotification('error', error)
  },

  onReset () {
    const self = this
    this.empty()
    this.collection.each(function (model) {
      self.$el.append(self.renderListItem(model, true))
    })
    this.trigger('reset', this.collection, this.firstReset)
    if (this.firstReset) {
      this.trigger('first-reset', this.collection)
      this.firstReset = false
    }
    if (this.firstContent && this.collection.length) {
      performance.mark('listview:first-content')
      this.trigger('first-content', this.collection)
      this.firstContent = false
    }
    this.trigger('listview:reset')
  },

  // bundle draws
  onAdd (model) {
    this.queue.add(model).render()
  },

  lastElementOfLabel (li) {
    const prev = li.prev(); const next = li.next(); const label = li.attr('data-label')
    if (prev.attr('data-label') === label) return false
    if (next.attr('data-label') === label) return false
    return true
  },

  onRemove (model) {
    const children = this.getItems()
    const cid = this.getCompositeKey(model)
    const li = children.filter(`[data-cid="${CSS.escape(cid)}"]`)
    const isSelected = li.hasClass('selected')

    if (li.length === 0) return

    // keep scroll position if element is above viewport
    if (li[0].offsetTop < this.el.scrollTop) {
      this.el.scrollTop -= li.outerHeight(true)
    }

    if (this.selection) this.selection.remove(cid, li)

    // remove label if this is the last element of that label
    if (this.options.labels && this.lastElementOfLabel(li)) li.prev().remove()

    li.remove()

    this.trigger('remove-mobile')
    // selection changes if removed item was selected
    if (isSelected) this.selection.triggerChange()

    // simulate scroll event because the list might need to paginate.
    // Unless it's the last one! If we did scroll for the last one, we would
    // trigger a paginate call that probably overtakes the delete request
    if (children.length > 1) {
      // see bug #46319 : handle 'select all' -> 'move'
      _.defer(function () {
        if (this.disposed) return
        this.$el.trigger('scroll')
      }.bind(this))
    }

    // forward event
    this.trigger('remove', model)
  },

  onBatchRemove (list) {
    // build hash of all composite keys
    const hash = {}
    _(list).each(function (obj) {
      if (_.isObject(obj)) {
        const cid = obj.cid || _.cid(obj)
        hash[cid] = true
      } else hash[obj] = true
    })

    // get all DOM nodes
    const items = this.getItems()
    if (items.length === 0) return

    // get first selected item and its offset
    const selected = items.filter('.selected')[0]

    // get affected DOM nodes and remove them
    items
      .filter(function () {
        const cid = $(this).attr('data-cid')
        return !!hash[cid]
      })
      .remove()

    // manage the empty message
    this.renderEmpty()

    if (!selected) return

    // make sure the first selected item is visible (if out of viewport)
    const top = $(selected).position().top
    const outOfViewport = top < 0 || top > this.el.offsetHeight
    if (outOfViewport) selected.scrollIntoView()
  },

  onSort: (function () {
    function getIndex (node) {
      // don't use data() here
      return node && parseInt(node.getAttribute('data-index'), 10)
    }

    return function () {
      // needless cause added models not drawn yet (debounced renderListItems)
      if (this.queue.list.length) return

      let i; let j; let length; let node; let reference; let index; const done = {}; let nodeLabel

      // sort all nodes by index
      const dom = this.getItems().toArray()
      const sorted = _(dom).sortBy(getIndex)

      // apply sorting (step by step to keep focus)
      // the arrays "dom" and "sorted" always have the same length
      for (i = 0, j = 0, length = sorted.length; i < length; i++) {
        node = sorted[i]
        reference = dom[j]
        // mark as processed
        done[i] = true
        if (this.options.labels) {
          nodeLabel = this.getLabel(this.collection.get($(node).attr('data-cid')))
          $(node).attr('data-label', nodeLabel)
        }
        // same element?
        if (node === reference) {
          // fast forward "j" if pointing at processed items
          do { index = getIndex(dom[++j]) } while (done[index])
        } else if (reference) {
          // change position in dom
          this.el.insertBefore(node, reference)
        }
      }

      if (this.options.labels) {
        _.defer(function () {
          let currentLabel
          let previousLabel
          const self = this
          const items = this.$el.find('.list-item').toArray()

          items.forEach(function (item) {
            if ($(item).hasClass('list-item-label')) {
              currentLabel = $(item).text()
              // label without appointment || label needs to be updated || label already exists
              if (!$(item).next().hasClass('appointment') || $(item).next().attr('data-label') !== currentLabel || previousLabel === currentLabel) {
                $(item).remove()
              } else {
                previousLabel = currentLabel
              }
            } else {
              const itemLabel = $(item).attr('data-label')
              if (itemLabel !== previousLabel) {
                currentLabel = itemLabel
                previousLabel = currentLabel
                self.el.insertBefore(self.renderListLabel(itemLabel)[0], item)
              }
            }
          })
        }.bind(this))
      }
    }
  }()),

  onTouchStart (e) {
    if (this.options.noPullToRefresh) return
    const atTop = this.$el.scrollTop() === 0
    const touches = e.originalEvent.touches[0]
    const currentY = touches.pageY
    const currentX = touches.pageX
    if (atTop) {
      this.pullToRefreshStartY = currentY
      this.pullToRefreshStartX = currentX
    }
  },

  onTouchMove (e) {
    const touches = e.originalEvent.touches[0]
    const currentY = touches.pageY
    const distance = currentY - this.pullToRefreshStartY

    if (this.pullToRefreshStartY && !this.isPulling && !this.isSwiping) {
      if ((currentY - this.pullToRefreshStartY) >= PTR_START) {
        e.preventDefault()
        e.stopPropagation()
        // mark the list as scrolling, this will prevent selection from
        // performing cell swipes but only if we are not performing a cell swipe
        this.selection.isScrolling = true
        this.isPulling = true
        this.$el.prepend(
          this.pullToRefreshIndicator
        )
      }
    }

    if (this.isPulling && distance <= PTR_MAX_PULLDOWN) {
      this.pullToRefreshTriggerd = false
      e.preventDefault()
      e.stopPropagation()

      const rotationAngle = (PTR_ROTATE_ANGLE / PTR_MAX_PULLDOWN) * distance
      const top = -70 + ((70 / PTR_TRIGGER) * distance)

      this.pullToRefreshIndicator
        .css('transform', 'translate3d(0,' + top + 'px,0)')

      $('#ptr-spinner').css('transform', 'rotateZ(' + rotationAngle + 'deg)')

      this.selection.isScrolling = true

      if ((currentY - this.pullToRefreshStartY) >= PTR_TRIGGER) {
        this.pullToRefreshTriggerd = true
      }
    } else if (this.isPulling && distance >= PTR_MAX_PULLDOWN) {
      e.preventDefault()
      e.stopPropagation()
    }
  },

  onTouchEnd (e) {
    if (this.pullToRefreshTriggerd) {
      // bring the indicator in position
      this.pullToRefreshIndicator.css({
        transition: 'transform 50ms',
        transform: 'translate3d(0,0,0)'
      })
      // let it spin
      $('#ptr-spinner').addClass('spin')
      // trigger event to do the refresh elsewhere
      this.options.app.trigger('pull-to-refresh', this)

      e.preventDefault()
      e.stopPropagation()
    } else if (this.isPulling) {
      // threshold was not reached, just remove the ptr indicator
      this.removePullToRefreshIndicator(true)
      e.preventDefault()
      e.stopPropagation()
    }
    // reset everything
    this.selection.isScrolling = false
    this.pullToRefreshStartY = null
    this.isPulling = false
    this.pullToRefreshTriggerd = false
    this.pullToRefreshStartY = null
  },

  removePullToRefreshIndicator (simple) {
    const self = this
    // simple remove for unfinished ptr-drag
    if (simple) {
      self.pullToRefreshIndicator.css({
        transition: 'transform 50ms',
        transform: 'translate3d(0,-70px,0)'
      })
      setTimeout(function () {
        if (self.disposed) return
        self.pullToRefreshIndicator.removeAttr('style').remove()
      }, 100)
    } else {
      // fancy remove with scale-out animation
      setTimeout(function () {
        if (self.disposed) return
        self.pullToRefreshIndicator.addClass('scale-down')
        setTimeout(function () {
          if (self.disposed) return
          self.pullToRefreshIndicator
            .removeAttr('style')
            .removeClass('scale-down')
          $('#ptr-spinner').removeClass('spin')
          self.pullToRefreshIndicator.remove()
        }, 100)
      }, 250)
    }
  },

  // called whenever a model inside the collection changes
  onChange (model) {
    const li = this.$el.find(`li[data-cid="${CSS.escape(this.getCompositeKey(model))}"]`)
    const baton = this.getBaton(model)
    const index = model.changed.index
    const changedKeys = _.keys(model.changed)

    // change position?
    if (index !== undefined) li.attr('data-index', index)
    // draw via extensions but not if only the index has changed
    if (index === undefined || changedKeys.length > 1) ext.point(this.ref + '/item').invoke('draw', li.children().eq(1).empty(), baton)
    // forward event
    this.trigger('change', model)
  },

  onChangeCID (model) {
    const oldModel = model.clone()

    oldModel.set(model.previousAttributes())

    this.$el.find(`li[data-cid="${CSS.escape(this.getCompositeKey(oldModel))}"]`).attr('data-cid', this.getCompositeKey(model))
  },

  initialize (options) {
    // options
    // ref: id of the extension point that is used to render list items
    // app: application
    // pagination: use pagination (default is true)
    // draggable: add drag'n'drop support
    // swipe: enables swipe handling (swipe to delete etc)
    this.options = _.extend({
      pagination: true,
      draggable: false,
      selection: true,
      scrollable: true,
      swipe: false,
      labels: false
    }, options)

    this.toggleFocus = _.debounce(function (state) {
      if (this.disposed) return
      this.$el.attr('tabindex', state ? -1 : 0)
      this.$el.toggleClass('has-focus', state)
    }, 10)

    let events = {}; let dndEnabled = false; const self = this

    // selection?
    if (this.options.selection) {
      this.selection = new Selection(this, this.options.selection)
      events = {
        'focus .list-item': 'onItemFocus',
        'blur .list-item': 'onItemBlur',
        click: 'onKeepFocus',
        contextmenu: 'onContextMenu',
        'keydown .list-item': 'onItemKeydown'
      }

      if (_.device('smartphone')) {
        _.extend(events, {
          touchstart: 'onTouchStart',
          touchend: 'onTouchEnd',
          touchmove: 'onTouchMove'
        })
      }

      // set special class if not on smartphones (different behavior)
      if (_.device('!smartphone')) this.$el.addClass('visible-selection')
      // enable drag & drop
      dnd.enable({ draggable: true, container: this.$el, selection: this.selection })
      dndEnabled = true
      // a11y
      this.$el.addClass('f6-target')
    } else {
      this.toggleCheckboxes(false)
    }

    // scroll?
    if (this.options.scrollable) {
      this.$el.addClass('scrollpane')
    }

    // pagination?
    if (this.options.pagination) {
      events.scroll = 'onScroll'
    }

    this.ref = this.ref || options.ref
    this.app = options.app
    this.model = new Backbone.Model()
    this.isBusy = false
    this.firstReset = true
    this.firstContent = true

    // initial collection?
    if (this.options.collection) {
      this.setCollection(this.collection)
      if (this.collection.length) this.onReset()
    }

    // enable drag & drop; avoid enabling dnd twice
    if (this.options.draggable && !dndEnabled) {
      dnd.enable({ draggable: true, container: this.$el, selection: this.selection })
    }

    if (this.options.labels) {
      this.filter = function () { return !$(this).hasClass('list-item-label') }
    }

    this.delegateEvents(events)

    // don't know why but listenTo doesn't work here
    this.model.on('change', _.debounce(this.onModelChange, 10), this)

    // make sure busy & idle use proper this (for convenient callbacks)
    _.bindAll(this, 'busy', 'idle')

    // set special class if not on smartphones (different behavior)
    if (_.device('!smartphone')) {
      this.$el.addClass('visible-selection')
    }

    // helper to detect scrolling in action, only used by mobiles
    if (_.device('smartphone')) {
      let timer
      let scrollPos = 0
      if (this.selection) {
        this.selection.isScrolling = false
        this.$el.scroll(function () {
          if (self.$el.scrollTop() !== scrollPos) {
            self.selection.isScrolling = true
            scrollPos = self.$el.scrollTop()
          }
          if (timer) clearTimeout(timer)
          timer = setTimeout(function () {
            if (self.disposed) return
            self.selection.isScrolling = false
          }, 500)
        })
      }
    }

    this.queue = {

      list: [],

      add (item) {
        this.list.push(item)
        return this
      },

      render: _.debounce(function () {
        if (this.disposed) return
        this.renderListItems()
      }.bind(this), 10),

      iterate (fn) {
        try {
          this.list.forEach(fn.bind(self))
        } catch (e) {
          if (ox.debug) console.error('ListView.iterate', e)
        } finally {
          // use try/finally to ensure the queue get cleared
          this.list = []
        }
      }
    }
  },

  forwardCollectionEvents (name) {
    const args = _(arguments).toArray().slice(1)
    args.unshift('collection:' + name)
    this.trigger.apply(this, args)
  },

  setCollection (collection) {
    if (!collection) return
    // remove listeners; make sure this.collection is an object otherwise we remove all listeners
    if (this.collection) this.stopListening(this.collection)
    this.collection = collection
    this.toggleComplete(this.isComplete())
    this.toggleExpired(false)
    this.listenTo(collection, {
      // forward events
      all: this.forwardCollectionEvents,
      // backbone
      add: this.onAdd,
      change: this.onChange,
      'change:cid': this.onChangeCID,
      remove: this.onRemove,
      reset: this.onReset,
      sort: this.onSort,
      // load
      'before:load': this.busy,
      load: this.onLoad,
      'load:fail': this.renderError,
      // paginate
      'before:paginate': this.busy,
      paginate: this.idle,
      'paginate:fail': this.idle,
      complete: this.onComplete,
      // reload
      reload: this.idle,
      expire: this.onExpire
    })
    this.listenTo(collection, {
      // backbone
      add: this.renderEmpty,
      remove: this.renderEmpty,
      reset: this.renderEmpty
    })
    if (this.selection) this.selection.reset()
    this.trigger('collection:set')
    return this
  },

  // respond to expire event (usually triggered by the GC)
  onExpire () {
    // revert flag since this is an active collection (see bug 54111)
    this.toggleExpired(false)
  },

  toggleExpired (flag) {
    this.collection.expired = flag
  },

  // if true current collection is regarded complete
  // no more items are fetched
  toggleComplete (state) {
    if (!this.supportsPagination()) state = true
    this.$el.toggleClass('complete', state)
  },

  supportsPagination () {
    if (this.collection && this.collection.pagination === false) return false
    return !!this.options.pagination
  },

  isComplete () {
    return this.collection && this.collection.complete
  },

  // shows/hides checkboxes
  toggleCheckboxes (state) {
    this.$el.toggleClass('hide-checkboxes', state === undefined ? undefined : !state)
  },

  // return alls items of this list
  // the filter is important, as we might have a header
  // although we could use children(), we use find() as it's still faster (see http://jsperf.com/jquery-children-vs-find/8)
  getItems () {
    let items = this.$el.find('.list-item')
    if (this.filter) items = items.filter(this.filter)
    return items
  },

  // optional: filter items
  setFilter (selector) {
    this.filter = selector
    const items = this.$el.find('.list-item')
    items.removeClass('hidden')
    if (this.filter) {
      items.not(this.filter).addClass('hidden')
      // we need to have manual control over odd/even because nth-child doesn't work with hidden elements
      items.filter(this.filter).each(function (index) { $(this).addClass(index % 2 ? 'even' : 'odd') })
    } else {
      items.removeClass('even odd')
    }
  },

  connect (loader) {
    // remove listeners; make sure this.collection is an object otherwise we remove all listeners
    if (this.collection) this.stopListening(this.collection)
    this.collection = loader.getDefaultCollection()
    // register listener as soon as the first loader is connected
    if (this.options.pagination && !this.loader) {
      // respond to window resize (see bug 37728)
      // make onScroll unique function first (all instance share same function otherwise)
      this.onScroll = this.onScroll.bind(this)
      this.listenToDOM(window, 'resize', this.onScroll)
    }
    this.loader = loader

    this.load = function (options) {
      // load data
      this.empty()
      loader.load(_.extend(this.model.toJSON(), options))
      this.setCollection(loader.collection)
      // load() first, setCollection() second
      // need a manual loading event (otherwise lost)
      loader.collection.trigger('loading')
    }

    this.paginate = function (options) {
      loader.paginate(_.extend(this.model.toJSON(), options))
    }

    this.reload = function (options) {
      loader.reload(_.extend(this.model.toJSON(), options))
    }

    this.trigger('connect')
  },

  load: NOOP,
  paginate: NOOP,
  reload: NOOP,

  map (model) {
    return model.toJSON()
  },

  render () {
    if (this.options.selection) {
      this.$el.attr({
        'aria-multiselectable': true,
        role: 'listbox',
        tabindex: 0
      })
    }
    // single selection
    if (this?.selection?.behavior.indexOf('single') >= 0) this.$el.removeAttr('aria-multiselectable')

    this.$el.attr('data-ref', this.ref)
    this.addNotification()
    return this
  },

  redraw () {
    const point = ext.point(this.ref + '/item')
    const collection = this.collection
    this.getItems().each(function (index, li) {
      if (index >= collection.length) return
      const model = collection.at(index)
      const baton = this.getBaton(model)
      point.invoke('draw', $(li).children().eq(1).empty(), baton)
    }.bind(this))
  },

  createListItem () {
    const li = this.scaffold.clone()
    if (this.options.selection) {
      // a11y: use role=option and aria-selected here; no need for "aria-posinset" or "aria-setsize"
      // see http://blog.paciellogroup.com/2010/04/html5-and-the-myth-of-wai-aria-redundance/
      li.addClass('selectable').attr({ 'aria-selected': false, role: 'option', tabindex: '-1' })
    }
    return li
  },

  getPreviousLabel (li) {
    let elem = li
    while (elem.length > 0 && !elem.hasClass('list-item-label')) elem = elem.prev()
    return elem.text()
  },

  renderListLabel (label) {
    return $('<li class="list-item list-item-label" role="presentation">').text(label)
  },

  renderListItem (model, drawlabels) {
    const li = this.createListItem()
    const baton = this.getBaton(model)
    const node = li.children().eq(1)
    // prepend label if necessary
    if (drawlabels && this.options.labels) {
      const label = this.getLabel(model)
      if (this.currentLabel !== label) {
        this.$el.append(this.renderListLabel(label))
        this.currentLabel = label
      }
    }

    // use button markup if needed (used for a11y if listitems are clickable and open popups etc)
    if (this.options.useButtonMarkup) {
      li.children().wrapAll('<button type="button" class="btn-unstyled width-100">')
    }
    // add cid and full data
    li.attr({ 'data-cid': this.getCompositeKey(model), 'data-index': model.get('index') })
    if (this.options.labels) li.attr('data-label', this.getLabel(model))
    // draw via extensions
    ext.point(this.ref + '/item').invoke('draw', node, baton)
    return li
  },

  renderListItems () {
    this.idle()

    // do this line once (expensive)
    const children = this.getItems()

    this.queue.iterate(function (model) {
      const index = model.has('index') ? model.get('index') : this.collection.indexOf(model)
      const li = this.renderListItem(model, false); let modelLabel; let listLabel

      // insert or append
      if (index < children.length) {
        let childAfter = children.eq(index)
        if (this.options.labels) {
          modelLabel = this.getLabel(model)
          listLabel = this.getPreviousLabel(childAfter)
          if (modelLabel !== listLabel) childAfter = childAfter.prev()
        }
        // we need to add the new item to the list of items or we get wrong indices
        try {
          children.splice(index, 0, li)
          childAfter.before(li)
        } catch (e) {
          if (ox.debug) console.error('renderListItems/queue.iterate', e)
        }
        // scroll position might have changed due to insertion
        if (li[0].offsetTop <= this.el.scrollTop) {
          this.el.scrollTop += li.outerHeight(true)
        }
      } else {
        this.$el.append(li)
        // we need to add the new item to the list of items or we get wrong indices
        children.push(li)
      }

      if (this.options.labels) {
        listLabel = this.getPreviousLabel(li)
        modelLabel = this.getLabel(model)
        if (modelLabel !== listLabel) li.before(this.renderListLabel(modelLabel))
      }

      // forward event
      this.trigger('add', model, index)
      // use raw cid here for non-listview listeners (see custom getCompositeKey)
      this.trigger('add:' + model.cid, model, index)
    })

    // needs to be called manually cause drawing is debounced
    this.onSort()
  },

  getBaton (model) {
    const data = this.map(model)
    return ext.Baton({ data, model, app: this.app, options: this.options })
  },

  getBusyIndicator () {
    return this.$el.find('.busy-indicator')
  },

  addNotification () {
    this.notification.clone().appendTo(this.$el)
  },

  addBusyIndicator () {
    const indicator = this.getBusyIndicator()
    // ensure the indicator is the last element in the list
    if (indicator.index() < this.$el.children().length) indicator.appendTo(this.$el)
    return indicator.length ? indicator : this.busyIndicator.clone().appendTo(this.$el)
  },

  removeBusyIndicator () {
    this.getBusyIndicator().remove()
  },

  busy () {
    if (this.isBusy) return
    this.$('.notification').css('display', 'none')
    this.addBusyIndicator().busy({ immediate: true }).find('svg').remove()
    this.isBusy = true
    return this
  },

  idle (e) {
    // if idle is called as an error callback we should display it (load:fail for example)
    if (e && e.error) {
      yell(e)
    }
    if (!this.isBusy) return
    this.removeBusyIndicator()
    this.isBusy = false
    this.$('.notification').css('display', '')
    return this
  },

  getPosition () {
    return this.selection.getPosition()
  },

  hasNext () {
    if (!this.collection) return false
    const index = this.getPosition() + 1
    return index < this.collection.length || !this.isComplete()
  },

  next () {
    if (this.hasNext()) this.selection.next(); else this.processPaginate()
  },

  hasPrevious () {
    if (!this.collection) return false
    const index = this.getPosition() - 1
    return index >= 0
  },

  previous () {
    if (this.hasPrevious()) this.selection.previous(); else this.$el.scrollTop(0)
  },

  // set proper focus
  focus () {
    const items = this.getItems().filter('.selected').focus()
    if (items.length === 0) this.$el.focus()
  }
})

export default ListView
