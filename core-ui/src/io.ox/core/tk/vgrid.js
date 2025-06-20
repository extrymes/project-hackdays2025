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
import Selection from '@/io.ox/core/tk/selection'
import Events from '@/io.ox/core/event'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const DONE = $.when()
const THRESHOLD_X = 20 // touchmove threshold for mobiles in PX
const THRESHOLD_Y = 40 // touchmove threshhold, don't trigger if scrolling

/**
 * Template class
 * @returns {Template}
 */
function Template (o) {
  // default options
  o = _.extend({
    tagName: 'div',
    defaultClassName: 'vgrid-cell',
    // container to draw templates for height measuring
    // normally the the actual vgrid container is used(so css styles are applied correct)
    tempDrawContainer: document.body
  }, o)

  const template = []

  const getHeight = function (node) {
    node.css('visibility', 'hidden').show()
      .appendTo(o.tempDrawContainer)
    const height = Math.max(1, node.outerHeight(true))
    node.remove()
    return height
  }

  let isEmpty = true

  this.node = $('<' + o.tagName + '>')
    .addClass(o.defaultClassName)

  this.add = function (obj) {
    if (obj && obj.build) {
      template.push(obj)
      isEmpty = false
    }
  }

  this.isEmpty = function () {
    return isEmpty
  }

  this.getHeight = function () {
    if (isEmpty) {
      return 0
    }
    // not sure if template ever contains more than one element
    if (template[0].getHeight) {
      return template[0].getHeight()
    }
    return getHeight(this.getClone().node)
  }

  this.getDefaultClassName = function () {
    return o.defaultClassName
  }

  // internal class
  function Row (node) {
    this.node = node
    this.fields = {}
    this.set = []
    this.detached = true
  }

  Row.prototype.update = function (data, index, id, prev, grid) {
    // loop over setters
    let i = 0; const setters = this.set; const $i = setters.length; const rets = []
    for (; i < $i; i++) {
      rets.push(setters[i].call(this.node, data, this.fields, index, prev, grid) || DONE)
    }
    // set composite id?
    if (id !== undefined) {
      this.node.attr('data-obj-id', id)
    }
    return rets
  }

  Row.prototype.appendTo = function (target) {
    if (this.detached) {
      this.node.appendTo(target)
      this.detached = false
    }
    return this
  }

  Row.prototype.detach = function () {
    this.node.detach()
    this.node.removeAttr('data-obj-id')
    this.detached = true
    return this
  }

  this.getClone = function (prebuild) {
    let i = 0; const $i = template.length; let tmpl
    const row = new Row(this.node.clone())
    // pre build
    if (prebuild) {
      _.extend(row.fields, prebuild.call(row.node) || {})
    }
    // build
    for (; i < $i; i++) {
      tmpl = template[i]
      _.extend(row.fields, tmpl.build.call(row.node) || {})
      row.set.push(tmpl.set || $.noop)
    }
    // clean up template to avoid typical mistakes - once!
    row.node.add(row.node.find('div, span, p, td')).not('.ignoreheight').each(function () {
      const node = $(this)
      if (node.children().length === 0 && node.text() === '') {
        node.text('\u00A0')
      }
    })
    row.node.find('img').each(function () {
      if (this.style.width === '' || this.style.height === '') {
        console.error('Image has no width/height. Set to (0, 0):', this)
        this.style.width = this.style.height = '0px'
      }
    })
    // remember class name
    o.defaultClassName = row.node[0].className
    // return row
    return row
  }
}

const CHUNK_SIZE = 200
const CHUNK_GRID = 40

const ChunkLoader = function (listRequest) {
  let instance = null

  function Instance () {
    let current = -1

    this.load = function (offset, all) {
      // round offset
      offset = (offset && Math.max(0, Math.floor(offset / CHUNK_GRID) * CHUNK_GRID)) || 0
      // nothing to do?
      if (all.length === 0 || offset === current) return $.Deferred().resolve(null)
      // mark as current
      current = offset
      // fetch data
      return listRequest(all.slice(offset, offset + CHUNK_SIZE)).then(function (data) {
        // only return data if still current offset
        try {
          return current === offset ? { data, offset, length: data.length } : null
        } finally {
          data = all = null
        }
      })
    }

    this.reset = function () {
      current = -1
    }
  }

  this.load = function () {
    return instance.load.apply(instance, arguments)
  }

  this.reset = function () {
    if (instance) instance.reset()
    instance = new Instance()
  }

  this.reset()
}

const onResize = function (e) {
  e.preventDefault()
  const left = $(this).closest('.leftside')
  const base = e.pageX - left.width()
  const limitX = $(document).width() - 250
  let width

  $(document).on({
    'mousemove.resize' (e) {
      width = Math.max(250, Math.min(e.pageX, limitX) - base)
      left.css('width', width)
    },
    'mouseup.resize' () {
      $(this).off('mousemove.resize mouseup.resize')
      e.data.updateSettings('width/' + _.display(), width)
      $(document).trigger('resize')
    }
  })
}

const VGrid = function (target, options) {
  options = _.extend({
    simple: true,
    editable: true,
    multiple: true,
    draggable: true,
    dragType: '',
    selectFirst: true,
    toolbarPlacement: 'top',
    secondToolbar: false,
    swipeLeftHandler: false,
    swipeRightHandler: false,
    containerLabel: gt('Multiselect'),
    dividerThreshold: 0
  }, options || {})

  if (options.settings) {
    // never show selectboxes on startup on mobile.
    // Selectmode on mobile intercepts cell actions
    options.editable = _.device('smartphone') ? false : options.settings.get('vgrid/editable', true)
  }

  // target node
  const node = $(target).empty().addClass('vgrid')
  // reference for private functions
  const self = this
  // states
  let initialized = false
  let loaded = false
  let responsiveChange = true
  let firstRun = true
  // inner container / added role="presentation" because screen reader runs amok
  const scrollpane = $('<div class="abs vgrid-scrollpane">').appendTo(node)
  const ariaAttributesContainer = function () {
    const obj = {}
    if (options.multiple) obj['aria-multiselectable'] = 'true'
    obj['aria-label'] = options.containerLabel
    return obj
  }
  const container = $('<div class="vgrid-scrollpane-container f6-target" role="listbox" tabindex="0">').attr(ariaAttributesContainer()).css({ position: 'relative', top: '0px' }).appendTo(scrollpane)
  // mobile select mode
  const mobileSelectMode = false

  const topbar = $('<div class="vgrid-toolbar generic-toolbar">').addClass(options.toolbarPlacement === 'top' ? 'bottom' : 'top')
    .appendTo(node)
  const toolbar = $('<div role="toolbar" class="vgrid-toolbar generic-toolbar">').addClass(options.toolbarPlacement === 'top' ? 'top' : 'bottom')
    .attr(
      // #. toolbar with 'select all' and 'sort by'
      'aria-label', gt('Item list options')
    )
    .append(
      // show checkbox
      options.showCheckbox === false
        ? []
        : $('<button type="button" class="btn btn-link select-all" data-name="select-all">')
          .append(createIcon('bi/square.svg'))
          .attr('title', gt('Select all'))
    )
    .prependTo(node)
  // item template
  let templateOptions = { tempDrawContainer: container }
  if (options.templateOptions) {
    templateOptions = _.extend(templateOptions, options.templateOptions)
  }
  container.on('keydown', function (e) {
    switch (e.which) {
      // [Ctrl|Cmd + A] > select all
      case 65:
      case 97:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // Select last element for correct scroll position
          self.selection.selectLast()
          _.defer(function () {
            self.selection.selectAll()
          })
        }
        break

        // [Ctrl|Cmd + D] > Deselect all
      case 68:
      case 100:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          self.selection.clear()
        }
        break

                // no default
    }
  })

  const template = new Template(templateOptions)
  // label template
  const label = new Template({ tempDrawContainer: container })
  // item pool
  let pool = []
  // heights
  let itemHeight = 0
  let labelHeight = 0
  // counters
  let numVisible = 0
  let numRows = 0
  // current mode
  let currentMode = 'all'
  // default all & list request
  const loadIds = {
    all () {
      return $.Deferred().resolve([])
    }
  }
  const loadData = {
    all (ids) {
      return $.Deferred().resolve(ids)
    }
  }
  // data index (contains ALL ids)
  let all = []
  // labels
  let labels = { nodes: $() }
  // optional tail cell
  let tail = $()
  // bounds of currently visible area
  const bounds = { top: 0, bottom: 0 }
  // Backbone prop Model
  const props = new Backbone.Model({ editable: options.editable || false })
  // shortcut
  const isArray = _.isArray
  // private methods
  let invisibleLabels = false
  let currentOffset = null
  let deserialize
  let preSelection

  const loader = new ChunkLoader(function (subset) {
    const load = loadData[currentMode] || loadData.all
    return load.call(self, subset)
  })

  // model events
  props.on('change', function (model) {
    const changed = model.changedAttributes()
    const key = _.keys(changed)[0]
    const value = _.values(changed)[0]
    // be compatible to old school events without backbone
    self.trigger('beforechange:prop', key, model.previousAttributes()[key], value)
    self.trigger('beforechange:prop:' + key, model.previousAttributes()[key], value)
    self.trigger('change:prop', key, value, model.previousAttributes()[key])
    self.trigger('change:prop:' + key, value, model.previousAttributes()[key])
    responsiveChange = true
  })

  // make resizable (unless touch device)
  if (!_.device('touch')) {
    node.append(
      $('<div class="resizebar">').on('mousedown', this, onResize)
    )
  }

  // add label class
  this.multiselectId = _.uniqueId('multi-selection-message-')
  template.node.addClass('selectable') // .attr('aria-describedby', this.multiselectId);
  // tabindex or containeronfocus is called when clicked
  label.node.addClass('vgrid-label').attr({ tabindex: -1, 'aria-hidden': 'true', role: 'option' })

  // add event hub
  Events.extend(this)

  // selection
  Selection.extend(this, scrollpane, { draggable: options.draggable, dragType: options.dragType })

  // swipe delegate
  if (_.device('touch')) {
    $(target).on('touchstart', '.selectable', function (e) {
      const touches = e.originalEvent.touches[0]
      const currentX = touches.pageX
      const currentY = touches.pageY

      // save first touch
      this.lastTouch = touches

      // var unfold indicates if any node is unfolded
      // var unfolded indicates if currently touched node is unfolded
      this.startX = currentX
      this.startY = currentY
      this.distanceX = 0
      this.distanceY = 0
      this.isMoving = false
    })

    $(target).on('touchmove', '.selectable', function (e) {
      const touches = e.originalEvent.touches[0]
      const currentX = touches.pageX
      const currentY = touches.pageY

      // return early on multitouch
      if (e.originalEvent.touches.length > 1) return

      this.lastTouch = touches

      this.distanceX = (this.startX - currentX) * -1 // invert value
      this.distanceY = (this.startY - currentY) * -1 // invert value

      if (this.distanceX <= THRESHOLD_X) {
        // try to swipe to the right at the start
        if (currentX > this.startX) {
          return // left to right is not allowed at the start
        }
      }

      if (Math.abs(this.distanceX) > THRESHOLD_X || this.isMoving) {
        e.preventDefault() // prevent further scrolling
        this.isMoving = true
        if (!this.target) {
          // do expensive jquery select only once
          this.target = $(e.currentTarget)
        }
      }
    })

    $(target).on('touchend', '.selectable', function (e) {
      if (currentMode !== 'search' && !mobileSelectMode) {
        if (this.isMoving && (Math.abs(this.distanceY) < THRESHOLD_Y)) {
          const touches = this.lastTouch
          const currentX = touches.pageX
          const node = $(this)
          const key = node.attr('data-obj-id')

          if (options.swipeRightHandler && (currentX > this.startX)) return options.swipeRightHandler(e, key, node)
          if (options.swipeLeftHandler && (currentX <= this.startX)) return options.swipeLeftHandler(e, key, node)
        }
      }
    })
  }
  // due to performance reasons we don't scroll but jump
  const scrollToLabel = function (index, silent) {
    const obj = labels.list[index]
    if (obj !== undefined) {
      scrollpane.scrollTop(obj.top)
      if (silent !== true) {
        // use select instead of set to udpate lastIndex internally
        self.selection.set(all[obj.pos]).setLastIndex(all[obj.pos])
      }
    }
  }

  const hScrollToLabel = function (e) {
    const index = $(this).data('label-index') || 0
    const inc = e.type === 'dblclick' ? 1 : 0
    scrollToLabel(index + inc, true)
  }

  const paintLabels = function () {
    // loop
    let i = 0; const $i = labels.list.length; let clone = null
    let obj; let cumulatedLabelHeight = 0; let text = ''; let defs = []
    for (; i < $i; i++) {
      // get
      obj = labels.list[i]
      // draw
      clone = label.getClone()
      clone.node.addClass('vgrid-label').data('label-index', i)
      // data, index, id, prev, grid
      defs = defs.concat(clone.update(all[obj.pos], obj.pos, '', all[obj.pos - 1] || {}, self))
      text = clone.node.text()
      // add node
      labels.nodes = labels.nodes.add(clone.node.appendTo(container))
      // meta data
      labels.index[obj.pos] = i
      labels.textIndex[text] = i
    }
    // loop to get proper height
    return $.when.apply($, defs).then(function () {
      let i; let obj; let node; let top
      // isVisible is only needed in for loop; visible selectors are slow, avoid them if possible
      const isVisible = $i > 0 ? container.show().is(':visible') : undefined
      let height
      for (i = 0; i < $i; i++) {
        obj = labels.list[i]
        obj.top = cumulatedLabelHeight + obj.pos * itemHeight
        node = labels.nodes.eq(i)
        node.css({ top: obj.top + 'px' })
        height = invisibleLabels ? 0 : (isVisible && node.outerHeight(true)) || labelHeight
        cumulatedLabelHeight += (obj.height = height)
      }
      // add tail?
      if (options.tail) {
        tail = options.tail.call(self, all.slice()) || $()
        top = all.length * itemHeight + cumulatedLabelHeight
        container.append(tail.css({ top: top + 'px' }))
        cumulatedLabelHeight += tail.outerHeight(true)
      }
      node = clone = defs = null
      return cumulatedLabelHeight
    })
  }

  const cloneRow = (function () {
    const createCheckbox = function () {
      const fields = {}
      this.prepend(
        fields.div = $('<div class="vgrid-cell-checkbox">')
        // .append(
        //   fields.icon = createIcon('bi/square.svg')
        // )
      )
      return { checkbox: fields }
    }

    return function (template) {
      // get clone
      return template.getClone(function () {
        // add checkbox for edit mode
        if (!options.checkboxDisabled) {
          return createCheckbox.call(this)
        }
      })
    }
  }())

  const processLabels = function () {
    // remove existing labels
    labels.nodes.remove()
    tail.remove()
    // reset
    labels = {
      nodes: $(),
      list: [],
      index: {},
      textIndex: {}
    }
    // below minimum?
    invisibleLabels = options.dividerThreshold && all.length < options.dividerThreshold
    node.toggleClass('invisible-labels', invisibleLabels)
    // loop
    let i = 0; const $i = all.length + 1; let current = ''; let tmp = ''
    for (; i < $i; i++) {
      tmp = self.requiresLabel(i, all[i], current, $i)
      if (tmp !== false) {
        labels.list.push({ top: 0, pos: i })
        current = tmp
      }
    }
  }

  function detachPoolItem (index, defaultClassName) {
    pool[index].detach()
    pool[index].node[0].className = defaultClassName || template.getDefaultClassName()
  }

  function detachPool () {
    let i = 0; const $i = pool.length; const defaultClassName = template.getDefaultClassName()
    for (; i < $i; i++) {
      detachPoolItem(i, defaultClassName)
    }
  }

  const paint = (function () {
    let keepFocus

    function cont (chunk) {
      // vars
      const data = chunk.data; const offset = chunk.offset
      let i; let $i; let shift = 0; let j = ''; let row
      const defaultClassName = template.getDefaultClassName()
      let tmp = new Array(data.length)
      let node; let index

      // get shift (top down)
      for (j in labels.index) {
        if (offset > j) {
          index = labels.index[j]
          shift += labels.list[index].height || labelHeight
        }
      }

      // remove undefined data
      for (i = 0, $i = data.length; i < $i;) {
        if (!data[i]) {
          data.splice(i, 1)
          $i--
        } else {
          i++
        }
      }

      // loop
      for (i = 0, $i = data.length; i < $i; i++) {
        // shift?
        index = labels.index[offset + i]
        if (index !== undefined && !invisibleLabels) {
          shift += labels.list[index].height || labelHeight
        }
        row = pool[i]
        row.appendTo(container)
        // reset class name

        row.node.attr({ role: 'option', 'aria-posinset': offset + i + 1, 'aria-setsize': data.length })
        node = row.node[0]
        node.className = defaultClassName + ' ' + ((offset + i) % 2 ? 'odd' : 'even')
        // update fields
        row.update(data[i], offset + i, self.selection.serialize(data[i]), data[i - 1] || {}, self)
        node.style.top = shift + (offset + i) * itemHeight + 'px'
        tmp[i] = row.node
      }

      // any nodes left to clear?
      if ($i < numRows) {
        for (; i < numRows; i++) {
          if ($(pool[i].node).is(':focus')) keepFocus = true
          detachPoolItem(i, defaultClassName)
        }
      }

      // update selection (just to get css classes back)
      self.selection.update()
      tmp = null

      // remember bounds
      bounds.top = offset
      bounds.bottom = offset + chunk.length
    }

    function fail (offset) {
      // continue with dummy chunk
      cont({ data: new Array(numRows), offset, length: numRows })
    }

    return function (offset) {
      if (!initialized) {
        return
      }

      // keep positive
      offset = Math.max(offset >> 0, 0)
      if (offset === currentOffset) {
        return DONE
      }
      currentOffset = offset

      // get all items
      return loader.load(offset, all).then(
        function (chunk) {
          if (chunk && chunk.data) {
            cont(chunk)

            if (preSelection) {
              // select element which has been set as preselected
              self.selection.set(preSelection)
              preSelection = undefined
            }

            if (keepFocus) {
              container.find('[aria-selected="true"]').trigger('focus')
              keepFocus = false
            }
          }
          // no fail handling here otherwise we get empty blocks
          // just because of scrolling
        },
        function () {
          // real failure
          fail(offset)
        }
      )
    }
  }())

  const resize = function () {
    // get num of rows
    numVisible = Math.max(1, ((node.height() / itemHeight) >> 0) + 2)
    numRows = CHUNK_SIZE
    // prepare pool
    let i = 0; let clone; let frag = document.createDocumentFragment()
    for (; i < numRows; i++) {
      if (i >= pool.length) {
        // get clone
        clone = cloneRow(template)
        frag.appendChild(clone.node[0])
        // add to pool
        pool.push(clone)
      } else {
        // (re)add to container
        frag.appendChild(pool[i].node[0])
      }
    }
    // detach remaining templates
    for (; i < pool.length; i++) {
      pool[i].node.detach()
    }
    // add fragment to container
    container[0].appendChild(frag)
    frag = null
  }

  function initLabels () {
    // process labels first, then set height
    processLabels()
    return paintLabels().done(function (cumulatedLabelHeight) {
      container.css({
        height: (cumulatedLabelHeight + all.length * itemHeight) + 'px'
      })
    })
  }

  function apply (list, quiet) {
    // store
    all = list
    currentOffset = null
    // initialize selection
    self.selection.init(all)
    // labels
    initLabels()

    // empty?
    scrollpane.find('.io-ox-center, .flex-center').remove().end()
    if (list.length === 0 && loaded) {
      detachPool()
      self.selection.trigger('change', [])
      scrollpane.append(
        $('<div class="io-ox-fail flex-center">').append(self.getEmptyMessage())
      )
    }

    // trigger event
    if (!quiet) {
      self.trigger('change:ids', all)
    }

    // get proper offset
    const top = scrollpane.scrollTop()
    const index = getIndex(top)
    const offset = index - (numVisible >> 1)

    return paint(offset)
  }

  // might be overwritten
  deserialize = function (cid) {
    return _.cid(cid)
  }

  const updateSelection = (function () {
    function getIds () {
      const id = _.url.hash('id')
      return id !== undefined ? id.split(/,/) : []
    }

    function restoreHashSelection (ids, changed) {
      // convert ids to objects first - avoids problems with
      // non-existing items that cannot be resolved in selections
      ids = _(ids).map(deserialize)
      const selectionChanged = !self.selection.equals(ids); let cid; let index
      if (selectionChanged && !self.selection.getMobileSelectMode()) {
        // set
        self.selection.set(ids)
      }
      if (selectionChanged || changed) {
        // scroll to first selected item
        cid = _(ids).first()
        index = self.selection.getIndex(cid) || 0
        if (!isVisible(index)) {
          // not at the very top
          setIndex(index - 2)
        }
      }
    }

    function autoSelectAllowed () {
      return $(document).width() > 700
    }

    return function updateSelection (changed) {
      if (!all.length) {
        self.selection.clear()
        return
      }

      const list = self.selection.get()
      const ids = list.length ? _(list).map(self.selection.serialize) : getIds()

      if (ids.length) {
        if (self.selection.contains(ids)) {
          // if ids are given and still part of the selection
          // we can restore that state
          // console.debug('case #1 restoreHashSelection()', ids);
          restoreHashSelection(ids, changed)
          return
        }
        _.url.hash('id', null)
      }

      if (autoSelectAllowed()) {
        const i = self.select()
        if (_.isNumber(i)) {
          // select by index
          // console.debug('case #2 select() >> index', i);
          self.selection.set(all[i])
          if (!isVisible(i)) {
            // not at the very top
            setIndex(i - 2)
          }
        } else if (_.isArray(i)) {
          // select by object (cid)
          // console.debug('case #3 select() >> object (cid)', i);
          if (self.selection.contains(i)) {
            self.selection.set(i)
          } else {
            self.selection.clear()
          }
        } else if (options.selectFirst) {
          // console.debug('case #4 select() >> first', i);
          self.selection.selectFirst()
        } else {
          self.selection.clear()
        }
      }
    }
  }())

  const loadAll = (function () {
    function fail (list) {
      // is detailed error message enabled
      list = list.categories === 'PERMISSION_DENIED' ? list : {}
      list = isArray(list) ? _.first(list) : list
      // clear grid
      apply([])
      // inform user
      container.hide()
      scrollpane.idle()
      // remove old messages
      scrollpane.find('.io-ox-center, .flex-center').remove()
      scrollpane.append(
        $.fail(list.error || gt('Could not load this list'), function () {
          container.show()
          loadAll()
        })
      )
    }

    function success (list) {
      // mark as loaded
      loaded = true
      responsiveChange = false

      // always reset loader since header data (e.g. flags) might have changed
      loader.reset()

      if (!_.isArray(list)) {
        console.warn('VGrid.all() must provide an array!')
        return $.Deferred().reject()
      }

      return apply(list)
        .always(function () {
          self.idle()
        })
        .done(function () {
          const hasChanged = !_.isEqual(all, list)
          updateSelection(hasChanged)
          // global event
          ox.trigger('grid:stop', _.clone(props.toJSON()), list)
        })
    }

    return function () {
      // global event
      ox.trigger('grid:start', _.clone(props.toJSON()))
      // get all IDs
      if (responsiveChange || all.length === 0) self.busy()
      const load = loadIds[currentMode] || loadIds.all
      return load.call(self).then(_.lfo(success), _.lfo(fail))
    }
  }())

  const init = function () {
    // get sizes
    itemHeight = template.getHeight()
    labelHeight = label.getHeight()
    // resize
    resize()
    currentOffset = null
    initialized = true
    $(document).trigger('resize')
    // load all IDs
    return loadAll()
  }

  // is index visible?
  const isVisible = function (index) {
    const top = scrollpane.scrollTop()
    const height = scrollpane.height()
    return index >= getIndex(top) && index < (getIndex(top + height) - 1)
  }

  // set scrollTop via index
  const setIndex = function (index) {
    let i = 0; const $i = Math.min(Math.max(0, index), all.length); let j = 0; let y = 0; let label
    for (; i < $i; i++) {
      label = labels.list[j]
      if (label && label.pos === i) {
        y += label.height || labelHeight
        j++
      }
      y += itemHeight
    }
    scrollpane.scrollTop(y)
  }

  // get index via scrollTop
  const getIndex = function (top) {
    let i = 0; const $i = all.length; let j = 0; let y = 0; let label
    for (; i < $i && y < top; i++) {
      label = labels.list[j]
      if (label && label.pos === i) {
        y += label.height || labelHeight
        j++
      }
      y += itemHeight
    }
    return i
  }

  const fnScroll = _.throttle(function () {
    const top = scrollpane.scrollTop()
    const index = getIndex(top)
    // checks bounds
    if (index >= bounds.bottom - numVisible - 2) {
      // below bottom (scroll down)
      paint(index - (numVisible >> 1))
    } else if (index < bounds.top + 2 && bounds.top !== 0) {
      // above top (scroll up)
      paint(index - numVisible * 1.5, 'above')
    }
  }, 50)

  // selection events
  this.selection
    .on('change', function (e, list) {
      // prevent to long URLs
      const id = _(list.length > 50 ? list.slice(0, 1) : list).map(function (obj) {
        return self.selection.serialize(obj)
      }).join(',')
      _.url.hash('id', id !== '' ? id : null)
      // propagate DOM-based select event?
      if (list.length >= 1) {
        node.trigger('select', [list])
      }
    })
    .on('select:first', function () {
      setIndex(0)
    })
    .on('select:last', function () {
      setIndex(all.length - 1)
    })

  // public methods

  this.setApp = function (app) {
    this.app = app
    return this.app
  }

  this.getApp = function () {
    return this.app
  }

  this.setAllRequest = function (mode, fn) {
    // parameter shift?
    if (_.isFunction(mode)) {
      fn = mode
      mode = 'all'
    }
    loadIds[mode] = fn
  }

  this.setListRequest = function (mode, fn) {
    // parameter shift?
    if (_.isFunction(mode)) {
      fn = mode
      mode = 'all'
    }
    loadData[mode] = fn
  }

  this.updateSettings = function (type, value) {
    if (options.settings) {
      options.settings.set('vgrid/' + type, value).save()
    }
  }

  this.addTemplate = function (obj) {
    template.add(obj)
  }

  this.addLabelTemplate = function (obj) {
    label.add(obj)
  }

  this.requiresLabel = function (/* data */) {
    return false
  }

  this.busy = function () {
    // remove error messages & hide container
    scrollpane.find('.io-ox-center, .flex-center').remove()
    container.css({ visibility: 'hidden' }).parent().busy()
    return this
  }

  /**
   * Set an element as preselected. Use this to select an element what will be added to
   * the VGrid with the next list/all request. After drawing, this element will be selected.
   */
  this.setPreSelection = function (data) {
    preSelection = data
  }

  this.idle = function () {
    _.defer(function () { container.show().css({ visibility: '' }).parent().idle() })
    return this
  }

  this.paint = function () {
    if (firstRun) {
      scrollpane.on('selectstart', false)
        .on('scroll', fnScroll)
        .on('click dblclick', '.vgrid-label', hScrollToLabel)
      firstRun = false
    }
    return init()
  }

  this.repaintLabels = function () {
    return initLabels()
  }

  this.repaint = _.mythrottle(function () {
    const offset = currentOffset || 0
    currentOffset = null
    // reset loader
    loader.reset()
    // cannot hand over deferred due to debounce;
    // don't remove debounce cause repaint is likely wired with APIs' refresh.list
    // which may be called many times in a row
    paint(offset)
  }, 100)

  this.clear = function () {
    return apply([], true)
  }

  this.refresh = function (force) {
    // load all (if painted before)
    if (!firstRun) return loadAll()
    return force === true ? this.paint() : DONE
  }

  this.pending = function () {
    responsiveChange = true
    this.busy()
    return this
  }

  this.getMode = function () {
    return currentMode
  }

  this.setMode = function (mode) {
    // we don't check for currentModule but always refresh
    // otherwise subsequent search queries are impossible
    // if this function gets called too often, fix it elsewhere
    const previous = currentMode
    currentMode = mode
    _.url.hash('id', null)
    responsiveChange = true
    this.trigger('change:mode', currentMode, previous)
    return this.refresh()
  }

  this.getId = function (data) {
    // default id
    return { folder_id: data.folder_id, id: data.id }
  }

  this.getData = function (index) {
    return index !== undefined ? all[index] : all
  }

  this.contains = function (data) {
    const sel = this.selection; const id = sel.serialize(data); let i = 0; const $i = (all || []).length
    for (; i < $i; i++) {
      if (id === sel.serialize(all[i])) {
        return true
      }
    }
    return false
  }

  this.getLabels = function () {
    return labels
  }

  this.scrollToLabelText = function (e, silent) {
    // get via text index
    const text = e.data ? e.data.text : e
    const index = labels.textIndex[text]
    if (index !== undefined) {
      scrollToLabel(index, silent)
    }
  }

  this.scrollTop = function () {
    return scrollpane.scrollTop()
  }

  this.keyboard = function (flag) {
    this.selection.keyboard(scrollpane, flag)
  }

  this.getToolbar = function () {
    return toolbar
  }

  this.getTopbar = function () {
    return topbar
  }

  this.getEditable = function () {
    return this.prop('editable')
  }
  this.getMobileSelectMode = function () {
    return mobileSelectMode
  }

  this.setEditable = function (flag) {
    if (options.multiple === true) {
      if (flag) {
        node.addClass('editable')
        this.selection.setEditable(true, options.simple ? '.vgrid-cell-checkbox' : '.vgrid-cell')
      } else {
        node.removeClass('editable')
        this.selection.setEditable(false)
      }
      this.prop('editable', flag)
      this.updateSettings('editable', flag)
    }
  }

  this.option = function (key, value) {
    if (key !== undefined) {
      if (value !== undefined) {
        const previous = options[key]
        if (value !== previous) {
          this.trigger('beforechange:option', key, value, previous)
          this.trigger('beforechange:option:' + key, value, previous)
          options[key] = value
          this.trigger('change:option', key, value, previous)
          this.trigger('change:option:' + key, value, previous)
          responsiveChange = true
        }
        return this
      }
      return options[key]
    }
    return options
  }

  this.props = props

  this.prop = function (key, value) {
    if (key !== undefined) {
      if (value !== undefined) {
        const previous = props.get(key)
        if (value !== previous) {
          this.trigger('beforechange:prop', key, value, previous)
          this.trigger('beforechange:prop:' + key, value, previous)
          props.set(key, value, { silent: true })
          this.trigger('change:prop', key, value, previous)
          this.trigger('change:prop:' + key, value, previous)
          responsiveChange = true
        }
        return this
      }
      return props.get(key)
    }
    return props.toJSON()
  }

  this.scrollTop = function (t) {
    return t !== undefined ? scrollpane.scrollTop(t) : scrollpane.scrollTop()
  }

  this.getContainer = function () {
    return container
  }

  this.setDeserialize = function (fn) {
    if (_.isFunction(fn)) {
      deserialize = fn
    }
  }

  this.getIds = function () {
    // return shallow copy
    return all.slice()
  }

  this.isVisible = isVisible
  this.setIndex = setIndex
  this.getIndex = getIndex

  this.getEmptyMessage = function () {
    // #. list is empty / no items
    return $.txt(gt.pgettext('vgrid', 'Empty'))
  }

  this.updateTemplates = function () {
    _(pool).each(function (node) {
      node.detach()
    })
    pool = []
    // no need to update if not yet initialized
    if (!initialized) return
    init()
    this.repaint()
  }

  this.getToolbar = function () {
    return toolbar
  }

  this.showToolbar = function (state) {
    if (state === true) {
      toolbar.show()
    } else {
      toolbar.hide()
    }
  }

  this.showTopbar = function (state) {
    if (state === true) {
      topbar.show()
      node.addClass(options.toolbarPlacement === 'top' ? 'top-toolbar' : 'bottom-toolbar')
    } else {
      topbar.hide()
      node.removeClass('top-toolbar bottom-toolbar')
    }
  }

  // apply options
  if (options.multiple) {
    if (options.editable) {
      this.setEditable(true)
    }
    this.selection.setMultiple(true)
    toolbar.show()
  } else {
    this.selection.setMultiple(false)
  }

  // process some options on toolbars
  if (options.toolbarPlacement !== 'none') {
    node.addClass(options.toolbarPlacement === 'top' ? 'top-toolbar' : 'bottom-toolbar')
    if (options.secondToolbar && _.device('!smartphone')) {
      node.addClass(options.toolbarPlacement === 'top' ? 'bottom-toolbar' : 'top-toolbar')
    }
  }

  if (options.hideTopbar) {
    this.showTopbar(false)
  }

  if (options.hideToolbar) {
    this.showToolbar(false)
  }

  this.on('change:prop:folder', function (e, value, previous) {
    // reset chunk loader
    loader.reset()
    if (previous !== undefined) {
      this.scrollTop(0)
      self.selection.resetLastIndex()
    }
  })

  this.on('change:mode', function () {
    // reset chunk loader
    loader.reset()
    // reset selection
    this.scrollTop(0)
    self.selection.clear()
    self.selection.resetLastIndex()
  })

  // focus handling (adopted from newer list.js)

  function onContainerFocus () {
    const items = container.children()
    const tabbable = items.filter('[tabindex="0"]:first')
    // avoid crazy infinite loops on ie
    if (tabbable.length) tabbable.focus(); else items.first().click()
  }

  function onItemFocus () {
    container.removeAttr('tabindex')
  }

  function onItemBlur () {
    container.attr('tabindex', 0)
  }

  if (!_.device('smartphone')) {
    container
      .on('focus', onContainerFocus)
      .on('focus', '.vgrid-cell', onItemFocus)
      .on('blur', '.vgrid-cell', onItemBlur)
  }

  // default implementation if hash cannot be mapped
  // returns index
  this.select = (function () {
    const hash = {}

    // restore persistent settings
    if (options.settings) {
      _(options.settings.get('vgrid/previous', {})).each(function (cid, folder) {
        hash[folder] = [_.cid(cid)]
      })
    }

    self.selection.on('change', function (e, list) {
      const folder = self.prop('folder')
      if (options.settings && list.length <= 1) {
        // we only store the current selection if its length is max 1
        options.settings.set(['vgrid', 'previous', folder], _.cid(list[0])).save()
        // always store in fluent hash
        hash[folder] = list
      }
    })

    self.on('beforechange:prop:folder', function (e, value, previous) {
      if (previous !== undefined) {
        hash[previous] = self.selection.get()
      }
    })

    self.selection.on('clear', function () {
      const folder = self.prop('folder')
      delete hash[folder]
    })

    return function () {
      const folder = self.prop('folder')
      return (currentMode === 'all' && hash[folder]) || null
    }
  }())

  this.focus = function () {
    container.focus()
  }
}

// make Template accessible
VGrid.Template = Template

export default VGrid
