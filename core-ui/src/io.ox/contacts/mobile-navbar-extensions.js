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
import ext from '@/io.ox/core/extensions'
import { createIcon, buttonWithIconAndText, buttonWithText } from '@/io.ox/core/components'

ext.point('io.ox/contacts/mobile/navbar').extend({
  id: 'btn-left',
  index: 100,
  draw (baton) {
    if (!baton.left) return
    this.$el.append(
      $('<div class="navbar-action left">').append(
        buttonWithIconAndText({ className: 'btn-unstyled', icon: createIcon('bi/chevron-left.svg'), text: baton.left })
      )
    )
  }
})

ext.point('io.ox/contacts/mobile/navbar').extend({
  id: 'header',
  index: 200,
  draw (baton) {
    this.$el.append(
      $('<div class="navbar-title">').text(baton.title)
    )
  }
})

ext.point('io.ox/contacts/mobile/navbar').extend({
  id: 'btn-right',
  index: 300,
  draw (baton) {
    if (!baton.right) return
    this.$el.append(
      $('<div class="navbar-action right">').append(
        buttonWithText({ className: 'btn-unstyled', text: baton.right })
      )
    )
  }
})
