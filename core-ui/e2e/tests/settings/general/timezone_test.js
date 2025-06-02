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

Feature('Settings > Basic')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7758] Set timezone', async ({ I, users, settings }) => {
  // create appointment
  // let's use a fixed date to avoid problems
  // with daylight saving time around the globe.
  // time is 14:00 CEST, so 12:00 UTC.
  await I.haveAppointment({
    summary: 'Timezone test',
    startDate: { value: '20190403T140000' },
    endDate: { value: '20190403T150000' },
    attendees: [{ entity: users[0].get('id') }]
  })
  await I.haveSetting('io.ox/calendar//layout', 'month')

  // check major timezones
  const timezones = {
    'Australia/Adelaide': '10:30 PM', // +10.5
    'Asia/Hong_Kong': '8:00 PM', // +8
    'America/New_York': '8:00 AM', // -4
    'America/Los_Angeles': '5:00 AM', // -7
    'Europe/Berlin': '2:00 PM'
  }

  for (const id in timezones) {
    I.login('settings=virtual/settings/io.ox/core')
    I.waitForApp()
    settings.expandSection('Language & Time zone')
    I.waitForText('Time zone')
    I.selectOption('Time zone', id)
    I.waitForVisible('.settings-hint.reload-page')
    settings.close()
    I.logout()

    I.login('app=io.ox/calendar')
    I.waitForText('New appointment')
    I.waitForText('Today')
    I.executeScript(async function () {
      const { default: ox } = await import(String(new URL('ox.js', location.href)))
      // go to 2019-04-06 (not 1) to ensure we land in April
      ox.ui.App.getCurrentApp().setDate(1554595200000)
    })
    I.waitForText('Timezone test')
    I.waitForText(timezones[id])
    I.logout()
  }
})
