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

Feature('Contacts > Distribution List > Delete')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7379] Single distribution list', async ({ I, contacts, dialogs }) => {
  await I.haveContact({ display_name: 'C7379 Testlist', folder_id: await I.grabDefaultFolder('contacts'), mark_as_distributionlist: true })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForElement('~C7379 Testlist')
  I.click('~C7379 Testlist')
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('~C7379 Testlist')
})

Scenario('[C7378] Multiple distribution lists', async ({ I, search, contacts, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('contacts')
  await Promise.all([
    I.haveContact({ display_name: 'C7378 Testlist - 1', folder_id: defaultFolder, mark_as_distributionlist: true }),
    I.haveContact({ display_name: 'C7378 Testlist - 2', folder_id: defaultFolder, mark_as_distributionlist: true })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()

  search.doSearch('C7378 Testlist')
  I.waitForText('C7378 Testlist', 5, '.vgrid-cell')

  I.click('~More contact options')
  I.clickDropdown('Select all')
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForNetworkTraffic()
  I.waitForText('No search results')
  I.dontSee('C7378 Testlist - 1')
  I.dontSee('C7378 Testlist - 2')
})
