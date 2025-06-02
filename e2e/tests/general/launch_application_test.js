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

Feature('General > App Launcher')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7343] Launch "Portal" application', async ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Portal')
  I.waitForElement('.greeting-phrase')
})

Scenario('[C7344] Launch "E-Mail" application', async ({ I }) => {
  I.login('app=io.ox/portal')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher')
  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Mail', '.launcher-dropdown')
  I.waitForText('New email')
})

Scenario('[C7345] Launch "Address Book" application', async ({ I }) => {
  I.login('app=io.ox/portal')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher')
  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Address Book', '.launcher-dropdown')
  I.waitForElement('.classic-toolbar[aria-label="Address Book toolbar. Use cursor keys to navigate."]')
  I.seeElement('.classic-toolbar[aria-label="Address Book toolbar. Use cursor keys to navigate."]')
})

Scenario('[C7346] Launch "Calendar" application', async ({ I }) => {
  I.login('app=io.ox/portal')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher')
  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Calendar', '.launcher-dropdown')
  I.waitForElement('.calendar-header h2.info')
  I.seeElement('.calendar-header h2.info')
})

Scenario('[C7347] Launch "Drive" application', async ({ I }) => {
  I.login('app=io.ox/portal')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher')
  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Drive', '.launcher-dropdown')
  I.waitForText('My files')
})

Scenario('[C7350] Launch "Settings" application', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-topbar-settings-dropdown-icon')
  I.click('~Settings', '#io-ox-topbar-settings-dropdown-icon')
  I.waitForVisible('#topbar-settings-dropdown')
  I.click('All settings ...', '#topbar-settings-dropdown')
  I.waitForElement('.settings-detail-pane')
  I.seeElement('.settings-detail-pane')
})

Scenario('[C7351] Trigger refresh', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForNetworkTraffic()
  I.triggerRefresh()
})

Scenario('[C234516] Launch "Tasks" application', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher')
  I.click('#io-ox-launcher')
  I.waitForElement('.launcher-dropdown')
  I.click('Tasks', '.launcher-dropdown')
  I.waitForElement('.classic-toolbar[aria-label="Tasks toolbar. Use cursor keys to navigate."]')
  I.seeElement('.classic-toolbar[aria-label="Tasks toolbar. Use cursor keys to navigate."]')
})
