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

Feature('Mail > Detail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-1372] Send email to all recipients', async ({ I, users, mail }) => {
  await I.haveMail({ path: 'media/mails/Bug_67245.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // check mail
  I.waitForText('Bestest Mail Ever')
  I.click('.list-view .list-item')
  I.waitForVisible('.thread-view.list-view .list-item .mail-detail-frame')
  I.waitForText('mostawesomeaddress@world.bestest')
  I.dontSee('null')

  // check mail in mail compose as forwarded mail
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Send email')
  // same as helper
  I.waitForVisible('.io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.io-ox-mail-compose [placeholder="To"]')
  // check recipients
  I.waitForVisible(locate('.token-label').withText('mostawesomeaddress@world.bestest'))
  I.waitForVisible(locate('.token-label').withText('meMyselfAndI'))
})
