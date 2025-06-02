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

import DisposableView from '@/io.ox/backbone/views/disposable'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import '@/io.ox/backbone/mini-views/settings-list-view.scss'

import gt from 'gettext'

const ListItemView = DisposableView.extend({

  tagName: 'li',

  className: 'settings-list-item items-center',

  initialize (opt) {
    this.opt = _.extend({
      titleAttribute: 'title', // that attribute of the model will be rendered as title
      customize: $.noop // a function to customize a list item
    }, opt)
  },

  render () {
    this.$el.empty()
      .addClass(this.opt.sortable ? 'draggable' : '')
      .attr('draggable', this.opt.sortable)
      .append(
        this.opt.sortable ? listUtils.dragHandle(gt('Drag to reorder items')) : null,
        listUtils.makeTitle(this.model.get(this.opt.titleAttribute)).addClass('flex-col flex-grow'),
        listUtils.makeControls()
      )
    this.opt.customize.call(this, this.model)
    return this
  }
})

const dragSupport = (function () {
  let $current, $placeholder, indexBefore

  function deferCSS (elem, attrs, condition) {
    if (!condition) return elem.css(attrs)
    _.defer(function () {
      elem.css(attrs)
    })
  }

  return {
    events: {
      'dragstart li': 'onDragStart',
      'dragenter li': 'onDragEnter',
      dragover: 'onDragOver',
      dragend: 'onDragEnd',
      'drop li': 'onDrop'
    },

    onDragStart (e) {
      const originalEvent = e.originalEvent
      $current = $(e.currentTarget)
      indexBefore = $current.index()
      const offset = $current.offset()

      // create a placeholder and place it outside the screen
      if (originalEvent.dataTransfer.setDragImage) {
        $placeholder = $current.clone()
        $placeholder.css({ position: 'absolute', width: $current.width() })
        // defer placement of the placeholder, because edge can then create a correct snapshot
        deferCSS($placeholder, { top: '-100px', 'z-index': -1000 }, !!_.browser.edge || !!_.browser.safari)
        $current.after($placeholder)
        originalEvent.dataTransfer.setDragImage($placeholder.get(0), e.pageX - offset.left, e.pageY - offset.top)
      }

      originalEvent.dataTransfer.setData('text', '') // need to set data for transfer. Otherwise firefox will ignore d&d. Needs to be 'text', otherwise IE11 will crash

      // update visibility of current.
      $current.css({ opacity: '0.2' }).attr('aria-grabbed', true)

      // set aria drop effect
      this.$('> li').attr('aria-dropeffect', 'copy')
    },

    onDragEnter (e) {
      const $target = $(e.currentTarget)
      const listItem = $target.closest('li.settings-list-item')
      if (listItem.length === 0) return
      if (listItem.is($current)) return

      if (listItem.index() < $current.index()) listItem.before($current)
      else listItem.after($current)
    },

    onDragOver (e) {
      e.originalEvent.dataTransfer.effectAllowed = 'move'
      e.preventDefault()
      e.stopPropagation()
      return false
    },

    onDragEnd () {
      if ($placeholder) $placeholder.remove()
      $placeholder = undefined

      $current.css('opacity', '').attr('aria-grabbed', false)
      this.$('> li').removeAttr('aria-dropeffect')

      if (indexBefore !== $current.index()) this.trigger('order:changed')
    },

    onDrop (e) {
      // stops some browsers from redirecting
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }
})()

export default DisposableView.extend(dragSupport).extend({

  tagName: 'ol',

  className: 'list-unstyled settings-list-view',

  events: _.extend({
    'click *[data-action]': 'onClickAction',
    'keydown .drag-handle': 'onKeydown',
    'blur .drag-handle': 'onBlurDragHandle'
  }, dragSupport.events),

  initialize (opt) {
    this.opt = _.extend({
      sortable: false, // adds a drag handler in the front
      ChildView: ListItemView, // the view for any model in the list
      childOptions: $.noop, // a function that returns options for any ChildView
      containment: undefined, // a container, which is used by the sortable plugin
      controls: [], // a list of controls
      notification: $(), // an element, which will receive notification text,
      filter () { return true }, // a filter function to determine, which models should be rendered
      update: $.noop, // a function which is called, after the order of the visual elements has been changed
      dataIdAttribute: 'data-id'
    }, opt)

    // list view must have a collection
    if (!this.collection) this.collection = new Backbone.Collection()
    this.renderChildViews = _.debounce(this.renderChildViews, 0)
    this.listenTo(this.collection, 'set reset', this.render.bind(this))
    this.listenTo(this.collection, 'change sort', this.renderChildViews)
    this.listenTo(this.collection, 'add', this.onAdd.bind(this))
    this.listenTo(this.collection, 'remove', this.onRemove.bind(this))
  },

  createOrGetView (id, opt) {
    if (!this.views[id]) {
      this.views[id] = new this.opt.ChildView(opt)
    }

    return this.views[id]
  },

  render () {
    this.$el.empty()
    this.views = {}
    this.renderChildViews()
    return this
  },

  getChildOptions (model) {
    if (_.isFunction(this.opt.childOptions)) return this.opt.childOptions(model, this)

    return this.opt.childOptions
  },

  renderChildViews () {
    if (this.disposed) return

    const self = this
    let list = this.collection.filter(this.opt.filter)

    if (this.collection?.opt?.sortById) list = list.sort((a, b) => parseInt(a.get('id')) - parseInt(b.get('id')))

    list.forEach(function (model) {
      // some collection don't have the standard id attribute (accounts for example see Bug 50219)
      const id = model.get(model.idAttribute)
      const view = self.createOrGetView(id, _.extend({
        model,
        sortable: self.opt.sortable
      }, self.getChildOptions(model)))

      self.$el.append(
        view.render().$el.attr(self.opt.dataIdAttribute, id)
      )

      if (self.opt.sortable) {
        const descriptionId = _.uniqueId('aria-description-')
        view.$el.attr({
          tabindex: 0,
          'aria-describedby': descriptionId
        }).prepend($('<div class="sr-only">').attr('id', descriptionId).text(gt('Use cursor keys to reorder items')))
      }
    })
  },

  onAdd (model) {
    if (!this.opt.filter(model)) return

    const id = model.get(model.idAttribute)
    const index = this.collection.indexOf(model)
    const insertBefore = this.$el.find('> li:nth-child(' + (index + 1) + ')')
    const view = this.createOrGetView(id, _.extend({
      model,
      sortable: this.opt.sortable
    }, this.getChildOptions(model)))

    view.render().$el.attr(this.opt.dataIdAttribute, id)

    if (insertBefore.length > 0) insertBefore.before(view.$el)
    else this.$el.append(view.$el)

    this.trigger('add', view)
  },

  onRemove (model) {
    const id = model.get(model.idAttribute)
    if (!this.views[id]) return
    this.trigger('remove', this.views[id])
    this.views[id].remove()
    delete this.views[id]
  },

  onClickAction (e) {
    const event = $(e.currentTarget).attr('data-action')
    this.trigger(event, e)
    e.preventDefault()
  },

  onKeydown (e) {
    const target = $(e.target)
    // toggle state on enter or space
    if (e.which === 13 || e.which === 32) {
      target.toggleClass('selected')
      target.attr('aria-pressed', target.hasClass('selected'))
      return
    }

    if (!target.hasClass('selected')) return

    this.onKeydownDragHandle(e)
  },

  onKeydownDragHandle (e) {
    const self = this
    const target = $(e.currentTarget)
    const current = $(e.currentTarget).closest('.draggable')
    const items = self.$el.children('.draggable')
    const index = items.index(current)
    const id = current.attr(this.opt.dataIdAttribute)

    function cont (curIndex) {
      const newText = gt('%1$s moved to position %2$s of %3$s', current.find('.list-item-title').text(), curIndex + 1, items.length)
      const oldText = self.opt.notification.text()
      self.trigger('order:changed')
      if (target.hasClass('drag-handle')) {
        self.$el.find(`[${self.opt.dataIdAttribute}="${CSS.escape(id)}"] .drag-handle`).focus().addClass('selected')
      } else {
        self.$el.find(`[${self.opt.dataIdAttribute}="${CSS.escape(id)}"]`).focus()
      }
      // the selection of aria-relevant is important, because if the same text should be read to the user, aria-relevant="all" is required
      // if other text will be inserted in the notification, "all" would cause the screen reader to read the old and the new text
      self.opt.notification
        .attr('aria-relevant', newText === oldText ? 'all' : 'additions text')
        .text(newText)
    }

    switch (e.which) {
      case 38:
        if (index > 0) {
          // up
          e.preventDefault()
          current.insertBefore(current.prevAll('.draggable:first'))
          cont(index - 1)
        }
        break
      case 40:
        if (index < items.length) {
          // down
          e.preventDefault()
          current.insertAfter(current.nextAll('.draggable:first'))
          cont(index + 1)
        }
        break
      default:
        break
    }
  },

  onBlurDragHandle (e) {
    $(e.currentTarget).removeClass('selected')
  }

})
