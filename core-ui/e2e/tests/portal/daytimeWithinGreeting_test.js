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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7497] Daytime within Greeting', async ({ I, settings }) => {
  const moment = require('moment')

  let currentHour = moment().hour()
  let counter = 0
  const timeZones = ['America/Vancouver', 'Antarctica/Mawson', 'America/Barbados',
    'Asia/Tomsk', 'America/Havana', 'Asia/Tokyo']

  function checkTime () {
    if (currentHour >= 4 && currentHour <= 11) {
      I.see('Good morning', '.greeting-phrase')
    } else if (currentHour >= 18 && currentHour <= 23) {
      I.see('Good evening', '.greeting-phrase')
    } else {
      I.see('Hello', '.greeting-phrase')
    }
  }

  async function updateCurrentTime () {
    return await I.executeScript(async function () {
      const { moment } = await import(String(new URL('e2e.js', location.href)))
      return moment().hour()
    })
  }

  I.login('app=io.ox/portal')
  I.waitForApp()
  I.waitForVisible('.io-ox-portal')
  I.waitForVisible('.greeting-phrase')

  checkTime()

  while (counter < timeZones.length) {
    settings.open('General', 'Language & Time zone')
    I.waitForText('Time zone')
    I.selectOption('Time zone', timeZones[counter]) // -7
    // wait for visual hint
    I.waitForVisible('.settings-hint.reload-page')
    I.click('.close-settings')
    I.waitForDetached('.settings-detail-pane')
    I.refreshPage()
    I.waitForApp()
    I.waitForVisible('.greeting-phrase', 20)
    currentHour = await updateCurrentTime()
    checkTime()
    counter++
  }
})
