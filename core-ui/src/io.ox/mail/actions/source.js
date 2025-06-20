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
import ModalDialog from '@/io.ox/backbone/views/modal'
import api from '@/io.ox/mail/api'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

function setAuthentication (data, dialog) {
  // ensure full auth data is available
  return api.get(_.pick(data, 'id', 'folder_id'), { cache: true }).done(function (data) {
    data = data.authenticity
    if (!data || !(data.spf || data.dkim || data.dmarc)) return

    const content = _.chain(['spf', 'dkim', 'dmarc'])
      .filter(key => data[key] && data[key].reason)
      .map(key => key.toUpperCase() + ': ' + data[key].reason)
      .value()
      .join('\n')
      .trim()

    dialog.find('.mail-authenticity-view').val(content)
    dialog.find('#mail-authenticity-headline, .mail-authenticity-view').toggleClass('hidden', !content)
  })
}

function setSource (data, dialog) {
  return api.getSource(data).done(function (src) {
    dialog.find('textarea.mail-source-view').val(src || '').scrollTop()
    dialog.find('.modal-body').css({ visibility: 'visible' })
  })
}

export default function (baton) {
  const data = baton.first()
  new ModalDialog({ title: gt('Mail source') + ': ' + (data.subject || ''), width: 700, autoFocusOnIdle: false, addClass: 'mail-source-dialog' })
    .addButton({ label: gt('Close'), action: 'close' })
    .build(function () {
      const self = this
      this.$el.addClass('mail-source-dialog')
      this.$body.append(
        this.$source = $('<textarea class="form-control mail-source-view" readonly="readonly" aria-labelledby="mail-source">')
          .on('keydown', function (e) {
            if (e.which !== 27) e.stopPropagation()
          }),
        $('<h2 id="mail-authenticity-headline" class="hidden">').text(gt('Authentication details')),
        this.$auth = $('<textarea class="form-control mail-authenticity-view hidden" readonly="readonly" aria-labelledby="mail-authenticity-headline">')
      )
      $.when(
        setSource(data, this.$el),
        setAuthentication(data, this.$el)
      ).done(function () {
        self.idle()
        self.$el.find('textarea.mail-source-view').focus()
        // use defer here. Firefox has a very odd focus mechanic. Focussing the textarea causes it to scroll to the bottom. Scrolltop directly after this is ignored, so use defer
        _.defer(function () {
          self.$el.find('textarea.mail-source-view').scrollTop(0)
        })
      }).fail(function (e) {
        if (e.code === 'MSG-0032') {
          const cid = _.cid(data); const collection = baton.app.listView.collection
          collection.remove(cid)
        } else api.refresh()
        yell(e)
        self.close()
      })
    })
    .busy(true)
    .open()
};
