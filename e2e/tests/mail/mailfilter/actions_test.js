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

Before(async function ({ users }) {
  await Promise.all([
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7801] Keep filtered mail', async ({ I, users, mail, mailfilter, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('C7801')
  mailfilter.addSubjectCondition('C7801')
  mailfilter.addSimpleAction('Keep')
  mailfilter.save()

  await settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'C7801')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()
  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('C7801', 5, '.subject')
})

Scenario('[C7802] Discard filtered mail', async ({ I, users, mailfilter, mail, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0387')
  mailfilter.addSubjectCondition('TestCase0387')
  mailfilter.addSimpleAction('Discard')
  mailfilter.save()

  await settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0387')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  I.click('Send')
  I.waitForElement('~Sent, 1 total.', 30)
  I.wait(1)
  I.seeElement('~Inbox')
})

Scenario('[C7803] Redirect filtered mail', async ({ I, users, mailfilter, mail, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0388')
  mailfilter.addSubjectCondition('TestCase0388')
  mailfilter.addAction('Redirect to', users[1].get('primaryEmail'))
  mailfilter.save()

  await settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0388')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  I.click('Send')

  I.waitForElement('~Sent, 1 total.', 30)
  I.wait(1)
  I.seeElement('~Inbox')
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('TestCase0388', 5, '.subject')
})

Scenario('[C7804] Move to Folder filtered mail', async ({ I, users, mailfilter, mail, dialogs, settings }) => {
  const folder = 'TestCase0389'

  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })
  await I.haveFolder({ title: folder, module: 'mail', parent: 'default0/INBOX' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0389')
  mailfilter.addSubjectCondition('TestCase0389')
  mailfilter.addSimpleAction('File into')
  I.click('Select folder')

  dialogs.waitForVisible()
  I.waitForVisible(`.folder-picker-dialog [data-id="default0/INBOX/${folder}"]`, 5)
  I.click(`.folder-picker-dialog [data-id="default0/INBOX/${folder}"]`)
  I.waitForVisible(`.folder-picker-dialog [data-id="default0/INBOX/${folder}"].selected`, 5)
  dialogs.clickButton('Select')
  I.waitForDetached('.folder-picker-dialog')
  I.waitForText('File into', 5, '.actions .filter-settings-view')
  I.seeInField('.actions .filter-settings-view [name="into"]', `INBOX/${folder}`)

  mailfilter.save()

  settings.close()

  // compose mail
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0389')
  I.seeInField('.io-ox-mail-compose [name="subject"]', 'TestCase0389')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  mail.send()

  I.waitForVisible('~Sent, 1 total.', 30)
  I.waitForVisible('~Inbox', 30)
  I.click('.io-ox-mail-window .window-sidepanel [data-id="default0/INBOX"] .folder-arrow')
  I.waitForVisible(`.io-ox-mail-window .window-sidepanel [data-id="default0/INBOX/${folder}"]`, 5)
  I.click(`.io-ox-mail-window .window-sidepanel [data-id="default0/INBOX/${folder}"]`)
  I.waitForVisible(`.io-ox-mail-window .window-sidepanel [data-id="default0/INBOX/${folder}"].selected`, 5)
  I.waitForVisible('~TestCase0389, 1 unread.', 30)
  I.see('TestCase0389', '.subject')
})

Scenario('[C7805] Reject with reason filtered mail', async ({ I, users, mail, mailfilter, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } }, { user: users[1] })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0390')
  mailfilter.addSubjectCondition('TestCase0390')
  mailfilter.addSimpleAction('Reject with reason')
  I.fillField('text', 'TestCase0390')
  mailfilter.save()

  settings.close()
  I.logout()

  I.login(['app=io.ox/mail'], { user: users[1] })
  I.waitForApp()
  mail.newMail()

  // compose mail
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0390')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  mail.send()

  I.waitForElement('[aria-label^="Sent, 1 total"]', 10)
  I.waitForElement('[aria-label^="Inbox, 1 unread, 1 total"]', 10)

  I.waitForText('Rejected: TestCase0390', 5, '.subject .drag-title')
  I.click('.list-item.selectable.unread')
  I.waitForText('was automatically rejected: TestCase0390', 5, '.text-preview')
})

Scenario('[C7806] Mark mail as filtered mail', async ({ I, users, mailfilter, mail, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0391')
  mailfilter.addSubjectCondition('TestCase0391')
  mailfilter.addSimpleAction('Mark mail as')
  mailfilter.save()

  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0391')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  I.click('Send')

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 total.', 30)
})

Scenario('[C7807] Tag mail with filtered mail', async ({ I, users, mailfilter, mail, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } })

  // createFilterRule(I, 'TestCase0392', 'Set color flag');

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0392')
  mailfilter.addSubjectCondition('TestCase0392')
  mailfilter.setFlag('Red')
  mailfilter.save()

  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0392')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  I.click('Send')

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForElement('.vsplit .flag_1', 30)
})

Scenario('[C7809] Mark mail as deleted filtered mail', async ({ I, users, mailfilter, mail, settings }) => {
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  mailfilter.openRules()
  mailfilter.newRule('TestCase0394')
  mailfilter.addSubjectCondition('TestCase0394')
  mailfilter.addSimpleAction('Mark mail as')

  I.click('seen')
  I.waitForElement('.dropdown.open')
  I.click('deleted')

  mailfilter.save()

  settings.close()

  // compose mail
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0394')
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')

  I.click('Send')

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForText('TestCase0394', 5, '.unread.deleted .subject')
})
