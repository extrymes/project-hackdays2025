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

Feature('General > Connect your device wizard')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// new connect your device wizard, see OXUI-793

Scenario('Show available setup scenarios based on capabilities', async ({ I, topbar, users }) => {
  I.login()
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')

  I.click('Windows PC')
  I.waitForText('OX Drive')
  I.click('OX Drive')
  I.waitForText('OX Drive for Windows')
  I.click('.progress-btn[data-action="reset"]')
  I.waitForText('Which device do you want to configure?')
  I.waitForText('Android')
  I.click('Android')
  await I.waitForText('OX Drive')

  await users[0].hasModuleAccess({ infostore: false })
  I.refreshPage()
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')
  I.click('Windows PC')
  I.waitForText('Mail', 5, '.wizard-container')
  I.dontSee('OX Drive')
  I.click('Back', '.wizard-container')
  I.waitForText('Android')
  I.click('Android')
  I.waitForText('Email with Android Mail')
  I.dontSee('OX Drive')
  await I.click('Close', '.wizard-container')

  await users[0].hasAccessCombination('all')
  I.refreshPage()
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')
  I.click('Android')
  I.waitForText('Calendar')
  I.click('Calendar')
  I.waitForText('URL')
  I.click('Close')
})

Scenario('[OXUI-1126] As a user I can setup Imap, CardDav and CalDav at once on iOS and macOS', async ({ I, topbar, mail, users }) => {
  I.login()
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')
  I.click('macOS')
  I.waitForText('Email, Contacts & Calendar')
  I.click('Email, Contacts & Calendar')
  I.waitForText('Download configuration')
  I.dontSee('Show manual configuration options')
  I.click('.progress-btn[data-action="reset"]')
  I.waitForText('Which device do you want to configure?')
  I.waitForText('iPhone or iPad')
  I.click('iPhone or iPad')
  I.waitForText('Email, Contacts & Calendar')
  I.click('Email, Contacts & Calendar')
  I.waitForElement('.qrcode')
  I.waitForElement('.link')
  I.dontSee('Show manual configuration options')
})

Scenario('Progressbar updates on selection and navigation', async ({ I, topbar }) => {
  I.login()
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')
  I.waitForElement('.progress-step-one.active')
  I.click('Android')
  I.waitForElement('.progress-step-two.active')
  I.dontSeeElement('.progress-step-one.active')
  I.waitForText('Android', 5, '.progress-steps')
  I.waitForText('Email with Android Mail')
  I.click('Email with Android Mail')
  I.waitForElement('.progress-step-three.active')
  I.dontSeeElement('.progress-step-two.active')
  I.waitForText('Mail', 5, '.progress-steps')
  I.waitForText('IMAP')
  I.click('.progress-step-two')
  I.waitForElement('.progress-step-two.active')
  I.dontSeeElement('.progress-step-three.active')
  I.waitForText('Email with Android Mail')
  I.click('Email with Android Mail')
  I.waitForText('IMAP')
  I.click('.progress-step-one')
  I.waitForElement('.progress-step-one.active')
  I.dontSeeElement('.progress-step-three.active')
  I.dontSee('Android', '.progress-steps')
  I.dontSee('Mail', '.progress-steps')
})

Scenario('Generate QR codes for app downloads', async ({ I, topbar, users }) => {
  users[0].context.hasCapability('mobile_mail_app')
  I.login('app=io.ox/mail')
  topbar.connectDeviceWizard()
  I.waitForText('Which device do you want to configure?')
  I.waitForText('Android')
  I.click('Android')
  I.waitForText('Email with OX Mail')
  I.click('Email with OX Mail')
  I.waitForVisible('.qrcode')
  I.click('Back', '.wizard-container')
  I.waitForText('OX Drive')
  I.click('OX Drive')
  I.waitForVisible('.qrcode')
  I.click('.progress-step-one')
  I.waitForText('iPhone or iPad')
  I.click('iPhone or iPad')
  I.waitForText('Email with OX Mail')
  I.click('Email with OX Mail')
  I.waitForVisible('.qrcode')
  I.click('Back', '.wizard-container')
  I.waitForText('OX Drive')
  I.click('OX Drive')
  I.waitForVisible('.qrcode')
  I.click('Close', '.wizard-container')
})

Scenario('Change product names and check for different platforms', async ({ I, topbar, users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])

  await users[0].context.hasCapability('mobile_mail_app')

  const checkAppNames = async (mailAppName, driveAppName) => {
    I.waitForText('Which device do you want to configure?')
    I.waitForText('Android')
    I.click('Android')
    I.waitForText(mailAppName)
    I.click(mailAppName)
    I.waitForText(mailAppName, 5, '.progress-steps')
    I.waitForText(`To install ${mailAppName}`)
    I.click('Back', '.wizard-container')
    I.waitForText(driveAppName)
    I.click(driveAppName)
    I.waitForText(driveAppName, 5, '.progress-steps')
    I.waitForText(`To install ${driveAppName}`)
    I.click('.progress-step-one')
    I.waitForText('iPhone')
    I.click('iPhone')
    I.waitForText(mailAppName)
    I.waitForText(driveAppName)
  }
  await session('Alice', async () => {
    await I.haveSetting({
      'io.ox/onboarding': {
        'productNames/mail': 'Awesome Mail App'
      }
    })
    I.login('app=io.ox/mail')
    topbar.connectDeviceWizard()
    await checkAppNames('Awesome Mail App', 'OX Drive')
  })

  await session('Bob', async () => {
    await I.haveSetting({
      'io.ox/onboarding': {
        'productNames/drive': 'Awesome Drive App'
      }
    }, { user: users[1] })
    I.login('app=io.ox/mail', { user: users[1] })
    topbar.connectDeviceWizard()
    await checkAppNames('OX Mail', 'Awesome Drive App')
  })

  await session('Charlie', async () => {
    await I.haveSetting({
      'io.ox/onboarding': {
        'productNames/mail': 'Awesome Mail App',
        'productNames/drive': 'Awesome Drive App'
      }
    }, { user: users[2] })
    I.login('app=io.ox/mail', { user: users[2] })
    topbar.connectDeviceWizard()
    await checkAppNames('Awesome Mail App', 'Awesome Drive App')
  })
})

Scenario('Connect your device wizard supports upsell', async ({ I, topbar, mail, users }) => {
  // access combination groupware disables active_sync capability
  await users[0].hasAccessCombination('pim')
  I.wait(5) // wait for access combination to be applied (this could be improved by polling e.g.)

  I.login()
  I.waitForApp()
  topbar.connectDeviceWizard()

  // Scenario 1: Upsell is not enabled && capability is disabled (don't show EAS entry)
  I.waitForText('Which device do you want to configure?', 5, '.wizard-container')
  I.click('iPhone or iPad', '.wizard-container')
  I.waitForText('Which application do you want to use?', 5, '.wizard-container')
  I.dontSee('Exchange Active Sync', '.wizard-container')

  await I.haveSetting({
    'io.ox/core': {
      'upsell/activated': true,
      'upsell/enabled': { active_sync: true, caldav: true, carddav: true }
    }
  })
  I.refreshPage()
  I.waitForApp()
  await I.executeAsyncScript(async (done) => {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.on('upsell:requires-upgrade', () => { document.body.classList.add('upsell-triggered') })
    done()
  })
  topbar.connectDeviceWizard()

  // Scenario 2: Upsell is enabled && capability is disabled (show locked EAS entry)
  I.waitForText('Which device do you want to configure?', 5, '.wizard-container')
  I.click('iPhone or iPad', '.wizard-container')

  I.waitForText('Which application do you want to use?', 5, '.wizard-container')
  I.waitForVisible(locate('.list-btn.disabled .list-description').withText('Calendar').as('Calendar'))
  I.waitForVisible(locate('.list-btn.disabled .list-description').withText('Contacts').as('Contacts'))
  I.waitForVisible(locate('.list-btn.disabled .list-description').withText('Exchange Active Sync').as('Exchange Active Sync'))
  I.click('Exchange Active Sync', '.wizard-container')

  // check if event "upsell:requires-upgrade" was fired by checking if body has class "upsell-triggered"
  I.waitForElement('.upsell-triggered')

  // enable active_sync again, check if upsell is not offered
  await users[0].hasAccessCombination('all')
  I.wait(5) // wait for access combination to be applied (this could be improved by polling e.g.)

  I.refreshPage()
  I.waitForApp()
  topbar.connectDeviceWizard()

  // Scenario 3: Upsell is enabled && user does not have capability (show unlocked EAS entry)
  I.waitForText('Which device do you want to configure?', 5, '.wizard-container')
  I.click('iPhone or iPad', '.wizard-container')

  I.waitForText('Which application do you want to use?', 5, '.wizard-container')
  I.waitForText('Exchange Active Sync', 5, '.wizard-container')
  I.dontSeeElement(locate('.list-btn.disabled .list-description').withText('Calendar').as('Calendar'))
  I.dontSeeElement(locate('.list-btn.disabled .list-description').withText('Contacts').as('Contacts'))
  I.dontSeeElement(locate('.list-btn.disabled .list-description').withText('Exchange Active Sync').as('Exchange Active Sync'))
  I.click('Exchange Active Sync', '.wizard-container')
  I.waitForVisible('.wizard-container .qrcode')
})
