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
import textproc from '@/io.ox/core/tk/textproc'

import { settings as mailSettings } from '@/io.ox/mail/settings'

// save jQuery val() - since tinyMCE is a bit too aggressive
const val = $.original.val

function Editor (el, opt) {
  opt = _.extend({ useFixedWithFont: false }, opt)
  let textarea = $('<textarea class="plain-text">').toggleClass('monospace', opt.useFixedWidthFont)

  _.extend(this, Backbone.Events)
  textarea.on('change', this.trigger.bind(this, 'change'))
  textarea.on('input', _.throttle(this.trigger.bind(this, 'change'), 100))

  textarea.on('input', resizeTextarea)

  $(el).append(textarea)

  if (_.device('tablet && iOS >= 6')) {
    textarea.on('click', function () {
      if (textarea.get(0).selectionStart < 100) {
        _.defer(function () {
          window.scrollTo(0, 0)
          document.body.scrollTop = 0
        })
      }
    })
  }

  let def = $.when(this)

  const trimEnd = function (str) {
    // ensure we have a string
    str = String(str || '')
    // remove white-space at end
    return str.replace(/[\s\xA0]+$/, '')
  }

  const trim = function (str) {
    str = trimEnd(str)
    // reduce leading line-feeds
    str = str.replace(/^\n{2,}/, '\n\n')
    // ignore valid white-space pattern at beginning (see Bug 26316)
    if (/^\n{0,2}[ \t\xA0]*\S/.test(str)) return str
    // remove white-space
    str = str.replace(/^[\s\xA0]*\n([\s\xA0]*\S)/, '$1')

    // remove trailing white-space, line-breaks, and empty paragraphs
    str = str.replace(
      /(\s|&nbsp;|\0x20|<br\/?>|<p( class="io-ox-signature" | class="io-ox-hint")>(&nbsp;|\s|<br\/?>)*<\/p>)*$/g, ''
    )

    return str
  }

  const set = function (str) {
    val.call(textarea, trimEnd(str))
    this.setCaretPosition()
    resizeTextarea()
  }

  const clear = function () {
    val.call(textarea, '')
  }

  const get = function () {
    return trim(val.call(textarea))
  }

  this.content_type = 'text/plain'

  this.getMode = () => 'text'

  // publish internal 'done'
  this.done = function (fn) {
    return def.done(fn)
  }

  this.focus = function () {
    // no autofocus on smartphone and for iOS in special (see bug #36921)
    if (_.device('!smartphone && !iOS')) textarea.focus()
  }

  this.clear = clear

  this.getContent = get
  this.getPlainText = get

  this.setContent = set
  this.setPlainText = set

  this.paste = $.noop

  this.scrollTop = function (pos) {
    if (pos === undefined) {
      return textarea.scrollTop()
    } else if (pos === 'top') {
      textarea.scrollTop(0)
    } else if (pos === 'bottom') {
      textarea.scrollTop(textarea.get(0).scrollHeight)
    }
  }

  this.setCaretPosition = function () {
    if (!textarea) return
    const el = textarea.get(0)
    function fnSetCaretPosition () {
      // Prevent NS_ERROR_FAILURE in Firefox
      if (!textarea || !textarea.is(':visible')) return
      if (el.setSelectionRange) {
        el.setSelectionRange(0, 0)
      } else if (el.createTextRange) {
        const range = el.createTextRange()
        range.moveStart('character', 0)
        range.select()
      }
    }
    fnSetCaretPosition()
    // Defer is needed on Chrome, but causes Error in Firefox
    if (_.browser.Chrome) _.defer(fnSetCaretPosition)
    textarea.scrollTop(0)
  }

  function insertContent (content) {
    textarea[0].setRangeText(content, textarea[0].selectionStart, textarea[0].selectionEnd, 'end')
  }

  this.selection = {
    getContent () {
      return textarea.val().substring(textarea[0].selectionStart, textarea[0].selectionEnd)
    },
    setContent (str) {
      insertContent(str)
      textarea.trigger('change')
    }
  }

  this.appendContent = function (str) {
    let content = this.getContent()
    // Remove whitespace above and below content and add newline before appended string
    content = this.getContent().replace(/\n+$/, '').replace(/^\n+/, '')
    this.setContent(content + '\n\n' + str)
  }

  this.prependContent = function (str) {
    // Remove whitespace above and below content and add newline before prepended string
    const content = this.getContent().replace(/^\n+/, '').replace(/\n+$/, '')
    this.setContent('\n' + str + '\n\n' + content)
  }

  this.insertContent = insertContent

  this.setContentParts = function (data, type) {
    let content = ''
    // normalise
    data = _.isString(data) ? { content: data } : data
    // concat content parts
    if (data.content) content += data.content
    if (type === 'above' && data.cite) content += ('\n\n' + data.cite)
    if (data.quote) content += ('\n\n' + data.quote || '')
    if (type === 'below' && data.cite) content += ('\n\n' + data.cite)
    this.setContent(content)
  }

  // hint: does not detects the cite block
  this.getContentParts = function () {
    const content = this.getContent()
    const isForwardUnquoted = opt.view.model.type === 'forward' && mailSettings.get('forwardunquoted', false)
    let index = content.indexOf(isForwardUnquoted ? '----' : '\n> ')
    // make sure that the quote part does not start with \n
    if (index >= 0) index++
    // special case: initial reply/forward
    if (content.substring(0, 2) === '> ') index = 0
    if (index < 0) return { content }
    return {
      // content without trailing whitespace
      content: content.substring(0, index - 1).replace(/\s+$/g, ''),
      quote: content.substring(index),
      cite: undefined
    }
  }

  this.insertPrevCite = function (str) {
    const data = this.getContentParts()
    // add cite
    data.cite = str
    this.setContentParts(data, 'above')
  }

  this.insertPostCite = function (str) {
    const data = this.getContentParts()
    // add cite
    data.cite = str
    this.setContentParts(data, 'below')
  }

  this.replaceParagraph = function (str, rep) {
    let content = this.getContent()
    const length = content.length
    const strSanitized = textproc.htmltotext(str)
    const strEscaped = str.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&')
    // workaround: compose vs. edit (sanitized signature) vs. trimed as fallback
    const reParagraph = new RegExp('(' + strEscaped + '|' + strSanitized + '|' + strEscaped.trim() + ')')
    content = content.replace(reParagraph, (rep || ''))
    if (content.length === length) return false
    const top = this.scrollTop()
    this.setContent(content)
    this.scrollTop(top)
    return true
  }

  function resizeEditor () {
    if (el === null) return
    // container node of floating window
    const windowContainer = textarea.closest('.window-container-center')
    // to field subject etc
    const fields = windowContainer.find('.mail-compose-fields')

    if (windowContainer.length !== 1 && fields.length !== 1) return

    // calculations on hidden nodes would result in wrong height
    if (windowContainer.is(':hidden')) return

    // there is a strange 5px height difference between the text area and the container, couldn't find the cause yet
    textarea.css('minHeight', Math.max(300, windowContainer.outerHeight() - fields.outerHeight() - 5))
  }

  function resizeTextarea () {
    // make sure textarea is visible or resizing will not work (height will be 0px)
    const stateBefore = textarea.css('display')
    textarea.show()

    textarea[0].style.height = 'auto'
    textarea[0].style.height = (textarea[0].scrollHeight) + 'px'

    // recreate previous display state
    textarea.css('display', stateBefore)
  }

  this.show = function () {
    textarea.prop('disabled', false).show()
    // to prevent having multiple listeners
    $(window).off('resize.text-editor', resizeEditor)
    $(window).on('resize.text-editor', resizeEditor)
    resizeEditor()
  }

  this.hide = function () {
    textarea.prop('disabled', true).hide()
    $(window).off('resize.text-editor', resizeEditor)
  }

  this.getContainer = function () {
    return textarea
  }

  this.destroy = function () {
    this.hide()
    this.setContent('')
    textarea = def = null
  }
}

export default Editor
