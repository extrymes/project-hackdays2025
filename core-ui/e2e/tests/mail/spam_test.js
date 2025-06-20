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

Feature('Mail > Spam')

Before(async function ({ users }) {
  const user = users.getRandom()
  user.gui_spam_filter_enabled = true
  await users.create(user)
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Mark mail in spam folder as not spam and move to inbox, with ui and keyboard shortcuts', async ({ I, mail, users }) => {
  const [user] = users
  const subject = 'test subject'

  await user.hasCapability('spam')

  await I.haveMail({
    from: user,
    to: user,
    subject
  })

  I.login('app=io.ox/mail')

  I.waitForVisible('.io-ox-mail-window')
  I.waitForVisible(locate('span').withAttr({ title: subject }))
  I.retry(3).rightClick(subject, '.list-item')
  I.click('Mark as spam', '.smart-dropdown-container')
  I.selectFolder('Spam')
  I.waitForVisible(locate('span').withAttr({ title: subject }))
  I.rightClick(subject, '.list-item')
  I.click('Not spam', '.smart-dropdown-container')
  I.selectFolder('Inbox')
  I.waitForVisible(locate('span').withAttr({ title: subject }))

  mail.selectMail(subject)
  I.pressKey('q')
  I.selectFolder('Spam')
  I.waitForVisible(locate('span').withAttr({ title: subject }))
  mail.selectMail(subject)
  I.pressKey('p')
  I.selectFolder('Inbox')
  I.waitForVisible(locate('span').withAttr({ title: subject }))
})

Scenario('[C114951] Disabled links in spam mail folders', async ({ I, users, mail }) => {
  users[0].hasConfig('com.openexchange.mail.maliciousFolders.listing', '$Spam, default0/Phishing')

  await I.haveMail({
    folder: 'default0/Spam',
    path: 'media/mails/C114951.eml'
  })

  const defaultFolder = await I.grabDefaultFolder('mail')

  await I.haveFolder({
    title: 'Phishing',
    module: 'mail',
    parent: defaultFolder
  })

  await I.haveMail({
    folder: 'default0/Phishing',
    path: 'media/mails/C114951.eml'
  })

  I.login(['app=io.ox/mail'])
  I.waitForApp()
  I.waitForVisible('.io-ox-mail-window')
  I.waitForText('Spam', 5, '.folder-tree')
  I.selectFolder('Spam')
  I.waitForText('Rudolf rockt die Kinderkollektion', 10, '.list-view li.list-item')
  mail.selectMail('Rudolf rockt die Kinderkollektion')
  I.waitForElement('.mail-detail-frame')

  await within({ frame: '.mail-detail-frame' }, async function () {
    // Checking attribute "disabled" on specific link
    I.waitForElement(locate('.customer-ribbon-link')
      .withAttr({ disabled: 'disabled' })
      .withText('Hello Member - Melde dich an & nutze deine Member-Angebote! Noch kein Member? Jetzt anmelden.')
    )
  })

  I.selectFolder('Phishing')
  mail.selectMail('Rudolf rockt die Kinderkollektion!')
  I.waitForElement('.mail-detail-frame')

  await within({ frame: '.mail-detail-frame' }, async function () {
    // Checking attribute "disabled" on specific link
    I.waitForElement(locate('.customer-ribbon-link')
      .withAttr({ 'aria-disabled': 'true' })
      .withText('Hello Member - Melde dich an & nutze deine Member-Angebote! Noch kein Member? Jetzt anmelden.')
    )
  })
})
