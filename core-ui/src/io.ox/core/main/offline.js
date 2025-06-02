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
import ox from '@/ox'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

// handle online/offline mode
//
let visible = false

function showIndicator (text) {
  if (visible) return
  $('#io-ox-offline').text(text).stop().show().animate({ bottom: '0px' }, 200, function () { visible = true })
  yell('screenreader', text)
}

function hideIndicator () {
  if (!visible) return
  $('#io-ox-offline').stop().animate({ bottom: '-41px' }, 200, function () { $(this).hide(); visible = false })
}

ox.on({
  'connection:online' () {
    hideIndicator()
    ox.online = true
  },
  'connection:offline' () {
    showIndicator(gt('Offline'))
    ox.online = false
  },
  'connection:up' () {
    if (ox.online) hideIndicator()
  },
  'connection:down' () {
    if (ox.online) showIndicator(gt('Server unreachable'))
  }
})

if (!ox.online) {
  $(window).trigger('offline')
}
