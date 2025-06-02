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

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('Single user roundtrip with add and remove', ({ I, mail, dialogs, settings }) => {
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForElement('[data-action="edit-auto-forward"]')
  I.click('Auto forward ...', '[data-action="edit-auto-forward"]')

  // check for all expected elements
  dialogs.waitForVisible()
  I.seeElement('.modal-header input[name="active"]')

  // buttons
  I.see('Cancel', dialogs.footer)
  I.see('Apply changes', dialogs.footer)

  // form elements
  I.seeElement({ css: 'input[name="to"][disabled]' })
  I.seeElement({ css: 'input[name="copy"][disabled]' })
  I.seeElement({ css: 'input[name="processSub"][disabled]' })

  // enable
  I.click('.checkbox.switch.large', dialogs.header)
  I.seeElement({ css: 'input[name="to"]:not([disabled])' })
  I.seeElement({ css: 'input[name="copy"]:not([disabled])' })
  I.seeElement({ css: 'input[name="processSub"]:not([disabled])' })

  // button disabled?
  I.seeElement('.modal-footer [data-action="save"][disabled]')
  I.fillField({ css: 'input[name="to"]' }, 'test@oxtest.com')

  // button enabled?
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.see('Auto forward ...', '[data-action="edit-auto-forward"]')
  I.waitForElement('[data-action="edit-auto-forward"] > svg')
  I.waitForInvisible('[data-point="io.ox/mail/auto-forward/edit"]')
  settings.close()

  // check notification in mail
  I.waitForText('Auto forwarding is active', 5, '[data-action="edit-auto-forward-notice"]')
  I.click('Auto forwarding is active', '[data-action="edit-auto-forward-notice"]')
  dialogs.waitForVisible()

  I.seeInField({ css: 'input[name="to"]' }, 'test@oxtest.com')
  I.seeElement({ css: 'input[name="processSub"]:checked' })

  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
})

Scenario('[C7786] Multi user roundtrip', async ({ I, users, mail, dialogs, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForText('Auto forwarding is active', 5, '[data-action="edit-auto-forward-notice"]')
  settings.open('Mail', 'Rules')
  I.waitForText('Auto forward ...')
  I.click('Auto forward ...', '[data-action="edit-auto-forward"]')
  dialogs.waitForVisible()

  // check for all expected elements
  I.seeElement('.modal-header input[name="active"]')

  // buttons
  I.see('Cancel', dialogs.footer)
  I.see('Apply changes', dialogs.footer)

  // form elements
  I.seeElement({ css: 'input[name="to"][disabled]' })
  I.seeElement({ css: 'input[name="copy"][disabled]' })
  I.seeElement({ css: 'input[name="processSub"][disabled]' })

  // enable
  I.click('.checkbox.switch.large', dialogs.header)
  I.seeElement({ css: 'input[name="to"]:not([disabled])' })
  I.seeElement({ css: 'input[name="copy"]:not([disabled])' })
  I.seeElement({ css: 'input[name="processSub"]:not([disabled])' })

  // button disabled?
  I.seeElement('.modal-footer [data-action="save"][disabled]')
  I.fillField({ css: 'input[name="to"]' }, users[1].get('primaryEmail'))

  // button enabled?
  dialogs.clickButton('Apply changes')

  I.see('Auto forward ...', '[data-action="edit-auto-forward"]')
  I.waitForElement('[data-action="edit-auto-forward"] > svg')
  I.waitForInvisible('[data-point="io.ox/mail/auto-forward/edit"]')

  settings.close()

  // compose mail for user 0
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')

  mail.send()
  I.waitForDetached('.io-ox-mail-compose')

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()

  // check for mail
  I.waitForVisible('.io-ox-mail-window .leftside ul li.unread')
  I.click('.io-ox-mail-window .leftside ul li.unread')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Test subject', '.mail-detail-pane')
})

Scenario('[OXUIB-1783] Reset', async ({ I, users, dialogs, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForText('Auto forwarding is active', 5, '[data-action="edit-auto-forward-notice"]')
  settings.open('Mail', 'Rules')
  I.waitForVisible('[data-action="edit-auto-forward"]')
  I.click('Auto forward ...', '[data-action="edit-auto-forward"]')
  dialogs.waitForVisible()

  // check for all expected elements
  I.waitForElement('.modal-header input[name="active"]')

  // buttons
  I.waitForText('Cancel', 5, dialogs.footer)
  I.waitForText('Apply changes', 5, dialogs.footer)

  // form elements
  I.seeElement({ css: 'input[name="to"][disabled]' })
  I.seeElement({ css: 'input[name="copy"][disabled]' })
  I.seeElement({ css: 'input[name="processSub"][disabled]' })

  // enable
  I.click('.checkbox.switch.large', dialogs.header)
  I.waitForElement({ css: 'input[name="to"]:not([disabled])' })
  I.waitForElement({ css: 'input[name="copy"]:not([disabled])' })
  I.waitForElement({ css: 'input[name="processSub"]:not([disabled])' })

  // button disabled?
  I.waitForElement('.modal-footer [data-action="save"][disabled]')
  I.fillField({ css: 'input[name="to"]' }, users[1].get('primaryEmail'))

  // button enabled?
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal.rule-dialog')
  I.waitForText('Auto forward ...', 5, '[data-action="edit-auto-forward"]')
  I.waitForElement('[data-action="edit-auto-forward"] > svg')
  I.waitForInvisible('[data-point="io.ox/mail/auto-forward/edit"]')
  I.click('Auto forward ...', '[data-action="edit-auto-forward"]')
  dialogs.waitForVisible()

  // check for reset button
  I.waitForText('Reset', 5, dialogs.footer)
  dialogs.clickButton('Reset')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal.rule-dialog')

  I.waitForText('Auto forward ...', 5, '[data-action="edit-auto-forward"]')
  I.waitForApp()

  I.click('Auto forward ...', '[data-action="edit-auto-forward"]')
  dialogs.waitForVisible()
  // check for all expected elements
  I.waitForElement('.modal-header input[name="active"]')

  // buttons
  I.waitForText('Cancel', 5, dialogs.footer)
  I.waitForText('Apply changes', 5, dialogs.footer)

  // form elements
  I.seeElement({ css: 'input[name="to"][disabled]' })
  I.seeElement({ css: 'input[name="copy"][disabled]' })
  I.seeElement({ css: 'input[name="processSub"][disabled]' })
})

Scenario('Rule is correctly listed after a status update', async ({ I, dialogs, mail, settings }) => {
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

  I.waitForElement('[data-action="edit-auto-forward"] > svg')
  I.click('Auto forward ...', '.io-ox-settings-main')

  dialogs.waitForVisible()
  I.click('.checkbox.switch.large', dialogs.header)
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForElement('.io-ox-mailfilter-settings .settings-list-item.disabled')
})
