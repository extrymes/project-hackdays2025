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

Feature('Switchboard > Receive Webhooks from MW')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => {
  await users.removeAll()
})

Scenario('Subscribe to and receive Calendar Events', async ({ I, users, calendar }) => {
  await Promise.all([
    users[0].context.doesntHaveCapability('websocket'),
    users[0].context.hasCapability('switchboard'),
    I.haveSetting({
      'io.ox/core': {
        features: {
          presence: true,
          pns: true
        }
      }
    })
  ])

  session('Alice', () => {
    I.login('app=io.ox/calendar')
    I.waitForApp()
  })

  session('Bob', () => {
    I.login('app=io.ox/calendar', { user: users[1] })
    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', 'Test appointment')
    calendar.addParticipantByPicker(calendar.getFullname(users[0]))
    calendar.startNextMonday()
    I.click('Create')
  })

  session('Alice', () => {
    calendar.moveCalendarViewToNextWeek()
    I.waitForText('Test appointment')
    // make sure auto-refresh does not kick in
    I.triggerRefresh()
  })

  session('Bob', () => {
    calendar.moveCalendarViewToNextWeek()
    calendar.clickAppointment('Test appointment')
    I.waitForVisible('~Edit appointment')
    I.click('~Edit appointment')
    I.waitForText('Test appointment', 5, '.io-ox-calendar-edit-window')
    I.fillField('Title', 'Important appointment')
    I.click('Save')
  })

  session('Alice', () => {
    I.waitForText('Important appointment', 15)
  })
})
