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

Feature('Settings > Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7771] Permanently remove deleted mails', async ({ I, users, mail, dialogs, settings }) => {
  await I.haveMail({
    attachments: [{ content: 'Lorem ipsum', content_type: 'text/html', disp: 'inline' }],
    from: users[0],
    sendtype: 0,
    subject: 'Delete this',
    to: users[0]
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.click('Permanently remove deleted emails')
  await I.waitForSetting({ 'io.ox/mail': { removeDeletedPermanently: true } })
  settings.close()
  mail.selectMail('Delete this')
  I.waitForElement('~Delete')
  I.click('~Delete')

  dialogs.waitForVisible()
  I.waitForText('Do you want to permanently delete this mail?')
  I.click('Delete', dialogs.footer)
  I.waitForDetached('.modal-dialog')

  I.selectFolder('Trash')
  I.waitForText('This folder is empty')
})
