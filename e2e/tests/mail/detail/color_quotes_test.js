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

const expect = require('chai').expect

Feature('Mail > Detail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7819] Color quotes on reply', async ({ I, users, mail }) => {
  const icke = users[0].get('email1')

  await I.haveMail({
    attachments: [{
      content: '<p>Level 0</p><blockquote type="cite"><p>Level 1</p><blockquote type="cite"><p>Level 2</p><blockquote type="cite"><p>Level 3</p></blockquote></blockquote></blockquote>',
      content_type: 'text/html',
      disp: 'inline'
    }],
    from: [['Icke', icke]],
    subject: 'RE: Color quotes on reply',
    to: [['Icke', icke]]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // wait for first email
  mail.selectMail('RE: Color quotes on reply')

  I.waitForElement('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, async function () {
    expect(await I.grabCssPropertyFrom('blockquote', 'color')).to.equal('rgb(112, 105, 92)')
    expect(await I.grabCssPropertyFrom('blockquote blockquote', 'color')).to.equal('rgb(40, 63, 115)')
    expect(await I.grabCssPropertyFrom('blockquote blockquote blockquote', 'color')).to.equal('rgb(221, 8, 128)')
  })
})
