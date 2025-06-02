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

/// <reference path="../../../steps.d.ts" />

Feature('Mail Compose')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Show reply-to in detail view', async ({ I, mail }) => {
  await Promise.all([
    I.haveMail({ folder: 'default0/Inbox', path: 'media/mails/C273802.eml' }),
    I.haveMail({ folder: 'default0/Inbox', path: 'media/mails/OXUIB-1172.eml' })
  ])
  I.login('app=io.ox/mail')
  I.waitForApp()

  // reply-to
  mail.selectMail('C273802')
  I.waitForText('Reply To', 5, '.subject-recipients')
  I.waitForText('Daniel Pondruff', 5, '.subject-recipients')

  // no reply-to
  mail.selectMail('This mail has a deeplink')
  I.waitForText('This mail has a deeplink', 5, '.subject-recipients')
  I.dontSee('Reply To', '.subject-recipients')
})

Scenario('Toggle "Reply to" by click', async ({ I, users, dialogs, mail, settings }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()

  I.see('To', '.mail-compose-fields')
  // initially hidden because it is empty
  I.dontSee('Reply To', '.mail-compose-fields')

  // show reply-to by click
  I.click('Show reply-to input field', '.recipient-actions')
  I.waitForText('Reply To', 5, '.mail-compose-fields')

  // hide reply-to by click
  I.click('Hide reply-to input field', '.recipient-actions')
  I.waitForInvisible('[data-extension-id="reply_to"]')
  I.dontSee('Reply To', '.mail-compose-fields')

  // show reply-to by click again
  I.click('Show reply-to input field', '.recipient-actions')
  I.waitForText('Reply To', 5, '.mail-compose-fields')
  I.fillField('Reply To', 'me@example.com')
  I.pressKey('Enter')

  // Try to hide filled reply-to
  I.click('Hide reply-to input field', '.recipient-actions')
  I.see('me@example.com')

  // Still visible because it is not empty
  I.click('Remove', '.token')
  I.click('Hide reply-to input field', '.recipient-actions')
  I.waitForInvisible('[data-extension-id="reply_to"]')
})

Scenario('Apply accounts default value for reply-to initially', async ({ I, users, dialogs, mail, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { didYouKnow: { saveOnCloseDontShowAgain: true } } })

  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()

  // add reply-to for primary account
  I.waitForText('Edit', 5, '.settings-list-item:nth-of-type(1)')
  I.click('Edit', '.settings-list-item:nth-of-type(1)')
  I.waitForText('Edit mail account')
  I.fillField('Reply To', 'hotzenplotz@example.com')
  I.click('Save')
  I.waitForVisible('.io-ox-alert')
  I.click('Close this notification', '.io-ox-alert')
  I.waitForDetached('.io-ox-alert')

  // close settings and switch to mail
  settings.close()
  I.waitForApp()

  // send mail with initially applied reply-to value
  mail.newMail()
  I.see('Reply To', '.mail-compose-fields')
  I.see('hotzenplotz', '.token')
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'With reply-to')
  I.click('Send')
  I.waitForDetached('.io-ox-mail-compose-window')

  // send mail with other reply-to value
  mail.newMail()
  I.see('Reply To', '.mail-compose-fields')
  I.see('hotzenplotz', '.token')
  I.click('~Remove', '[data-extension-id="reply_to"]')
  I.fillField('Reply To', 'hotzenplotz-other@example.com')
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'With other reply-to')
  I.click('Send')
  I.waitForDetached('.io-ox-mail-compose-window')

  // send mail with cleared reply-to value
  mail.newMail()
  I.see('Reply To', '.mail-compose-fields')
  I.see('hotzenplotz', '.token')
  I.click('~Remove', '[data-extension-id="reply_to"]')
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Without reply-to')
  I.click('Send')
  I.waitForDetached('.io-ox-mail-compose-window')

  // save draft with with other reply-to value
  mail.newMail()
  I.see('Reply To', '.mail-compose-fields')
  I.see('hotzenplotz', '.token')
  I.click('~Remove', '[data-extension-id="reply_to"]')
  I.fillField('Reply To', 'hotzenplotz-other@example.com')
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Draft with other reply-to')
  I.waitForEnabled('~Mail compose actions')
  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')
  I.waitForDetached('.io-ox-mail-compose-window')

  // check detail view
  mail.selectMail('With reply-to')
  I.waitForText('Reply To', 5, '.recipients')
  I.waitForText('hotzenplotz', 5, '.recipients')

  mail.selectMail('With other reply-to')
  I.waitForText('Reply To', 5, '.recipients')
  I.waitForText('hotzenplotz-other', 5, '.recipients')

  mail.selectMail('Without reply-to')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-view-header')
  I.dontSee('Reply To', '.recipients')
  I.dontSee('hotzenplotz', '.recipients')

  I.selectFolder('Drafts')
  mail.selectMail('Draft with other reply-to')
  // Potential backend bug
  // I.waitForText('Reply To', 5, '.recipients')
  // I.waitForText('hotzenplotz-other', 5, '.recipients')
  I.clickToolbar('~Edit draft')
  I.waitForElement('.tokenfield.reply_to .token-label', 5)
  I.see('hotzenplotz-other@example.com')
})

Scenario('Apply accounts default value for reply-to initially when changing sender address', async ({ I, users, dialogs, mail, settings }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])

  await Promise.all([
    I.haveSetting({ 'io.ox/mail': { didYouKnow: { saveOnCloseDontShowAgain: true } } }),
    I.haveMailAccount({ additionalAccount: users[1], name: 'My Secondary' }),
    I.haveMailAccount({ additionalAccount: users[2], name: 'My Tertiary' })
  ])

  I.login('settings=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForApp()

  // add reply-to to primary account
  I.waitForText('Edit', 5, '.settings-list-item:nth-of-type(1)')
  I.click('Edit', '.settings-list-item:nth-of-type(1)')
  I.waitForText('Edit mail account')
  I.fillField('Reply To', 'hotzenplotz-primary@example.com')
  I.click('Save')
  I.waitForVisible('.io-ox-alert')
  I.click('Close this notification', '.io-ox-alert')
  I.waitForDetached('.io-ox-alert')

  // add reply-to to secondary account
  I.waitForText('Edit', 5, '.settings-list-item:nth-of-type(2)')
  I.click('Edit', '.settings-list-item:nth-of-type(2)')
  I.fillField('Reply To', 'hotzenplotz-secondary@example.com')
  I.click('Save')
  I.waitForVisible('.io-ox-alert')
  I.click('Close this notification', '.io-ox-alert')
  I.waitForDetached('.io-ox-alert')

  // close settings and switch to mail
  settings.close()
  I.waitForApp()

  mail.newMail()
  // user[0] with reply-to
  I.see('Reply To', '.mail-compose-fields')
  I.see('hotzenplotz-primary', '.token')

  // user[1] with other reply-to
  I.click(users[0].get('primaryEmail'), '.mail-input')
  I.clickDropdown(users[1].get('primaryEmail'))
  I.waitForText('hotzenplotz-secondary', 5, '.token')
  I.dontSee('hotzenplotz-primary', '.token')

  // user[2] without any initial reply-to
  I.click(users[1].get('primaryEmail'), '.mail-input')
  I.clickDropdown(users[2].get('primaryEmail'))
  I.dontSee('hotzenplotz-primary')
  I.dontSee('hotzenplotz-secondary')
  I.fillField('Reply To', 'hotzenplotz-tertiary@example.com')
  I.pressKey('Enter')

  // change sender to initial user[0] again but default value gets not applied again
  I.click(users[2].get('primaryEmail'), '.mail-input')
  I.clickDropdown(users[0].get('primaryEmail'))
  I.waitForText('hotzenplotz-tertiary@example.com', 5, '.token')
  I.dontSee('hotzenplotz-primary')
  I.dontSee('hotzenplotz-secondary')
})
