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

Feature('General > About')

Before(async ({ users }) => { await users.create() })
After(async ({ users }) => { await users.removeAll() })

Scenario('About Dialog shows the correct frontend and middleware version', async ({ I }) => {
  I.login()

  const currentUrl = await I.grabCurrentUrl()
  const url = new URL('meta', currentUrl)
  const meta = {}

  const entries = await fetch(url.href).then(res => res.json())
  entries.forEach(entry => {
    meta[entry.id] = entry
  })

  I.executeScript(async function () {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.serverConfig.serverVersion = '9.99'
  })

  const version = await I.executeScript(async function () {
    const { getVersionString } = await import(String(new URL('io.ox/core/util.js', location.href)))
    return getVersionString()
  })

  // test "normal" about dialog
  I.waitForElement('#io-ox-topbar-help-dropdown-icon')
  I.click('#io-ox-topbar-help-dropdown-icon .dropdown-toggle')
  I.waitForElement('#topbar-help-dropdown .io-ox-context-help')
  I.click('About')
  I.waitForVisible('.about-dialog')

  I.waitForText(`UI version: ${version}`)
  I.waitForText('Middleware version: 9.99')

  I.click('Close')

  // test "extended" about dialog
  I.waitForElement('#io-ox-topbar-help-dropdown-icon')
  I.click('#io-ox-topbar-help-dropdown-icon .dropdown-toggle')
  I.waitForElement('#topbar-help-dropdown .io-ox-context-help')
  I.pressKeyDown('Alt')
  I.click('About')
  I.pressKeyUp('Alt')
  I.waitForVisible('.about-dialog')

  I.waitForText(`UI version: ${version}`)
  I.waitForText('Middleware version: 9.99')
  I.waitForText(`Core UI ${meta['core-ui'].version}`)
  I.waitForText(`Documents UI ${meta['documents-ui'].version}`)
  I.waitForText(`UI Middleware ${meta['ui-middleware'].version}`)
  I.waitForText(`Commit: ${meta['core-ui'].commitSha}`)
  I.waitForText(`Commit: ${meta['documents-ui'].commitSha}`)
  I.waitForText(`Commit: ${meta['ui-middleware'].commitSha}`)
})
