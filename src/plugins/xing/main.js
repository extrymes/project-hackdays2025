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
import Stage from '@/io.ox/core/extPatterns/stage'
import ext from '@/io.ox/core/extensions'
import xingAPI from '@/io.ox/xing/api'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import yell from '@/io.ox/core/yell'
import keychain from '@/io.ox/keychain/api'

import gt from 'gettext'

const Action = actionsUtil.Action
const XING_NAME = gt('XING')

function hasXingAccount () {
  return keychain.isEnabled('xing') && keychain.hasStandardAccount('xing')
}

function isAlreadyOnXing (emailArray) {
  return xingAPI.findByMail(emailArray).then(function (data) {
    if (!data.results) return false
    return (data.results.items || []).some(inquiry => !!inquiry.user)
  })
}

Action('io.ox/xing/actions/invite', {
  id: 'invite-xing',
  capabilities: 'xing',
  collection: 'one',
  matches (baton) {
    const [contact] = baton.data
    const mailaddresses = [contact.email1, contact.email2, contact.email3].filter(Boolean)
    const def = $.Deferred()

    if (!hasXingAccount() || contact.mark_as_distributionlist) {
      def.resolve(false)
      return def
    }

    isAlreadyOnXing(mailaddresses).done(function (isPresent) {
      def.resolve(!isPresent)
    }).fail(function () {
      def.resolve(false)
    })

    return def
  },
  action (baton) {
    const [contact] = baton.data
    xingAPI.invite({
      email: contact.email1 || contact.email2 || contact.email3
    })
      .fail(function (response) {
        yell('error', gt('There was a problem with %s. The error message was: "%s"', XING_NAME, response.error))
      })
      .done(function () {
        yell('success', gt('Invitation sent'))
      })
  }
})

Action('io.ox/xing/actions/add', {
  id: 'add-on-xing',
  capabilities: 'xing',
  collection: 'one',
  matches (baton) {
    const [contact] = baton.data
    const mailaddresses = [contact.email1, contact.email2, contact.email3].filter(Boolean)
    const def = $.Deferred()

    if (!hasXingAccount()) {
      def.resolve(false)
      return def
    }

    isAlreadyOnXing(mailaddresses).done(function (isPresent) {
      def.resolve(isPresent)
    }).fail(function () {
      def.resolve(false)
    })
    return def
  },
  action (baton) {
    const [contact] = baton.data
    xingAPI.initiateContactRequest({
      email: contact.email1 || contact.email2 || contact.email3
    })
      .fail(function (response) {
        yell('error', gt('There was a problem with %s. The error message was: "%s"', XING_NAME, response.error))
      })
      .done(function () {
        yell('success', gt('Contact request sent'))
      })
  }
})

// eslint-disable-next-line no-new
new Stage('io.ox/core/stages', {
  id: 'xing-toolbar-addons',
  index: 1001,
  run () {
    /* invite to xing actions in toolbars */
    ext.point('io.ox/contacts/links/inline').extend({
      id: 'invite-contact-to-xing',
      index: 610,
      title: gt('Invite to %s', XING_NAME),
      ref: 'io.ox/xing/actions/invite'
    })

    ext.point('io.ox/mail/all/actions').extend({
      id: 'invite-email-to-xing',
      index: 310, /* Preferably closely following 300, "invite to appointment" */
      title: gt('Invite to %s', XING_NAME),
      ref: 'io.ox/xing/actions/invite'
    })

    ext.point('io.ox/contacts/toolbar/links').extend({
      id: 'invite-contact-to-xing-classic',
      prio: 'lo',
      mobile: 'lo',
      title: gt('Invite to %s', XING_NAME),
      ref: 'io.ox/xing/actions/invite'
    })

    /* add on xing actions in toolbars */
    ext.point('io.ox/contacts/links/inline').extend({
      id: 'add-on-xing-by-contact',
      index: 610, /* same index as 'invite to XING', because it is mutually exclusive */
      title: gt('Add on %s', XING_NAME),
      ref: 'io.ox/xing/actions/add'
    })

    ext.point('io.ox/mail/all/actions').extend({
      id: 'add-on-xing-by-e-mail',
      index: 310, /* same index as 'invite to XING', because it is mutually exclusive */
      title: gt('Add on %s', XING_NAME),
      ref: 'io.ox/xing/actions/add'
    })

    ext.point('io.ox/contacts/toolbar/links').extend({
      id: 'add-on-xing-by-contact-classic',
      prio: 'lo',
      mobile: 'lo',
      title: gt('Add on %s', XING_NAME),
      ref: 'io.ox/xing/actions/add'
    })

    return $.when()
  }
})
