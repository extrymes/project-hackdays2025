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

const moment = require('moment-timezone')

Feature('Calendar > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointment and switch timezones', async ({ I, dialogs, settings }) => {
  await I.haveSetting('io.ox/core//timezone', 'Europe/Berlin')
  const time = moment().tz('Europe/Berlin').startOf('isoWeek').add('16', 'hours')

  await I.haveAppointment({
    summary: 'test timezones',
    startDate: { value: time },
    endDate: { value: moment(time).add(1, 'hour') }
  })
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)

  // check in view
  I.waitForVisible('.workweek .title')
  I.seeNumberOfElements({ xpath: '//div[contains(concat(" ", @class, " "), "workweek")]//div[@class="title" and text()="test timezones"]' }, 1)

  // switch to settings
  settings.open('Calendar', 'Additional time zones')

  I.waitForText('Select time zone')
  I.selectOption('Select time zone', 'Tokyo (+09:00) JST')
  I.click('Add time zone')
  I.waitForText('Asia/Tokyo', 5, '.settings-detail-pane li')
  settings.close()

  // switch to calendar
  I.openApp('Calendar')
  I.waitForVisible('.workweek .time-label-bar', 5)
  I.click('.workweek .time-label-bar')
  I.waitForVisible('.timezone-label-dropdown [data-name="Asia/Tokyo"]')
  I.click('.timezone-label-dropdown [data-name="Asia/Tokyo"]')
  I.pressKey('Escape')
  I.waitForVisible('.workweek .timezone')
  I.seeNumberOfElements('.workweek .week-container-label', 2)
  I.see('JST', '.workweek .timezone')
  I.see('7 AM', '.week-container-label:not(.secondary-timezone) .working-time-border:not(.in) .number')
  I.see(moment(time).hour(7).tz('Asia/Tokyo').format('h A'), '.week-container-label.secondary-timezone .working-time-border:not(.in) .number')

  I.click('test timezones', '.workweek .appointment .title')
  I.waitForVisible('.detail-popup [data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit', '.detail-popup')
  I.waitForVisible('.floating-window-content [data-attribute="startDate"] .timezone')
  I.click('.floating-window-content [data-attribute="startDate"] .timezone')

  dialogs.waitForVisible()
  I.waitForText('Start date time zone', 5, dialogs.body)
  I.selectOption('Start date time zone', 'Tokyo (+09:00) JST')
  I.selectOption('End date time zone', 'Tokyo (+09:00) JST')
  dialogs.clickButton('Change')
  I.waitForDetached('.modal-dialog')

  I.waitForText('Europe/Berlin: ')
  I.waitForText('Mon, ' + time.format('l'))
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('4:00\u2009–\u20095:00\u202FPM')

  I.click('Discard', '.floating-window-content')
  dialogs.waitForVisible()
  dialogs.clickButton('Discard changes')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.floating-window-content')

  // switch to settings
  settings.open('Calendar', 'Additional time zones')
  I.waitForText('Asia/Tokyo', undefined, '.settings-detail-pane li')

  // remove extra timezone
  I.click('.settings-detail-pane li [data-action="delete"]')
  I.dontSee('Asia/Tokyo', '.settings-detail-pane ul')
  settings.close()

  // inspect in calendar app
  I.openApp('Calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)

  I.seeNumberOfElements('.workweek .week-container-label', 1)
  I.dontSee('JST', '.workweek')
  I.see('7 AM', '.week-container-label:not(.secondary-timezone) .working-time-border .number')

  // switch to settings
  settings.open()
  I.waitForText('Workweek', 5, '.settings-detail-pane')
  I.selectOption('First day', 'Tuesday')
  I.selectOption('Length', '3 days')
  settings.close()

  // switch to calendar
  I.openApp('Calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)
  I.seeNumberOfElements('.workweek .weekday', 3)
})
