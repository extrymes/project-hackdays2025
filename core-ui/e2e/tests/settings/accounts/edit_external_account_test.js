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

Scenario('[C7839] Edit external mail account', async ({ I, users, mail, settings, dialogs }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  const additionalAccount = await users.create()
  const response = await I.haveMailAccount({ additionalAccount, name: 'External', extension: 'ext' })
  const primaryAddress = response.data.primary_address

  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForVisible('~Edit External')
  I.click('~Edit External')
  dialogs.waitForVisible()
  I.fillField('Account name', primaryAddress)
  I.fillField('Email address', primaryAddress)
  I.dontSeeElement('input[name="name"][disabled]')
  I.dontSeeElement('input[name="personal"][disabled]')
  I.dontSeeElement('input[name="primary_address"][disabled]')
  I.seeElement('select[name="mail_protocol"][disabled]')
  I.dontSeeElement('input[name="mail_server"][disabled]')
  I.dontSeeElement('select[name="mail_secure"][disabled]')
  I.dontSeeElement('input[name="mail_port"][disabled]')
  I.dontSeeElement('input[name="login"][disabled]')
  I.dontSeeElement('input[id="password"][disabled]')
  I.dontSeeElement('input[name="transport_server"][disabled]')
  I.dontSeeElement('select[name="transport_secure"][disabled]')
  I.dontSeeElement('input[name="transport_port"][disabled]')
  I.dontSeeElement('select[name="transport_auth"][disabled]')
  I.seeElement('input[name="transport_login"][disabled]')
  I.seeElement('input[id="transport_password"][disabled]')
})
