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

const expect = require('chai').expect

Feature('Mailfilter')

Before(async function ({ users }) {
  const user = await users.create()
  await user.hasConfig('com.openexchange.imap.attachmentMarker.enabled', true)
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Set IMAP tags rule: no tags', async ({ I, users, settings, mailfilter, mail }) => {
  const subject = 'TestCase0393'
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForText('Add new rule')
  mailfilter.newRule(subject)
  mailfilter.addSubjectCondition(subject)
  // flag of first rule should be overwritten
  mailfilter.addAction('Add IMAP keyword', 'a1')
  mailfilter.addAction('Set IMAP keywords', '')
  mailfilter.save()
  settings.close()

  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', subject)
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  mail.send()

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)

  mail.selectMail(subject)
  const cid = await I.grabAttributeFrom('.list-view li.list-item.selected', 'data-cid')
  const value = await I.executeScript(async function (cid) {
    const { default: api } = await import(String(new URL('io.ox/mail/api.js', location.href)))
    return api.pool.get('detail').get(cid).get('user')
  }, cid)
  expect(value).to.eql([])
})

Scenario('Set IMAP tags: two tags', async ({ I, users, settings, mailfilter, mail }) => {
  const subject = 'TestCase0399'
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()

  I.waitForText('Add new rule')
  I.say('Create rule')
  mailfilter.newRule(subject)
  mailfilter.addSubjectCondition(subject)
  // flag of first rule should be overwritten
  mailfilter.addAction('Add IMAP keyword', 'a1')
  mailfilter.addAction('Set IMAP keywords', '   a2    a3   ')
  mailfilter.addAction('Add IMAP keyword', 'a4')
  mailfilter.save()

  settings.close()

  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', subject)
  I.fillField({ css: 'textarea.plain-text' }, 'This is a test')
  I.seeInField({ css: 'textarea.plain-text' }, 'This is a test')
  mail.send()

  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)

  mail.selectMail(subject)
  const cid = await I.grabAttributeFrom('.list-view li.list-item.selected', 'data-cid')
  const value = await I.executeScript(async function (cid) {
    const { default: api } = await import(String(new URL('io.ox/mail/api.js', location.href)))
    return api.pool.get('detail').get(cid).get('user')
  }, cid)
  expect(value).to.eql(['$a2', '$a3', '$a4'])
})
