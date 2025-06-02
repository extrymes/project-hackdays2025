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
const { config } = require('codeceptjs')

Feature('Mail > Avatars')

const { mxDomain } = config.get('helpers').OpenXchange
let alice, bob

Before(async ({ users }) => {
  const aliceId = Math.random()
  const bobId = Math.random()

  alice = await users.create({
    name: `alice${aliceId}`,
    imapLogin: `alice${aliceId}`,
    sur_name: 'Alice',
    given_name: 'Alice',
    password: 'secret',
    primaryEmail: `alice${aliceId}@${mxDomain}`,
    email1: `alice${aliceId}@${mxDomain}`
  })
  bob = await users.create({
    name: `bob${bobId}`,
    imapLogin: `bob${bobId}`,
    sur_name: 'Bob',
    given_name: 'Bob',
    password: 'secret',
    primaryEmail: `bob${bobId}@${mxDomain}`,
    email1: `bob${bobId}@${mxDomain}`
  })
})

After(async ({ users }) => { await users.removeAll() })

const sentMail = '.rightside article[data-cid="default0/Sent.1"]'
const inboxMail = '.rightside article[data-cid="default0/INBOX.1"]'

Scenario('Show correct initials and sender names in conversations', async ({ I, mail }) => {
  await I.haveMail({
    from: [['Alice Alice', alice.get('primaryEmail')]],
    to: [['Bob Bob', bob.get('primaryEmail')]],
    subject: 'Test subject'
  })

  session('Alice', () => {
    I.login('app=io.ox/mail', { user: alice })
    I.waitForApp()
    I.waitForText('Sent', 5, '.folder-tree')
    // check in sent folder
    I.selectFolder('Sent')
    I.waitForText('Sent', 5, '~Messages options')
    I.waitForText('BB', 5, '.leftside .avatar.initials')
    I.waitForText('Bob Bob', 5, '.leftside .person')
    mail.selectMail('Test subject')
    I.waitForText('BB', 5, '.leftside .avatar.initials')
    I.waitForText('Bob Bob', 5, '.leftside .person')
    I.waitForText('AA', 5, '.rightside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.rightside .person-link')
  })

  session('Bob', () => {
    I.login('app=io.ox/mail', { user: bob })
    I.waitForApp()

    // check initials inbox
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    mail.selectMail('Test subject')
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    I.waitForText('AA', 5, '.rightside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.rightside .person-link')

    // reply to mail
    I.click('~Reply to sender')
    I.waitForVisible('.io-ox-mail-compose iframe')
    mail.send()

    // switch to conversations
    I.click('~More message options')
    I.clickDropdown('Conversations')
    // check initials in inbox
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    mail.selectMail('Test subject')
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    I.waitForText('BB', 5, `${sentMail} .avatar.initials`)
    I.waitForText('Bob Bob', 5, `${sentMail} .person-link`)
    I.waitForText('AA', 5, `${inboxMail} .avatar.initials`)
    I.waitForText('Alice Alice', 5, `${inboxMail} .person-link`)

    // check initials sent folder
    I.selectFolder('Sent')
    I.waitForText('Sent', 5, '~Messages options')
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    mail.selectMail('Test subject')
    I.waitForText('AA', 5, '.leftside .avatar.initials')
    I.waitForText('Alice Alice', 5, '.leftside .person')
    I.waitForText('BB', 5, '.rightside .avatar.initials')
    I.waitForText('Bob Bob', 5, '.rightside .person-link')
  })

  session('Alice', () => {
    I.selectFolder('Inbox')

    // switch to conversations
    I.click('~More message options')
    I.clickDropdown('Conversations')
    // check initials inbox
    I.waitForText('BB', 5, '.leftside .avatar.initials')
    I.waitForText('Bob Bob', 5, '.leftside .person')
    mail.selectMail('Test subject')
    I.waitForText('BB', 5, '.leftside .avatar.initials')
    I.waitForText('Bob Bob', 5, '.leftside .person')
    I.waitForText('BB', 5, `${inboxMail} .avatar.initials`)
    I.waitForText('Bob Bob', 5, `${inboxMail} .person-link`)
    I.waitForText('AA', 5, `${sentMail} .avatar.initials`)
    I.waitForText('Alice Alice', 5, `${sentMail} .person-link`)
  })
})

Scenario('Show correct avatar in conversations', async ({ I, mail, contacts, dialogs }) => {
  await I.haveMail({
    from: [['Alice Alice', alice.get('primaryEmail')]],
    to: [['Bob Bob', bob.get('primaryEmail')]],
    subject: 'Test subject'
  })

  session('Alice', () => {
    I.login('app=io.ox/mail', { user: alice })
    I.waitForApp()

    // set profile picture
    contacts.editMyAccount()
    I.waitForElement('.contact-edit .contact-photo')
    I.click('.contact-edit .contact-photo')
    I.waitForVisible('.edit-picture')
    I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-limegreen.png')
    I.waitForInvisible('.edit-picture.empty')
    dialogs.clickButton('Apply')
    I.waitForDetached('.edit-picture')
    I.waitForInvisible('.empty', 3)
    I.click('Save')
    I.waitForDetached('.contact-edit')

    I.waitForDetached('.io-ox-mail-compose')
    I.waitForNetworkTraffic()
  })

  session('Bob', () => {
    I.login('app=io.ox/mail', { user: bob })
    I.waitForApp()

    // set profile picture
    contacts.editMyAccount()
    I.waitForElement('.contact-edit .contact-photo')
    I.click('.contact-edit .contact-photo')
    I.waitForVisible('.edit-picture')
    I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-mango.png')
    I.waitForInvisible('.edit-picture.empty')
    dialogs.clickButton('Apply')
    I.waitForDetached('.edit-picture')
    I.waitForInvisible('.empty', 3)
    I.click('Save')
    I.waitForDetached('.contact-edit')

    // reply to mail
    mail.selectMail('Test subject')
    I.click('~Reply to sender')
    I.waitForVisible('.io-ox-mail-compose iframe')
    mail.send()
    I.waitForDetached('.io-ox-mail-compose')

    // switch to conversations
    I.click('~More message options')
    I.clickDropdown('Conversations')
    I.waitForNetworkTraffic()
  })

  session('Alice', async () => {
    // switch to conversations
    I.click('~More message options')
    I.clickDropdown('Conversations')
    I.waitForNetworkTraffic()
    I.waitForElement('.leftside .avatar.initials[style*="background-image"]')

    // check avatars in inbox
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
    mail.selectMail('Test subject')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
    expect(await I.grabCssPropertyFrom(`${inboxMail} .avatar.initials`, 'background-image')).to.include(`email=${bob.get('name')}`)
    expect(await I.grabCssPropertyFrom(`${sentMail} .avatar.initials`, 'background-image')).to.include(`email=${alice.get('name')}`)

    // check avatars in sent folder
    I.selectFolder('Sent')
    I.waitForNetworkTraffic()
    I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
    mail.selectMail('Test subject')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
    expect(await I.grabCssPropertyFrom(`${sentMail} .avatar.initials`, 'background-image')).to.include(`email=${alice.get('name')}`)
  })

  session('Bob', async () => {
    // check avatars in inbox
    I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
    mail.selectMail('Test subject')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
    expect(await I.grabCssPropertyFrom(`${sentMail} .avatar.initials`, 'background-image')).to.include(`email=${bob.get('name')}`)
    expect(await I.grabCssPropertyFrom(`${inboxMail} .avatar.initials`, 'background-image')).to.include(`email=${alice.get('name')}`)

    // check avatars in sent folder
    I.selectFolder('Sent')
    I.waitForNetworkTraffic()
    I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
    mail.selectMail('Test subject')
    expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
    expect(await I.grabCssPropertyFrom('.rightside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
  })
})

Scenario('Show correct initials for draft', async ({ I, mail, dialogs }) => {
  I.login()
  I.waitForApp()

  mail.newMail()
  I.fillField('To', bob.get('primaryEmail'))
  I.fillField('Subject', 'This is a draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  I.selectFolder('Drafts')

  I.waitForText('BB', 5, '.leftside .avatar.initials')
  I.waitForText('Bob Bob', 5, '.leftside .person')
  mail.selectMail('This is a draft')
  I.waitForText('BB', 5, '.leftside .avatar.initials')
  I.waitForText('Bob Bob', 5, '.leftside .person')
  I.waitForText('AA', 5, '.rightside .avatar.initials')
  I.waitForText('Alice Alice', 5, '.rightside .person-link')

  mail.newMail()
  I.fillField('Subject', 'This is another draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  I.waitForText('AA', 5, '.leftside .avatar.initials')
  I.waitForText('No recipients', 5, '.leftside .from')
  mail.selectMail('This is another draft')
  I.waitForText('AA', 5, '.leftside .avatar.initials')
  I.waitForText('No recipients', 5, '.leftside .from')
  I.waitForText('AA', 5, '.rightside .avatar.initials')
  I.waitForText('Alice Alice', 5, '.rightside .person-link')
})

Scenario('Show correct avatar for draft', async ({ I, mail, contacts, dialogs }) => {
  I.login('app=io.ox/mail', { user: alice })
  I.waitForApp()

  // set profile picture
  contacts.editMyAccount()
  I.waitForElement('.contact-edit .contact-photo')
  I.click('.contact-edit .contact-photo')
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-limegreen.png')
  I.waitForInvisible('.edit-picture.empty')
  dialogs.clickButton('Apply')
  I.waitForDetached('.edit-picture')
  I.waitForInvisible('.empty', 3)
  I.click('Save')
  I.waitForDetached('.contact-edit')

  I.logout()

  I.login('app=io.ox/mail', { user: bob })
  I.waitForApp()

  // set profile picture
  contacts.editMyAccount()
  I.waitForElement('.contact-edit .contact-photo')
  I.click('.contact-edit .contact-photo')
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-mango.png')
  I.waitForInvisible('.edit-picture.empty')
  dialogs.clickButton('Apply')
  I.waitForDetached('.edit-picture')
  I.waitForInvisible('.empty', 3)
  I.click('Save')
  I.waitForDetached('.contact-edit')

  mail.newMail()
  I.fillField('To', alice.get('primaryEmail'))
  I.fillField('Subject', 'This is a draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  I.selectFolder('Drafts')

  mail.selectMail('This is a draft')
  I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
  expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
  expect(await I.grabCssPropertyFrom('.rightside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)

  mail.newMail()
  I.fillField('Subject', 'This is another draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  mail.selectMail('This is another draft')
  I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
  expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
  expect(await I.grabCssPropertyFrom('.rightside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
})

Scenario('Show correct initials for search result', async ({ I, mail }) => {
  await I.haveMail({
    from: [['Alice Alice', alice.get('primaryEmail')]],
    to: [['Bob Bob', bob.get('primaryEmail')]],
    subject: 'Test subject'
  })

  I.login('app=io.ox/mail', { user: alice })
  I.waitForApp()

  I.fillField('.search-field', `from:${alice.get('name')}`)
  I.waitForElement('.autocomplete.address-picker .list-item.selectable')
  I.click('~Search')

  I.waitForText('BB', 5, '.leftside .avatar.initials')
  I.waitForText('Bob Bob', 5, '.leftside .person')
  mail.selectMail('Test subject')
  I.waitForText('BB', 5, '.leftside .avatar.initials')
  I.waitForText('Bob Bob', 5, '.leftside .person')
  I.waitForText('AA', 5, '.rightside .avatar.initials')
  I.waitForText('Alice Alice', 5, '.rightside .person-link')
})

Scenario('Show correct avatar for search result', async ({ I, mail, contacts, dialogs }) => {
  await I.haveMail({
    from: [['Alice Alice', alice.get('primaryEmail')]],
    to: [['Bob Bob', bob.get('primaryEmail')]],
    subject: 'Test subject'
  })

  I.login('app=io.ox/mail', { user: bob })
  I.waitForApp()

  // set profile picture
  contacts.editMyAccount()
  I.waitForElement('.contact-edit .contact-photo')
  I.click('.contact-edit .contact-photo')
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-mango.png')
  I.waitForInvisible('.edit-picture.empty')
  dialogs.clickButton('Apply')
  I.waitForDetached('.edit-picture')
  I.waitForInvisible('.empty', 3)
  I.click('Save')
  I.waitForDetached('.contact-edit')

  I.logout()

  I.login('app=io.ox/mail', { user: alice })
  I.waitForApp()

  // set profile picture
  contacts.editMyAccount()
  I.waitForElement('.contact-edit .contact-photo')
  I.click('.contact-edit .contact-photo')
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600-limegreen.png')
  I.waitForInvisible('.edit-picture.empty')
  dialogs.clickButton('Apply')
  I.waitForDetached('.edit-picture')
  I.waitForInvisible('.empty', 3)
  I.click('Save')
  I.waitForDetached('.contact-edit')
  I.fillField('.search-field', `from:${alice.get('display_name')}`)
  I.waitForElement('.autocomplete.address-picker .list-item.selectable')
  I.click('~Search')

  I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
  expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
  mail.selectMail('Test subject')
  I.waitForElement('.leftside .avatar.initials[style*="background-image"]')
  expect(await I.grabCssPropertyFrom('.leftside .avatar.initials', 'background-image')).to.include(`email=${bob.get('name')}`)
  expect(await I.grabCssPropertyFrom('.rightside .avatar.initials', 'background-image')).to.include(`email=${alice.get('name')}`)
})

Scenario('Show correct initials for search result from draft without recipeint', async ({ I, mail, dialogs }) => {
  I.login('app=io.ox/mail', { user: alice })
  I.waitForApp()

  mail.newMail()
  I.fillField('Subject', 'This is a draft')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  // drafts folder
  I.selectFolder('Drafts')
  I.waitForText('AA', 5, '.leftside .avatar.initials')
  I.waitForText('No recipients', 5, '.leftside .from')
  mail.selectMail('This is a draft')
  I.waitForElement('.mail-detail-frame')
  I.waitForText('AA', 5, '.rightside .avatar.initials')
  I.waitForText('Alice Alice', 5, '.rightside .person-link')

  // search result
  I.selectFolder('Inbox')
  I.waitForText('No message selected')
  I.fillField('.search-field', 'This is a draft')
  I.click('~Search')
  I.waitForText('AA', 5, '.leftside .avatar.initials')
  I.waitForText('No recipients', 5, '.leftside .from')
  mail.selectMail('This is a draft')
  I.waitForElement('.mail-detail-frame')
  I.waitForText('AA', 5, '.rightside .avatar.initials')
  I.waitForText('Alice Alice', 5, '.rightside .person-link')
})
