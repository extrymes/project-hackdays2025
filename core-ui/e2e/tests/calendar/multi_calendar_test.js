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

Feature('Calendar > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointments in workweekview', async ({ I, users, calendar }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
  const defaultFolderId = `cal://0/${await I.grabDefaultFolder('calendar')}`
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: defaultFolderId })

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)

  calendar.switchView('Workweek')

  I.click('~Next week')

  // create in Workweek view
  await I.createAppointment({ subject: 'test appointment one', folder: users[0].get('sur_name') + ', ' + users[0].get('given_name'), startTime: '4:00 PM' })

  // check in Workweek view
  calendar.switchView('Workweek')
  I.waitForText('test appointment one', 5, '.workweek')
  I.see('test appointment one', '.workweek .appointment .title')

  I.seeNumberOfElements('.workweek .appointment .title', 1)

  I.createAppointment({ subject: 'test appointment two', folder: 'New calendar', startTime: '5:00 PM' })

  // check in Workweek view
  calendar.switchView('Workweek')
  I.waitForText('test appointment one', 5, '.workweek')
  I.waitForText('test appointment two', 5, '.workweek')
  I.see('test appointment one', '.workweek .appointment .title')
  I.see('test appointment two', '.workweek .appointment .title')
  I.seeNumberOfElements('.workweek .appointment .title', 2)

  // switch off New calendar
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.seeNumberOfElements('.workweek .appointment .title', 1)

  // switch on again
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.see('test appointment two', '.workweek .appointment .title')
  I.seeNumberOfElements('.workweek .appointment .title', 2)
})

Scenario('Create appointments in weekview @smoketest', async ({ I, users, calendar }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
  const defaultFolderId = `cal://0/${await I.grabDefaultFolder('calendar')}`
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: defaultFolderId })

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)

  calendar.switchView('Week')

  calendar.newAppointment()
  I.waitForText('Title', 30, '.io-ox-calendar-edit')
  I.fillField('summary', 'test appointment one')
  I.fillField('Starts on', moment().format('L'))
  I.clearField('~Start time')
  I.fillField('~Start time', '4:00 PM')
  I.click('.folder-selection button.dropdown-toggle')
  I.clickDropdown('New calendar')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  calendar.newAppointment()
  I.waitForText('Title', 30, '.io-ox-calendar-edit')
  I.fillField('summary', 'test appointment two')
  I.fillField('Starts on', moment().format('L'))
  I.clearField('~Start time')
  I.fillField('~Start time', '5:00 PM')
  I.click('.folder-selection button.dropdown-toggle')
  I.clickDropdown(users[0].get('sur_name') + ', ' + users[0].get('given_name'))
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  // check in Week view
  I.waitForText('test appointment one', 5, '.week')
  I.waitForText('test appointment two', 5, '.week')
  I.see('test appointment one', '.weekview-container.week .appointment .title')
  I.see('test appointment two', '.weekview-container.week .appointment .title')
  I.seeNumberOfElements('.weekview-container.week .appointment .title', 2)

  // switch off New calendar
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.seeNumberOfElements('.weekview-container.week .appointment .appointment-content .title', 1)

  // switch on again
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.see('test appointment one', '.week .appointment .title')
  I.seeNumberOfElements('.weekview-container.week .appointment .appointment-content .title', 2)
})

Scenario('Create appointments in monthview', async ({ I, users, calendar }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
  const defaultFolderId = `cal://0/${await I.grabDefaultFolder('calendar')}`
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: defaultFolderId })

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window', 5)

  calendar.switchView('Month')

  I.createAppointment({ subject: 'test appointment one', folder: users[0].get('sur_name') + ', ' + users[0].get('given_name'), startTime: '4:00 PM' })
  I.createAppointment({ subject: 'test appointment two', folder: 'New calendar', startTime: '5:00 PM' })

  // check in Month view
  I.waitForText('test appointment one', 5, '.month-container')
  I.waitForText('test appointment two', 5, '.month-container')
  I.see('test appointment one', '.month-container .appointment .title')
  I.see('test appointment two', '.month-container .appointment .title')
  I.seeNumberOfElements('.month-container .appointment .title', 2)

  // switch off New calendar
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.seeNumberOfElements('.month-container .appointment .appointment-content .title', 1)

  // switch on again
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.see('test appointment two', '.month-container .appointment .title')
  I.seeNumberOfElements('.month-container .appointment .appointment-content .title', 2)
})

Scenario('Create appointments in dayview', async ({ I, users, calendar }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
  const defaultFolderId = `cal://0/${await I.grabDefaultFolder('calendar')}`
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: defaultFolderId })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // create in Day view
  calendar.switchView('Day')

  calendar.newAppointment()
  I.fillField('Starts on', moment().format('L'))
  I.fillField('Title', 'test appointment one')
  I.fillField('~Start time', '4:00 PM')
  I.click('.folder-selection button')
  I.clickDropdown('New calendar')
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.newAppointment()
  I.fillField('Starts on', moment().format('L'))
  I.fillField('Title', 'test appointment two')
  I.fillField('~Start time', '5:00 PM')
  I.click('.folder-selection button')
  I.clickDropdown(users[0].get('sur_name') + ', ' + users[0].get('given_name'))
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // check in Day view
  I.waitForText('test appointment one', 5, '.weekview-container')
  I.waitForText('test appointment two', 5, '.weekview-container')

  I.see('test appointment one', '.weekview-container.day .appointment .title')
  I.see('test appointment two', '.weekview-container.day .appointment .title')
  I.seeNumberOfElements('.weekview-container.day .appointment .title', 2)

  // switch off New calendar
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.seeNumberOfElements('.weekview-container.day .appointment .title', 1)

  // switch on again
  I.waitForElement('[aria-label^="New calendar"] .color-label')
  I.click('[aria-label^="New calendar"] .color-label', '.window-sidepanel')
  I.see('test appointment one', '.weekview-container.day .appointment .title')
  I.seeNumberOfElements('.weekview-container.day .appointment .title', 2)
})
