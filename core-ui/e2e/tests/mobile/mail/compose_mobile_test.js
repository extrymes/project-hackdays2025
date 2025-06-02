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

Feature('Mobile > Mail > Compose')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create(),
    users.create(),
    users.create(),
    users.create()
  ])
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Send mail @mobile', async ({ I, users, mobileMail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()

  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'This is a mail')
  I.click('.editor')
  I.fillField('.editor', 'Some mail text')
  mobileMail.send()

  I.waitForInvisible('.abs.notification', 30)
  I.waitForText('This is a mail')
  I.waitForText('Some mail text')
  I.waitForText(`${users[0].get('given_name')} ${users[0].get('sur_name')}`)
})

Scenario('Send mail to CC recipients @mobile', async ({ I, users, mobileMail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.click('[data-action="add"]')
  I.fillField('CC', users[2].get('primaryEmail'))
  I.waitForVisible('.cc .tt-dropdown-menu .tt-suggestion')
  I.click('.cc .tt-dropdown-menu .tt-suggestion')
  I.fillField('CC', users[3].get('primaryEmail'))
  I.waitForVisible('.cc .tt-dropdown-menu .tt-suggestion')
  I.click('.cc .tt-dropdown-menu .tt-suggestion')
  I.fillField('Subject', 'Test subject')
  I.fillField('.editor', 'Some mail text')
  mobileMail.send()
  I.logout()

  // login and check with user1
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with user2
  I.login('app=io.ox/mail', { user: users[2] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with user3
  I.login('app=io.ox/mail', { user: users[3] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.waitForElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
})

Scenario('Send mail to BCC recipients @mobile', async ({ I, users, mobileMail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.click('[data-action="add"]')
  I.fillField('BCC', users[2].get('primaryEmail'))
  I.waitForVisible('.bcc .tt-dropdown-menu .tt-suggestion')
  I.click('.bcc .tt-dropdown-menu .tt-suggestion')
  I.fillField('BCC', users[3].get('primaryEmail'))
  I.waitForVisible('.bcc .tt-dropdown-menu .tt-suggestion')
  I.click('.bcc .tt-dropdown-menu .tt-suggestion')
  I.fillField('Subject', 'Test subject')
  I.fillField('.editor', 'Some mail text')
  mobileMail.send()
  I.logout()

  // login and check with second user
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.dontSee(`${users[2].get('primaryEmail')}`)
  I.dontSee(`${users[3].get('primaryEmail')}`)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with third user
  I.login('app=io.ox/mail', { user: users[2] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.dontSee(`${users[2].get('primaryEmail')}`)
  I.dontSee(`${users[3].get('primaryEmail')}`)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
  I.logout()

  // login and check with fourth user
  I.login('app=io.ox/mail', { user: users[3] })
  I.waitForApp()
  mobileMail.selectMail('Test subject')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.waitForElement(`[title="${users[1].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[2].get('primaryEmail')}"]`, 5)
  I.dontSeeElement(`[title="${users[3].get('primaryEmail')}"]`, 5)
  I.dontSee(`${users[2].get('primaryEmail')}`)
  I.dontSee(`${users[3].get('primaryEmail')}`)
  I.waitForText('Test subject', 5, '.mail-detail-pane .subject')
})

Scenario('Compose and discard empty mail @mobile', async ({ I, users, dialogs, mobileMail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()

  // show modal dialog when dirty, otherwise don't
  I.fillField('Subject', 'This is a mail')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.clearField('Subject')
  I.click('Discard')

  I.waitForText('This folder is empty')
})

Scenario('Compose and discard draft @mobile', async ({ I, users, dialogs, mobileMail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()

  I.fillField('Subject', 'This is a mail')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete draft')

  I.waitForText('This folder is empty')
})

Scenario('Compose and save draft @mobile', async ({ I, users, dialogs, mobileMail }) => {
  const draftFolderLocator = locate('.folder-label').withText('Drafts').as('Drafts folder')
  I.login('app=io.ox/mail')
  I.waitForApp()
  mobileMail.newMail()

  I.fillField('Subject', 'A draft')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForText('This folder is empty')

  I.waitForDetached('.io-ox-mail-compose-window.complete')
  I.click(locate('.navbar-action.left a').withText('Folders').as('< Folders'))
  I.waitForVisible('.folder-tree')
  I.waitForVisible(draftFolderLocator)
  I.waitForText('1', 5, '~Drafts, 1 total.')
  I.click(draftFolderLocator)
  I.waitForText('A draft')
})

Scenario('Flag an e-Mail with a color flag @mobile', async ({ I, mobileMail, users }) => {
  const icke = users[0].get('email1')
  await Promise.all([
    I.haveSetting('io.ox/core//autoStart', 'none'),
    I.haveMail({
      attachments: [{
        content: 'Lorem ipsum',
        content_type: 'text/plain',
        disp: 'inline'
      }],
      flags: 0,
      from: [['Icke', icke]],
      subject: 'Flag mails',
      to: [['Icke', icke]]
    })
  ])

  I.login()
  I.executeScript(async function () {
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    mailSettings.set('features/flagging', { mode: 'color' })
    mailSettings.flagByColor = true
  })
  I.waitForInvisible('#background-loader')
  I.openApp('Mail')
  I.waitForApp()
  mobileMail.selectMail('Flag mails')

  // set
  I.click('.mail-detail-pane .flags.btn')
  I.wait(1)
  I.waitForText('Yellow', 5, '.custom-dropdown')
  I.click('[data-action="color-yellow"]', '.custom-dropdown')
  I.waitForVisible('.mail-detail-pane .list-item .color-flag.flag_10')

  // check in list view
  I.click('Back', '.mobile-navbar')
  I.waitForVisible('.list-view .list-item .color-flag.flag_10')
  mobileMail.selectMail('Flag mails')

  // go back to detail view and unset
  I.click('.mail-detail-pane .flags.btn')
  I.wait(1)
  I.waitForText('Yellow', 5, '.custom-dropdown')
  I.click('[data-action="color-none"]', '.custom-dropdown')
  I.waitForDetached('.list-item .color-flag')
})
