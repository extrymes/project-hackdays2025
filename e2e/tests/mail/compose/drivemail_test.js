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

Feature('Mail Compose > Drive Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// no file input fields in tinymce 5
Scenario('Checks when adding/removing attachments', async ({ I, mail, tinymce }) => {
  const checked = locate('.share-attachments [name="enabled"]:checked').as('Drive mail: checked')
  const unchecked = locate('.share-attachments [name="enabled"]').as('Drive mail: unchecked')
  const message = locate('.io-ox-alert').as('Yell: warning')

  I.login('app=io.ox/mail')

  await I.executeScript(async function () {
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    mailSettings.set('compose/shareAttachments/threshold', 3800)
    return mailSettings.set('attachments/layout/compose/large', 'list')
  })

  // compose mail
  mail.newMail()

  // attach my vcard
  I.click('~Mail compose actions')
  I.click('Attach Vcard')

  // attach image (3720)
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/1030x1030.png')
  I.waitForVisible(unchecked, 10)

  // attach inline image
  await tinymce.attachInlineImage('media/placeholder/800x600.png')
  I.waitForVisible(unchecked, 10)

  // attach another image (2387)
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/800x600-mango.png')
  I.waitForVisible(message, 10)
  I.waitForVisible(checked, 10)
  I.waitForNetworkTraffic()

  // try to disable checkbox. shouldn't be possible when over treshold
  I.uncheckOption(checked)
  I.waitForText('Saved a few seconds ago', 5, '.window-footer .inline-yell')
  I.checkOption(checked)

  // remove all file attachments
  I.click('.list-container .remove-attachment:last-child')
  I.click('.list-container .remove-attachment:last-child')
  I.uncheckOption(checked)

  // add again
  I.attachFile('.composetoolbar input[type="file"]', 'media/placeholder/1030x1030.png')
  I.waitForVisible('.list-container .attachment-list .attachment:nth-child(2)')
  I.checkOption(unchecked)
})
