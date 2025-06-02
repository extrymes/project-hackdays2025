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

Feature('Calendar > Year perspective')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Switch from year to month perspective (OXUIB-2308)', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'year')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.see('Year', '.page.current .dropdown .dropdown-label')
  I.click('January', '.year-view-container')

  I.waitForVisible('.page .monthview-container')
  I.waitForText('Month', 5, '.page.current .dropdown .dropdown-label')

  I.click('Month', '.page.current .dropdown')
  I.waitForText('Year', 5, '.dropdown.open .dropdown-menu')
  I.click('Year', '.dropdown.open .dropdown-menu')

  I.waitForVisible('.year-view-container')
  I.see('Year', '.page.current .dropdown .dropdown-label')
})
