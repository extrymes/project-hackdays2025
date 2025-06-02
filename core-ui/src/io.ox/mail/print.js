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
import print from '@/io.ox/core/print'
import api from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import content from '@/io.ox/mail/detail/content'
import attachment from '@/io.ox/core/attachments/view'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function getType () {
  return settings.get('allowHtmlMessages', true) ? 'html' : 'text'
}

async function getContent (maildata) {
  if (!_.isArray(maildata.attachments)) return ''
  const contentdata = content.get(maildata, { autoCollapseBlockquotes: false })
  // content extensions may add promises for async processing
  await Promise.all(contentdata.promises)
  return contentdata.content.innerHTML
}

function getList (data, field) {
  return _(data[field || 'from']).map(function (obj) {
    return _.escape(util.getDisplayName(obj, { showMailAddress: true })).replace(/\s/g, '\u00A0')
  }).join('\u00A0\u2022 ')
}

function getAttachments (data) {
  const headers = data.headers || {}
  // hide attachments for our own share invitations
  if (headers['X-Open-Xchange-Share-Type']) return []

  return new attachment.Collection(util.getAttachments(data) || []).filter(function (model) {
    return model.isFileAttachment()
  }).map(function (model, i) {
    return {
      title: model.get('filename', 'Attachment #' + i),
      size: model.get('size') ? _.filesize(model.get('size') || 0) : 0
    }
  })
}

// Check if decrypted Guard email
function isDecrypted (selection) {
  return selection[0] && selection[0].security && selection[0].security.decrypted
}

async function process (data) {
  return {
    from: getList(data, 'from'),
    to: getList(data, 'to'),
    cc: getList(data, 'cc'),
    bcc: getList(data, 'bcc'),
    subject: data.subject,
    date: util.getFullDate(data.received_date || data.sent_date),
    sort_date: -(data.received_date || data.sent_date),
    content: await getContent(data),
    attachments: getAttachments(data)
  }
}

export default {

  open (selection, win) {
    print.smart({

      get (obj, index) {
        // is an embedded email?
        if (util.isEmbedded(selection[0])) return api.getNestedMail(selection[0])
        // fetch normal message
        return api.get(_.extend({ view: selection[index].view, unseen: true, decrypt: isDecrypted(selection) }, obj))
      },

      title: selection.length === 1 ? selection[0].subject : undefined,

      meta: {
        fixedWidthFont: settings.get('useFixedWidthFont', false) ? 'fixed-width-font' : '',
        format: getType(),
        // extra class so css rules work correctly in html mails
        classes: 'mail-detail-content'
      },

      i18n: {
        to: gt('To'),
        copy: gt.pgettext('CC', 'Copy'),
        blindcopy: gt.pgettext('BCC', 'Blind copy')
      },

      process,
      selection,
      selector: '.mail',
      sortBy: 'sort_date',
      window: win
    })
  }
}
