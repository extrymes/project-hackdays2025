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

Feature('Mail > Read Receipts')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C118709] Request "read receipt"', async ({ I, users, settings, mail }) => {
  const [recipient, sender] = users
  I.login('app=io.ox/mail', { user: recipient })
  I.waitForApp()
  // As the recipient, we'll turn on notifications about requested read receipts
  settings.open()
  settings.expandSection('Advanced settings')
  I.waitForText('Show requests for read receipts')
  I.click('Show requests for read receipts')
  I.waitForNetworkTraffic() // Give it a chance to be saved
  settings.close()
  I.logout()
  // Continue as 'sender' and write an email requesting a read receipt
  I.login('app=io.ox/mail', { user: sender })

  I.waitForApp()
  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', 'Subject')
  // Enable read-receipt option
  I.click('~Mail compose actions')
  I.waitForText('Request read receipt')
  I.click('Request read receipt')
  // Send mail
  mail.send()
  I.logout()

  // Continue as recipient
  I.login('app=io.ox/mail', { user: recipient })
  I.waitForApp()
  // Wait for the mail to show up
  I.waitForText('Subject')
  // Select it
  mail.selectMail('Subject')
  // Wait for the read-receipt dialog
  I.waitForText('Send a read receipt')
  // Send read receipt
  I.click('Send a read receipt')
  I.waitForVisible('.io-ox-alert')
  I.waitToHide('.generic-toolbar.mail-progress', 45)
  I.logout()

  // And back to the sender
  I.login('app=io.ox/mail', { user: sender })
  I.waitForApp()
  // Wait for the read receipt to show up
  I.waitForText('Read acknowledgement')

  // Can't check external clients here.
  // So we're done with this testcase
})
