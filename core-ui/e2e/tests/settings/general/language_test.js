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

Feature('Settings > Basic')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7757] Set language', ({ I, settings }) => {
  // check major languages
  const languages = {
    de_DE: ['Allgemein', 'Deutsch (Deutschland)'],
    es_ES: ['General', 'Español (Espana)'],
    fr_FR: ['Général', 'Français (France)'],
    it_IT: ['Generale', 'Italiano (Italia)'],
    en_US: ['General', 'English (United States)'],
    ja_JP: ['全般', '日本語 (日本)']
  }

  // we start with en_US
  let previous = languages.en_US[0]

  for (const id in languages) {
    I.login('settings=virtual/settings/io.ox/core')
    I.waitForApp()
    I.waitForElement('[data-section="io.ox/settings/general/language"]')
    I.click('[data-section="io.ox/settings/general/language"] summary')
    I.waitForText(previous)
    I.waitForElement({ css: 'select[name="language"]' })
    I.selectOption({ css: 'select[name="language"]' }, languages[id][1])
    previous = languages[id][0]
    // wait for visual hint
    I.waitForVisible('.settings-hint.reload-page')
    settings.close()
    I.logout()
  }

  // last time
  I.login('settings=virtual/settings/io.ox/core')
  I.waitForApp()
  I.waitForText(previous)
})

Scenario('[OXUIB-2410] Language change should reload mail settings', ({ I, settings }) => {
  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/language')
  I.waitForApp()
  I.waitForElement('#settings-language')
  I.selectOption('language', 'Deutsch (Deutschland)')
  // wait for visual hint
  I.waitForVisible('.settings-hint.reload-page')

  I.click('.folder-node[title=Mail]')
  I.waitForText('Show text preview')
  I.uncheckOption('Show text preview')
  I.waitForNetworkTraffic()
  // wait for possible alert to show up
  I.dontSeeElement('.io-ox-alert')
})
