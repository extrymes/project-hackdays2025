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
import dynamic from '@/io.ox/core/theming/dynamic/main'

import '@/io.ox/multifactor/login/style.scss'

function loadBackground () {
  $('body').append($(`<iframe class="multifactorBackground" src="${ox.serverConfig.multifactorBackground}">`))
  document.styleSheets[0].insertRule('.modal-backdrop.in { opacity: 0.1 !important; }', 0)
}

export default {
  create () {
    // If configured background, use that instead of toolbar
    if (ox.serverConfig.multifactorBackground) return loadBackground()

    // fake topbar logo (do not use the actual toolbar here -> leads to various errors because code is required to early (no settings set etc.))
    const logoContainer = $('<div class="logo-container p-8">')
    $('#io-ox-appcontrol').append(
      $('<div id="io-ox-topleftbar" class="justify-start flex-grow me-auto">').append(
        $('<div id="io-ox-top-logo" class="me-8 ms-10">').append(
          logoContainer
        )
      )
    )
    dynamic.getLogo().then(img => logoContainer.append(img))
    $('#io-ox-core, #io-ox-appcontrol').show() // We need to show the core if hidden
  },
  destroy () {
    if (ox.serverConfig.multifactorBackground) {
      $('.multifactorBackground').remove()
      document.styleSheets[0].deleteRule(0)
      return
    }
    $('#io-ox-appcontrol').empty() // Wipe the temporary bar
  }
}
