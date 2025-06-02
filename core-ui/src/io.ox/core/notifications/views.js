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
import api from '@/io.ox/core/notifications/api'
import gt from 'gettext'
import DisposableView from '@/io.ox/backbone/views/disposable'
import a11y from '@/io.ox/core/a11y'
import DOMPurify from 'dompurify'

import { createIcon } from '@/io.ox/core/components'
import { hasFeature } from '@/io.ox/core/feature'

// Order is important
const categories = {
  reminder: gt('Reminders'),
  // #. label for a category of notifications (user needs to approve the use of a room or car etc)
  resource: gt('Resource booking requests'),
  invitation: gt('Invitations'),
  overdueTasks: gt('Overdue Tasks'),
  birthdays: gt('Birthdays'),
  general: gt('General')
}

if (!hasFeature('managedResources')) delete categories.resource

export const MainView = DisposableView.extend({
  tagName: 'aside',
  className: 'io-ox-notifications',
  attributes: {
    role: 'complementary',
    'aria-label': gt('Notification area')
  },

  events: {
    keydown: 'onKeydown'
  },

  initialize (options = {}) {
    this.options = options
    this.views = Object.keys(categories).map(id => new CategoryView({ id, label: categories[id] }))
  },

  // used to bind render events at a later stage. They are bound on the first open. There is no need to rerender if the notification area was not opened yet
  bindEvents () {
    if (this.bound) return
    this.listenTo(api.collection, 'fetch:done remove change notificationReady', this.renderCategories)
    this.bound = true
  },

  render () {
    this.$el.append(
      $(`<div class="empty-message center-children" tabindex="0">${gt('No notifications')}</div>`),
      this.views.map(category => category.$el)
    )
    this.renderCategories()
    return this
  },

  renderCategories: _.throttle(function () {
    // no need to render invisible views
    if (!this.$el.hasClass('visible')) {
      // delay until next opening of notification area
      this.delayedRendering = true
      return this
    }

    // failsafe, no delayed rendering if view is visible
    this.delayedRendering = false
    this.$el.busy()
    // remove empty class. Looks strange in combination with busy animation
    this.$el.removeClass('empty')
    // collection is currently fetching data. Just leave the view busy. fetch:done will trigger a redraw
    if (api.collection.fetching) return this

    this.views.forEach(view => view.render())

    this.$el.toggleClass('empty', api.collection.length === 0 || this.$('.category:visible').length === 0)

    // focus first tabbable element
    if ($(document.activeElement).is('button.btn.btn-toolbar.btn-topbar, .empty-message, body')) {
      this.restoreFocus()
    }

    this.$el.idle()
    return this
  }, 200),

  restoreFocus () {
    if (!this.$el.hasClass('visible')) return

    a11y.getTabbable(this.$el).first()?.focus()
  },

  // dynamic default (opposite of current visibility state), because it should toggle if no argument is given
  toggle (newVisibilityState = !this.$el.hasClass('visible')) {
    const previousVisibilityState = this.$el.hasClass('visible')
    // there are no css transitions on smartphones, so this event handler (helps with reduced motion a11y) wouldn't work
    if (!_.device('smartphone')) {
      // avoid dangling event handlers from very fast toggling
      this.$el.off('transitionend')
      if (newVisibilityState) this.$el.show()
      else this.$el.one('transitionend', () => this.$el.hide())
    }

    this.$el.toggleClass('visible', newVisibilityState)

    // render categories if we have postponed it until now. No need to render invisible views.
    if (this.delayedRendering && newVisibilityState) this.renderCategories()
    // no change, don't trigger an event (avoid infinite loops)
    if (previousVisibilityState === newVisibilityState) return
    this.trigger('main:visibility-change', newVisibilityState)
  },

  onKeydown (e) {
    const tabbableItems = a11y.getTabbable(this.$el)
    switch (e.which) {
      // escape key
      case 27:
        if (!this.$el.hasClass('visible')) return
        // one closed window per hit on esc is enough
        e.stopPropagation()
        this.toggle(false)
        break
      // tab key
      case 9:
        if (e.shiftKey) {
          if (e.target === tabbableItems[0]) {
            e.preventDefault()
            e.stopPropagation()
            tabbableItems[tabbableItems.length - 1].focus()
          }
          return
        }
        if (e.target === tabbableItems[tabbableItems.length - 1]) {
          e.preventDefault()
          e.stopPropagation()
          tabbableItems[0].focus()
        }
        break
      // no default
    }
  }
})

export const ToggleView = DisposableView.extend({

  events: {
    'click button': 'onClick',
    keydown: 'onKeydown'
  },

  render () {
    this.$el.empty().append(
      $('<button class="btn btn-toolbar btn-topbar">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Notifications')}">`).append(
          createIcon('bi/bell.svg')
        ),
        $('<svg height="8" width="8" class="indicator" focusable="false" aria-hidden="true"><circle cx="4" cy="4" r="4"></svg>')
      )
    )
    this.updateIndicator()
    return this
  },

  onClick () {
    this.trigger('main:toggle')
  },

  updateIndicator () {
    const unseen = api.collection.getUnseen().length
    const all = api.collection.length
    this.$el.toggleClass('show-indicator', !!unseen)

    this.$('button.btn-topbar').attr('title', () => {
      if (!all) return gt('There are no notifications')
      return unseen
        ? gt.ngettext('There is a new notification', 'There are %1$d new notifications', unseen, unseen)
        : gt.ngettext('There is a notification', 'There are %1$d notifications', all, all)
    })
  },

  onKeydown (e) {
    // escape key
    if (e.which !== 27) return
    // one closed window per hit on esc is enough
    e.stopPropagation()
    this.trigger('main:hide')
  }
})

export const CategoryView = DisposableView.extend({
  tagName: 'div',
  className: 'category',
  events: {
    'click .btn-category': 'toggle',
    'keydown .btn-category': 'toggle',
    keydown: 'onKeydown'
  },

  initialize (options = {}) {
    this.options = options
    this.expanded = true
  },

  updateSkeleton () {
    const models = api.collection.getCurrent(this.options.id)
    this.$el.toggleClass('expanded', this.expanded).toggleClass('hidden', !models.length)

    // just update existing counter
    const headlineNode = this.$('button[data-category]')
    if (headlineNode.length) return headlineNode.find('.counter').text(models.length)

    this.$el.append(
      $(`<button class="btn-category" aria-expanded="${this.expanded}" data-category="${this.options.id}">`).append(
        $('<h1 class="flex-center unstyled">').append(
          $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Toggle category')}">`).append(
            createIcon('bi/chevron-down.svg').addClass('icon-expanded'),
            createIcon('bi/chevron-right.svg').addClass('icon-collapsed')
          ),
          $(`<label class="category-label text-medium">${this.options.label || gt('Notifications')}</label>`),
          $(`<span class="counter badge rounded-pill flex-center">${models.length}</span>`)
        )
      ),
      this.contentNode = $('<div class="items" role="grid">')
    )
  },

  render () {
    let models = api.collection.getCurrent(this.options.id)
    if (this.options.id === 'reminder') models = models.filter(model => !!model.fetched)

    // if needed
    this.updateSkeleton()

    // remove items that are not in the collection anymore
    this.contentNode
      .find(`[data-col-cid]${models.map(model => `:not('[data-col-cid="${model.get('cid')}"]')`).join('')}`)
      .each((i, node) => node.closest('.item-container').remove())

    window.counter = window.counter || 0
    // render missing
    models.forEach((model, index) => {
      // we need this container to have the proper grid -> row-> gridcell pattern for a11y
      const View = registry[model.get('type')] || GeneralNotificationView
      const itemNode = $('<div role="row" class="item-container">').attr('data-counter', window.counter++).append(new View({ model }).render().$el)

      // item view already rendered
      const renderedNode = this.contentNode.find(`.item[data-col-cid="${model.get('cid')}"]`)
      if (renderedNode.length) {
        // no updates
        if (Object.keys(model.changed) <= 0) return
        // replace
        return renderedNode.replaceWith(itemNode.find('.item'))
      }
      // nth-child is 1 based, so we get the last successfully rendered item-container here
      const anchorNode = this.contentNode.find(`.item-container:nth-child(${index})`)
      if (!anchorNode.length) return this.contentNode.append(itemNode)
      anchorNode.after(itemNode)
    })

    return this
  },
  toggle (e) {
    // toggle state on enter or spacebar
    if (e.type === 'keydown' && !(e.which === 13 || e.which === 32)) return
    e.preventDefault()
    this.$el.toggleClass('expanded').find('button').attr('aria-expanded', !this.expanded)
    this.expanded = !this.expanded
    e.preventDefault()
  },

  onKeydown (e) {
    switch (e.which) {
      case 33: // page up
      case 38: // up arrow
        e.preventDefault()
        // don't fail if we are in the wrong node. Doing nothing is just fine
        e.target.closest('.item-container')?.previousSibling?.firstChild?.focus()
        break
      case 34: // page down
      case 40: // down arrow
        e.preventDefault()
        // don't fail if we are in the wrong node. Doing nothing is just fine
        e.target.closest('.item-container')?.nextSibling?.firstChild?.focus()
      // no default
    }
  }
})

export const BaseView = DisposableView.extend({
  events: {
    'click .btn[data-action]': 'onClick',
    'click a[data-name]': 'onClick',
    'click .location a': 'onClickLocation',
    keydown: 'onKeydown'
  },
  tagName: 'div',
  className: 'item focusable',
  attributes: {
    role: 'gridcell',
    tabindex: 0
  },
  initialize () {
    if (!this.model.get('type')) return
    this.$el.attr({
      'data-type': this.model.get('type'),
      'data-category': this.model.get('category'),
      // detail popup support
      'data-detail-popup': this.model.get('detail'),
      'data-cid': _.cid(this.model.pick('id', 'folder_id')),
      'data-col-cid': this.model.getAdapter().cid(this.model.toJSON())
    })
  },

  renderTitle (icon = createIcon('bi/clock.svg'), { closable = true } = {}) {
    if (!this.model.get('title')) return this
    this.$el.append(
      $('<div class="item-row">').append(
        $('<div class="icon-wrap flex-center" aria-hidden="true">').attr('title', this.model.get('label')).append(
          $('<div class="icon-background">'),
          icon.addClass('title-icon')
        ),
        $('<h2 class="title ellipsis-2-lines">').attr('title', this.model.get('title')).text(this.model.get('title')),
        closable
          ? $(`<button type="button" class="btn btn-toolbar close" data-action="close" aria-label=${gt('Close')}>`).append($(`<div aria-hidden="true" title="${gt('Close')}">`).append(createIcon('bi/x-lg.svg')))
          : ''
      )
    )
  },

  renderLocation () {
    const location = $.trim(this.model.get('location'))
    if (!location) return this
    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Location')}">`).append(
          createIcon('bi/geo-alt.svg').addClass('row-icon')
        ),
        $('<div class="location truncate">').attr('title', location).append(() => {
          if (!/^(https?:\/\/|www\.)/i.test(location)) return $.txt(location)
          const node = $(`<a target="_blank" rel="noopener" href="${encodeURI(decodeURI(location))}">`).text(location)
          return DOMPurify.sanitize(node.get(0), { ALLOW_TAGS: ['a'], ADD_ATTR: ['target'], RETURN_DOM_FRAGMENT: true })
        }
        )
      )
    )
    return this
  },

  renderDescription () {
    const description = this.model.get('note') || this.model.get('description')
    if (!description) return this
    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Description')}">`).append(
          createIcon('bi/justify-left.svg').addClass('row-icon')
        ),
        $('<div class="location">').attr('title', description).text(description)
      )
    )
  },

  // redirects clicks via api.collection to adapter
  onClick (e) {
    e.stopPropagation()
    const node = $(e.currentTarget)
    const actionname = node.attr('data-action') || node.attr('data-name')
    this.model.trigger('action', actionname, this.model, node.attr('data-value'))
    return false
  },

  // prevents detail popup
  onClickLocation: e => e.stopPropagation(),

  onKeydown (e) {
    switch (e.which) {
      case 13: // enter
      case 32: // space
        // only open detailview when main node is selected
        if (e.target !== this.$el[0]) return
        e.preventDefault()
        e.stopPropagation()
        this.$el.trigger('click')
        break
      case 8: // backspace
      case 46: // delete
        e.preventDefault()
        e.stopPropagation()
        this.model.trigger('action', 'close', this.model)
      // no default
    }
  }
})

export const GeneralNotificationView = BaseView.extend({
  render () {
    this.$el.empty()
    this.renderTitle()
    this.renderDescription()
    return this
  }
})

// for types
export const registry = {
  general: GeneralNotificationView
}
