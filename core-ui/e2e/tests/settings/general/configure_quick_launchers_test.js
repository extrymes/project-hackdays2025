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

const expect = require('chai').expect

Feature('Settings > Basic')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C287803] Configure quick launchers', ({ I, settings }) => {
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()
  settings.expandSection('Start app & Quick launch bar')
  I.click('Configure quick launch bar ...')
  I.waitForText('Change quick launch bar')
  I.see('Position 1')
  I.see('Mail', '[id="settings-apps/quickLaunch0"]')
  I.see('Position 2')
  I.see('Calendar', '[id="settings-apps/quickLaunch0"]')
  I.see('Position 3')
  I.see('Drive', '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch0"]', 'Address Book')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch1"]', 'Tasks')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch2"]', 'Portal')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.click('Cancel')
  I.waitForInvisible('Change quick launch bar')
  I.seeElement('~Mail')
  I.seeElement('~Calendar')
  I.seeElement('~Drive')
  I.click('Configure quick launch bar ...', '.settings-detail-pane')
  I.waitForText('Change quick launch bar')
  I.see('Position 1')
  I.see('Mail', '[id="settings-apps/quickLaunch0"]')
  I.see('Position 2')
  I.see('Calendar', '[id="settings-apps/quickLaunch0"]')
  I.see('Position 3')
  I.see('Drive', '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch0"]', 'Address Book')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch1"]', 'Tasks')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.selectOption('[id="settings-apps/quickLaunch2"]', 'Portal')
  I.waitForText('Calendar', undefined, '[id="settings-apps/quickLaunch0"]')
  I.click('Save changes')
  I.waitForInvisible('Change quick launch bar')
  I.seeElement('~Address Book')
  I.seeElement('~Tasks')
  I.seeElement('~Portal')
})

Scenario('Configure quick launchers to be all None', async ({ I, dialogs, settings }) => {
  await I.haveSetting('io.ox/core//apps/quickLaunchCount', 5)
  I.login('section=io.ox/settings/general/apps&settings=virtual/settings/io.ox/core')

  I.waitForText('Configure quick launch bar ...', 5, '.settings-detail-pane')
  I.click('Configure quick launch bar ...')
  dialogs.waitForVisible()
  for (let i = 0; i < 5; i++) {
    I.selectOption({ css: `[id="settings-apps/quickLaunch${i}"]` }, 'None')
  }
  dialogs.clickButton('Save changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.click('Configure quick launch bar ...')
  dialogs.waitForVisible()
  for (let i = 0; i < 5; i++) {
    const selection = await I.executeScript(async function (i) {
      return document.querySelector(`#settings-apps\\/quickLaunch${i}`).value
    }, i)
    expect(selection).to.equal('none')
  }
})
