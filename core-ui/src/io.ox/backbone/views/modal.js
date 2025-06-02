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

import ExtensibleView from '@/io.ox/backbone/views/extensible'
import a11y from '@/io.ox/core/a11y'

import HelpLinkView from '@/io.ox/backbone/mini-views/helplink'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

//
// Modal Dialog View
//
// options:
// - async: call busy() instead of close() when invoking an action (except "cancel")
// - backdrop: include a backdrop element - default is 'static': backdrop is rendered but non-clickable,
//       see http://getbootstrap.com/javascript/#modals-options
// - enter: this action is triggered on <enter>
// - focus: set initial focus on this element
// - help: link to online help article
// - keyboard: close popup on <escape>
// - maximize: popup uses full height; if given as number maximize but use that limit (useful on large screens)
// - point: extension point id to render content
// - title: dialog title
// - width: dialog width

const ModalDialogView = ExtensibleView.extend({

  className: 'modal flex',

  events: {
    'click .modal-footer [data-action]': 'onAction',
    'keydown input:text, input:password': 'onKeypress',
    keydown: 'onKeydown'
  },

  // we use the constructor here not to collide with initialize()
  constructor: function (options) {
    // ensure options
    options = _.extend({
      async: false,
      autoClose: true,
      context: {},
      keyboard: true,
      maximize: false,
      smartphoneInputFocus: false,
      autoFocusOnIdle: true
    }, options)
    // ensure correct width on smartphone
    if (_.device('smartphone') && options.width >= 320) options.width = '85%'
    this.context = options.context
    // the original constructor will call initialize()
    ExtensibleView.prototype.constructor.apply(this, arguments)
    this.autoFocusOnIdle = options.autoFocusOnIdle
    // add structure now
    const titleId = _.uniqueId('title')
    this.$el
      .toggleClass('maximize', !!options.maximize)
      // tabindex -1 is needed here because bootstrap event handling tries to focus the dialog. We would lose focus if a user clicks on the backdrop otherwise.
      .attr({ role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, tabindex: -1 })
      .append(
        $('<div class="modal-dialog" role="document">').width(options.width).append(
          $('<div class="modal-content">').append(
            this.$header = $('<div class="modal-header">').append(
              this.$title = $('<h1 class="modal-title">').attr('id', titleId).text(options.title || '\u00A0')
            ),
            this.$body = $('<div class="modal-body">'),
            this.$footer = $('<div class="modal-footer">')
          )
        )
      )
    // ensure proper context for the following functions to simplify callback handling
    this.close = close.bind(this)
    this.busy = busy.bind(this)
    this.idle = idle.bind(this)
    // when clicking next to the popup the modal dialog only hides by default. Remove it fully instead, causes some issues otherwise.
    this.$el.on('hidden.bs.modal', this.close)
    // apply max height if maximize is given as number or string
    if (_.isNumber(options.maximize) || _.isString(options.maximize)) this.$('.modal-content').css('max-height', options.maximize)
    // add help icon?
    if (options.help) {
      const helpPlaceholder = $('<a class="io-ox-context-help">')
      this.$header.append(helpPlaceholder)
      const parent = helpPlaceholder.parent()
      parent.addClass('help')
      helpPlaceholder.replaceWith(
        new HelpLinkView({ href: options.help, modal: true }).render().$el
      )
    }

    if (options.description) this.addDescription(options)

    // scroll inputs into view when smartphone keyboard shows up
    if (_.device('smartphone') && options.smartphoneInputFocus) {
      // make sure scrolling actually works
      this.$el.find('.modal-content').css('overflow-y', 'auto')
      this.listenToDOM(window, 'resize', this.scrollToInput)
    }

    // track focusin
    // keep focus is a prototype function and all listeners will be removed from document with off
    // make it unique by binding to this
    this.keepFocus = this.keepFocus.bind(this)
    this.listenToDOM(document, 'focusin', this.keepFocus)
  },

  scrollToInput () {
    if ($(document.activeElement).filter('input[type="email"],input[type="text"],textarea').length === 1) {
      document.activeElement.scrollIntoView()
    }
  },

  keepFocus (e) {
    const target = $(e.target)
    // if child is target of this dialog, event handling is done by bootstrap
    if (this.$el.has(target).length) return

    // we have to consider that two popups might be open
    // so we cannot just refocus the current popup
    const isPopup = $(e.target).closest('.io-ox-dialog-popup, .detail-popup, .mce-window, .date-picker').length > 0
    // should not keep focus if smart dropdown is open
    const smartDropdown = $('body > .smart-dropdown-container').length > 0
    // should not keep focus if tox dialog of tinymce plugin is open
    const toxDialog = $('body > .tox').length > 0

    // stop immediate propagation to prevent bootstrap modal event listener from getting the focus
    if (isPopup || smartDropdown || toxDialog) {
      e.stopImmediatePropagation()
    }
  },

  checkExtensions () {
    const self = this
    // check extension requirements
    this.point.each(function (extension) {
      // support functions and booleans
      if (_.isFunction(extension.requires)) self.point.toggle(extension.id, !!extension.requires(self.model))
      if (_.isBoolean(extension.requires)) self.point.toggle(extension.id, extension.requires)
    })
  },

  render () {
    this.checkExtensions()
    return this.invoke('render', this.$body)
  },

  open () {
    const self = this
    const { backdrop = 'static', previousFocus, render = true } = this.options
    if (render) this.render().$el.appendTo('body')
    // remember previous focus
    // set to false to disable automatic focus restore
    this.previousFocus = typeof previousFocus !== 'undefined' ? previousFocus : $(document.activeElement)
    if (_.device('smartphone')) {
      // rebuild button section for mobile devices
      this.$el.addClass('mobile-dialog')
      this.$footer.rowfluid = $('<div class="row">')
      this.$footer.append(this.$footer.rowfluid)
      this.$buttons = this.$footer.find('button,a.btn')
      _.each(this.$buttons, function (buttonNode) {
        self.$footer.rowfluid.prepend($(buttonNode).addClass('btn-medium'))
        $(buttonNode).wrap('<div class="col-xs-12 col-md-3">')
      })
      if (backdrop) {
        // Update theme (meta tag) for consistent looks for themed mobile browser
        const themeMetaElement = document.getElementsByTagName('META').namedItem('theme-color')
        const themeColor = themeMetaElement.content
        this.themeColor = themeColor
        // works as long as there is only one mobile theme
        themeMetaElement.content = 'rgb(126, 126, 126)'
      }
    }

    this.trigger('before:open')
    // keyboard: false to support preventDefault on escape key
    this.$el.modal({ backdrop, keyboard: false }).modal('show')
    this.trigger('open')
    this.setFocus(this.options)
    // track open instances
    open.add(this)
    return this
  },

  setFocus (o) {
    function select (elem) {
      if (o.select !== false && elem.select) {
        elem.select()
      }
    }

    const self = this
    // set initial focus
    if (o.focus) {
      const elem = this.$(o.focus)
      if (elem.length) {
        // dialog might be busy, i.e. elements are invisible so focus() might not work
        this.activeElement = elem[0]
        elem[0].focus()
        select(elem[0])
      }
    } else {
      // Defer focus handling and then try to focus in following order:
      // 1: First tabbable element in modal body
      // 2: Primary button in footer
      // 3: First tabbable element in footer
      _.defer(function () {
        if (self.disposed) return
        self.$el.toggleClass('compact', self.$body.is(':empty'))
        let focusNode = a11y.getTabbable(self.$body).first()
        if (focusNode.length === 0) focusNode = self.$footer.find('.btn-primary')
        if (focusNode.length === 0) focusNode = a11y.getTabbable(self.$footer).first()
        if (focusNode.length !== 0) {
          focusNode.focus()
          select(focusNode)
        }
      })
    }
  },

  disableFormElements () {
    // function may not be run 2 times in a row, "disabled" marker class would be applied to every input, therefore keep track of it
    if (this.formElementsDisabled) return
    this.formElementsDisabled = true

    // disable all form elements; mark already disabled elements via CSS class
    this.$(':input').each(function () {
      if ($(this).attr('data-action') === 'cancel' || $(this).attr('data-state') === 'manual') return
      $(this).toggleClass('disabled', $(this).prop('disabled')).prop('disabled', true)
    })
  },

  enableFormElements () {
    this.formElementsDisabled = false
    // enable all form elements
    this.$(':input').each(function () {
      if ($(this).attr('data-state') === 'manual') return
      // input elements that have the "disabled" class, were already disabled when disableFormElements was called. Leave them disabled to recreate the previous state and remove the marker class.
      if ($(this).hasClass('disabled')) {
        $(this).removeClass('disabled')
        return
      }
      $(this).prop('disabled', false)
    })
  },

  hideBody () {
    this.$('.modal-body').hide()
    this.$('.modal-footer').css('border-top', 0)
    return this
  },

  hideFooter () {
    this.$('.modal-footer').hide()
    return this
  },

  showFooter () {
    this.$('.modal-footer').show()
    return this
  },

  // Add a button
  //
  // options:
  // - placement: 'left' or 'right' (default)
  // - className: 'btn-primary' (default) or 'btn-default'
  // - label: Button label
  // - action: Button action
  //
  addButton (options) {
    const o = _.extend({ placement: 'right', className: 'btn-primary', label: gt('Close'), action: 'cancel', disabled: false, icon: '' }, options)
    const left = o.placement === 'left'; const fn = left ? 'prepend' : 'append'
    if (left) o.className += ' pull-left'
    this.$footer[fn](
      $('<button type="button" class="btn">')
        .addClass(o.className)
        .attr('data-action', o.action)
        .prop('disabled', o.disabled)
        .text(o.label)
        .prepend(o.icon ? createIcon(o.icon).addClass('me-8') : $())
    )
    return this
  },

  addDescription (options) {
    if (!options.description) return this
    const id = _.uniqueId('modal-description-')
    const node = $('<div>').attr('id', id)
    if (typeof options.description === 'object') node.append(options.description)
    else node.text(options.description)
    this.$el.attr('aria-describedby', id)
    this.$body.prepend(node)
    return this
  },

  // special button (a with href and download attribute)
  // needed for downloads in safari to prevent the Frame load interrupted error
  addDownloadButton (options) {
    const o = _.extend({ placement: 'right', className: 'btn-primary', label: gt('Download'), action: 'cancel', href: '#' }, options)
    const left = o.placement === 'left'; const fn = left ? 'prepend' : 'append'
    if (left) o.className += ' pull-left'
    this.$footer[fn](
      $('<a role="button" class="btn">')
        .addClass(o.className)
        .attr({
          'data-action': o.action,
          href: o.href,
          download: 'download'
        })
        .text(o.label)
    )
    return this
  },

  addCloseButton () {
    return this.addButton()
  },

  addCancelButton (options) {
    options = options || {}
    const data = { className: 'btn-default', label: gt('Cancel') }
    if (options.left) data.placement = 'left'
    return this.addButton(data)
  },

  addAlternativeButton (options) {
    return this.addButton(
      _.extend({ placement: 'left', className: 'btn-default', label: 'Alt', action: 'alt' }, options)
    )
  },

  addCheckbox (options) {
    const o = _.extend({ className: 'pull-left' }, options)
    const id = _.uniqueId('custom-')
    this.$footer.prepend(
      $('<div class="checkbox custom">').append(
        $('<label>').attr('for', id).prepend(
          $('<input type="checkbox" class="sr-only">')
            .attr({ id, name: o.action })
            .prop('checked', o.status),
          $('<i class="toggle" aria-hidden="true">'),
          $.txt(o.label || '\u00a0')
        )
      )
        .addClass(o.className)
    )
    return this
  },

  onAction (e) {
    this.invokeAction($(e.currentTarget).attr('data-action'))
  },

  invokeAction (action) {
    // if async we need to make the dialog busy before we trigger the action
    // otherwise we cannot idle the dialog in the action listener
    if (this.options.async && action !== 'cancel') this.busy()
    this.trigger(action)
    // for general event listeners
    this.trigger('action', action)
    // check if already disposed/closed by the action
    if (this.disposed) return
    // check if this.options is there, if the dialog was closed in the handling of the action this.options is empty and we run into a js error otherwise
    if ((this.options && !this.options.async && this.options.autoClose !== false) || action === 'cancel') this.close()
  },

  onKeypress (e) {
    if (e.which !== 13) return
    if (!this.options.enter) return
    if (!$(e.target).is('input:text, input:password')) return
    e.preventDefault()
    this.invokeAction(this.options.enter)
  },

  onKeydown (e) {
    this.onEscape(e)
    this.onTab(e)
  },

  onEscape (e) {
    if (e.which !== 27) return
    if (e.isDefaultPrevented()) return
    // prevent other event listeners, eg. on tree views. See OXUI-1157
    e.stopImmediatePropagation()
    if (this.$footer.find('[data-action="cancel"]').length > 0) this.invokeAction('cancel')
    else this.close()
  },

  onTab (e) {
    if (e.which !== 9) return
    a11y.trapFocus(this.$el, e)
  },

  // hide dialog without disposing it
  pause () {
    $(document).off('focusin', this.keepFocus)
    togglePause.call(this, false)
    // use disableFormElements here, so when resuming, the correct disabled status can be set again (resume -> idle -> enableFormElements needs the correct marker classes)
    this.disableFormElements()
    this.trigger('pause')
  },

  resume () {
    $(document).on('focusin', this.keepFocus)
    togglePause.call(this, true)
    // add marker class again(needed by yells for example)
    $(document.body).addClass('modal-open')
    this.idle()
    this.trigger('resume')
  }
})

function togglePause (visible = true) {
  if (this.options.keepWhenPaused) {
    this.$el.toggleClass('modal-paused', !visible)
    this.$('.modal-content').attr('aria-hidden', !visible)
  } else {
    // we use a class to better identify hidden modals
    this.$el.toggleClass('hidden', !visible)
  }
  const suffix = visible ? 'hidden' : 'visible'
  this.$el[this.options.render !== false ? 'next' : 'prev'](`.modal-backdrop.in:${suffix}`).toggle(visible)
}

function close (e, options) {
  if (!this.$el) return

  this.trigger('before:close')
  // stop listening to hidden event (avoid infinite loops)
  this.$el.off('hidden.bs.modal')
  if (!e || e.type !== 'hidden') this.$el.modal('hide')
  this.trigger('close')
  const previousFocus = this.previousFocus
  if (_.device('smartphone') && this.themeColor) {
    document.getElementsByTagName('META').namedItem('theme-color').content = this.themeColor
  }
  this.$el.remove()
  open.remove(this, options)

  if (previousFocus) previousFocus.focus()

  return this
}

function busy (withAnimation) {
  this.disableFormElements()
  this.activeElement = this.activeElement || document.activeElement
  if (withAnimation) {
    this.$body.addClass('invisible')
    this.$body.parent().busy()
  } else {
    this.$body.css('opacity', 0.50)
  }
  this.$el.focus()
  return this
}

function idle () {
  this.enableFormElements()
  this.$body.parent().idle()
  this.$body.removeClass('invisible').css('opacity', '')
  if (this.autoFocusOnIdle) {
    // try to restore focus (active element is stored in busy function)
    if ($.contains(this.el, this.activeElement)) {
      $(this.activeElement).focus()
      // fallback, to keep focus in the dialog
    } else this.setFocus(this.options)
  }
  this.activeElement = null
  return this
}

document.addEventListener('DOMContentLoaded', (event) => {
  // overwrite enforceFocus so that wizards (ie. guided tours and guard) can receive and keep (!) focus
  // see eg.
  // https://gist.github.com/Reinmar/b9df3f30a05786511a42#ckeditor-inside-bootstrap-modals
  // https://github.com/twbs/bootstrap/issues/6996
  $.fn.modal.Constructor.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', e => {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length && !$(e.target).closest('.wizard-container').length) {
          this.$element.trigger('focus')
        }
      })
  }
})

// track open instances
const open = {

  queue: [],

  add (dialog) {
    if (this.queue.indexOf(dialog) > -1) return
    if (this.queue.length) _(this.queue).last().pause()
    this.queue.push(dialog)
  },

  remove (dialog, options) {
    if (options && options.resetDialogQueue) this.queue = []
    this.queue = _(this.queue).without(dialog)
    if (this.queue.length) _(this.queue).last().resume()
  }
}

export const openModals = open

export default ModalDialogView
