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

Scenario('[C7489] Inbox widget: open mails', async ({ I, users, dialogs }) => {
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
  I.waitForApp()
  I.click('Add widget')
  I.clickDropdown('Inbox')
  dialogs.waitForVisible()
  dialogs.clickButton('Save')

  // Open mail from Inbox widget
  I.waitForElement('~Inbox')
  I.waitForElement('.widget[aria-label="Inbox"] .subject')
  I.click('.mailwidget .item', '.widget[aria-label="Inbox"]')
  I.waitForVisible('.detail-popup')
  I.waitForElement('.subject', 5)
  I.see('Test subject', '.detail-popup .subject')
  I.waitForElement('.body', 5)
  await within({ frame: '.detail-popup iframe.mail-detail-frame' }, async () => {
    I.see('Test mail')
  })
  I.waitForElement('.inline-toolbar', 5)
  I.waitForElement('~More actions')
  I.seeElement('~Delete')
  I.seeElement('~Reply all')
  I.click('~More actions', '.mail-header-actions')
  I.waitForElement('.dropdown.open')
  I.see('Reply', '.dropdown.open')
  I.see('Forward', '.dropdown.open')
  I.seeElement('.dropdown.more-dropdown')
  I.seeElement('~Close')
  I.click('.smart-dropdown-container')
  I.waitForDetached('.dropdown.open')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')
})
