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

Feature('Contacts > Folder')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C85620] All Users is the default folder - switch capability for user', async ({ I, users, contacts }) => {
  // Make sure user has the global address book enabled
  await users[0].hasCapability('gab')
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  // The global address book is shown
  I.waitForText('All Users', 5, '~Public address books')

  // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
  await I.executeScript(async function () {
    const { default: capabilities } = await import(String(new URL('io.ox/core/capabilities.js', location.href)))
    return capabilities.has('gab')
  })

  I.logout()

  // Disable the global address book for the user
  await users[0].doesntHaveCapability('gab')
  I.refreshPage()
  I.login('app=io.ox/contacts')
  // The users contacts folder is shown
  I.waitForText('Contacts', 5, '~My address books')
  // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
  await I.executeScript(async function () {
    const { default: capabilities } = await import(String(new URL('io.ox/core/capabilities.js', location.href)))
    return capabilities.has('gab')
  })
})

Scenario('[C85620] All Users is the default folder - check first login', async ({ I, users }) => {
  // Make sure user has the global address book enabled
  await users[1].doesntHaveCapability('gab')

  I.login('app=io.ox/contacts', { user: users[1] })

  // The users contacts folder is shown
  I.waitForText('Contacts', 10, '~My address books')

  // The global address book isn't shown
  I.dontSee('All Users', '~Public address books')

  // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
  await I.executeScript(async function () {
    const { default: capabilities } = await import(String(new URL('io.ox/core/capabilities.js', location.href)))
    return capabilities.has('gab')
  })
})

Scenario('[C7355] - Create a new private folder', ({ I, contacts }) => {
  const folderName = 'C7355'

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForText('My address books')
  I.click('My address books')
  contacts.newAddressbook(folderName)
  I.waitForVisible(locate('[aria-label="My address books"] .folder:not(.selected) .folder-label').withText(folderName).as(folderName))
})

Scenario('[C7356] - Create a new public folder ', async ({ I, users, contacts }) => {
  const folderName = 'C7356'

  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.click('~Folder-specific actions')
  I.clickDropdown('Add new address book')
  I.waitForVisible('.modal-body')
  I.fillField('[placeholder="New address book"][type="text"]', folderName)
  I.checkOption('Add as public folder')
  I.click('Add')
  I.waitForDetached('.modal-body')
  // Verify new folder is sorted correctly
  I.waitForVisible(locate('[aria-label="Public address books"] .folder-label').at(2).withText(folderName))
  I.selectFolder('C7356')
  I.logout()

  I.login('app=io.ox/contacts', { user: users[1] })
  I.waitForApp()
  I.dontSee(folderName)
})
