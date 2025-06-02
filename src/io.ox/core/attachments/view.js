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
import ext from '@/io.ox/core/extensions'
import backbone from '@/io.ox/core/attachments/backbone'
import strings from '@/io.ox/core/strings'
import { createIcon } from '@/io.ox/core/components'
import ContextMenuUtils from '@/io.ox/backbone/mini-views/contextmenu-utils'

import ExtensibleView from '@/io.ox/backbone/views/extensible'
import '@/io.ox/core/attachments/style.scss'
import gt from 'gettext'

// New attachment list (combines a flat list and a preview)
const List = ExtensibleView.extend({
  scrollStep: 120,
  openByDefault: false,

  events: {
    'click .toggle-details': 'onToggleDetails',
    'click .toggle-mode': 'onToggleMode',
    'click .scroll-left': 'scrollLeft',
    'click .scroll-right': 'scrollRight'
  },

  initialize (options) {
    this.options = _.extend({ AttachmentView: View, editable: false, mode: 'list' }, options)

    this.listenTo(this.collection, 'add', this.addAttachment)

    // add class here to support $el via options
    this.$el.addClass('mail-attachment-list')

    // editable?
    if (this.options.editable) this.$el.addClass('editable')

    if (this.options.mode === 'preview') this.$el.addClass('show-preview')

    this.$header = $('<div class="header">')
    this.$list = $('<ul class="attachment-list list-unstyled">')
    this.$preview = $('<ul class="attachment-list list-unstyled preview">')
    this.$footer = $('<footer>')
    this.isListRendered = false

    // things to do whenever the collection changes:
    this.listenTo(this.collection, 'add remove reset', function () {
      // toggle if empty
      const length = this.getValidModels().length
      this.$el.toggleClass('empty', length === 0)
      // update scroll controls
      this.updateScrollControls()
      // update summary
      this.renderSummary(length)
      if (this.openByDefault) this.toggleDetails(true)
    })
    this.listenTo(this.collection, 'remove', function () {
      this.$preview.trigger('scroll')
    })

    // initial toggle if empty
    this.$el.toggleClass('empty', this.getValidModels().length === 0)
  },

  render () {
    const listId = _.uniqueId('list-container-')
    const previewId = _.uniqueId('preview-container-')

    this.renderHeader()

    this.$el.append(
      // header
      this.$header,
      // short list
      $('<div class="list-container">').attr('id', listId).append(
        this.$list
      ),
      // preview list
      $('<div class="preview-container">').attr('id', previewId).append(
        $('<button type="button" class="scroll-left" aria-hidden="true">').append(createIcon('bi/chevron-left.svg')),
        this.$preview,
        $('<button type="button" class="scroll-right" aria-hidden="true">').append(createIcon('bi/chevron-right.svg'))
      ),
      // footer
      this.$footer
    )

    if (this.openByDefault) this.toggleDetails(true)

    this.updateScrollControls()
    this.updateAriaControls()
    this.$header.find('.toggle-mode').attr('aria-controls', [listId, previewId].join(' '))

    return this
  },

  renderHeader () {
    this.$header.append(
      $('<a href="#" class="toggle-details" aria-expanded="false" role="button">').append(
        createIcon('bi/paperclip.svg'),
        $('<span class="summary">'),
        createIcon('bi/chevron-down.svg').addClass('bi-12')
      ),
      $('<span class="links" role="presentation">'),
      $('<a href="#" class="toggle-mode" role="button">').attr('title', gt('Toggle preview'))
        .append(createIcon('bi/list-ul.svg'))
        .append(createIcon('bi/grid-fill.svg'))
    )

    this.renderSummary()
  },

  renderSummary (length) {
    length = length || this.getValidModels().length
    this.$header.find('.summary').text(
      gt.ngettext('%1$d attachment', '%1$d attachments', length, length)
    )
  },

  renderList () {
    // use inner function cause we do this twice
    function render (list, target, mode) {
      target.append(
        list.map(this.renderAttachment.bind(this, mode))
      )
    }

    const models = this.getValidModels()
    render.call(this, models, this.$list, 'list')
    render.call(this, models, this.$preview, 'preview')

    this.isListRendered = true
  },

  renderAttachment (mode, model) {
    return new this.options.AttachmentView({ point: this.options.point, mode, model, editable: this.options.editable }).render().$el
  },

  addAttachment (model) {
    if (!this.isListRendered) return
    if (!this.collection.isValidModel(model)) return
    this.$list.append(this.renderAttachment('list', model))
    this.$preview.append(this.renderAttachment('preview', model))
  },

  getValidModels () {
    return this.collection.getValidModels()
  },

  updateAriaControls () {
    let id
    if (this.$el.hasClass('show-preview')) id = this.$('.preview-container').attr('id')
    else id = this.$('.list-container').attr('id')
    this.$header.find('.toggle-details').attr('aria-controls', id)
    this.$header.find('.toggle-mode').attr('aria-pressed', this.$el.hasClass('show-preview'))
  },

  toggleDetails (forceOpen) {
    this.$el.toggleClass('open', forceOpen === true || undefined)
    this.$header.find('.toggle-details').attr('aria-expanded', this.$el.hasClass('open'))
    this.trigger('change:expanded', this.$el.hasClass('open'))
    if (!this.isListRendered) this.renderList()
  },

  onToggleDetails (e) {
    e.preventDefault()
    this.toggleDetails()
    this.updateScrollControls()
  },

  onToggleMode (e) {
    e.preventDefault()
    this.$el.toggleClass('show-preview')
    this.trigger('change:layout', this.$el.hasClass('show-preview') ? 'preview' : 'list')
    // to provoke lazyload
    this.$preview.trigger('scroll')
    this.updateScrollControls()
    this.updateAriaControls()
    $(window).trigger('resize')
  },

  scrollLeft () {
    this.scrollList(-1)
  },

  scrollRight () {
    this.scrollList(+1)
  },

  scrollList (delta) {
    const index = this.getScrollIndex() + delta
    const max = this.getMaxScrollIndex()
    // ignore invalid indices
    if (index < 0 || index > max) return
    // update controls with new index
    this.updateScrollControls(index)
    // clear queue, don't jump to end; to support fast consecutive clicks
    this.$preview.stop(true, false).animate({ scrollLeft: index * this.scrollStep }, 'fast')
  },

  getScrollIndex () {
    // make sure we're always at a multiple of 120 (this.scrollStep)
    return Math.ceil(this.$preview.scrollLeft() / this.scrollStep)
  },

  getMaxScrollIndex () {
    const width = this.$preview.outerWidth()
    const scrollWidth = this.$preview.prop('scrollWidth')
    return Math.max(0, Math.ceil((scrollWidth - width) / this.scrollStep))
  },

  updateScrollControls (index) {
    if (index === undefined) index = this.getScrollIndex()
    const max = this.getMaxScrollIndex()
    this.$('.scroll-left').prop('disabled', index <= 0)
    this.$('.scroll-right').prop('disabled', index >= max)
  }
})

const Preview = Backbone.View.extend({

  className: 'preview',

  events: {
    keydown: 'onKeydown'
  },

  initialize () {
    this.listenTo(this.model, 'change:id', this.render)
    this.$el.on('error.lazyload', this.fallback.bind(this))
  },

  lazyload (previewUrl) {
    // use defer to make sure this view has already been added to the DOM
    _.defer(function () {
      this.$el.lazyload({ container: this.$el.closest('ul'), effect: 'fadeIn', previewUrl })
    }.bind(this))
  },

  getColor (extension) {
    // word blue
    if (/^do[ct]x?$/.test(extension)) return '#2C5897'
    // excel green
    if (/^xlsx?|o[dt]s$/.test(extension)) return '#1D7047'
    // powerpoint orange
    if (/^p[po]tx?$/.test(extension)) return '#D04423'
    // pdf red
    if (/^pdf$/.test(extension)) return '#C01E07'
    // zip orange
    if (/^(zip|gz|gzip|tgz)$/.test(extension)) return '#FF940A'
  },

  fallback () {
    const extension = this.model.getExtension() || 'bin'
    const color = this.getColor(extension)
    this.$el.append(
      $('<div class="abs fallback ellipsis">')
        .css({ color: color && 'white', backgroundColor: color })
        .text(extension)
    )
  },

  render () {
    const url = this.model.previewUrl({ delayExecution: true })
    if (_.isString(url)) {
      this.$el.addClass('lazy').attr('data-original', url)
      this.lazyload()
    } else if (url !== null) {
      this.$el.addClass('lazy')
      this.lazyload(url)
    } else {
      this.fallback()
    }

    return this
  },

  onKeydown (e) {
    if (e.which !== 13 && e.which !== 32) return
    $(e.target).trigger('click')
    e.preventDefault()
    e.stopPropagation()
  }

})

const View = Backbone.View.extend({

  tagName: 'li',
  className: 'attachment flex-row zero-min-width',

  events: {
    'click .remove-attachment': 'onRemove',
    keydown: 'handleKeydown',
    contextmenu: 'onContextmenu'
  },

  attributes () {
    // previews don't have an id. use cid instead. Otherwise preview in mail compose breaks.
    const i = this.model.collection.indexOf(this.model) // make first element tabbable and all focussable
    return {
      'data-id': this.model.get('id') || this.model.cid,
      tabindex: i === 0 ? '0' : '-1'
    }
  },

  initialize (options) {
    this.options = _.extend({ mode: 'list' }, options)

    this.preview = this.options.mode === 'preview' && new Preview({ model: this.model, el: this.el, focus: true })

    this.listenTo(this.model, {
      'change:uploaded' (model) {
        const w = model.get('uploaded') * 100
        // special case. Has been reset to 0 and therefore needs to be rendered again
        if (w === 0) this.render()
        this.$('.progress').width(w + '%')
      },
      'change:file_size change:size': this.render,
      'upload:complete' () {
        this.render()
      },
      remove: this.onRemoveModel
    })

    const point = this.options.point ? this.options.point + '/view' : 'io.ox/core/attachment/view'
    ext.point(point).invoke('initialize', this)
  },

  // handle arrow keys for keyboard navigation
  handleKeydown (event) {
    ContextMenuUtils.macOSKeyboardHandler(event)
    const shiftF10 = (event.shiftKey && event.which === 121)
    if (shiftF10 && event.isKeyboardEvent) {
      // e.isKeyboardEvent will be true for Shift-F10 triggered context menus on macOS
      // other browsers will just trigger contextmenu events
      if (this.$('.dropdown-toggle').length) {
        this.$('.dropdown-toggle').attr('tabindex', '0')
        this.$('.dropdown-toggle').focus()
        this.onContextmenu(event)
      }
    }
    switch (event.keyCode) {
      case 13: // enter
      case 32: // space
        this.$el.click()
        break
      case 37: // left
      case 38: // up
        this.focusPrevious()
        break
      case 39: // right
      case 40: // down
        this.focusNext()
        break
      case 46: // delete
        if (this.options.editable) {
          this.focusPrevious()
          this.model.collection.remove(this.model)
        }
    }
  },

  onContextmenu (event) {
    if (this.$('.dropdown-toggle').length) {
      this.$('.dropdown-toggle').click()
      $('.smart-dropdown-container li:first a').focus()
      event.preventDefault()
      event.stopPropagation()
    }
  },

  focusPrevious () {
    const $prev = this.$el.prev()
    if ($prev.length) {
      this.$el.attr('tabindex', '-1')
      $prev.attr('tabindex', '0').focus()
    } else {
      this.$el.attr('tabindex', '0').focus()
    }
  },

  focusNext () {
    const $next = this.$el.next()
    if ($next.length) {
      this.$el.attr('tabindex', '-1')
      $next.attr('tabindex', '0').focus()
    } else {
      this.$el.attr('tabindex', '0').focus()
    }
  },

  appendProgress () {
    const $progress = $('<div class="progress-container">').append($('<div class="progress">'))
    if (this.preview) this.$el.append($progress)
    else this.$('.file').append($progress)
  },

  onRemove (e) {
    e.preventDefault()
    this.model.collection.remove(this.model)
  },

  onRemoveModel () {
    // this must be event-based otherwise list and preview get out of sync
    this.focusPrevious()
    this.remove()
  },

  render () {
    this.$el.empty().append(
      $('<div class="file flex-row flex-grow zero-min-width rounded py-4 px-12">').append(
        $(`<div class="filename ellipsis flex-grow" title="${this.model.get('filename')}">`).text(this.model.get('name')),
        $('<div class="filesize text-gray pl-4">')
      )
    )
    // progress?
    if (this.model.needsUpload()) this.appendProgress()

    if (this.preview) this.preview.render()
    if (!this.preview) this.renderFileSize()

    this.renderContent()
    this.renderControls()

    return this
  },

  renderFileSize () {
    const size = this.model.getSize()
    if (size > 0) this.$('.filesize').text(strings.fileSize(size, 1))
  },

  renderContent () {
    this.$('.filename')
      .attr('title', this.model.getTitle())
      .text(this.model.getShortTitle(_.device('smartphone') ? 23 : 50))
  },

  renderControls () {
    this.$el.append(
      $('<button type="button" class="btn btn-link remove-attachment">')
        .attr('title', gt('Remove attachment "%1$s"', this.model.get('name')))
        .attr('data-filename', this.model.get('name'))
        .attr('tabindex', '-1')
        .append(createIcon('bi/dash-circle.svg').addClass('text-xl'))
    )
  }
})

export default {
  List,
  View,
  Preview,
  // export for convenience
  Model: backbone.Model,
  Collection: backbone.Collection
}
