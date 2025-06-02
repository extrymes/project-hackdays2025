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
import { addReadyListener } from '@/io.ox/core/events'
import { isMiddlewareMinVersion } from '@/io.ox/core/util'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'
import { settings as switchboardSettings } from '@/io.ox/switchboard/settings'
import { settings as zoomSettings } from '@/io.ox/conference/zoom-settings'
import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'

// Let's consolidate feature toggles
// Currently they're spread across all settings
// sometimes features/something, sometimes somename/enabled
// sometimes they're mixing up with user settings
// idea is to centrally have feature toggle in io.ox/core
// each toggle has a name, the value is bool, the user cannot change them

// lets keep this list in alphabetical order
const defaults = {
  attachFromDrive: true,
  connectYourDevice: true,
  countdown: true,
  dragDropICAL: true,
  freeBusyVisibility: true,
  implicitCancel: true,
  jitsi: true,
  managedResources: true,
  notes: false,
  openai: false,
  pe: false,
  pns: false,
  presence: false,
  resourceCalendars: false,
  shortcuts: true,
  templates: false,
  undoSend: true,
  zoom: true
}

const userDefaults = {
  countdown: false
}

// lets keep this list in alphabetical order
const requirements = {
  attachFromDrive: () => capabilities.has('infostore') && isMiddlewareMinVersion(8, 8),
  connectYourDevice: () => capabilities.has('client-onboarding') && settings.get('onboardingWizard', true),
  countdown: () => capabilities.has('calendar') && _.device('!smartphone'),
  drive: () => capabilities.has('filestore'),
  freeBusyVisibility: () => isMiddlewareMinVersion(8, 14),
  implicitCancel: () => capabilities.has('calendar'),
  jitsi: () => jitsiSettings.get('enabled', false) && jitsiSettings.get('host'),
  managedResources: () => isMiddlewareMinVersion(8, 13),
  openai: () => hasFeature('pe') && capabilities.has('openai') && requirements.switchboard(),
  // pns needs presence since presence has the websocket connection from switchboard
  pns: () => isMiddlewareMinVersion(8, 18) && requirements.switchboard() && requirements.presence(),
  presence: () => requirements.switchboard(),
  resourceCalendars: () => capabilities.has('calendar'),
  // switchboard is just listed as a requirement (e.g. used by presence and AI); it's not a feature toggle
  switchboard: () => switchboardSettings.get('host') && capabilities.has('switchboard'),
  zoom: () => hasFeature('pe') && zoomSettings.get('enabled', false) && requirements.switchboard()
}

addReadyListener('capabilities:server', async () => {
  const { default: config } = await import('@/io.ox/core/boot/config')
  const { edition } = await config.server()
  defaults.pe = typeof edition === 'undefined' || edition === 'pe'
})

// let's get a copy once settings are available
let features = null
addReadyListener('settings', () => {
  features = Object.assign(defaults, settings.get('features', {}))
})

export const hasFeature = _.memoize(function hasFeature (feature) {
  if (!feature) return false
  if (!features) {
    console.error('io.ox/core/feature.js: feature toggle checked before settings are loaded')
    return false
  }
  if (!features[feature]) return false
  if (requirements[feature]) return requirements[feature]()
  return true
})

export function getTogglePath (feature) {
  // `.user` is a special namespace just for temporary internal use (feature testing)
  return 'features/.user/' + feature
}

export function loadFeature ({ feature, path, delay = 0 }) {
  if (!hasFeature(feature)) return
  const toggle = getTogglePath(feature)
  const enabled = settings.get(toggle, userDefaults[feature] ?? true)
  if (enabled) {
    setTimeout(() => import(/* @vite-ignore */`../../${path}.js`), delay)
  } else {
    settings.once('change:' + toggle, () => import(/* @vite-ignore */`../../${path}.js`))
  }
  // make sure user changes are saved
  settings.on('change:' + toggle, () => { settings.save() })
}

export function userCanToggleFeature (feature) {
  return hasFeature(feature) && settings.isConfigurable(getTogglePath(feature))
}

export function isEnabledByUser (feature) {
  return hasFeature(feature) && settings.get(getTogglePath(feature), false)
}

export function onChangeUserToggle (feature, callback) {
  settings.on('change:' + getTogglePath(feature), callback)
}

export function getFeedbackUrl (feature) {
  // `.feedback` is a special namespace just for temporary internal use (feature testing)
  return settings.get(['features', '.feedback', feature, 'url'])
}

export const toggleSettings = settings
