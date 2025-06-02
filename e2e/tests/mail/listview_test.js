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

Feature('Mail > Listview')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C114381] Sender address is shown in tooltip', async ({ I, users, mail }) => {
  await I.haveMail({
    from: users[0],
    to: users[1],
    sendtype: 0,
    subject: 'C114381: sent',
    attachments: [{
      content: '<p style="background-color:#ccc">[C114381] Sender address is shown in draft tooltip</p>',
      content_type: 'text/html',
      disp: 'inline'
    }]
  })
  await I.haveMail({
    from: users[0],
    to: users[1],
    sendtype: 0,
    subject: 'C114381: draft',
    flags: 4,
    attachments: [{
      content: '<p style="background-color:#ccc">[C114381] Sender address is shown in draft tooltip</p>',
      content_type: 'text/html',
      disp: 'inline'
    }]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.selectFolder('Sent')
  I.waitForVisible('.leftside .list-view .list-item .from')
  I.waitForText('C114381: sent', 5, '.list-view .list-item')
  expect(await I.grabAttributeFrom('.leftside .list-view .list-item .from', 'title')).to.be.equal(users[1].get('primaryEmail'))
  I.selectFolder('Drafts')
  I.waitForText('C114381: draft', 5, '.leftside .list-view .list-item .subject')
  expect(await I.grabAttributeFrom('.leftside .list-view .list-item .from', 'title')).to.be.equal(users[1].get('primaryEmail'))
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.waitForText('C114381: sent')
  expect(await I.grabAttributeFrom('.leftside .list-view .list-item .from', 'title')).to.be.equal(users[0].get('primaryEmail'))
})

Scenario('Remove mail from thread', async ({ I, users, mail }) => {
  await I.haveSetting('io.ox/mail//viewOptions', {
    'default0/INBOX': {
      order: 'desc',
      thread: true
    }
  })
  const user = users[1]
  await I.haveMail({
    attachments: [{
      content: 'Hello world!',
      content_type: 'text/html',
      disp: 'inline'
    }],
    from: [[user.get('display_name'), user.get('primaryEmail')]],
    sendtype: 0,
    subject: 'Test subject',
    to: users[0]
  }, { user })
  await I.haveMail({
    attachments: [{
      content: 'Hello world!',
      content_type: 'text/html',
      disp: 'inline'
    }],
    from: [[user.get('display_name'), user.get('primaryEmail')]],
    sendtype: 0,
    subject: 'You should see this!',
    to: users[0]
  }, { user })

  I.login('', { user })
  I.waitForApp()

  I.waitForText('Sent')
  I.selectFolder('Sent')
  I.waitForText('Test subject')
  mail.selectMail('Test subject')

  I.waitForElement('~Reply')
  I.click('~Reply')

  I.waitForVisible('.active .io-ox-mail-compose', 30)
  I.waitForInvisible('.window-blocker.io-ox-busy', 15)

  mail.send()

  I.logout()

  I.login()

  I.waitForText('Test subject', 5, '.subject')
  mail.selectMail('Test subject')
  // wait for 2 mails rendered in thread list
  I.waitForFunction(() => document.querySelectorAll('.mail-detail').length === 2)

  I.dontSeeElement('[data-action="io.ox/mail/actions/reply"].disabled')
  I.waitForElement('.mail-detail.expanded [data-toolbar]')
  I.click('Delete', '.mail-detail.expanded [data-toolbar]')

  // wait for refresh here, because the middleware needs to send new data
  // should really happen within 1s
  I.waitForNetworkTraffic()
  // give listview a moment to update
  I.wait(0.5)

  // this should even be in the '.list-view .selected' context, but it needs more logic for threads
  I.waitForText('Test subject', 5, '.list-view')

  I.waitNumberOfVisibleElements('.list-view .selectable', 2)
  I.click('~Delete')
  I.seeNumberOfVisibleElements('.list-view .selectable', 1)
})
