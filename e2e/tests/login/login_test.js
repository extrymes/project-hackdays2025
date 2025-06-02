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

const { expect } = require('chai')

Feature('Login')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7336] Successful Login', async ({ I, users }) => {
  await users[0].hasConfig('io.ox/core//autoStart', 'io.ox/mail')
  I.amOnPage('')
  I.setCookie({ name: 'locale', value: 'en_US' })
  I.refreshPage()

  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', `${users[0].get('name')}@${users[0].context.id}`)
  I.fillField('Password', users[0].get('password'))
  I.click('Sign in')
  I.waitForText('No message selected', 30)
})

Scenario('[C7337] Unsuccessful Login', ({ I, users }) => {
  I.amOnPage('')
  I.setCookie({ name: 'locale', value: 'en_US' })
  I.refreshPage()
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', `${users[0].get('name')}@${users[0].context.id}`)
  I.fillField('Password', 'wrong password')
  I.click('Sign in')
  I.waitForText('The user name or password is incorrect.')
})

Scenario('[C7339] Stay signed in checkbox', async ({ I, users }) => {
  I.amOnPage('')
  I.setCookie({ name: 'locale', value: 'en_US' })
  I.refreshPage()
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', `${users[0].get('name')}@${users[0].context.id}`)
  I.fillField('Password', `${users[0].get('password')}`)
  I.seeCheckboxIsChecked('Stay signed in')
  I.click('Sign in')
  I.waitForVisible('#io-ox-core', 20)
  let cookies = await I.grabCookie()
  let secretCookie = cookies.filter(c => c.name.indexOf('open-xchange-secret') === 0)[0]

  const hasProperty = (o, p) => Object.prototype.hasOwnProperty.call(o, p)
  // webdriver sets "expiry" and puppeteer sets "expires"
  const expiresWithSession = c => hasProperty(c, 'expires') ? c.expires < 0 : !hasProperty(c, 'expiry')

  expect(expiresWithSession(secretCookie), 'browser session cookies do expire with session').to.equal(false)
  I.refreshPage()
  I.waitForVisible('#io-ox-topbar-account-dropdown-icon', 20)
  I.logout()

  I.waitForFocus('#io-ox-login-username', 30)
  I.uncheckOption('Stay signed in')
  I.login()
  I.waitForVisible('#io-ox-core', 20)
  cookies = await I.grabCookie()
  secretCookie = cookies.filter(c => c.name.indexOf('open-xchange-secret') === 0)[0]
  const sessionCookies = cookies.filter(expiresWithSession)

  expect(expiresWithSession(secretCookie), 'browser session cookies do expire with session').to.equal(true)
  // simulate a browser restart by removing all session cookies
  for (const cookie of sessionCookies) {
    I.clearCookie(cookie.name)
  }
  I.refreshPage()
  I.waitForVisible('#io-ox-login-screen', 20)
})

Scenario('[C7340] Successful logout', ({ I }) => {
  I.login()
  I.logout()
  I.waitForVisible('#io-ox-login-screen')
})

Scenario('[C163025] Screen gets blured when session times out', ({ I }) => {
  I.login()
  I.clearCookie()
  I.waitForElement('.abs.unselectable.blur')
})

Scenario('[OXUIB-74] Redirect during autologin using LGI-0016 error', async ({ I }) => {
  I.startMocking()
  I.mockRequest('GET', `${process.env.LAUNCH_URL}/api/login?action=autologin`, {
    error: 'http://duckduckgo.com/',
    error_params: ['http://duckduckgo.com/'],
    code: 'LGI-0016'
  })
  I.mockRequest('GET', `${process.env.LAUNCH_URL}/api/apps/manifests?action=config*`, {
    data: {}
  })
  I.amOnPage('')
  await I.executeAsyncScript(async function (done) {
    const { default: ext } = await import(String(new URL('io.ox/core/extensions.js', location.href)))
    const { _ } = await import(String(new URL('e2e.js', location.href)))
    ext.point('io.ox/core/boot/login').extend({
      id: 'break redirect',
      after: 'autologin',
      login: function () {
        _.url.redirect('http://example.com/')
      }
    })
    done()
  })
  I.waitInUrl('duckduckgo.com', 5)
  I.stopMocking()
}).config('Puppeteer', { waitForNavigation: 'domcontentloaded' })

Scenario('[OXUIB-651] Login not possible with Chrome and umlauts in username', async ({ I }) => {
  I.amOnPage('')
  I.setCookie({ name: 'locale', value: 'en_US' })
  I.refreshPage()
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', 'mister@Täst.com') // cSpell:disable-line
  I.pressKey('Enter')
  const email = await I.grabValueFrom('#io-ox-login-username')
  expect(email).to.equal('mister@Täst.com') // cSpell:disable-line
})

Scenario('Login with invalid session parameter', async ({ I, mail }) => {
  I.login()
  const currentUrl = await I.grabCurrentUrl()
  I.amOnPage(currentUrl + '&session=invalid')
  I.refreshPage()
  I.waitForApp()
})

Scenario('Login fails with wrong username, correct password', async ({ I, users }) => {
  I.amOnPage('')
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', 'wrong')
  I.fillField('Password', users[0].get('password'))
  I.click('Sign in')
  I.waitForText('The user name or password is incorrect. (LGI-0006)')
})

Scenario('Login fails with no username, correct password', async ({ I, users }) => {
  I.amOnPage('')
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('Password', users[0].get('password'))
  I.click('Sign in')
  I.waitForText('Please enter your credentials. (UI-0001)')
})

Scenario('Login fails with correct username, no password', async ({ I, users }) => {
  I.amOnPage('')
  I.waitForFocus('#io-ox-login-username', 30)
  I.fillField('User name', `${users[0].get('name')}@${users[0].context.id}`)
  I.click('Sign in')
  I.waitForText('Please enter your password. (UI-0002)')
})

Scenario('Login fails with no username, no password', async ({ I, users }) => {
  I.amOnPage('')
  I.waitForFocus('#io-ox-login-username', 30)
  I.click('Sign in')
  I.waitForText('Please enter your credentials. (UI-0001)')
})
