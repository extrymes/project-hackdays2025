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

const assert = require('assert')

Feature('Mail Send')

Before(async ({ users }) => {
  await users.create() // Sender
  await users.create() // Recipient
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Send and receive mail @smoketest', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  I.login('app=io.ox/mail', { user: sender })
  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', 'Test mail')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: recipient })

  let element = await I.grabNumberOfVisibleElements('.list-item.selectable')
  let retries = 6
  while (!element && retries) {
    retries--
    I.triggerRefresh()
    I.waitForNetworkTraffic()
    I.wait(10.5)
    element = await I.grabNumberOfVisibleElements('.list-item.selectable')
    if (!retries) assert.fail('Timeout waiting for element')
  }
  I.waitForText('Test mail', 5)
})

Scenario('Send email on keyboard shortcut', async ({ I, users, mail }) => {
  const [user] = users

  I.login(['app=io.ox/mail'])
  mail.newMail()

  I.fillField('To', user.get('primaryEmail'))
  within({ frame: '.editor iframe' }, () => {
    I.fillField('body', 'Editing draft')
  })
  I.fillField('Subject', 'Testsubject')

  I.pressKey(['CommandOrControl', 'Enter'])
  I.waitForDetached('.io-ox-mail-compose')
})

Scenario.skip('Send email on keyboard shortcut from editor', async ({ I, users, mail }) => {
  const [user] = users

  I.login(['app=io.ox/mail'])
  mail.newMail()

  I.fillField('To', user.get('primaryEmail'))
  I.fillField('Subject', 'Testsubject')
  within({ frame: '.editor iframe' }, () => {
    I.fillField('body', 'Editing draft')
  })

  I.pressKey(['CommandOrControl', 'Enter'])
  I.waitForDetached('.io-ox-mail-compose')
})

Scenario.skip('Send email on keyboard shortcut from To: field', async ({ I, users, mail }) => {
  const [user] = users

  I.login(['app=io.ox/mail'])
  mail.newMail()

  I.fillField('Subject', 'Testsubject')
  within({ frame: '.editor iframe' }, () => {
    I.fillField('body', 'Editing draft')
  })
  I.fillField('To', user.get('primaryEmail'))

  I.pressKey(['CommandOrControl', 'Enter'])
  I.waitForDetached('.io-ox-mail-compose')
})
