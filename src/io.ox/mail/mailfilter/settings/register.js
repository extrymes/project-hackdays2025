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

import gt from 'gettext'

ext.point('io.ox/mail/settings/rules').extend({
  index: 100,
  render (baton) {
    this.parent().one('open', () => {
      import('@/io.ox/mail/mailfilter/settings/filter').then(data => {
        const filters = data.default
        filters.editMailfilter(this, baton).fail(error => {
          let msg
          if (error.code === 'MAIL_FILTER-0015') {
            msg = gt('Unable to load mail filter rules settings.')
          }
          this.append(
            $.fail(msg || gt('Couldn\'t load your mail filter rules.'), () => {
              filters.editMailfilter(this).then(() => {
                this.find('[data-action="discard"]').hide()
              })
            })
          )
        })
        // add class now (timing for e2e tests)
        this.addClass('io-ox-mailfilter-settings')
      })
    })
  }
})
