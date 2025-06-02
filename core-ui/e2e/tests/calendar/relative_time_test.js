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

const moment = require('moment')

Feature('Calendar > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointment and check relative time indicator', async ({ I, calendar }) => {
  await I.haveAppointment({
    summary: 'Already started',
    startDate: { value: moment().subtract(30, 'minutes') },
    endDate: { value: moment().subtract(30, 'minutes').add(1, 'hour') }
  })

  await I.haveAppointment({
    summary: 'Just started',
    startDate: { value: moment().subtract(30, 'seconds') },
    endDate: { value: moment().subtract(30, 'seconds').add(10, 'minutes') }
  })

  await I.haveAppointment({
    summary: 'Will start soon',
    startDate: { value: moment().add(45, 'minutes') },
    endDate: { value: moment().add(45, 'minutes').add(10, 'minutes') }
  })

  await I.haveAppointment({
    summary: '3.5 hours',
    startDate: { value: moment().add(3, 'hours').add(25, 'minutes') },
    endDate: { value: moment().add(3, 'hours').add(25, 'minutes').add(10, 'minutes') }
  })

  await I.haveAppointment({
    summary: 'Already ended',
    startDate: { value: moment().subtract(10, 'minutes') },
    endDate: { value: moment().subtract(10, 'minutes').add(5, 'minutes') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.switchView('List')

  I.waitForText('Already started')
  I.click(locate('.list-item.appointment').withText('Already started'))
  I.waitForText('This appointment has started 30 minutes ago')
  I.seeElement('.calendar-detail-pane .relative-time')

  I.click(locate('.list-item.appointment').withText('Just started'))
  I.waitForText('This appointment has just started')

  I.click(locate('.list-item.appointment').withText('Will start soon'))
  I.waitForText('This appointment starts in 45 minutes')

  I.click(locate('.list-item.appointment').withText('3.5 hours'))
  I.waitForText('This appointment starts in 3.5 hours')

  I.click(locate('.list-item.appointment').withText('Already ended'))
  I.waitForElement(locate('.calendar-detail-pane .subject').withText('Already ended'))
  I.seeElement('.calendar-detail-pane .date-time')
  I.dontSeeElement('.calendar-detail-pane .relative-time')
})
