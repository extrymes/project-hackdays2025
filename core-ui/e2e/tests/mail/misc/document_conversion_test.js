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

Feature('Mail > Misc')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUI-867] Test document conversion', async ({ I, users, mail }) => {
  await users[0].context.hasCapability('document_preview')
  I.login('app=io.ox/mail')

  mail.newMail()
  I.attachFile({ css: 'input[type=file]' }, 'media/files/generic/testdocument.docx')
  I.waitForResponse(response => response.url().match(/.*api\/mail\/compose\/draft.*format=preview_image.*/), 30)
  I.waitForElement('.attachment-list.preview .attachment')
  const bgImage = await I.grabCssPropertyFrom('.attachment-list.preview .attachment', 'background-image')
  expect(bgImage).to.match(/.*api\/mail\/compose\/draft.*format=preview_image.*/)

  I.dontSeeElement('.attachment-list.preview .attachment .fallback')
  I.waitForClickable('.attachment-list.preview .attachment')

  I.click('.attachment', '.attachment-list.preview')
  I.waitForText('Hello World', 5)
})
