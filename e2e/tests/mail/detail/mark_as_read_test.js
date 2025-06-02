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

Feature('Mail > Detail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUI-1172] Mark as read with different configurations', async ({ I, users, mail, settings }) => {
  const email = users[0].get('email1')
  await Promise.all([
    I.haveMails([
      {
        attachments: [{ content: 'Lorem ipsum', content_type: 'text/plain', disp: 'inline' }],
        from: [['Icke', email]],
        subject: 'Email #1',
        to: [['Icke', email]]
      },
      {
        attachments: [{ content: 'Lorem ipsum', content_type: 'text/plain', disp: 'inline' }],
        from: [['Icke', email]],
        subject: 'Email #2',
        to: [['Icke', email]]
      },
      {
        attachments: [{ content: 'Lorem ipsum', content_type: 'text/plain', disp: 'inline' }],
        from: [['Icke', email]],
        subject: 'Email #3',
        to: [['Icke', email]]
      }
    ]),
    I.haveSetting({ 'io.ox/mail': { markAsRead: 'never' } })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Email #1')
  // still unread in the list and detail view
  I.see('Email #1', '.list-view .list-item.selected.unread')
  I.seeElement('.mail-detail.unread')
  // yep, we simply need to wait in this case
  // to detect that the email is NOT marked as seen
  I.wait(1)
  // and check again
  I.see('Email #1', '.list-view .list-item.selected.unread')
  I.waitForText('Email #1', undefined, '.mail-detail .subject')
  I.seeElement('.mail-detail.unread')
  settings.open('Mail')
  I.scrollTo(locate('h3').withText('Mark as read').as('Mark as read'))
  I.click('Immediately')
  settings.close()

  mail.selectMail('Email #2')
  I.see('Email #2', '.list-view .list-item.selected')
  I.waitForDetached('.list-view .list-item.selected.unread')
  I.waitForText('Email #2', undefined, '.mail-detail .subject')
  I.dontSeeElement('.mail-detail.unread')

  settings.open('Mail')
  I.scrollTo(locate('h3').withText('Mark as read').as('Mark as read'))
  I.click('After 5 seconds')
  settings.close()

  mail.selectMail('Email #3')
  // still unread in the list and detail view
  I.see('Email #3', '.list-view .list-item.selected.unread')
  I.waitForText('Email #3', undefined, '.mail-detail .subject')
  I.seeElement('.mail-detail.unread')
  // now wait for more than 5 seconds
  I.wait(7)
  // and check again
  I.dontSee('.list-view .list-item.selected.unread')
  I.dontSeeElement('.mail-detail.unread')

  // final check
  I.seeNumberOfVisibleElements('.list-view .list-item.selectable', 3)
  I.seeNumberOfVisibleElements('.list-view .list-item.selectable.unread', 1)
  I.seeNumberOfVisibleElements('.list-view .list-item.selected.unread', 0)
})
