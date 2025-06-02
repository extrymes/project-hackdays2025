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

// cSpell:ignore autocopytolocation

import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/core/settings/util'
import { addText, bulkAdd, st, addExplanations } from '@/io.ox/settings/index'

import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'
import gt from 'gettext'

addText('JITSI_NAME', jitsiSettings.get('productName', 'Jitsi'))

bulkAdd(st.NOTIFICATIONS, '', {
  NOTIFICATIONS_JITSI_MEETINGS: [st.JITSI_NAME, 'notifications [data-section="io.ox/settings/notifications/jitsi"]']
})

bulkAdd(st.NOTIFICATIONS, st.NOTIFICATIONS_JITSI_MEETINGS, {
  JITSI_DESKTOP_NOTIFICATIONS: [gt('Show desktop notifications'), 'notifications #io-ox-jitsi-call-shownativenotifications'],
  JITSI_PLAY_RINGTONE: [gt('Play ringtone on incoming call'), 'notifications #io-ox-jitsi-call-useringtones']
})

bulkAdd(st.CALENDAR, '', {
  // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
  CALENDAR_JITSI_MEETINGS: [gt('%s meetings', st.JITSI_NAME), 'io.ox/calendar [data-section="io.ox/calendar/settings/jitsi"]']
})

bulkAdd(st.CALENDAR, st.CALENDAR_JITSI_MEETINGS, {
  JITSI_COPY_LINK_LOCATION: [gt('Automatically copy the meeting join link to the appointment location field'), 'io.ox/calendar [name="autocopytolocation"]', 2]
})

addExplanations({
  NOTIFICATIONS_JITSI_MEETINGS: gt('Notify on incoming calls'),
  // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
  CALENDAR_JITSI_MEETINGS: gt('Set up and configure %s meetings', st.JITSI_NAME)
})

ext.point('io.ox/calendar/settings/detail/view').extend(
  {
    id: 'jitsi',
    after: 'timezones',
    render (baton) {
      baton.view.listenTo(jitsiSettings, 'change', () => jitsiSettings.saveAndYell())
      util.renderExpandableSection(st.CALENDAR_JITSI_MEETINGS, st.CALENDAR_JITSI_MEETINGS_EXPLANATION, 'io.ox/calendar/settings/jitsi').call(this, baton)
    }
  }
)

let INDEX = 0
ext.point('io.ox/calendar/settings/jitsi').extend(
  {
    id: 'appointments',
    index: INDEX += 100,
    render () {
      this.append(
        // #. Automatically copies the meeting link into an appointment's location field
        util.checkbox('autoCopyToLocation', st.JITSI_COPY_LINK_LOCATION, jitsiSettings)
      )
    }
  }
)

ext.point('io.ox/settings/notifications').extend(
  {
    id: 'jitsi',
    index: 1100,
    render (baton) {
      baton.view.listenTo(jitsiSettings, 'change', () => jitsiSettings.saveAndYell())
      return util.renderExpandableSection(st.NOTIFICATIONS_JITSI_MEETINGS, st.NOTIFICATIONS_JITSI_MEETINGS_EXPLANATION, 'io.ox/settings/notifications/jitsi').call(this, baton)
    }
  }
)

ext.point('io.ox/settings/notifications/jitsi').extend(
  {
    id: 'calls',
    index: 100,
    render () {
      this.append(
        util.fieldset(
          gt('Incoming calls'),
          util.checkbox('call/showNativeNotifications', st.JITSI_DESKTOP_NOTIFICATIONS, jitsiSettings),
          util.checkbox('call/useRingtones', st.JITSI_PLAY_RINGTONE, jitsiSettings)
        )
      )
    }
  }
)
