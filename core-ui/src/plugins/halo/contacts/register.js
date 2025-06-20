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
import moment from '@open-xchange/moment'

import view from '@/io.ox/contacts/view-detail'
import * as util from '@/io.ox/contacts/util'

import ext from '@/io.ox/core/extensions'

import { settings as mailSettings } from '@/io.ox/mail/settings'

ext.point('io.ox/halo/contact:renderer').extend({
  id: 'contacts',
  handles (type) {
    return type === 'com.openexchange.halo.contacts'
  },
  draw (baton) {
    if (baton.data.length === 0) return

    const self = this; const def = $.Deferred()

    // prefer entry that is not in "collected addresses" (bug 58433)
    const contact = _.sortBy(baton.data, function (contact) {
      return contact.folder_id === mailSettings.get('contactCollectFolder') ? 1 : 0
    })[0]

    // if no display name can be computed, use the name of the mail
    if (util.getFullName(contact) === '') contact.display_name = (baton.contact.contact ? util.getFullName(baton.contact.contact) || baton.contact.name : baton.contact.name)
    // investigate request does not convert birthdays from year 1 (used to store birthdays without a year) back to gregorian calendar so do it here
    if (contact.birthday && moment.utc(contact.birthday).year() === 1) {
      contact.birthday = util.julianToGregorian(contact.birthday)
    }

    self.append(view.draw(new ext.Baton({ data: contact, halo: true, popup: baton.popup })))
    def.resolve()

    return def
  }
})

ext.point('io.ox/halo/contact:requestEnhancement').extend({
  id: 'contacts-request',
  enhances (type) {
    return type === 'com.openexchange.halo.contacts'
  },
  enhance (request) {
    request.appendColumns = true
    request.columnModule = 'contacts'
  }
})
