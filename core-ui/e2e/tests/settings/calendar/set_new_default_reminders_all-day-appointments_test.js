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

Scenario('[C244799] Set new default reminder for all-day appointments', async ({ I, calendar, settings }) => {
  I.login('app=io.ox/calendar&section=io.ox/calendar/settings/reminders&settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  // Default reminder
  I.waitForElement('.alarms-link-view .btn-link')
  I.click(
    locate('.form-group')
      .withChild(locate('label').withText('Default reminder for all day appointments'))
      .find('button')
  )

  I.waitForText('Edit reminders')
  I.click('Add reminder')
  I.selectOption('.alarm-action', 'Notification')
  I.selectOption('.alarm-time', '1 day')
  I.selectOption('.alarm-related', 'before start')
  I.click('[data-action="apply"]')
  settings.close()

  // verify reminder is set as a notification to 1 day before start by default.
  I.openApp('Calendar')
  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('summary', 'subject')
  I.fillField('location', 'Dortmund')
  I.checkOption('All day')
  I.fillField('description', 'description')
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit')
  calendar.moveCalendarViewToNextWeek()

  I.waitForText('subject', undefined, '.appointment-content')
  I.click('subject', '.appointment-content')

  I.waitForVisible('~Edit')
  I.click('~Edit')
  I.waitForElement('.io-ox-calendar-edit')
  I.waitForText('Notify 1 day before start.')
})
