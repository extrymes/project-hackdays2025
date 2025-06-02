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

Feature('Mobile > Mail > List View')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create()
  ])
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Delete the only mail @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Delete me!' })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Edit', 5, '.navbar-action.right a')
  I.retry(5).click('Edit')
  I.waitForVisible('.list-item-checkmark')
  I.click('.list-item-checkmark')
  I.see('1 selected')
  I.click('~Delete')
  I.waitForText('This folder is empty')
  I.dontSee('Delete me!')
})

Scenario('Delete one mail @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]

  await Promise.all([
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 1!' }),
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 2!' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Edit', 5, '.navbar-action.right a')
  I.retry(5).click('Edit')
  I.waitForVisible('.list-item-checkmark')
  I.click('[data-cid="default0/INBOX.1"] .list-item-checkmark')
  I.waitForText('1 selected')
  I.click('~Delete')
  I.dontSee('Delete me 1!')
  I.see('Delete me 2!')
})

Scenario('Delete all mails @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await Promise.all([
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 1!' }),
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 2!' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Edit', 5, '.navbar-action.right a')
  I.retry(5).click('Edit')
  I.waitForVisible('.list-item-checkmark')
  I.click(locate('.list-item-checkmark').at(1))
  I.click(locate('.list-item-checkmark').at(2))
  I.see('2 selected')
  I.click('~Delete')
  I.waitForText('This folder is empty')
  I.dontSee('Delete me 1!')
  I.dontSee('Delete me 2!')
})

Scenario('Mark all messages as read @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await Promise.all([
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 1!' }),
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 2!' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // wait half a second to ensure element is properly drawn
  I.waitNumberOfVisibleElements('.seen-unseen-indicator', 2)
  I.waitForText('Edit', 5, '.navbar-action.right a')
  I.retry(5).click('Edit')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 2)
  I.click('~More message options')

  I.waitForText('Mark all messages as read')
  I.click('Mark all messages as read')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 0)
})

Scenario('Mark selected message as read / unread @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await Promise.all([
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 1!' }),
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 2!' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // wait half a second to ensure element is properly drawn
  I.waitNumberOfVisibleElements('.seen-unseen-indicator', 2)
  I.waitForText('Edit', 5, '.navbar-action.right a')
  I.retry(5).click('Edit')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 2)
  I.waitForVisible('.list-item-checkmark')
  I.click(locate('.list-item-checkmark').at(2))
  I.see('1 selected')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 2)

  I.click('~Actions')
  I.waitForText('Mark as read')
  I.click('Mark as read')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 1)

  I.click('~Actions')
  I.waitForText('Mark as unread')
  I.click('Mark as unread')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 2)

  I.click(locate('.list-item-checkmark').at(1).as('First checkmark'))
  I.see('2 selected')

  I.click('~Actions')
  I.waitForText('Mark as read')
  I.click('Mark as read')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 0)

  I.click('~Actions')
  I.waitForText('Mark as unread')
  I.click('Mark as unread')
  I.seeNumberOfVisibleElements('.seen-unseen-indicator', 2)
})
