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

const listeners = {}
const pastEvents = {}

export function triggerReady (type, payload) {
  (listeners[type] || []).forEach(callback => callback(payload))
  pastEvents[type] = payload
  listeners[type] = []
}

export function addReadyListener (type, callback) {
  if (type in pastEvents) return callback(pastEvents[type])
  listeners[type] = listeners[type] || []
  listeners[type].push(callback)
}

// convenience function; 'settings' seems good enough
export function ready (callback) {
  addReadyListener('settings', callback)
}
