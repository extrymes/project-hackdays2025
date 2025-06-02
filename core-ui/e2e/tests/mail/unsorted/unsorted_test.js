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

Before(async function ({ users }) {
  await users.create()
  await users.create()
  await users.create()
  await users.create()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7380] Send saved draft mail', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()

  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Test mail subject')
  I.fillField('textarea.plain-text', 'Body of mail')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForText('Save draft')
  I.click('Save draft')
  I.waitForDetached('.io-ox-mail-compose')

  I.selectFolder('Drafts')
  mail.selectMail('Test mail subject')
  I.doubleClick('.list-item[aria-label*="Test mail subject"]')
  I.waitForFocus('.io-ox-mail-compose textarea.plain-text')
  within('.io-ox-mail-compose', () => {
    I.seeInField('Subject', 'Test mail subject')
    I.seeInField('textarea.plain-text', 'Body of mail')
  })
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('Test mail subject')
  I.doubleClick('[title="Test mail subject"]')
  I.waitForText('Test mail subject', 5, '.io-ox-mail-detail-window')
})

Scenario('[C7381] Send email to multiple recipients', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('To', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('To', users[3].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'Test mail to multiple recipients')
  I.fillField('textarea.plain-text', 'Test mail to multiple recipients')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('Test mail to multiple recipients')
  I.doubleClick('[title="Test mail to multiple recipients"]')
  I.waitForElement('.io-ox-mail-detail-window')
  I.see('Test mail to multiple recipients', '.io-ox-mail-detail-window')
  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })
  I.selectFolder('Inbox')
  mail.selectMail('Test mail to multiple recipients')
  I.doubleClick('[title="Test mail to multiple recipients"]')
  I.waitForElement('.io-ox-mail-detail-window')
  I.see('Test mail to multiple recipients', '.io-ox-mail-detail-window')
  I.logout()

  I.login('app=io.ox/mail', { user: users[3] })
  I.selectFolder('Inbox')
  mail.selectMail('Test mail to multiple recipients')
  I.doubleClick('[title="Test mail to multiple recipients"]')
  I.waitForText('Test mail to multiple recipients', 5, '.io-ox-mail-detail-window')
})

Scenario('[C7382] Compose plain text mail', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Test plain text mail')
  I.fillField('textarea.plain-text', 'Test plain text mail')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  mail.selectMail('Test plain text mail')
  I.doubleClick('[title="Test plain text mail"]')
  I.waitForText('Test plain text mail', 5, '.io-ox-mail-detail-window')
})

Scenario('[C7384] Save draft', async ({ I, users, mail, dialogs }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'C7384 - Test draft subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test draft body')
  I.click('~Close', '.io-ox-mail-compose-window')

  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.selectFolder('Drafts')
  mail.selectMail('C7384 - Test draft subject')
  I.doubleClick('.list-item[aria-label*="C7384 - Test draft subject"]')
  I.waitForFocus('.io-ox-mail-compose textarea.plain-text')
  I.seeInField('Subject', 'C7384 - Test draft subject')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test draft body')
})

Scenario('[C7385] Write mail to BCC recipients', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.click('BCC')
  I.fillField('BCC', users[2].get('primaryEmail'))
  I.fillField('Subject', 'C7385 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C7385 - Test body')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C7385 - Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForText('C7385 - Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })
  I.selectFolder('Inbox')
  mail.selectMail('C7385 - Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForText('C7385 - Test subject', 5, '.mail-detail-pane .subject')
})

Scenario('[C7386] Write mail to CC recipients', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.click('CC')
  I.fillField('CC', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('CC', users[3].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C7386 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C7386 - Test body')
  mail.send()
  I.logout()

  // login and check with user1
  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C7386')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('C7386 - Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with user2
  I.login('app=io.ox/mail', { user: users[2] })
  I.selectFolder('Inbox')
  mail.selectMail('C7386')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('C7386 - Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with user3
  I.login('app=io.ox/mail', { user: users[3] })
  I.selectFolder('Inbox')
  mail.selectMail('C7386')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('C7386 - Test subject', 5, '.mail-detail-pane .subject')
})

function addFile (I, path) {
  const ext = path.match(/\.(.{3,4})$/)[1]
  I.attachFile({ css: 'input[type=file]' }, path)
  I.waitForText(ext.toUpperCase(), 5, '.attachment-list.preview')
}

Scenario('[C7387] Send mail with attachment from upload', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  within('.io-ox-mail-compose-window', function () {
    I.say('Fill TO and SUBJECT', 'blue')
    I.fillField('To', users[1].get('primaryEmail'))
    I.pressKey('Enter')
    I.fillField('Subject', 'C7387 - Test subject')
    I.pressKey('Enter')
    I.fillField({ css: 'textarea.plain-text' }, 'C7387 - Test subject')
    I.say('Add attachments', 'blue')
    addFile(I, 'media/files/generic/testdocument.odt')
    addFile(I, 'media/files/generic/testdocument.rtf')
    addFile(I, 'media/files/generic/testpresentation.ppsm')
    addFile(I, 'media/files/generic/testspreadsheed.xlsm')
    I.say('Send mail and logout', 'blue')
    I.click('Send')
  })

  I.waitForDetached('.io-ox-mail-compose')
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')

  mail.selectMail('C7387 - Test subject')
  I.say('Show attachments as list', 'blue')
  I.click('4 attachments')
  I.waitForText('testdocument.')
  I.waitForText('odt')
  I.waitForText('rtf')
  I.waitForText('ppsm')
  I.waitForText('xlsm')
})

Scenario('[C7388] Send mail with different priorities', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('High')
  I.waitForDetached('.dropup.open .dropdown-menu', 5)
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C7388 - Test subject Priority: High')
  I.fillField({ css: 'textarea.plain-text' }, 'C7388 - Test body')
  mail.send()

  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('Normal')
  I.waitForDetached('.dropup.open .dropdown-menu', 5)
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C7388 - Test subject Priority: Normal')
  I.fillField({ css: 'textarea.plain-text' }, 'C7388 - Test body')
  mail.send()

  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('Low')
  I.waitForDetached('.dropup.open .dropdown-menu', 5)
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C7388 - Test subject Priority: Low')
  I.fillField({ css: 'textarea.plain-text' }, 'C7388 - Test body')
  mail.send()

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.selectFolder('Inbox')
  I.waitNumberOfVisibleElements('.list-view .list-item', 3)

  mail.selectMail('C7388 - Test subject Priority: High')
  I.waitForText('C7388 - Test subject Priority: High', 5, '.detail-view-header .subject')
  I.waitForElement('.mail-detail-pane.selection-one .priority .high', 5)

  mail.selectMail('C7388 - Test subject Priority: Normal')
  I.waitForText('C7388 - Test subject Priority: Normal', 5, '.detail-view-header .subject')

  mail.selectMail('C7388 - Test subject Priority: Low')
  I.waitForText('C7388 - Test subject Priority: Low', 5, '.detail-view-header .subject')
  I.waitForElement('.mail-detail-pane.selection-one .priority .low', 5)
})

Scenario('[C7389] Send mail with attached vCard', async ({ I, users, mail, dialogs }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('Attach Vcard')
  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'C7389 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C7389 - Test body')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C7389 - Test subject')
  I.click('1 attachment')
  I.click(`${users[0].get('display_name')}.vcf`)
  I.waitForElement('.dropdown.open')
  I.click('Add to address book', '.dropdown.open .dropdown-menu')
  I.waitForElement('.io-ox-contacts-edit-window', 5)

  // confirm dirtycheck is working properly
  I.click('~Close', '.floating-header')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to discard your changes?', 5, dialogs.body)
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window', 5)
  I.openApp('Address Book')
  I.waitForVisible('.io-ox-contacts-window')
  I.selectFolder('Contacts')
  I.waitForText(`${users[0].get('sur_name')}`)
  I.retry(5).click(locate('.contact').inside('.vgrid-scrollpane').withText(`${users[0].get('sur_name')}`))
  I.waitForElement(`[href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForText(`${users[0].get('sur_name')}, ${users[0].get('given_name')}`, 5, '.contact-detail.view .contact-header .fullname')
})

Scenario('[C7403] Forward a single mail', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C7403 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C7403 - Test body')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C7403 - Test subject')
  I.clickToolbar('~Forward')
  I.waitForFocus('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input')
  I.fillField('To', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })
  I.selectFolder('Inbox')
  mail.selectMail('Fwd: C7403 - Test subject')
  I.see('Fwd: C7403 - Test subject', '.detail-view-header .subject')
})

Scenario('[C7404] Reply to single mail', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'C7404 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C7404 - Test subject')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C7404 - Test subject')
  I.clickToolbar('~Reply to sender')
  I.waitForFocus('.io-ox-mail-compose textarea.plain-text')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail')
  I.selectFolder('Inbox')
  mail.selectMail('Re: C7404 - Test subject')
  I.see('Re: C7404 - Test subject', '.mail-detail-pane .subject')
})

Scenario('[C8816] Cancel mail compose', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C8816 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C8816 - Test body')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.see('This email has not been sent. You can save the draft to work on later.')
  I.click('Delete draft')
})

Scenario('[C8820] Forward attachments', async ({ I, users, mail }) => {
  await I.haveSetting({
    'io.ox/mail': {
      'attachments/layout/detail/open': true,
      messageFormat: 'text'
    }
  })

  I.login('app=io.ox/mail')

  // login user 1 and send mail with attachments
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('Subject', 'C8820 - Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'C8820 - Test subject')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type=file]', 'media/files/generic/testdocument.odt')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type=file]', 'media/files/generic/testdocument.rtf')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type=file]', 'media/files/generic/testpresentation.ppsm')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type=file]', 'media/files/generic/testspreadsheed.xlsm')
  mail.send()
  I.selectFolder('Sent')
  I.waitForVisible({ css: `div[title="${users[1].get('primaryEmail')}"]` })
  I.logout()

  // login user 2, check mail and forward to user 3
  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('C8820 - Test subject')
  I.waitForElement('.mail-attachment-list')
  I.click('4 attachments')
  I.waitForElement('.mail-attachment-list.open')
  I.waitForElement('.mail-attachment-list.open [title="testdocument.odt"]')
  I.waitForElement('.mail-attachment-list.open [title="testdocument.rtf"]')
  I.waitForElement('.mail-attachment-list.open [title="testpresentation.ppsm"]')
  I.waitForElement('.mail-attachment-list.open [title="testspreadsheed.xlsm"]')
  I.see('C8820 - Test subject', '.mail-detail-pane .subject')
  I.click('~Forward')
  I.waitForFocus('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input')
  I.fillField('To', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  mail.send()
  I.logout()

  // login user 3 and check mail
  I.login('app=io.ox/mail', { user: users[2] })
  I.selectFolder('Inbox')
  mail.selectMail('Fwd: C8820 - Test subject')
  I.click('4 attachments')
  I.waitForElement('.mail-attachment-list.open')
  I.waitForElement('.mail-attachment-list.open [title="testdocument.odt"]')
  I.waitForElement('.mail-attachment-list.open [title="testdocument.rtf"]')
  I.waitForElement('.mail-attachment-list.open [title="testpresentation.ppsm"]')
  I.waitForElement('.mail-attachment-list.open [title="testspreadsheed.xlsm"]')
  I.see('Fwd: C8820 - Test subject', '.mail-detail-pane .subject')
})

Scenario('[C8829] Recipients autocomplete', async ({ I, users, mail }) => {
  const contact = {
    display_name: 'C7382, C7382',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'fnameC7382',
    last_name: 'lnameC7382',
    email1: 'mail1C7382@e2e.de',
    email2: 'mail2C7382@e2e.de',
    state_home: 'stateC7382',
    street_home: 'streetC7382',
    city_home: 'cityC7382'
  }
  await Promise.all([
    I.haveContact(contact),
    I.haveSetting('io.ox/mail//messageFormat', 'text')
  ])
  I.login('app=io.ox/mail')
  mail.newMail()
  I.click('CC')
  I.waitForElement('.io-ox-mail-compose .cc .tt-input', 5)
  I.click('BCC')
  I.waitForElement('.io-ox-mail-compose .bcc .tt-input', 5)
  const receivers = ['To', 'CC', 'BCC']
  const fields = [contact.email1.substring(0, 7), contact.email2.substring(0, 7), contact.first_name.substring(0, 7), contact.last_name.substring(0, 7)]
  receivers.forEach(function (receiver) {
    fields.forEach(function (field) {
      I.fillField(receiver, field)
      I.waitForText(contact.email1, 5, '.io-ox-mail-compose .tt-suggestions')
      I.waitForText(contact.email2, 5, '.io-ox-mail-compose .tt-suggestions')
      I.waitForText(contact.first_name + ' ' + contact.last_name, 5, '.io-ox-mail-compose .tt-suggestions')
      I.clearField(receiver)
    })
  })
})

Scenario('[C8830] Manually add multiple recipients via comma', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', 'foo@bar.de, lol@ox.io, bla@trash.com,')
  I.waitForElement('.io-ox-mail-compose div.token', 5)
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 3)
})

Scenario('[C8831] Add recipient manually', async ({ I, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.click({ css: 'button[data-action="maximize"]' })
  I.fillField('To', 'super01@ox.com')
  I.pressKey('Enter')
  I.fillField('To', 'super02@ox.com')
  I.pressKey('Enter')
  I.seeNumberOfVisibleElements('.io-ox-mail-compose div[data-extension-id="to"] div.token', 2)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.waitForText('super02@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
})

Scenario('[C12118] Remove recipients', async ({ I, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.waitForFocus('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input')
  I.click('CC')
  I.waitForVisible('.io-ox-mail-compose .cc .tt-input', 5)
  I.click('BCC')
  I.waitForVisible('.io-ox-mail-compose .bcc .tt-input', 5)

  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', 'super01@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', 'super02@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', 'super03@ox.com')
  I.pressKey('Enter')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="to"] div.token', 3)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.waitForText('super02@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.click('.io-ox-mail-compose [aria-label="super02@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="to"] div.token', 2)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="to"]')
  I.dontSeeElement('.io-ox-mail-compose div[data-extension-id="to"] [title="super02@ox.com"]')

  I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', 'super01@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', 'super02@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', 'super03@ox.com')
  I.pressKey('Enter')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="cc"] div.token', 3)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="cc"]')
  I.waitForText('super02@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="cc"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="cc"]')
  I.click('.io-ox-mail-compose [aria-label="super02@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="cc"] div.token', 2)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="cc"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="cc"]')
  I.dontSeeElement('.io-ox-mail-compose div[data-extension-id="cc"] [title="super02@ox.com"]')

  I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', 'super01@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', 'super02@ox.com')
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', 'super03@ox.com')
  I.pressKey('Enter')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="bcc"] div.token', 3)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="bcc"]')
  I.waitForText('super02@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="bcc"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="bcc"]')
  I.click('.io-ox-mail-compose [aria-label="super02@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div[data-extension-id="bcc"] div.token', 2)
  I.waitForText('super01@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="bcc"]')
  I.waitForText('super03@ox.com', 5, '.io-ox-mail-compose div[data-extension-id="bcc"]')
  I.dontSeeElement('.io-ox-mail-compose div[data-extension-id="bcc"] [title="super02@ox.com"]')
})

Scenario('[C12119] Edit recipients', async ({ I, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  mail.newMail()
  I.click('CC')
  I.waitForElement('.io-ox-mail-compose .cc .tt-input')
  I.click('BCC')
  I.waitForElement('.io-ox-mail-compose .bcc .tt-input')

  I.click('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input')
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', 'foo@bar.de, lol@ox.io, bla@trash.com,')
  I.pressKey('Enter')
  I.waitForElement('.io-ox-mail-compose div.token', 5)
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 3)
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  I.waitForText('bla@trash.com', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  // nth-of-type index 5, as there are two div elements (aria-description and live region) in front
  I.doubleClick('.io-ox-mail-compose div:nth-of-type(5)')
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', 'super@ox.com,')
  I.pressKey('Enter')
  I.dontSee('bla@trash.com', '.io-ox-mail-compose [data-extension-id="to"]')
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  I.waitForText('super@ox.com', 5, '.io-ox-mail-compose [data-extension-id="to"]')
  I.click('.io-ox-mail-compose [aria-label="foo@bar.de"] .close')
  I.click('.io-ox-mail-compose [aria-label="lol@ox.io"] .close')
  I.click('.io-ox-mail-compose [aria-label="super@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 0)

  I.click('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input')
  I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', 'foo@bar.de, lol@ox.io, bla@trash.com,')
  I.pressKey('Enter')
  I.waitForElement('.io-ox-mail-compose div.token', 5)
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 3)
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  I.waitForText('bla@trash.com', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  // nth-of-type index 5, as there are two div elements (aria-description and live region) in front
  I.doubleClick('.io-ox-mail-compose div:nth-of-type(5)')
  I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', 'super@ox.com,')
  I.pressKey('Enter')
  I.dontSee('bla@trash.com', '.io-ox-mail-compose [data-extension-id="cc"]')
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  I.waitForText('super@ox.com', 5, '.io-ox-mail-compose [data-extension-id="cc"]')
  I.click('.io-ox-mail-compose [aria-label="foo@bar.de"] .close')
  I.click('.io-ox-mail-compose [aria-label="lol@ox.io"] .close')
  I.click('.io-ox-mail-compose [aria-label="super@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 0)

  I.click('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input')
  I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', 'foo@bar.de, lol@ox.io, bla@trash.com,')
  I.pressKey('Enter')
  I.waitForElement('.io-ox-mail-compose div.token', 5)
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 3)
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.waitForText('bla@trash.com', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  // nth-of-type index 5, as there are two div elements (aria-description and live region) in front
  I.doubleClick('.io-ox-mail-compose div:nth-of-type(5)')
  I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', 'super@ox.com,')
  I.pressKey('Enter')
  I.dontSee('bla@trash.com', '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.waitForText('foo@bar.de', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.waitForText('lol@ox.io', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.waitForText('super@ox.com', 5, '.io-ox-mail-compose [data-extension-id="bcc"]')
  I.click('.io-ox-mail-compose [aria-label="foo@bar.de"] .close')
  I.click('.io-ox-mail-compose [aria-label="lol@ox.io"] .close')
  I.click('.io-ox-mail-compose [aria-label="super@ox.com"] .close')
  I.seeNumberOfElements('.io-ox-mail-compose div.token', 0)
})

Scenario('[C12120] Recipient cartridge', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()

  I.say('Init tokenfield/typehead')
  I.click('CC')
  I.waitForElement('.io-ox-mail-compose .cc .tt-input', 5)
  I.click('BCC')
  I.waitForElement('.io-ox-mail-compose .bcc .tt-input', 5);

  ['to', 'cc', 'bcc'].forEach(function (field) {
    within('.io-ox-mail-compose div[data-extension-id="' + field + '"]', function () {
      I.say(`Enter #1 in ${field}`)
      I.fillField({ css: 'input.tt-input' }, users[1].get('primaryEmail'))
      I.waitForVisible('.tt-dropdown-menu .tt-suggestions')
      I.pressKey('Enter')
      I.waitForInvisible('.tt-dropdown-menu .tt-suggestions')

      I.say(`Enter #2 in ${field}`)
      I.fillField({ css: 'input.tt-input' }, 'super@ox.com')
      I.pressKey('Enter')
      I.seeNumberOfElements({ css: 'div.token' }, 2)

      I.say(`Check in ${field}`)
      I.waitForText(users[1].get('given_name') + ' ' + users[1].get('sur_name'), 5, '.token-label')
      I.waitForElement('//span[@class="token-label"][text()="super@ox.com"]')
    })
  })
})

Scenario('[C12121] Display and hide recipient fields', async ({ I, mail }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  mail.newMail()
  I.click('CC')
  I.waitForVisible('.io-ox-mail-compose .cc .tt-input', 5)
  I.click('BCC')
  I.waitForVisible('.io-ox-mail-compose .bcc .tt-input', 5)
  I.click('CC')
  I.waitForInvisible('.io-ox-mail-compose .cc .tt-input', 5)
  I.click('BCC')
  I.waitForInvisible('.io-ox-mail-compose .bcc .tt-input', 5)
})

Scenario('[C83384] Automatically bcc all messages', async ({ I, mail, users, settings }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//messageFormat', 'text'),
    users.create()
  ])
  I.login('app=io.ox/mail&settings=virtual/settings/io.ox/mail')
  settings.expandSection('Advanced settings')
  I.waitForText('Always add the following recipient to blind carbon copy (BCC)', 5, '.settings-detail-pane')
  I.fillField('Always add the following recipient to blind carbon copy (BCC)', users[1].get('primaryEmail'))
  settings.close()

  mail.newMail()
  I.see(`${users[1].get('given_name')} ${users[1].get('sur_name')}`, '.io-ox-mail-compose div[data-extension-id="bcc"] div.token')
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Forever alone')
  I.fillField({ css: 'textarea.plain-text' }, 'Sending this (not only) to myself')
  mail.send()
  I.waitForText('Forever alone', 30, '.list-view.mail-item')
  mail.selectMail('Forever alone')
  within({ frame: '.mail-detail-pane .mail-detail-frame' }, () => {
    I.waitForText('Sending this (not only) to myself')
  })
  I.dontSee(users[1].get('primaryEmail'))
  I.logout()

  I.login({ user: users[1] })
  I.selectFolder('Inbox')
  mail.selectMail('Forever alone')
  within({ frame: '.mail-detail-pane .mail-detail-frame' }, () => {
    I.waitForText('Sending this (not only) to myself')
  })
})

Scenario('[C101615] Emojis', async ({ I, users, mail }) => {
  await I.haveMail({ path: 'media/mails/C101615.eml' })
  I.login('app=io.ox/mail')
  I.selectFolder('Inbox')
  mail.selectMail('😉✌️❤️')
  I.waitForText('😉✌️❤️', 5, '.mail-detail-pane .subject')
  within({ frame: '.mail-detail-pane .mail-detail-frame' }, () => {
    I.waitForText('😉✌️❤️', 5, '.mail-detail-content p')
  })
})

Scenario('[C101620] Very long TO field', async ({ I, users, mail }) => {
  await I.haveMail({ path: 'media/mails/C101620.eml' })
  I.login('app=io.ox/mail')
  I.selectFolder('Inbox')
  mail.selectMail('Very long TO field')
  I.seeCssPropertiesOnElements('.mail-detail-pane .recipients', { overflow: 'hidden' })
  I.seeCssPropertiesOnElements('.mail-detail-pane .recipients', { 'text-overflow': 'ellipsis' })
  // TODO: Width is not 100% when get css property?
  I.doubleClick('[title="Very long TO field"]')
  I.waitForElement('.io-ox-mail-detail-window')
  within('.io-ox-mail-detail-window', () => {
    I.seeCssPropertiesOnElements('.floating-window-content .recipients', { overflow: 'hidden' })
    I.seeCssPropertiesOnElements('.floating-window-content .recipients', { 'text-overflow': 'ellipsis' })
  })
})

Scenario('[C207507] Forgot mail attachment hint', async ({ I, users, mail, dialogs }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.newMail()
  I.fillField('To', 'super01@ox.de')
  I.fillField('Subject', 'C207507')
  I.fillField('.io-ox-mail-compose .plain-text', 'see attachment')
  I.click('Send', '.floating-window-content')

  // Test if attachment is mentioned in mail
  dialogs.waitForVisible()
  I.waitForText('Forgot attachment?', 5, '.modal-dialog .modal-header')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.fillField('Subject', 'see attachment')
  I.fillField('.io-ox-mail-compose .plain-text', 'C207507')
  I.click('Send', '.floating-window-content')

  // Test if attachment is mentioned in subject
  dialogs.waitForVisible()
  I.waitForText('Forgot attachment?', 5, '.modal-dialog .modal-header')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
})

Scenario('[C274142]- Disable autoselect in mail list layout', async ({ I, users }) => {
  const mailcount = 10
  const promises = [I.haveSetting('io.ox/mail//layout', 'list')]
  let i
  for (i = 0; i < mailcount; i++) {
    promises.push(I.haveMail({
      attachments: [{ content: 'C274142\r\n', content_type: 'text/plain', raw: true, disp: 'inline' }],
      from: users[0],
      sendtype: 0,
      subject: 'C274142',
      to: users[0]
    }))
  }
  await Promise.all(promises)
  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.see(String(mailcount), '[data-contextmenu-id="default0/INBOX"][data-model="default0/INBOX"] .folder-counter')
  I.dontSeeElement('[data-ref="io.ox/mail/listview"] [aria-selected="true"]')
})
