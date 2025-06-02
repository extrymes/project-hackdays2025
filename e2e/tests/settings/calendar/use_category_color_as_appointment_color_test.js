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

Feature('Settings > Calendar')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Use first category color as appointment color', async ({ I, calendar, settings }) => {
  const time = calendar.getNextMonday()

  await Promise.all([
    I.haveAppointment({
      summary: 'test appointment one',
      categories: ['Important'],
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting({
      'io.ox/core': {
        features: { categories: true },
        categories: { userCategories: [] }
      },
      'io.ox/calendar': {
        categoryColorAppointments: false
      }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // Check colors
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('test appointment', 5, '.workweek')
  I.seeNumberOfElements('.workweek .appointment .title', 1)

  const appointmentColor = await I.grabCssPropertyFrom('.workweek .appointment[aria-label*="test appointment"]', 'background-color')
  expect(appointmentColor, 'appointment color equals default appointment color').to.equal('rgb(206, 238, 253)')

  settings.open('Calendar', 'Advanced settings')
  I.waitForText('Use first category color for appointments')
  I.checkOption('Use first category color for appointments')
  await I.waitForSetting({ 'io.ox/calendar': { categoryColorAppointments: true } }, 10)
  settings.close()

  I.waitForElement('.appointment')
  const newAppointmentColor = await I.grabCssPropertyFrom('.workweek .appointment[aria-label*="test appointment"]', 'background-color')
  expect(newAppointmentColor, 'appointment color equals category color').to.equal('rgb(255, 204, 219)')

  calendar.switchView('List')
  I.waitForVisible('.list-view .appointment[aria-label*="test appointment"] .color-label')
  const listAppointmentColor = await I.grabCssPropertyFrom('.list-view .appointment[aria-label*="test appointment"] .color-label', 'background-color')
  expect(listAppointmentColor, 'appointment color equals category color').to.equal('rgb(255, 41, 104)')

  calendar.switchView('week')
  I.click('~Settings')
  I.clickDropdown('Print')
  I.waitForDetached('.dropdown.open')
  I.retry(5).switchToNextTab()
  I.waitForElement('.print-wrapper')
  I.see('test appointment one')
  const printAppointmentColor = await I.grabCssPropertyFrom('.slot .event', 'background-color')
  expect(printAppointmentColor, 'appointment color equals category color').to.equal('rgb(255, 41, 104)')
})

Scenario('Category color as appointment color does not activate when categories are disabled', async ({ I, calendar, settings }) => {
  const time = calendar.getNextMonday()

  await Promise.all([
    I.haveAppointment({
      summary: 'test appointment one',
      categories: ['Important'],
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveSetting({
      'io.ox/core': {
        features: { categories: false },
        categories: { userCategories: [] }
      },
      'io.ox/calendar': {
        categoryColorAppointments: true
      }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()

  I.waitForText('test appointment', 5, '.workweek')
  I.seeNumberOfElements('.workweek .appointment .title', 1)
  const appointmentColor = await I.grabCssPropertyFrom('.workweek .appointment[aria-label*="test appointment"]', 'background-color')
  expect(appointmentColor, 'appointment color equals category color').to.equal('rgb(206, 238, 253)')

  settings.open()
  I.dontSee('Use first category color for appointments')
  settings.close()

  calendar.clickAppointment('test appointment one')
  I.waitForElement('.detail-popup', 5)
  I.waitForElement('~Edit', 5)
  I.click('~Edit')
  I.waitForElement('[data-app-name="io.ox/calendar/edit"] .io-ox-calendar-edit', 5)
  I.waitForVisible('[data-app-name="io.ox/calendar/edit"] .io-ox-calendar-edit', 5)
  I.dontSee('Add category')
})
