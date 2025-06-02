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

const expect = require('chai').expect

Feature('Mail Compose')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Compose and discard with/without prompts', async ({ I, users, mail, settings }) => {
  // preparations
  await I.haveSnippet({
    content: '<p>My unique signature content</p>',
    displayname: 'My signature',
    misc: { insertion: 'above', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })
  await I.haveSetting('io.ox/mail//appendVcard', false)
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  I.waitForApp()

  const userAddressIdentifier = users[0].get('email1').replace(/[@.]/g, '-')

  // workflow 1: Compose & discard
  mail.newMail()
  I.click('~Close', '.io-ox-mail-compose-window')
  I.dontSee('This email has not been sent. You can save the draft to work on later.')
  I.waitForDetached('.io-ox-mail-compose')

  // workflow 3: Compose & discard with signature and vcard
  settings.open('Mail', 'Advanced settings')
  I.waitForText('Always attach my detailed contact data as vCard', 5, '.settings-detail-pane')
  I.click('Always attach my detailed contact data as vCard')

  settings.expandSection('Signatures')
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'My signature')
  I.selectOption(`#defaultReplyForwardSignature-${userAddressIdentifier}`, 'No signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  settings.close()
  mail.newMail()

  let text = await I.grabValueFrom({ css: 'textarea.plain-text' })
  text = Array.isArray(text) ? text[0] : text
  expect(text).to.contain('My unique signature content')
  I.see('VCF', '.io-ox-mail-compose .mail-attachment-list')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.dontSee('This email has not been sent. You can save the draft to work on later.')

  // workflow 4: Compose with subject, then discard
  mail.newMail()
  I.fillField('Subject', 'Test deleted draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.see('This email has not been sent. You can save the draft to work on later.')
  I.click('Delete draft')
  I.selectFolder('Trash')
  I.triggerRefresh()
  I.waitForNetworkTraffic()
  I.dontSee('Test deleted draft')
  I.selectFolder('Inbox')

  // workflow 5: Compose with to, subject, some text, then send
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  I.fillField({ css: 'textarea.plain-text' }, 'Testcontent')
  mail.send()

  I.waitForVisible({ css: 'li.unread' }, 30) // wait for one unread mail
  mail.selectMail('Testsubject')
  I.see('Testsubject', '.mail-detail-pane')
  I.waitForVisible('.mail-detail-pane .attachments')
  I.see('1 attachment')

  I.waitForElement('.mail-detail-frame')
  I.switchTo('.mail-detail-frame')
  I.see('Testcontent')
  I.switchTo()

  // workflow 2: Reply & discard
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text')
  I.wait(0.5)
  text = await I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')
  text = Array.isArray(text) ? text[0] : text
  expect(text).to.match(new RegExp(
    '\\n' +
        '> On .*wrote:\\n' + // e.g. "> On November 28, 2018 3:30 PM User f484eb <test.user-f484eb@ox-e2e-backend.novalocal> wrote:"
        '> \\n' +
        '>  \\n' +
        '> Testcontent'
  ))
  I.click('~Close', '.io-ox-mail-compose-window')
  I.dontSee('This email has not been sent. You can save the draft to work on later.')
})

Scenario('Compose mail with different attachments', async ({ I, users, mail, tinymce, drive }) => {
  await Promise.all([
    users[0].context.hasCapability('document_preview'),
    I.haveSetting('io.ox/mail//messageFormat', 'html')
  ])
  await I.waitForCapability('document_preview')

  I.login('app=io.ox/files')
  I.waitForApp()

  // create textfile in drive
  drive.clickSecondary('New note')
  I.waitForVisible('.io-ox-editor')
  I.fillField('Title', 'Testdocument.txt')
  I.fillField('Note', 'Some content')
  I.click('Save')
  I.waitForText('Save', 5, '.io-ox-editor-window .window-footer')
  I.click('Close')

  I.openApp('Mail')

  // workflow 6: Compose with local Attachment(s)
  // workflow 7: Compose with file from Drive
  // workflow 8: Compose with inline images
  mail.newMail()

  // upload local file via the hidden input in the toolbar
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600.png')

  I.waitForElement('.attachments .attachment.io-ox-busy')
  I.waitForInvisible('.attachments .attachment.io-ox-busy')
  // check preview of local file
  const preview = locate('.viewer-displayer-item[src]').as('Viewer image preview')
  I.click('.preview li:nth-of-type(1)')
  I.waitForElement(preview)
  I.click('~Close', '.viewer-toolbar')
  I.waitForDetached(preview)

  I.click('~Attachments')
  I.click('Add from Drive')
  I.waitForText('Testdocument.txt')
  I.click('Add')

  // check preview of drive file
  I.waitForElement('.attachments .attachment.io-ox-busy')
  I.waitForInvisible('.attachments .attachment.io-ox-busy')
  I.click('.preview li:nth-of-type(2)')
  I.waitForElement(preview)
  I.click('~Close', '.viewer-toolbar')
  I.waitForDetached(preview)

  // attach inline image
  await tinymce.attachInlineImage('media/placeholder/800x600.png')
  I.waitNumberOfVisibleElements('.attachments .attachment-list > li', 2)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.waitForVisible('img')
  })
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  mail.send()

  I.waitForVisible({ css: 'li.unread' }, 30) // wait for one unread mail
  mail.selectMail('Testsubject')
  I.see('Testsubject', '.mail-detail-pane')
  I.waitForVisible('.attachments')
  I.waitForText('3 attachments', 5, '.mail-detail-pane')

  // workflow 12: Reply e-mail with attachment and re-adds attachments of original mail

  I.click('Reply to sender')

  // upload local file via the hidden input in the toolbar
  I.waitForElement('.composetoolbar input[type="file"]')
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600.png')
  I.waitNumberOfVisibleElements('.attachments .attachment-list > li', 1)
  I.wait(1) // there still might be a focus event somewhere

  mail.send()

  I.waitForVisible({ css: 'li.unread' }, 30) // wait for one unread mail
  mail.selectMail('Testsubject')
  I.see('Testsubject', '.mail-detail-pane')
  I.waitForVisible('.attachments')
  I.waitForText('2 attachments', 5, '.mail-detail-pane') // has 2 attachments as one of the attachments is inline
})

Scenario('Compose with inline image, which is removed again', async ({ I, users, mail, tinymce }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'html')

  I.login('app=io.ox/mail')

  // workflow 9: Compose, add and remove inline image
  mail.newMail()

  // attach inline image
  await tinymce.attachInlineImage('media/placeholder/800x600.png')

  I.switchTo('.io-ox-mail-compose-window .editor iframe')
  I.waitForElement({ css: 'img' })
  I.click({ css: 'img' })
  I.pressKey('Delete')
  I.switchTo()

  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  mail.send()

  I.waitForVisible({ css: 'li.unread' }, 30) // wait for one unread mail
  mail.selectMail('Testsubject')
  I.see('Testsubject', '.mail-detail-pane')
  I.waitForVisible('.mail-detail-frame')
  I.dontSeeElement('.attachments')
})

Scenario('Compose with drivemail attachment and edit draft', async ({ I, users, mail, drive, dialogs }) => {
  await Promise.all([
    users.create(),
    users[0].hasConfig('com.openexchange.mail.deleteDraftOnTransport', true),
    I.haveSetting({
      'io.ox/mail': {
        messageFormat: 'html',
        'features/deleteDraftOnClose': true,
        deleteDraftOnTransport: true
      }
    })
  ])
  I.login('app=io.ox/files')

  I.waitForApp()
  drive.clickSecondary('New note')
  I.waitForVisible('.io-ox-editor')
  I.fillField('Title', 'Testdocument.txt')
  I.fillField('Note', 'Some content')
  I.waitForClickable(locate('button').withText('Save'))
  I.click('Save')
  I.waitForEnabled(locate('button').withText('Save'), 10)
  I.waitForNetworkTraffic()
  I.click('Close')

  I.click(locate({ css: 'button[data-id="io.ox/mail"]' }).inside('#io-ox-quicklaunch'))
  I.waitForApp()

  // workflow 10: Compose with Drive Mail attachment
  mail.newMail()

  I.click('~Attachments')
  I.click('Add from Drive')
  dialogs.waitForVisible()
  I.waitForText('Testdocument.txt')
  dialogs.clickButton('Add')

  I.waitForText('Use Drive Mail')
  I.checkOption('Use Drive Mail')
  I.fillField('Subject', 'Testsubject #1')
  I.click('~Save and close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.io-ox-mail-compose-window')

  I.selectFolder('Drafts')
  mail.selectMail('Testsubject #1')

  // workflow 17: Edit copy
  I.clickToolbar('~Edit copy')
  I.waitForElement('.editor iframe')
  within({ frame: '.editor iframe' }, () => {
    I.fillField('body', 'Editing a copy')
  })
  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject #2')
  mail.send()
  I.waitForDetached('.io-ox-taskbar-container .taskbar-button')

  // workflow 11: Compose mail, add Drive-Mail attachment, close compose, logout, login, edit Draft, remove Drive-Mail option, send Mail
  // workflow 16: Edit draft
  I.clickToolbar('~Edit draft')
  I.waitForElement('.editor iframe')
  within({ frame: '.editor iframe' }, () => {
    I.fillField('body', 'Editing draft')
  })
  I.waitForText('Use Drive Mail')
  I.checkOption('Use Drive Mail')
  I.seeNumberOfVisibleElements('.attachment-list.preview > li', 1)

  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject #3')
  mail.send()
  I.waitForDetached('.io-ox-taskbar-container .taskbar-button')

  I.selectFolder('Inbox')

  I.waitForVisible('.list-view li.unread', 30) // wait for one unread mail
  mail.selectMail('Testsubject #3')

  I.waitForElement('.mail-detail-frame')
  I.switchTo('.mail-detail-frame')
  I.see('Testdocument.txt')
  I.switchTo()
})

Scenario('Compose mail with vcard and read receipt', async ({ I, users, mail }) => {
  await users.create()
  I.login('app=io.ox/mail')

  // workflow 13: Compose mail and attach v-card
  // workflow 15: Compose with read-receipt
  mail.newMail()

  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  I.click('~Mail compose actions')
  I.click('Attach Vcard')
  I.click('~Mail compose actions')
  I.click('Request read receipt')
  mail.send()

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })

  I.waitForVisible({ css: 'li.unread' }, 30) // wait for one unread mail
  mail.selectMail('Testsubject')
  I.waitForVisible('.attachments')
  I.see('1 attachment')

  // I.logout();

  // I.login('app=io.ox/mail');

  // TODO: check read acknowledgement
  // I.waitForVisible({ css: 'li.unread' }); // wait for one unread mail
  // I.click({ css: 'li.unread' });
  // I.waitForVisible('.mail-detail-pane .subject');
  // I.see('Read acknowledgement', '.mail-detail-pane');
})

Scenario('Compose mail, refresh and continue work at restore point', async ({ I, users, mail }) => {
  const [user] = users

  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  await I.haveSetting('io.ox/mail//autoSaveAfter', 1000)

  I.login()
  mail.newMail()

  I.fillField('To', user.get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  I.fillField({ css: 'textarea.plain-text' }, 'Testcontent')
  // give it some time to store content
  I.wait(3)

  I.refreshPage()
  I.waitForElement(locate('.btn-primary').withText('New email'), 30)
  I.waitForNetworkTraffic()

  I.selectFolder('Drafts')
  I.waitForText('Testsubject')
  mail.selectMail('Testsubject')

  I.waitForText('Testsubject', 5, '.detail-view-header')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForText('Testcontent', 5, '.mail-detail-content')
  })
})

Scenario.skip('Close compose window on escape', async ({ I, users, mail }) => {
  I.login(['app=io.ox/mail'])
  mail.newMail()
  mail.newMail()
  mail.newMail()

  I.waitForVisible('.floating-window')

  I.seeNumberOfVisibleElements('.floating-window', 3)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.seeNumberOfVisibleElements('.floating-window', 2)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.seeNumberOfVisibleElements('.floating-window', 1)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.waitForDetached('.floating-window')
  I.waitForFocus('.primary-action > button:first-of-type')
})
