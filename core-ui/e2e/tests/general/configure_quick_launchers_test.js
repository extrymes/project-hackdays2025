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

Feature('General > Configure quick launchers')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C287801] Configure quick launchers', ({ I, mail, dialogs }) => {
  I.login()
  I.waitForApp()

  // Changing configuration and cancelling the dialog
  I.rightClick('#io-ox-quicklaunch')
  dialogs.waitForVisible()
  I.waitForText('Change quick launch bar', 5, dialogs.header)
  within(dialogs.body, () => {
    I.see('Position 1')
    I.see('Mail', '[id="settings-apps/quickLaunch0"]')
    I.see('Position 2')
    I.see('Calendar', '[id="settings-apps/quickLaunch0"]')
    I.see('Position 3')
    I.see('Drive', '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch0"]', 'Address Book')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch1"]', 'Tasks')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch2"]', 'Portal')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
  })
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  // Check if cancelling the dialog didn't change the icons
  I.seeElement('~Mail')
  I.seeElement('~Calendar')
  I.seeElement('~Drive')

  // Changing configuration and applying the settings
  I.rightClick('#io-ox-quicklaunch')
  dialogs.waitForVisible()
  I.waitForText('Change quick launch bar', 5, dialogs.header)
  within(dialogs.body, () => {
    I.see('Position 1')
    I.see('Mail', '[id="settings-apps/quickLaunch0"]')
    I.see('Position 2')
    I.see('Calendar', '[id="settings-apps/quickLaunch0"]')
    I.see('Position 3')
    I.see('Drive', '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch0"]', 'Address Book')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch1"]', 'Tasks')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
    I.selectOption('[id="settings-apps/quickLaunch2"]', 'Portal')
    I.waitForText('Calendar', 5, '[id="settings-apps/quickLaunch0"]')
  })
  dialogs.clickButton('Save changes')
  I.waitForDetached('.modal-dialog')

  // Check if configuration was applied
  I.seeElement('~Address Book')
  I.seeElement('~Tasks')
  I.seeElement('~Portal')
})
