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
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

const validType = /^(busy|error|info|success|warning|screenreader)$/

const durations = {
  busy: 10000,
  error: 30000,
  info: 10000,
  success: 4000,
  warning: 10000,
  screenreader: 5000
}

const ariaText = {
  error: gt('Error'),
  info: gt('Info'),
  success: gt('Success'),
  warning: gt('Warning')
}

const icons = {
  busy: 'bi/arrow-clockwise.svg',
  error: 'bi/exclamation-triangle.svg',
  info: 'bi/exclamation-lg.svg',
  success: 'bi/check-lg.svg',
  warning: 'bi/exclamation-lg.svg'
}

let timer = null

// Timer wrapping function to enable pausing
function Timer (callback, delay) {
  let id
  let start
  let remaining = delay

  this.pause = function () {
    window.clearTimeout(id)
    remaining -= new Date() - start
  }

  this.resume = function () {
    start = new Date()
    window.clearTimeout(id)
    id = window.setTimeout(callback, remaining)
  }

  this.clear = function () {
    window.clearTimeout(id)
  }

  this.resume()
}

function remove () {
  if (timer) timer.clear()
  $('.io-ox-alert').trigger('notification:removed').remove()
  $('body').off('.yell')
}

function click (e) {
  const alert = $('.io-ox-alert')
  if (alert.length === 0) return

  if (_.device('smartphone')) return remove()

  if (e.type === 'keydown') {
    // close on escape or enter and space on close button
    if ($(e.target).closest('[data-action="close"]').length || e.which === 27) {
      if (e.which === 13 || e.which === 32 || e.which === 27) return remove()
    }
    return
  }

  // close if clicked outside notifications
  if (!$.contains(alert.get(0), e.target)) return remove()

  // click on close?
  if ($(e.target).closest('[data-action="close"]').length) return remove()
}

function pause () {
  if (timer) timer.pause()
}

function resume () {
  if (timer) timer.resume()
}

function screenreaderMessage (message) {
  // this is for cross browser yells
  // please don't touch and see:
  // http://www.paciellogroup.com/blog/2012/06/html5-accessibility-chops-aria-rolealert-browser-support/
  const textCon = $('#sr-alert-text').removeAttr('role').attr('role', 'alert')
  const textNode = $.txt(message)

  // cleanup text nodes
  textCon
    .contents()
    .filter(function () {
      return this.nodeType === 3 // Node.TEXT_NODE
    }).remove()

  $('#io-ox-alert-screenreader').css('clip', 'auto')

  textCon.append(textNode).hide().css('display', 'inline')
}

function yell (type, message, focus) {
  if (type === 'destroy' || type === 'close') return remove()

  let o = {
    duration: 0,
    focus: false,
    type: 'info',
    closeOnClick: true
  }
  // there is a special yell for displaying conflicts for filestorage correctly
  let useConflictsView = false
  const conflicts = { warnings: [] }

  if (_.isObject(type)) {
    // catch server error?
    if ('error' in type) {
      ox.trigger('yell:error', type)
      // find possible conflicts with filestorage and offer a dialog to display all conflicts
      if (type.categories === 'CONFLICT' && (type.code === 'FILE_STORAGE-0045' || type.code === 'FLD-1038')) {
        useConflictsView = true
        o.type = 'error'
        if (!conflicts.title) {
          conflicts.title = type.error
        }
        conflicts.warnings.push(type.warnings.error)
      } else if (type.handled === true) {
        // special flag to indicate this error has already been handled
        return
      } else {
        o.type = 'error'
        o.message = type.message || type.error
        o.headline = gt('Error')
      }
    } else {
      o = _.extend(o, type)
    }
  } else {
    o.type = type || 'info'
    o.message = message
    o.focus = focus
  }

  // add message
  if (!validType.test(o.type)) return

  let alert = []
  // screen reader only messages can be much simpler and don't need styling or formatting (audio only)
  if (o.type === 'screenreader') {
    return screenreaderMessage(o.message)
  } else if (useConflictsView) {
    import('@/io.ox/core/tk/filestorageUtil').then(function ({ default: filestorageUtil }) {
      filestorageUtil.displayConflicts(conflicts)
    })
  } else {
    // avoid empty yells
    if (!o.message) return

    if (timer) timer.clear()
    timer = o.duration === -1 ? null : new Timer(remove, o.duration || durations[o.type] || 5000)
    // replace existing alert?
    alert = $('.io-ox-alert')
    // prevent double binding
    // we can not use an event listener that always listens. Otherwise we might run into opening clicks and close our notifications, when they should not. See Bug 34339
    // not using click here, since that sometimes shows odd behavior (clicking, then binding then listener -> listener runs code although it should not)
    $('body').off('.yell')

    // closeOnClick: whether the yell is closed on the following events
    if (o.closeOnClick) {
      _.defer(function () {
        // use defer not to run into drag&drop
        $('body').on('mousedown.yell keydown.yell', click)
      })
    }

    const node = $('<div tabindex="-1" class="io-ox-alert">').addClass('io-ox-alert-' + o.type)
    let content; let text

    if (o.message instanceof $) {
      content = o.message
      text = content.text()
    } else {
      content = $.parseHTML(_.escape(o.message).replace(/\n/g, '<br>'))
      text = o.message
    }

    // check if the content contains (probably long) links
    const wordbreak = text.indexOf('http') >= 0 ? 'break-all' : 'normal'

    if (alert.length) {
      node.addClass('appear')
      // trigger a 'notification:removed' when the yell node is
      // removed from dom like in remove() for a consistent behavior
      // e.g. when the yell is closed by an new yell
      alert.trigger('notification:removed')
      alert.remove()
    }

    node.append(
      $('<div class="icon">').append(
        icons[o.type]
          ? createIcon(icons[o.type]).addClass(type === 'busy' ? 'animate-spin' : '')
          : $()
      )
    )
      .mouseover(pause) // Pause timer when user hovers over notification
      .mouseout(resume)

    // DO NOT REMOVE! We need to use defer here, otherwise screen readers don't read the alert correctly.
    _.defer(function () {
      node.append(
        $('<div role="alert" aria-live="polite" class="message user-select-text">').append(
          ariaText[o.type] && o.headline && o.type !== o.headline.toLowerCase() ? $('<span class="sr-only">').text(ariaText[o.type]) : [],
          o.headline ? $('<h2 class="headline">').text(o.headline) : [],
          $('<div>').css('word-break', wordbreak).append(content)
        )
      )
    })

    // closeOnClick: only show a close button when the yell can be closed on click
    if (o.closeOnClick) {
      node.append(
        $('<button type="button" class="btn btn-link" data-action="close">')
          .attr('title', gt('Close this notification'))
          .append(createIcon('bi/x-lg.svg'))
      )
    }

    // yell would be behind modal dialogs, because those are attached to the body node
    // this also applies for the wizard
    if ($(document.body).hasClass('modal-open') || $('.wizard-container').length > 0) {
      $(document.body).append(node)
    } else {
      $('#io-ox-core').append(node)
    }

    // put at end of stack not to run into opening click
    setTimeout(function () {
      // might be already added
      node.trigger('notification:appear').addClass('appear')
      if (o.focus) node.attr('tabindex', 0).focus()
    }, _.device('touch') ? 300 : 2) // _.defer uses setTimeout(..., 1) internally so use at least 2ms

    return node
  }
}

yell.done = function () {
  yell('success', gt('Done'))
}

yell.close = function () {
  yell('close')
}

export default yell
