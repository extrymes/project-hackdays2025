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

Feature('Mail > External Accounts')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

function createExampleDraft () {
  const { I, dialogs, mail } = inject()
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.fillField('Subject', 'Test subject draft')
  I.retry(3).click('~Close', '.io-ox-mail-compose-window')
  dialogs.clickButton('Save draft')
  I.waitForDetached('.io-ox-mail-compose-window')
}

Scenario('[C125352] No mail oauth service available', ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  I.retry(5).click('~More actions', '.primary-action')
  I.clickDropdown('Add mail account', '.primary-action')

  /// /Check to see whether mail account wizard is shown up
  I.waitForElement('.add-mail-account-address', 30)
  I.seeElement('.add-mail-account-password')
})

Scenario('[OXUIB-225] Password recovery for account passwords after password change', async ({ I, dialogs, users }) => {
  await I.haveMailAccount({ additionalAccount: users[1], name: 'My External', extension: 'ext' })

  I.login()
  // Check for the external account being registered
  I.waitForText('My External')
  I.dontSeeElement('.modal-dialog')
  I.logout()

  // Change password using external system
  await I.executeSoapRequest('OXUserService', 'change', {
    ctx: { id: users[0].context.id },
    usrdata: {
      id: users[0].get('id'),
      password: 'secret2'
    },
    auth: users[0].context.admin
  })
  users[0].userdata.password = 'secret2'

  I.login()
  I.waitForText('My External')
  dialogs.waitForVisible()
  dialogs.clickButton('Remind me again')
  I.waitToHide('.modal-dialog')

  I.refreshPage()
  I.waitForText('My External', 10)
  dialogs.waitForVisible()
  dialogs.clickButton('Remove passwords')
  I.waitToHide('.modal-dialog')

  I.refreshPage()
  I.waitForText('My External', 10)
  I.dontSeeElement('.modal-dialog')
})

Scenario('[OXUIB-1966] Permissions dialog is disabled for external and secondary accounts', async ({ I, mail, users, dialogs }) => {
  const additionalAccount = await users.create()
  await I.haveMailAccount({ additionalAccount, name: 'My External', extension: 'ext' })
  I.login()
  I.waitForApp()
  I.waitForText('My External')
  I.rightClick('My External')
  I.waitForElement('.dropdown.open .dropdown-menu')
  I.dontSee('Permission', '.dropdown.open .dropdown-menu')
  I.pressKey('Escape')
  I.waitForDetached('.dropdown.open .dropdown-menu')
  I.click('.folder-arrow', '~My External')
  I.waitForText('Inbox', 5, '~My External')
  I.rightClick('Inbox', '~My External')
  I.waitForElement('.dropdown.open .dropdown-menu')
  I.dontSee('Permission', '.dropdown.open .dropdown-menu')
})

Scenario('[OXUI-1026] Testing with external SMTP enabled', async ({ I, mail, users, settings, dialogs }) => {
  const defaultAddress = users[0].get('primaryEmail')
  const externalUser = users[1]
  const externalAddress = externalUser.get('primaryEmail')

  // Preparing external account
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  const recipient = [[externalUser.get('display_name'), externalAddress]]
  await Promise.all([
    I.haveMail({ from: sender, to: recipient, subject: 'Test subject mail' }),
    users[0].hasConfig('com.openexchange.mail.smtp.allowExternal', true)
  ])

  I.login('app=io.ox/mail', { user: externalUser })
  createExampleDraft()
  I.logout()

  I.login()
  I.waitForApp()

  // Checking absence of disabled external SMTP note when adding accounts
  I.click('~More actions', '.primary-action')
  I.waitForElement('.btn-group.open')
  I.clickDropdown('Add mail account')
  I.waitForText('Your credentials will be sent over a secure connection only', 5, '.modal .help-block')
  I.dontSee('External mail accounts are read-only')

  // Checking for `Outgoing server (SMTP)` in `Add mail account` form
  I.fillField('.modal #add-mail-account-address', externalAddress)
  dialogs.clickButton('Add')
  I.waitForText('Auto-configuration failed', 10, '.modal')
  I.click('Configure manually', '.modal')
  I.waitForText('Outgoing server (SMTP)', 10, '.modal')
  I.fillField('.modal #name', 'External Mail Account')
  I.fillField('.modal #mail_server', externalUser.get('imapServer'))
  I.fillField('.modal #password', externalUser.get('password'))
  I.fillField('.modal #transport_server', externalUser.get('smtpServer'))
  dialogs.clickButton('Save')
  I.waitForDetached('.modal')
  I.waitForText('External Mail Account', 10, '.window-sidepanel')

  // Checking for selectable external mail account in mail compose
  mail.newMail()
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.waitForText(externalAddress)
  I.clickDropdown('Edit names')
  I.waitForText('Edit real names')
  I.waitForText(externalAddress, 10, '.modal-dialog')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // Checking external sender when composing mail from external account folder
  I.doubleClick('External Mail Account', '.window-sidepanel')
  I.waitForText('Inbox', 10, '.window-sidepanel .virtual.remote-folders')
  I.waitForText('External Mail Account', 10, '.list-view-control')
  mail.newMail()
  I.waitForText(externalAddress, 10, '.io-ox-mail-compose-window .sender')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // Checking external sender when replying to external mail
  I.click('~Inbox', '.window-sidepanel .virtual.remote-folders')
  mail.selectMail('Test subject mail')
  I.click('~Reply to sender', '.rightside')
  I.waitForText(externalAddress, 10, '.io-ox-mail-compose-window .sender')
  I.waitForElement('.token-input')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.click('.token-input')
  I.fillField('To', defaultAddress)
  mail.send()

  // Checking external sender when opening external draft
  I.click('div[title*="Drafts"]', '.window-sidepanel .virtual.remote-folders')
  mail.selectMail('Test subject draft')
  I.waitForClickable('~Edit draft', 10)
  I.click('~Edit draft', '.rightside')
  I.waitForText(externalAddress, 10, '.io-ox-mail-compose-window .sender')
  I.waitForElement('.token-input')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.click('.token-input')
  I.fillField('To', defaultAddress)
  mail.send()

  // Checking for `Outgoing server (SMTP)` in account settings form
  settings.open('Accounts')
  I.waitForText('External Mail Account', 10)
  I.retry(3).click('~Edit ' + 'External Mail Account')
  I.waitForText('Outgoing server (SMTP)', 10)

  // Checking if the form can be submitted
  dialogs.clickButton('Save')
  I.waitForElement('.io-ox-alert svg.bi-check-lg', 10)
})

Scenario('[OXUI-1026] Testing with external SMTP disabled', async ({ I, mail, users, dialogs, settings }) => {
  const externalUser = users[1]
  const externalAddress = externalUser.get('primaryEmail')

  // Preparing external account
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  const recipient = [[externalUser.get('display_name'), externalAddress]]
  await Promise.all([
    I.haveMail({ from: sender, to: recipient, subject: 'Test subject mail' }),
    users[0].hasConfig('com.openexchange.mail.smtp.allowExternal', false)
  ])
  await I.waitForSetting({ 'io.ox/mail': { features: { allowExternalSMTP: false } } }, 30)

  I.login('app=io.ox/mail', { user: externalUser })
  createExampleDraft()
  I.logout()

  I.login()
  I.waitForApp()

  // Checking for disabled external SMTP note when adding accounts
  I.click('~More actions', '.primary-action')
  I.waitForElement('.btn-group.open')
  I.clickDropdown('Add mail account')
  I.waitForText('External mail accounts are read-only', 10, '.modal .smtp-disabled')

  // Checking absence of `Outgoing server (SMTP)` in `Add mail account` form
  I.fillField('.modal #add-mail-account-address', externalAddress)
  dialogs.clickButton('Add')
  I.waitForText('Auto-configuration failed', 10, '.modal')
  I.click('Configure manually', '.modal')
  I.waitForText('Incoming server', 10, '.modal')
  I.dontSee('Outgoing server (SMTP)', '.modal')
  I.fillField('.modal #name', 'External Mail Account')
  I.fillField('.modal #mail_server', externalUser.get('imapServer'))
  I.fillField('.modal #password', externalUser.get('password'))
  dialogs.clickButton('Save')
  I.waitForElement('.io-ox-alert svg.bi-check-lg', 10)

  // Checking for missing external mail account mail compose
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.dontSee(externalAddress)
  I.clickDropdown('Edit names')
  I.waitForText('Edit real names')
  I.dontSee(externalAddress, '.modal-dialog')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.click('~Close', '.io-ox-mail-compose-window')

  // Checking for default address when composing mail from external account folder
  I.doubleClick('External Mail Account', '.window-sidepanel')
  I.waitForText('Inbox', 10, '.window-sidepanel .virtual.remote-folders')
  I.click('~Inbox', '.window-sidepanel .virtual.remote-folders')
  mail.newMail()
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.dontSee(externalAddress)
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window', 10)
  mail.selectMail('Test subject mail')

  // Reply
  I.click('~Reply to sender', '.rightside')
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.dontSee(externalAddress)
  I.waitForElement('iframe[title^="Rich Text Area"]')
  await within({ frame: 'iframe[title^="Rich Text Area"]' }, () => {
    I.waitForFocus('body#tinymce')
  })
  I.click('~From')
  I.waitForElement('.dropdown.open')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // Reply all
  I.click('~Reply to all recipients', '.rightside')
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.dontSee(externalAddress)
  I.waitForElement('iframe[title^="Rich Text Area"]')
  await within({ frame: 'iframe[title^="Rich Text Area"]' }, () => {
    I.waitForFocus('body#tinymce')
  })
  I.click('~From')
  I.waitForElement('.dropdown.open')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // Forward
  I.click('~Forward', '.rightside')
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.waitForFocus('[placeholder="To"]')
  I.dontSee(externalAddress)
  I.click('~From')
  I.waitForElement('.dropdown.open')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // Checking sender replacement for external drafts
  I.click('div[title*="Drafts"]', '.window-sidepanel .virtual.remote-folders')
  mail.selectMail('Test subject draft')
  I.waitForClickable('~Edit draft', 10)
  I.click('~Edit draft', '.rightside')
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.dontSee(externalAddress)
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')

  // Checking absence of `Outgoing server (SMTP)` in account settings form
  settings.open('Accounts')
  I.waitForText('External Mail Account', 10)
  I.retry(3).click('~Edit External Mail Account')
  I.waitForText('Incoming server', 10)
  I.dontSee('Outgoing server (SMTP)')

  // Checking if the form can be submitted
  dialogs.clickButton('Save')
  I.waitForElement('.io-ox-alert svg.bi-check-lg', 10)
})

Scenario('[OXUI-1026] Testing when SMTP gets disabled for existing external account', async ({ I, users, mail, dialogs }) => {
  const externalUser = users[1]
  const externalAddress = externalUser.get('primaryEmail')

  // Preparing external account
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  const recipient = [[externalUser.get('display_name'), externalAddress]]
  await Promise.all([
    I.haveMail({ from: sender, to: recipient, subject: 'Test subject mail' }),
    users[0].hasConfig('com.openexchange.mail.smtp.allowExternal', true)
  ])
  await I.waitForSetting({ 'io.ox/mail': { features: { allowExternalSMTP: true } } }, 10)

  I.login('app=io.ox/mail', { user: externalUser })
  createExampleDraft()
  I.logout()

  I.login()
  I.waitForApp()

  // Checking absence of disabled external SMTP note when adding accounts
  I.click('~More actions', '.primary-action')
  I.waitForElement('.btn-group.open')
  I.clickDropdown('Add mail account')
  I.waitForText('Your credentials will be sent over a secure connection only', 5, '.modal .help-block')
  I.dontSee('External mail accounts are read-only')

  // Checking for `Outgoing server (SMTP)` in `Add mail account` form
  I.fillField('.modal #add-mail-account-address', externalAddress)
  dialogs.clickButton('Add')
  I.waitForText('Auto-configuration failed', 10, '.modal')
  I.click('Configure manually', '.modal')
  I.waitForText('Outgoing server (SMTP)', 10, '.modal')
  I.fillField('.modal #name', 'External Mail Account')
  I.fillField('.modal #mail_server', externalUser.get('imapServer'))
  I.fillField('.modal #password', externalUser.get('password'))
  I.fillField('.modal #transport_server', externalUser.get('smtpServer'))
  dialogs.clickButton('Save')
  I.waitForDetached('.modal')
  I.waitForText('External Mail Account', 10, '.window-sidepanel')

  I.logout()

  // Use something async to break up promise chain
  await I.executeScript('')
  await users[0].hasConfig('com.openexchange.mail.smtp.allowExternal', false)
  await I.waitForSetting({ 'io.ox/mail': { features: { allowExternalSMTP: false } } }, 30)

  I.login()
  I.waitForApp()

  // Checking for selectable external mail account in mail compose
  mail.newMail()
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.retry(3).dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')
  I.waitForText('External Mail Account', 10, '.window-sidepanel')

  I.doubleClick('External Mail Account', '.window-sidepanel')
  I.waitForText('Inbox', 10, '.window-sidepanel .virtual.remote-folders')
  I.click('~Inbox', '.window-sidepanel .virtual.remote-folders')
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.dontSee(externalAddress)
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.waitForElement('.dropdown.open')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window', 10)
  mail.selectMail('Test subject mail')
  I.click('~Reply to sender', '.rightside')
  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForVisible({ css: 'li[data-extension-id="composetoolbar-menu"]' })
  I.waitForText('From', 10, '.io-ox-mail-compose-window .sender')
  I.dontSee(externalAddress)
  I.waitForElement('iframe[title^="Rich Text Area"]')
  await within({ frame: 'iframe[title^="Rich Text Area"]' }, () => {
    I.waitForFocus('body#tinymce')
  })
  I.click('.io-ox-mail-compose-window .sender-dropdown-link')
  I.waitForElement('.dropdown.open')
  I.dontSee(externalAddress)
  I.pressKey('Escape')
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')
})
