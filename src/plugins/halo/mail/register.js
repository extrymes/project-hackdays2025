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

import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/mail/api'
import ListView from '@/io.ox/mail/listview'

import gt from 'gettext'

ext.point('io.ox/halo/contact:renderer').extend({

  id: 'mail',

  handles (type) {
    return type === 'com.openexchange.halo.mail'
  },

  draw (baton) {
    if (baton.data.length === 0) return $.when()

    const sent = []; const received = []; const deferred = $.Deferred(); const node = this

    _(baton.data).each(function (item) {
      if (/INBOX$/i.test(item.folder_id)) received.push(item); else sent.push(item)
    })

    this.append(
      $('<h2 class="widget-title clear-title">').text(gt('Recent conversations'))
    )

    function createListView (type, data) {
      const cid = 'halo:' + type + ':' + baton.contact.email1
      const view = new ListView({
        collection: api.pool.add(cid, data),
        pagination: false,
        selection: false,
        scrollable: false,
        useButtonMarkup: true
      })
      view.$('.list-item').attr('data-detail-popup', 'mail')
      return view.render().$el.addClass('compact')
    }

    node.append(
      // left column
      $('<div class="io-ox-left-column">').append(
        $('<h3 class="io-ox-subheader">').text(gt('Received mails')),
        received.length === 0
          ? $('<div>').text(gt('Cannot find any messages this contact sent to you.'))
          : createListView('received', received)

      ),
      // right column
      $('<div class="io-ox-right-column">').append(
        $('<h3 class="io-ox-subheader">').text(gt('Sent mails')),
        sent.length === 0
          ? $('<div>').text(gt('Cannot find any messages you sent to this contact.'))
          : createListView('sent', sent)
      ),
      // clear float
      $('<div>').css('clear', 'both')
    )

    deferred.resolve()

    return deferred
  }
})

ext.point('io.ox/halo/contact:requestEnhancement').extend({
  id: 'request-mail',
  enhances (type) {
    return type === 'com.openexchange.halo.mail'
  },
  enhance (request) {
    request.appendColumns = true
    request.columnModule = 'mail'
    request.params.limit = 10
    request.params.columns = '102,600,601,602,603,604,605,606,607,608,609,610,611,612,614,652'
  }
})
