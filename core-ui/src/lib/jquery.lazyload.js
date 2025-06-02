import $ from 'jquery'
import _ from '@/underscore'

$.fn.lazyload = function (options) {
  options = options || {}
  const fn = applyLazyload.bind($(this).addClass('lazyload'), options)
  this.each(function () {
    if (options.immediate) fn(); else _.defer(fn)
  })
  return this
}

// this avoid delay/flickering because the scrollpane is given
$.fn.fastlazyload = function ($scrollpane) {
  const viewport = getViewport($scrollpane)
  this.each(function () {
    setTimeout(function (el) {
      // get offset for each element
      const $el = $(el).addClass('lazyload'); const offset = el.getBoundingClientRect()
      // checks
      if (aboveViewport(viewport, offset, $el.height())) return
      if (leftOfViewport(viewport, offset, $el.width())) return
      // we assume that elements are in order, i.e. we can stop the loop if we are below or right of the viewport
      if (belowViewport(viewport, offset) || rightOfViewport(viewport, offset)) return false
      // otherwise
      $el.trigger('appear')
    }, 0, this)
  })
  return this
}

function applyLazyload (options) {
  // needs to be added to the node temporary. Otherwise every lazylod uses the first option passed
  if (options.previewUrl) {
    this[0].previewUrl = options.previewUrl
    delete options.previewUrl
  }
  // look for potential scrollpane
  (options.container || this.closest('.scrollpane, .scrollable, .tt-dropdown-menu'))
    .lazyloadScrollpane(options)
    .trigger('scroll')
}

// array of active scrollpanes to check if window event 'resize.lazyload' can be removed
const activeScrollpanes = []
// no need to call this directly
$.fn.lazyloadScrollpane = function (options) {
  // don't add twice
  if (this.prop('lazyload')) return this
  this.prop('lazyload', true)

  let scrollpane = this; let viewport
  options = _.extend({ effect: 'show' }, options)

  function lazyload () {
    // skip if already loaded
    if (this.loaded) return
    // get offset for each element
    const element = $(this); const offset = this.getBoundingClientRect()
    // checks
    if (aboveViewport(viewport, offset, element.height())) return
    if (leftOfViewport(viewport, offset, element.width())) return
    // we assume that elements are in order, i.e. we can stop the loop if we are below or right of the viewport
    if (belowViewport(viewport, offset) || rightOfViewport(viewport, offset)) return false
    // otherwise
    element.trigger('appear')
    _.defer(onAppear.bind(this, options))
  }

  function update () {
    // might be disposed
    if (!scrollpane || scrollpane.length === 0) return
    // get viewport dimensions once
    viewport = getViewport(scrollpane)
    // loop over all elements with class="lazyload"
    scrollpane.find('.lazyload').each(lazyload)
    // find .lazyload elements also in shadow dom
    scrollpane.find('.shadow-root-container').each(function () {
      $(this.shadowRoot).find('.lazyload').each(lazyload)
    })
  }

  // respond to resize event; some elements might become visible
  $(window).on('resize.lazyload', _.debounce(update, 100))
  activeScrollpanes.push(scrollpane)

  this.on({
    // response to add.lazyload event
    'add.lazyload': _.debounce(update, 10),
    // update on scroll stop
    'scroll.lazyload': _.debounce(update, 200),
    // clean up on dispose
    dispose () {
      activeScrollpanes.splice(activeScrollpanes.indexOf(scrollpane), 1)
      if (activeScrollpanes.length) return
      $(window).off('resize.lazyload')
      $(this).off('add.lazyload scroll.lazyload')
      scrollpane = options = null
    }
  })

  return this
}

// central appear event

function onAppear (options) {
  if (this.loaded) return

  let node = $(this).removeClass('lazyload')
  const createImg = function () {
    $('<img>').on({
      load () {
        const original = node.attr('data-original')

        if (options.effect !== 'show') node.hide()

        if (node.is('img')) {
          node.attr('src', original)
        } else {
          node.css('background-image', 'url("' + original + '")')
        }

        // show / fade-in
        node[options.effect]()
        node.prop('loaded', true)

        node.trigger('load.lazyload', this, options)
        $(this).off()
        node = options = null
      },
      error () {
        node.trigger('error.lazyload', this, options)
        $(this).off()
        node = options = null
      }
    })
      .attr('src', node.attr('data-original'))
  }
  // it makes sense to fetc preview urls here because it uses canvasresize. This may put too heavy load an cpu and memory otherwise
  if (this.previewUrl) {
    const self = this
    node.busy({ immediate: true })
    this.previewUrl().then(function (url) {
      node.idle()
      node.attr('data-original', url)
      delete self.previewUrl
      createImg()
    })
  } else {
    createImg()
  }
}

// helper

function getViewport (scrollpane) {
  const offset = scrollpane.offset()
  return {
    top: offset.top,
    right: offset.left + scrollpane.width(),
    bottom: offset.top + scrollpane.height(),
    left: offset.left
  }
}

function belowViewport (viewport, offset) {
  return viewport.bottom <= offset.top
}

function rightOfViewport (viewport, offset) {
  return viewport.right <= offset.left
}

function aboveViewport (viewport, offset, height) {
  return viewport.top >= offset.top + height
}

function leftOfViewport (viewport, offset, width) {
  return viewport.left >= offset.left + width
}
