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

Feature('Mobile > Closable windows')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('I can open and collapse windows @mobile', async ({ I, mobileMail, mobileCalendar }) => {
  I.login()
  I.waitForApp()

  mobileMail.newMail()
  I.click('~Close window')
  I.waitForInvisible('.io-ox-mail-compose-window')

  I.click('~Navigate to:')
  I.waitForElement('.launcher-dropdown')
  I.click('Calendar', '.launcher-dropdown')
  I.waitForApp()
  mobileCalendar.newAppointment()
  I.waitForElement('.io-ox-calendar-edit-window.complete')
  I.click('.io-ox-calendar-edit-window .collapse')
  I.waitForInvisible('.io-ox-calendar-edit-window')

  I.click('~Navigate to:')
  I.waitForElement('.launcher-dropdown')
  I.click('New email', '.launcher-dropdown')
  I.waitForVisible('.io-ox-mail-compose-window.complete')
  I.click('Discard')
  I.waitForDetached('.io-ox-mail-compose-window')

  I.click('~Navigate to:')
  I.waitForElement('.launcher-dropdown')
  I.click('Create appointment', '.launcher-dropdown')
  I.waitForVisible('.io-ox-calendar-edit-window.complete')
  I.fillField('Title', 'Appointment name')
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window')
  I.waitForElement('.appointment.accepted')
})
