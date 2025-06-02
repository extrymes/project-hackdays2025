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

Feature('Contacts > Delete')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7366] Multiple contacts', async ({ I, search, contacts, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('contacts')
  await Promise.all([
    I.haveContact({
      display_name: 'C7366, C7366',
      folder_id: defaultFolder,
      first_name: 'C7366',
      last_name: 'C7366'
    }),
    I.haveContact({
      display_name: 'C7366, C7366',
      folder_id: defaultFolder,
      first_name: 'C7366',
      last_name: 'C7366'
    })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()

  search.doSearch('C7366 C7366')
  I.click('~C7366, C7366')
  I.waitForNetworkTraffic()
  I.click('~More contact options')
  I.clickDropdown('Select all')
  I.waitForNetworkTraffic()
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForInvisible('.io-ox-busy')
  I.dontSee('C7367, C7367')
})

Scenario('[C7367] Single Contact', async ({ I, contacts, dialogs }) => {
  await I.haveContact({
    display_name: 'C7367, C7367',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7367',
    last_name: 'C7367'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7367, C7367')

  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('~C7367, C7367')
})
