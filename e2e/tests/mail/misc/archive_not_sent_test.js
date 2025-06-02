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

Feature('Mail > Archive')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario.skip("[OXUIB-1717] Don't archive sent mails", async ({ I, mail, users }) => {
  const subject = 'My thanks to you'

  await Promise.all([
    I.haveSetting('io.ox/mail//viewOptions', { 'default0/INBOX': { order: 'desc', thread: true } }),
    I.haveMail({
      attachments: [{ content: 'this really is not a scam mail!', content_type: 'text/plain', disp: 'inline' }],
      from: users[1],
      sendtype: 0,
      subject,
      to: users[0]
    }, { user: users[1] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail(subject)

  I.click('~Reply to sender')
  I.waitForFocus('.plain-text')

  mail.send()

  // wait for threadview to have 2 children
  I.waitForElement('.list-item[data-cid="default0/INBOX/Sent Items.1"]', 10)
  I.clickToolbar('~Archive')
  I.waitForNetworkTraffic()

  I.waitForElement('.folder[data-id="default0/INBOX/Archive"] div.folder-arrow', 15)
  I.waitForClickable('.folder[data-id="default0/INBOX/Archive"] div.folder-arrow', 15)
  I.click('.folder-arrow', '~Archive')
  I.selectFolder(`default0/INBOX/Archive/${new Date().getFullYear()}`)

  I.waitForText(subject)
  I.dontSee(`Re: ${subject}`)
})
