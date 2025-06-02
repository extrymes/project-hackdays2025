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

Feature('Calendar')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Change working time and check in weekview', async ({ I, calendar, settings }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.say('Check initial working time')
  I.see('7 AM', '.week-container-label .working-time-border:not(.in) .number')
  I.see('5 PM', '.week-container-label .working-time-border.in .number')

  I.say('Switch to settings')
  I.click('~Settings', '#io-ox-topbar-settings-dropdown-icon')
  I.waitForVisible('#topbar-settings-dropdown')
  I.click('All settings ...', '#topbar-settings-dropdown')
  I.waitForText('Calendar', 10, '.io-ox-settings-main .tree-container')

  I.waitForText('Start', 5)
  I.say('Change working time')
  I.selectOption('Start', '6:00 AM')
  I.selectOption('End', '6:00 PM')

  // switch to calendar
  I.openApp('Calendar')
  I.waitForApp()

  I.say('Check new working time')
  I.see('5 AM', '.week-container-label .working-time-border:not(.in) .number')
  I.see('5 PM', '.week-container-label .working-time-border.in .number')
})
