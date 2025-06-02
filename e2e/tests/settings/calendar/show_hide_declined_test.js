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

Feature('Settings > Calendar')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7865] Configure to show/hide declined appointments', async ({ I, calendar, settings }) => {
  I.login('app=io.ox/calendar')

  calendar.newAppointment()
  I.retry(5).fillField('Title', 'Appointment 1')
  calendar.startNextMonday()
  I.fillField('Location', 'test location')
  I.click('~Start time')
  I.click('1:00 PM')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.newAppointment()
  I.retry(5).fillField('Title', 'Appointment 2')
  calendar.startNextMonday()
  I.fillField('Location', 'test location')
  I.click('~Start time')
  I.click('2:00 PM')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.moveCalendarViewToNextWeek()

  I.click(locate('.appointment').withText('Appointment 2').as('"Appointment 2"'))
  I.waitForText('Decline')
  I.click('Decline', '.popup-footer')
  I.waitForText('Appointment 2')
  I.logout()

  I.login('settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  settings.expandSection('Advanced settings')
  I.waitForText('Show declined appointments')
  I.uncheckOption('Show declined appointments')
  settings.close()

  I.openApp('Calendar')
  I.dontSee('Appointment 2')
})
