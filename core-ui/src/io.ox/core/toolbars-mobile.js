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
import Backbone from '@/backbone'
import gt from 'gettext'

import ext from '@/io.ox/core/extensions'

/*
     * Abstract Barview
     * Just a superclass for toolbar and navbar
     * Holds some shared
     */
const BarView = Backbone.View.extend({
  show () {
    this.$el.show()
    return this
  },
  hide () {
    this.$el.hide()
    return this
  }
})

/*
     * Navbars
     * Placed at the top of a page to handle navigation and state
     * Some Navbars will get action buttons as well, inspired by iOS
     */
const NavbarView = BarView.extend({

  tagName: 'div',

  className: 'toolbar-content',

  /*
   * only buttons which do NOT include the .custom class
   * will trigger the navbars onLeft and onRight events
   * For custom actions and links in navbar one must include
   * the .custom class to prevent the view to kill the clickevent
   * early and spawn a onLeft or onRight action
   */
  events: {
    'click .navbar-action.right:not(.custom)': 'onRightAction',
    'click .navbar-action.left:not(.custom)': 'onLeftAction'
  },

  initialize (opt) {
    this.title = (opt.title) ? opt.title : ''
    this.left = (opt.left) ? opt.left : false
    this.right = (opt.right) ? opt.right : false
    this.baton = opt.baton// || ext.Baton({ app: opt.app });
    this.extension = opt.extension
    this.hiddenElements = []
    this.rendered = false
  },

  render () {
    this.$el.empty()
    this.rendered = true
    const app = this.baton?.app
    const page = app?.pages.getCurrentPage()
    const isSearching = app?.props?.get('searching')
    const isListView = page?.name === 'listView' ||
        (app?.getName() === 'io.ox/calendar' && page?.name === 'list') ||
        (app?.getName() === 'io.ox/files' && page?.name === 'main')
    const showSearchResult = isSearching && isListView
    ext.point(this.extension).invoke('draw', this, {
      left: showSearchResult ? false : this.left,
      right: showSearchResult ? false : this.right,
      title: showSearchResult ? gt('Search results') : this.title,
      baton: this.baton
    })

    // hide all hidden elements
    this.$el.find(this.hiddenElements.join()).hide()

    return this
  },
  setLeft ($node) {
    this.left = $node
    this.render()
    return this
  },

  setTitle (title) {
    this.title = title
    this.render()
    return this
  },

  setRight ($node) {
    this.right = $node
    this.render()
    return this
  },

  onRightAction (e) {
    e.preventDefault()
    // e.stopImmediatePropagation()
    this.trigger('rightAction')
  },

  onLeftAction (e) {
    e.preventDefault()
    // e.stopImmediatePropagation()
    this.trigger('leftAction')
  },

  hide (elem) {
    this.hiddenElements.push(elem)
    this.hiddenElements = _.uniq(this.hiddenElements)
    this.render()
    return this
  },

  show (elem) {
    this.hiddenElements = _.without(this.hiddenElements, elem)
    this.render()
    return this
  },

  setBaton (baton) {
    this.baton = baton
    this.render()
    return this
  },

  toggle (state) {
    this.$el.toggle(state)
  }
})

/*
     * Toolbars
     * Will be placed at the bottom of a page to
     * hold one ore more action icons/links
     */
const ToolbarView = BarView.extend({

  initialize (opt) {
    this.page = opt.page
    this.baton = opt.baton// || ext.Baton({ app: opt.app });
    this.extension = opt.extension
  },
  render () {
    this.$el.empty()
    ext.point(this.extension + '/' + this.page).invoke('draw', this.$el, this.baton)
    return this
  },
  setBaton (baton) {
    this.baton = baton
    this.render()
    return this
  }
})

export default {
  BarView,
  NavbarView,
  ToolbarView
}
