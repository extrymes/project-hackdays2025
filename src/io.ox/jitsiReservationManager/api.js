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

import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import switchboardApi from '@/io.ox/switchboard/api'

async function getHeaders () {
  const token = await switchboardApi.getJwt()
  return new Headers({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  })
}

const convertToIonosTime = isoTime => isoTime.replace(/:[\d.]+Z$/, '')

export default {
  async createMeeting (meetingData) {
    const basePayload = {
      start: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      brand: coreSettings.get('brand'),
      package: jitsiSettings.get('package'),
      maxParticipants: jitsiSettings.get('maxParticipants'),
      maxDuration: jitsiSettings.get('maxDuration')
    }
    const jitsiServiceUrl = jitsiSettings.get('host')
    const headers = await getHeaders()
    const payload = { ...basePayload, ...meetingData }
    payload.start = convertToIonosTime(payload.start)
    payload.expires = convertToIonosTime(payload.expires)
    try {
      const response = await fetch(
        `https://${jitsiServiceUrl}/api/v1/jitsi-reservation-manager/meetings`,
        { method: 'POST', headers, body: JSON.stringify({ ...payload }) }
      )
      if (response.ok) return await response.json()
      const error = await response.json()
      throw new Error(`Could not create a jitsi meeting: ${error.message}`)
    } catch (error) {
      console.error(error)
    }
  }
}
