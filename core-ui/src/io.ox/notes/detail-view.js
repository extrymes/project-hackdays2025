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

import _ from '@/underscore'
import $ from '@/jquery'
import Backbone from '@/backbone'
import moment from '@open-xchange/moment'

import DisposableView from '@/io.ox/backbone/views/disposable'
import api from '@/io.ox/notes/api'
import parser from '@/io.ox/notes/parser'
import yell from '@/io.ox/core/yell'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'

import gt from 'gettext'

const DetailView = DisposableView.extend({

  className: 'abs note scrollable',

  events: {
    'click a[data-name]': 'onInsert'
  },

  initialize (options) {
    this.options = options || {}
    this.model = this.getModel()
    this.$el.attr('data-cid', this.options.cid)

    //
    // Model changes
    //

    this.listenTo(this.model, 'change:html', this.renderHTML)
    this.listenTo(this.model, 'change:last_modified', this.renderLastModified)
    this.listenTo(this.model, 'change:title', this.renderTitle)
    this.listenTo(this.model, 'change:preview', function (model, value) {
      const meta = _.extend({}, this.model.get('meta'), { note_preview: value })
      this.model.set('meta', meta)
      api.update(this.options.cid, { meta })
    })

    this.render().fetch()

    //
    // Events
    //

    this.$('.note-content').on('keydown', function (e) {
      if (!e.metaKey) return

      switch (e.which) {
        // "S"
        case 83:
          e.preventDefault()
          document.execCommand('strikeThrough', false, 'true')
          break
        // "U"
        case 85:
          e.preventDefault()
          document.execCommand('underline', false, 'true')
          break
        // no default
      }
    })

    this.$('.note-content').on('click', 'ul.todo li', function (e) {
      if (e.offsetX >= 0) return
      $(this).toggleClass('checked')
      $(e.delegateTarget).trigger('input')
    })

    this.$('.note-content').on('paste', function (e) {
      e.preventDefault()
      // Get pasted data via clipboard API
      const clipboardData = e.originalEvent.clipboardData || window.clipboardData
      const pastedText = clipboardData.getData('Text')
      document.execCommand('inserttext', false, pastedText)
    })

    //
    // Updates
    //

    const THROTTLE = 60 * 1000

    this.throttledUpdateContent = _.throttle(function () {
      if (this.disposed) return
      this.updateContentImmediately()
    }, THROTTLE, { leading: false })

    this.updateContent = function () {
      this.model.set('last_modified', _.now())
      this.throttledUpdateContent()
    }

    this.updateTitle = _.throttle(function () {
      if (this.disposed) return
      this.updateTitleImmediately()
    }, THROTTLE, { leading: false })

    this.$('.note-content').on('input', this.updateContent.bind(this))
    this.$('.note-title input').on('input', this.updateTitle.bind(this))

    const updateLastModified = setInterval(function () {
      if (this.disposed) return
      this.renderLastModified()
    }.bind(this), 10000)

    //
    // Dispose
    //

    this.on('dispose', function () {
      // already stop listening to avoid double update of "meta.note_preview"
      this.stopListening()
      this.updateContentImmediately()
      this.updateTitleImmediately()
      window.clearInterval(updateLastModified)
    })
  },

  getModel () {
    let model = api.getModel(this.options.cid)
    if (!model) {
      model = new Backbone.Model()
      api.addToPool(model)
    }
    return model
  },

  render () {
    this.$el.append(
      $('<div class="note-container">').append(
        $('<div class="note-header">').append(
          new Dropdown({ caret: true, label: gt('Insert'), className: 'dropdown pull-left' })
            .link('insert-todo', 'Todo list')
            .link('insert-ul', 'Bulleted list')
            .link('insert-ol', 'Numbered list')
            .divider()
            .link('insert-image', 'Image')
            .render().$el,
          $('<div class="note-caption pull-right">')
        ),
        $('<div class="note-title">').append('<input type="text">'),
        $('<div class="note-content" tabindex="0" contenteditable="true" spellcheck="true">')
      )
    )
    this.renderLastModified()
    this.renderTitle()
    this.renderHTML()
    return this
  },

  renderLastModified () {
    const t = this.model.get('last_modified')
    this.$('.note-caption').text(
      t ? gt('Modified') + ': ' + moment(t).fromNow() : '\u00A0'
    )
  },

  renderTitle () {
    this.$('.note-title input').val(
      String(this.model.get('title') || '').replace(/\.txt$/i, '')
    )
  },

  renderHTML () {
    this.$('.note-content').html(this.model.get('html') || '')
  },

  fetch () {
    // quick check if we already have model data
    if (this.model.has('preview')) return

    const obj = _.cid(this.options.cid); const self = this

    api.get(obj)
      .done(function (response) {
        if (self.disposed) return
        // move some meta data silently
        const data = response.data
        self.model.set('preview', data.meta.note_preview, { silent: true })
        // set all other data
        self.model.set(data).set(parser.parsePlainText(response.content))
      })
      .fail(yell)
  },

  updateContentImmediately () {
    if (this.disposed) return
    const result = parser.parseHTML(this.$('.note-content'))
    if (result.content === this.model.get('content')) return
    console.log('updateContentImmediately...')
    this.model.set(result)
    api.updateContent(this.model.pick('id', 'folder_id', 'filename', 'preview'), result.content)
    // this.$debug = this.$debug || $('<div class="note-debug">').appendTo('body');
    // this.$debug.text(this.model.get('content'));
  },

  updateTitleImmediately () {
    if (this.disposed) return
    const title = this.$('.note-title input').val()
    if (title === this.model.get('title')) return
    this.model.set('title', title)
    api.update(this.options.cid, { title })
  },

  onInsert (e) {
    const editor = this.$('.note-content').focus()[0]
    const range = this.getEditorRange(editor)

    const type = $(e.currentTarget).attr('data-name'); let node
    switch (type) {
      case 'insert-todo': node = this.onInsertTodo(); break
      case 'insert-ul': node = this.onInsertBulletedList(); break
      case 'insert-ol': node = this.onInsertNumberedList(); break
      case 'insert-image': node = this.onInsertImage(); break
      // no default
    }

    range.insertNode(node)

    setTimeout(function () {
      range.collapse(false)
      node.scrollIntoViewIfNeeded(true)
      editor.focus()
    }, 1)
  },

  getEditorRange (editor) {
    const selection = window.getSelection()
    let range = selection.getRangeAt(0)
    const contains = $.contains(editor, range.commonAncestorContainer)

    if (contains) {
      range.deleteContents()
    } else {
      range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    return range
  },

  onInsertTodo () {
    return $('<ul class="todo"><li>First item</li><li>Second item</li></ul>')[0]
  },

  onInsertBulletedList () {
    return $('<ul><li>First item</li><li>Second item</li></ul>')[0]
  },

  onInsertNumberedList () {
    return $('<ol><li>First item</li><li>Second item</li></ol>')[0]
  },

  onInsertImage () {
    const images = ['13894/63603', '13894/63604', '13894/63605', '13894/63583', '13894/63584', '13894/63585', '13894/63586', '13894/63587', '13894/63606', '13894/63673', '13894/63607', '13894/63674', '13894/63608', '13894/63590', '13894/63591', '13894/63592', '13894/63593', '13894/63594', '13894/63595', '13894/63596', '13894/63597', '13894/63609']
    const id = images[Math.random() * images.length >> 0]
    return $('<img>').attr('src', 'api/files?action=document&folder=13894&id=' + id + '&delivery=view&scaleType=contain&width=1024')[0]
  }
})

export default DetailView
