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

Feature('Mail Compose > Add attachments from existing mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create new mail and collect attachments from selected mails', async ({ I, mail }) => {
  await Promise.all([
    I.haveMail({ path: 'media/mails/c101624_1.eml' }),
    I.haveMail({ path: 'media/mails/c101624_2.eml' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.newMail()
  // Need to drag compose window to the side to be able to select mails
  I.dragAndDrop('.io-ox-mail-compose-window .floating-header', '~Mail toolbar. Use cursor keys to navigate')

  // no mail selected
  I.click('~Attachments')
  I.dontSeeElement('Most recent attachments')
  I.dontSeeElement('Files from selected email')
  I.pressKey('Escape')

  // select mail with attachments
  mail.selectMail('C101624-1')
  I.click('~Attachments')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.title[title="Programa resumen.doc"]')
  I.seeElement('.title[title="programa completo.docx"]')

  // add attachment
  I.click('.attachment [title="Programa resumen.doc"]')
  I.waitForElement('.preview-container [title="Programa resumen.doc"]')

  // check dropdown
  I.click('~Attachments')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.dontSeeElement('.title[title="Programa resumen.doc"]')
  I.pressKey('Escape')

  // select mail without attachments, check dropdown
  mail.selectMail('C101624-2')
  I.click('~Attachments')
  I.dontSeeElement('Most recent attachments')
  I.dontSeeElement('Files from selected email')
  I.pressKey('Escape')

  // re-select mail with attachments, remove attachment, check dropdown again
  mail.selectMail('C101624-1')
  I.click('~Attachments')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.dontSeeElement('.title[title="Programa resumen.doc"]')
  I.pressKey('Escape')
  I.click('.mail-attachment-list footer [title="Toggle preview"]')
  I.waitForElement('.mail-attachment-list [title*="Remove attachment"]')
  I.click('.mail-attachment-list [title*="Remove attachment"]')
  I.click('~Attachments')
  I.waitForElement('.title[title="Programa resumen.doc"]', 5)

  // add all attachments and check dropdown
  I.click('Add all attachments')
  I.waitForElement('.preview-container [title="Programa resumen.doc"]')
  I.waitForElement('.preview-container [title="programa completo.docx"]')
  I.click('~Attachments')
  I.waitForText('Attachments', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.dontSeeElement('.title[title="Programa resumen.doc"]')
  I.dontSeeElement('.title[title="programa completo.docx"]')
})

Scenario('Create new mail with attachments via context menu', async ({ I, mail }) => {
  await Promise.all([
    I.haveMail({ path: 'media/mails/c101624_1.eml' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // create mail with attachments
  I.waitForNetworkTraffic()
  I.rightClick('.list-item')
  I.waitForElement('.dropdown.open')
  I.waitForText('New email with attachment', 5, '.smart-dropdown-container')
  I.click('New email with attachment', '.smart-dropdown-container')

  // wait for mail
  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)

  // check attachments
  I.waitForElement('.preview-container [title="Programa resumen.doc"]')
  I.waitForElement('.preview-container [title="programa completo.docx"]')
})

Scenario('Check attachments dropdown for recent mails', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//listViewLayout', 'checkboxes'),
    I.haveMail({ path: 'media/mails/c101624_1.eml' }),
    I.haveMail({ path: 'media/mails/OXUIB-1355_6.eml' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.newMail()
  I.dragAndDrop('.io-ox-mail-compose-window .floating-header', '~Mail toolbar. Use cursor keys to navigate')

  // select multiple mails with attachments, then deselect
  mail.selectMail('C101624-1')
  mail.selectMail('testcase6')
  I.click('.list-item[aria-label*="testcase6"] .list-item-checkmark')

  // check for recent attachments in dropdown
  I.click('~Attachments')
  I.waitForText('Most recent attachments', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.title[title="Programa resumen.doc"]')
  I.seeElement('.title[title="programa completo.docx"]')
  I.seeElement('.title[title="ox_logo.png"]')
})

Scenario('Check attachments dropdown with multiple compose windows', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//listViewLayout', 'checkboxes'),
    I.haveMail({ path: 'media/mails/c101624_1.eml' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.newMail()
  // Need to drag compose window to the side to be able to select mails
  I.dragAndDrop('.io-ox-mail-compose-window[data-window-nr="1"] .floating-header', '~Mail toolbar. Use cursor keys to navigate')
  mail.newMail()
  I.dragAndDrop('.io-ox-mail-compose-window[data-window-nr="2"] .floating-header', '~Folder-specific actions')

  // select mail with attachments
  mail.selectMail('C101624-1')

  // check first compose window
  I.click('~Attachments', '.io-ox-mail-compose-window[data-window-nr="1"]')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.attachments-dropdown.open .title[title="Programa resumen.doc"]')
  I.seeElement('.attachments-dropdown.open .title[title="programa completo.docx"]')
  // add attachment
  I.click('.dropdown.open .attachment [title="Programa resumen.doc"]')
  I.waitForElement('.preview-container [title="Programa resumen.doc"]')
  // check dropdown
  I.click('~Attachments', '.io-ox-mail-compose-window[data-window-nr="1"]')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.dontSeeElement('.attachments-dropdown.open .title[title="Programa resumen.doc"]')
  I.seeElement('.attachments-dropdown.open .title[title="programa completo.docx"]')
  I.pressKey('Escape')

  // check second compose window
  I.click('~Attachments', '.io-ox-mail-compose-window[data-window-nr="2"]')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.attachments-dropdown.open .title[title="Programa resumen.doc"]')
  I.seeElement('.attachments-dropdown.open .title[title="programa completo.docx"]')
  I.pressKey('Escape')

  // deselect mail
  I.click('.list-item[aria-label*="C101624-1"] .list-item-checkmark')

  // check first compose window
  I.click('~Attachments', '.io-ox-mail-compose-window[data-window-nr="1"]')
  I.waitForText('Most recent attachments', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.dontSeeElement('.attachments-dropdown.open .title[title="Programa resumen.doc"]')
  I.seeElement('.attachments-dropdown.open .title[title="programa completo.docx"]')
  I.pressKey('Escape')

  // check second compose window
  I.click('~Attachments', '.io-ox-mail-compose-window[data-window-nr="2"]')
  I.waitForText('Most recent attachments', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.attachments-dropdown.open .title[title="Programa resumen.doc"]')
  I.seeElement('.attachments-dropdown.open .title[title="programa completo.docx"]')
  I.pressKey('Escape')
})

Scenario('Check attachments dropdown for threads', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//viewOptions', { 'default0/INBOX': { thread: true } }),
    I.haveMail({ path: 'media/mails/thread-part-1.eml' }), // doc
    I.haveMail({ path: 'media/mails/thread-part-2.eml' }) // pdf
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // check via selected mail
  mail.selectMail('My thread')
  mail.newMail()
  I.click('~Attachments')
  I.waitForText('Files from selected email', 5, '.smart-dropdown-container.attachments-dropdown.open')
  I.seeElement('.title[title="document.pdf"]')
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')

  // create from thread via context menu
  I.rightClick('.list-item')
  I.waitForElement('.dropdown.open')
  I.waitForText('New email with attachment', 5, '.smart-dropdown-container')
  I.click('New email with attachment', '.smart-dropdown-container')
  // wait for mail
  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)
  // check attachment
  I.waitForElement('.preview-container [title="document.pdf"]')
})
