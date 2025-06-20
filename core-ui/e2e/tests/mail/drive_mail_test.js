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

const moment = require('moment')

Feature('Mail > Drive Mail')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

// Feature was disabled due to https://jira.open-xchange.com/browse/DOP-2955
Scenario.skip('[C85691] Cloud icon is used for drive-mail', async ({ I, users, mail }) => {
  I.login('app=io.ox/mail')
  mail.newMail()

  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Git Gud')

  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.rtf')
  I.click('Use Drive Mail', '.share-attachments')
  mail.send()

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForElement('.io-ox-mail-window')
  I.waitForText('Git Gud')
  I.waitForElement('.list-view .list-item-row > svg.is-shared-attachment')
})

Scenario('[C85685] Send drive-mail to internal recipient', async ({ I, users, mail, drive }) => {
  const [batman, robin] = users

  // 1. Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // 2. Add internal recipient, subject and mail text
  const subject = 'About the Batcave'
  const mailText = 'WE NEED TO TALK ASAP!'
  I.fillField('To', robin.get('primaryEmail'))
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // 3. Under Attachments choose "Add local file"
  // 4. Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.odt')

  // Expected Result: Attachment section opens containing a link: "Drive Mail"
  I.waitForText('ODT', undefined, '.io-ox-mail-compose-window')
  I.waitForText('Use Drive Mail', undefined, '.io-ox-mail-compose-window')

  // 5. Click "Drive Mail" to enable Drive Mail
  I.click('Use Drive Mail', '.share-attachments')

  // Expected Result: Drive Mail will get enabled and further options are shown.
  I.waitForText('Options', undefined, '.io-ox-mail-compose-window .attachments')
  I.seeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // 7. Verify a new folder with the name of the mail's subject was created in Drive, containing the mail's attachments
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.openApp('Drive')
  I.waitForText('Drive Mail', undefined, '.file-list-view')
  I.doubleClick(locateClickableFolder('Drive Mail'), '.file-list-view')

  // Expected Result: Drive -> My files -> Drive Mail -> $subject
  I.waitForText(subject, undefined, '.file-list-view')
  I.doubleClick(locateClickableFolder(subject), '.file-list-view')
  I.waitForElement('.filename[title="testdocument.odt"]')

  I.logout()

  // 8. Verify the mail as the recipient
  I.login('app=io.ox/mail', { user: robin })
  mail.selectMail(subject)

  // Expected Result: Above the content an information is shown that the sender has shared some files with you plus a link to that files
  I.see(`${batman.get('given_name')} ${batman.get('sur_name')} has shared the following file with you:`)
  I.see('testdocument.odt')

  I.waitForElement('.mail-detail-frame')
  // 9. Verify link redirects you to the files and the files are accessible.
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.click('View file')
  })
  // this runs in old UI; breaks here once everything is new UI
  I.waitForText('testdocument.odt', 30, '.list-view')
  // TODO: check if a download helper is feasible
})

Scenario('[C85687] Send drive-mail with expiry date', async ({ I, users, mail, dialogs, drive }) => {
  const [batman, commissionerGordon] = users

  // Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // Add external recipient, subject and mail text
  const subject = 'Modernize the Batsignal'
  const mailText = 'Let\'s discuss $subject! Time is running out!'
  const externalRecipient = commissionerGordon.get('primaryEmail').replace('@', '+gordon@')
  I.fillField('To', externalRecipient)
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Under Attachments choose "Add local file"
  // Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.odt')
  // Expected Result: Attachment section opens containing a link: "Drive Mail"
  I.waitForText('ODT', undefined, '.io-ox-mail-compose-window')
  I.waitForText('Use Drive Mail', undefined, '.io-ox-mail-compose-window')
  // Click "Drive Mail" to enable Drive Mail
  I.click('Use Drive Mail', '.share-attachments')

  // Expected Result: Drive Mail will get enabled and further options are shown.
  I.waitForText('Options', undefined, '.io-ox-mail-compose-window .attachments')
  I.seeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  // Enter the options dialog
  I.click('Options')
  dialogs.waitForVisible()

  // Select 1 day as an expiry option
  I.waitForText('Expiration')
  I.selectOption('select[name="expiryDate"]', '1 day')

  // Set a password
  I.click('Use password')
  I.fillField('Password', 'secret')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  // This will be the day presented in the email
  const tomorrow = moment().utc().add(1, 'day').format('MMMM D, YYYY')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // Verify a new folder with the name of the mail's subject was created in Drive, containing the mail's attachments
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.openApp('Drive')
  I.waitForApp()
  I.waitForText('Drive Mail', undefined, '.file-list-view')
  I.waitForVisible(locateClickableFolder('Drive Mail'))
  I.selectFolder('Drive Mail')
  I.waitForText(subject, 5, '.file-list-view')
  I.selectFolder(subject)
  I.waitForElement('.filename[title="testdocument.odt"]', 10)
  I.logout()

  // Verify the mail as the recipient
  I.login('app=io.ox/mail', { user: commissionerGordon })
  mail.selectMail(subject)
  // Expected Result: Above the content an information is shown that the sender has shared some files with you plus a link to that files
  I.waitForText(`${batman.get('given_name')} ${batman.get('sur_name')} has shared the following file with you:`)
  I.waitForText('View file')

  I.waitForVisible('.mail-detail-frame')
  // Verify the password and expiry date is part of the email
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.see('Please use the following password: secret', '.container p')
    I.see('The link will expire on ' + tomorrow, '.container p')
  })

  // Omitted: Check that the link actually expires after one day.
})

Scenario('[C85689] Send drive-mail with an attachment below the threshold', async ({ I, users, mail, drive }) => {
  const [batman, commissionerGordon] = users
  await batman.hasConfig('com.openexchange.mail.compose.share.threshold', '' + (3 * 1024 * 1024)) // 3MB limit
  await batman.hasConfig('com.openexchange.mail.compose.share.enabled', 'true')
  // Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // Add external recipient, subject and mail text
  const subject = 'Modernize the Batsignal'
  const mailText = 'Let\'s discuss $subject!'
  const externalRecipient = commissionerGordon.get('primaryEmail').replace('@', '+gordon@')
  I.fillField('To', externalRecipient)
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Under Attachments choose "Add local file"
  // Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')
  // Expected Result: Attachment section opens containing a link: "Drive Mail"
  I.waitForText('DAT', undefined, '.io-ox-mail-compose-window')
  I.waitForElement('.progress')
  I.waitForText('Mail size', 60, '.io-ox-mail-compose-window')
  // Expected Result: Drive Mail will get enabled automatically and further options are shown.
  I.dontSeeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // Verify a new folder with the name of the mail's subject was NOT created in Drive
  I.openApp('Drive')
  I.waitForApp()
  I.dontSee('Drive Mail')

  I.logout()

  // Verify the mail as the recipient
  I.login('app=io.ox/mail', { user: commissionerGordon })
  mail.selectMail(subject)

  // Expected Result: Above the content an information is shown that the sender has shared some files with you plus a link to that files
  I.dontSee(`${batman.get('given_name')} ${batman.get('sur_name')} has shared the following file with you:`)

  I.waitForElement('.mail-detail-frame')
  // Verify link redirects you to the files and the files are accessible.
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.see('Let\'s discuss $subject!')
  })
})

Scenario('[C85688] Send drive-mail with an attachment above the threshold', async ({ I, users, mail, drive }) => {
  const [batman, commissionerGordon] = users
  await batman.hasConfig('com.openexchange.mail.compose.share.threshold', '' + (1 * 1024 * 1024)) // 1MB limit
  await batman.hasConfig('com.openexchange.mail.compose.share.enabled', 'true')
  // Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // Add external recipient, subject and mail text
  const subject = 'Modernize the Batsignal'
  const mailText = 'Let\'s discuss $subject!'
  const externalRecipient = commissionerGordon.get('primaryEmail').replace('@', '+gordon@')
  I.fillField('To', externalRecipient)
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Under Attachments choose "Add local file"
  // Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')
  // Expected Result: Attachment section opens containing a link: "Drive Mail"
  I.waitForText('DAT', undefined, '.io-ox-mail-compose-window')
  I.waitForElement('.progress')
  I.waitForText('Attachment file size too large.', 60)
  // Wait for upload progress bar to disappear
  I.waitForText('Use Drive Mail', undefined, '.io-ox-mail-compose-window')
  // Expected Result: Drive Mail will get enabled automatically and further options are shown.
  I.waitForText('Options', undefined, '.io-ox-mail-compose-window .attachments')
  I.seeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // Verify a new folder with the name of the mail's subject was created in Drive, containing the mail's attachments
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.openApp('Drive')
  I.waitForText('Drive Mail', undefined, '.file-list-view')
  I.doubleClick(locateClickableFolder('Drive Mail'), '.file-list-view')

  I.logout()

  // Verify the mail as the recipient
  I.login('app=io.ox/mail', { user: commissionerGordon })
  mail.selectMail(subject)

  // Expected Result: Above the content an information is shown that the sender has shared some files with you plus a link to that files
  I.see(`${batman.get('given_name')} ${batman.get('sur_name')} has shared the following file with you:`)
  I.see('2MB.dat')

  I.waitForElement('.mail-detail-frame')
  // Verify link redirects you to the files and the files are accessible.
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.click('View file')
  })
  I.wait(0.5)
  I.switchToNextTab()
  I.waitForApp()
  I.waitForText('Shared files')
  I.waitForElement(locate('.list-view li.list-item').withText('2MB.dat'))
})

Scenario('[C85684] Feature name is configurable', async ({ I, users, mail, drive }) => {
  const [batman, robin] = users
  await batman.hasConfig('com.openexchange.mail.compose.share.name', 'Bat Mail')
  // Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // Add internal recipient, subject and mail text
  const subject = 'About the Batcave'
  const mailText = 'WE NEED TO TALK ASAP!'
  I.fillField('To', robin.get('primaryEmail'))
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Under Attachments choose "Add local file"
  // Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.odt')
  // Expected Result: Attachment section opens containing a link: "Bat Mail"
  I.waitForText('ODT', undefined, '.io-ox-mail-compose-window')
  I.waitForText('Use Bat Mail', undefined, '.io-ox-mail-compose-window')

  // Click "Bat Mail" to enable Bat Mail
  I.click('Use Bat Mail', '.share-attachments')

  // Expected Result: Bat Mail will get enabled and further options are shown.
  I.waitForText('Options', undefined, '.io-ox-mail-compose-window .attachments')
  I.seeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // Verify a new folder with the name of the mail's subject was created in Drive, containing the mail's attachments
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.openApp('Drive')
  I.waitForApp()
  I.waitForText('Bat Mail', undefined, '.file-list-view')
  I.waitForVisible(locateClickableFolder('Bat Mail'))
  I.selectFolder('Bat Mail')

  // Expected Result: Drive -> My files -> Bat Mail -> $subject
  I.waitForText(subject, undefined, '.file-list-view')
  I.selectFolder(subject)
  I.waitForElement('.filename[title="testdocument.odt"]')
})

Scenario('[C85690] Expire date can be forced', async ({ I, users, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  // TODO: find a better way to do provisioning here.
  await I.executeScript(async function () {
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    mailSettings.set('compose/shareAttachments/requiredExpiration', true)
  })
  mail.newMail()

  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Plus Ultra!')

  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.rtf')

  I.click('Use Drive Mail', '.share-attachments')
  I.click('Options', '.mail-attachment-list');
  ['1 day', '1 week', '1 month', '3 months', '6 months', '1 year'].forEach((val) => {
    I.see(val)
  })

  I.dontSee('Never')
  I.selectOption('#expiration-select-box', '1 day')
  I.click('Apply')
  mail.send()

  I.openApp('Drive')
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.waitForText('Drive Mail', undefined, '.file-list-view')
  I.doubleClick(locateClickableFolder('Drive Mail'), '.file-list-view')
  I.waitForText('Plus Ultra!')

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForElement('.io-ox-mail-window')
  I.waitForText('Plus Ultra!')
})

Scenario('[C85686] Send drive-mail to external recipient', async ({ I, users, mail, drive }) => {
  const [batman, commissionerGordon] = users

  // Go to Mail -> Compose
  I.login('app=io.ox/mail', { user: batman })
  mail.newMail()

  // Add external recipient, subject and mail text
  const subject = 'Modernize the Batsignal'
  const mailText = 'Let\'s discuss $subject!'
  const externalRecipient = commissionerGordon.get('primaryEmail').replace('@', '+gordon@')
  I.fillField('To', externalRecipient)
  I.fillField('Subject', subject)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.fillField('body', mailText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Under Attachments choose "Add local file"
  // Select a file
  // I use a helper function here and directly feed the file into the input field
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/testdocument.odt')
  // Expected Result: Attachment section opens containing a link: "Drive Mail"
  I.waitForText('ODT', undefined, '.io-ox-mail-compose-window')
  I.waitForText('Use Drive Mail', undefined, '.io-ox-mail-compose-window')

  // Click "Drive Mail" to enable Drive Mail
  I.click('Use Drive Mail', '.share-attachments')

  // Expected Result: Drive Mail will get enabled and further options are shown.
  I.waitForText('Options', undefined, '.io-ox-mail-compose-window .attachments')
  I.seeCheckboxIsChecked('.io-ox-mail-compose-window .share-attachments input[type="checkbox"]')

  mail.send()

  // Expected Result: Mail gets sent successfully
  I.selectFolder('Sent')
  I.waitForText(subject, undefined, '.list-view')

  // Verify a new folder with the name of the mail's subject was created in Drive, containing the mail's attachments
  const locateClickableFolder = (text) => locate('li.list-item.selectable').withDescendant(locate('div').withText(text))
  I.openApp('Drive')
  I.waitForApp()
  I.waitForText('Drive Mail', undefined, '.file-list-view')
  I.waitForVisible(locateClickableFolder('Drive Mail'))
  I.selectFolder('Drive Mail')

  I.logout()

  // Verify the mail as the recipient
  I.login('app=io.ox/mail', { user: commissionerGordon })
  I.waitForApp()
  mail.selectMail(subject)

  // Expected Result: Above the content an information is shown that the sender has shared some files with you plus a link to that files
  I.see(`${batman.get('given_name')} ${batman.get('sur_name')} has shared the following file with you:`)
  I.see('testdocument.odt')

  I.waitForElement('.mail-detail-frame')
  // Verify link redirects you to the files and the files are accessible.
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.click('View file')
  })
  I.wait(0.3)
  I.retry(5).switchToNextTab()
  I.waitForVisible('.io-ox-files-window', 10)
  I.waitForApp()
  I.waitForText('Shared files')
  I.waitForElement(locate('.list-view li.list-item').withText('testdocument.odt'))
})
