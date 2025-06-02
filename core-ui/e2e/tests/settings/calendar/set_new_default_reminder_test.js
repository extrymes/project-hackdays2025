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

Scenario('[C7867] Set new default reminder', async ({ I, calendar, dialogs, settings }) => {
  I.login('settings=virtual/settings/io.ox/calendar&section=io.ox/calendar/settings/reminders')
  I.waitForApp()

  I.click(
    locate('.form-group')
      .withChild(locate('label').withText('Default reminder'))
      .find('button').as('Default reminder')
  )

  dialogs.waitForVisible()
  I.waitForText('Edit reminders')
  I.click('Add reminder', dialogs.body)
  I.selectOption('.alarm-action', 'Notification')
  I.selectOption('.alarm-time', '45 minutes')
  I.selectOption('.alarm-related', 'before start')
  dialogs.clickButton('Apply')
  settings.close()
  I.openApp('Calendar')
  I.waitForApp()

  // Check whether Notify 45 minutes before start is shown on appointment creation window
  calendar.newAppointment()
  I.see('Notify 45 minutes before start.')
})
