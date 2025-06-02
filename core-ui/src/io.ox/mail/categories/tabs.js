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
import api from '@/io.ox/mail/categories/api'
import mailAPI from '@/io.ox/mail/api'
import yell from '@/io.ox/core/yell'
import dnd from '@/io.ox/core/tk/list-dnd'
import { createButton } from '@/io.ox/core/components'

import gt from 'gettext'

const TabView = Backbone.View.extend({

  className: 'categories-toolbar-container',

  events: {
    'click .category button': 'onChangeTab',
    'click .configure-categories': 'onConfigureCategories',
    'contextmenu .categories': 'onConfigureCategories',
    'selection:drop .categories': 'onMove'
  },

  initialize (options) {
    // reference to app props
    this.props = options.props
    this.collection = api.collection

    this.$ul = $('<ul class="classic-toolbar categories p-0">')
      .attr({ role: 'toolbar', 'aria-label': gt('Inbox categories') })

    this.$el.append(this.$ul)

    // dnd
    dnd.enable({ draggable: true, container: this.$el, selection: this.selection, delegate: true, dropzone: true, dropzoneSelector: '.category' })

    // register events
    this.listenTo(api, 'move', this.openTrainNotification)
    this.listenTo(this.collection, 'update reset change', _.debounce(this.render, 200))
    this.listenTo(this.props, 'change:category_id', this.onCategoryChange)
  },

  render () {
    const current = this.props.get('category_id')
    this.$ul.empty().append(
      this.collection.map(model => {
        const count = model.getCount()
        const name = model.get('name')
        return $('<li class="category" role="presentation">').append(
          $('<button type="button" class="btn btn-toolbar flex-row" tabindex="-1">').append(
            $('<span class="category-name flex-grow truncate">').text(name),
            $('<span class="category-counter ms-8">').toggle(count > 0).append(
              $('<span class="counter">').text(count),
              $('<span class="sr-only">').text(gt('Unread messages'))
            )
          ),
          $('<div class="category-drop-helper flex-row" aria-hidden="true">').append(
            $('<div class="truncate">').text(name),
            $('<div class="text-bold truncate">').text(gt('Drop here'))
          )
        )
          .toggle(model.isEnabled())
          .toggleClass('selected', model.get('id') === current)
          .attr({ 'data-id': model.get('id') })
      }),
      $('<li role="presentation">').append(
        createButton({ variant: 'toolbar', icon: { name: 'bi/three-dots.svg', className: 'bi-16', title: gt('Configure categories') } })
          .addClass('configure-categories')
      )
    )
    this.$ul.find('li:first > button').removeAttr('tabindex')
    return this
  },

  onChangeTab (e) {
    const id = $(e.currentTarget).parent().attr('data-id')
    this.props.set('category_id', id)
  },

  onCategoryChange (props, id) {
    this.$('.category.selected').removeClass('selected')
    this.$(`.category[data-id="${CSS.escape(id)}"]`).addClass('selected')
  },

  onConfigureCategories (e) {
    e.preventDefault()
    import('@/io.ox/mail/categories/edit').then(function ({ default: dialog }) {
      dialog.open()
    })
  },

  onMove (e, baton) {
    // prevent execution of copy/move handler
    e.stopPropagation()

    const source = this.props.get('category_id')
    const target = baton.target
    const options = {
      data: mailAPI.resolve(baton.data),
      source,
      sourcename: this.collection.get(source).get('name'),
      target,
      targetname: this.collection.get(target).get('name')
    }

    api.move(options).fail(yell)
  },

  openTrainNotification (options) {
    import('@/io.ox/mail/categories/train').then(function ({ default: dialog }) {
      dialog.open(options)
    })
  }
})

export default TabView
