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

const { expect } = require('chai')

Feature('Settings > Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C114376] Default font style', async ({ I, users, mail, dialogs, settings }) => {
  const smartDropdown = '.smart-dropdown-container.dropdown.open'
  const colorPicker = '.dropdown-menu.colorpicker-container'
  const mailListView = '.list-view.visible-selection.mail-item'

  await users.create()
  const [alice, bob] = users

  session('Alice', async () => {
    I.login('app=io.ox/mail', { user: alice })

    mail.newMail()
    I.fillField('To', bob.get('primaryEmail'))
    I.fillField('Subject', 'Testsubject Draft')
    I.pressKey('Tab')
    I.fillField('span', 'Testcontent')
    I.click('~Close', '.io-ox-mail-compose-window')
    dialogs.clickButton('Save draft')
    I.waitForDetached('.io-ox-mail-compose-window')

    settings.open('Mail', 'Compose & Reply')

    I.waitForElement(locate('.dropdown-label').withText('Font'))
    I.click(locate('.dropdown-label').withText('Font'))
    I.waitForElement(smartDropdown)
    I.waitForElement(smartDropdown)
    I.waitForText('Verdana', 5, smartDropdown)
    I.click('Verdana', smartDropdown)

    I.click(locate('.dropdown-label').withText('Size'))
    I.waitForElement(smartDropdown)
    I.waitForText('16pt', 5, smartDropdown)
    I.click('16pt', smartDropdown)

    I.click(locate('.dropdown-label').withText('Color'))
    I.waitForElement(colorPicker)
    I.waitForElement('a[title="Green"]', 5)
    I.click('a[title="Green"]', colorPicker)

    I.waitForElement(locate('div.example-text[style="font-family: verdana, geneva; font-size: 16pt; color: rgb(45, 194, 107);"]').withText('This is how your message text will look like.'))

    settings.close()
    mail.newMail()

    I.fillField('To', bob.get('primaryEmail'))
    I.fillField('Subject', 'Testsubject')
    I.pressKey('Tab')
    I.fillField('span', 'Testcontent')

    mail.send()
  })

  session('Bob', async () => {
    I.login('app=io.ox/mail', { user: bob })

    I.waitForElement(mailListView)
    within(mailListView, () => {
      I.waitForText('Testsubject')
      I.retry(5).click('Testsubject')
    })

    I.waitForElement('.mail-detail-frame')
    await within({ frame: '.mail-detail-frame' }, async () => {
      I.waitForElement(locate('span[style="font-family: verdana; font-size: 16pt;"]').withText('Testcontent'))
    })
  })

  session('Alice', async () => {
    I.click(locate('div').withText('Drafts'), '.open.standard-folders')

    I.waitForElement(mailListView)
    within(mailListView, () => {
      I.waitForText('Testsubject Draft')
      I.retry(5).click('Testsubject Draft')
    })

    I.waitForElement('.mail-detail-frame')
    await within({ frame: '.mail-detail-frame' }, async () => {
      I.waitForElement(locate('div.default-style').withText('Testcontent'))
      I.dontSeeElement(locate('span[style="font-family: verdana; font-size: 16pt;"]').withText('Testcontent'))
    })

    I.clickToolbar('~Edit draft')

    I.waitForElement('.io-ox-mail-compose input[name="subject"]')
    expect(await I.grabValueFrom('.io-ox-mail-compose input[name="subject"]')).to.equal('Testsubject Draft')
    I.waitForElement({ css: 'iframe[title*="Rich Text Area"]' })
    await within({ frame: 'iframe[title*="Rich Text Area"]' }, async () => {
      I.waitForText('Testcontent')
    })
    I.waitForText('Send', 5, '.io-ox-mail-compose-window .window-footer')
    I.wait(0.5)
    mail.send()
    I.waitForDetached('.io-ox-mail-compose-window')
  })

  session('Bob', async () => {
    I.triggerRefresh()

    I.waitForElement(mailListView)
    within(mailListView, () => {
      I.waitForText('Testsubject Draft')
      I.retry(5).click('Testsubject Draft')
    })

    I.waitForElement('.mail-detail-frame')
    await within({ frame: '.mail-detail-frame' }, async () => {
      I.waitForElement(locate('div.default-style').withText('Testcontent'))
      I.dontSeeElement(locate('span[style="font-family: verdana; font-size: 16pt;"]').withText('Testcontent'))
    })
  })
})
