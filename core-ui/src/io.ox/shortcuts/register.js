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

import ox from '@/ox'
import $ from 'jquery'
import '@/io.ox/shortcuts/helpModal'
import ext from '@/io.ox/core/extensions'
import { getProfile } from '@/io.ox/shortcuts/profile'
import ShoSho from 'shosho'
import { settings as coreSettings } from '@/io.ox/core/settings'
import '@/io.ox/shortcuts/settings/pane'
import '@/io.ox/shortcuts/navigationActions'

const point = ext.point('io.ox/shortcuts')

let currentProfile

const shortcuts = new ShoSho({
  capture: true,
  target: document,
  shouldHandleEvent (event) {
    if (!event.key) return false
    // if (event.type !== 'keyup') console.log(event.key)
    // TODO: add tests

    if ((!event.ctrlKey && !event.metaKey) && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return // console.log('event target is input or textarea')

    // FIXME: this needs to be fixed upstream
    if (currentProfile === 'disabled') return true

    if (event.key === '?' && event.type === 'keyup') {
      const action = 'Show shortcut help'
      point
        .filter(ext => ext.action === action)
        .forEach(ext => ext.perform())
      return false
    }
    if (event.key === '/' && event.type === 'keyup') {
      const action = 'Focus search'
      point
        .filter(ext => ext.action === action)
        .forEach(ext => ext.perform())
      return false
    }

    return true
  }
})

shortcuts.start()

function bindKeys (newProfile) {
  currentProfile = newProfile

  shortcuts.reset()

  if (newProfile === 'disabled') return

  const currentApp = ox.ui.App?.getCurrentApp().id

  // if office, disable shortcuts
  if (currentApp.includes('io.ox/office')) return

  const profile = getProfile(newProfile)
  const elements = [...Object.entries(profile.all), ...Object.entries(profile.navigation), ...Object.entries(profile[currentApp] || {})]
  elements.forEach(([action, shortcut]) => {
    if (!Array.isArray(shortcut)) shortcut = [shortcut]
    shortcut.forEach(shortcut => {
      shortcuts.register(shortcut, (e) => {
        point
          .filter(ext => ext.action === action)
          .forEach(ext => ext.perform({ e }))
      })
    })
  })
}

coreSettings.on('change:shortcutsProfile', bindKeys)
ox.on('app:ready app:resume app:stop', () => bindKeys(coreSettings.get('shortcutsProfile', 'default')))

point.extend({
  id: 'focus search',
  action: 'Focus search',
  perform (baton) {
    $('.search-field:visible').last().focus()
  }
})

// point.extend({
//   id: 'toggle dark mode',
//   action: 'Toggle dark mode',
//   perform (baton) {

//   }
// })
