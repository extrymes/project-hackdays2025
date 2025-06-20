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

Feature('Mail Compose > Attachment quota')

const expect = require('chai').expect

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('I can not send too large files as mail attachments', async ({ I, users, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  await I.executeScript(async function () {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    return settings.set('properties', { attachmentQuotaPerFile: 2 * 1024 * 1024 })
  })

  // compose mail with receiver and subject
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test')

  // add a too large file as attachment
  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/16MB.dat')
  I.waitForText('The file "16MB.dat" cannot be uploaded because it exceeds the maximum file size of 2 MB', 5, '.io-ox-alert.io-ox-alert-error')
  I.waitForElement('[data-action="close"]', 5)
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)

  // change attachment and send successfully
  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')
  I.waitForText('DAT', 5, '.attachment-list.preview')
  I.waitForDetached('.progress-container', 15)

  // send mail successfully
  mail.send()
  I.waitForElement('.list-item.selectable.unread', 30)
})

Scenario('I can not send too large accumulated mail attachments', async ({ I, users, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  await I.executeScript(async function () {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    settings.set('properties', { attachmentQuotaPerFile: 16 * 1024 * 1024 })
    return settings.set('properties', { attachmentQuota: 5 * 1024 * 1024 })
  })

  // compose mail with receiver and subject
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test')

  // add attachments
  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')
  I.waitForText('DAT', 5, '.attachment-list.preview')
  I.waitForDetached('.progress-container', 15)
  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/16MB.dat')

  I.waitForText('The file "16MB.dat" cannot be uploaded because it exceeds the total attachment size limit of 5 MB', 5, '.io-ox-alert.io-ox-alert-error')
})

// no file input field in tinymce 5
Scenario('I can not send an email that exceeds the mail max size', async ({ I, users, mail, tinymce }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  await I.executeScript(async function () {
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    return mailSettings.set('compose/maxMailSize', 3 * 1024)
  })

  // compose mail with receiver and subject
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test')

  // first attached, second inline
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600-limegreen.png')
  I.waitForDetached('.progress-container', 15)
  await tinymce.attachInlineImage('media/placeholder/800x600.png')

  I.waitForText('The file cannot be uploaded because it exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)
  await within({ frame: '.tox-edit-area iframe' }, async () => {
    I.dontSee('#tinymce img')
    expect(await I.grabNumberOfVisibleElements('#tinymce img')).to.equal(0)
  })

  // remove attached
  I.click('.mail-attachment-list a[title="Toggle preview"]')
  I.waitForElement('.mail-attachment-list button[title=\'Remove attachment "800x600-limegreen.png"\']')
  I.click('.mail-attachment-list button[title=\'Remove attachment "800x600-limegreen.png"\']')
  I.waitForDetached('.mail-attachment-list span[title="2MB.dat"]')

  // first inline, second attached
  await tinymce.attachInlineImage('media/placeholder/800x600-limegreen.png')
  await within({ frame: '.tox-edit-area iframe' }, async () => {
    I.waitForElement('#tinymce img')
    expect(await I.grabNumberOfVisibleElements('#tinymce img')).to.equal(1)
  })
  await tinymce.attachInlineImage('media/placeholder/800x600.png')

  I.waitForText('The file cannot be uploaded because it exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)

  // try multiple inline images
  await tinymce.attachInlineImage('media/placeholder/800x600-mango.png')
  I.waitForText('The file cannot be uploaded because it exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)

  await within({ frame: '.tox-edit-area iframe' }, async () => {
    I.waitForElement('#tinymce img')
    expect(await I.grabNumberOfVisibleElements('#tinymce img')).to.equal(1)
  })
})

// TODO: not able to adjust quota with `I.executeScript` approach 😞
Scenario.skip('[OXUIB-1089] I can send a quota exceeding file out of drive by mail', async ({ I, drive }) => {
  // file size 9462 (4731 * 2)
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')

  I.login('app=io.ox/files')
  I.waitForApp()

  // adjust quota
  await I.executeScript(async function () {
    const { default: quotaAPI } = await import(String(new URL('io.ox/core/api/quota.js', location.href)))
    quotaAPI.mailQuota.set('quota', 1024)
  })

  drive.selectFile('testdocument.odt')
  I.waitForVisible('~Details')
  I.clickToolbar('~More actions')
  I.clickDropdown('Send by email')

  I.waitForText('Mail quota limit reached.')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
  I.see('ODT')
  I.seeCheckboxIsChecked('.share-attachments [type="checkbox"]')
})

// TODO: not able to adjust quota with `I.executeScript` approach 😞
Scenario.skip('[OXUIB-1089] I can send file out of drive by mail', async ({ I, drive }) => {
  // file size 9462 (4731 * 2)
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')

  I.login('app=io.ox/files')
  I.waitForApp()

  // adjust quota
  await I.executeScript(async function () {
    const { default: quotaAPI } = await import(String(new URL('io.ox/core/api/quota.js', location.href)))
    quotaAPI.mailQuota.set('quota', 16 * 1024)
  })

  drive.selectFile('testdocument.odt')
  I.waitForVisible('~Details')
  I.clickToolbar('~More actions')
  I.clickDropdown('Send by email')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
  I.see('ODT')
  I.dontSeeCheckboxIsChecked('.share-attachments [type="checkbox"]')
})

// no file input fields in tinymce 5
Scenario('I can not use drive if the infoStore limits get exceeded', async ({ I, users, mail, tinymce }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  await I.executeScript(async function () {
    const { settings: coreSettings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    mailSettings.set('compose/maxMailSize', 3 * 1024)
    return coreSettings.set('properties', { infostoreQuota: 7 * 1024 })
  })

  // compose mail with receiver and subject
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test')

  // attach
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600.png')
  I.waitForDetached('.progress-container', 15)

  // error for attachment and inline
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600-limegreen.png')
  I.waitForText('The file cannot be uploaded because it exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)
  await tinymce.attachInlineImage('media/placeholder/800x600-limegreen.png')
  I.waitForText('The file cannot be uploaded because it exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
  I.click('[data-action="close"]', '.io-ox-alert.io-ox-alert-error')
  I.waitForDetached('.io-ox-alert.io-ox-alert-error', 5)

  // use drive
  I.checkOption('Use Drive Mail', '.share-attachments')

  // attach another
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600-mango.png')
  I.waitForDetached('.progress-container', 15)
  await tinymce.attachInlineImage('media/placeholder/800x600.png')
  await within({ frame: '.tox-edit-area iframe' }, async () => {
    I.waitForElement('#tinymce img')
    expect(await I.grabNumberOfVisibleElements('#tinymce img')).to.equal(1)
  })

  I.uncheckOption('Use Drive Mail', '.share-attachments')
  I.waitForText('The uploaded attachment exceeds the maximum email size of 3 kB', 5, '.io-ox-alert.io-ox-alert-error')
})
