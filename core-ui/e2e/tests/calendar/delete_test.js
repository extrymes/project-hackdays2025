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

const moment = require('moment')

Feature('Calendar > Delete')

Before(async ({ I, users }) => {
  await users.create()
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'week:week' }
  })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7466] Delete one appointment of an series', async ({ I, calendar, dialogs }) => {
  await I.haveAppointment({
    summary: 'C7466',
    location: 'C7466',
    description: 'C7466',
    attendeePrivileges: 'DEFAULT',
    rrule: 'FREQ=WEEKLY;BYDAY=' + moment().format('dd') + '', // cSpell:disable-line
    startDate: { value: moment().format('YYYYMMDD') },
    endDate: { value: moment().format('YYYYMMDD') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.click('.next')
  I.waitForElement('~C7466, C7466', 5)
  I.click('~C7466, C7466')

  I.say('Delete')
  I.waitForElement('.detail-popup')
  I.waitForElement('~Delete')
  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete this appointment')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('~C7466, C7466')
  I.click('Today')
  I.waitForElement('~C7466, C7466', 5)
  I.click('.next')
  I.waitForDetached('~C7466, C7466', 5)
  I.click('.next')
  I.waitForElement('~C7466, C7466', 5)
  I.click('.next')
  I.waitForElement('~C7466, C7466', 5)
  I.click('.next')
  I.waitForElement('~C7466, C7466', 5)
  I.click('.next')
  I.waitForElement('~C7466, C7466', 5)
})

Scenario('[C7468] Delete an appointment', async ({ I, calendar }) => {
  await I.haveAppointment({
    summary: 'C7468',
    location: 'C7468',
    description: 'C7468',
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().add(1, 'hours') },
    startDate: { value: moment() }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('~C7468, C7468', 5)
  I.click('~C7468, C7468')
  I.waitForElement('.detail-popup', 5)

  calendar.deleteAppointment()
  I.waitForDetached('~C7468, C7468')
})

Scenario('[C7469] Delete a whole-day appointment', async ({ I, calendar }) => {
  await I.haveAppointment({
    summary: 'C7469',
    location: 'C7469',
    description: 'C7469',
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().format('YYYYMMDD') },
    startDate: { value: moment().format('YYYYMMDD') }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForVisible('~C7469, C7469')
  I.click('~C7469, C7469')
  I.waitForVisible('.detail-popup')

  calendar.deleteAppointment()
  I.waitForDetached('~C7469, C7469')
})
