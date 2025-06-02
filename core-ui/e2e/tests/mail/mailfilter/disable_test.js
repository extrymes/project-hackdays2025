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

Scenario('[C7788] Disabled filter rule', async ({ I, users, mail, mailfilter, settings }) => {
  await I.haveSetting({
    'io.ox/mail': { messageFormat: 'text' }
  }, { user: users[1] })

  await I.haveMailFilterRule({
    rulename: 'Redirect mails with subject Test subject to ' + users[2].get('primaryEmail'),
    active: true,
    flags: [],
    test: {
      id: 'subject',
      headers: 'Subject',
      comparison: 'contains',
      values: ['Test subject']
    },
    actioncmds: [{
      id: 'redirect',
      to: users[2].get('primaryEmail')
    }]
  })

  I.login('app=io.ox/mail&section=io.ox/mail/settings/rules&settings=virtual/settings/io.ox/mail')
  I.waitForApp()

  I.waitForText('Disable', 10, '.io-ox-mailfilter-settings')
  I.click('Disable', '.io-ox-mailfilter-settings')
  I.dontSeeElement(locate('.btn').withText('Disable').inside('.settings-list-view').as('Disable button'))
  I.see('Enable', '.settings-list-view')
  settings.close()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })

  // compose mail for user 0
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')

  I.click('Send')
  I.waitForElement('~Sent, 1 total.', 30)
  I.logout()

  I.login('app=io.ox/mail', { user: users[2] })

  // check for mail
  I.waitForElement('~Inbox')
})
