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

Scenario('[C7774] Fixed-font for plain-text mails', async ({ I, settings }) => {
  await I.haveMail({ path: 'tests/settings/mail/plain_text.eml' })

  I.login('app=io.ox/mail')
  I.waitForText('plain text')
  I.click('.list-item.selectable')
  I.waitForVisible('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, async () => {
    I.seeElement('.mail-detail-content.plain-text')
    I.dontSeeElement('.mail-detail-content.fixed-width-font')
  })
  I.logout()

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText('Use fixed-width font for plain text mails')
  I.click('Use fixed-width font for plain text mails')
  settings.close()

  I.openApp('Mail')
  I.waitForText('plain text')
  I.click('.list-item.selectable')
  I.waitForVisible('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, async () => {
    I.seeElement('.mail-detail-content.plain-text.fixed-width-font')
    I.seeCssPropertiesOnElements('.mail-detail-content', { 'font-family': 'monospace' })
  })
})
