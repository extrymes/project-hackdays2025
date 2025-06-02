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

const util = require('@open-xchange/codecept-helper/src/util.js')
const rootUrl = util.getURLRoot()

Feature('General > Configuration Validity')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Configuration validity: enforceDynamicTheme, invalid', ({ I }) => {
  I.amOnPage(`${rootUrl}/blank.html`)
  I.executeScript(() => { sessionStorage.setItem('puppeteer', JSON.stringify({ serverConfig: { enforceDynamicTheme: true } })) })
  I.login('app=io.ox/mail&language=en')
  I.waitForVisible('#showstopper')
  I.see('Error')
  I.see('Some mandatory configuration could not be loaded')
  I.see('(dynamic-theme)')
})

Scenario('Configuration validity: enforceDynamicTheme, valid', ({ I, mail }) => {
  I.amOnPage(`${rootUrl}/blank.html`)
  I.executeScript(() => {
    sessionStorage.setItem('puppeteer', JSON.stringify({
      serverConfig: { enforceDynamicTheme: true },
      settings: { 'io.ox/dynamic-theme': { mainColor: 'purple', logoURL: 'something' } }
    }))
  })

  I.login('app=io.ox/mail&language=en')
  I.waitForApp()
})

Scenario('Configuration validity: capabilities missing', ({ I }) => {
  I.amOnPage(`${rootUrl}/blank.html`)
  I.executeScript(() => { sessionStorage.setItem('puppeteer', JSON.stringify({ serverConfig: { capabilities: [] } })) })
  I.login('app=io.ox/mail&language=en')
  I.see('Error')
  I.see('Some mandatory configuration could not be loaded')
  I.see('(capabilities)')
})

Scenario('Configuration validity: default folders missing', ({ I }) => {
  I.amOnPage(`${rootUrl}/blank.html`)
  I.executeScript(() => { sessionStorage.setItem('puppeteer', JSON.stringify({ settings: { 'io.ox/mail': { defaultFolder: {} } } })) })
  I.login('app=io.ox/mail&language=en')
  I.see('Error')
  I.see('Some mandatory configuration could not be loaded')
  I.see('(default-mail-folders)')
})

Scenario('Configuration validity: inbox missing', ({ I }) => {
  I.amOnPage(`${rootUrl}/blank.html`)
  I.executeScript(() => { sessionStorage.setItem('puppeteer', JSON.stringify({ settings: { 'io.ox/mail': { defaultFolder: { inbox: '' } } } })) })
  I.login('app=io.ox/mail&language=en')
  I.see('Error')
  I.see('Some mandatory configuration could not be loaded')
  I.see('(inbox)')
})
