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

Feature('Mobile > Settings')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Open settings manually @mobile', ({ I }) => {
  I.login()
  I.waitForApp()

  I.click('~Navigate to:')
  I.waitForVisible('.launcher-dropdown')
  I.click('Settings', '.menu-actions')
  I.waitForApp()
  I.seeElement('.folder-tree.complete')
})

Scenario('Basic navigation @mobile', ({ I, settings }) => {
  I.login('app=io.ox/mail&settings=virtual/settings/')
  I.waitForApp()
  I.waitForText('General', 5)
  I.waitForElement('.folder-tree.complete')
  I.wait(1)
  I.click('General')
  I.waitForVisible(locate('h1').withText('General').as('"General"'), 5)
  I.waitForElement('.settings-detail-pane .expandable-section[open], .settings-detail-pane .settings-section')

  I.click(locate('.navbar-action.left a').withText('Back').as('"< Back"'))
  I.waitForText('Settings', 1, '.page.current h1')
  I.click(locate('.toolbar-content:not([style="display: none;"]) [title="Close"]').as('"Close"'))
  I.waitForDetached('modal.mobile-dialog.io-ox-settings-main')
})

Scenario('Searching settings and selecting search results @mobile', async ({ I, users }) => {
  I.login('settings=virtual/settings/')
  I.waitForApp()

  // I.fillField('Search for setting', 'langu') doesn't work with the suggestions
  I.appendField('Search', 'l')
  I.appendField('Search', 'a')
  I.appendField('Search', 'n')
  I.appendField('Search', 'g')
  I.appendField('Search', 'u')
  I.waitForText('Language', 5)

  I.seeNumberOfElements('.search-results li', 2)
  I.click('Language')

  I.waitForText('General')
  I.seeElement('#settings-language')
})
