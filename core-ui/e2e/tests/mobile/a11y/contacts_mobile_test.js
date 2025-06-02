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

Feature('Mobile > Accessibility > Contacts')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

const options = {
  rules: {
    'meta-viewport': { enabled: false } // [CRITICAL] Zooming and scaling must not be disabled
  }
}

Scenario('List view w/o contact @mobile', async ({ I }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForElement('.summary.empty')
  I.waitForText('This address book is empty')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('List view with contact detail view @mobile', async ({ I }) => {
  await I.haveContact({
    display_name: 'C7362, C7362',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7362',
    last_name: 'C7362',
    company: 'C7362',
    department: 'C7362',
    email1: 'C7362@C7362.io',
    cellular_telephone1: 'C7362'
  })
  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForElement(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.click(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.waitForText('C7362', 5, '.contact-detail')

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('New address book modal (with exceptions) @mobile', async ({ I, dialogs }) => {
  // Exceptions:
  // Input field has a missing label (critical)
  const context = { exclude: [['input[name="name"]']] }
  const toolbarRight = locate({ xpath: './/*[contains(@class, "navbar-action right") and not(ancestor::*[contains(@style, "display: none;")])]' })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.wait(0.5) // prevent clicking a detached element caused by the top toolbar being re-rendered multiple times
  I.waitForText('Folders', 5, '.toolbar-content .left')
  I.click('Folders')
  I.wait(0.5) // prevent clicking a detached element caused by the top toolbar being re-rendered multiple times
  I.waitForText('Edit', 1, toolbarRight)
  I.click(toolbarRight.as('"Edit"'))
  I.click('My address books')
  I.waitForText('Add new address book')
  I.click('Add new address book')
  dialogs.waitForVisible()
  I.waitForText('Add as public folder', 5, dialogs.body)

  expect(await I.grabAxeReport(context, options)).to.be.accessible
})

Scenario('New contact window @mobile', async ({ I, mobileContacts }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  mobileContacts.newContact()

  expect(await I.grabAxeReport(options)).to.be.accessible
})
