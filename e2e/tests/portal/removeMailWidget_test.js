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

Scenario('[C7487] Remove a mail', async ({ I, users, mail, dialogs }) => {
  const [user] = users
  await I.haveMail({
    attachments: [{
      content: 'Test mail\r\n',
      content_type: 'text/plain',
      raw: true,
      disp: 'inline'
    }],
    from: [[user.get('displayname'), user.get('primaryEmail')]],
    sendtype: 0,
    subject: 'Test subject',
    to: [[user.get('displayname'), user.get('primaryEmail')]]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // click on first email
  I.waitForText('Test subject', 5, '.io-ox-mail-window .leftside')
  I.click('.io-ox-mail-window .leftside ul li.list-item[aria-label*="Test subject"]')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Add to portal')

  // remove mail widget from portal
  I.openApp('Portal')
  I.waitForApp()
  I.waitForElement('~Test subject')
  I.waitForElement('~Test subject, Disable widget')
  I.click('~Test subject, Disable widget')

  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')

  // verify that the widget is removed
  I.dontSee('~Test subject')
  I.click('~Settings')
  I.clickDropdown('All settings ...')
  I.waitForElement('div[title="Portal"]')
  I.click('div[title="Portal"]')
  I.waitForElement('.io-ox-portal-settings')
  I.dontSee('Test subject', '.io-ox-portal-settings')
})
