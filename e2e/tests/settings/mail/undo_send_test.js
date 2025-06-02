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

Feature('Settings > Mail > undoSend')

Before(async ({ users }) => { await users.create() })
After(async ({ users }) => { await users.removeAll() })

Scenario('Feature Flag undoSend=true', async ({ I, settings }) => {
  await I.haveSetting('io.ox/core//features/undoSend', true)

  I.login('app=io.ox/mail&section=io.ox/mail/settings/compose&settings=virtual/settings/io.ox/mail')
  I.waitForApp()

  I.waitForText('Undo send')
  I.see('Without delay')
  I.see('5 seconds')
  I.see('10 seconds')
})

Scenario('Feature Flag undoSend=false', async ({ I, settings }) => {
  await I.haveSetting('io.ox/core//features/undoSend', false)

  I.login('app=io.ox/mail&section=io.ox/mail/settings/compose&settings=virtual/settings/io.ox/mail')
  I.waitForApp()

  I.waitForText('Compose dialog')
  I.dontSee('Undo send')
})

Scenario('After the user sends a mail in mail compose the mail is not send until the delay has passed', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 1, undoSendDoneDelay: 1 },
    'io.ox/core': { features: { undoSend: true } }
  })
  I.login('app=io.ox/mail&section=io.ox/mail/settings/compose&settings=virtual/settings/io.ox/mail')
  I.waitForApp()

  I.checkOption('Without delay')
  settings.close()

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject')
  I.click('Send')

  I.waitForVisible('.mail-send-progress')
  I.waitForInvisible('.mail-send-progress-action', 0.1)

  settings.open('Mail', 'Compose & Reply')
  I.checkOption('5 seconds', '#undoSendDelay') // "5 Seconds" clashes with "Mark as read"
  await I.waitForSetting({ 'io.ox/mail': { undoSendDelay: 5 } })
  settings.close()
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')
  I.click('Send')

  I.waitForText('Sending...', 5, '.mail-send-progress .state')
  I.see('Subject of Mail', '.mail-send-progress-subject')
  I.see('Undo', '.mail-send-progress button')
  I.waitForText('Send', 5, '.mail-send-progress .state')
  I.see('Subject of Mail', '.mail-send-progress-subject')
  I.dontSee('.mail-send-progress button')
  I.waitForInvisible('.mail-send-progress', 20)
})

Scenario('If the user presses the "undo" button, the mail is not send. Mail compose is re-opened with the mail', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')
  I.click('Send')

  I.waitForText('Sending...', 5, '.mail-send-progress .state')
  I.click('.mail-send-progress button')
  I.dontSee('.mail-send-progress')
  I.see('Subject of Mail', '.io-ox-mail-compose-window .title')
  I.see('Subject of Mail', '.mail-send-progress-subject')
})

Scenario('If multiple mails are canceled, all mails are re-opened', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })
  I.resizeWindow(800, 800)

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')
  I.click('Send')

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail 2')
  I.click('.active .btn-primary')

  I.waitForText('Sending...', 5, '.mail-send-progress .state')
  I.see('Subject of Mail 2', '.mail-send-progress-subject')
  I.click('Undo')
  I.dontSee('.mail-send-progress')
  I.waitForVisible('.io-ox-mail-compose-window')

  I.seeNumberOfElements('.io-ox-mail-compose-window', 2)
})

Scenario('If attachments are added, sending mail can be undone during attachment upload', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')
  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/16MB.dat')
  I.click('Send')

  I.waitForText('Uploading Attachment...', 5, '.mail-send-progress .state')
  I.see('Subject of Mail', '.mail-send-progress-subject')
  I.waitForElement('.progress')
  I.click('Undo')
  I.waitForInvisible('.progress')
  I.waitForText('Subject of Mail', 5, '.io-ox-mail-compose-window .title')

  // remove attachment and try to send again
  I.click('.toggle-mode')
  I.click('.remove-attachment')
  I.click('Send')
  I.waitForText('Subject of Mail', 5, '.mail-send-progress-subject')
  I.waitToHide('.mail-send-progress', 10)
})

Scenario('Send one mail, abort the other', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')

  mail.newMail()
  I.fillField('.active .token-input.tt-input', users[0].get('primaryEmail'))
  I.fillField('.active [name="subject"]', 'Subject of Mail 2')

  // send both mails
  I.click('Send', '.active .window-footer')
  I.click('Send')

  // abort both mails
  I.waitForElement('.mail-send-progress')
  I.click('Undo')
  I.waitToHide('.mail-send-progress')

  // send one mail
  I.click('Send')

  I.waitToHide('.mail-send-progress', 20)
})

Scenario('When attachment upload is interrupted, mail window reopens', async ({ I, settings, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')

  I.startMocking('mock')
  I.mockServer((server) => {
    server.post(`${process.env.LAUNCH_URL}/api/mail/compose/:id/attachments`).intercept((req, res) => {
      res.sendStatus(500)
    })
  })

  I.attachFile('.composetoolbar input[type="file"]', 'media/files/generic/2MB.dat')

  I.click('Send')

  I.waitForElement('.mail-send-progress')
  I.waitForText('Error', 30)
  I.waitForVisible('.io-ox-mail-compose-window')
  I.waitForText('Subject of Mail', 5, '.io-ox-mail-compose-window .title')
  I.stopMocking()
})

Scenario('When logging out during mail send users are warned of potential data loss', async ({ I, dialogs, mail, users }) => {
  await I.haveSetting({
    'io.ox/mail': { undoSendDelay: 5 },
    'io.ox/core': { features: { undoSend: true } }
  })

  I.login('app=io.ox/mail', { user: users[0] })

  I.executeScript(async function () {
    // @ts-ignore
    const { default: ox } = await import(String(new URL('ox.js', location.href)))

    ox.logoutLocation = 'https://www.open-xchange.com'
  })

  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Subject of Mail')
  I.click('Send')

  I.waitForElement('.mail-send-progress')

  I.click('~My account')
  I.waitForText('Sign out')
  I.clickDropdown('Sign out')

  dialogs.waitForVisible()
  I.waitForText('Sending mail in progress', 5, dialogs.header)
  I.click('Cancel')

  I.waitForElement('.mail-send-progress')

  I.click('~My account')
  I.waitForText('Sign out')
  I.clickDropdown('Sign out')

  dialogs.waitForVisible()
  I.waitForText('Sending mail in progress', 5, dialogs.header)
  I.click('Continue sign out')
  I.waitInUrl('open-xchange.com', 5)
})
