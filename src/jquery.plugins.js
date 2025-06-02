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

import $ from 'jquery'
import _ from 'underscore'
import ox from '@/ox'
import '@/lib/jquery.lazyload.js'

// set this globally for bootstrap
window.jQuery = $

// save some original jQuery methods
$.original = { val: $.fn.val }

$.preventDefault = function (e) {
  e.preventDefault()
}

// this has been introduced around 2012
// before jQuery added $.escapeSelector in version 3.0 and before the existence of CSS.escape()
$.escape = function (str = '') {
  if (ox.debug) console.warn('$.escape() is deprected. Please use CSS.escape() instead')
  return CSS.escape(str)
}

$.button = function (options) {
  // options
  const opt = $.extend({
    label: '',
    click: $.noop,
    enabled: true,
    data: {},
    css: {},
    primary: false,
    info: false,
    success: false,
    warning: false,
    danger: false,
    inverse: false

    // other options:
    // id, mousedown
  }, options || {})
  // class name
  let className
  if (opt.purelink === true) {
    className = 'button io-ox-action-link'
  } else {
    className = `btn${(!opt.enabled ? ' btn-disabled' : '')}${(opt.primary ? ' btn-primary' : '')}${(opt.info ? ' btn-info' : '')}${(opt.success ? ' btn-success' : '')}${(opt.warning ? ' btn-warning' : '')}${(opt.danger ? ' btn-danger' : '')}${(opt.inverse ? ' btn-inverse' : '')}`
  }

  // create text node
  let text
  if (opt.label.nodeType === 3) {
    // is text node!
    text = opt.label
  } else {
    text = document.createTextNode(opt.label)
  }

  // create button
  let button
  if (opt.purelink === true) {
    button = $('<a>').addClass(className).append(text)
  } else {
    button = $('<button type="button">').addClass(className).append(
      $('<span>').append(text)
    )
  }
  button.on('click', opt.data, opt.click)

  // add id?
  if (opt.id !== undefined) {
    button.attr('id', opt.id)
  }

  button.attr('data-action', opt.dataaction || opt.data.action)

  return button
}

$.fn.busy = function (options) {
  if (options === true) options = { empty: true }
  options = _.extend({
    empty: false,
    immediate: false
  }, options)

  return this.each(function () {
    const self = $(this)
    clearTimeout(self.data('busy-timeout'))

    // in case element has .immediate and it's not wanted -> remove it
    self.addClass('io-ox-busy').toggleClass('immediate', options.immediate)

    if (!options.empty) return
    if (options.immediate) {
      self.empty()
    } else {
      self.data('busy-timeout', setTimeout(function () {
        self.empty()
      }, 300))
    }
  })
}

$.fn.idle = function () {
  return this.each(function () {
    const self = $(this)
    clearTimeout(self.data('busy-timeout'))
    self.removeClass('io-ox-busy immediate')
  })
}

function isScrolledOut (node, parent) {
  const item = node.getBoundingClientRect()
  const container = parent.getBoundingClientRect()
  const visible = { topline: container.top, bottomline: container.top + parent.offsetHeight }
  if (item.bottom < visible.topline) return 'top'
  if (item.top < visible.topline) return 'top:partial'
  if (item.top > visible.bottomline) return 'bottom'
  if (item.bottom > visible.bottomline) return 'bottom:partial'
}

$.fn.intoView = function (parent, options) {
  parent = parent[0] || parent
  const node = this[0]
  const opt = _.extend({ ignore: '' }, options)
  const scrolledOut = isScrolledOut(node, parent)
  // use case: ignore bottom:partial for really large nodes (e.g. folder node with subfolders)
  if (!scrolledOut || _(opt.ignore.split(',')).contains(scrolledOut)) return
  // alignToTop: top vs. bottom
  node.scrollIntoView(/^(top|top:partial)$/.test(scrolledOut))
}

//
// Unified and simplified solution
// should cover all cases, i.e. $.fn.intoViewport AND (newer) $.fn.intoView
//
$.fn.scrollIntoViewIfNeeded = function () {
  const node = this[0]; const pane = $(node).closest('.scrollable-pane, .scrollpane')[0]
  if (!node || !pane) return
  const outer = pane.getBoundingClientRect(); let inner
  // first: bottom up
  inner = node.getBoundingClientRect()
  if (inner.bottom > outer.bottom) pane.scrollTop += inner.bottom - outer.bottom
  // second: top down
  inner = node.getBoundingClientRect()
  if (inner.top < outer.top) pane.scrollTop -= outer.top - inner.top
}

$.fn.intoViewport = function (node) {
  if (!node) node = this.closest('.scrollable-pane,.scrollpane')

  if (node.length === 0 || this.length === 0) return this

  try {
    // get pane
    const pane = $(node)
    // get visible area
    const y1 = pane.scrollTop()
    let y2 = 0
    // get top position
    let top = this.offset().top + y1 - pane.offset().top
    let h = 0; let left = 0
    // out of visible area?
    if (top < y1) {
      // scroll up!
      top = top < 50 ? 0 : top
      pane.scrollTop(top)
    } else {
      // scroll down!
      y2 = y1 + pane.height()
      h = this.outerHeight()
      if (top + h > y2) {
        pane.scrollTop(y1 + top + h - y2)
      }
    }
    // custom offset?
    left = this.data('offset-left')
    if (left !== undefined) pane.scrollLeft(left)
  } catch (e) {
    // Chrome might get in trouble during ultra fast scrolling
    console.error('$.fn.intoViewport', this, e)
  }

  return this
}

// center content via good old stupid table stuff
$.fn.center = function () {
  return this.wrap($('<div>').addClass('io-ox-center')).parent()
}

$.txt = function (str) {
  return document.createTextNode(str !== undefined ? str : '')
}

// stupid counter to get new z-index
let z = 1000
$.zIndex = () => z++

$.svg = function ({ src, width = 16, height = 16, finalize = _.identity, role } = {}) {
  if (!src) return
  const $svg = getSVG(width, height, role)
  const cached = svgCache[src]
  const cssWidth = width === 16 ? null : width
  if (cached) return finalize($svg.html(cached).css('width', cssWidth))
  fetch(src)
    .then(response => {
      if (!response.ok) throw new Error(`Could not load SVG "${src}"`)
      return response
    })
    .then(response => response.text())
    .then(svg => {
      const content = $(svg).html()
      svgCache[src] = content
      finalize($svg.html(content))
    })
    .catch(error => {
    // debugging
      console.error(error)
    })
  return $svg.css('width', cssWidth)
}

function getSVG (width = 16, height = 16, role = 'img') {
  return $(`<svg role="${role}" viewBox="0 0 ${width} ${height}" fill="currentColor">`)
}

// to avoid flicker
const svgCache = {}

$.fn.scrollable = function () {
  return $('<div class="scrollable-pane">').appendTo(this.addClass('scrollable'))
}

$.alert = function (o) {
  o = _.extend({
    title: false,
    message: false,
    classes: 'alert-danger',
    dismissable: false
  }, o)

  const alert = $('<div class="alert fade in">')
    .addClass(o.classes)
    .addClass(o.dismissable ? 'alert-dismissable' : '')

  if (o.dismissable) {
    alert.append(
      $('<button type="button" class="close" data-dismiss="alert">').append(
        $('<span aria-hidden="true">&times;</span>'),
        $('<span class="sr-only">Close</span>')
      )
    )
  }

  if (o.title) {
    alert.append(
      $('<h4 class="alert-heading">').text(o.title)
    )
  }

  if (o.message) {
    alert.append(
      $('<p>').text(o.message)
    )
  }

  return alert.alert()
};

//
// Queued image loader. Works with lazyload.
//
(function () {
  // need to do this manually because jQuery doesn't support request.responseType = 'blob';
  function xhr (def, url) {
    let request = new XMLHttpRequest()

    function cleanup () {
      request = request.onload = request.onerror = def = null
    }

    request.onload = function () {
      if (request.status === 200) def.resolve(request.response); else def.reject()
      cleanup()
    }

    request.onerror = function () {
      def.reject()
      cleanup()
    }

    request.open('GET', url, true)
    request.responseType = 'blob'
    request.send(null)
  }

  const queue = []; let pending = 0; const MAX = 4

  function tick () {
    if (!queue.length || pending > MAX) return
    const item = queue.shift()
    pending++
    xhr(item.def, item.url)
  }

  function load (url) {
    const def = $.Deferred()
    queue.push({ def, url })
    tick()
    return def.promise().always(function () {
      pending--
      tick()
    })
  }

  $.fn.queueload = function (options) {
    return this.lazyload(options).each(function () {
      // re-define appear; we use "one" to try only once (don't need to track via this.loaded)
      $(this).off('appear').one('appear', function () {
        const $self = $(this); const original = $self.attr('data-original')
        load(original).then(
          function success (response) {
            const url = window.URL.createObjectURL(response)
            if ($self.is('img')) $self.attr('src', url); else $self.css('background-image', `url("${url}")`)
            $self.trigger('queue:load', original, url)
          },
          function fail () {
            $self.trigger('queue:error', original)
          }
        )
      })
    })
  }
}())
