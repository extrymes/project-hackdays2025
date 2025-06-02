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

Feature('Mail > Reply/Forward')

Before(async ({ users }) => {
  await users.create() // Recipient
  await users.create() // Sender
  await users.create() // CC
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7401] Mark multiple mails as read or unread', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//listViewLayout', 'checkboxes'),
    I.haveMails([
      { subject: 'Hail Eris 0', from: users[0], to: users[0], sendtype: 0 },
      { subject: 'Hail Eris 1', from: users[0], to: users[0], sendtype: 0 },
      { subject: 'Hail Eris 2', from: users[0], to: users[0], sendtype: 0 },
      { subject: 'Hail Eris 3', from: users[0], to: users[0], sendtype: 0 },
      { subject: 'Hail Eris 4', from: users[0], to: users[0], sendtype: 0 },
      { subject: 'All Hail Discordia', from: users[0], to: users[0], sendtype: 0 }
    ])
  ])

  // Test
  // Sign in as user_a and switch to inbox
  I.login('app=io.ox/mail')

  // Select several (not threaded) mails in the inbox.
  I.waitForElement(locate('.list-item').withText('Hail Eris 0').as('Mail 0'))
  I.click('.list-item-checkmark', locate('.list-item').withText('Hail Eris 0').as('Mail 0'))

  I.waitForElement(locate('.list-item').withText('Hail Eris 1').as('Mail 1'))
  I.click('.list-item-checkmark', locate('.list-item').withText('Hail Eris 1').as('Mail 1'))

  I.waitForElement(locate('.list-item').withText('Hail Eris 2').as('Mail 2'))
  I.click('.list-item-checkmark', locate('.list-item').withText('Hail Eris 2').as('Mail 2'))

  I.waitForElement(locate('.list-item').withText('Hail Eris 3').as('Mail 3'))
  I.click('.list-item-checkmark', locate('.list-item').withText('Hail Eris 3').as('Mail 3'))

  I.waitForElement(locate('.list-item').withText('Hail Eris 4').as('Mail 4'))
  I.click('.list-item-checkmark', locate('.list-item').withText('Hail Eris 4').as('Mail 4'))

  I.clickToolbar('~More actions')
  I.clickDropdown('Mark as read')

  I.dontSeeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 0')).as('Unread Mail 0'))
  I.dontSeeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 1')).as('Unread Mail 1'))
  I.dontSeeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 2')).as('Unread Mail 2'))
  I.dontSeeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 3')).as('Unread Mail 3'))
  I.dontSeeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 4')).as('Unread Mail 4'))

  I.clickToolbar('~More actions')
  I.clickDropdown('Mark as unread')

  I.seeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 0')).as('Unread Mail 0'))
  I.seeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 1')).as('Unread Mail 1'))
  I.seeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 2')).as('Unread Mail 2'))
  I.seeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 3')).as('Unread Mail 3'))
  I.seeElement(locate('.seen-unseen-indicator').inside(locate('.list-item').withText('Hail Eris 4')).as('Unread Mail 4'))
})

Scenario('[C7402] Mark one single mail as read or unread', async ({ I, users }) => {
  // Preparation

  // We need one mail in the Inbox
  await I.haveMail({ subject: 'Hail Eris', from: users[0], to: users[0], sendtype: 0 })

  I.login('app=io.ox/mail')
  // Select single (not threaded) mail.
  I.waitForElement(locate('li.list-item').withText('Hail Eris'))
  I.click(locate('li.list-item').withText('Hail Eris'))
  // -> Mail is displayed as read.
  I.waitForDetached('.mail-detail-pane article.mail-item.unread') // Detail View
  I.waitForDetached(locate('.seen-unseen-indicator').inside(
    locate('.list-item').withText('Hail Eris')
  )) // List
  // Click on "Mark Unread"
  I.retry(5).click('.mail-detail-pane a.unread-toggle', '.mail-detail-pane article.mail-item')
  // -> Mail is displayed as unread.
  I.waitForElement('.mail-detail-pane article.mail-item.unread') // Detail View
  I.waitForElement(locate('.seen-unseen-indicator')
    .inside(locate('.list-item').withText('Hail Eris'))) // List
  // Click on "Mark read"
  I.click('.mail-detail-pane a.unread-toggle', '.mail-detail-pane article.mail-item')
  // -> Mail is displayed as read.
  I.waitForDetached('.mail-detail-pane article.mail-item.unread') // Detail View
  I.waitForDetached(locate('.seen-unseen-indicator').inside(
    locate('.list-item').withText('Hail Eris'))) // List
})

Scenario('[C8818] Reply all', async ({ I, users }) => {
  const [recipient, sender, cc] = users

  // Preparation
  // Generate the email we want to reply to
  await I.haveMail({
    from: sender,
    sendtype: 0,
    subject: 'Hail Eris',
    to: recipient,
    cc: [[cc.get('display_name'), cc.get('primaryEmail')]]
  }, { user: sender })

  // Test
  // Sign in and switch to mail app
  I.login('app=io.ox/mail', { user: recipient })
  // Select single the email.
  I.waitForElement(locate('li.list-item').withText('Hail Eris'))
  I.click(locate('li.list-item').withText('Hail Eris'))
  // Hit reply
  I.waitForElement('~Reply to all recipients')
  I.click('~Reply to all recipients')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear

  // Verify To: is the original sender
  I.seeElement(locate('div.token').withText(sender.get('display_name')).inside('[data-extension-id=to]'))
  // Verify CC: is the same cc as before
  I.seeElement(locate('div.token').withText(cc.get('display_name')).inside('[data-extension-id=cc]'))
  // Verify the subject is "Re: Hail Eris"
  I.seeInField('Subject', 'Re: Hail Eris')

  I.waitForElement('.window-footer [data-action="send"]:not([disabled])')
  I.wait(0.8)
  I.click('Send')
  I.waitForInvisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.wait(1)
  // Verify the mail arrived at the other accounts
  I.logout()
  I.login('app=io.ox/mail', { user: sender })
  I.waitForText('Re: Hail Eris', 5)

  I.logout()
  I.login('app=io.ox/mail', { user: cc })
  I.waitForText('Re: Hail Eris', 5)
})

Scenario('Blocked images are blocked in compose too', async ({ I, users, mail }) => {
  // copied from blocked_images_test
  await Promise.all([
    I.haveSetting('io.ox/mail//allowHtmlImages', false),
    I.haveMail({
      attachments: [{
        content: '<p style="background-color:#ccc"><img src="/appsuite/apps/themes/default/logo.png" height="200" width="200" alt="C83388"></p>',
        content_type: 'text/html',
        disp: 'inline'
      }],
      from: users[0],
      sendtype: 0,
      subject: 'Mail Detail Misc',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  // click on first email
  mail.selectMail('Mail Detail Misc')

  I.waitForElement('.mail-detail-frame')
  I.waitForElement('~More actions')

  // check from detail view
  I.click('~More actions', '.detail-view-header .mail-header-actions .inline-toolbar .more-dropdown')
  I.clickDropdown('Reply')
  I.waitForText('Mail contains external images')
  I.click('Compose mail without external images')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_0_ifr' }, () => {
    I.seeElement('img:not([src])')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')

  I.click('~More actions', '.detail-view-header .mail-header-actions .inline-toolbar .more-dropdown')
  I.clickDropdown('Forward')
  I.waitForText('Mail contains external images')
  I.click('Compose mail without external images')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_1_ifr' }, () => {
    I.seeElement('img:not([src])')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')

  // check from toolbar
  I.click('~Reply to sender', '.classic-toolbar-container')
  I.waitForText('Mail contains external images')
  I.click('Compose mail without external images')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_2_ifr' }, () => {
    I.seeElement('img:not([src])')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')

  I.click('~Forward', '.classic-toolbar-container')
  I.waitForText('Mail contains external images')
  I.click('Compose mail without external images')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_3_ifr' }, () => {
    I.seeElement('img:not([src])')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')

  // load images
  I.click('.external-images > button')
  // wait a bit for images to load
  I.wait(1)

  // check from detail view
  I.click('~More actions', '.detail-view-header .mail-header-actions .inline-toolbar .more-dropdown')
  I.clickDropdown('Reply')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_4_ifr' }, () => {
    I.seeElement('img[src$="/appsuite/apps/themes/default/logo.png"]')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')
  I.click('~More actions', '.detail-view-header .mail-header-actions .inline-toolbar .more-dropdown')
  I.clickDropdown('Forward')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_5_ifr' }, () => {
    I.seeElement('img[src$="/appsuite/apps/themes/default/logo.png"]')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')
  // check from toolbar
  I.click('~Reply to sender', '.classic-toolbar-container')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_6_ifr' }, () => {
    I.seeElement('img[src$="/appsuite/apps/themes/default/logo.png"]')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')
  I.click('~Forward', '.classic-toolbar-container')
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear
  within({ frame: '#mce_7_ifr' }, () => {
    I.seeElement('img[src$="/appsuite/apps/themes/default/logo.png"]')
  })
  // close again
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-mail-compose-window')
})

Scenario('Reply to a message sent by myself', async ({ I, mail, users }) => {
  await I.haveMail({
    subject: 'My thanks to you',
    attachments: [{ content: 'this really is not a scam mail!', content_type: 'text/plain', disp: 'inline' }],
    from: users[0],
    to: users[1],
    sendtype: 0
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.selectFolder('Sent')
  I.waitForText('My thanks to you')
  mail.selectMail('My thanks to you')

  I.clickToolbar('~Reply to sender')
  I.waitForElement('.token-label')
  I.see(users[1].get('display_name'), '.token-label')
})

Scenario('OXUIB-1531 - Reply to a message sent by myself from a search', async ({ I, mail, users }) => {
  await I.haveMail({
    subject: 'My thanks to you',
    attachments: [{ content: 'this really is not a scam mail!', content_type: 'text/plain', disp: 'inline' }],
    to: users[1],
    from: users[0],
    sendtype: 0
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.fillField('Search mail', 'scam')
  I.pressKey('Enter')
  I.waitForText('My thanks to you')
  mail.selectMail('My thanks to you')

  I.clickToolbar('~Reply to sender')
  I.waitForElement('.token-label')
  I.see(users[1].get('display_name'), '.token-label')
})
