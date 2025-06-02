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
import yell from '@/io.ox/core/yell'
import contactAPI from '@/io.ox/contacts/api'
import conversionAPI from '@/io.ox/core/api/conversion'

import { settings } from '@/io.ox/core/settings'
import registry from '@/io.ox/core/main/registry'

import gt from 'gettext'

export default function (baton) {
  const attachment = _.isArray(baton.data) ? _.first(baton.data) : baton.data

  conversionAPI.convert({
    identifier: 'com.openexchange.mail.vcard',
    args: [
      { 'com.openexchange.mail.conversion.fullname': attachment.parent.folder_id },
      { 'com.openexchange.mail.conversion.mailid': attachment.parent.id },
      { 'com.openexchange.mail.conversion.sequenceid': attachment.id }
    ]
  }, {
    identifier: 'com.openexchange.contact.json',
    args: []
  })
    .then(
      function success (data) {
        if (!_.isArray(data) || data.length === 0) {
          yell('error', gt('Failed to add. Maybe the vCard attachment is invalid.'))
          return
        }

        const contact = data[0]; const folder = settings.get('folder/contacts')

        function preloadParticipants () {
          const dfd = $.Deferred()

          _.each(contact.distribution_list, function (obj, key) {
            contactAPI.getByEmailaddress(obj.mail).done(
              function () {
                if (key === contact.distribution_list.length - 1) dfd.resolve()
              }
            )
          })

          return dfd
        }

        if (contact.mark_as_distributionlist) {
          // edit distribution list
          import('@/io.ox/contacts/distrib/main').then(function ({ default: m }) {
            $.when(m.getApp(contact).launch(), preloadParticipants()).done(function () {
              this[0].create(folder, contact)
            })
          })
        } else {
          // edit contact
          contact.folder_id = folder
          registry.call('io.ox/contacts/edit', 'edit', contact)
        }
      },
      function fail (e) {
        yell(e)
      }
    )
};
