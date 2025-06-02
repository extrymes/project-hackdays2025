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

Feature('Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C237339] Sort mails by attachments', async ({ I, users, mail }) => {
  const [user] = users
  await user.hasConfig('com.openexchange.imap.attachmentMarker.enabled', 'true')

  await Promise.all([
    I.haveMail({
      attachments: [{
        content: 'Lorem ipsum',
        content_type: 'text/html',
        disp: 'inline'
      }],
      from: [[user.get('display_name'), user.get('primaryEmail')]],
      subject: 'Testcase C237339 M1',
      to: users[0]
    }),
    I.haveMail({
      attachments: [{
        content: 'Lorem ipsum',
        content_type: 'text/html',
        disp: 'inline'
      }],
      from: [[user.get('display_name'), user.get('primaryEmail')]],
      subject: 'Testcase C237339 M2',
      to: users[0]
    }),
    I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  await I.executeAsyncScript(async function (done) {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { default: filesApi } = await import(String(new URL('io.ox/files/api.js', location.href)))
    const blob = new window.Blob(['someBlob'], { type: 'text/plain' })
    filesApi.upload({ folder: settings.get('folder/infostore'), file: blob, filename: 'Principia.txt', params: {} }
    ).done(done)
  })

  // compose mail
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Testcase C237339 M3')
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

  I.say('Wait for mail')
  I.waitForElement('~Sent, 3 total.', 30)
  I.waitForElement('~Inbox, 3 unread, 3 total.', 30)

  I.click('~More message options')
  I.clickDropdown('Attachments')

  I.wait(0.5)

  expect(await I.grabTextFrom('.list-view.visible-selection .list-item[data-index="0"] .drag-title')).to.equal('Testcase C237339 M3')

  I.click('~More message options')
  I.waitForElement(locate('.dropdown.open a[aria-checked="true"]').withText('Ascending'))
  I.waitForElement(locate('.dropdown.open a[aria-checked="false"]').withText('Descending'))
  I.clickDropdown('Descending')

  I.waitForElement(locate('.list-view.visible-selection .list-item[data-index="2"] .drag-title').withText('Testcase C237339 M3'))
})
