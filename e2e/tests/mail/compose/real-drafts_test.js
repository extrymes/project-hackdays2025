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

Feature('Mail Compose > Real drafts')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[RD001] Refresh draft folder on change', async ({ I, mail }) => {
  await I.haveSetting('io.ox/mail//autoSaveAfter', 2000)

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Drafts')
  I.click('~Drafts')
  I.waitForApp()
  I.waitForInvisible(locate('.folder.selected').withText('Inbox'), 10)
  I.waitForVisible(locate('.folder.selected').withText('Drafts'))
  I.waitForInvisible('.leftside [data-ref="io.ox/mail/listview"] .busy-indicator', 5)
  I.waitForText('This folder is empty', 5, '.leftside [data-ref="io.ox/mail/listview"]')

  I.say('1. creates space (initial save)')
  mail.newMail()
  I.waitForText('No subject', 15, '.leftside [data-ref="io.ox/mail/listview"]')

  // update space
  I.say('2. update space')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.click('.default-style')
    I.fillField({ css: 'body' }, 'Some text')
  })
  I.fillField('Subject', 'RD001')
  I.waitForText('Saving')
  I.waitForText('RD001', 5, '.list-view')
})
