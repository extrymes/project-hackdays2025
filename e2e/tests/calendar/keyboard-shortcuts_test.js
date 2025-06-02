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

// const assert = require('node:assert')
const moment = require('moment')

Feature('Calendar > Keyboard shortcuts')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  // await I.haveSetting({
  //   'io.ox/calendar': { showCheckboxes: true }
  // })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Open Calendar and navigate views with keyboard shortcuts', ({ I, calendar, dialogs, users }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })

  const thisWeek = moment().isoWeek()
  const nextWeek = moment().add(1, 'week').isoWeek()
  const lastWeek = moment().subtract(1, 'week').isoWeek()
  const thisMonth = moment().format('MMMM YYYY')
  const nextMonth = moment().add(1, 'month').format('MMMM YYYY')
  const lastMonth = moment().subtract(1, 'month').format('MMMM YYYY')
  const thisYear = moment().year()
  const nextYear = moment().add(1, 'year').year()
  const lastYear = moment().subtract(1, 'year').year()
  const thisDay = moment().format('ddd, M/D/yyyy')
  const nextDay = moment().add(1, 'day').format('ddd, M/D/yyyy')
  const lastDay = moment().subtract(1, 'day').format('ddd, M/D/yyyy')

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.pressKey(['Control', 'Alt', 'c'])
  I.waitForApp()
  I.see('New appointment')

  I.see('Workweek')
  I.waitForText(`CW ${thisWeek}`)
  I.pressKey('n')
  I.waitForText(`CW ${nextWeek}`)
  I.pressKey('p')
  I.waitForText(`CW ${thisWeek}`)
  I.pressKey('p')
  I.waitForText(`CW ${lastWeek}`)
  I.pressKey('t')
  I.waitForText(`CW ${thisWeek}`)

  I.pressKey('m')
  I.waitForApp()
  I.see('Month')
  I.waitForText(thisMonth)
  I.pressKey('n')
  I.waitForText(nextMonth)
  I.pressKey('p')
  I.waitForText(thisMonth)
  I.pressKey('p')
  I.waitForText(lastMonth)
  I.pressKey('t')
  I.waitForText(thisMonth)

  I.pressKey('w')
  I.waitForApp()
  I.see('Week')

  I.pressKey('y')
  I.waitForApp()
  I.see('Year')
  I.waitForText(thisYear)
  I.pressKey('n')
  I.waitForText(nextYear)
  I.pressKey('p')
  I.waitForText(thisYear)
  I.pressKey('p')
  I.waitForText(lastYear)
  I.pressKey('t')
  I.waitForText(thisYear)

  I.pressKey('d')
  I.waitForApp()
  I.see('Day')
  I.waitForText(thisDay)
  I.pressKey('n')
  I.waitForText(nextDay)
  I.pressKey('p')
  I.waitForText(thisDay)
  I.pressKey('p')
  I.waitForText(lastDay)
  I.pressKey('t')
  I.waitForText(thisDay)

  I.pressKey('l')
  I.waitForApp()
  I.see('Appointments')
})
