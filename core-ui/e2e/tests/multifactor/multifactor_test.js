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

Feature('Settings > Security > 2-step verification')
const OTPAuth = require('otpauth')
const { I, dialogs } = inject()

function getTotp (secret) {
  secret = secret.replace(/(\r\n|\n|\r)/, '')
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret.replace(/ /g, '')
  })
  return totp.generate()
}

Before(async ({ users }) => {
  const user = await users.create()
  await user.context.hasCapability('multifactor')
})

After(async ({ users }) => {
  await users[0].context.doesntHaveCapability('multifactor')
  await users.removeAll()
})

function enterCode (code) {
  I.waitForVisible('.multifactorAuthDiv .mfInput')
  I.fillField('.mfInput', code)
  dialogs.clickButton('Next')
}

function addSMS () {
  I.waitForText('Add verification option')
  I.wait(0.3)
  I.click('Add verification option')
  I.waitForText('Code via text message')
  I.click('Code via text message')

  I.waitForVisible('#deviceNumber')
  I.waitForVisible('.countryCodes')
  I.fillField('#deviceNumber', '5555551212')
  dialogs.clickButton('Ok')

  I.waitForText('Confirm Code')
  I.fillField('Confirm Code', '0815')
  dialogs.clickButton('Ok')
}

async function addTOTP () {
  I.waitForText('Add verification option')
  I.wait(0.3)
  I.click('Add verification option')
  I.waitForText('Google Authenticator or compatible')
  I.click('Google Authenticator or compatible')

  I.waitForVisible('#code')
  const secret = await I.grabTextFrom('#code')
  const code = getTotp(secret)
  I.fillField('Authentication code', code)
  dialogs.clickButton('Ok')
  return secret
}

Scenario('Add TOTP multifactor and login using', async ({ I, settings }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  const secret = await addTOTP()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')

  I.waitForText('Authenticator 1') // Listed in active list

  settings.close()
  I.logout()

  I.login()

  enterCode(getTotp(secret))
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForVisible('.io-ox-mail-window .window-body .classic-toolbar')
})

Scenario('TOTP multifactor bad entry', async ({ I, users, settings }) => {
  await users[0].hasConfig('com.openexchange.multifactor.maxBadAttempts', 4)
  // Login to settings
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  const secret = await addTOTP()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')

  I.waitForText('Authenticator 1') // Listed in active list

  settings.close()
  I.logout()

  I.login('app=io.ox/mail') // Log back in

  const badCode = Number(getTotp(secret)) + 123
  for (let i = 0; i < 3; i++) {
    enterCode(badCode)
    I.waitForText('The authentication failed.')
  }
  enterCode(badCode)
  I.waitForVisible('.io-ox-alert')
  I.see('locked', '.io-ox-alert')
  I.waitForVisible('#io-ox-login-username')
  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-alert')
  I.see('locked', '.io-ox-alert')
})

Scenario('Add SMS multifactor and login using', async ({ I, settings }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  addSMS()

  I.waitForText('Code via text message')
  I.waitForText('Backup code to access your account')
  I.click('Close', '.modal.verification-options')

  I.waitForText('My Phone') // Listed in active list
  I.waitForText('SMS Code')

  settings.close()
  I.logout()

  I.login()

  enterCode('0815')
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForVisible('.io-ox-mail-window .window-body .classic-toolbar')
})

Scenario('Add SMS multifactor, then lost device', async ({ I, settings }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  addSMS()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  const recovery = await I.grabTextFrom('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')

  I.waitForText('My Phone') // Listed in active list

  settings.close()
  I.logout()

  I.login()

  I.waitForText('You secured your account with 2-step verification.')
  I.click('I lost my device')

  I.waitForText('Please enter the recovery code')
  I.fillField('Recovery code', recovery)
  dialogs.clickButton('Next')
  I.waitForVisible('.io-ox-mail-window .window-body .classic-toolbar', 20)
})

Scenario('Add TOTP multifactor, then lost device', async ({ I, settings, dialogs }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  const secret = await addTOTP()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  const recovery = await I.grabTextFrom('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')

  I.waitForText('Authenticator 1') // Listed in active list

  settings.close()
  I.logout()
  // need to set capability via url parameter since multifactor is disabled by default on the server
  I.login('app=io.ox/mail&cap=multifactor')
  enterCode(getTotp(secret))
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForElement('.io-ox-mail-window .window-body .classic-toolbar')

  // leave happy path
  // force re-authentication while adding a new device
  I.refreshPage()

  I.waitForNetworkTraffic()
  settings.open('Security', 'Two-step verification')
  I.waitForText('Add verification option')
  I.click('Add verification option')
  I.waitForText('Google Authenticator or compatible')
  I.click('Google Authenticator or compatible')

  I.waitForText('Reauthentication required for this action')
  dialogs.clickButton('I lost my device')
  I.fillField('Recovery code', recovery)
  dialogs.clickButton('Next')

  I.waitForText('Scan the QR code with your authenticator')
})

Scenario('Add multiple multifactors, then login', async ({ I, settings }) => {
  // Login to settings
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  addSMS()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')

  I.waitForText('My Phone') // Listed in active list

  await addTOTP()

  settings.close()
  I.logout()

  I.login()

  I.waitForText('Please select a device to use for additional authentication')
  I.click('My Phone')

  enterCode('0815')
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForVisible('.io-ox-mail-window .window-body .classic-toolbar')
})

Scenario('Add second TOTP and force re-authentication', async ({ I, settings, dialogs }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  let secret = await addTOTP()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')
  I.waitForText('Authenticator 1') // Listed in active list
  settings.close()
  I.logout()

  // need to set capability via url parameter since multifactor is disabled by default on the server
  I.login('app=io.ox/mail&cap=multifactor')
  // fail once and then succeed
  enterCode(`${getTotp(secret)}_false`)
  I.waitForText('The authentication failed.')
  enterCode(getTotp(secret))
  I.waitForInvisible('#background-loader.busy', 20)
  I.waitForVisible('.io-ox-mail-window .window-body .classic-toolbar')

  // leave happy path
  // force re-authentication while adding a new device
  I.refreshPage()
  I.waitForNetworkTraffic()
  settings.open('Security', 'Two-step verification')
  I.waitForText('Add verification option')
  I.click('Add verification option')
  I.waitForVisible('.verification-options .mfIcon.bi-key')
  // cancel and reopen
  I.click('.verification-options .mfIcon.bi-key')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal[data-point="multifactor/views/totpProvider"]')
  // now add
  I.waitForText('Add verification option')
  I.click('Add verification option')

  I.waitForText('Google Authenticator or compatible')
  I.click('Google Authenticator or compatible')
  enterCode(getTotp(secret))
  I.waitForVisible('#code')

  secret = await I.grabTextFrom('#code')
  const code = getTotp(secret)
  I.fillField('Authentication code', code)
  dialogs.clickButton('Ok')
  I.waitForText('Authenticator 2')
})

Scenario('Add second TOTP, delete and rename', async ({ I, settings, dialogs }) => {
  I.login('section=io.ox/settings/security/multifactor&settings=virtual/settings/security')
  I.waitForApp()
  await addTOTP()

  I.waitForText('Backup code to access your account.')
  I.click('Backup code to access your account.')
  I.waitForText('Recovery Code')
  I.waitForElement('.multifactorRecoveryCodeDiv')
  dialogs.clickButton('Ok')
  I.waitForText('Authenticator 1')

  await addTOTP()
  I.say('Remove Authenticator 1')
  I.click('~Delete Authenticator 1')
  I.waitForText('This will delete the device named Authenticator 1.')
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal[data-point="multifactor/settings/deleteMultifactor"]')
  I.waitForDetached('li[data-devicename="Authenticator 1"]')

  I.say('Remove My Backup')
  I.click('~Delete My Backup')
  I.waitForText('This will delete the device named My Backup.')
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal[data-point="multifactor/settings/deleteMultifactor"]')
  I.waitForDetached('li[data-devicename="My Backup"]')

  I.say('Edit Authenticator 2')
  I.click('~Edit Authenticator 2')
  I.waitForText('This will edit the name for device (Authenticator 2)')
  I.fillField('Name', 'New Authenticator Name')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal[data-point="multifactor/settings/editMultifactor')
  I.waitForDetached('li[data-devicename="Authenticator 2"]')
  I.waitForText('New Authenticator Name')
})
