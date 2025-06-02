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

Feature('Mobile > Accessibility > Mail')

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

Scenario('Vertical view w/o mail @mobile', async ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('List view unified mail w/o mail @mobile', async ({ I, mail }) => {
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
  I.waitForText('Folders', 5, '.mobile-navbar')
  I.click('Folders', '.mobile-navbar')
  I.waitForText('Unified mail', 10)

  expect(await I.grabAxeReport(options)).to.be.accessible

  // disable unified mail
  I.executeAsyncScript(async done => {
    const api = await import(String(new URL('io.ox/core/api/account.js', location.href)))
    await api.update({ id: 0, personal: null, unified_inbox_enabled: false })
    done()
  })
})

Scenario('Compose window (with exceptions) @mobile', async ({ I, mobileMail }) => {
  // Exceptions:
  // Typeahead missing label (critical), TinyMCE toolbar invalid role (minor issue)
  const context = { exclude: [['.to'], ['.mce-open'], ['.mce-toolbar']] }

  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()
  I.waitForElement('iframe[title*="Rich Text Area"]')

  expect(await I.grabAxeReport(context, options)).to.be.accessible
})

Scenario('Vacation notice (with exceptions) @mobile', async ({ I, dialogs, settings, mail }) => {
  // Exceptions:
  // Checkbox has no visible label (critical)
  const context = { exclude: [['.checkbox.switch.large']] }

  I.login('app=io.ox/mail&section=io.ox/mail/settings/rules&settings=virtual/settings/io.ox/mail')
  I.waitForApp()
  I.wait(0.5)

  I.waitForText('Vacation notice')
  I.click('Vacation notice ...')
  dialogs.waitForVisible()

  expect(await I.grabAxeReport(context, options)).to.be.accessible
})

Scenario('Auto forward (with exceptions) @mobile', async ({ I, dialogs, settings, mail }) => {
  I.login('app=io.ox/mail&section=io.ox/mail/settings/rules&settings=virtual/settings/io.ox/mail')
  I.waitForApp()
  I.wait(0.5)

  I.waitForText('Auto forward')
  I.click('Auto forward ...')
  dialogs.waitForVisible()

  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('New folder modal (with exceptions) @mobile', async ({ I, dialogs, mail }) => {
  // Exceptions:
  // Input has no visible label (critical)
  const context = { exclude: [['*[placeholder="New folder"]']] }
  const toolbarRight = locate({ xpath: './/*[contains(@class, "navbar-action right") and not(ancestor::*[contains(@style, "display: none;")])]' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // navigate to folder view and enter edit mode
  I.wait(0.5) // prevent clicking a detached element caused by the top toolbar being re-rendered multiple times
  I.waitForText('Folders', 5, '.mobile-navbar')
  I.click('Folders', '.mobile-navbar')
  I.wait(0.5) // prevent clicking a detached element caused by the top toolbar being re-rendered multiple times
  I.waitForElement(toolbarRight.withText('Edit').as('"Edit"'))
  I.click('Edit', toolbarRight)

  I.click(locate('.folder-label').withText('Inbox').as('"Inbox"'))
  I.waitForText('Add new folder', 1, '.dropdown-menu.custom-dropdown')
  I.click('Add new folder', '.dropdown-menu.custom-dropdown')
  dialogs.waitForVisible()

  expect(await I.grabAxeReport(context, options)).to.be.accessible
})
