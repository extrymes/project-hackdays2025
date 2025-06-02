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
import DisposableView from '@/io.ox/backbone/views/disposable'
import TypeaheadView from '@/io.ox/core/tk/typeahead'
import { ParticipantModel } from '@/io.ox/participants/model'
import { getInitials } from '@/io.ox/contacts/util'
import { pictureHalo } from '@/io.ox/contacts/api'

import { createButton, createIcon } from '@/io.ox/core/components'
import { settings } from '@/io.ox/core/settings'
// load extensions for point 'io.ox/participants/add'
import '@/io.ox/participants/add'
import '@/io.ox/participants/style.scss'
import gt from 'gettext'

export const DelegateView = DisposableView.extend({

  className: 'delegate-wrapper flex-row items-center',

  initialize (options) {
    this.options = { ...options }
    this.isGroup = this.model.get('group')

    this.listenTo(this.model, 'change', this.render)
    this.listenTo(this.model, 'remove', this.remove)
    this.$el.addClass(this.isGroup ? 'group' : 'user')
  },

  render () {
    const email1 = this.model.get('email1')
    this.$el.empty().attr({ 'data-cid': this.model.cid }).append(
      $('<div class="flex-grow zero-min-width">').append(
        $('<div class="ellipsis">').append(
          this.isGroup
            ? $('<a href="#" role="button" data-detail-popup="group">')
              .data(this.model.pick('id', 'members'))
            // #. %1$s: name of a user group
              .text(gt('Group: %1$s', this.model.get('display_name')))
            : $('<a href="#" role="button" data-detail-popup="halo">')
              .data({ email1 })
              .text(this.model.get('display_name'))
        )
      )
    )
    this.trigger('render')
    return this
  }
})

export const DelegateDetailView = DisposableView.extend({

  className: 'delegate-wrapper flex-row items-center removable mb-8',

  events: {
    'click .btn.remove': 'onRemove',
    'keydown .btn.remove': 'onKeyDown'
  },

  initialize () {
    this.isGroup = this.model.get('group')
    this.listenTo(this.model, 'change', this.render)
    this.listenTo(this.model, 'remove', this.remove)
    this.$el.addClass(this.isGroup ? 'group' : 'user')
  },

  render () {
    this.$el.empty()
      .attr({ 'data-cid': this.model.cid })
      .append(
        this.getImageNode(),
        $('<div class="details-container flex-grow zero-min-width">').append(
          this.getNameRow(),
          this.getDetailRow()
        ),
        $('<div class="actions-container center-children">').append(
          // #. %1$s is persons or group display name
          createButton({ variant: 'link', icon: { name: 'bi/x-lg.svg', title: gt('Remove %1$s', this.model.get('display_name')), className: 'bi-16' } }).addClass('remove')
        )
      )
    this.trigger('render')
    return this
  },

  getImageNode () {
    // toJSON would filter specific attributes
    const data = { ...this.model.attributes }
    return pictureHalo(
      $('<div class="contact-photo mr-8" aria-hidden="true">').append(
        $('<span class="initials">').append(
          getInitials(data)
        )
      ), data, { width: 40, height: 40, fallback: false })
  },

  getNameRow () {
    return $('<div class="ellipsis text-bold">').text(this.model.get('display_name'))
  },

  getDetailRow () {
    const email1 = this.model.get('email1')
    const node = $('<div class="ellipsis text-gray">').text(email1)

    if (!this.isGroup) return node
    const groupMembersCount = (this.model.get('members') || []).length
    return node.text(groupMembersCount === 0
      ? gt('No member')
      : gt.ngettext('%1$n member', '%1$n members', groupMembersCount, groupMembersCount)
    )
  },

  onKeyDown (e) {
    if (e.which !== 46 && e.which !== 8) return
    // del or backspace
    this.onRemove(e)
  },

  onRemove (e) {
    e.preventDefault()
    this.model.collection.remove(this.model)
  }
})

export const DelegatesView = DisposableView.extend({

  initialize (options) {
    this.options = { noEntries: gt('This list has no entries yet'), ...options }

    this.listenTo(this.collection, 'add remove', (model, collection, options) => {
      this.toggleLabels()
      if (!options || !options.add) return
      this.renderMember(model)
    })
  },

  toggleLabels () {
    const isEmpty = !this.collection.getDelegates().length
    this.$empty.toggleClass('hidden', !isEmpty)
  },

  render () {
    this.$el.empty().append(
      this.$empty = $('<div class="italic text-gray pb-16">').text(this.options.noEntries),
      this.$ul = $('<ul class="list-unstyled">')
    )
    this.toggleLabels()
    this.renderList()
    return this
  },

  renderMember (model) {
    const view = this.options.editable
      ? new DelegateDetailView({ tagName: 'li', model })
      : new DelegateView({ tagName: 'li', model })

    view.on('render', () => this.collection.trigger('render'))

    this.$ul.append(view.render().$el)
  },

  renderList () {
    this.$ul.empty()
    return this.collection.fetch().then(() => {
      this.collection.getDelegates().forEach(this.renderMember.bind(this))
    })
  }

})

export const AddDelegateView = DisposableView.extend({

  className: 'add-members',

  initialize (options = {}) {
    const view = this
    this.options = options

    this.typeahead = new TypeaheadView({
      apiOptions: { users: true, groups: true },
      extPoint: 'io.ox/participants/add',
      direction: 'dropup',
      reduce (list) {
        // remove group with id 0 (all users)
        return list.filter(data => { return data.type !== 'group' || data.id !== 0 })
      },
      harmonize (result) {
        const loadModels = result
          // ignore users mail addresses other than email1
          .filter(item => { return item.type !== 'user' || item.field === 'email1' })
          .map(data => { return new ParticipantModel(data).loading })
        return $.when(...loadModels).then((...models) => { return models })
      },
      click (e, model) {
        view.addMember(model.toJSON())
      }
    })

    if (this.options.scrollIntoView) {
      // ensure list is in visible area
      this.collection.on('add remove reset', _.debounce(() => {
        // defer to ensure list is rendered
        setTimeout(() => this.typeahead.el.scrollIntoView(), 0)
      }, 0))

      // ensure suggestion dropdown is in visible area
      this.listenTo(this.typeahead, 'typeahead-custom:dropdown-rendered', () => {
        const target = this.$el.find('.tt-dropdown-menu')
        if (!target.length || !target.is(':visible')) return
        const container = target.scrollParent()
        const position = target.offset().top - container.offset().top
        if ((position < 0) || (position + target.height() > container.height())) {
          const offset = 16
          container.scrollTop(container.scrollTop() + position - offset)
        }
      })
    }
  },

  render () {
    const guid = _.uniqueId('form-control-label-')

    this.$el.empty().append(
      $(`<label for="${guid}" class="text-gray">`).text(gt('Add delegates')),
      $('<div class="input-group">').append(
        this.typeahead.$el.attr({ id: guid }),
        $('<span class="input-group-btn">').append(
          $(`<button type="button" class="btn btn-default" aria-label="${gt('Select users')}">`).append(
            createIcon('bi/ox-address-book.svg').attr('title', gt('Select users'))
          ).on('click', this.openAddressBookPicker.bind(this))
        )
      )
    )

    this.typeahead.render()

    return this
  },

  openAddressBookPicker (e) {
    e.preventDefault()
    const view = this
    // hint enterprise picker does not lists user groups
    const loadPicker = settings.get('features/enterprisePicker/enabled', false)
      ? import('@/io.ox/contacts/enterprisepicker/dialog')
      : import('@/io.ox/contacts/addressbook/popup')

    loadPicker.then(({ default: picker }) => {
      picker.open(view.addMember.bind(view), { useGABOnly: true, hideResources: true })
    })
  },

  addMember (data) {
    this.collection.add(data, { parse: true })
  }
})
