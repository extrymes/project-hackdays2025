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
import pModel from '@/io.ox/participants/model'
import pViews from '@/io.ox/participants/views'
import Typeahead from '@/io.ox/core/tk/typeahead'
import * as util from '@/io.ox/mail/util'
import * as contactsUtil from '@/io.ox/contacts/util'
import * as coreUtil from '@/io.ox/core/util'
import * as calendarUtil from '@/io.ox/calendar/util'
import yell from '@/io.ox/core/yell'
import capabilities from '@/io.ox/core/capabilities'
import AddressPickerView from '@/io.ox/backbone/mini-views/addresspicker'
import '@/lib/jquery-ui.min.js'

import { settings as settingsContacts } from '@/io.ox/contacts/settings'
import gt from 'gettext'

// TODO: exceptions for global address book

/**
 * extension point for autocomplete item
 */
ext.point('io.ox/participants/add/autoCompleteItem').extend({
  id: 'view',
  index: 100,
  draw (participant, options) {
    const pView = new pViews.ParticipantEntryView({
      model: participant,
      closeButton: false,
      halo: false,
      field: true,
      isMail: options.isMail
    })
    this.append(pView.render().$el)
  }
})

const validation = {

  validate (list, options) {
    if (!this.options.blocklist) return
    const opt = _.extend({ yell: true }, options)
    const invalid = this.getInvalid(list)
    // process
    if (invalid.length === 0) return
    // yell warning
    if (opt.yell) this.yell(list, invalid)
    return invalid
  },

  getInvalid (list) {
    const blocklist = this.options.blocklist
    return _(getAddresses(list)).filter(function (address) {
      return !!blocklist[address]
    })
  },

  yell (list, invalid) {
    // do not use "gt.ngettext" for plural without count
    yell('warning', (list.length === 1)
      ? gt('This email address cannot be used')
    // #. %1$s a list of email addresses (always more than one)
    // #, c-format
      : gt('The following email addresses cannot be used: %1$s', invalid.join(', '))
    )
  }
}

function getAddresses (list) {
  return _(list).map(getAddress)
}

function getAddress (item) {
  // string, data or model
  if (_.isString(item)) item = { email1: item }
  else if (item instanceof Backbone.Model) item = item.toJSON()
  return contactsUtil.getMail(item)
}

const AddParticipantView = Backbone.View.extend({

  tagName: 'div',

  events: {
    'keydown input': 'resolve',
    'blur input': 'resolve'
  },

  typeahead: null,

  options: {
    placeholder: gt('Add contact/resource') + ' \u2026',
    label: gt('Add contact/resource'),
    extPoint: 'io.ox/participants/add',
    blocklist: false,
    autoselect: false
  },

  initialize (o) {
    this.options = $.extend({}, this.options, o || {})
    if (_.isString(this.options.blocklist)) {
      // turn blocklist into hash to have simpler checks
      const hash = {}
      _(this.options.blocklist.split(/,/)).each(function (address) {
        hash[address.trim().toLowerCase()] = true
      })
      this.options.blocklist = hash
      _.extend(this, validation)
    }
    this.options.click = _.bind(this.addParticipant, this)
    this.options.harmonize = _.bind(function (data) {
      data = _(data).map(function (m) {
        return new pModel.Participant(m)
      })
      // remove duplicate entries from typeahead dropdown
      const col = this.collection
      data = _(data).filter(function (model) {
        return !col.get(model)
      })

      // wait for participant models to be fully loaded (autocomplete suggestions might have missing values otherwise)
      return $.when.apply($, _(data).pluck('loading')).then(function () { return data })
    }, this)

    // ensure a fixed scroll position when adding participants/members after the initial rendering
    this.initialRendering = true
    const scrollIntoView = _.debounce(function () {
      if (this.initialRendering) {
        this.initialRendering = false
        return
      }
      this.typeahead.el.scrollIntoView()
    }.bind(this), 0)

    this.collection.on('render', scrollIntoView)
  },

  resolve (e) {
    if (e && e.type === 'keydown' && e.which !== 13) return

    const val = this.typeahead.$el.typeahead('val')
    const list = coreUtil.getAddresses(val)
    const participants = []
    // split based on comma or semi-colon as delimiter
    _.each(list, function (value) {
      if (_.isEmpty(value)) return
      participants.push({
        display_name: util.parseRecipient(value)[0],
        email1: util.parseRecipient(value)[1],
        field: 'email1',
        type: 5
      })
    })
    return this.addParticipant(e, participants, val)
  },

  setFocus () {
    if (this.typeahead) this.typeahead.$el.focus()
  },

  addParticipant (e, data, value) {
    let list = [].concat(data)
    const distlists = []
    // validate is just used to check against blocklist
    let error = this.validate ? this.validate(list) : false
    const self = this
    // abort when blocklisted where found
    if (error) return
    // now really validate address
    list = this.getValidAddresses(list)

    // check for error but don't block (there might be other valid addresses)
    if (list.length !== [].concat(data).length) error = 'invalid addresses'

    if (this.options.convertToAttendee) {
      list = _(list).chain().map(function (item) {
        if (!(item.attributes && item.attributes.mark_as_distributionlist)) {
          return calendarUtil.createAttendee(item)
        }
        distlists.push(item)
        return undefined
      }).flatten().compact().value()
    }

    if (!_.isEmpty(list)) this.collection.add(contactsUtil.checkDuplicateMails(list, this.collection))

    if (!_.isEmpty(distlists)) {
      _.each(distlists, function (item) {
        self.collection.resolveDistList(item.attributes.distribution_list).then(function (list) {
          _.each(contactsUtil.validateDistributionList(list), function (item) {
            // hint: async custom wrapper
            self.collection.add(calendarUtil.createAttendee(item))
          })
        })
      })
    }

    // clean typeahead input
    if (value) this.typeahead.$el.typeahead('val', '')
    // return possible errors, so views can react
    return error
  },

  getValidAddresses (list) {
    return _(list).filter(function (item) {
      const address = getAddress(item)
      if (coreUtil.isValidMailAddress(address)) return true
      // #. %1$s is an email address
      yell('error', gt('Cannot add contact with an invalid mail address: %1$s', address))//
      return false
    })
  },

  render () {
    const guid = _.uniqueId('form-control-label-')
    const self = this

    this.typeahead = new Typeahead(this.options)
    this.$el.append(
      this.typeahead.$el.attr({ id: guid }).addClass('add-participant')
    )
    this.typeahead.render()
    if (this.options.scrollIntoView) {
      const $el = this.$el
      this.typeahead.on('typeahead-custom:dropdown-rendered', function () {
        const target = $el.find('.tt-dropdown-menu')
        const container = target.scrollParent()
        const pos = target.offset().top - container.offset().top
        if (!target.is(':visible')) return
        if ((pos < 0) || (pos + target.height() > container.height())) {
          // scroll to Node, leave 16px offset
          container.scrollTop(container.scrollTop() + pos - 16)
        }
      })
    }
    this.options.usePicker = !_.device('smartphone') && capabilities.has('contacts') && settingsContacts.get('picker/enabled', true)
    if (this.options.usePicker) {
      this.addresspicker = new AddressPickerView({
        process (e, member) {
          if (self.options.convertToAttendee) {
            if (!self.options.processRaw && !member.type === 3) {
              // fix type 5 that are actually type 1
              member.magic()
            } else if (!member.type && (!member.folder_id || !member.user_id || member.field !== 'email1')) {
              member.type = 5
            }
            self.options.collection.add(contactsUtil.checkDuplicateMails(calendarUtil.createAttendee(member), self.options.collection))
            return
          }
          self.options.collection.add(contactsUtil.checkDuplicateMails(member, self.options.collection))
        },
        processRaw: self.options.processRaw,
        useGABOnly: self.options.useGABOnly,
        selection: self.options.selection,
        hideResources: !self.options?.apiOptions?.resources
      })
      this.$el.append(
        this.addresspicker.render().$el
      )
      this.$el.wrapInner($('<div class="input-group has-picker">'))
    }
    // move visible label to proper position
    const $label = $('<label class="sr-only m-0 p-0">').attr({ for: guid }).text(this.options.label)
    this.$el.prepend(
      $('<div class="flex-row pt-8">').append(
        $label.toggleClass('sr-only', !this.options.labelVisible)
      )
    )
    return this
  }
})

export default AddParticipantView
