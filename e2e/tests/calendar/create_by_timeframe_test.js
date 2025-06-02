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
const expect = require('chai').expect

Feature('Calendar > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7433] Create appointment by marking some timeframe', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:day')

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // Create appointment from 01:00am to 03:00am today
  await within('.appointment-container', async () => {
    I.scrollTo('div[class*=timeslot]:nth-of-type(3)')
    // each timeslot element represents 30 minute blocks
    // The first slot will be from 00:00am to 00:30am...
    // The third slot will be 01:00am to 01:30am (add 3 slots)
    // The sixth slot will be from 02:30am to 03:00am
    // Drag from 01:00(3) down to 03:00(6)
    I.dragAndDrop('div[class*=timeslot]:nth-of-type(3)', 'div[class*=timeslot]:nth-of-type(6)')
  })
  I.waitForVisible('.floating-window')
  I.waitForText('Create appointment')
  I.fillField('summary', 'C7433-Subject')
  I.fillField('location', 'C7433-Location')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  // open overlay
  I.click('C7433-Subject', '.appointment')
  I.waitForVisible('.detail-popup .date')
  I.see('C7433-Subject', '.detail-popup')
  I.see('C7433-Location', '.detail-popup')
  // check time / date - should be 1am to 3am, 2hrs
  const appointmentDate = await I.grabTextFrom('.detail-popup .date') // expected: moment().format(L)
  const appointmentTime = await I.grabTextFrom('.detail-popup .time') // expected: 01:00 - 03:00 AM
  expect(appointmentDate).to.contain(moment().format('l'))
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  expect(appointmentTime).to.contain('1:00\u2009–\u20093:00\u202FAM')
})
