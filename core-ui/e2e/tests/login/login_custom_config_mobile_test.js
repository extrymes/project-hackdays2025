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

const assert = require('node:assert')

Feature('Login > Page Configuration')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('I can configure the mobile login page appearance @mobile', async ({ I }) => {
  const loginConfig = {
    forgotPassword: true,
    loginPage: {
      mobile: {
        header: {
          textColor: 'rgb(6, 6, 6)'
        }
      },
      backgroundColor: 'rgb(255, 255, 255)',
      teaser: '<div id="custom-teaser" style="color:#00ff00;display:flex;flex-direction:column;justify-content:center;height:100%;"><h1 style="text-transform:uppercase;font-family:monospace;font-size:64px;text-align:center;font-weight:700;">lorem ipsum sit dolor</h1></div>',
      topVignette: {
        transparency: '0.5'
      },
      header: {
        textColor: 'rgb(0, 0, 0)',
        linkColor: 'rgb(1, 1, 1)',
        sorting: '$spacer,$language,$copyright,some text,$imprint,$spacer,$logo'
      },
      form: {
        textColor: 'rgb(2, 2, 2)',
        linkColor: 'rgb(3, 3, 3)',
        header: {
          title: 'Test App Suite',
          bgColor: 'rgb(4, 4, 4)',
          textColor: 'rgb(254, 254, 254)'
        },
        button: {
          bgColor: 'rgb(5, 5, 5)',
          textColor: 'rgb(253, 253, 253)'
        }
      },
      informationMessage: '<div id="information-message">Some text and link: <a target="_blank" data-i18n="Imprint" href="https://www.open-xchange.com/legal/">Imprint</a></div>',
      footer: {
        sorting: '$spacer,$copyright,Version: $version,$privacy,$imprint,$spacer',
        $privacy: 'https://www.open-xchange.com/privacy/',
        $imprint: 'https://www.open-xchange.com/legal/',
        copyright: '(c) $year OX Software GmbH',
        bgColor: 'rgb(6, 6, 6)',
        textColor: 'rgb(252, 252, 252)',
        linkColor: 'rgb(251, 251, 251)'
      }
    },
    copyright: '(c) 2016-2023 OX Software GmbH',
    productName: 'OX App Suite',
    languages: []
  }

  I.startMocking()
  I.mockRequest('GET', `${process.env.LAUNCH_URL}api/apps/manifests?action=config*`, { data: loginConfig })
  I.amOnPage('')
  I.stopMocking()
  I.waitForFocus('#io-ox-login-username')

  const config = loginConfig.loginPage

  // 01 background
  I.seeCssPropertiesOnElements('#io-ox-login-container', { background: `${config.backgroundColor} none repeat scroll 0% 0% / cover padding-box border-box` })

  // 02 header
  I.seeCssPropertiesOnElements('#io-ox-login-header .composition-element span', { color: config.mobile.header.textColor })
  I.seeCssPropertiesOnElements('#io-ox-login-header>#io-ox-login-toolbar>span', { color: config.mobile.header.textColor }) // mobile overwrites here!
  I.seeCssPropertiesOnElements('#io-ox-login-header span a', { color: config.header.linkColor })
  I.seeCssPropertiesOnElements('#io-ox-login-screen #io-ox-login-header', { background: `rgba(0, 0, 0, 0) linear-gradient(rgba(0, 0, 0, ${config.topVignette.transparency}), rgba(0, 0, 0, 0)) repeat scroll 0% 0% / auto padding-box border-box` })

  // 03 form box
  I.seeCssPropertiesOnElements('#box-form-header', { display: 'none' })
  I.seeCssPropertiesOnElements('#login-title-mobile', { color: config.mobile.header.textColor })
  I.seeCssPropertiesOnElements('#io-ox-login-box label', { color: config.form.textColor })
  I.seeCssPropertiesOnElements('#io-ox-login-box .title', { color: config.form.textColor })
  I.seeCssPropertiesOnElements('#io-ox-forgot-password a', { color: config.form.linkColor })
  I.seeCssPropertiesOnElements('#io-ox-login-button', { 'background-color': config.form.button.bgColor })
  I.seeCssPropertiesOnElements('#io-ox-login-button', { color: config.form.button.textColor })

  // 04 footer
  I.seeCssPropertiesOnElements('#io-ox-login-footer', { background: `${config.footer.bgColor} none repeat scroll 0% 0% / auto padding-box border-box` })
  I.seeCssPropertiesOnElements('#io-ox-login-footer .composition-element span', { color: config.footer.textColor })
  I.seeCssPropertiesOnElements('#io-ox-login-footer>span', { color: config.footer.textColor })
  I.seeCssPropertiesOnElements('#io-ox-login-footer span a', { color: config.footer.linkColor })

  I.waitForText('Test App Suite', 5, '#login-title-mobile')
  assert.equal(await I.grabHTMLFrom('#io-ox-information-message'), config.informationMessage)
}).config('Puppeteer', { waitForNavigation: ['domcontentloaded', 'networkidle2'] })
