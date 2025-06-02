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

Feature('Accessibility')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

const options = {
  rules: {
    'scrollable-region-focusable': { enabled: false }, // [MODERATE] Ensure that scrollable region has keyboard access
    'aria-required-children': { enabled: false } //  [CRITICAL] Certain ARIA roles must contain particular children
  }
}

Scenario('Calendar - Day view w/o appointments', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'week:day' }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement('.current-time-indicator')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar - Workweek view w/o appointments', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'week:workweek' }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.week-container-label')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar - Week view w/o appointments', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'week:week' }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.week-container-label')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar - Month view w/o appointments', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'month' }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.month-container')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar - Year', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'year' }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.year-view-container')

  // The excluded td.out are a visual representation of the days of the previous month
  // that are aria-hidden and role="presentation", this is a false positive.
  // This should be checked, with future axe-core updates.
  expect(await I.grabAxeReport({ exclude: [['td.out']] }, options)).to.be.accessible
})

Scenario('Calendar - List view w/o appointments', async ({ I }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.multi-selection-message')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar - Month view with appointment clicked', async ({ I }) => {
  const time = moment().startOf('day').add(10, 'hours')

  await Promise.all([
    I.haveAppointment({
      summary: 'test invite accept/decline/accept tentative',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting({
      'io.ox/calendar': { showCheckboxes: true, layout: 'month' }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.appointment')
  I.click('.appointment')

  expect(await I.grabAxeReport(options)).to.be.accessible
})
