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
import DisposableView from '@/io.ox/backbone/views/disposable'
import api from '@/io.ox/contacts/api'
import * as calendarUtil from '@/io.ox/calendar/util'
import { icon, buttonWithIcon, iconWithTooltip, elementWithTooltip } from '@/io.ox/core/components'
import ext from '@/io.ox/core/extensions'
import '@/io.ox/participants/style.scss'
import gt from 'gettext'

export const AttendeeView = DisposableView.extend({

  className: 'attendee flex-row py-4 px-8',

  events: {
    'click .remove': 'onRemove',
    'click .toggle-optional': 'onToggleOptional',
    keydown: 'fnKey'
  },

  options: {
    customize: $.noop,
    addHaloLink: true,
    showAvatar: false,
    showEmailAddress: true,
    showParticipationStatus: true,
    showOptionalButton: true,
    showRemoveButton: true
  },

  initialize (options = {}) {
    // using $.extend to skip undefined values
    this.options = $.extend({}, this.options, options)
    this.listenTo(this.model, 'change', function (model) {
      if (model && model.changed) this.render()
    })
    this.listenTo(this.model, 'remove', this.remove)
  },

  render () {
    if (ox.debug) console.debug('Attendee', this.model.toJSON())
    this.$el
      .empty()
      .attr({ 'data-cid': this.model.cid, 'data-uri': this.model.get('uri') })
      .append(
        // avatar image
        this.$image = this.options.showAvatar
          ? $('<div class="attendee-image me-16" aria-hidden="true">')
          : $(),
        // status
        this.$status = this.options.showParticipationStatus
          ? $('<div class="participation-status flex items-center me-16" aria-hidden="true">')
          : $(),
        // name, flags, and annotations
        $('<div class="flex-col justify-center truncate me-auto">').append(
          $('<div class="truncate flex flex-wrap">').append(
            this.$name = $(`<${this.options.addHaloLink ? 'a href="#"' : 'span'} class="attendee-name truncate me-8">`),
            this.$flags = $('<span class="flags">')
          ),
          this.$annotation = $('<div class="attendee-annotation text-gray truncate">')
        ),
        // buttons
        this.$optional = this.renderOptionalButton(),
        this.$remove = this.renderRemoveButton()
      )
    this.setCustomImage()
    this.setStatus()
    this.setDisplayName()
    this.setTypeStyle()
    this.options.customize.call(this)
    ext.point('io.ox/participants/view').invoke('render', this.$el, new ext.Baton({ view: this, model: this.model, isAttendee: true }))
    return this
  },

  renderOptionalButton () {
    if (!this.options.showOptionalButton) return $()
    const tooltip = this.model.isOptional() ? gt('Mark as required') : gt('Mark as optional')
    const $btn = buttonWithIcon({
      className: 'btn btn-toolbar toggle-optional flex items-center ms-16',
      icon: icon('bi/person.svg'),
      tooltip,
      screenReader: `${tooltip}: ${this.model.getDisplayName()}`
    })
    return $btn.hide()
  },

  renderRemoveButton () {
    if (!this.options.showRemoveButton) return $()
    const $btn = buttonWithIcon({
      className: 'btn btn-toolbar remove flex items-center ms-16',
      icon: icon('bi/x.svg').addClass('bi-18'),
      tooltip: gt('Remove'),
      screenReader: `${gt('Remove')}: ${this.model.getDisplayName()}`
    })
    return $btn.hide()
  },

  setDisplayName () {
    const name = this.model.getDisplayName(true)
    const email = this.model.get('email')
    // internal and external attendees look slightly different
    if (this.model.get('entity') || !this.options.showEmailAddress) {
      this.$name.html(name)
    } else {
      const plain = this.model.getDisplayName(false)
      const showEmailAddress = plain !== email
      this.$name.append(
        $.parseHTML(name), $.txt(' '),
        $('<span class="text-gray">').text(showEmailAddress ? `<${email}>` : '')
      )
    }
    const partStat = this.model.get('partStat')
    const participation = calendarUtil.getConfirmationLabel(partStat)
    this.$name.append($('<span class="sr-only">').text(', ' + participation))
  },

  setCustomImage () {
    const data = this.model.toJSON()
    const cuType = this.model.get('cuType') || 'INDIVIDUAL'
    api.pictureHalo(this.$image, data, { width: 32, height: 32 })
    this.$image.addClass(cuType.toLowerCase() + '-image')
  },

  setStatus () {
    if (!this.options.showParticipationStatus) return
    const partStat = this.model.get('partStat')
    const statusClass = calendarUtil.getConfirmationClass(partStat)
    this.$status.addClass(statusClass).append(
      iconWithTooltip({
        icon: icon(calendarUtil.getConfirmationSymbol(partStat)).addClass('bi-14'),
        tooltip: gt('Participation') + ': ' + calendarUtil.getConfirmationLabel(partStat)
      })
    )
  },

  isOrganizer () {
    return this.model.isOrganizer(this.options.baton?.model.toJSON())
  },

  isRemovable () {
    return this.model.isRemovable(this.options.baton?.model.toJSON())
  },

  setTypeStyle () {
    switch (this.model.getCuType()) {
      case 'INDIVIDUAL': {
        this.$el.attr('data-type', 'individual')
        if (this.isOrganizer()) {
          this.$flags.append(
            $('<span class="label label-subtle me-8">').text(gt('Organizer'))
          )
        }
        if (this.model.isOptional()) {
          this.$flags.append(
            elementWithTooltip({
              $el: $('<span class="label label-subtle subtle-green me-8">').text(gt('Optional')),
              tooltip: gt('Participation is optional')
            })
          )
        }
        this.$optional.show()
        this.$remove.show().prop('disabled', !this.isRemovable())
        const email = this.model.get('email')
        if (email && this.options.addHaloLink) {
          this.$name.attr('data-detail-popup', 'halo').data('email1', email)
        }
        break
      }
      case 'RESOURCE': {
        this.$el.attr('data-type', 'resource')
        this.$remove.show()
        if (this.options.addHaloLink) {
          let data = this.model.toJSON()
          if (data.resource) data = data.resource
          data.callbacks = {}
          if (this.options.baton && this.options.baton.callbacks) {
            data.callbacks = this.options.baton.callbacks
          }
          this.$name.attr('data-detail-popup', 'resource').data(data)
        }
        break
      }
      // no default
    }
  },

  fnKey (e) {
    // del or backspace
    if ((e.which === 46 || e.which === 8) && this.isRemovable()) this.onRemove(e)
  },

  onRemove () {
    this.model.collection.remove(this.model)
  },

  onToggleOptional () {
    this.model.toggleOptional()
  }
})

// so far only used by appointment edit!
export const AttendeeContainer = DisposableView.extend({

  className: 'attendee-container col-xs-12',

  options: {
    showHeadlines: true
  },

  initialize (options = {}) {
    this.options = _.extend({}, this.options, options)

    this.onSort = _.debounce(this.onSort.bind(this), 10)
    this.listenTo(this.collection, 'add', this.onAdd)
    this.listenTo(this.collection, 'reset', this.onReset)
    this.listenTo(this.collection, 'sort remove', this.onSort)

    const organizer = this.options?.baton?.model?.get('organizer')?.entity

    this.collection.comparator = function getSortKey (model) {
      const isOrganizer = model.get('entity') === organizer ? 0 : 1
      const isResource = model.isResource() ? 1 : 0
      return isOrganizer + '.' + isResource + '.' + model.getSortName()
    }

    const renderList = (shortcut, title) => {
      const id = _.uniqueId('h')
      const $h2 = this[`${shortcut}Header`] = $(`<h2 id="${id}" class="m-0 mb-8 font-normal text-sm text-gray">`)
      const $ul = this[shortcut] = $(`<ul class="list-unstyled m-0" aria-labelledby="${id}">`)
      return [
        $h2.toggleClass('sr-only', !this.options.showHeadlines).hide()
          .append(
            $('<span class="me-8">').text(title),
            $('<span class="label label-default">')
          ),
        $ul
      ]
    }

    this.$el.append(
      renderList('$participants', gt('Participants')),
      renderList('$resources', gt('Resources'))
    )

    this.$participantsHeader.addClass('mt-8')
    this.$resourcesHeader.addClass('mt-16')

    // avoid animations in first three seconds
    setTimeout($el => $el.addClass('animated'), 3000, this.$el)
  },

  render () {
    // render initial state
    this.collection.each(model => this.onAdd(model))
    this.onSort()
    return this
  },

  getModels () {
    const participants = []
    const resources = []
    this.collection.each(attendee => {
      switch (attendee.getCuType()) {
        case 'INDIVIDUAL': return participants.push(attendee)
        case 'RESOURCE': return resources.push(attendee)
      }
    })
    return { participants, resources }
  },

  onAdd (model) {
    // ignore groups
    if (model.getCuType() === 'GROUP') return
    const view = new AttendeeView({ model, tagName: 'li', ...this.options })
    // we just add to the DOM ignoring the right position; onSort will fix this
    this[model.isResource() ? '$resources' : '$participants'].append(
      view.render().$el.addClass('added').attr('data-cid', model.cid)
    )
    if (this.$el.hasClass('animated')) {
      setTimeout(() => view.$el.get(0)?.scrollIntoViewIfNeeded(true), 20)
    }
    // remove class again to trigger transition
    setTimeout($el => $el.removeClass('added'), 300, view.$el)
  },

  onReset () {
    this.$participants.empty()
    this.$resources.empty()
    this.collection.each(this.onAdd, this)
    // make sure we sort to also toggle sections (see OXUIB-2239)
    this.onSort()
  },

  onSort () {
    if (this.disposed) return
    const { participants, resources } = this.getModels()
    updateCount(this.$participantsHeader, participants.length)
    updateCount(this.$resourcesHeader, resources.length)
    sortList(this.$participants.get(0), participants)
    sortList(this.$resources.get(0), resources)

    function updateCount ($el, count) {
      $el.add($el.next()).toggle(count > 0)
      $el.find('.label').empty().toggle(count > 1).append(
        $('<span class="sr-only">').text(`, ${gt('Total')}: `),
        $.txt(count)
      )
    }

    function sortList (ul, entries) {
      // loop over collection in reverse order to be fast
      for (let i = entries.length - 1, previous; i >= 0; i--) {
        const model = entries[i]
        const el = ul.querySelector(`[data-cid="${model.cid}"]`)
        if (!el) continue
        if (previous) ul.insertBefore(el, previous); else ul.appendChild(el)
        previous = el
      }
    }
  }
})
