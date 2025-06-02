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

Feature('Mailfilter > Autoforward')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Copy statement is handled correctly @smoketest', async ({ I, dialogs }) => {
  await I.haveMailFilterRule({
    rulename: 'autoforward',
    actioncmds: [
      { id: 'redirect', to: 'test@tester.com', copy: true }
    ],
    active: true,
    flags: ['autoforward'],
    test: { id: 'true' }
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
  I.click('Auto forward ...')

  dialogs.waitForVisible()
  I.waitForVisible('.rule-dialog')
  I.waitForText('Forward all incoming emails to this address')
  I.seeCheckboxIsChecked('Keep a copy of the message')

  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
})

Scenario('Keep statement is handled correctly', async ({ I, dialogs }) => {
  await I.haveMailFilterRule({
    rulename: 'autoforward',
    actioncmds: [
      { id: 'redirect', to: 'test@tester.com' },
      { id: 'keep' }
    ],
    active: true,
    flags: ['autoforward'],
    test: { id: 'true' }
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
  I.click('Auto forward ...')

  dialogs.waitForVisible()
  I.seeCheckboxIsChecked('Keep a copy of the message')

  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
})

Scenario('Keep statement is written correctly', ({ I, users, dialogs }) => {
  const [user] = users

  user.hasConfig('com.openexchange.mail.filter.blacklist.actions', 'copy')

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForElement('[data-action="edit-auto-forward"]')
  I.click('Auto forward ...')

  dialogs.waitForVisible()
  I.click('.checkbox.switch.large', dialogs.header)
  I.fillField('Forward all incoming emails to this address', 'test@tester.com')
  I.checkOption('Keep a copy of the message')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
  I.click('Auto forward ...')
  dialogs.waitForVisible()
  I.seeCheckboxIsChecked('Keep a copy of the message')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
})

Scenario('Copy statement is written correctly', ({ I, dialogs }) => {
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForElement('[data-action="edit-auto-forward"]')
  I.click('Auto forward ...')

  dialogs.waitForVisible()
  I.click('.checkbox.switch.large', dialogs.header)
  I.fillField('Forward all incoming emails to this address', 'test@tester.com')
  I.checkOption('Keep a copy of the message')

  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
  I.click('Auto forward ...')
  dialogs.waitForVisible()
  I.seeCheckboxIsChecked('Keep a copy of the message')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForVisible('[data-action="edit-auto-forward"] > svg')
})
