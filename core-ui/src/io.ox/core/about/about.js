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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import '@/io.ox/core/about/style.scss'

import gt from 'gettext'
import { getVersionString } from '@/io.ox/core/util'

ext.point('io.ox/core/about').extend({
  id: 'general',
  index: 100,
  render () {
    const data = ox.serverConfig || {}
    this.$body.addClass('user-select-text').append(
      $('<p>').append(
        $.txt(gt('UI version')), $.txt(': '), $('<b>').text(getVersionString()), $('<br>'),
        $.txt(gt('Middleware version')), $.txt(': '), $('<b>').text(data.serverVersion)
      )
    )
  }
}, {
  id: 'extended',
  index: 200,
  render (baton) {
    const extended = baton.view.options.extended
    if (!extended) return
    // temporarily remove tabindex. Copy to clipboard plugin doesn't work correctly otherwise.
    const prevTabindex = this.$el.attr('tabindex')
    this.$el.removeAttr('tabindex')
    const placeholder = $('<div class="extended-placeholder">').busy()

    fetch('./meta', { headers: { 'service-worker-strategy': 'network-only' } }).then(async (response) => {
      if (!response.ok) return placeholder.remove()
      const data = await response.json()
      const container = $('<div class="details well">')
      data.forEach(({ id, name, version, revision, buildDate, commitSha, ...rest } = {}, i) => {
        // header
        if (id || commitSha || buildDate) {
          container.append(
            `<p><b>${name || id || 'unknown'} ${revision ? `${version}-${revision}` : version}</b>
            Container: ${id}
            Build date: ${moment(buildDate).format('lll')}
            Commit: ${commitSha}</p>`,
            Object.entries(rest).map(([key, object]) => {
              return $('<p>').append($.txt(`${key}: ${object.toString()}`))
            })
          )
        }
      })
      placeholder.replaceWith(container)
      // restore tabindex again
      this.$el.attr('tabindex', prevTabindex)
    }).catch(() => placeholder.remove())
    this.$body.append(placeholder)
  }
}, {
  id: 'copyright',
  index: 300,
  render () {
    const data = ox.serverConfig || {}
    const copyright = String(data.copyright || '').replace(/\(c\)/i, '\u00A9').replace(/\$year/g, moment().year())
    this.$body.append(
      // contact data can use HTML
      $('<p>').html(data.contact || ''),
      $('<p>').text(copyright)
    )
  }
})

export default {
  show ({ extended } = {}) {
    new ModalDialog({
      title: ox.serverConfig?.productName,
      previousFocus: $('#io-ox-topbar-help-dropdown-icon > a'),
      point: 'io.ox/core/about',
      extended
    })
      .addButton({ label: gt('Close'), action: 'cancel' })
      .build(function () {
        this.$el.addClass('about-dialog')
        if (extended) this.$el.addClass('extended')
      })
      .open()
  }
}
