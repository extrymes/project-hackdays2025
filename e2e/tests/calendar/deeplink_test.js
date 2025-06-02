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

Feature('Calendar > Deep Link')

Before(async ({ I, users }) => {
  await users.create()
  I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'month' }
  })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Opens an external deep link in month view', async ({ I, calendar }) => {
  const time = moment().startOf('day').add(10, 'hours')

  const data = await I.haveAppointment({
    summary: 'My summary',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login(['app=io.ox/calendar', `id=${data.id}`, `folder=${data.folder}`], { isDeepLink: true })
  I.waitForVisible('.detail-popup')
  I.see('My summary', '.detail-popup')
})

Scenario('Opens an external deep link in week view', async ({ I, calendar }) => {
  const time = moment().startOf('day').add(10, 'hours')

  const [data] = await Promise.all([
    I.haveAppointment({
      summary: 'My summary',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting('io.ox/calendar//layout', 'week:week')
  ])

  I.login(['app=io.ox/calendar', `id=${data.id}`, `folder=${data.folder}`], { isDeepLink: true })
  I.waitForVisible('.detail-popup')
  I.see('My summary', '.detail-popup')
})

Scenario('Opens an external deep link in floating window in workweek view on weekends', async ({ I, calendar }) => {
  const time = moment().isoWeekday(7).startOf('day').add(10, 'hours')

  const [data] = await Promise.all([
    I.haveAppointment({
      summary: 'My summary',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting('io.ox/calendar//layout', 'week:workweek')
  ])

  I.login(['app=io.ox/calendar', `id=${data.id}`, `folder=${data.folder}`], { isDeepLink: true })
  I.waitForVisible('.io-ox-calendar-detail-window')
  I.see('My summary', '.io-ox-calendar-detail-window')
})

Scenario('Opens an external deep link with recurrence-id', async ({ I, calendar }) => {
  const [data] = await Promise.all([
    I.haveAppointment({
      summary: 'My summary',
      startDate: { value: moment().startOf('day').add(10, 'hours') },
      endDate: { value: moment().startOf('day').add(10, 'hours').add(1, 'hour') },
      rrule: 'FREQ=DAILY;COUNT=5'
    }),
    I.haveSetting('io.ox/calendar//layout', 'week:week')
  ])

  I.login(['app=io.ox/calendar', `id=${data.id}`, `folder=${data.folder}`, `recurrenceId=Europe/Berlin:${moment().startOf('day').add(10, 'hours').add(2, 'days').format('YYYYMMDD[T]HHmmss')}`], { isDeepLink: true })
  I.waitForVisible('.detail-popup')
  I.see('My summary', '.detail-popup')
  I.see(moment().startOf('day').add(10, 'hours').add(2, 'days').format('ddd, M/D/YYYY'), '.detail-popup')
})

Scenario('Opens a deep link from portal', async ({ I, calendar }) => {
  const time = moment().startOf('day').add(1, 'day').add(10, 'hours')

  const [data] = await Promise.all([
    I.haveAppointment({
      summary: 'My summary',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting('io.ox/calendar//layout', 'week:week')
  ])

  I.login('app=io.ox/portal')
  I.waitForElement(`[data-cid="${data.folder}.${data.id}"]`, 5)
  I.click(`[data-cid="${data.folder}.${data.id}"]`)
  I.waitForText('Shown as Reserved')
  I.click('Shown as Reserved')
  I.click('Appointment')

  I.waitForVisible('.detail-popup')
  I.see('My summary', '.detail-popup')
})
