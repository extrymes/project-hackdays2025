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

Feature('Mail Compose')

Before(async ({ users }) => {
  await users.create() // Sender
  await users.create() // Recipient
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7391] Send mail with attachment from Drive', async ({ I, users, mail }) => {
  const [sender, recipient] = users
  // Log in and navigate to mail app
  I.login('app=io.ox/mail', { user: sender })
  // Create a file
  await I.executeScript(async function () {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { default: filesApi } = await import(String(new URL('io.ox/files/api.js', location.href)))
    const blob = new window.Blob(['fnord'], { type: 'text/plain' })
    return filesApi.upload({ folder: settings.get('folder/infostore'), file: blob, filename: 'Principia.txt', params: {} })
  })
  // Open Compose
  mail.newMail()

  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', 'Principia Discordia')

  I.click('~Attachments')
  I.click('Add from Drive')

  // Click on the file. Not really necessary since it's the only file and auto-selected
  // Still I don't think the test should fail if it isn't autoselected, so we click on it
  // anyway
  I.waitForText('Principia.txt')
  I.click(locate('div.name').withText('Principia.txt').inside('.io-ox-fileselection'))
  // Add the file
  I.click('Add')

  // Wait for the filepicker to close
  I.waitForDetached('.io-ox-fileselection')
  // Send
  mail.send()

  I.logout()
  /// //////////////// Continue as 'recipient' ///////////////////////
  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  I.waitForText('Principia Discordia')
  // Open mail
  mail.selectMail('Principia Discordia')
  // Verify Attachment
  I.waitForText('1 attachment')
  I.click('1 attachment')
  I.see('Principia.')
  // Let's view the content
  I.click({ css: 'button[data-filename="Principia.txt"]' })

  I.waitForElement('.dropdown.open')
  I.click('View', '.dropdown.open .dropdown-menu')
  I.waitForText('fnord', 20) // Only the enlightened will see 'fnord', so this might fail on an unenlightened computer. Introduce it to Discordianism prior to running the test.
})
