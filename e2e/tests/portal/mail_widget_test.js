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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('adding a mail containing XSS code', async ({ I, users, dialogs }) => {
  await I.haveMail({
    subject: 'Test subject <img src="x" onerror="alert(666);">',
    attachments: [{
      content: '<img src="x" onerror="alert(1337);">\r\n',
      content_type: 'text/plain',
      raw: true,
      disp: 'inline'
    }],
    from: users[0],
    to: users[0],
    sendtype: 0
  })

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForText('Test subject', 5, '.io-ox-mail-window .leftside')

  // click on first email
  I.click('.io-ox-mail-window .leftside ul li.list-item')
  I.waitForElement('~More actions')
  I.retry(3).click('~More actions', '.mail-header-actions')
  I.clickDropdown('Add to portal')
  I.waitForDetached('#io-ox-refresh-icon .fa-spin')

  I.openApp('Portal')

  I.waitForApp()

  I.waitForVisible('.io-ox-portal-window .widgets li.widget:first-child')
  let widgetId = await I.grabAttributeFrom('.io-ox-portal-window .widgets li.widget:first-child', 'data-widget-id')
  widgetId = Array.isArray(widgetId) ? widgetId[0] : widgetId // differs in puppeteer vs. webdriver
  let type = await I.grabAttributeFrom('.io-ox-portal-window .widgets li.widget:first-child', 'data-widget-type')
  type = Array.isArray(type) ? type[0] : type // differs in puppeteer vs. webdriver
  expect(type).to.equal('stickymail')

  I.waitForText('Test subject <img src="x" onerror="alert(666);">', 5, `.io-ox-portal-window .widgets li.widget[data-widget-id="${widgetId}"] .title`)

  I.click(`.io-ox-portal-window .widgets li.widget[data-widget-id="${widgetId}"] .disable-widget`)
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached(`.io-ox-portal-window .widgets li.widget[data-widget-id="${widgetId}"]`)
})
