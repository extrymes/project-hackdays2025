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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7485] Disable a widget', async ({ I, users, dialogs }) => {
  await I.haveMail({
    attachments: [{
      content: 'Test mail\r\n',
      content_type: 'text/plain',
      raw: true,
      disp: 'inline'
    }],
    from: users[0],
    sendtype: 0,
    subject: 'Test subject',
    to: users[0]
  })

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  // Add Inbox widget to Portal
  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal')
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Inbox')
  dialogs.waitForVisible()
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  // Disable Inbox widget
  I.click('~Settings')
  I.clickDropdown('All settings ...')
  I.waitForElement('div[title="Portal"]')
  I.click('div[title="Portal"]')
  I.waitForElement('.widget-mail', 5)
  I.click('~Disable Inbox')

  // Verify Inbox widget isn't displayed on Portal
  I.openApp('Portal')
  I.dontSee('~Inbox')
})
