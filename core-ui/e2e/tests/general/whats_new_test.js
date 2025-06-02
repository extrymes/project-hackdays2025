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

Feature('General > Whats New Dialog')

Before(async ({ users }) => {
  const user = await users.create()
  await user.hasConfig('io.ox/core//whatsNew/autoStart', true)
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Does not show up for new users by default', ({ I, mail }) => {
  I.login()
  I.waitForApp()
  I.dontSee('What\'s new')
  I.logout()

  // unless baselineVersion is configured…
  I.haveSetting('io.ox/core//whatsNew/baselineVersion', '8.1')
  I.login()
  I.waitForApp()
  I.see('What\'s new', '.modal-dialog')
})
