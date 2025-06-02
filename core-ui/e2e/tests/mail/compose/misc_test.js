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

const expect = require('chai').expect

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-587] Supports predefined values (plaintext)', async ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  const DATA = {
    subject: 'OXUIB-587',
    content: 'Supports predefined values',
    contentType: 'text/plain'
  }
  await I.executeScript(async function (DATA) {
    const { default: compose } = await import(String(new URL('io.ox/mail/compose/main.js', location.href)))
    const app = compose.getApp()
    return app.launch().then(function () {
      return app.open(DATA)
    })
  }, DATA)

  // check prefilled fields
  I.seeInField('Subject', DATA.subject)
  I.seeInField({ css: 'textarea.plain-text' }, DATA.content)
})

Scenario('[OXUIB-587] Supports predefined values (html)', async ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  const DATA = {
    subject: 'OXUIB-587',
    content: '<b>Supports predefined values</b>',
    contentType: 'text/html'
  }

  await I.executeScript(async function (DATA) {
    const { default: compose } = await import(String(new URL('io.ox/mail/compose/main.js', location.href)))
    const app = compose.getApp()
    return app.launch().then(function () {
      return app.open(DATA)
    })
  }, DATA)

  // check prefilled fields
  I.seeInField('Subject', DATA.subject)
  I.waitForElement('.editor iframe')
  within({ frame: '.editor iframe' }, () => {
    I.see('Supports predefined values')
    I.dontSee(DATA.content)
  })
})

Scenario('[C12122] Auto-size recipient fields', async ({ I, mail }) => {
  I.login('app=io.ox/mail')
  mail.newMail()

  expect(parseInt(await I.grabCssPropertyFrom('[data-extension-id="to"]', 'height'), 10)).to.be.most(40)

  I.click('[placeholder="To"]')
  I.fillField('To', 'testmail1@testmail.com')
  I.pressKey('Enter')
  I.wait(0.2)
  I.fillField('To', 'testmail2@testmail.com')
  I.pressKey('Enter')
  I.wait(0.2)
  I.fillField('To', 'testmail3@testmail.com')
  I.pressKey('Enter')
  I.wait(0.2)
  I.fillField('To', 'testmail4@testmail.com')
  I.pressKey('Enter')
  I.wait(0.2)

  expect(parseInt(await I.grabCssPropertyFrom('[data-extension-id="to"]', 'height'), 10)).to.be.greaterThan(40)

  I.click('~Remove', '~testmail1@testmail.com')
  I.click('~Remove', '~testmail2@testmail.com')
  I.click('~Remove', '~testmail3@testmail.com')
  I.click('~Remove', '~testmail4@testmail.com')

  I.click('.tox-edit-area')

  expect(parseInt(await I.grabCssPropertyFrom('[data-extension-id="to"]', 'height'), 10)).to.be.most(40)
})

Scenario('[Bug 62794] no drag and drop of pictures while composing a new mail', async ({ I, mail }) => {
  I.login()
  mail.newMail()
  I.waitForElement('.editor iframe')

  await I.dropFiles('media/files/generic/contact_picture.png', '.io-ox-mail-compose .editor .inplace-dropzone')

  within({ frame: '.editor iframe' }, () => {
    I.waitForElement('body img')
  })
})

Scenario('[C271752] Reduce image size for image attachments in mail compose', async ({ I, mail, users }) => {
  const [sender, recipient] = users

  // enable Image resize setting
  await I.haveSetting('io.ox/mail//features/imageResize', true)

  // Login as 'sender'
  I.login('app=io.ox/mail', { user: sender })

  // compose mail
  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', 'Reduced Image size Test')

  // attach Image
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/1030x1030.png')
  I.waitForDetached('.io-ox-fileselection')

  // switch Image size
  I.waitForText('Original')
  I.click('Image size: Original')
  I.waitForElement('.dropdown.open.resize-options')
  I.click('Small (320 px)')
  I.dontSee('Original')

  // send Mail to 'recipient' and logout
  mail.send()
  I.waitForNetworkTraffic()
  I.logout()

  // Continue as 'recipient'
  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  I.waitForText('Reduced Image size Test')

  // Open mail
  mail.selectMail('Reduced Image size Test')

  // Verify Attachment
  I.waitForText('1 attachment')
  I.click('1 attachment')
  I.see('1030x1030.')

  // Let's view the content
  I.click({ css: 'button[data-filename="1030x1030.png"]' })
  I.waitForElement('.dropdown.open')
  I.click('View', '.dropdown.open .dropdown-menu')
  I.waitForElement(locate('.viewer-displayer-item[src]').as('Viewer image preview'))
})
