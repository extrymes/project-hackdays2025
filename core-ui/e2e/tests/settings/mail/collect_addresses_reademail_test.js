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

Scenario('[7773] Contact collection when reading mail', async ({ I, settings }) => {
  await I.haveMail({ path: 'tests/settings/mail/test.eml' })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.click('Automatically collect contacts in the folder "Collected addresses" while reading')
  await I.waitForSetting({ 'io.ox/mail': { contactCollectOnMailAccess: true } }, 10)
  settings.close()

  I.waitForText('Richtig gutes Zeug')
  I.click('.list-item.selectable')
  I.waitForVisible('.detail-view-header .subject')

  I.openApp('Address Book')
  I.click('#io-ox-refresh-icon')
  I.waitForText('My address books', 5)
  I.doubleClick('~My address books')

  I.click('Collected addresses')
  I.waitForText('John Doe')
})
