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
import ModalDialog from '@/io.ox/backbone/views/modal'
import ox from '@/ox'

import folderAPI from '@/io.ox/core/folder/api'
import accountAPI from '@/io.ox/core/api/account'
import api from '@/io.ox/mail/api'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function getQuestion (list) {
  // do not use "gt.ngettext" for plural without count
  return (list.length === 1)
    ? gt('Do you want to permanently delete this mail?')
    : gt('Do you want to permanently delete these mails?')
}

api.on('delete:fail:quota', function (e, error, list) {
  new ModalDialog({
    title: gt('Mail quota exceeded'),
    previousFocus: $('[data-ref="io.ox/mail/listview"]')
  })
    .on('delete', function () {
      // true -> force
      api.remove(list, list, true)
    })
    .addCancelButton()
    .addButton({ action: 'delete', label: gt('Delete') })
    .build(function () {
      this.$body.append(
        $('<div>').text(gt('Emails cannot be put into trash folder while your mail quota is exceeded.')),
        $('<div>').text(getQuestion(list))
      )
    })
    .open()
})

// check for open composition spaces (does not cover 'empty folder' action yet)
const promptForCurrentlyEdited = (function () {
  function ignoreCurrentlyEdited (list) {
    if (!Object.keys(ox.ui.spaces).length) return list
    return list.filter(mail => !ox.ui.spaces[mail.cid])
  }

  return function promptForCurrentlyEdited (all, list) {
    const filtered = ignoreCurrentlyEdited(list)
    const diff = all.length - filtered.length
    // do not show dialog an proceed
    if (!diff) return $.when()

    const def = $.Deferred()
    const dialog = new ModalDialog({
      title: gt('Are you sure?'),
      description: gt.ngettext(
        // #. %1$d is the number of mails
        'This would also delete a currently edited draft.',
        'This would also delete %1$d currently edited drafts.', diff, diff
      ),
      async: true,
      backdrop: true
    })
      .addCancelButton()
      .addButton({ action: 'force', label: gt('Delete') })
      .open()

    dialog.on('cancel', def.reject)
    dialog.on('force', def.resolve)
    dialog.on('action', dialog.close)
    return def
  }
})()

function focusSelectedListItem (baton) {
  if (baton?.e?.clientX && baton?.e?.clientY) return
  $('.io-ox-mail-window .list-item[tabindex="0"]').trigger('focus')
}

export default function (baton) {
  const list = folderAPI.ignoreSentItems(baton.array())
  const all = list.slice()
  const shiftDelete = baton && baton.options.shiftDelete && settings.get('features/shiftDelete')
  const showPrompt = !shiftDelete && (settings.get('removeDeletedPermanently') || list.some(function (o) {
    return accountAPI.is('trash', o.folder_id)
  }))

  // prompt for currently edited drafts and it's corresponding composition spaces
  promptForCurrentlyEdited(all, list).then(function proceed () {
    // prompt for permanent deletion
    if (showPrompt) {
      // #. 'Delete mail' as modal dialog header to confirm to delete a mail.
      new ModalDialog({ title: gt('Delete mail'), description: getQuestion(list) })
        .addCancelButton()
        .addButton({ label: gt('Delete'), action: 'delete' })
        .on('delete', function () {
          api.remove(list, all).fail(yell).then(() => focusSelectedListItem(baton))
        })
        // trigger back event, used for mobile swipe delete reset
        .on('cancel', function () { ox.trigger('delete:canceled', list) })
        .open()
    } else {
      focusSelectedListItem(baton)
      api.remove(list, all, shiftDelete).fail(function (e) {
        // returns since mail quota gets handled in event handler for 'delete:fail:quota'
        if (e.code === 'MSG-0039') return
        yell(e)
      })
    }
  }, function cancel () {
    ox.trigger('delete:canceled', all)
  })
};
