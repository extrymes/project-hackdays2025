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

Feature('Mail > Virtual Attachments')

Before(async ({ users }) => {
  const user = await users.create()
  await Promise.all([
    user.hasConfig('com.openexchange.file.storage.mail.enabled', true),
    user.hasConfig('com.openexchange.file.storage.mail.fullNameAll', 'VirtualAttachments/virtual/all'),
    user.hasConfig('com.openexchange.file.storage.mail.fullNameReceived', 'VirtualAttachments/INBOX'),
    user.hasConfig('com.openexchange.file.storage.mail.fullNameSent', 'VirtualAttachments/INBOX/Sent')
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C83396] View all attachments (from Mail)', async ({ I, users, drive, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C83396')
  I.pressKey('Enter')
  I.fillField({ css: 'textarea.plain-text' }, 'Yo!')
  mail.addAttachment('media/files/generic/testdocument.rtf')
  mail.addAttachment('media/files/generic/testdocument.odt')
  mail.addAttachment('media/files/generic/testpresentation.ppsm')
  mail.send()
  I.openApp('Drive')
  I.waitForApp()
  I.selectFolder('My attachments')
  within('.list-view', () => {
    I.waitForText('In Sent')
    I.waitForText('In Inbox')
    I.waitForElement('.filename[title="testdocument.rtf"]')
  })
})

Scenario('[C83397] View all attachments (from Drive)', async ({ I, users, drive, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C83396')
  I.pressKey('Enter')
  I.fillField({ css: 'textarea.plain-text' }, 'Yo!')
  mail.addAttachment('media/files/generic/testdocument.rtf')
  mail.addAttachment('media/files/generic/testdocument.odt')
  mail.addAttachment('media/files/generic/testpresentation.ppsm')
  mail.send()
  I.logout()

  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('My attachments')
  within('.list-view', () => {
    I.waitForText('In Sent')
    I.waitForText('In Inbox')
    I.waitForElement('.filename[title="testdocument.rtf"]')
  })
})

Scenario('[C83398] View all INBOX attachments', async ({ I, users, drive, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C83396')
  I.pressKey('Enter')
  I.fillField({ css: 'textarea.plain-text' }, 'Yo!')
  mail.addAttachment('media/files/generic/testdocument.rtf')
  mail.addAttachment('media/files/generic/testdocument.odt')
  mail.addAttachment('media/files/generic/testpresentation.ppsm')
  mail.send()
  I.logout()

  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('My attachments')
  I.selectFolder('In Inbox')
  within('.list-view', () => {
    I.waitForText('testdocument')
    I.waitForElement('.filename[title="testdocument.rtf"]')
    I.waitForElement('.filename[title="testdocument.odt"]')
    I.waitForElement('.filename[title="testpresentation.ppsm"]')
    I.seeNumberOfVisibleElements('.list-item', 3)
    I.dontSee('In Sent')
    I.dontSee('In Inbox')
  })
})

Scenario('[C125297] Attachments are linked to mails', async ({ I, users, drive, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C83396')
  I.pressKey('Enter')
  I.fillField({ css: 'textarea.plain-text' }, 'Yo!')
  mail.addAttachment('media/files/generic/testdocument.rtf')
  mail.addAttachment('media/files/generic/testdocument.odt')
  mail.addAttachment('media/files/generic/testpresentation.ppsm')
  mail.send()
  I.logout()

  // Login Drive and select Attachment Folder
  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('My attachments')
  I.selectFolder('My attachments')
  within('.list-view', () => {
    I.waitForText('testdocument')
    I.waitForElement('.filename[title="testdocument.rtf"]')
    I.waitForElement('.filename[title="testdocument.odt"]')
    I.waitForElement('.filename[title="testpresentation.ppsm"]')
  })

  // Open Dropdown and select 'view' to to open detail-view
  within('~Files', () => {
    I.waitForText('testpresentation')
    I.rightClick(locate('.file-type-ppt').withText('testpresentation'))
  })
  I.clickDropdown('View')

  // Wait for detail-view and open attachment Email
  I.waitForElement('.io-ox-viewer:not(.standalone) .sidebar-panel-body')
  within(locate('.io-ox-viewer:not(.standalone) .sidebar-panel-body'), () => {
    I.waitForText('View message')
    I.click('View message')
  })

  // Check Email for attachment
  I.waitForElement('.detail-popup-mail')
  within(locate('.detail-popup-mail'), () => {
    I.see('3 attachments')
    I.click('3 attachments')
    I.waitForText('testpresentation')
  })
})
