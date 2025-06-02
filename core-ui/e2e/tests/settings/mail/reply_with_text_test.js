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

Feature('Settings > Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7776] Insert the original email text to a reply', async ({ I, mail, settings }) => {
  const listview = locate('.list-view-control').as('List View')

  await I.haveMail({ path: 'tests/settings/mail/plain_text.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('plain text', 5, listview)
  I.click('.list-item.selectable', listview)
  I.waitForVisible('.detail-view-header .subject')
  I.waitForElement('~Reply')
  I.click('~Reply')
  I.waitForElement('.io-ox-mail-compose textarea')
  I.seeInField('textarea', '> This is simple plain text!')

  I.click('~Close', '.io-ox-mail-compose-window')

  I.logout()

  I.login('app=io.ox/mail&section=io.ox/mail/settings/advanced&settings=virtual/settings/io.ox/mail')
  I.waitForApp()
  I.waitForText('Insert the original email text to a reply')
  I.click('Insert the original email text to a reply')
  await I.waitForSetting({ 'io.ox/mail': { appendMailTextOnReply: false } })
  settings.close()

  I.waitForText('plain text', 5, listview)
  I.click('.list-item.selectable', listview)
  I.waitForVisible('.detail-view-header .subject')
  I.waitForElement('~Reply')
  I.click('~Reply')
  I.waitForText('Re: plain text')
  I.waitForElement('.io-ox-mail-compose .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.dontSee('This is simple plain text!')
  })
})
