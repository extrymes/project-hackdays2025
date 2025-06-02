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

Feature('Settings > Search')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario.skip('As a user I can search settings via keyboard', async ({ I, settings }) => {
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()

  I.fillField('Search', 'langu') // cSpell:disable-line
  I.see('Language')

  I.seeNumberOfElements('.search-results .title', 2)
  I.pressKey('ArrowDown')
  I.pressKey('Enter')

  I.waitForText('General', null, '.io-ox-settings-main .settings-detail-pane')
  I.waitForElement('#settings-language.settings-search-highlight')
  I.waitForFocus('#settings-language.settings-search-highlight')
})

Scenario('As a user, I can search settings and click on the search results', async ({ I, settings }) => {
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()

  I.fillField('Search', 'langu') // cSpell:disable-line
  I.see('Language')

  I.seeNumberOfElements('.search-results .title', 2)
  I.click('Language', '.search-results .title')

  I.waitForText('General', null, '.io-ox-settings-main .settings-detail-pane')
  I.waitForElement('#settings-language.settings-search-highlight')
})

Scenario('Keyboard shortcut opens current setting page', async ({ I, settings }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login('io.ox/mail')
  I.waitForApp()

  I.pressKey(['Control', 'Alt', 's'])
  I.waitForText('Mail', null, '.io-ox-settings-main .settings-detail-pane')
  I.waitForApp()
  I.pressKey(['/'])
  I.waitForFocus('.modal-dialog .search-field')
})
