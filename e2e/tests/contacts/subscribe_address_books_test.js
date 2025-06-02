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

Feature('Contacts > Misc')

Before(async ({ contexts, users }) => {
  const ctx = await contexts.create()
  await Promise.all([
    users.create(users.getRandom(), ctx),
    users.create(users.getRandom(), ctx)
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C308518] Subscribe / Unsubscribe public address book', async ({ I, dialogs, users }) => {
  Promise.all([
    I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } }, { user: users[0] }),
    I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } }, { user: users[1] })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  // create new personal address book
  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new address book')
  dialogs.waitForVisible()
  I.fillField('.modal-dialog [placeholder="New address book"]', 'All my friends')
  I.checkOption('.modal-dialog .checkbox input[type="checkbox"]')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')

  // share address book with all users group
  I.waitForText('All my friends', 5, '.folder-tree')
  I.selectFolder('All my friends')
  I.waitForText('All my friends', 5, '.folder-name')
  I.openFolderMenu('All my friends')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForFocus('.modal-dialog .tt-input')
  I.fillField('.modal-dialog .tt-input[placeholder="Name or email address"]', 'All users')
  I.waitForVisible(locate('.modal-dialog .tt-dropdown-menu').withText('All users'))
  I.pressKey('Enter')
  I.waitForVisible(locate('.modal-dialog .permissions-view .row').withText('All users'))
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.waitForNetworkTraffic()

  // switch to second user
  I.logout()

  I.login('app=io.ox/contacts', { user: users[1] })
  I.waitForApp()
  // check folder is present
  I.waitForText('All my friends', 5, '.folder-tree')
  // unsubscribe
  I.click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared address books')
  dialogs.waitForVisible()
  // TODO: We can't use I.checkOption here because the checkbox is not accessible. The actual code needs to be changed.
  I.click(locate('.toggle').inside(locate('.list-group-item').withText('All my friends')))
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.dontSee('All my friends', '.folder-tree')
  I.click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared address books')
  dialogs.waitForVisible()
  I.click(locate('.toggle').inside(locate('.list-group-item').withText('All my friends')))
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.waitForText('All my friends', 5, '.folder-tree')
  I.logout()

  // remove public address book, since it's not always deleted correctly
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForText('All my friends', 5, '.folder-tree')
  I.selectFolder('All my friends')
  I.waitForText('All my friends', 5, '.folder-name')
  I.openFolderMenu('All my friends')
  I.clickDropdown('Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
})
