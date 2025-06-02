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

Feature('Theming > Logo change')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-2011] Two logos appear', async ({ I, users, mail }) => {
  await users[0].context.hasCapability('dynamic-theme')
  await I.haveSetting({
    'io.ox/dynamic-theme': {
      logoURL: 'themes/default/logo_180.png',
      mainColor: '#abcdef'
    }
  })

  // Case 0: Normal logo
  async function useStandartLogo () {
    I.changeTheme({ theme: 'White' })
    I.seeElement('.logo-btn>div>img')
    I.seeNumberOfElements('#io-ox-top-logo>*', 1)
  }

  // Case 1: OX logo
  function useOxLogo () {
    I.executeScript(async function () {
      // @ts-ignore
      const { default: ox } = await import(String(new URL('ox.js', location.href)))

      ox.serverConfig.useOXLogo = true
    })
    // Change themes for rendering logos
    I.changeTheme({ theme: 'Dark' })
    I.changeTheme({ theme: 'White' })
    I.seeElement('.logo-container>svg[style="height: 24px;"]')
    I.seeNumberOfElements('.logo-container>*', 1)
  }

  // Case 2: Dynamic logo
  async function useDynamicLogo () {
    await Promise.resolve(I.executeScript(async function () {
      // @ts-ignore
      const { settings: dynamicSettings } = await import(String(new URL('io.ox/core/theming/dynamic/settings.js', location.href)))
      dynamicSettings.set('logoURL', 'themes/default/assets/box_logo128.png')
    })).then(() => {
    // Change themes for rendering logos
      I.changeTheme({ theme: 'Dark' })
      I.changeTheme({ theme: 'White' })
      I.seeElement('.logo-container>img')
      I.seeNumberOfElements('.logo-container>*', 1)
    })
  }

  async function restoreSettings () {
    await I.executeScript(async function () {
      // @ts-ignore
      const { default: ox } = await import(String(new URL('ox.js', location.href)))
      ox.serverConfig.useOXLogo = false
    })
    await I.executeScript(async function () {
      // @ts-ignore
      const { settings: dynamicSettings } = await import(String(new URL('io.ox/core/theming/dynamic/settings.js', location.href)))
      dynamicSettings.set('logoURL', '')
    })
  }

  const functions = [useStandartLogo, useOxLogo, useDynamicLogo]

  I.login('app=io.ox/mail')
  I.waitForApp()
  await restoreSettings()
  await Promise.all(functions.map(func => func()))
  I.logout()

  await restoreSettings()
  await I.haveSetting('io.ox/core//logoAction', 'https://www.open-xchange.com/')

  I.login('app=io.ox/mail')
  I.waitForApp()
  await restoreSettings()
  await Promise.all(functions.map(func => func()))
})

Scenario('Logo style is computed correctly', async ({ I, users }) => {
  await Promise.all([
    users[0].context.hasCapability('dynamic-theme'),
    I.haveSetting({
      'io.ox/dynamic-theme': {
        logoWidth: 107,
        logoHeight: 23,
        logoURL: 'themes/default/logo_180.png'
      }
    })
  ])

  I.login()
  I.waitForApp()
  I.waitForVisible('.logo-btn>div>img')
  // Check if logo has correct computed size and position
  // @ts-ignore
  const { x, y, width, height } = await I.grabElementBoundingRect('.logo-btn>div>img')
  assert.equal(width, 107, 'Logo width is not correct')
  assert.equal(height, 23, 'Logo height is not correct')
  assert.equal(x, 18, 'Logo x position is not correct')
  assert.equal(y, 24.5, 'Logo y position is not correct')
})
