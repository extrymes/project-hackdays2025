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

Feature('Mobile > Mail > Detail View')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create()
  ])
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Delete only mail @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  const trashFolderLocator = locate('.folder-label').withText('Trash').as('Trash folder')
  await I.haveMail({ from: sender, to: sender, subject: 'Delete me!' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mobileMail.selectMail('Delete me!')
  I.waitForInvisible('.list-view.complete')
  I.click('~Delete')
  I.waitForInvisible('.mail-detail-pane')
  I.waitForText('This folder is empty')
  I.dontSee('Delete me!')

  I.click(locate('.navbar-action.left a').withText('Folders').as('Folders Button'))
  I.waitForVisible('.folder-tree')
  I.waitForVisible(trashFolderLocator)
  // wait, otherwise click does nothing
  I.wait(1)
  I.click(trashFolderLocator)
  I.waitForText('Delete me!')
})

Scenario('Delete one mail @mobile', async ({ I, users, mobileMail }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await Promise.all([
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 1!' }),
    I.haveMail({ from: sender, to: sender, subject: 'Delete me 2!' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mobileMail.selectMail('Delete me 1!')
  I.waitForInvisible('.list-view.complete')
  I.click('~Delete')
  I.waitForInvisible('.mail-detail-pane')
  I.waitForVisible('.list-view.complete')

  I.dontSee('Delete me 1!')
  I.see('Delete me 2!')
})
