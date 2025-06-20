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

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

const iframeLocator = '.io-ox-mail-compose-window .editor iframe'

Scenario('[C114967] Draft is created automatically on logout', async ({ I, mail }) => {
  const mailSubject = 'C114967'
  const defaultText = 'Draft is created automatically on logout'

  I.login('app=io.ox/mail')

  mail.newMail()

  // Fill out to and subject
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.fillField({ css: 'body' }, defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Let's stick around a bit for sending to finish
  I.wait(1)
  I.logout()

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.say(mailSubject)

  I.waitForElement('.folder-node[title*="Drafts"]')
  I.waitForElement(locate('.folder-node[title*="Drafts"] .folder-counter').withText('1'))
  I.click(locate('.folder-node[title*="Drafts"] .folder-counter').withText('1'))
  I.waitForText('C114967', 5, '~Messages')
  I.click('C114967', '~Messages')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForText(defaultText, 5, '.mail-detail-content')
  })
})

Scenario('Did you know dialog is correctly shown on save and close', async ({ I, mail, dialogs }) => {
  I.login('app=io.ox/mail')

  // save draft and close, click ok
  mail.newMail()

  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  dialogs.waitForVisible()
  I.waitForText('Did you know?', 5)

  dialogs.clickButton('OK')

  I.waitForInvisible('.io-ox-mail-compose', 5)

  // save draft and close check checkbox
  mail.newMail()

  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  dialogs.waitForVisible()
  I.waitForText('Did you know?', 5)

  I.checkOption('Do not show again.')

  dialogs.clickButton('OK')

  I.waitForInvisible('.io-ox-mail-compose', 5)

  // save draft, no "did you know" dialog should pop up
  mail.newMail()

  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  I.waitForInvisible('.io-ox-mail-compose', 5)

  // logout or we get problems with the settings not working correctly
  I.logout()

  // should reappear if setting is set
  await I.haveSetting({ 'io.ox/mail': { 'didYouKnow/saveOnCloseDontShowAgain': false } }) // cSpell:disable-line

  I.login('app=io.ox/mail')

  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  dialogs.waitForVisible()
  I.waitForText('Did you know?', 5)

  dialogs.clickButton('OK')

  I.waitForInvisible('.io-ox-mail-compose', 5)
  I.logout()

  // should not appear if disabled by server setting
  await I.haveSetting({ 'io.ox/mail': { 'didYouKnow/saveOnCloseDontShowAgain': false, 'didYouKnow/saveOnCloseShow': false } }) // cSpell:disable-line

  I.login('app=io.ox/mail')

  mail.newMail()

  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  I.waitForInvisible('.io-ox-mail-compose', 5)
})

Scenario('[C114959] Draft can be used as templates', async ({ I, mail, dialogs }) => {
  I.login('app=io.ox/mail')

  // save draft and close, click ok
  mail.newMail()

  // create draft
  I.click('~Mail compose actions')
  I.waitForText('Save draft and close', 5)
  I.click('Save draft and close')
  I.waitForText('Did you know?', 5)
  I.click('OK')
  I.waitForInvisible('.io-ox-mail-compose', 5)

  // open draft for editing
  I.selectFolder('Drafts')
  I.waitForElement('.list-item.selectable')
  I.click('.list-item.selectable')
  I.clickToolbar('~Edit copy')
  I.waitForVisible('.window-container.io-ox-mail-compose-window')

  // checking some stuff in draft editing window
  I.waitForVisible('.mail-compose-fields [data-extension-id="subject"]', 10)
  I.wait(0.5) // wait for value to be set
  I.seeInField('Subject', '[Copy]')
  I.click('~Close', '.io-ox-mail-compose-window')

  // waiting for Modal dialog "Save draft" and click on "Save draft"
  I.waitForText('Save draft', 5, dialogs.header)
  I.click('Save draft')
  I.waitForInvisible('Save message', 5)
  I.waitForInvisible('.window-container.io-ox-mail-compose-window')

  // Check new draft in list view
  I.selectFolder('Drafts')
  I.waitForElement('.list-item.selectable')
  I.waitForElement(locate('.list-item').withText('[Copy]').inside('.list-view').as('Draft in List View'))
})
