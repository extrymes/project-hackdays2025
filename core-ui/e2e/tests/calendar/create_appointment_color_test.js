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

const assert = require('node:assert')

Feature('Calendar > Create')

Before(async ({ users }) => {
  await Promise.all([users.create(), users.create()])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C264519] Create appointments with colors in public folder', async ({ I, users, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')
  await I.haveSetting('io.ox/calendar//categoryColorAppointments', false)
  I.waitForApp()

  I.say('Create public calendar')
  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new calendar')

  dialogs.waitForVisible()
  I.waitForText('Add as public calendar', 5, dialogs.body)
  I.checkOption('Add as public calendar', dialogs.body)
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')

  I.say('Grant permission to user b')
  I.click(locate('.folder-arrow').inside('~Public calendars').as('.folder-arrow'))
  I.rightClick('~New calendar')

  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForElement('.form-control.tt-input', 5)
  I.fillField('.form-control.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  // create 2 test appointments with different colors
  I.clickPrimary('New appointment')
  I.waitForText('Appointments in public calendar')
  I.click('Create in public calendar')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'testing is fun')
  calendar.startNextMonday()
  I.see('New calendar', '.io-ox-calendar-edit-window .folder-selection')
  I.click('~Start time')
  I.click('8:00 AM')
  I.click('Appointment color', '.color-picker-dropdown')
  I.waitForElement('.color-picker-dropdown.open')
  I.click(locate('a').inside('.color-picker-dropdown.open').withAttr({ title: 'Green' }).as('Green'))
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.clickPrimary('New appointment')
  I.waitForText('Appointments in public calendar')
  I.click('Create in public calendar')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'testing is awesome')
  calendar.startNextMonday()
  I.see('New calendar', '.io-ox-calendar-edit-window .folder-selection')
  I.click('~Start time')
  I.click('10:00 AM')
  I.click('Appointment color', '.color-picker-dropdown')
  I.waitForElement('.color-picker-dropdown.open')
  I.click(locate('a').inside('.color-picker-dropdown.open').withAttr({ title: 'Red' }).as('Red'))
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.logout()

  // Login user b
  I.waitForVisible('#io-ox-login-screen')
  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.click(locate('.folder-arrow').inside('~Public calendars').as('.folder-arrow'))
  I.doubleClick('~New calendar')
  // check if public appointments are there
  I.waitForText('testing is fun', 10, '.workweek')
  I.waitForText('testing is awesome', 10, '.workweek')
  // see if appointment colors still drawn with customized color (See Bug 65410)
  const appointmentColors = (await I.grabCssPropertyFromAll('.workweek .appointment', 'backgroundColor'))
  // webdriver resolves with rgba, puppeteer with rgb for some reason
    .map(c => c.indexOf('rgba') === 0 ? c : c.replace('rgb', 'rgba').replace(')', ', 1)'))

  assert.deepEqual(appointmentColors, ['rgba(221, 247, 212, 1)', 'rgba(255, 204, 219, 1)'])
})

Scenario('[OXUIB-1143] Keep contact preview when changing appointment color', async ({ I, users, mail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]

  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!' })

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMailByIndex(0)
  I.click('.person-link.person-from')
  I.waitForElement('[data-action="io.ox/contacts/actions/invite"]', 3)
  I.click('[data-action="io.ox/contacts/actions/invite"]')
  I.waitForElement('.color-picker-dropdown.dropdown', 3)
  I.click('.color-picker-dropdown.dropdown')
  I.click('[data-value="#ff2968"]')
  I.seeElement('.io-ox-halo')
})
