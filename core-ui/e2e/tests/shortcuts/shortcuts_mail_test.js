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

Feature('Shortcuts > Mail')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Open compose mail dialog', async ({ I, users, settings }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login('app=io.ox/mail')
  I.waitForApp()

  settings.open('General', 'Keyboard shortcuts')
  I.waitForText('Outlook.com')
  I.checkOption('Outlook.com')
  settings.close()

  I.pressKey('n')
  I.waitForClickable('[data-action="close"]')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  settings.open('General', 'Keyboard shortcuts')
  I.waitForText('Gmail')
  I.checkOption('Gmail')
  settings.close()

  I.pressKey('c')
  I.waitForVisible('.io-ox-mail-compose-window')
})

Scenario('Shortcut to archive mail', async ({ I, mail, users }) => {
  const subjects = ['Click Archive me', 'Key Archive me']
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })

  await Promise.all([
    I.haveMail({
      from: users[0],
      subject: subjects[0],
      to: users[0]
    }),
    I.haveMail({
      from: users[0],
      subject: subjects[1],
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.see(subjects[0])
  mail.selectMail(subjects[0])
  I.clickToolbar('~Archive')
  I.dontSee(subjects[0])

  I.see(subjects[1])
  mail.selectMail(subjects[1])
  I.pressKey('a')
  I.waitForDetached(subjects[1])
  I.dontSee(subjects[1])
})

Scenario('Shortcut to reply to mail', async ({ I, mail, users }) => {
  const subject = 'Reply me'
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  const to = [
    [users[0].get('display_name'), users[0].get('email1')],
    [users[2].get('display_name'), users[2].get('email1')]
  ]
  await Promise.all([
    I.haveMail({
      from: users[1],
      subject,
      to
    }, { user: users[1] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.see(subject)
  mail.selectMail(subject)
  I.pressKey('r')
  I.waitForVisible('.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear

  I.see(users[1].get('display_name'), '.to')
  I.dontSee(users[0].get('display_name'), '.to')
  I.dontSee(users[2].get('display_name'), '.to')
  I.seeInField('subject', `Re: ${subject}`)
})

Scenario('Shortcut to reply all', async ({ I, mail, users }) => {
  const subject = 'Reply me'
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  const to = [
    [users[0].get('display_name'), users[0].get('email1')],
    [users[1].get('display_name'), users[1].get('email1')],
    [users[2].get('display_name'), users[2].get('email1')]
  ]
  await Promise.all([
    I.haveMail({
      from: users[1],
      subject,
      to
    }, { user: users[1] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.see(subject)
  mail.selectMail(subject)
  I.pressKey(['Shift', 'r'])
  I.waitForVisible('.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear

  I.see(users[1].get('display_name'), '.to')
  I.see(users[2].get('display_name'), '.to')
  I.seeInField('subject', `Re: ${subject}`)
})

Scenario('Shortcut to forward', async ({ I, mail, users }) => {
  const subject = 'Forward me'
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  const to = [
    [users[0].get('display_name'), users[0].get('email1')],
    [users[1].get('display_name'), users[1].get('email1')],
    [users[2].get('display_name'), users[2].get('email1')]
  ]
  await Promise.all([
    I.haveMail({
      from: users[1],
      subject,
      to
    }, { user: users[1] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.see(subject)
  mail.selectMail(subject)
  I.pressKey(['f'])
  I.waitForVisible('.io-ox-mail-compose-window')
  I.waitForInvisible('.io-ox-busy') // wait for loading icon to disappear

  I.seeInField('subject', `Fwd: ${subject}`)
})

Scenario.skip('Shortcut to set mail read/unread', async ({ I, mail, users }) => {
  const subject = 'Read me'
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })

  await Promise.all([
    I.haveMail({
      from: users[0],
      subject,
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.see(subject, '.unread')
  mail.selectMail(subject)
  I.waitForDetached('.unread')
  I.waitForElement('~Mark as unread')
  I.dontSee('.seen-unseen-indicator')

  I.pressKey('u')

  I.waitForElement('~Mark as read')
  // FIXME
  I.see(subject, '.unread')
  I.see('.seen-unseen-indicator')

  I.pressKey('i')
  I.waitForDetached('.unread')
  I.waitForElement('~Mark as unread')
  I.dontSee('.seen-unseen-indicator')
})
