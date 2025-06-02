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

import Backbone from '@/backbone'
import $ from '@/jquery'
import _ from '@/underscore'
import moment from '@open-xchange/moment'

import DisposableView from '@/io.ox/backbone/views/disposable'
import contactsAPI from '@/io.ox/contacts/api'
import * as util from '@/io.ox/contacts/util'
import presence from '@/io.ox/switchboard/presence'
import lookup from '@/io.ox/switchboard/lookup'
import call from '@/io.ox/switchboard/call/api'
import ext from '@/io.ox/core/extensions'
import { settings } from '@/io.ox/switchboard/settings'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'
import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'

// CallHistory Model
// - [email] <string>
// - [number] <string>
// - type <string>: zoom, jitsi, phone
// - date <int>: Call date+time
// - incoming <bool>
// - missed <bool>
// - [name] <string>: Caller/callee name (optional)

const point = ext.point('io.ox/switchboard/call-history/data')
const historyLimit = settings.get('callHistory/limit', 50)
const CallHistoryCollection = Backbone.Collection.extend({ comparator: 'date' })
const callHistory = new CallHistoryCollection()

const CallHistoryView = DisposableView.extend({
  tagName: 'li',
  className: 'launcher dropdown call-history',
  events: {
    'click [data-action="all"]': 'showAll',
    'click [data-action="missed"]': 'showMissed'
  },
  initialize () {
    const entries = settings.get('callHistory/entries') || []
    this.collection.add(entries)
    this.onAddRemove = _.debounce(this.onAddRemove.bind(this), 10)
    this.listenTo(this.collection, 'add remove reset', this.onAddRemove)
    this.onChange = _.debounce(this.onChange.bind(this), 10)
    this.listenTo(this.collection, 'change', this.onChange)
    this.opened = false
    point.invoke('load', this)
  },
  render () {
    this.$el.attr('role', 'presentation').append(
      $('<button type="button" class="dropdown-toggle btn btn-toolbar btn-topbar" data-toggle="dropdown" tabindex="-1" aria-haspopup="true" aria-expanded="false" role="button">')
        .attr('aria-label', gt('Call history'))
        .on('mousedown', this.onMousedown.bind(this))
        .on('click', this.onOpen.bind(this))
        .one('click', this.onFirstOpen.bind(this))
        .append(
          $('<div aria-hidden="true">').attr('title', gt('Call history')).append(
            createIcon('bi/telephone.svg'),
            this.$indicator = $('<svg height="8" width="8" class="indicator" focusable="false" aria-hidden="true"><circle cx="4" cy="4" r="4"></svg>')
          )
        ),
      this.$ul = $('<ul class="dropdown-menu dropdown-menu-right" role="menu">').append(
        this.$header = $('<li class="header" role="none">').append(
          $('<div class="header-caption">')
            .text(gt('Call History')),
          $('<div class="header-controls" role="none">').append(
            $('<button type="button" class="btn btn-link" data-action="all" role="menuitem">')
              .text(gt.pgettext('call-history', 'All')),
            $('<button type="button" class="btn btn-link" data-action="missed" role="menuitem">')
              .text(gt.pgettext('call-history', 'Missed'))
          )
        )
      )
    )
    this.updateIndicator()
    return this
  },
  onMousedown (e) {
    // prevents closing dropdown on mousedown => only close on click
    e.preventDefault()
  },
  onFirstOpen () {
    this.opened = true
    point.invoke('initialize', this)
    this.renderItems()
  },
  onOpen () {
    settings.set('callHistory/lastSeen', _.now()).save()
    this.updateIndicator()
  },
  onAddRemove () {
    this.updateIndicator()
    this.onChange()
    if (!this.opened) return
    this.removeItems()
    this.renderItems()
  },
  onChange () {
    point.invoke('store', this)
  },
  renderItems () {
    this.collection.slice(-historyLimit).reverse().forEach(function (model) {
      this.$ul.append(new CallHistoryItem({ model }).render().$el)
    }, this)
  },
  updateIndicator () {
    const lastSeen = settings.get('callHistory/lastSeen', 0)
    const hasUnseen = this.collection.some(function (model) {
      return model.get('missed') && model.get('date') > lastSeen
    })
    this.$indicator.toggleClass('hidden', !hasUnseen)
    this.$el.find('.dropdown-toggle').toggle(this.collection.length > 0)
  },
  removeItems () {
    this.$ul.children().slice(1).remove()
  },
  showAll (e) {
    e.stopPropagation()
    this.$('.dropdown-menu > li[role="presentation"]').slideDown(300)
  },
  showMissed (e) {
    e.stopPropagation()
    this.$('.dropdown-menu > li[role="presentation"]:not(.missed)').slideUp(300)
  }
})

const CallHistoryItem = DisposableView.extend({
  tagName: 'li',
  className: 'call-history-item',
  events: {
    'click a': 'onClick'
  },
  initialize () {
    this.type = this.model.get('type')
    this.listenTo(this.model, 'remove', this.onRemove)
    this.listenTo(this.model, 'change:name change:email', this.onChange)
    this.$el.attr('role', 'presentation')
    this.fetchMissingData()
  },
  fetchMissingData () {
    if (this.model.get('name')) return
    point.invoke('fetch', this)
  },
  updateMissingData (data) {
    if (!data) return
    if (this.disposed) return
    this.model.set({
      email: data.email1 || data.email2 || data.email3,
      name: util.getFullName(data)
    })
  },
  render () {
    this.$el
      .empty()
      .attr('title', this.getTooltip())
      .toggleClass('missed', this.model.get('missed'))
      .append(
        this.createLink().append(
          this.createIcon(),
          this.createPicture(),
          this.createPresence(),
          $('<div>').append(
            $('<span class="date">').text(this.getDate()),
            $('<div class="name ellipsis">').text(this.getName())
          ),
          $('<div class="caption ellipsis">').text(this.getCaption())
        )
      )
    return this
  },
  createLink () {
    const $a = $('<a href="#" role="menuitem" draggable="false">')
    if (this.type === 'phone') $a.attr('href', 'callto:' + this.model.get('number'))
    $a.attr('tabindex', this.model === _(this.model.collection.models).last() ? 0 : -1)
    return $a
  },
  createIcon () {
    if (this.model.get('missed')) return $('<span class="call-icon" aria-hidden="true">').append(createIcon('bi/exclamation.svg'))
    if (!this.model.get('incoming')) return $('<span class="call-icon" aria-hidden="true">').append(createIcon('bi/telephone-outbound.svg'))
    return $()
  },
  createPicture () {
    const email = this.model.get('email')
    if (!email) return $('<div class="contact-photo">')
    const options = { email }
    return contactsAPI.pictureHalo($('<div class="contact-photo">'), options, { width: 32, height: 32 })
  },
  createPresence () {
    const email = this.model.get('email')
    if (!email) return $('<span class="presence">')
    return presence.getPresenceDot(email)
  },
  getTooltip () {
    const missed = this.model.get('missed')
    const incoming = this.model.get('incoming')
    const name = this.model.get('name') || this.model.get('number') || this.model.get('email')
    if (missed) return gt('Missed call from %1$s', name)
    if (incoming) return gt('Answered call from %1$s', name)
    return gt('You called %1$s', name)
  },
  getDate () {
    const t = this.model.get('date')
    const isToday = moment().isSame(t, 'day')
    if (isToday) return moment(t).format('LT')
    const sameWeek = moment().isSame(t, 'week')
    if (sameWeek) return moment(t).format('dddd')
    return moment(t).format('l')
  },
  getName () {
    return this.model.get('name') || this.model.get('number') || this.model.get('email') || gt('Unknown')
  },
  getCaption () {
    switch (this.type) {
      // #. used for unknown callers in our call history
      case 'phone': return this.model.get('name') ? this.model.get('number') : gt('Unknown')
      case 'jitsi': return jitsiSettings.get('productName')
      case 'zoom': return 'Zoom'
      // no default
    }
  },
  onChange () {
    this.render()
  },
  onRemove () {
    this.$el.remove()
  },
  onClick (e) {
    point.invoke('action', this, e)
  }
})

// helper: is zoom (or jitsi)
const isZoom = /^(zoom|jitsi)$/i

// allow other implementations to add data
ext.point('io.ox/switchboard/call-history/data').extend(
  {
    id: 'default',
    index: 100,
    initialize () {
      lookup.initialize()
    },
    store () {
      const entries = this.collection.toJSON().filter(function (data) {
        return isZoom.test(data.type)
      })
      settings.set('callHistory/entries', entries.slice(-historyLimit)).save()
    },
    fetch () {
      if (!isZoom.test(this.type)) return
      lookup.findByEmail(this.model.get('email'))
        .done(this.updateMissingData.bind(this))
    },
    action (e) {
      if (!isZoom.test(this.type)) return
      e.preventDefault()
      call.start(this.type, this.model.get('email'))
    }
  },
  {
    id: 'phone',
    index: 200,
    initialize () { },
    fetch () {
      if (this.type !== 'phone') return
      lookup.findByNumber(this.model.get('number'))
        .done(this.updateMissingData.bind(this))
    }
  }
)

// make views accessible
callHistory.view = new CallHistoryView({ collection: callHistory }).render()
callHistory.lookup = lookup
callHistory.settings = settings
window.callHistory = callHistory
// make prototype accessible
callHistory.CallHistoryItem = CallHistoryItem

export default callHistory
