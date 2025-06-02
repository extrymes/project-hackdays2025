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
import hotspot from '@/io.ox/core/tk/hotspot'
import 'velocity-animate'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const overlays = [
  $('<div class="wizard-overlay abs">'),
  $('<div class="wizard-overlay abs">'),
  $('<div class="wizard-overlay abs">'),
  $('<div class="wizard-overlay abs">'),
  $('<div class="wizard-overlay wizard-spotlight abs">')
]

const backdrop = $('<div class="wizard-backdrop abs">')

function getBounds (elem, padding) {
  padding = padding || 0
  const o = elem.offset()
  o.width = elem.outerWidth() + padding * 2
  o.height = elem.outerHeight() + padding * 2
  o.availableWidth = $(window).width()
  o.availableHeight = $(window).height()
  o.right = o.availableWidth - o.width - o.left + padding
  o.bottom = o.availableHeight - o.height - o.top + padding
  o.top -= padding
  o.left -= padding
  return o
}

function append (type) {
  return function () {
    const target = this.$(type)
    target.append.apply(target, arguments)
    return this
  }
}

function addControl (html) {
  return function (node, options) {
    node.append(
      $(html)
        .attr('data-action', options.action)
        .addClass(options.className)
        .text(options.label || '\u0A00')
    )
    return this
  }
}

// resolves strings, DOM node, or jQuery instances
// (returns either a valid jQuery collection with one element, or null)
function resolveSelector (selector) {
  selector = $(selector).filter(':visible')
  return selector.length ? selector.first() : null
}

// align automatically

//
// Wizard/Tour
//

function Wizard (options) {
  this.options = options || {}
  this.currentStep = 0
  this.steps = []
  this.closed = false

  // ensure model
  this.options.model = this.options.model || new Backbone.Model()

  // add event hub
  _.extend(this, Backbone.Events)

  this.on({
    'step:next': this.next,
    'step:back': this.back,
    'step:close': this.close,
    'step:done': this.close
  })

  // remove all overlays and backdrop if a step gets hidden
  this.on('step:hide', function () {
    _(overlays).invoke('detach')
    backdrop.detach()
    hotspot.removeAll()
  })

  this.containerScaffold = _.device('smartphone') && !this.options.disableMobileSupport
  // special node for fullscreen wizards on smartphone
    ? $(
      '<div class="wizard-container abs">' +
                '  <div class="wizard-navbar">' +
                '    <div class="wizard-back"></div>' +
                '    <div class="wizard-title"></div>' +
                '    <div class="wizard-next"></div>' +
                '  </div>' +
                '  <div class="wizard-pages"></div>' +
                '  <div class="wizard-animation"></div>' +
                '</div>'
    )
  // simple container on desktop for flex layout
    : $('<div class="wizard-container abs">')

  this.container = this.containerScaffold.clone()
  if (_.device('smartphone') && !this.options.disableMobileSupport) initializeSmartphoneSupport.call(this)
}

_.extend(Wizard.prototype, {

  step (options) {
    const step = new Step(options, this)
    this.steps.push(step)
    return step
  },

  getCurrentStep () {
    return this.steps[this.currentStep]
  },

  withCurrentStep (callback) {
    const step = this.getCurrentStep()
    if (step) callback.call(this, step)
    return this
  },

  setCurrentStep (n) {
    if (this.currentStep === n) return
    if (n < 0 || n >= this.steps.length) return
    this.currentStep = n
    this.trigger('change:step')
  },

  get (num) {
    return this.steps[num]
  },

  getContainer () {
    return this.container
  },

  shift (num) {
    this.withCurrentStep(function (step) {
      step.hide()
    })
    if (this.isInvalidShift(num)) {
      this.trigger('skip:step')
      return this.shift(num < 0 ? num - 1 : num + 1)
    }
    this.setCurrentStep(this.currentStep + num)
    this.withCurrentStep(function (step) {
      step.show()
    })
  },

  next () {
    if (this.hasNext()) this.shift(+1)
    return this
  },

  back () {
    if (this.hasBack()) this.shift(-1)
    return this
  },

  hasNext () {
    return this.currentStep < (this.steps.length - 1)
  },

  hasBack () {
    return this.currentStep > 0
  },

  close () {
    // don't close twice
    if (this.closed) return
    this.trigger('before:stop')
    this.withCurrentStep(function (step) {
      step.hide()
    })
    _(this.steps).each(function (step) {
      step.dispose()
    })
    this.container.remove().empty()

    this.steps = []
    this.container = null
    // done
    this.trigger('stop')
    this.off()
    this.closed = true
    $('body').removeClass('wizard-open')
    return this
  },

  isInvalidShift (num) {
    // corresponding step value already set
    const index = this.currentStep + (num || 0)
    const step = this.get(index)
    if (!step) return false
    // last on is always valid
    if (index === this.steps.length - 1) return false
    return step.hasValue()
  },

  isStepPaused () {
    const num = this.currentStep
    const disabled = this.options.model.get('paused') || []
    return disabled.indexOf(num) > -1
  },

  start () {
    if (_.device('smartphone') && !this.options.disableMobileSupport) {
      this.trigger('before:start')
      _(this.steps).invoke('show')
      this.container.appendTo('body')
      this.withCurrentStep(function (step) {
        step.renderNavBar()
      })
      this.trigger('start')
    } else {
      this.trigger('before:start')
      this.container.appendTo('body')
      this.showFirst()
      this.trigger('start')
    }
    // needed to stop dropdowns from closing
    $('body').addClass('wizard-open')
    // for debugging
    window.wizard = this

    return this
  },

  showFirst () {
    this.currentStep = 0
    this.shift(0)
  },

  spotlight (selector, options) {
    if (!selector) return
    // allow dynamic selectors
    if (_.isFunction(selector)) {
      selector = selector()
    }
    const elem = $(selector).filter(':visible')
    if (!elem.length) return
    const bounds = getBounds(elem, options ? options.padding : 0)
    // apply positions (top, right, bottom, left)
    overlays[0].css({ width: bounds.left, right: 'auto' })
    overlays[1].css({ left: bounds.left, height: bounds.top, bottom: 'auto' })
    overlays[2].css({ left: bounds.left + bounds.width, top: bounds.top })
    overlays[3].css({ left: bounds.left, top: bounds.top + bounds.height, right: bounds.right })
    overlays[4].css(_(bounds).pick('top', 'right', 'bottom', 'left'))
    $('body').append(overlays)
  },

  toggleBackdrop (state, color) {
    backdrop.css('backgroundColor', color || '')
    $('body').append(backdrop.toggle(!!state))
  }
})

//
// Wizard/Tour step
//

const Step = DisposableView.extend({

  className: 'wizard-step center middle',

  events: {
    'click [data-action]': 'onAction',
    keydown: 'onKeyDown',
    keyup: 'onKeyUp'
  },

  onAction (e) {
    e.preventDefault()
    const action = $(e.currentTarget).attr('data-action')
    e.stopImmediatePropagation()
    this.trigger(action)
  },

  onKeyDown (e) {
    // focus trap; wizard/tour steps are generally modal (even if not visually)
    if (e.which !== 9 || !this.$el.is(':visible')) return
    // get focusable items
    const items = this.$('button[tabindex!="-1"][disabled!="disabled"]:visible')
    const first = e.shiftKey && document.activeElement === items.get(0)
    const last = !e.shiftKey && document.activeElement === items.get(-1)
    if (first || last) {
      e.preventDefault()
      items.get(first ? -1 : 0).focus()
    }
  },

  onKeyUp (e) {
    function isInput (e) {
      return $(e.target).is('input, textarea, select')
    }
    switch (e.which) {
      // check if "close" button exists
      case 27: if (this.$el.find('.wizard-close').length) this.trigger('close'); break
        // check if "back" button is enabled and available
      case 37: if (!isInput(e) && this.$el.find('[data-action="back"]:enabled').length) this.trigger('back'); break
        // check if "next" button is enabled and available
      case 39: if (!isInput(e) && this.$el.find('[data-action="next"]:enabled').length) this.trigger('next'); break
                // no default
    }
  },

  initialize (options, parent) {
    this.parent = parent

    this.options = _.extend({
      id: undefined,
      // general
      modal: true,
      focusWatcher: true,
      // buttons
      back: true,
      next: true,
      enableBack: true,
      labelBack: gt('Back'),
      // #. finish the tour
      labelDone: gt.pgettext('tour', 'Finish'),
      // attributes
      attributes: {}

    }, options)

    // forward events
    this.on('all', function (type) {
      this.parent.trigger('step:' + type, this.parent.currentStep)
    })

    // custom css
    _(['width', 'minWidth']).each(function (type) {
      if (this.options[type]) this.$el.css(type, this.options[type])
    }, this)

    // navbar needs an update for every change
    // only once for normal popups
    if (!_.device('smartphone') && !this.options.disableMobileSupport) this.once('before:show', this.renderButtons)

    // custom attributes
    this.$el.attr(this.options.attributes)

    this.render()
  },

  // append to title element
  title: append('.wizard-title'),

  // append to content element
  content: append('.wizard-content'),

  // append to footer element
  footer: append('.wizard-footer'),

  getModel () {
    return this.parent.options.model
  },

  getId () {
    return this.options.id
  },

  setValue (value) {
    return this.getModel.set(this.getId(), value)
  },

  getValue () {
    return this.getModel().get(this.getId())
  },

  hasValue () {
    return this.getValue() !== undefined
  },

  // render scaffold
  render () {
    this.$el.attr({
      role: 'dialog',
      // as we have a focus trap (modal dialog) we use tabindex=1 in this case
      tabindex: -1,
      'aria-labelledby': 'dialog-title'
    })
      .append(
        $('<div role="document">').append(
          $('<div class="wizard-header">').append(
            $('<h1 class="wizard-title" id="dialog-title">'),
            $('<button type="button" class="wizard-close close" data-action="close">')
              .attr('aria-label', gt('Close'))
              .append(createIcon('bi/x.svg').attr('title', gt('Close')))
          ),
          $('<div class="wizard-content" id="dialog-content">'),
          $('<div class="wizard-footer">')
        )
      )
    return this
  },

  // render buttons; must be done just before 'show'
  // not with initial render() because we don't all steps at this point
  renderButtons () {
    const dir = this.getDirections()
    const footer = this.$('.wizard-footer').empty()

    // show step numbers
    if (this.parent.options.showStepNumbers) {
      footer.append($('<span class="wizard-step-number">').text((this.parent.currentStep + 1) + '/' + this.parent.steps.length))
    }
    // show "Back" button
    if (dir.back) this.addButton(footer, { action: 'back', className: 'btn-default', label: this.getLabelBack() })
    // show "Start" or Next" button
    if (dir.next) this.addButton(footer, { action: 'next', className: 'btn-primary', label: this.getLabelNext() })
    // show "Done" button
    if (dir.done) this.addButton(footer, { action: 'done', className: 'btn-primary', label: this.getLabelDone() })
  },

  // different solution for smartphones
  renderNavBar () {
    const dir = this.getDirections()
    const back = this.parent.container.find('.wizard-back').empty()
    const next = this.parent.container.find('.wizard-next').empty()

    // show "Back" button
    if (dir.back) this.addLink(back, { action: 'back', label: this.getLabelBack() })
    // show "Start" or Next" button
    if (dir.next) this.addLink(next, { action: 'next', label: this.getLabelNext() })
    // show "Done" button
    if (dir.done) this.addLink(next, { action: 'done', label: this.getLabelDone() })

    // states
    if (this.parent.isStepPaused()) this.toggleNext(false)
  },

  // internal; just add a button
  addButton: addControl('<button type="button" class="btn">'),

  // internal; just add a link
  addLink: addControl('<a href="#" role="button">'),

  getLabelNext () {
    // determine this button label at run-time
    // not during initialize() as the wizard is not yet complete
    if (this.options.labelNext === undefined) return this.isFirst() ? gt('Start tour') : gt('Next')
    return this.options.labelNext
  },

  getLabelBack () {
    return this.options.labelBack
  },

  getLabelDone () {
    return this.options.labelDone
  },

  // get description which buttons are available (back, next, done)
  getDirections () {
    return {
      back: this.options.back && this.parent.hasBack(),
      next: this.options.next && this.parent.hasNext(),
      done: this.options.next && this.isLast()
    }
  },

  // define that this step is mandatory
  // removes the '.close' icon; escape key no longer works
  mandatory () {
    this.$('.wizard-header .wizard-close').remove()
    return this
  },

  // enable/disable 'next' button
  toggleNext (state) {
    if (_.device('smartphone') && !this.options.disableMobileSupport) {
      return this.parent.container.find('[data-action="next"]').attr({
        disabled: !state,
        'aria-disabled': !state
      })
    }
    this.$('.btn[data-action="next"]').prop('disabled', !state)
    return this
  },

  // enable/disable 'back' button
  toggleBack (state) {
    this.$('.btn[data-action="back"]').prop('disabled', !state)
    return this
  },

  // returns true if the current step is the first one
  isFirst () {
    return this.parent.currentStep === 0
  },

  // returns true if the current step is the last one
  isLast () {
    return this.parent.currentStep === this.parent.steps.length - 1
  },

  // get current index of this step
  indexOf () {
    return _(this.parent.steps).indexOf(this)
  },

  // show this step
  // considers 'navigateTo' and 'waitFor' (both async)
  show: (function () {
    function navigateTo () {
      this.trigger('before:navigate')
      ox.launch(this.options.navigateTo.moduleCallback, this.options.navigateTo.options).then(function () {
        this.trigger('navigate')
        waitFor.call(this, 0)
      }.bind(this))
    }

    function waitFor (counter) {
      if (counter === 0) this.trigger('wait')
      // allow dynamic selectors
      if (_.isFunction(this.options.waitFor.selector)) {
        this.options.waitFor.selector = this.options.waitFor.selector()
      }
      if (resolveSelector(this.options.waitFor.selector)) return cont.call(this)
      const max = _.isNumber(this.options.waitFor.timeout) ? (this.options.waitFor.timeout * 10) : 50
      if (counter < max) {
        setTimeout(function () {
          if (this.disposed) return
          waitFor.call(this, counter + 1)
        }.bind(this), 100)
      } else {
        console.error('Step.show(). Stopped waiting for:', this.options.waitFor.selector)
        this.parent.close()
      }
    }

    function addHotspots () {
      _(this.options.hotspot).each(function (spot) {
        if (_.isString(spot)) spot = [spot, {}]
        hotspot.add(spot[0], spot[1] || {})
      }, this)
    }

    function cont () {
      // make invisible and add to DOM to allow proper alignment
      this.$el.addClass('invisible').appendTo(this.parent.container)

      // counter-event to "wait"
      this.trigger('ready')

      // auto-align
      this.align()
      $(window).on('resize.wizard-step', _.debounce(this.align.bind(this, null), 100))

      if (this.options.spotlight) {
        // apply spotlight
        this.parent.toggleBackdrop(false)
        this.parent.spotlight(this.options.spotlight.selector, this.options.spotlight.options)
        // respond to window resize
        $(window).on('resize.wizard.spotlight', _.debounce(function () {
          if (this.disposed) return
          this.parent.spotlight(this.options.spotlight.selector)
        }.bind(this), 100))
      } else {
        // toggle backdrop
        this.parent.toggleBackdrop(this.options.modal, this.options.backdropColor)
      }

      // show hotspot
      if (this.options.hotspot) {
        addHotspots.call(this)
      }

      // scroll?
      if (this.options.scrollIntoView) {
        const scroll = $(this.options.scrollIntoView)
        if (scroll.length) scroll.get(0).scrollIntoView()
      }

      // now, show and focus popup
      this.$el.removeClass('invisible').find('button[tabindex!="-1"][disabled!="disabled"]:visible:last').focus()

      // enable focus watcher?
      if (this.options.focusWatcher) {
        this.focusWatcher = setInterval(function () {
          if (this.disposed) return
          if (!$.contains(this.el, document.activeElement)) this.$el.find('button[tabindex!="-1"][disabled!="disabled"]:visible:last').focus()
        }.bind(this), 100)
      }

      this.trigger('show')
    }

    // no alignment, no spotlight, nothing to wait for
    function handleSmartphone () {
      this.$el
        .css('left', this.indexOf() * 100 + '%')
        .removeClass('center middle')
        .appendTo(this.parent.container.find('.wizard-pages'))
      this.trigger('show')
      return this
    }

    return function () {
      try {
        this.trigger('before:show')
      } catch (error) {
        console.error(error)
        return this.parent.close()
      }
      if (_.device('smartphone') && !this.options.disableMobileSupport) return handleSmartphone.call(this)

      this.parent.toggleBackdrop(true)

      if (this.options.navigateTo) navigateTo.call(this)
      else if (this.options.waitFor) waitFor.call(this, 0)
      else cont.call(this)

      return this
    }
  }()),

  // hide this step
  hide () {
    this.trigger('before:hide')
    if (!_.device('smartphone') || this.options.disableMobileSupport) {
      if (this.focusWatcher) clearInterval(this.focusWatcher)
      $(window).off('resize.wizard.spotlight resize.wizard.hotspot resize.wizard-step')
      this.$el.detach()
    }
    this.trigger('hide')
    return this
  },

  // set one-time callback for 'before:show' event
  beforeShow (callback) {
    this.once('before:show', callback)
    return this
  },

  // refer to given element; affects alignment
  // defined by selector (string or DOM element)
  referTo (selector, options) {
    this.options.referTo = { selector, options }
    return this
  },

  // spotlight on given element
  // defined by selector (string or DOM element)
  spotlight (selector, options) {
    this.options.spotlight = { selector, options }
    return this
  },

  // show hotspot
  hotspot (selector, options) {
    // allow dynamic selectors
    if (_.isFunction(selector)) {
      selector = selector()
    }
    this.options.hotspot = _.isArray(selector) ? selector : [[selector, options]]
    this.options.backdropColor = 'rgba(255, 255, 255, 0.01)'
    return this
  },

  // show backdrop
  modal (state) {
    this.options.modal = !!state
    return this
  },

  // set backdrop color
  backdrop (color) {
    this.options.backdropColor = color
    return this
  },

  // wait for element for be visible
  waitFor (selector, timeout) {
    this.options.waitFor = { selector, timeout }
    return this
  },

  // set 'navigateTo' option; defines which app to start
  navigateTo (moduleCallback = () => {}, options) {
    this.options.navigateTo = { moduleCallback, options }
    return this
  },

  // set 'scrollIntoView' option
  // this element will be scrolled into view when the step is shown
  scrollIntoView (selector) {
    this.options.scrollIntoView = selector
    return this
  },

  // auto-align popup (used internally)
  align (selector) {
    if (this.disposed) return

    // fall back to selector from referTo() or spotlight()
    if (!selector && this.options) {
      if (this.options.referTo) return this.align(this.options.referTo)
      if (this.options.spotlight) return this.align(this.options.spotlight.selector)
      return
    }

    // resolve target node from selector
    let elem, options
    if (_.isString(selector)) {
      elem = resolveSelector(selector)
    } else if (_.isObject(selector)) {
      elem = resolveSelector(selector.selector)
      options = selector.options
    }
    if (!elem) return

    const $el = this.$el
    const bounds = getBounds(elem); const popupWidth = $el.width(); const popupHeight = $el.height()

    if (this.options.noAutoAlign) {
      alignCenter()
      return
    }

    function setOffset (key, value, size, available) {
      value = Math.min(Math.max(16, value), available - size - 16)
      $el.css(key, value)
    }

    function setLeftOffset (value) {
      setOffset('left', value, popupWidth, bounds.availableWidth)
    }

    function setTopOffset (value) {
      setOffset('top', value, popupHeight, bounds.availableHeight)
    }

    // try to move the popup right of the selected node, return true on success
    function alignRight () {
      if ((bounds.left + bounds.width + popupWidth) < bounds.availableWidth) {
        setLeftOffset(bounds.left + bounds.width + 16)
        setTopOffset(bounds.top)
        return true
      }
    }

    // try to move the popup left of the selected node, return true on success
    function alignLeft () {
      if ((bounds.left - popupWidth) > 0) {
        setLeftOffset(bounds.left - popupWidth - 16)
        setTopOffset(bounds.top)
        return true
      }
    }

    // try to move the popup below the selected node, return true on success
    function alignBottom () {
      if ((bounds.top + bounds.height + popupHeight) < bounds.availableHeight) {
        setLeftOffset(bounds.left)
        setTopOffset(bounds.top + bounds.height + 16)
        return true
      }
    }

    // try to move the popup above the selected node, return true on success
    function alignTop () {
      if ((bounds.top - popupHeight) > 0) {
        setLeftOffset(bounds.left)
        setTopOffset(bounds.top - popupHeight - 16)
        return true
      }
    }

    // move the popup to the center of the screen
    function alignCenter () {
      $el.addClass('center middle').css({ top: '', right: '', bottom: '', left: '' })
    }

    // remove default class and reset all inline positions
    $el.removeClass('center middle').css({ top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' })

    // find the best position according to the passed options
    switch ((options && options.position) || 'right') {
      case 'right':
        if (!(alignRight() || alignBottom() || alignLeft() || alignTop())) alignCenter()
        break
      case 'left':
        if (!(alignLeft() || alignBottom() || alignRight() || alignTop())) alignCenter()
        break
      case 'bottom':
        if (!(alignBottom() || alignTop() || alignRight() || alignLeft())) alignCenter()
        break
      case 'top':
        if (!(alignTop() || alignBottom() || alignRight() || alignLeft())) alignCenter()
        break
      default:
        alignCenter()
    }

    this.trigger('align')

    return this
  },

  // little helper to allow long chains while constructing a wizard or a tour
  end () {
    return this.parent
  }
})

//
// Tour registry (based on a Backbone collection)
//

Wizard.registry = {

  collection: new Backbone.Collection(),

  add (options, callback) {
    options.run = callback
    const model = new Backbone.Model(options)
    this.collection.add(model)
    return model
  },

  get (id) {
    return this.collection.get(id)
  },

  list (type) {
    return type === undefined ? this.collection : this.collection.where({ type })
  },

  run (id) {
    const model = this.get(id)
    if (model) model.get('run')()
  }
}

//
// Special handling for smartphones
//

function initializeSmartphoneSupport () {
  this.container.find('.wizard-title').text(this.options.title || gt('Welcome'))

  this.container.on('click', '[data-action]', { parent: this }, function (e) {
    e.preventDefault()
    const action = $(this).attr('data-action')
    e.data.parent.trigger('step:' + action)
  })

  // update next buttons disable state
  this.options.model.on('change:paused', function () {
    const step = self.getCurrentStep()
    step.toggleNext(!self.isStepPaused())
  })

  // override shift for animation support
  this.shift = function (num) {
    this.setCurrentStep(this.currentStep + num)

    this.withCurrentStep(function (step) {
      step.renderNavBar()
    })

    const node = this.container.find('.wizard-pages')
    const current = node.position().left / width * 100
    const pct = 0 - this.currentStep * 100

    node.stop().velocity({ translateX: [pct + '%', current + '%'] }, 500, [150, 15])

    return this
  }

  // touch/swipe support
  const self = this
  let offset = 0
  let pageX = 0
  let x
  let moved
  let width
  let minX
  let maxX
  let onInput

  this.container.find('.wizard-pages').on({

    touchstart (e) {
      const touches = e.originalEvent.targetTouches
      if (touches.length !== 1) return

      // no swiping when on an inputfield (interferes with magnifying glass etc)
      if ($(e.target).is('input')) {
        onInput = true
        return
      }

      pageX = touches[0].pageX
      moved = false

      // get current window width to calculate percentages
      width = $(window).width()
      offset = $(this).position().left
      maxX = self.hasBack() ? +width : +width / 3
      minX = self.hasNext() ? -width : -width / 3
    },

    touchmove (e) {
      const touches = e.originalEvent.targetTouches
      if (touches.length !== 1) return

      // no swiping when on an inputfield (interferes with magnifying glass etc)
      if (onInput) return

      e.preventDefault()
      x = touches[0].pageX - pageX
      if (!moved) {
        if (Math.abs(x) < 20) return
        moved = true
        // reset pageX to avoid bumps
        pageX = touches[0].pageX
        x = 0
        return
      }
      x = Math.min(x, maxX)
      x = Math.max(x, minX)
      // paused?
      if (self.isStepPaused() && ((offset + x) / width * 100) < -100) return
      $(this).css('transform', 'translateX(' + ((offset + x) / width * 100) + '%)')
    },

    touchend () {
      onInput = false

      if (!moved) return
      const pct = x / width * 100
      // paused?
      if (self.isStepPaused() && pct < 0) return

      self.shift(pct < 0 ? (pct > -50 ? 0 : +1) : (pct < +50 ? 0 : -1))
    }
  })
}

export default Wizard
