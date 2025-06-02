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
import mailAPI from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import ModalDialog from '@/io.ox/backbone/views/modal'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function getSender (data) {
  if (!data) return null
  const replyTo = getReplyTo(data.headers)
  if (replyTo) return replyTo
  if (_.isEmpty(data.from)) return null
  return data.from[0]
}

function getReplyTo (headers) {
  if (!headers) return null
  const str = $.trim(headers['Reply-To'])
  if (!str) return null
  return util.parseRecipient(str)
}

function getList (data) {
  if (!data || !data.headers || !_.isString(data.headers['List-Post'])) return ''
  return data.headers['List-Post'].replace(/^.*<mailto:(.+)>.*$/i, '$1').toLowerCase()
}

export default {
  composeWithoutExternalImages (data, threadViewModel) {
    // images allowed in general
    if (settings.get('allowHtmlImages', false)) return $.when(false)

    // we don't have blocked images
    if ((threadViewModel && threadViewModel.hasBlockedExternalImages === false) || (data.view === 'noimg' && data.modified === 0)) return $.when(false)

    const def = $.Deferred()
    // button texts may be quite long
    const dialogOptions = { easyOut: false, width: '700px' }

    // we have blocked images
    if ((threadViewModel && threadViewModel.hasBlockedExternalImages) || data.modified === 1) {
      dialogOptions.title = gt('Mail contains external images')
      dialogOptions.description = [$('<p>').text(gt('This email contains images from external sources that are currently hidden.'))]
    // we cannot be sure
    } else {
      dialogOptions.title = gt('Mail may contain external images')
      dialogOptions.description = [$('<p>').text(gt('This email may contain images from external sources.'))]
    }

    new ModalDialog(dialogOptions)
      .addCancelButton({ left: true })
      .addButton({ label: gt('Compose mail with external images'), action: 'withImages', className: 'btn-default' })
      .addButton({ label: gt('Compose mail without external images'), action: 'withoutImages' })
      .on('withoutImages', function () { def.resolve(true) })
      .on('withImages', function () { def.resolve(false) })
      .on('cancel', def.reject)
      .open()

    return def
  },

  // a message sent via a mailing list contains special mime headers like "list-owner"
  isMailingList (data) {
    if (!data || !data.headers) return false
    for (const id in data.headers) {
      if (/^list-(id|archive|owner)$/i.test(id)) return true
    }
    return false
  },

  // ask the user when replying
  replyToMailingList (cid, mode) {
    // check setting
    if (!settings.get('confirmReplyToMailingLists', true)) return $.when(mode)

    // we get the original mail to check its headers
    const original = mailAPI.pool.get('detail').get(cid)
    if (!original) return $.when(mode)

    // early return if it's not a mailing list
    if (!this.isMailingList(original.toJSON())) return $.when(mode)

    // also if we don't have any other sender
    const sender = getSender(original.toJSON())
    if (!sender) return $.when(mode)

    const def = $.Deferred()
    const list = '<b>' + _.escape(getList(original.toJSON())) + '</b>'
    const address = '<b>' + _.escape(util.getDisplayName(sender, { showMailAddress: true })) + '</b>'

    new ModalDialog({
      title: gt('Confirm recipient(s)'),
      easyOut: false,
      description: [
        // #. %1$d is an email addresses
        $('<p>').html(list ? gt('This message was sent via the mailing list %1$s.', list) : gt('This message was sent via a mailing list.')),
        // #. %1$d is an email addresses
        $('<p>').html(gt('Do you want to reply all or just %1$s?', address))
      ]
    })
      .addCancelButton({ left: true })
      .addButton({ label: gt('Reply all'), action: 'reply-all' })
      .addButton({ label: gt('Reply to sender'), action: 'reply' })
      .on('reply-all', function () { def.resolve('replyall') })
      .on('reply', function () { def.resolve('reply') })
      .on('cancel', function () { def.reject() })
      .open()

    return def
  }
}
