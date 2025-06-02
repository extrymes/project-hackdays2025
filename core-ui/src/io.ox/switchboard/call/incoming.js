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

import presence from '@/io.ox/switchboard/presence'
import Modal from '@/io.ox/backbone/views/modal'
import contactsAPI from '@/io.ox/contacts/api'
import ringtone from '@/io.ox/switchboard/call/ringtone'
import { settings } from '@/io.ox/switchboard/settings'
import { createCircularButton } from '@/io.ox/core/components'
import '@/io.ox/switchboard/style.scss'

import gt from 'gettext'

export default {
  openDialog (call) {
    new Modal({ title: gt('Incoming call') })
      .build(function () {
        const caller = call.getCaller()
        this.listenTo(call, 'hangup', function () {
          ringtone.incoming.stop()
          this.close()
        })
        this.$el.addClass('call-dialog')
        this.$body.append(
          $('<div class="photo">').append(
            contactsAPI.pictureHalo($('<div class="contact-photo">'), { email: caller }, { width: 80, height: 80 }),
            presence.getPresenceIcon(caller)
          ),
          $('<div class="name">').append(call.getCallerName()),
          $('<div class="email">').text(caller)
        )
        this.$footer.append($('<div class="action-button-rounded">').append(
          createCircularButton({ action: 'decline', title: gt('Decline'), icon: 'bi/telephone-fill.svg' }).addClass('btn-red hangup'),
          createCircularButton({ action: 'answer', title: gt('Answer'), icon: 'bi/telephone-fill.svg' }).addClass('btn-green')
        ))
      })
      .on('open', function () {
        if (window.Notification && settings.get('call/showNativeNotifications', true)) {
          // eslint-disable-next-line no-new
          new window.Notification('Incoming call', {
            body: gt('%1$s is calling', call.getCaller())
          })
        }
        ringtone.incoming.play()
      })
      .on('decline', function () {
        ringtone.incoming.stop()
        call.decline()
        call.set('missed', true)
        call.addToHistory()
      })
      .on('answer', function () {
        ringtone.incoming.stop()
        call.answer()
        call.addToHistory()
        window.open(call.getJoinURL())
      })
      .open()
  }
}
