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

Feature('Settings > Basic')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C274141] Customize default app, order and count for Quicklauncher @contentReview', async ({ I, settings }) => {
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()
  settings.expandSection('Start app & Quick launch bar')
  I.selectOption('[name=autoStart]', 'Portal')

  I.click('Configure quick launch bar ...')
  I.selectOption('Position 1', 'None')
  I.selectOption('Position 2', 'None')
  I.selectOption('Position 3', 'None')

  I.click('Save changes')
  I.click('#io-ox-refresh-icon')

  I.click('Configure quick launch bar ...')
  I.selectOption('Position 1', 'Calendar')
  I.selectOption('Position 2', 'Address Book')
  I.selectOption('Position 3', 'io.ox/mail')

  I.click('Save changes')
  I.click('#io-ox-refresh-icon')

  settings.close()
  I.logout()

  I.login()

  // Check that the above settings are made
  I.waitForVisible('.io-ox-portal')

  await within('#io-ox-quicklaunch', async () => {
    I.seeElement('[data-app-name="io.ox/calendar"]')
    I.seeElement('[data-app-name="io.ox/contacts"]')
    I.seeElement('[data-app-name="io.ox/mail"]')
  })
})
