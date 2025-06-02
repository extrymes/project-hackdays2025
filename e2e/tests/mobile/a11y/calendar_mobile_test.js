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

const { expect } = require('chai')
const moment = require('moment')

Feature('Mobile > Accessibility > Calendar')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

const options = {
  rules: {
    'scrollable-region-focusable': { enabled: false }, // [MODERATE] Ensure that scrollable region has keyboard access
    'aria-required-children': { enabled: false }, //  [CRITICAL] Certain ARIA roles must contain particular children
    'meta-viewport': { enabled: false } // [CRITICAL] Zooming and scaling must not be disabled
  }
}

Scenario('Day view w/o appointments @mobile', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'week:day' }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Month view w/o appointments @mobile', async ({ I }) => {
  const month = moment().format('MMMM')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForText(month)
  I.click(month)
  I.waitForVisible('.month-container')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('List view w/o appointments @mobile', async ({ I }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.click('~List view', '.mobile-toolbar')
  I.waitForVisible('.list-view.complete')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Day view with appointment clicked @mobile', async ({ I }) => {
  const time = moment().startOf('day').add(10, 'hours')

  await I.haveAppointment({
    summary: 'test invite accept/decline/accept tentative',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('test invite', 5, '.appointment-container .appointment')
  I.click('.appointment-container .appointment')
  I.waitForText('test invite', 5, '.io-ox-calendar-window')

  expect(await I.grabAxeReport(options)).to.be.accessible
})
