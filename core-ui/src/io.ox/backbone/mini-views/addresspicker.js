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

import AbstractView from '@/io.ox/backbone/mini-views/abstract'
import pModel from '@/io.ox/participants/model'
import api from '@/io.ox/contacts/api'
import capabilities from '@/io.ox/core/capabilities'
import * as util from '@/io.ox/mail/util'

import picker from '@/io.ox/contacts/addressbook/popup'
import enterprisePicker from '@/io.ox/contacts/enterprisepicker/dialog'
import '@/io.ox/backbone/mini-views/addresspicker.scss'
import { buttonWithIcon, icon } from '@/io.ox/core/components'

import gt from 'gettext'

import { settings } from '@/io.ox/core/settings'

const AddressPickerView = AbstractView.extend({

  tagName: 'span',

  events: {
    'click button': 'onClick'
  },

  initialize (opt) {
    this.opt = _.extend({
      process: $.noop // a function to process the picker output
    }, opt)
  },

  onClick: function openAddressBookPicker (e) {
    e.preventDefault()

    const self = this
    self.opt.useGABOnly = self.opt.useGABOnly || (self.opt.isPermission && !capabilities.has('invite_guests'))
    self.opt.hideResources = self.opt.hideResources || !!self.opt.isPermission || !!self.opt.useGABOnly;
    (settings.get('features/enterprisePicker/enabled', false) ? enterprisePicker : picker).open(function (result) {
      _.each(result, function (singleData) {
        if (self.opt.processRaw || singleData.type === 3) return self.opt.process(e, singleData)
        let member
        if (singleData.folder_id) {
          api.get(singleData).done(function (data) {
            // specify address field (email1, email2, ...)
            if (singleData.field) data.field = singleData.field
            member = new pModel.Participant(data)
            self.opt.process(e, member, singleData)
          })
        } else {
          member = new pModel.Participant({
            display_name: util.parseRecipient(singleData.array[1])[0],
            email1: singleData.array[1],
            field: 'email1',
            type: 5
          })
          self.opt.process(e, member, singleData)
        }
      })
    }, self.opt)
  },

  render () {
    this.$el.addClass('input-group-btn').append(
      buttonWithIcon({
        icon: icon('bi/ox-address-book.svg'),
        ariaLabel: gt('Select contacts'),
        tooltip: gt('Select contacts'),
        className: 'btn btn-default'
      })
    )
    return this
  }
})

export default AddressPickerView
