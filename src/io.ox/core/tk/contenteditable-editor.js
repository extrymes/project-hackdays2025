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

/* global tinyMCE: true */
import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'
import DOMPurify from 'dompurify'

import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import textproc from '@/io.ox/core/tk/textproc'
import mailAPI from '@/io.ox/mail/api'
import * as mailUtil from '@/io.ox/mail/util'
import { settings } from '@/io.ox/core/settings'

// avoid css insertion
import contentCss from '@/io.ox/core/tk/contenteditable-editor-content.scss?inline'
import '@/io.ox/core/tk/contenteditable-editor.scss'
import gt from 'gettext'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import '@open-xchange/tinymce' // this import is required for compose bundle

// some gt-calls for translations inside the custom plugins for tinymce
gt('Drop inline images here')
gt('Please only drop images here. If you want to send other files, you can send them as attachments.')

const POINT = 'io.ox/core/tk/contenteditable-editor'
let editorTinymce

let INDEX = 0

ext.point(POINT + '/setup').extend({
  id: 'default',
  index: INDEX += 100,
  draw (editor) {
    editor.on('keydown', event => {
      // pressed enter?
      if (!event.shiftKey && event.which === 13) splitContent(editor, event)
      if ((!event.shiftKey && event.which === 13) || event.which === 40) setTimeout(throttledScrollOnEnter, 0, editor)
      if (event.which === 38 || event.which === 8) setTimeout(throttledScrollOnCursorUp, 0, editor)
    })
  }
})

ext.point(POINT + '/setup').extend({
  id: 'list-style-position',
  index: INDEX += 100,
  draw: editor => {
    editor.on('NodeChange', event => {
      if (event.element.nodeName !== 'LI') return
      if (event.element.style.textAlign === 'left' || event.element.style.textAlign === '') return
      $(event.element).css('list-style-position', 'inside')
    })
  }
})

ext.point(POINT + '/setup').extend({
  id: 'sanitize',
  index: INDEX += 100,
  draw (editor) {
    function sanitizeAttributes (event) {
      if (!event.content) return
      // aways cast to String (See Bug 66936) - since this is handed over to tinyMCE
      // we have no choice but making this a String
      event.content = DOMPurify.sanitize(event.content) + ''
    }
    // see bug 48231 and 50849
    editor.on('PastePreProcess', sanitizeAttributes)
  }
})

ext.point(POINT + '/setup').extend({
  id: 'retrigger-change',
  index: INDEX += 100,
  draw (editor) {
    editor.on('keyup input SetContent Change', _.throttle(this.trigger.bind(this, 'change'), 50))
  }
})

// see Bug 67872
// fixes ios iframe focus bug
ext.point(POINT + '/setup').extend({
  id: 'ios-focus',
  index: INDEX += 100,
  draw (editor) {
    if (_.device('!tablet && ios >= 13')) return
    editor.on('touchstart', () => {
      if (!$(document.activeElement).is('iframe')) $(document.activeElement).blur()
    })
  }
})

function splitContentW3C (editor) {
  // get current range
  let range = editor.contentWindow.getSelection().getRangeAt(0)
  // range collapsed?
  if (!range.collapsed) {
    // delete selected content now
    editor.execCommand('Delete', false, null)
    // reselect new range
    range = editor.contentWindow.getSelection().getRangeAt(0)
  }
  // do magic
  let container = range.commonAncestorContainer
  let lastBR = null
  // helper
  function traverse (node) {
    let i
    if (node) {
      if (node.hasChildNodes()) {
        // skip text nodes
        for (i = 0; i < node.childNodes.length; i++) {
          if (node.childNodes[i].nodeType === 1) {
            // follow this node
            traverse(node.childNodes[i])
            return
          } else if (node.childNodes[i].nodeType === 3) {
            // remove zero width space (good for safari)
            node.childNodes[i].nodeValue = node.childNodes[i].nodeValue.replace('\u200B', '')
          }
        }
      } else if (node.nodeName === 'BR') {
        // remember node
        lastBR = node
      }
    }
  }
  while (container && !/mce-content-body/.test(container.className)) {
    // set range to end of container
    range.setEndAfter(container)
    // get parent node
    const parent = container.parentNode
    // add range content before next sibling (or at the end of the parent node)
    const contents = range.extractContents()
    // BR fix (remove unwanted newline)
    traverse(contents.firstChild)
    // now insert contents
    if ($(contents).text().length > 0) {
      // insert this content only if it includes something visible
      // Actually this allows to split a quote after the very last
      // character without getting empty gray blocks below the split
      parent.insertBefore(contents, container.nextSibling)
    }
    // fix ordered lists. Look for subsequent <ol>...</ol><ol>...
    try {
      const ol = $(parent).children('ol + ol')
      if (ol.length > 0) {
        const prev = ol.prev()
        const start = prev.children('li').length + 1
        ol.attr('start', start)
      }
    } catch (e) {
      if (ox.debug) console.error(e)
    }
    // climb up
    container = parent
  }
  // last BR?
  if (lastBR) {
    try {
      lastBR.parentNode.removeChild(lastBR)
    } catch (error) {
      if (ox.debug) console.error(error)
    }
  }
  // create new elements
  const newNode = mailUtil.getDefaultStyle().node.get(0)
  range.insertNode(newNode)
  range.setStart(newNode, 0)
  range.setEnd(newNode, 0)
  editor.contentWindow.getSelection().empty()
  editor.contentWindow.getSelection().addRange(range)
}

function isInsideBlockquote (range) {
  // get ancestor/parent container
  const container = range.commonAncestorContainer || range.parentElement()
  // loop for blockquote
  const quote = $(container).parents('blockquote').last()
  return quote.length > 0
}

function splitContent (editor, event) {
  // get current range
  const range = editor.contentWindow.getSelection().getRangeAt(0)
  // inside blockquote?
  if (!isInsideBlockquote(range)) return
  if (!range.startContainer) return
  splitContentW3C(editor)
  editor.dom.events.cancel(event)
  // focus is lost after content has been split, at least starting with tinyMCE 4.6.6 (4.6.5 didn't)
  editor.focus()
}

function getCursorPosition (editor) {
  const scrollable = $(editor.container).closest('.scrollable')
  const selection = editor.contentWindow.getSelection()
  let range = selection.getRangeAt(0)
  // Safari behaves strange here and gives a boundingClientRect with 0 for all properties
  let rect = _.device('safari') ? range.getClientRects()[0] : range.getBoundingClientRect()
  let top = rect ? rect.top : 0
  let bottom = rect ? rect.bottom : 0
  const composeFieldsHeight = scrollable.find('.mail-compose-fields').height()
  const footerHeight = scrollable.parents('.window-container-center').siblings('.window-footer').outerHeight()
  const marginBottom = scrollable.find('.contenteditable-editor').css('margin-bottom') || '0px'
  const editorBottomMargin = parseInt(marginBottom.replace('px', ''), 10) || 0
  const borderBottom = scrollable.height() - footerHeight - editorBottomMargin * 2

  let pos
  let endPosition = 'bottom'
  if (selection.type === 'Range') {
    if (previousRect === undefined) previousRect = rect
    // Selection end cursor at the top
    if (rect.top !== previousRect.top) {
      pos = top - scrollable.scrollTop() + composeFieldsHeight
      endPosition = 'top'
    }
    // Selection end cursor at the bottom
    if (rect.bottom !== previousRect.bottom) {
      pos = bottom - scrollable.scrollTop() + composeFieldsHeight
      endPosition = 'bottom'
    }
    previousRect = rect
  } else {
    // for empty lines we get an invalid rect
    if (top === 0) {
      if (selection.modify) {
        // copy the selection prior to changing it
        const prevRange = selection.getRangeAt(0).cloneRange()
        selection.modify('extend', 'backward', 'character')
        range = selection.getRangeAt(0)
        rect = range.getBoundingClientRect()
        top = rect.top + rect.height
        bottom = rect.bottom + rect.height
        // restore selection to previous state
        selection.removeAllRanges()
        selection.addRange(prevRange)
      } else {
        const container = range.commonAncestorContainer
        top = $(container).offset().top + container.clientHeight
      }
    }
    pos = top - scrollable.scrollTop() + composeFieldsHeight
  }

  const fontSize = parseInt($(editor.selection.getEnd()).css('font-size'))
  const scrollPosition = (endPosition === 'bottom' ? bottom : top) - (scrollable.height() / 2) + composeFieldsHeight

  return { pos, top, borderBottom, scrollable, fontSize, scrollPosition }
}

const duration = 300
const easing = 'swing'
const throttledScrollOnCursorUp = _.throttle(scrollOnCursorUp, duration)
const throttledScrollOnEnter = _.throttle(scrollOnEnter, duration)
let previousRect

// This is to keep the caret visible at all times, otherwise the fixed menubar may hide it.
// See Bug #56677
function scrollOnCursorUp (editor) {
  const cursorPosition = getCursorPosition(editor)

  // Scroll to cursor position (If you manually set this to something else, it doesn't feel native)
  if (cursorPosition.top > 0 && cursorPosition.pos < cursorPosition.fontSize * 3) cursorPosition.scrollable.animate({ scrollTop: cursorPosition.scrollPosition }, duration, easing)
  // Scroll whole window to the top, if cursor reaches top of the editable area
  if (cursorPosition.top < cursorPosition.fontSize * 3) cursorPosition.scrollable.animate({ scrollTop: 0 }, duration, easing)
}

function scrollOnEnter (editor) {
  const cursorPosition = getCursorPosition(editor)

  if (cursorPosition.pos >= (cursorPosition.borderBottom)) {
    cursorPosition.scrollable.animate({ scrollTop: cursorPosition.scrollPosition }, duration, easing)
  }
}

function lookupTinyMCELanguage () {
  const lookupLang = ox.language
  const tinymceLangpacks = ['ar', 'ar_SA', 'az', 'be', 'bg_BG', 'bn_BD', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'de_AT', 'dv', 'el', 'en_CA', 'en_GB', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr_FR', 'gd', 'gl', 'he_IL', 'hr', 'hu_HU', 'hy', 'id', 'is_IS', 'it', 'ja', 'ka_GE', 'kk', 'km_KH', 'ko_KR', 'lb', 'lt', 'lv', 'ml', 'ml_IN', 'mn_MN', 'nb_NO', 'nl', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'si_LK', 'sk', 'sl_SI', 'sr', 'sv_SE', 'ta', 'ta_IN', 'tg', 'th_TH', 'tr_TR', 'tt', 'ug', 'uk', 'uk_UA', 'vi', 'vi_VN', 'zh_CN', 'zh_TW']
  let tinymceLang = tinymceLangpacks.indexOf(lookupLang)

  // See bug 38381
  if (lookupLang === 'fr_CA') return 'fr_FR'

  if (tinymceLang > -1) return tinymceLangpacks[tinymceLang]

  tinymceLang = tinymceLangpacks.indexOf(lookupLang.substr(0, 2))
  return (tinymceLang > -1) ? tinymceLangpacks[tinymceLang] : 'en'
}
export default function Editor (parent, opt) {
  const self = this
  const initialized = $.Deferred()
  const defaultStyle = mailUtil.getDefaultStyle()
  const editorId = parent.data('editorId')
  let $el
  let ed
  let editor

  function getValidToolbar (setting, defaultToolbar) {
    let toolbar = settings.get(setting, undefined) // toolbar could be a valid '' (empty string)
    if (typeof toolbar !== 'string') toolbar = defaultToolbar
    toolbar = toolbar.match(/^ *(\*?[a-z0-9]+( *\| *| +|$))*$/gmi)
    if (toolbar === null || toolbar.length !== 1) {
      console.error('Detected an invalid toolbar configuration for the text editor')
      // return value is not validated! Manually ensure valid defaults in this file!
      return defaultToolbar
    }

    return toolbar[0]
  }

  _.extend(this, Backbone.Events)

  parent.append(
    $el = $('<div class="contenteditable-editor">')
      .attr('data-editor-id', editorId)
      .on('keydown', event => { if (event.which === 27) event.preventDefault() }).append(
        editor = $('<div class="editable" tabindex="0" role="textbox" aria-multiline="true">')
          .attr('aria-label', gt('Rich Text Area. Press ALT-F10 for toolbar'))
          .toggleClass('simple-linebreaks', mailSettings.get('compose/simpleLineBreaks', false))
      )
  )

  opt = _.extend({
    toolbar1: '*undo *redo | bold italic underline | bullist numlist outdent indent',
    advanced: '*styleselect | *fontselect fontsizeselect | removeformat | link image *emoji | forecolor backcolor',
    toolbar2: '',
    toolbar3: '',
    plugins: 'autoresize autolink oximage oxpaste oxdrop link paste emoji lists code',
    theme: 'silver',
    imageLoader: null // is required to upload images. should have upload(file) and getUrl(response) methods
  }, opt)

  editor.addClass(opt.class)

  opt.toolbar1 += ' | ' + opt.advanced

  // consider custom configurations
  opt.toolbar1 = getValidToolbar('tinyMCE/theme_advanced_buttons1', opt.toolbar1)
  opt.toolbar2 = getValidToolbar('tinyMCE/theme_advanced_buttons2', opt.toolbar2)
  opt.toolbar3 = getValidToolbar('tinyMCE/theme_advanced_buttons3', opt.toolbar3)

  // remove unsupported stuff
  if (!capabilities.has('emoji')) {
    opt.toolbar1 = opt.toolbar1.replace(/( \| | )?\*?emoji( \| | )?/g, ' | ')
    opt.toolbar2 = opt.toolbar2.replace(/( \| | )?\*?emoji( \| | )?/g, ' | ')
    opt.toolbar3 = opt.toolbar3.replace(/( \| | )?\*?emoji( \| | )?/g, ' | ')
    opt.plugins = opt.plugins.replace(/emoji/g, '').trim()
  }

  opt.mobileToolbar = opt.toolbar1
    .replace(/( \| | )?outdent( \| | )indent( \| | )/g, ' | ')
    .replace(/( \| | )?\*?styleselect( \| | )/g, ' | ')
    .replace(/( \| | )?\*?fontselect( \| | )/g, ' | ')
    .replace(/( \| | )?image( \| | )/g, ' | ')
    .replace(/( \| | )?fontsizeselect( \| | )/g, ' | ')
    .replace(/( \| | )?link( \| | )/g, ' | ')
    .replace(/( \| | )?removeformat( \| | )/g, ' | ')

  opt.mobileToolbar += ' | closetoolbar'

  // store a copy of original toolbar to adjust toolbar in DOM later
  const originalToolbarConfig = opt.toolbar1.replace(/\s*\|\s*/g, ' ')
  opt.toolbar1 = opt.toolbar1.replace(/\*/g, '')

  const fixedToolbar = `.contenteditable-editor[data-editor-id="${CSS.escape(editorId)}"] .tox-editor-header`
  const options = {
    extended_valid_elements: 'blockquote[type]',
    invalid_elements: 'object,iframe,script,embed',

    contextmenu: false,

    height: opt.height,
    autoresize_bottom_margin: 0,
    menubar: false,
    statusbar: false,

    toolbar_location: _.device('smartphone') ? 'top' : 'bottom',

    skin: opt.skin,

    body_class: 'ox-mce',
    content_style: contentCss,

    toolbar1: opt.toolbar1,
    toolbar2: opt.toolbar2,
    toolbar3: opt.toolbar3,

    relative_urls: false,
    remove_script_host: false,

    entity_encoding: 'raw',

    font_formats: mailUtil.getFontFormats(),
    fontsize_formats: '8pt 10pt 11pt 12pt 13pt 14pt 16pt 18pt 24pt 36pt',

    forced_root_block: 'div',
    forced_root_block_attrs: { style: defaultStyle.string, class: 'default-style' },

    browser_spellcheck: true,

    // touch devices: support is limited to 'lists', 'autolink', 'autosave'
    plugins: opt.plugins,

    // link plugin settings
    link_title: false,
    target_list: false,
    link_assume_external_targets: true,

    language: lookupTinyMCELanguage(),

    // disable the auto generation of hidden input fields (we don't need them)
    hidden_input: false,

    theme: opt.theme,
    mobile: {
      theme: 'silver',
      toolbar1: opt.mobileToolbar
    },

    init_instance_callback (editor) {
      ed = editor
      initialized.resolve()
    },

    execcommand_callback (editorId, elm, command) {
      if (command === 'createlink') {
        _.defer(() => {
          $(tinyMCE.get(editorId).getBody()).find('a').attr({
            target: '_blank',
            rel: 'noopener'
          })
        })
      }
    },
    // post processing (string-based)
    paste_preprocess: textproc.paste_preprocess,
    // post processing (DOM-based)
    paste_postprocess: textproc.paste_postprocess,

    setup (editor) {
      if (opt.oxContext) editor.oxContext = opt.oxContext

      if (_.device('smartphone')) {
        editor.ui.registry.addButton('closetoolbar', {
          icon: 'close',
          tooltip: 'Close toolbar',
          onAction: () => {
            $(fixedToolbar).hide()
            $(window).trigger('resize.tinymce')
          }
        })
      }

      ext.point(POINT + '/setup').invoke('draw', self, editor)
      editor.on('init', function () {
        // remove empty and unused sidebar to fix a11y issues (has role complementary which is not allowed inside other landmarks)
        $(`.contenteditable-editor[data-editor-id="${CSS.escape(editorId)}"] .tox-sidebar`).remove()
        // marker class to fix scroll behavior
        if (this.oxContext && this.oxContext.snippet) {
          $(this.contentDocument.getElementsByTagName('html')[0]).addClass('snippet-editor')
        }
        // Somehow, this span (without a tabindex) is focussable in firefox (see Bug 53258)
        $(fixedToolbar).find('span.mce-txt').attr('tabindex', -1)
        // adjust toolbar
        const widgets = $(fixedToolbar).find('.tox-tbtn')
        originalToolbarConfig.split(' ').forEach((id, index) => {
          widgets.eq(index).attr('data-name', id)
          if (/^\*/.test(id)) widgets.eq(index).attr('data-hidden', 'width-xs')
        })
        // find empty groups
        $(fixedToolbar).find('.tox-toolbar__group').each(function () {
          $(this).toggleClass('tox-toolbar__group__width-xs', $(this).has('.tox-tbtn:not([data-hidden])').length > 0)
        })

        editor.on('SetContent', event => {
          if (!event.paste) return
          setTimeout(throttledScrollOnEnter, 0, editor)
        })
      })
    },

    oxImageLoader: opt.imageLoader
  }

  ext.point(POINT + '/options').invoke('config', options, opt.oxContext)

  ;(async () => {
    const { default: tinymce } = await import('@open-xchange/tinymce')

    if (options.language !== 'en') options.language_url = `./tinymce/langs/${options.language}.js`
    editorTinymce = await tinymce.init({ target: editor.get(0), ...options, skin_url: './tinymce/skins/oxide', content_css: false })
  })()

  function trimEnd (text) {
    return String(text || '').replace(/[\s\xA0]+$/g, '')
  }

  function resizeEditor () {
    if (parent === null) return

    // This is needed for keyboard to work in small windows with buttons that are hidden
    const buttons = parent.find('.tox-tbtn').filter('[data-hidden="width-xs"]')
    buttons.filter(':hidden').attr({ role: 'presentation', 'aria-hidden': true })
    buttons.filter(':visible').removeAttr('aria-hidden').attr('role', 'button')

    let height = 0
    let margin = 0
    let toolbar = 0
    const top = parent.parent().find('.mail-compose-fields').outerHeight()
    const iframe = parent.find('iframe')
    const iframeContents = iframe.contents().height()
    const container = parent.closest('.window-container')
    const header = container.find('.window-header:visible').outerHeight() || 0

    if (_.device('smartphone')) {
      height = $(window).height()
      toolbar = container.find('.tox-editor-header:visible').outerHeight() || 0
      margin = 32
    } else {
      height = parent.closest('.window-content').height()
      margin = 26
    }

    let availableHeight = height - top - header - toolbar

    if (opt.css?.height) availableHeight = opt.css.height
    else if (_.device('smartphone') && (iframeContents - margin - toolbar > availableHeight)) availableHeight = iframeContents

    editor.css('min-height', availableHeight)
    parent.find('.tox.tox-tinymce.tox-tinymce--toolbar-bottom').css('min-height', availableHeight)
    iframe.css('min-height', availableHeight)
    iframe.contents().find('#tinymce').css('min-height', availableHeight - margin)
    if (opt.css) editor.css(opt.css)
  }

  const resizeEditorDebounced = _.debounce(resizeEditor, 30)

  function setContent (content) {
    ed.setContent(content)

    // Remove all position: absolute and white-space: nowrap inline styles
    // This is a fix for some of the more infamous mail bugs
    // Don't change this if you don't know what you are doing
    if (/position:(\s+)?absolute/i.test(content)) {
      $(ed.getBody()).find('[style*=absolute]').css('position', 'static')
    }
    if (/white-space:(\s+)?nowrap/i.test(content)) {
      $(ed.getBody()).find('[style*=nowrap]').css('white-space', 'normal')
    }
  }

  function clear () { setContent('') }

  function ln2br (text) {
    return String(text || '').replace(/\r/g, '')
    // '\n' is for IE; do not add for signatures
      .replace(/\n/g, text.indexOf('io-ox-signature') > -1 ? '\n' : '<br>')
  }

  // get editor content
  // trim white-space and clean up pseudo XHTML
  // remove empty paragraphs at the end
  function get (options = {}) {
    // remove tinyMCE resizeHandles
    $(ed.getBody()).find('.mce-resizehandle').remove()

    // get content, do not use { format: 'raw' } here or we get tons of <br data-mce-bogus=\"1\"> elements in firefox and create unwanted newlines
    const content = ed.getContent({ format: options.format || '' })
      // replace all data-mce-* attributes including the ones with single or double quotes
      .replace(/<[a-z][^>]*\sdata-mce.*?>/gi, match => match.replace(/\sdata-mce-\S+=("[^"]*"|'[^']*')/g, ''))
      // remove space from inside tags
      .replace(/<(\w+)[ ]?\/>/g, '<$1>')
      // remove line breaks
      .replace(/(<div (([^>]*))?>(<br>)?<\/div>)+$/, '')
      // remove trailing white-space, line-breaks, and empty paragraphs
      .replace(
        /(\s|&nbsp;|\0x20|<br\/?>|<div( class="io-ox-signature" | class="io-ox-hint")>(&nbsp;|\s|<br\/?>)*<\/div>)*$/g, ''
      )

    // remove trailing white-space
    return trimEnd(content)
  }

  // special handling for alternative mode, send HTML to backend and it will create text/plain part of the mail automagically
  this.content_type = opt.config && opt.config.get('preferredEditorMode') === 'alternative' ? 'ALTERNATIVE' : 'text/html'

  // publish internal 'done'
  this.done = function (fn) {
    return $.when(initialized).then(function () {
      fn(this)
      return this
    }.bind(this))
  }

  this.focus = () => {
    if (_.device('ios')) return
    _.defer(() => {
      if (!ed) return
      ed.focus()
      ed.execCommand('mceFocus', false, editorId)
    })
  }

  this.ln2br = ln2br

  this.clear = clear

  this.getContent = get

  this.getPlainText = () => textproc.htmltotext($(ed.getBody()).html())

  this.setContent = setContent

  this.setPlainText = text => {
    text = trimEnd(text)
    if (text === undefined) return
    import('@/io.ox/mail/detail/content').then(({ default: proc }) => {
      setContent(proc.text2html(text))
      ed.undoManager.clear()
    })
  }

  this.paste = content => {
    ed.execCommand('mceInsertClipboardContent', false, { content })
  }

  this.scrollTop = position => {
    const editorDocumentNode = $(ed.getDoc())
    if (position === undefined) {
      return editorDocumentNode.scrollTop()
    } else if (position === 'top') {
      editorDocumentNode.scrollTop(0)
    } else if (position === 'bottom') {
      editorDocumentNode.scrollTop(editorDocumentNode.get(0).body.scrollHeight)
    }
  }

  this.setCaretPosition = () => $(ed.getDoc()).scrollTop(0)

  function ensureDiv (text) {
    return (/^<div/i).test(text) ? text : `<div>${ln2br(text)}</div>`
  }

  // TODO: this is not DRY
  this.appendContent = function (text) {
    let content = this.getContent()
    text = ensureDiv(text)
    content = content.replace(/^(<div><br><\/div>){2,}/, '').replace(/(<div><br><\/div>)+$/, '') + '<div><br></div>' + text
    if (/^<blockquote/.test(content)) content = `<div><br></div>${content}`
    this.setContent(content)
  }

  this.prependContent = function (text) {
    let content = this.getContent()
    text = ensureDiv(text)
    content = text + '<div><br></div>' + content.replace(/^(<div><br><\/div>)+/, '').replace(/(<div><br><\/div>){2,}$/, '')
    content = `<div><br></div>${content}`
    this.setContent(content)
  }

  this.insertContent = function (content) {
    ed.insertContent(content)
  }

  this.setContentParts = function (data, type) {
    let content = ''
    // normalise
    data = _.isString(data) ? { content: data } : data
    data.content = data.content.replace(/^(<div><br><\/div>)+/, '').replace(/(<div><br><\/div>){2,}$/, '')
    // concat content parts
    if (data.content) content += data.content
    else content += '<div class="default-style" style="' + defaultStyle.string + '"><br></div>'
    if (type === 'above' && data.cite) content += data.cite
    if (data.quote) {
      // backend appends &nbsp; to the quote which are wrapped in a paragraph by the ui. remove those.
      data.quote = data.quote.replace(/<div><br>(&nbsp;|&#160;)<\/div>/, '')
      content += (data.quote || '')
    }
    if (type === 'below' && data.cite) {
      // add a blank line between the quoted text and the signature below
      // but only, if the signature is directly after the quoted text
      // then, the user can always insert text between the quoted text and the signature but has no unnecessary empty lines
      if (!/<div><br><\/div>$/i.test(content) && /<\/blockquote>$/.test(content)) content += '<div class="default-style" style="' + defaultStyle.string + '"><br></div>'
      content += data.cite
    }
    this.setContent(content)
  }

  // hint: does not detects the cite block
  this.getContentParts = function () {
    const content = this.getContent()
    const isForwardUnquoted = opt.view.model.type === 'forward' && mailSettings.get('forwardunquoted', false)
    let index = content.indexOf(isForwardUnquoted ? '----' : '<blockquote type="cite">')
    // special case: initially replied/forwarded text mail
    if (content.substring(0, 15) === '<blockquote type="cite"><div>') index = 0
    // special case: switching between signatures in such a mail
    if (content.substring(0, 23) === '<div><br></div><blockquote type="cite">') index = 0
    if (index < 0) return { content }
    return {
      // content without trailing whitespace
      content: content.substring(0, index).replace(/\s+$/g, ''),
      quote: content.substring(index),
      cite: undefined
    }
  }

  this.insertPrevCite = function (citation) {
    const data = this.getContentParts()
    citation = ensureDiv(citation)
    data.cite = citation
    this.setContentParts(data, 'above')
  }

  this.insertPostCite = function (citation) {
    const data = this.getContentParts()
    citation = ensureDiv(citation)
    data.cite = citation
    this.setContentParts(data, 'below')
  }

  this.replaceParagraph = function (searchString, replacement) {
    const content = this.getContent()

    searchString = ensureDiv(searchString)
    const pos = content.indexOf(searchString)
    if (pos < 0) return false

    // replace content
    const top = this.scrollTop()
    this.setContent(content.substr(0, pos) + (replacement || '') + content.substr(pos + searchString.length))
    this.scrollTop(top)
    return true
  }

  this.removeContent = function (content) {
    this.replaceContent(content, '')
  }

  // allow jQuery access
  this.find = (selector) => $(ed.getBody()).find(selector)

  this.children = selector => {
    return $(ed.getBody()).children(selector)
  }

  this.replaceContent = function (pattern, replacement) {
    // adopted from tinyMCE's searchreplace plugin
    const win = ed.getWin()
    let found = false

    ed.selection.select(ed.getBody(), true)
    ed.selection.collapse(true)
    // window find is not in the standard; see https://developer.mozilla.org/en-US/docs/Web/API/Window/find
    while (win.find(pattern)) {
      ed.selection.setContent(replacement || '')
      found = true
    }

    return found
  }

  this.selection = new Proxy({}, {
    get (target, prop) {
      return ed.selection[prop]
    }
  })

  this.getMode = () => 'html'

  // convenience access
  this.tinymce = () => editorTinymce[0] ? editorTinymce[0] : {}

  this.show = function () {
    // tinymce hides toolbar on non-desktop devices (own detection)
    if (!window.tinyMCE.Env.desktop) this.trigger('device:non-desktop')
    $el.show()
    // set display to empty string because of overide 'display' property in css
    $(fixedToolbar).css('display', '')
    window.toolbar = $(fixedToolbar)
    $(window).on('resize.tinymce xorientationchange.tinymce changefloatingstyle.tinymce', resizeEditorDebounced)
    $(window).trigger('resize')
  }

  this.hide = () => {
    $el.hide()
    $(window).off('resize.tinymce xorientationchange.tinymce changefloatingstyle.tinymce', resizeEditorDebounced)
  }

  this.destroy = function () {
    this.hide()
    clearKeepalive()
    // have to unset active editor manually. may be removed for future versions of tinyMCE
    delete tinyMCE.EditorManager.activeEditor
    tinyMCE.EditorManager.remove(ed)
    ed = opt = undefined
  }

  const intervals = []

  function addKeepalive (id) {
    const timeout = Math.round(settings.get('maxUploadIdleTimeout', 200000) * 0.9)
    intervals.push(setInterval(opt.keepalive || mailAPI.keepalive, timeout, id))
  }

  function clearKeepalive () { intervals.forEach(clearInterval) }

  editor.on('addInlineImage', (event, id) => addKeepalive(id))
}
