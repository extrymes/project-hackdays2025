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

Feature('Primary mail account')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7838] Edit primary mail account', async ({ I, mail, settings, dialogs }) => {
  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForVisible('~Edit E-Mail')
  I.click('~Edit E-Mail')
  dialogs.waitForVisible()

  // check: account name
  I.fillField('Account name', 'OX-Mail')
  I.fillField('Your name', 'Buckaroo Banzai')

  // check: disabled fields
  I.seeAttributesOnElements(locate({ css: 'input[name="primary_address"]' }).as('input[name="primary_address"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'select[name="mail_protocol"]' }).as('select[name="mail_protocol"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="mail_server"]' }).as('input[name="mail_server"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="mail_port"]' }).as('input[name="mail_port"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="login"]' }).as('input[name="login"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[id="password"]' }).as('input[name="password"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_server"]' }).as('input[name="transport_server"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_port"]' }).as('input[name="transport_port"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'select[name="transport_auth"]' }).as('input[name="transport_auth"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_login"]' }).as('input[name="transport_login"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[id="transport_password"]' }).as('input[name="transport_password"]'), { disabled: true })

  // check: hidden fields
  I.dontSeeElement(locate({ css: 'select[name="mail_secure"]' }).as('select[name="mail_secure"]'))
  I.dontSeeElement(locate({ css: 'select[name="transport_secure"]' }).as('select[name="transport_secure"]'))

  // check: reply-to validation fails
  I.fillField('Reply To', 'John Bigboote')
  dialogs.clickButton('Save')
  I.waitForText('This is not a valid email address. If you want to specify multiple addresses, please use a comma to separate them.')

  // check: disabled fields after busy/idle again
  I.seeAttributesOnElements(locate({ css: 'input[name="primary_address"]' }).as('input[name="primary_address"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'select[name="mail_protocol"]' }).as('select[name="mail_protocol"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="mail_server"]' }).as('input[name="mail_server"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="mail_port"]' }).as('input[name="mail_port"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="login"]' }).as('input[name="login"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[id="password"]' }).as('input[name="password"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_server"]' }).as('input[name="transport_server"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_port"]' }).as('input[name="transport_port"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'select[name="transport_auth"]' }).as('input[name="transport_auth"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[name="transport_login"]' }).as('input[name="transport_login"]'), { disabled: true })
  I.seeAttributesOnElements(locate({ css: 'input[id="transport_password"]' }).as('input[name="transport_password"]'), { disabled: true })

  // check: hidden fields after busy/idle again
  I.dontSeeElement(locate({ css: 'select[name="mail_secure"]' }).as('select[name="mail_secure"]'))
  I.dontSeeElement(locate({ css: 'select[name="transport_secure"]' }).as('select[name="transport_secure"]'))

  // check: reply-to validation succeeds
  I.fillField('Reply To', 'penny@prid.dy,john@bigboo.te')
  dialogs.clickButton('Save')
  I.waitForText('Account updated')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForText('OX-Mail')
  settings.close()

  // check: compose
  mail.newMail()
  I.see('Buckaroo Banzai')
  I.see('Reply To')
  I.see('penny')
  I.see('john')
})

Scenario('Cannot edit account name if setting editRealName is disabled', async ({ I, dialogs, mail, settings }) => {
  await I.haveSetting('io.ox/mail//editRealName', false)
  I.login('app=io.ox/mail&settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForVisible('~Edit E-Mail')
  I.click('~Edit E-Mail')
  dialogs.waitForVisible()
  I.waitForElement('input#personal[disabled]')

  dialogs.clickButton('Cancel')
  settings.close()

  mail.newMail()
  I.click('~From')
  I.waitForText('Show names')
  I.dontSee('Edit names')
})
