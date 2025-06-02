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

const { expect } = require('chai')

Feature('Accessibility')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Contacts - List view w/o contact', async ({ I }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForElement('.summary.empty')
  I.waitForText('This address book is empty')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Contacts - List view with contact detail view', async ({ I }) => {
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login('app=io.ox/contacts')
  I.waitForElement('.contact-detail', 30)

  const context = { rules: { 'target-size': { enabled: false } } }
  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Contacts - Modal Dialog - New address book (with exceptions)', async ({ I }) => {
  // Exceptions:
  // Input field has a missing label (critical)
  const context = { exclude: [['input[name="name"]']] }

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new address book')
  I.waitForText('Add as public folder')

  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Contacts - Modal Dialog - Import', async ({ I, dialogs }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.openFolderMenu('Contacts')
  I.clickDropdown('Import')
  dialogs.waitForVisible()

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('[Z104305] Contacts - Modal Dialog - Public link (with exceptions)', async ({ I, dialogs }) => {
  // Exceptions:
  // Typeahead missing label (critical)
  // Textinput, password and textarea have missing visual labels (critical)
  const context = {
    exclude: [
      ['.tt-hint'], ['.tt-input'],
      ['[placeholder="Password"]'],
      ['[placeholder="Message (optional)"]'],
      ['.access-dropdown'],
      ['#invite-people-pane'],
      ['.public-link']
    ]
  }
  const defaultFolder = await I.grabDefaultFolder('contacts')

  await I.haveFolder({
    title: 'Krawall',
    module: 'contacts',
    parent: defaultFolder
  })
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForElement(locate('.folder-arrow').inside('~My address books').as('My address books folder arrow'))
  I.click('.folder-arrow', '~My address books')
  I.waitForText('Krawall')
  I.click('Krawall')
  I.openFolderMenu('Krawall')
  I.clickDropdown('Share')
  dialogs.waitForVisible()
  I.waitForText('Invited people only', 5)
  I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')
  I.waitForText('Copy link', 5)
  I.say('Axe report')
  expect(await I.grabAxeReport(context)).to.be.accessible

  I.say('Cleanup')
  dialogs.clickButton('Cancel')
})

Scenario('Contacts - New contact window', async ({ I, contacts }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newContact()

  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Contacts - New distribution list window (with exceptions)', async ({ I, contacts }) => {
  // Exceptions:
  // Typeahead missing label (critical)
  const context = { exclude: [['.tt-hint'], ['.tt-input']] }

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newDistributionlist()

  expect(await I.grabAxeReport(context)).to.be.accessible
})
