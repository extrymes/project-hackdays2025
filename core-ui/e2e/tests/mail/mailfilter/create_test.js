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

Feature('Mailfilter')

Before(async ({ users }) => { await Promise.all([users.create(), users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7787] Add filter rule', async ({ I, users, mail, dialogs, settings, mailfilter, calendar }) => {
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  }, { user: users[1] })

  I.login('app=io.ox/calendar') // open calendar instead of mail, because 'Add condition' isn't unique otherwise
  I.waitForApp()

  await mailfilter.openRules()

  I.waitForVisible('.io-ox-mailfilter-settings .hint')
  I.see('There is no rule defined')

  // create a test rule and check the initial display
  I.click('Add new rule')
  dialogs.waitForVisible()
  I.see('Create new rule')
  I.see('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.')
  I.see('Please define at least one action.')

  // add action
  I.click('Add action')
  I.click('Redirect to')
  I.fillField('to', users[2].get('primaryEmail'))

  // warning gone?
  I.dontSee('Please define at least one action.')

  // action and all components visible?
  I.seeElement('.io-ox-mailfilter-edit [data-action-id="0"]')
  I.see('Redirect to')
  I.seeElement('.io-ox-mailfilter-edit [data-action-id="0"] button.remove')

  // add condition
  I.click('Add condition')
  I.click('Subject')
  I.fillField('.tests [name="values"]', 'Test subject')

  // alert gone?
  I.dontSee('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.')

  // condition and all components visible?
  I.see('Subject', '.list-title')
  I.see('Contains', '.dropdown-label')
  I.dontSeeElement('.io-ox-mailfilter-edit [data-test-id="0"] .row.has-error')
  I.seeElement('.modal button[data-action="save"]')
  I.seeElement('.modal [data-action-id="0"] button.remove')
  // save the form
  dialogs.clickButton('Save')

  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()

  // compose mail for user 0
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')

  mail.send()
  I.waitForElement('~Sent, 1 total.', 30)

  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })
  I.waitForApp()

  // check for mail
  I.waitForVisible('.io-ox-mail-window .leftside ul li.unread')
  I.click('.io-ox-mail-window .leftside ul li.unread')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Test subject', '.mail-detail-pane')
})

function createFilterRule (name, condition, comparison, value, flag, skipConditionProp) {
  const { I } = inject()

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForText('There is no rule defined')
  // create a test rule and check the initial display
  I.click('Add new rule')
  I.see('Create new rule')
  I.see('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.')
  I.see('Please define at least one action.')

  I.fillField('rulename', name)

  // add condition
  I.click('Add condition')
  I.clickDropdown(condition)

  if (!skipConditionProp) {
    I.fillField('values', value)
    I.click('Contains')
    I.waitForElement('.dropdown.open')
    I.see(comparison, '.dropdown.open')
    I.click(comparison, '.dropdown.open')
  }

  // add action
  I.click('Add action')
  I.click('Set color flag')
  I.click('.actions .dropdown-toggle')
  I.waitForVisible('.flag-dropdown')
  I.click(flag, '.flag-dropdown')
}

Scenario('[C7810] Filter mail using contains', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0395', 'Subject', 'Contains', 'TestCasexxx0395', 'Red', false)
  // save the form
  I.click('Save')
  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'xxxTestCase0395xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  // second mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCasexxx0395')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('~Sent, 2 total.', 30)
  I.waitForElement('~Inbox, 2 unread, 2 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCasexxx0395'), 30)
  I.waitForElement(locate('.list-item-row').withChild(':not(.flag_1)').withText('xxxTestCase0395xxx'))
})

Scenario('[C7811] Filter mail using is exactly', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0396', 'Subject', 'Is exactly', 'TestCase0396', 'Red', false)
  // save the form
  I.click('Save')
  I.waitForVisible('.io-ox-settings-main .settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0396')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  // second mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'xxxTestCase0396xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('~Sent, 2 total.', 30)
  I.waitForElement('~Inbox, 2 unread, 2 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCase0396'), 30)
  I.waitForElement(locate('.list-item-row').withChild(':not(.flag_1)').withText('xxxTestCase0396xxx'))
})

Scenario('[C7812] Filter mail using matches', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0397', 'Subject', 'Matches', '*Case0397*', 'Red', false)
  // save the form
  I.click('Save')
  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'xxxTestCase0397xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  // second mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'xxx0397xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('~Sent, 2 total.', 30)
  I.waitForElement('~Inbox, 2 unread, 2 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('xxxTestCase0397xxx'), 30)
  I.waitForElement(locate('.list-item-row').withChild(':not(.flag_1)').withText('xxx0397xxx'))
})

Scenario('[C7813] Filter mail using regex', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0398', 'Subject', 'Regex', 'TestCase0398.*', 'Red', false)
  // save the form
  I.click('Save')
  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0398xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  // second mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'xxxTestCase398xxx')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('~Sent, 2 total.', 30)
  I.waitForElement('~Inbox, 2 unread, 2 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCase0398xxx'), 30)
  I.waitForElement(locate('.list-item-row').withChild(':not(.flag_1)').withText('xxxTestCase398xxx'))
})

Scenario('Filter mail by size Filter mail using IsBiggerThan', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0400', 'Size', 'Is bigger than', null, 'Red', true)

  I.fillField('sizeValue', '512')
  // save the form
  I.click('Save')

  await I.executeAsyncScript(async function (done) {
    const { settings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { default: filesApi } = await import(String(new URL('io.ox/files/api.js', location.href)))
    const blob = new window.Blob(['fnord'], { type: 'text/plain' })
    filesApi.upload({ folder: settings.get('folder/infostore'), file: blob, filename: 'Principia.txt', params: {} }
    ).done(done)
  })

  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0400')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  // Open Filepicker
  I.click('~Attachments')
  I.click('Add from Drive')

  I.waitForText('Principia.txt')
  I.click(locate('div.name').withText('Principia.txt').inside('.io-ox-fileselection'))
  // Add the file
  I.click('Add')

  // Wait for the filepicker to close
  I.waitForDetached('.io-ox-fileselection')

  mail.send()

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)

  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCase0400'), 30)
})

Scenario('Filter mail using validated size', async ({ I, mail, settings }) => {
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCaseSome', 'Size', null, null, 'Red', true)
  const disabledButton = locate('.modal-footer .btn-primary[disabled]').as('Disabled button')
  const enabledButton = locate('.modal-footer .btn-primary:not([disabled])').as('Enabled button')

  // valid
  I.say('Enter valid value for Byte')
  I.fillField('sizeValue', '3')
  I.waitForElement(enabledButton)

  // invalid
  I.say('Switch to GB that causes value to be invalid')
  I.click('Byte')
  I.waitForElement('.dropdown.open')
  I.see('GB', '.dropdown.open')
  I.click('GB', '.dropdown.open')
  I.waitForElement(disabledButton)

  // valid
  I.say('Enter valid value for GB')
  I.fillField('sizeValue', '1')
  I.waitForElement(enabledButton)

  // invalid, add action (triggers redraw)
  I.say('Enter invalid value for GB and trigger redraw')
  I.fillField('sizeValue', '3')
  I.click('Add action')
  I.click('Keep')
  I.waitForElement(disabledButton)
})

Scenario('[C7815] Filter mail using IsSmallerThan', async ({ I, users, mail, settings }) => {
  const [user] = users
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  createFilterRule('TestCase0401', 'Size', null, null, 'Red', true)

  I.click('Is bigger than')
  I.waitForElement('.dropdown.open')
  I.see('Is smaller than', '.dropdown.open')
  I.click('Is smaller than', '.dropdown.open')

  I.click('Byte')

  I.waitForElement('.dropdown.open')
  I.clickDropdown('kB')
  I.waitForDetached('.dropdown.open')

  I.fillField('sizeValue', '2048')
  // save the form
  I.click('Save')

  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')
  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0401')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForElement(locate('.list-item-row').withChild('.flag_1').withText('TestCase0401'), 30)
})

Scenario('[C83386] Create mail filter based on mail', async ({ I, users, mail, dialogs }) => {
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // compose mail for user 1
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[1].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')

  mail.send()
  I.waitForElement('~Sent, 1 total.', 30)

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()

  // check for mail
  I.waitForVisible('.io-ox-mail-window .leftside ul li.unread')
  I.click('.io-ox-mail-window .leftside ul li.unread')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Test subject', '.mail-detail-pane')
  I.waitForElement('~Trash')
  I.retry(5).click('~More actions', '.inline-toolbar')
  I.clickDropdown('Create filter rule')
  dialogs.waitForVisible()
  I.waitForText('Create new rule')

  // add action
  I.click('Add action')
  I.click('File into')

  I.click('Select folder')
  I.waitForElement('.folder-picker-dialog')

  I.waitForElement('[data-id="default0/Trash"]')
  I.click('[data-id="default0/Trash"]', '.folder-picker-dialog')
  I.waitForElement('[data-id="default0/Trash"].selected')
  I.click('Select')
  I.waitForDetached('.folder-picker-dialog')
  // save the form
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.logout()

  I.login('app=io.ox/mail')
  I.waitForApp()

  // compose mail for user 1
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[1].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')

  mail.send()
  I.waitForDetached('.io-ox-mail-compose-window')
  I.waitForElement('~Sent, 1 total.', 30)

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()

  // check for mail
  I.waitForElement('.list-view .list-item')
  I.click('.list-view .list-item')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Test subject', '.io-ox-mail-window .mail-detail-pane .subject')
  I.waitForElement('~Trash, 1 unread, 1 total.', 30)
})

Scenario('[C274412] Filter mail by size', async ({ I, users, mail, dialogs, settings, mailfilter }) => {
  const listItem = locate('.list-item-row').withChild('.flag_1').withText('C274412').as('Mail in list view')

  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('app=io.ox/mail&settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  mailfilter.newRule('C274412')
  mailfilter.addCondition('Size', '1', 'sizeValue')
  mailfilter.setFlag('Red')
  mailfilter.save()
  settings.close()

  I.waitForApp()

  // compose mail
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'C274412')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')

  mail.send()
  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('C274412', 5, '.subject')

  I.waitForElement(listItem, 30)
  I.click(listItem)

  I.waitForElement('.inline-toolbar-container [data-action="io.ox/mail/actions/delete"]')
  I.click('Delete', '.inline-toolbar-container')
  I.waitForElement('~Inbox')

  settings.open('Mail', 'Rules')
  I.waitForText('Edit', 5, '.io-ox-mailfilter-settings')
  I.click('~Edit C274412')
  dialogs.waitForVisible()

  I.waitForText('Byte', 5, '.tests')
  I.click('Byte')
  I.waitForElement('.dropdown.open')
  I.clickDropdown('kB')
  mailfilter.save()
  settings.close()

  I.waitForApp()

  // compose mail
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'C274412')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')

  mail.send()
  I.waitForElement('~Sent, 2 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('C274412', 5, '.subject')

  I.waitForElement(listItem, 30)
  I.click(listItem)

  I.waitForElement('.inline-toolbar-container [data-action="io.ox/mail/actions/delete"]')
  I.click('Delete', '.inline-toolbar-container')
  I.waitForElement('~Inbox')

  settings.open('Mail', 'Rules')
  I.waitForText('Edit', 5, '.io-ox-mailfilter-settings')
  I.click('~Edit C274412')
  dialogs.waitForVisible()

  I.waitForText('kB', 5, '.tests')
  I.click('kB')
  I.waitForElement('.dropdown.open')
  I.clickDropdown('MB')
  mailfilter.save()
  settings.close()

  I.waitForApp()

  // compose mail
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'C274412')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  I.attachFile('.io-ox-mail-compose-window .composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')

  mail.send()
  I.waitForElement('~Sent, 3 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('C274412', 5, '.subject')

  I.waitForElement(listItem, 30)
})
