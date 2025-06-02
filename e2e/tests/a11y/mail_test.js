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

Scenario('Mail - Vertical view w/o mail', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('This folder is empty', 5, '.list-view')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Mail - Horizontal view w/o mail', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('This folder is empty', 5, '.list-view')

  I.click('~Settings')
  I.clickDropdown('Horizontal')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Mail - List view w/o mail', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('This folder is empty', 5, '.list-view')

  I.click('~Settings')
  I.clickDropdown('List')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Mail - List view unified mail w/o mail', async ({ I }) => {
  I.login('app=io.ox/mail')
  // enable unified mail
  await I.executeAsyncScript(async done => {
    const api = await import(String(new URL('io.ox/core/api/account.js', location.href)))
    await api.update({ id: 0, personal: null, unified_inbox_enabled: true })
    done()
  })
  I.waitForResponse(response => response.url().includes('api/jslob?action=set') && response.request().method() === 'PUT', 10)
  I.waitForResponse(response => response.url().includes('api/jslob?action=set') && response.request().method() === 'PUT', 10)

  I.refreshPage()
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForApp()
  I.waitForText('Unified mail', 10)

  expect(await I.grabAxeReport()).to.be.accessible

  // disable unified mail
  I.executeAsyncScript(async done => {
    const api = await import(String(new URL('io.ox/core/api/account.js', location.href)))
    await api.update({ id: 0, personal: null, unified_inbox_enabled: false })
    done()
  })
})

Scenario('Mail - Compose window (with exceptions)', async ({ I, mail }) => {
  // Exceptions:
  // Typeahead missing label (critical), TinyMCE toolbar invalid role (minor issue)
  const context = { exclude: [['.to'], ['.mce-open'], ['.mce-toolbar']] }

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.waitForElement('iframe[title*="Rich Text Area"]')
  I.waitForInvisible('.window-blocker.io-ox-busy')
  // Cursor needs to be moved because of drecks tooltip.
  I.moveCursorTo('.floating-header')
  I.waitForDetached('.tooltip.bottom.in')

  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Mail - Modal Dialog - Vacation notice (with exceptions)', async ({ I }) => {
  // Exceptions:
  // Checkbox has no visible label (critical)
  const context = { exclude: [['.checkbox.switch.large']] }

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForElement('.mail-detail-pane')
  I.waitForEnabled('~Settings')
  I.click('~Settings')
  I.clickDropdown('Vacation notice ...')
  I.waitForElement('h1.modal-title')

  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Mail - Modal Dialog - Add mail account', async ({ I }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForElement('.mail-detail-pane')
  I.selectFolder('Inbox')
  I.waitForElement('~More actions', 5)
  I.click('~More actions', '.primary-action')
  I.clickDropdown('Add mail account')
  I.waitForText('Your mail address')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Mail - Modal Dialog - New folder (with exceptions)', async ({ I }) => {
  // Exceptions:
  // Input has no visible label (critical)
  const context = { exclude: [['*[placeholder="New folder"]']] }

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Inbox')
  I.waitForEnabled('~Actions for Inbox')
  I.click('~Actions for Inbox')
  I.clickDropdown('Add new folder')
  I.waitForElement('h1.modal-title')

  expect(await I.grabAxeReport(context)).to.be.accessible
})

Scenario('Mail - Modal Dialog - Permissions (with exceptions)', async ({ I }) => {
  // Exceptions:
  // Typeahead missing label (critical)
  // Personal message textarea has a missing label (critical)
  const context = { exclude: [['.tt-hint'], ['.tt-input'], ['.message-text'], ['.share-pane h5']] }

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Inbox')
  I.waitForEnabled('~Actions for Inbox')
  I.click('~Actions for Inbox')
  I.clickDropdown('Permissions')
  I.waitForElement('h1.modal-title')

  expect(await I.grabAxeReport(context)).to.be.accessible
})
