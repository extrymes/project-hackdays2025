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

const { expect } = require('chai')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8821] Send mail with Hyperlink', async ({ I, mail }) => {
  const hyperLink = 'https://foo.bar'
  const linkText = 'appsuite link'
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', 'foo@bar.com')
  I.fillField('Subject', 'test subject')
  I.click('~Insert/edit link')
  I.waitForVisible('.tox-dialog')
  I.fillField('URL', hyperLink)
  I.fillField('Text to display', linkText)
  I.click('Save')
  I.waitForVisible('#mce_0_ifr')
  within({ frame: '#mce_0_ifr' }, () => {
    I.waitForText(linkText)
    I.click(linkText)
  })
  I.click('~Insert/edit link')
  I.waitForVisible('.tox-dialog')
  I.seeInField('URL', hyperLink)
  I.seeInField('Text to display', linkText)
  I.click('Save')
  mail.send()
  I.selectFolder('Sent')
  mail.selectMail('test subject')
  I.waitForVisible('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText(linkText)
    I.click(linkText)
  })
  // sometimes it takes a little while to open the link
  let times = 0
  for (let i = 1; i <= 10 && (await I.grabNumberOfOpenTabs()) < 2; i++) {
    I.wait(0.1)
    times = i
  }
  expect(times, 'number of open tabs is 2 within 1s').to.be.below(10)
})

Scenario('[C8822] Send Mail with Hyperlink from existing text', ({ I, mail }) => {
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', 'foo@bar.com')
  I.fillField('Subject', 'test subject')
  within({ frame: '#mce_0_ifr' }, () => {
    I.fillField('.mce-content-body', 'testlink')
    I.doubleClick({ css: 'div.default-style' })
  })
  I.click('~Insert/edit link')
  I.waitForVisible('.tox-dialog')
  I.fillField('URL', 'http://foo.bar')
  I.click('Save')
  within({ frame: '#mce_0_ifr' }, () => {
    I.seeElement('a')
  })
  mail.send()
  I.selectFolder('Sent')
  I.waitForText('test subject', 30, '.list-view li[data-index="0"]')
  I.click('.list-view li[data-index="0"]')
  I.waitForVisible('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('testlink')
  })
})

Scenario('[C8823] Send Mail with Hyperlink by typing the link', ({ I, mail }) => {
  // test String has to contain whitespace at the end for URL converting to work
  const testText = 'Some test text https://foo.bar  '
  I.login('app=io.ox/mail')
  mail.newMail()
  I.fillField('To', 'foo@bar.com')
  I.fillField('Subject', 'test subject')
  I.wait(0.5)
  within({ frame: '#mce_0_ifr' }, () => {
    I.fillField('.mce-content-body', testText)
    I.seeElement('a')
  })
  mail.send()
  I.selectFolder('Sent')
  I.waitForText('test subject', 30, '.list-view li[data-index="0"]')
  I.click('.list-view li[data-index="0"]')
  I.waitForVisible('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText(testText.trim())
    I.seeElement({ css: 'a[href="https://foo.bar"]' })
  })
})

Scenario('[C8824] Remove hyperlinks', async ({ I, mail }) => {
  const iframeLocator = '.io-ox-mail-compose-window .editor iframe'
  const defaultText = 'Dies ist ein testlink http://example.com.'

  I.login('app=io.ox/mail')
  mail.newMail()

  I.click('~Maximize')

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.fillField({ css: 'body' }, defaultText)
    I.pressKey('Enter')
    I.see('http://example.com', 'a')
    I.pressKey('ArrowLeft')
    I.pressKey('ArrowLeft')
    I.pressKey('ArrowLeft')
  })

  I.click('~Insert/edit link')
  I.waitForVisible('.tox-dialog')
  I.fillField('URL', '')
  I.pressKey('Enter')

  await within({ frame: iframeLocator }, async () => {
    I.dontSeeElement('a')
  })
})
