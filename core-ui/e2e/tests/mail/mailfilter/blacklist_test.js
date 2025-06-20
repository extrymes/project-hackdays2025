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

Feature('Mailfilter > Blocklist')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C163019] Blocklisted mail filter actions', async ({ I, users, dialogs, settings }) => {
  const [user] = users
  await I.haveMailFilterRule({
    rulename: 'TestCaseC163019',
    actioncmds: [
      { id: 'addflags', flags: ['$foo'] },
      { id: 'removeflags', flags: ['$bar'] }
    ],
    active: true,
    flags: [],
    test: { id: 'true' }
  })
  await user.hasConfig('com.openexchange.mail.filter.blacklist.actions', 'addflags,removeflags')
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('TestCaseC163019')
  I.see('TestCaseC163019')
  I.see('This rule contains unsupported properties')
  I.click('Add new rule')
  dialogs.waitForVisible()
  I.click('Add action')
  I.waitForText('File into')
  I.dontSee('Add IMAP keyword')
  I.dontSee('Remove IMAP keyword')
  I.pressKey('Escape')
  I.click('Cancel')
  I.click('~Delete TestCaseC163019')
  I.waitForText('Do you really want to delete this filter rule?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.see('There is no rule defined')
})

Scenario('[C163020] Blocklist mail filter tests', async ({ I, users, dialogs, settings }) => {
  const [user] = users
  await I.haveMailFilterRule({
    rulename: 'TestCaseC163020',
    actioncmds: [{ id: 'keep' }],
    active: true,
    flags: [],
    test: { id: 'envelope', comparison: 'is', addresspart: 'all', headers: ['to'], values: ['ribery'] }
  })
  await user.hasConfig('com.openexchange.mail.filter.blacklist.tests', 'envelope')
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('TestCaseC163020')
  I.see('TestCaseC163020')
  I.see('This rule contains unsupported properties')
  I.click('Add new rule')
  dialogs.waitForVisible()
  I.click('Add condition')
  I.waitForText('From')
  I.dontSee('Envelope')
  I.pressKey('Escape')
  I.click('Cancel')
  I.click('~Delete TestCaseC163020')
  I.waitForText('Do you really want to delete this filter rule?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.see('There is no rule defined')
})

Scenario('[C163021] Blocklist mail filter comparisons', async ({ I, users, dialogs, settings }) => {
  const [user] = users
  await I.haveMailFilterRule({
    rulename: 'TestCaseC163021',
    actioncmds: [{ id: 'move', into: 'default0/INBOX/Spam' }],
    active: true,
    flags: [],
    test: { comparison: 'regex', headers: ['Subject'], id: 'subject', values: ['^(Spam|Virus|Bl[ao]cklisted)$'] }
  })
  await user.hasConfig('com.openexchange.mail.filter.blacklist.comparisons', 'regex,not regex')
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('TestCaseC163021')
  I.see('TestCaseC163021')
  I.click('Edit')
  dialogs.waitForVisible()
  I.seeAttributesOnElements('.tests input[name="values"]', { disabled: true })
  I.click('regex')
  I.waitForText('Contains')
  I.dontSee('Regex', '.dropdown-menu')
  I.dontSee('Not Regex', '.dropdown-menu')
  I.pressKey('Escape')
  I.click('Cancel')
  I.click('~Delete TestCaseC163021')
  I.waitForText('Do you really want to delete this filter rule?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.see('There is no rule defined')
})

Scenario('[C163022] Blocklist mail filter comparison only for a specific test', async ({ I, users, dialogs, settings }) => {
  const [user] = users
  await I.haveMailFilterRule({
    rulename: 'TestCaseC163022',
    actioncmds: [{ id: 'keep' }],
    active: true,
    flags: [],
    test: { id: 'date', comparison: 'ge', zone: 'original', header: 'Date', datepart: 'date', datevalue: [1587340800000] }
  })
  await user.hasConfig('com.openexchange.mail.filter.blacklist.tests.date.comparisons', 'ge')
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('TestCaseC163022')
  I.see('TestCaseC163022')
  I.click('Edit')
  dialogs.waitForVisible()
  I.seeAttributesOnElements('.dateinput input.datepicker-day-field', { disabled: true })
  I.click('ge')
  I.waitForText('Lower equals')
  I.dontSee('Greater equals', '.dropdown-menu')
  I.pressKey('Escape')
  I.click('Cancel')
  I.click('~Delete TestCaseC163022')
  I.waitForText('Do you really want to delete this filter rule?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.see('There is no rule defined')
})

Scenario('Apply buttons are disabled for blocked apply actions', async ({ I, dialogs, settings }) => {
  // the redirect action is blocked by default, array in confir request looks like this: blockedApplyActions: ["redirect"]
  // so there is no further preparation needed
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('Add new rule')
  I.click('Add new rule')

  dialogs.waitForVisible()
  I.see('Save and apply rule now', 'button:disabled')
  // add color flag rule
  I.click('Add action')
  I.waitForText('Set color flag')
  I.click('Set color flag')
  I.see('Save and apply rule now', 'button:not(:disabled)')
  // add redirect rule
  I.click('Add action')
  I.waitForText('Redirect to')
  I.click('Redirect to')
  I.fillField('Redirect to', 'abc@abc.abc')
  I.see('Save and apply rule now', 'button:disabled')

  // remove redirect rule
  I.click('~Remove', '.row[data-action-id="1"]')
  I.see('Save and apply rule now', 'button:not(:disabled)')
  // add redirect rule
  I.click('Add action')
  I.waitForText('Redirect to')
  I.click('Redirect to')
  I.fillField('Redirect to', 'abc@abc.abc')
  I.see('Save and apply rule now', 'button:disabled')
  // remove color flag rule
  I.click('~Remove', '.row[data-action-id="0"]')
  I.see('Save and apply rule now', 'button:disabled')
  dialogs.clickButton('Save')

  I.waitForText('Apply', 5, '.action.disabled')
})
