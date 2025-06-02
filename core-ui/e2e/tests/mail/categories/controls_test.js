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

// depends on https://gitlab.open-xchange.com/frontend/Infrastructure/preview_apps/issues/5

Feature('Mail > Categories')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// PARTIAL: missing drag and drop steps
Scenario('[C85634] Enable/disable tabbed inbox', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')

  I.seeElement('.categories-toolbar-container')
  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  I.click('Disable categories')
  I.waitForDetached('.modal-dialog')
  I.dontSeeElement('.categories-toolbar-container')
  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click('Inbox categories', 'body > .dropdown')
  dialogs.waitForVisible()
  I.click('Activate categories')
  I.waitForDetached('.modal-dialog')
  I.seeElement('.categories-toolbar-container')
})

Scenario('[C85626] Mail categories can be renamed', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')

  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  I.say('Rename categories', 'blue')
  I.fillField('[data-id="uc1"] input[type="text"]', 'C85626-01')
  I.fillField('[data-id="uc2"] input[type="text"]', 'C85626-02')

  I.click('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForText('C85626-01', 5, '.classic-toolbar.categories [data-id="uc1"] .category-name')
  I.seeTextEquals('C85626-02', '.classic-toolbar.categories [data-id="uc2"] .category-name')
})

Scenario('[OXUIB-2200] It should not be allowed to name a mail category with whitespaces', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')

  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  I.fillField('[data-id="uc1"] input[type="text"]', '  ')
  I.click('[data-id="uc2"] input[type="text"]')
  I.waitForText('Please enter a valid name', 5, 'div[data-id="uc1"] div.help-block')
  I.seeAttributesOnElements('button[data-action="save"]', { disabled: true })
  I.click('Cancel')
  I.waitForDetached('.modal-dialog')
  I.seeTextEquals('Friends', '.classic-toolbar.categories [data-id="uc1"] .category-name')
})

Scenario('Models should be reset if modification is canceled', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')

  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  I.fillField('[data-id="uc1"] input[type="text"]', 'foobar')
  I.click('[data-id="uc2"] input[type="text"]')
  I.click('Cancel')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Friends', 5, '.classic-toolbar.categories [data-id="uc1"] .category-name')
})

Scenario('[C85626] Categories can be enabled or disabled', async ({ I, mail, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.say('Disable all categories except "General"', 'blue')
  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  // custom checkboxes so we use labels for toggling
  I.uncheckOption('Promotion')
  I.uncheckOption('Social')
  I.uncheckOption('Purchases')
  I.uncheckOption('.category-item[data-id="uc1"] .checkbox.custom input')
  I.uncheckOption('.category-item[data-id="uc2"] .checkbox.custom input')

  I.click('Save')
  I.waitForDetached('.modal-dialog')
  I.waitForNetworkTraffic()
  I.waitForInvisible('[data-id="promotion"]')

  I.say('Ensure all tabs except "General" are hidden', 'blue')
  I.waitForVisible('[data-id="general"]', 5)
  I.dontSeeElement('[data-id="promotion"]')
  I.dontSeeElement('[data-id="social"]')
  I.dontSeeElement('[data-id="purchases"]')
  I.dontSeeElement('[data-id="uc1"]')
  I.dontSeeElement('[data-id="uc2"]')

  I.say('Enable all categories except "General"', 'blue')
  I.click('~Settings')
  I.waitForVisible({ css: 'a[data-name="categories-config"]' }, 5)
  I.click({ css: 'a[data-name="categories-config"]' }, 'body > .dropdown')
  dialogs.waitForVisible()
  I.checkOption('Promotion')
  I.checkOption('Social')
  I.checkOption('Purchases')
  I.checkOption('.category-item[data-id="uc1"] .checkbox.custom input')
  I.checkOption('.category-item[data-id="uc2"] .checkbox.custom input')

  I.click('Save')
  I.waitForDetached('.modal-dialog')
  I.waitForNetworkTraffic()

  I.say('Check names of custom categories', 'blue')
  I.waitForVisible('.classic-toolbar.categories')
  I.waitForVisible('[data-id="promotion"]', 5)
  I.waitForVisible('[data-id="general"]', 5)
  I.waitForVisible('[data-id="promotion"]', 5)
  I.waitForVisible('[data-id="social"]', 5)
  I.waitForVisible('[data-id="purchases"]', 5)
  I.waitForVisible('[data-id="uc1"]', 5)
  I.waitForVisible('[data-id="uc2"]', 5)
})

Scenario('[C85626] Support different aspects of categories', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/mail//categories/enabled', true)

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')

  I.click('~Settings')
  I.waitForVisible('a[data-name="categories-config"]', 5)
  I.click('a[data-name="categories-config"]', 'body > .dropdown')
  dialogs.waitForVisible()
  I.say('First category is active', 'blue')
  I.seeCheckboxIsChecked('General')

  I.say('First category is readonly', 'blue')
  I.seeAttributesOnElements('#category-item-general.disabled', { disabled: true })

  I.say('Shows category description', 'blue')
  I.seeTextEquals('Promotion Description', '.description')

  I.click('Cancel')
  I.waitForDetached('.modal-dialog')
})
