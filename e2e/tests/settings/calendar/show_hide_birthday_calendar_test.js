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

Scenario('[C248441] Configure to show/hide birthday calendar', async ({ I, calendar, settings }) => {
  I.login('app=io.ox/calendar&settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  settings.expandSection('Advanced settings')

  // Check whether birthday calendar is shown on Calendar App
  I.waitForText('Show birthday calendar')
  I.seeCheckboxIsChecked('birthday')
  settings.close()
  I.waitForText('Birthdays')

  // Check whether birthday calendar is not shown on Calendar App
  settings.open()
  settings.expandSection('Advanced settings')
  I.uncheckOption('Show birthday calendar')
  settings.close()
  I.waitForText('My calendars')
  I.waitForInvisible('Birthdays')
})
