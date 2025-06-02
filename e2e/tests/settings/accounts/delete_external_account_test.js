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

Feature('Custom mail account')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7840] Delete external mail account', async ({ I, users, mail, settings, dialogs }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  const additionalAccount = await users.create()
  await I.haveMailAccount({ additionalAccount, name: 'MyExternalAccount', extension: 'ext' })

  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForText('MyExternalAccount', 10, '.io-ox-mail-window .folder-tree')

  // this is important to trigger OXUIB-2404
  I.click('Accounts')

  I.waitForVisible('.io-ox-accounts-settings')
  I.waitForNetworkTraffic()

  I.waitNumberOfVisibleElements('.settings-list-item', 2)
  I.waitForVisible('~Delete MyExternalAccount')
  I.waitForVisible('.io-ox-accounts-settings .remove .bi-x-lg')
  I.waitForEnabled('~Delete MyExternalAccount')
  I.waitForClickable('~Delete MyExternalAccount')
  I.click('~Delete MyExternalAccount')

  dialogs.waitForVisible()
  dialogs.clickButton('Delete account')
  I.waitForInvisible('~Delete account')

  I.click('Accounts')
  I.waitForVisible('.io-ox-accounts-settings')
  I.dontSee('MyExternalAccount', '.io-ox-accounts-settings')

  settings.close()
  I.waitForInvisible(locate('.folder-tree li').withText('MyExternalAccount'))
})
