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

Feature('Settings')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C110279] Primary mail account name can be changed', async ({ I, dialogs, settings }) => {
  await I.haveFolder({ title: 'Personal', module: 'mail', parent: 'default0/INBOX' })
  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForText('Edit', 5, '.io-ox-accounts-settings')
  I.waitForNetworkTraffic()
  I.click('Edit', '.io-ox-accounts-settings')

  dialogs.waitForVisible()
  I.fillField('Account name', 'Räuber Hotzenplotz')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForText('Account updated')
  I.waitForElement('.io-ox-alert [data-action="close"]')
  I.click('.io-ox-alert [data-action="close"]')
  I.waitForDetached('.io-ox-alert')

  I.waitForText('Räuber Hotzenplotz', 5, '.list-item-title')

  settings.close()
  I.openApp('Mail')
  I.waitForElement('.io-ox-mail-window')
  I.waitForElement('.tree-container')
  I.waitForText('Räuber Hotzenplotz')
  I.seeTextEquals('Räuber Hotzenplotz', '.tree-container [data-id="virtual/standard"] > .folder-node .folder-label')
  I.seeTextEquals('My folders', '.tree-container [data-id="virtual/myfolders"] > .folder-node .folder-label')
})
