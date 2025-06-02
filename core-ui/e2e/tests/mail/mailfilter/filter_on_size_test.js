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

Feature('Mailfilter')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7798] Filter mail on size', async ({ I, users, mail, mailfilter, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('Add new rule')
  mailfilter.newRule('TestCase0382')
  mailfilter.addCondition('Size', '512', 'sizeValue')
  mailfilter.setFlag('Red')
  mailfilter.save()

  await I.executeAsyncScript(async function (done) {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { default: filesApi } = await import(String(new URL('io.ox/files/api.js', location.href)))
    const blob = new window.Blob(['some blob'], { type: 'text/plain' })
    filesApi.upload({ folder: settings.get('folder/infostore'), file: blob, filename: 'Principia.txt', params: {} }
    ).done(done)
  })

  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0382')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  // Open Filepicker
  I.click('~Attachments')
  I.click('Add from Drive')

  I.waitForText('Principia.txt')
  I.click(locate('div.name').withText('Principia.txt').inside('.io-ox-fileselection'))
  // Add the file
  I.click('Add')

  // Wait for the filepicker to close
  I.waitForDetached('.io-ox-fileselection')

  mail.send()

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCase0382'), 30)
})
