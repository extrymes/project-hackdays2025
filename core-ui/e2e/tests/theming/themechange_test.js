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

Feature('Theming > onThemeChange')

const expect = require('chai').expect

// create users
Before(async ({ users }) => { await users.create() })

// delete users
After(async ({ users }) => { await users.removeAll() })

Scenario('Calendar appointments are re-rendered on themeChange', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('Title', 'test appointment')
  I.click('Create')
  // would be good if someone merges all the different approaches
  // maybe I.createAppointment(...) gets a parameter to for "next monday, 8:00"
  // was: await I.createAppointment({ subject: 'test appointment', startTime: '4:00 PM' })
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('test appointment', 5)
  // backgroundColor is calculated in JS and thus not automatically changed by css vars
  const appointmentColorLight = await I.grabCssPropertyFrom('.appointment', 'backgroundColor')
  await I.changeTheme({ theme: 'Dark' })
  const appointmentColorDark = await I.grabCssPropertyFrom('.appointment', 'backgroundColor')
  expect(appointmentColorLight).to.not.deep.equal(appointmentColorDark)
})

Scenario('Accent color is correctly set via settings', async ({ I, settings, users }) => {
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()
  I.waitForVisible('~Pink')
  I.click('~Pink')
  I.waitForElement('#theme-accent-color-pink:checked')
  settings.close()
  await I.waitForSetting({ 'io.ox/core': { theming: { current: { accentColor: '330, 82' } } } }, 10)
  I.seeCssPropertiesOnElements('.primary-action .btn-primary', { 'background-color': 'rgb(223, 22, 122)' })
  I.refreshPage()
  I.waitForApp()
  I.seeCssPropertiesOnElements('.primary-action .btn-primary', { 'background-color': 'rgb(223, 22, 122)' })
})
