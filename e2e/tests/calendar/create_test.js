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
const moment = require('moment')

Feature('Calendar > Create')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointment with all fields', ({ I, calendar, dialogs, users }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click('~Next week', '.page.current')

  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('Title', 'test title')
  I.fillField('Location', 'test location')
  I.fillField('Description', 'test description')
  I.fillField('Participants and resources', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.selectOption('Visibility', 'Private')
  I.checkOption('All day')
  I.checkOption('Show as free')
  I.click('No reminder')
  dialogs.waitForVisible()
  I.waitForText('Add reminder', 5, dialogs.body)
  I.click('Add reminder')
  I.waitForVisible('.alarm-list-item')
  I.waitForText('15 minutes', 5, '.alarm-list-item')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Notify 15 minutes before start')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  calendar.moveCalendarViewToNextWeek()
  I.waitForElement('.page.current .appointment-panel .appointment.private.free')
  calendar.switchView('Day')
  I.waitForText('test title', 5, '.day')
  I.see('test location', '.day')
  I.seeElement('.page.current .appointment-panel .appointment.private.free')
  I.seeElement('.confidential-flag')

  calendar.switchView('Workweek')
  I.waitForText('test title', 5, '.workweek')
  I.see('test location', '.workweek')
  I.seeElement('.page.current .appointment-panel .appointment.private.free')
  I.seeElement('.confidential-flag')

  calendar.switchView('Month')
  I.waitForText('test title', 5, '.month')
  I.see('test location', '.month')
  I.seeElement('.page.current .appointment.private.free')
  I.seeElement('.confidential-flag')

  calendar.switchView('List')
  I.waitForText('test title', 5, '.calendar-detail-pane')
  I.see('test location', '.calendar-detail-pane')
  I.see('test description', '.calendar-detail-pane')
  I.see(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, '.calendar-detail-pane')
  I.see('Shown as Free', '.calendar-detail-pane')
  I.seeElement('.bi-eye-slash')

  // delete the appointment thus it does not create conflicts for upcoming appointments
  I.click('test title', '.calendar-list-view')
  I.waitForElement('~Delete')
  I.click('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.appointment')
})

Scenario('Fullday appointments', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Fullday')
  I.checkOption('All day')
  calendar.setDate('startDate', moment().startOf('week').add('1', 'day'))
  calendar.setDate('endDate', moment().endOf('week').subtract('1', 'day'))
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  I.click('Fullday', '.weekview-container.week .appointment')
  I.waitForText('5 days', 5, '.detail-popup .calendar-detail')
  calendar.deleteAppointment()
})

Scenario('Save appointment with keyboard shortcut', async ({ I, calendar }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.pressKey('c')
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

  I.fillField('Title', 'Shortcut')
  I.checkOption('All day')
  I.pressKey(['CommandOrControl', 'Enter'])
  I.waitForDetached(calendar.editWindow)

  I.waitForText('Shortcut', 5, '.weekview-container.week .appointment')
})

Scenario('[C64409] Enter start time and press enter key', ({ I, calendar }) => {
  I.login('app=io.ox/calendar')

  I.waitForApp()
  calendar.newAppointment()

  I.click('~Start time')
  I.clearField('~Start time')
  I.fillField('~Start time', '09:52')
  I.pressKey('Enter')

  I.waitForValue('~Start time', '9:52 AM')
})

Scenario('[C7411] Discard appointment during the creation', ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()

  I.fillField('Title', 'Subject C7411')
  I.fillField('Location', 'Location C7411')

  I.click('Discard')
  I.click('Discard changes')
  I.waitToHide(calendar.editWindow)
  I.dontSee('Subject C7411')
})

// TODO: creation of shared appointment happened via api call?!
Scenario('[C7412] Create private appointment @contentReview @bug', async ({ I, users, calendar }) => {
  const title = 'C7412'
  const somedetail = String(Math.round(Date.now() / 1000))
  const time = calendar.getNextMonday()
  const folder = await I.haveFolder({
    title,
    module: 'event',
    parent: `cal://0/${await I.grabDefaultFolder('calendar')}`,
    permissions: [
      { bits: 403710016, entity: users[0].get('id'), group: false },
      { bits: 4227332, entity: users[1].get('id'), group: false }
    ]
  })

  await I.haveAppointment({
    folder,
    summary: somedetail,
    location: somedetail,
    description: somedetail,
    attendeePrivileges: 'MODIFY',
    class: 'CONFIDENTIAL',
    startDate: { value: time.clone() },
    endDate: { value: time.clone().add(1, 'hour') }
  })

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()

  // 'Show appointments of first user
  I.waitForText('Shared calendars')
  I.doubleClick('~Shared calendars')
  I.waitForVisible(`[title="${users[0].get('sur_name')}, ${users[0].get('given_name')}: ${title}"]`)
  I.doubleClick(`[title="${users[0].get('sur_name')}, ${users[0].get('given_name')}: ${title}"]`)

  calendar.switchView('Day')
  I.waitForText('Private', 5, '.weekview-container.day')
  I.dontSee(somedetail, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Private', 5, '.month')
  I.dontSee(somedetail, '.month')

  calendar.switchView('List')
  I.waitForText('Private', 5, '.calendar-list-view')
  I.dontSee(somedetail, '.calendar-list-view')
})

Scenario('[C7417] Create a yearly recurring appointment Wednesdays in December, without end', ({ I, calendar, dialogs }) => {
  const date = moment('1210', 'MMDD').isoWeekday(3) // cSpell:disable-line
  const day = date.date()

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  I.checkOption('Repeat')
  I.click(`Every ${date.format('dddd')}.`)
  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Yearly')
  I.see(`Every year in December on day ${day}.`)
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see(`Every year in December on day ${day}.`)

  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  const diffMonth = date.diff(moment().startOf('month'), 'months')
  for (let i = 0; i < diffMonth; i++) I.click('~Go to next month', '.date-picker')
  I.click(`[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Workweek')
  I.waitForText('Testappointment', 5, '.weekview-container.workweek')

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')

  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')
  I.click('~Go to next month', '.date-picker')

  I.click(`.date[aria-label*="${date.add(1, 'year').format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Workweek')
  I.waitForText('Testappointment', 5, '.weekview-container.workweek')

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
})

Scenario('[C7418] Create a yearly recurring appointment last day of week in december, ends after 5', ({ I, calendar, dialogs }) => {
  const date = moment('12', 'MM').weekday(0)
  if (date.month() === 10) date.add(1, 'week') // special cases

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)
  I.fillField('~Start time', '6:00 AM')
  I.pressKey('Enter')

  I.checkOption('Repeat')
  I.click(`Every ${date.format('dddd')}.`)
  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Yearly')
  I.waitForText('Weekday')
  I.click({ css: 'input[value="weekday"]' })
  I.see('Every year on the first Sunday in December.')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every year on the first Sunday in December.')

  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  // Check next occurrence
  const diffMonth = date.diff(moment().startOf('month'), 'months')
  for (let i = 0; i < diffMonth; i++) I.click('~Go to next month', '.date-picker')
  // and select the correct date
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')
  // open all views and load the appointments there
  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')
  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')
  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')

  // Check occurrence after next
  for (let i = 0; i < 12; i++) I.click('~Go to next month', '.date-picker')
  date.add(1, 'year').startOf('month').weekday(0)
  if (date.month() === 10) date.add(1, 'week') // special cases
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')
  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')
  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
})

Scenario('[C7419] Create a monthly recurring appointment on day 10 ends 31/12 of current year', ({ I, calendar, dialogs }) => {
  const date = moment('10', 'DD')

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // and select the correct date
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  I.checkOption('Repeat')
  I.click(`Every ${date.format('dddd')}.`)

  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Monthly')
  I.selectOption('.modal-dialog [name="until"]', 'On specific date')
  I.waitForElement(locate('~Date (M/D/YYYY)').inside('.modal-dialog').as('until'))
  calendar.setDate('until', moment(date).add(6, 'years'))
  I.see('Every month on day 10.')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every month on day 10.')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')

  calendar.switchView('List')
  I.waitForText('Testappointment', 5, '.calendar-list-view')

  I.click('~Go to next month', '.date-picker')
  date.add(1, 'month')
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
})

Scenario('[C7420] Create a monthly recurring appointment every second Monday every month never ends', ({ I, calendar, dialogs }) => {
  const date = moment().startOf('month').weekday(1)
  if (date.month() === moment().subtract(1, 'month').month()) date.add(1, 'week') // special cases
  date.add(1, 'week')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  I.checkOption('Repeat')
  I.click(`Every ${date.format('dddd')}.`)
  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Monthly')
  I.waitForText('Weekday')
  I.click({ css: 'input[value="weekday"]' })
  I.see('Every month on the second Monday.')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every month on the second Monday.')

  I.click('Create', calendar.editWindow)
  I.waitForInvisible('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')

  I.click('~Go to next month', '.date-picker')
  date.add(1, 'month').startOf('month').weekday(1)
  if (date.month() === moment().month()) date.add(1, 'week') // special cases
  date.add(1, 'week')
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
})

Scenario('[C7421] Create a weekly recurring appointment every 2 weeks Sunday ends after 3', ({ I, calendar, dialogs }) => {
  const date = moment().startOf('week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click(`[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  calendar.recurAppointment(date)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Weekly')
  I.fillField('Interval', 2)
  I.selectOption('.modal-dialog [name="until"]', 'After a number of occurrences')
  I.waitForElement('.modal-dialog [name="occurrences"]')
  I.fillField('.modal-dialog [name="occurrences"]', '3')
  I.pressKey('Enter')
  I.see('Every 2 weeks on Sunday.')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every 2 weeks on Sunday.')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // Check if appointment is visible in all views
  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')
  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')
  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
  calendar.switchView('List')
  I.waitForText('Testappointment', 5, '.calendar-list-view')

  // Check next two future occurrences
  for (let i = 0; i < 2; i++) {
    if (!date.isSame(moment(date).add(2, 'week'), 'month')) I.click('~Go to next month', '.date-picker')
    date.add(2, 'weeks')
    I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')
    calendar.switchView('Week')
    I.waitForText('Testappointment', 5, '.weekview-container.week')
    calendar.switchView('Day')
    I.waitForText('Testappointment', 5, '.weekview-container.day')
    calendar.switchView('Month')
    I.waitForText('Testappointment', 5, '.month')
  }

  // Check end of series
  if (!date.isSame(moment(date).add(2, 'week'), 'month')) I.click('~Go to next month', '.date-picker')
  date.add(2, 'weeks')
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.switchView('Week')
  I.waitForInvisible(locate('.appointment').inside('.weekview-container.week').as('Appointment'))
  I.dontSee('Testappointment', '.weekview-container.week')

  calendar.switchView('Day')
  I.waitForInvisible(locate('.appointment').inside('.weekview-container.day').as('Appointment'))
  I.dontSee('Testappointment', '.weekview-container.day')
})

Scenario('[C7422] Create a allday weekly recurring appointment every Tuesday Thursday never ends', ({ I, calendar }) => {
  const date = moment().startOf('day').weekday(2)

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click(`[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  calendar.recurAppointment(date)
  I.selectOption('.recurrence-view-dialog [name="recurrence_type"]', 'Weekly')
  I.click('Th', '.recurrence-view-dialog')
  I.see('Every Tuesday and Thursday.', '.recurrence-view-dialog')
  I.click('Apply', '.recurrence-view-dialog')
  I.waitForDetached('.recurrence-view-dialog')
  I.see('Every Tuesday and Thursday.')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')
  I.seeNumberOfVisibleElements('.page.current .appointment', 2)
  calendar.switchView('Day')
  I.waitForText('Testappointment', 5, '.weekview-container.day')
  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
})

Scenario('[C7423] Create daily recurring appointment every day ends after 5', ({ I, calendar, dialogs }) => {
  // pick the second monday in the following month
  const date = moment().add(1, 'month').startOf('month').weekday(1)
  if (date.isSame(moment(), 'month')) date.add(1, 'week')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click('~Go to next month', '.date-picker')
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  calendar.recurAppointment(date)
  I.selectOption('.recurrence-view-dialog [name="recurrence_type"]', 'Daily')
  I.selectOption('.recurrence-view-dialog [name="until"]', 'After a number of occurrences')
  I.waitForElement('.recurrence-view-dialog [name="occurrences"]')
  I.fillField('.recurrence-view-dialog [name="occurrences"]', '5')
  I.pressKey('Enter')
  I.see('Every day.', '.recurrence-view-dialog')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every day.')

  // create
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // Check if appointment is visible in all views
  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
  I.seeNumberOfVisibleElements('.page.current .appointment', 5)
  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')
  I.seeNumberOfVisibleElements('.page.current .appointment', 5)

  // Check end of series
  I.click('~Next week', '.page.current')
  calendar.switchView('Week')
  I.waitForInvisible(locate('.appointment').inside('.weekview-container.week').as('Appointment'))
  I.dontSeeElement('Testappointment')
})

Scenario('[C7424] Create daily recurring appointment every 2 days ends in x+12', ({ I, calendar, dialogs }) => {
  const date = moment().add(1, 'month').startOf('month').weekday(1)
  if (date.isSame(moment(), 'month')) date.add(1, 'week')

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.click('~Go to next month', '.date-picker')
  I.click(`.date[aria-label*="${date.format('l, dddd')}, CW ${date.week()}"]`, '.date-picker')
  I.waitForNetworkTraffic()

  calendar.newAppointment()
  I.fillField('Title', 'Testappointment')
  calendar.setDate('startDate', date)

  calendar.recurAppointment(date)
  I.selectOption('.recurrence-view-dialog [name="recurrence_type"]', 'Daily')
  I.fillField('Interval', 2)
  I.selectOption('.recurrence-view-dialog [name="until"]', 'After a number of occurrences')
  I.waitForElement('.recurrence-view-dialog [name="occurrences"]')
  I.fillField('[name="occurrences"]', '8') // just repeat 8 times to stay in the current month
  I.pressKey('Enter')
  I.see('Every 2 days.', '.recurrence-view-dialog')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.see('Every 2 days.')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Month')
  I.waitForText('Testappointment', 5, '.month')
  calendar.switchView('Week')
  I.waitForText('Testappointment', 5, '.weekview-container.week')

  I.click('~Next week', '.page.current')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.see('Testappointment')
  I.seeNumberOfVisibleElements('.page.current .appointment', 4)

  I.click('~Next week', '.page.current')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.see('Testappointment')
  I.seeNumberOfVisibleElements('.page.current .appointment', 1)
})

Scenario('[C274537] Support use-count calculation on Appointment create with Groups', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveGroup({ name: 'group-001', display_name: 'group-001', members: [users[0].get('id'), users[1].get('id')] }),
    I.haveGroup({ name: 'group-002', display_name: 'group-002', members: [users[0].get('id'), users[1].get('id')] }),
    I.haveGroup({ name: 'group-003', display_name: 'group-003', members: [users[0].get('id'), users[1].get('id')] })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('[name="summary"]', 'C274537')
  I.fillField('Starts on', moment().format('L'))

  I.fillField('Participants and resources', 'group-00')
  I.waitForElement('.twitter-typeahead')

  // Check initial order of groups
  I.waitForElement('.tt-suggestions .participant-name')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[0].textContent), 'group-001')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[1].textContent), 'group-002')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[2].textContent), 'group-003')
  I.clearField('Participants and resources')

  // Add last group as participant
  I.fillField('Participants and resources', 'group-003')

  I.waitForElement({ xpath: '//div[@class="participant-name"]//strong[@class="tt-highlight"][contains(text(),"group-003")]' })
  I.click({ xpath: '//div[@class="participant-name"]//strong[@class="tt-highlight"][contains(text(),"group-003")]' })
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  I.waitForElement('.appointment-container [title="C274537"]', 5)

  // Check new order of groups
  calendar.newAppointment()
  I.fillField('[name="summary"]', 'C274537')
  I.fillField('Starts on', moment().format('L'))
  I.fillField('.add-participant.tt-input', 'group-00')
  I.waitForElement('.twitter-typeahead')
  I.waitForElement('.tt-suggestions .participant-name')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[0].textContent), 'group-003')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[1].textContent), 'group-001')
  assert.equal(await I.executeScript(() => document.querySelectorAll('.tt-suggestions .participant-name')[2].textContent), 'group-002')

  await I.dontHaveGroup(/\d+-\d{3}/)
})

Scenario('[C274516] Follow up should also propose a future date for appointments in the future', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  const date = moment().add(2, 'week')

  await I.haveAppointment({
    summary: 'C274516',
    startDate: { value: moment().add(1, 'week').format('YYYYMMDD') },
    endDate: { value: moment().add(1, 'week').add(1, 'day').format('YYYYMMDD') }
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // Navigate to next week
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.next')
  I.waitForVisible('.next')
  I.click('.next')

  // Open Detail popup
  I.waitForElement('.appointment-content[title="C274516"]', 5)
  I.click('.appointment-content[title="C274516"]', '.appointment-panel')
  I.waitForElement(locate('.detail-popup').as('Detailpopup'), 5)

  // Create Follow-up
  I.waitForElement('~More actions')
  I.click('~More actions', '.detail-popup')
  I.waitForText('Follow-up')
  I.click('Follow-up')
  I.waitForText('Starts on', 5)
  I.seeInField('Starts on', date.format('l'))
  I.seeInField('Ends on', date.format('l'))
  I.click('Create')
  I.waitToHide('.io-ox-calendar-edit')

  // Check Follow-up
  I.waitForVisible('.next')
  I.click('.next')
  I.waitForElement('.appointment-content[title="C274516"]', 5)
  I.click('.appointment-content[title="C274516"]', '.appointment-panel')
  I.waitForText(`${date.format('ddd')}, ${date.format('l')}`, 10, '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[OXUIB-768] Follow up with Zoom integration', async ({ I, calendar, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    users[0].context.hasCapability('switchboard'),
    I.haveSetting('io.ox/calendar//layout', 'week:week')
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.waitForText('Conference', 5, calendar.editWindow)
  I.selectOption('conference-type', 'zoom')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo', 5)
  I.waitForText('Copy link to location', 5, '.conference-view.zoom')

  I.waitForText('Title', 5, calendar.editWindow)
  I.fillField('Title', 'OXUIB-768')
  I.fillField('Description', 'OXUIB-768')
  I.click('Copy link to location', calendar.editWindow)
  I.click('Copy dial-in information to description', calendar.editWindow)
  I.seeInField('.io-ox-calendar-edit-window input[name="location"]', 'https://localhost/j/')
  I.seeInField('description', 'Join Zoom meeting')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow, 5)

  I.waitForText('OXUIB-768', 5, '.week .appointment .title')
  I.click('OXUIB-768', '.week .appointment .title')
  I.waitForVisible(locate('~More actions').inside('.detail-popup'))
  I.click('~More actions', '.detail-popup')
  I.waitForText('Follow-up', 5)
  I.click('Follow-up')
  I.waitForElement('.io-ox-calendar-edit-window select[name="conference-type"]', 5)

  I.waitForElement('.io-ox-calendar-edit-window select[name="conference-type"]')
  I.seeInField('.io-ox-calendar-edit-window select[name="conference-type"]', 'none')

  I.waitForElement('.io-ox-calendar-edit-window input[name="location"]')
  I.seeInField('.io-ox-calendar-edit-window input[name="location"]', '')

  I.waitForElement('.io-ox-calendar-edit-window textarea[name="description"]')
  I.seeInField('.io-ox-calendar-edit-window textarea[name="description"]', 'OXUIB-768')

  I.dontSee('The appointment description might contain outdated information', calendar.editWindow)

  I.click('Discard', calendar.editWindow)
  I.waitForDetached(calendar.editWindow, 5)

  I.click('Edit appointment', '.detail-popup')
  I.waitForText('Location', 5, calendar.editWindow)
  I.fillField('Location', 'OXUIB-768')
  let newDescription = await I.grabValueFrom('.io-ox-calendar-edit-window textarea[name="description"]')
  newDescription = newDescription.replace('Join Zoom meeting: ', '')
  I.waitForElement('.io-ox-calendar-edit-window textarea[name="description"]')
  I.seeInField('.io-ox-calendar-edit-window textarea[name="description"]', newDescription)
  I.fillField('Description', newDescription)
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow, 5)
  I.wait(0.5) // If this is removed this test will fail, there is a bug here
  I.waitForVisible('.detail-popup [aria-label="More actions"]')
  I.click('~More actions', '.detail-popup')
  I.clickDropdown('Follow-up')
  I.waitForElement('.io-ox-calendar-edit-window select[name="conference-type"]', 5)

  I.waitForElement('.io-ox-calendar-edit-window input[name="location"]')
  I.seeInField('.io-ox-calendar-edit-window input[name="location"]', 'OXUIB-768')

  I.waitForElement('.io-ox-calendar-edit-window textarea[name="description"]')
  I.seeInField('.io-ox-calendar-edit-window textarea[name="description"]', newDescription)

  I.see('The appointment description might contain outdated information', calendar.editWindow)
})

Scenario('[OXUIB-1849] Remove invalid links form appointments when deleting video conference', async ({ I, calendar, users }) => {
  const dummyText = 'OXUIB-1849'

  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    users[0].context.hasCapability('switchboard')
  ])

  I.login('app=io.ox/calendar')
  calendar.newAppointment()

  I.selectOption('conference-type', 'Jitsi Conference')
  I.waitForValue('.io-ox-calendar-edit-window.active [name="location"]', 'customer-1.ox.jitsi/asdc-vvfg-04456670-ju?pw=xcSD4th78jQSgh!e677', 5) // cSpell:disable-line

  // Jitsi link should be removed from location
  I.selectOption('conference-type', 'Zoom Meeting')
  I.dontSeeInField('.io-ox-calendar-edit-window.active [name="location"]', '.')

  I.waitForText('Connect with Zoom', 10, '.io-ox-calendar-edit-window.active .conference-view')
  I.click('Connect with Zoom', '.io-ox-calendar-edit-window.active .conference-view')
  I.waitForValue('.io-ox-calendar-edit-window.active [name="location"]', '/j/', 5)
  I.fillField('.io-ox-calendar-edit-window.active [name="description"]', dummyText)
  I.click('Copy dial-in information to description', '.io-ox-calendar-edit-window.active .conference-view')

  // Zoom link should be removed from location
  I.selectOption('conference-type', 'None')
  I.dontSeeInField('.io-ox-calendar-edit-window.active [name="location"]', '/j/')

  I.selectOption('conference-type', 'Zoom Meeting')
  I.click('Copy dial-in information to description', '.io-ox-calendar-edit-window.active .conference-view')
  const description = await I.grabValueFrom('.io-ox-calendar-edit-window textarea[name="description"]')
  I.fillField('Description', description.replace('Join Zoom meeting: ', ''))
  I.pressKey('Tab')

  // Check warning about potential outdated description
  I.selectOption('conference-type', 'None')
  I.see('The appointment description might contain outdated information', calendar.editWindow)

  I.fillField('.io-ox-calendar-edit-window.active [name="location"]', dummyText)
  I.pressKey('Tab')
  I.selectOption('conference-type', 'Jitsi Conference')
  I.seeInField('.io-ox-calendar-edit-window.active [name="location"]', dummyText)

  // Jitsi link should not be removed from location
  I.selectOption('conference-type', 'Zoom Meeting')
  I.seeInField('.io-ox-calendar-edit-window.active [name="location"]', dummyText)

  // Non-Zoom link should not be removed from location
  I.selectOption('conference-type', 'None')
  I.seeInField('.io-ox-calendar-edit-window.active [name="location"]', dummyText)
})

Scenario('[C274515] Attendees are not allowed to change their own permission status', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/calendar': { 'chronos/allowAttendeeEditsByDefault': true, layout: 'week:week' }
    }, { user: users[1] }),
    I.haveAppointment({
      summary: 'C274515',
      location: 'C274515',
      attendeePrivileges: 'MODIFY',
      startDate: { value: moment() },
      endDate: { value: moment().add(1, 'hours') },
      attendees: [{
        partStat: 'ACCEPTED',
        entity: users[1].get('id')
      }]
    })
  ])

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.appointment-container [title="C274515, C274515"]', 5)
  I.click('.appointment-container [title="C274515, C274515"]')
  I.waitForElement(locate('.detail-popup').as('Detailpopup'), 5)

  I.waitForElement('[data-action="io.ox/calendar/detail/actions/edit"]', 5)
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForElement(calendar.editWindow)
  I.waitForVisible(calendar.editWindow)
  I.waitForElement('.disabled.attendee-change-checkbox', 5)
})

Scenario('[C274484] Attendees can change the appointment', async ({ I, users, calendar }) => {
  const timestamp = Math.round(Date.now() / 1000)
  await Promise.all([
    I.haveSetting({ 'io.ox/calendar': { 'chronos/allowAttendeeEditsByDefault': true, layout: 'week:week' } }),
    I.haveSetting({ 'io.ox/calendar': { 'chronos/allowAttendeeEditsByDefault': true, layout: 'week:week' } }, { user: users[1] }),
    I.haveAppointment({
      summary: 'C274484',
      attendeePrivileges: 'MODIFY',
      startDate: { value: moment() },
      endDate: { value: moment().add(1, 'hours') },
      attendees: [{ partStat: 'ACCEPTED', entity: users[1].get('id') }]
    })
  ])

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  calendar.clickAppointment('C274484')
  I.waitForElement('.detail-popup', 5)
  I.waitForElement('~Edit', 5)
  I.click('~Edit', '.detail-popup')
  I.waitForElement('.io-ox-calendar-edit.container')
  I.waitForVisible('.io-ox-calendar-edit.container')
  I.fillField('description', timestamp)
  I.click('Save')
  I.logout()

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.clickAppointment('C274484')
  I.waitForElement('.detail-popup', 5)
  I.waitForText(String(timestamp), 5, '.detail-popup')
})

Scenario('[C7428] Create appointment with internal participants', async ({ I, users, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:day')
  const subject = 'Einkaufen'
  const location = 'Wursttheke'

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', subject)
  I.fillField('Location', location)
  I.fillField('Starts on', moment().startOf('day').format('MM/DD/YYYY'))
  I.clearField('~Start time')
  I.fillField('~Start time', '11:00 PM')
  calendar.addParticipantByPicker(calendar.getFullname(users[1]))
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Day')
  I.waitForText(subject, 5, '.weekview-container.day')
  I.waitForText(location, 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText(subject, 5, '.weekview-container.week')
  I.waitForText(location, 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText(subject, 5, '.month')
  I.waitForText(location, 5, '.month')
  calendar.switchView('List')
  I.waitForText(subject, 5, '.calendar-list-view')
  I.waitForText(location, 5, '.calendar-list-view')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  // Check if appointment is visible in all views
  calendar.switchView('Day')
  I.waitForText(subject, 5, '.weekview-container.day')
  I.waitForText(location, 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText(subject, 5, '.weekview-container.week')
  I.waitForText(location, 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText(subject, 5, '.month')
  I.waitForText(location, 5, '.month')
  calendar.switchView('List')
  I.waitForText(subject, 5, '.calendar-list-view')
  I.waitForText(location, 5, '.calendar-list-view')

  // Check Mail
  I.openApp('Mail')
  I.waitForText(`New appointment: ${subject}`)
})

Scenario('[C7425] Create appointment with a group', async ({ I, users, calendar, mail }) => {
  await I.haveGroup({
    name: 'group-C7425',
    display_name: 'group-C7425',
    members: [users[0].get('id'), users[1].get('id')]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'C7425')
  I.fillField('Location', 'Group Therapy')
  I.fillField('Starts on', moment().startOf('day').format('MM/DD/YYYY'))
  I.clearField('~Start time')
  I.fillField('~Start time', '11:00 PM')

  await calendar.addParticipant('group-C7425')

  I.waitForText(calendar.getFullname(users[0]), 5)
  I.waitForText(calendar.getFullname(users[1]), 5)
  I.click('Create')

  // Check if appointment is visible in all views
  calendar.switchView('Day')
  I.waitForText('C7425', 5, '.weekview-container.day')
  I.waitForText('Group Therapy', 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText('C7425', 5, '.weekview-container.week')
  I.waitForText('Group Therapy', 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText('C7425', 5, '.month')
  I.waitForText('Group Therapy', 5, '.month')
  calendar.switchView('List')
  I.waitForText('C7425', 5, '.calendar-list-view')
  I.waitForText('Group Therapy', 5, '.calendar-list-view')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  // Check if appointment is visible in all views
  calendar.switchView('Day')
  I.waitForText('C7425', 5, '.weekview-container.day')
  I.waitForText('Group Therapy', 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText('C7425', 5, '.weekview-container.week')
  I.waitForText('Group Therapy', 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText('C7425', 5, '.month')
  I.waitForText('Group Therapy', 5, '.month')
  calendar.switchView('List')
  I.waitForText('C7425', 5, '.calendar-list-view')
  I.waitForText('Group Therapy', 5, '.calendar-list-view')

  I.openApp('Mail')
  I.waitForApp()
  I.waitForText('New appointment: C7425')
  await I.dontHaveGroup('group-C7425')
})

Scenario('[C7429] Create appointment via Contact', async ({ I, users, contacts, calendar }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()

  // Contacts: invite second user
  I.waitForElement('#io-ox-topsearch .search-field')
  I.fillField('#io-ox-topsearch .search-field', users[1].get('sur_name'))
  I.pressKey('Backspace')
  I.pressKey(users[1].get('sur_name').slice('-1'))
  I.waitForVisible('.autocomplete.address-picker .list-item-content')
  I.pressKey('Enter')
  I.clickToolbar('~Invite to appointment')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Starts on', moment().format('L'))
  I.fillField('Title', 'Wichtige Dinge tun')
  I.fillField('Location', 'Kneipe')
  I.click('Create')

  I.openApp('Calendar')
  I.waitForApp()
  calendar.switchView('Day')
  I.waitForText('Wichtige Dinge', 5, '.weekview-container.day')
  I.waitForText('Kneipe', 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText('Wichtige Dinge', 5, '.weekview-container.week')
  I.waitForText('Kneipe', 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText('Wichtige Dinge', 5, '.month')
  calendar.switchView('List')
  I.waitForText('Wichtige Dinge', 5, '.calendar-list-view')
  I.waitForText('Kneipe', 5, '.calendar-list-view')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  calendar.switchView('Day')
  I.waitForText('Wichtige Dinge', 5, '.weekview-container.day')
  I.waitForText('Kneipe', 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText('Wichtige Dinge', 5, '.weekview-container.week')
  I.waitForText('Kneipe', 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText('Wichtige Dinge', 5, '.month')
  calendar.switchView('List')
  I.waitForText('Wichtige Dinge', 5, '.calendar-list-view')
  I.waitForText('Kneipe', 5, '.calendar-list-view')
})

Scenario('[C7430] Create appointment via Icon', ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Einkaufen')
  I.fillField('Location', 'Wursttheke')
  calendar.setDate('startDate', moment())
  I.fillField('~Start time', '12:00 PM')
  I.click('Create')

  calendar.switchView('Day')
  I.waitForText('Einkaufen', 5, '.weekview-container.day')
  I.waitForText('Wursttheke', 5, '.weekview-container.day')
  calendar.switchView('Week')
  I.waitForText('Einkaufen', 5, '.weekview-container.week')
  I.waitForText('Wursttheke', 5, '.weekview-container.week')
  calendar.switchView('Month')
  I.waitForText('Einkaufen', 5, '.month')
  calendar.switchView('List')
  I.waitForText('Einkaufen', 5, '.calendar-list-view')
  I.waitForText('Wursttheke', 5, '.calendar-list-view')
})

Scenario('[C7431] Create appointment via doubleclick', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.switchView('Day')
  // there are 48 timeslots use 25th here
  I.doubleClick('.page.current .day .timeslot:nth-child(25)')
  I.waitForElement('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'Testappointment')
  I.seeInField('~Start time', '12:00 PM')
  I.click('Create')
  I.waitForVisible('.page.current .appointment')
  await I.removeAllAppointments()

  calendar.switchView('Week')
  // there are 48 timeslots use 25th here
  I.doubleClick('.page.current .day .timeslot:nth-child(25)')
  I.waitForElement('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'Testappointment')
  I.seeInField('~Start time', '12:00 PM')
  I.click('Create')
  I.waitForVisible('.page.current .appointment')
  await I.removeAllAppointments()

  // month is special, there are no timeslots etc
  calendar.switchView('Month')
  I.doubleClick('.page.current .day .list')
  I.waitForElement('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'Testappointment')
  I.click('Create')
  I.waitForVisible('.appointment', 5)
})

Scenario('[C256455] Create all-day appointment via date label', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')

  I.waitForApp()

  // today is visible on calendar start, so we can just use the start of
  // the current week to get the apps currently displayed time.

  I.click('.page.current .weekday:first-child')
  I.waitForElement('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'Grillen')
  I.fillField('Location', 'Olpe')
  I.seeCheckboxIsChecked('[name="allDay"]')
  I.seeInField('[data-attribute="startDate"] .datepicker-day-field', moment().startOf('week').format('M/D/YYYY'))
  I.click('Create')

  I.waitForVisible('.appointment')
  I.see('Grillen', '.page.current .appointment-panel')
  I.seeCssPropertiesOnElements('.page.current .appointment-panel .appointment', { left: '0px' })
  await I.removeAllAppointments()

  calendar.switchView('Workweek')

  I.click('.page.current .weekday:first-child')
  I.waitForElement('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'Grillen')
  I.fillField('Location', 'Olpe')
  I.seeCheckboxIsChecked('[name="allDay"]')
  I.seeInField('[data-attribute="startDate"] .datepicker-day-field', moment().startOf('isoWeek').format('M/D/YYYY'))
  I.click('Create')

  I.waitForVisible('.appointment')
  I.see('Grillen', '.page.current .appointment-panel')
  I.seeCssPropertiesOnElements('.page.current .appointment-panel .appointment', { left: '0px' })
  await I.removeAllAppointments()
})

Scenario('[C7436] Create appointment without any infos', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.click('Create')
  I.see('Please enter a value')
})

Scenario('[C271749] Show prompt on event creation in public calendar', async ({ I, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForElement({ css: 'button[data-contextmenu="mycalendars"]' })
  I.click({ css: 'button[data-contextmenu="mycalendars"]' }, '.folder-tree')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.waitForText('Add new calendar', 5, dialogs.header)
  I.fillField('Calendar name', 'Cal#A')
  I.checkOption('Add as public calendar')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal')

  // Open create new appointment dialog
  I.doubleClick(locate('~Public calendars'))
  I.clickPrimary('New appointment')
  // Check dialog on event creation in public calendars'
  I.waitForText('Appointments in public calendars')
})

// "datepicker open" doesn't work reliable when running puppeteer headerless
Scenario('[C7440] Start/End date autoadjustment', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('~Start time', '12:00 PM')
  I.fillField('~End time', '1:00 PM')

  // strings are usually the same, but if this test is run around midnight, we may get a one day difference, so we must calculate that
  let startString = await calendar.getDate('startDate')
  let endString = await calendar.getDate('endDate')
  const startDate = moment(String(startString), 'M/D/YYYY')
  const diff = startDate.diff(moment(String(endString), 'M/D/YYYY'), 'days')

  async function check (direction, toChange) {
    // start today
    I.click(`[data-attribute="${toChange}"] .datepicker-day-field`)
    I.waitForVisible('.date-picker.open')
    I.click('.date-picker.open .btn-today')
    I.waitForDetached('.datepicker.open')
    // change month
    I.click(`[data-attribute="${toChange}"] .datepicker-day-field`)
    I.click(`.date-picker.open .btn-${direction}`)
    // quite funny selector but this makes sure we don't click on one of the greyed out days of last month (:not selector does not work...)
    I.click('.date-picker.open tr:first-child .date:last-child')
    I.waitForDetached('.date-picker.open')

    // check if the fields are updated to the expected values
    startString = await calendar.getDate('startDate')
    endString = await calendar.getDate('endDate')
    assert.equal(moment(String(startString), 'M/D/YYYY').add(diff, 'days').format('M/D/YYYY'), endString)
  }

  await check('next', 'startDate')
  await check('prev', 'startDate')
  await check('prev', 'endDate')

  // end date next is special, startDate must stay the same endDate must be updated
  // start today
  I.click('[data-attribute="endDate"] .datepicker-day-field')
  I.click('.date-picker.open .btn-today')
  I.waitForDetached('.datepicker.open')
  // change month
  I.click('[data-attribute="endDate"] .datepicker-day-field')
  I.click('.date-picker.open .btn-next')
  // quite funny selector but this makes sure we don't click on one of the greyed out days of last month (:not selector does not work...)
  I.click('.date-picker.open tr:first-child .date:last-child')
  I.waitForDetached('.datepicker.open')

  const newStartString = await calendar.getDate('startDate')
  const newEndString = await calendar.getDate('endDate')
  assert.equal(newStartString, startString)
  assert.notEqual(newEndString, endString)
})

Scenario('[C7441] Start/End time autocompletion', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()

  I.fillField('Title', 'C7441')
  I.click('~Start time')
  I.click('[data-attribute="startDate"] [data-value="1:00 PM"]')

  I.click('[data-attribute="startDate"] .time-field')
  I.click('1:00 PM', '[data-attribute="startDate"]')
  I.seeInField('~Start time', '1:00 PM')
  I.seeInField('~End time', '2:00 PM')

  I.click('[data-attribute="startDate"] .time-field')
  I.click('12:00 PM', '[data-attribute="startDate"]')
  I.seeInField('~Start time', '12:00 PM')
  I.seeInField('~End time', '1:00 PM')

  I.click('[data-attribute="endDate"] .time-field')
  I.click('11:00 AM', '[data-attribute="endDate"]')
  I.seeInField('~Start time', '10:00 AM')
  I.seeInField('~End time', '11:00 AM')

  I.click('[data-attribute="endDate"] .time-field')
  I.click('1:00 PM', '[data-attribute="endDate"]')
  I.seeInField('~Start time', '10:00 AM')
  I.seeInField('~End time', '1:00 PM')
})

Scenario('[C7442] Set date from date-picker', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:day')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()

  I.fillField('Title', '2. Weihnachten')

  // same starting point everytime, today would make this too difficult
  calendar.setDate('startDate', moment('2019-03-03'))

  I.click('[data-attribute="startDate"] .datepicker-day-field')
  I.seeElement('.date-picker.open')
  I.see('March 2019', '.date-picker.open')
  // 42 days shown, 11 of them outside of march
  I.seeNumberOfVisibleElements('.date-picker.open td.date', 42)
  I.seeNumberOfVisibleElements('.date-picker.open td.date.outside', 11)

  I.click('.date-picker.open .btn-next')
  I.see('April 2019', '.date-picker.open')
  // 35 days shown, 5 of them outside of April
  I.seeNumberOfVisibleElements('.date-picker.open td.date', 35)
  I.seeNumberOfVisibleElements('.date-picker.open td.date.outside', 5)

  I.click('.date-picker.open .btn-prev')
  I.click('.date-picker.open .btn-prev')
  I.see('February 2019', '.date-picker.open')
  // 35 days shown, 7 of them outside of february
  I.seeNumberOfVisibleElements('.date-picker.open td.date', 35)
  I.seeNumberOfVisibleElements('.date-picker.open td.date.outside', 7)

  I.click('.date-picker.open .navigation .switch-mode')
  // year
  I.see('2019', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .month', 12)

  I.click('.date-picker.open .btn-next')
  I.see('2020', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .month', 12)

  I.click('.date-picker.open .btn-prev')
  I.click('.date-picker.open .btn-prev')
  I.see('2018', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .month', 12)

  I.click('.date-picker.open .navigation .switch-mode')
  // decades ...kind of, it's actually 12 years but pressing next only advances 10...*shrug*
  I.see('2010 - 2021', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .year', 12)

  I.click('.date-picker.open .btn-next')
  I.see('2020 - 2031', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .year', 12)

  I.click('.date-picker.open .btn-prev')
  I.click('.date-picker.open .btn-prev')
  I.see('2000 - 2011', '.date-picker.open')
  I.seeNumberOfVisibleElements('.date-picker.open .year', 12)

  // select a date. just use 12/26/1999 for convenience (always click the first date)
  I.click('.date-picker.open tr:first-child td:first-child')
  I.click('.date-picker.open tr:first-child td:first-child')
  I.click('.date-picker.open tr:first-child td:nth-child(2)')

  I.seeInField('Starts on', '12/26/1999')
  I.pressKey('Enter')
  I.fillField('Location', 'Nordpol')
  I.click('Create')

  await I.executeScript(async function () {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    apps.get('io.ox/calendar').setDate(moment('1999-12-26'))
  })
  I.waitForVisible('.appointment')
  // check in calendar
  const cid = await I.grabAttributeFrom('.appointment', 'data-cid')
  const appointmentSelector = locate(`.appointment[data-cid="${cid}"]`)
  const appointment = appointmentSelector.inside('.weekview-container.day')
    .as('appointment element in day view')

  I.waitForText('2. Weihnachten', undefined, appointment)
  I.waitForText('Nordpol', undefined, appointment)

  I.see('Sun, 12/26/1999', '.weekview-container.day')
})

Scenario('[C274406] Change organizer of appointment with external attendees', async ({ I, users, calendar }) => {
  const subject = 'To be or not to be Organizer'
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', subject)
  calendar.startNextMonday()
  I.fillField('Location', 'Globe Theatre')
  await calendar.addParticipant(users[1].get('name'))
  I.fillField('.add-participant.tt-input', 'ExcellentExternalExterminator@Extraterrestrial.ex')
  I.pressKey('Enter')
  I.click('Create')

  calendar.moveCalendarViewToNextWeek()
  I.waitForText(subject, undefined, '.appointment')
  I.click(subject, '.appointment')
  I.waitForElement('.detail-popup-appointment .popup-header .more-dropdown .dropdown-toggle')
  I.click('.detail-popup-appointment .popup-header .more-dropdown .dropdown-toggle')
  I.waitForElement('.smart-dropdown-container.open')
  I.dontSee('Change organizer')
  I.click('.detail-popup-appointment .popup-header .more-dropdown .dropdown-toggle')
  I.waitForDetached('.dropdown.open')

  I.waitForElement('~Edit')
  I.click('~Edit')
  I.waitForVisible(calendar.editWindow)
  I.waitForText('Repeat')
  I.checkOption('Repeat')
  I.click('Save')
  I.waitForDetached('.modal-open')
  I.waitForNetworkTraffic()

  I.waitForText(subject, 5, '.appointment')
  I.click(subject, '.appointment')
  I.waitForElement('.detail-popup-appointment .popup-header .more-dropdown .dropdown-toggle')
  I.click('.detail-popup-appointment .popup-header .more-dropdown .dropdown-toggle')
  I.waitForElement('.smart-dropdown-container.open')
  I.dontSee('Change organizer')
})

Scenario('[C274651] Create secret appointment', async ({ I, users, calendar }) => {
  const startDate = moment().startOf('week').add('1', 'day')
  const sharedFolderID = await I.haveFolder({
    module: 'event',
    subscribed: 1,
    title: 'C274651',
    permissions: [
      { bits: 403710016, entity: users[0].get('id'), group: false },
      { bits: 4227332, entity: users[1].get('id'), group: false }
    ],
    parent: `cal://0/${await I.grabDefaultFolder('calendar')}`
  })
  // Login and create secret appointment in shared calendar
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.selectFolder('C274651')
  calendar.newAppointment()
  I.fillField('Title', 'C274651')
  I.pressKey('Enter')
  calendar.setDate('startDate', startDate)
  I.selectOption('Visibility', 'Secret')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  // Check secret appointment in all views
  calendar.switchView('Workweek')
  if (moment().day() === 0) I.click('~Next week')
  I.waitForElement('.page.current .private-flag')

  calendar.switchView('Week')
  I.waitForElement('.page.current .private-flag')

  calendar.switchView('Day')
  I.click(`.date-picker [aria-label*="${startDate.format('M/D/YYYY')}"]`)
  I.waitForElement('.page.current .private-flag')

  calendar.switchView('Month')
  I.waitForElement('.page.current .private-flag')

  I.logout()

  // Login user 2, check that secret appointment is not visible in shared calendar
  I.login(`app=io.ox/calendar&folder=${sharedFolderID}`, { user: users[1] })
  I.waitForApp()
  I.waitForVisible(`[title="${users[0].get('sur_name')}, ${users[0].get('given_name')}: C274651"]`)
  I.dontSeeElement('.appointment')
})

Scenario('[C7414] Create two appointments at the same time (one is shown as free)', async ({ I, users, calendar }) => {
  await I.haveAppointment({
    summary: 'C7414',
    location: 'C7414',
    startDate: { value: moment() },
    endDate: { value: moment().add(4, 'hours') },
    attendees: [{ partStat: 'ACCEPTED', entity: users[1].get('id') }]
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'C7414')
  I.fillField('Location', 'C7414')
  I.click('Show as free')
  I.click('Create')

  I.waitForDetached(locate('.modal-open .modal-title').withText('Conflicts detected'))
})

Scenario('[C7415] Create two reserved appointments at the same time', async ({ I, users, calendar, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.haveAppointment({
    summary: 'C7415',
    location: 'C7415',
    startDate: { value: moment().startOf('day').add(10, 'hours') },
    endDate: { value: moment().startOf('day').add(12, 'hours') },
    attendees: [{ partStat: 'ACCEPTED', entity: users[1].get('id') }]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.appointment-container [title="C7415, C7415"]')
  assert.equal(await I.grabNumberOfVisibleElements('.appointment-container [title="C7415, C7415"]'), 1)

  calendar.newAppointment()
  I.fillField('Title', 'C7415')
  I.fillField('Location', 'C7415')
  I.fillField('Starts on', moment().startOf('day').format('MM/DD/YYYY'))
  I.clearField('~Start time')
  I.fillField('~Start time', moment().startOf('day').add(11, 'hours').format('HH:mm') + 'AM')
  I.click('Create')

  dialogs.waitForVisible()
  I.waitForText('Conflicts detected', 5, dialogs.header)
  dialogs.clickButton('Ignore conflicts')
  I.waitForDetached('.modal-open')
  I.waitForNetworkTraffic()

  I.seeNumberOfVisibleElements('.appointment-container [title="C7415, C7415"]', 2)
})

Scenario('[C7446] Create recurring whole-day appointment', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement(locate('.calendar-header button').withText('Today'))

  calendar.newAppointment()
  I.fillField('Title', 'Birthday of Linus Torvalds')
  I.fillField('Location', 'Helsinki Imbiss')
  I.checkOption('All day')
  await calendar.setDate('startDate', moment('1969-12-28'))

  I.checkOption('Repeat')
  I.click('.recurrence-view button.summary')
  I.waitForElement('.recurrence-view-dialog', 5)
  I.selectOption('.recurrence-view-dialog [name="recurrence_type"]', 'Yearly')
  I.click('Apply')
  I.waitForDetached('.recurrence-view-dialog')
  I.click('Create')

  const selector = '.appointment-panel [aria-label*="Birthday of Linus Torvalds, Helsinki Imbiss"]'
  const list = ['1969-12-28', '1968-12-28', '1967-12-28', '1975-12-28', '1995-12-28', '2025-12-28']
  await Promise.all(list.map(async (datestring) => {
    await I.executeScript(async function (datestring) {
      const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
      const { moment } = await import(String(new URL('e2e.js', location.href)))
      apps.get('io.ox/calendar').setDate(moment(`${datestring}`))
    }, datestring)
    I.waitForVisible(selector)
    assert.equal(await I.grabNumberOfVisibleElements(selector), 1)
  }))
})

Scenario('[C7447] Private appointment with participants', ({ I, users, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement(locate('.calendar-header button').withText('Today'))

  calendar.newAppointment()
  I.fillField('Starts on', moment().format('L'))
  I.fillField('Title', 'Private appointment with participants')
  I.fillField('Location', 'PrivateRoom')
  I.fillField('input.add-participant.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.selectOption('[data-extension-id="private_flag"] select', 'Private')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.switchView('Day')
  I.waitForElement('.weekview-container.day div[title="Private appointment with participants, PrivateRoom"] .bi-eye-slash, .contentContainer .bi-eye-slash')
  I.waitForElement('~Private appointment with participants')

  calendar.switchView('Week')
  I.waitForElement('.weekview-container.week div[title="Private appointment with participants, PrivateRoom"] .bi-eye-slash, .contentContainer .bi-eye-slash')
  I.waitForElement('~Private appointment with participants')

  calendar.switchView('Month')
  I.waitForElement('.month div[title="Private appointment with participants, PrivateRoom"] .bi-eye-slash, .contentContainer .bi-eye-slash')
  I.waitForElement('~Private appointment with participants')

  calendar.switchView('List')
  I.waitForElement('.calendar-list-view div[title="Private appointment with participants, PrivateRoom"] .bi-eye-slash, .contentContainer .bi-eye-slash')
  I.waitForElement('~Private appointment with participants')
})

Scenario('[C234658] Create appointments and show this in cumulatively view', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/calendar': { selectedFolders: {}, layout: 'week:week' } }),
    I.haveAppointment({
      folder: await I.haveFolder({ title: 'C234658 - 0', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` }),
      summary: 'C234658',
      location: 'C234658',
      description: 'C234658',
      startDate: { value: moment().startOf('day').add(2, 'hours') },
      endDate: { value: moment().startOf('day').add(4, 'hours') }
    }),
    I.haveAppointment({
      folder: await I.haveFolder({ title: 'C234658 - 1', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` }),
      summary: 'C234658',
      location: 'C234658',
      description: 'C234658',
      startDate: { value: moment().startOf('day').add(2, 'hours') },
      endDate: { value: moment().startOf('day').add(4, 'hours') }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForNetworkTraffic()

  I.seeNumberOfVisibleElements('.appointment-container [title="C234658, C234658"]', 0)
  I.click('[data-id="virtual/flat/event/private"] [title="C234658 - 0"] .color-label')
  I.waitNumberOfVisibleElements('.appointment-container [title="C234658, C234658"]', 1)
  I.click('[data-id="virtual/flat/event/private"] [title="C234658 - 1"] .color-label')
  I.waitNumberOfVisibleElements('.appointment-container [title="C234658, C234658"]', 2)
})

Scenario('[C265153] Create appointment with a link in the description', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/calendar': { layout: 'week:week' } }),
    I.haveAppointment({
      summary: 'C265153',
      location: 'C265153',
      description: 'https://duckduckgo.com',
      startDate: { value: moment() },
      endDate: { value: moment().add(1, 'hours') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForVisible('.io-ox-calendar-window')
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.appointment-container [title="C265153, C265153"]')
  I.click('.appointment-container [title="C265153, C265153"]')
  I.waitForElement('.calendar-detail [href="https://duckduckgo.com"]')
  I.click('.calendar-detail [href="https://duckduckgo.com"]')
  I.retry(5).switchToNextTab()
  I.waitInUrl('https://duckduckgo.com/', 5)
})

Scenario('Prevent XSS in folder dropdown', async ({ I, calendar, contacts }) => {
  I.login('app=io.ox/mail')

  contacts.editMyAccount()
  I.fillField('last_name', 'ayb"><img src=x onerror=alert(document.domain)>')
  I.click('Save')

  I.openApp('Calendar')
  I.waitForApp()
  calendar.newAppointment()
})

Scenario('[C7432] Create all-day appointment via doubleclick', ({ I, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment-panel')
  I.doubleClick('.page.current .appointment-panel')
  I.waitForText('Create appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Meetup Day')
  I.fillField('Location', 'Conference Room Day')
  I.click('Create')
  I.waitForDetached('.window-container.io-ox-calendar-edit-window')
  I.waitForText('Meetup Day', 5, '.page.current .appointment-panel')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.clickButton('Delete appointment')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment-panel')
  I.doubleClick('.page.current .appointment-panel')
  I.waitForText('Create appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Meetup Week')
  I.fillField('Location', 'Conference Room Week')
  I.click('Create')
  I.waitForDetached('.window-container.io-ox-calendar-edit-window')
  I.waitForText('Meetup Week', 5, '.page.current .appointment-panel')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.clickButton('Delete appointment')

  calendar.switchView('Workweek')
  I.waitForElement('.page.current .appointment-panel')
  I.doubleClick('.page.current .appointment-panel')
  I.waitForText('Create appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Meetup Workweek')
  I.fillField('Location', 'Conference Room Workweek')
  I.click('Create')
  I.waitForDetached('.window-container.io-ox-calendar-edit-window')
  I.waitForText('Meetup Workweek', 5, '.page.current .appointment-panel')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.clickButton('Delete appointment')
})

// if "Mark all day appointments as free" is set the following behavior should be present:
// automatically mark new appointments as free when started as all day (click on a day)
// automatically mark new appointments free when switched to all day, should work both ways
// do not Show as free when editing
// do not Show as free when a user manually changed the checkbox (the user wants it set to that value obviously)
// do not Show as free when the setting is not set
Scenario('[OXUIB-244] Mark all day appointments as free not respected for new appointments', async ({ I, calendar }) => {
  await I.haveSetting({
    'io.ox/calendar': { markFulltimeAppointmentsAsFree: true, layout: 'week:week' }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // start as all day appointment
  I.waitForElement('.page.current .appointment-panel')
  I.doubleClick('.page.current .appointment-panel')
  I.waitForText('Create appointment')

  I.waitForElement(locate(calendar.editWindow), 5)

  I.seeCheckboxIsChecked('All day')
  I.seeCheckboxIsChecked('Show as free')

  I.fillField('Title', 'test appointment')
  I.click('Create')
  I.waitForDetached('.window-container.io-ox-calendar-edit-window')
  I.waitForText('test appointment')

  // visibility should not be changed in edit mode
  I.waitForText('test appointment', 5, '.page.current .appointment-panel')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Edit', 5)
  I.click('~Edit', '.detail-popup')

  I.waitForText('All day', 5)
  I.waitForEnabled('input[name="allDay"]')
  I.uncheckOption('All day')

  I.dontSeeCheckboxIsChecked('All day')
  I.seeCheckboxIsChecked('Show as free')

  I.click('Save')
  I.waitForDetached('.window-container.io-ox-calendar-edit-window')

  // check switching all day on and off
  calendar.newAppointment()

  I.dontSeeCheckboxIsChecked('All day')
  I.dontSeeCheckboxIsChecked('Show as free')

  I.checkOption('All day')

  I.seeCheckboxIsChecked('All day')
  I.seeCheckboxIsChecked('Show as free')

  I.uncheckOption('All day')

  I.dontSeeCheckboxIsChecked('All day')
  I.dontSeeCheckboxIsChecked('Show as free')

  // user interaction
  I.checkOption('Show as free')

  I.checkOption('All day')

  I.seeCheckboxIsChecked('All day')
  I.seeCheckboxIsChecked('Show as free')

  I.uncheckOption('All day')

  I.dontSeeCheckboxIsChecked('All day')
  // should stay the way the user manually set it to
  I.seeCheckboxIsChecked('Show as free')

  I.uncheckOption('Show as free')

  I.checkOption('All day')

  I.seeCheckboxIsChecked('All day')
  // should stay the way the user manually set it to
  I.dontSeeCheckboxIsChecked('Show as free')

  I.logout()

  // if setting is disabled no automatic should happen
  await I.haveSetting('io.ox/calendar//markFulltimeAppointmentsAsFree', false)

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // check switching all day on and off
  calendar.newAppointment()

  I.dontSeeCheckboxIsChecked('All day')
  I.dontSeeCheckboxIsChecked('Show as free')

  I.checkOption('All day')

  I.seeCheckboxIsChecked('All day')
  I.dontSeeCheckboxIsChecked('Show as free')
})

Scenario('[C7435] Create appointment via email', async ({ I, mail, users, calendar }) => {
  await users.create() // create additional user

  // tuesday within next month for a stable clickable future appointment
  const day = moment().add(1, 'month').startOf('month').add(1, 'week').isoWeekday(2).format('M/D/YYYY')

  await I.haveMail({
    attachments: [{
      content: 'Hello world!',
      content_type: 'text/html',
      disp: 'inline'
    }],
    from: users[0],
    sendtype: 0,
    subject: 'Appointment via mail',
    to: users[0],
    cc: [
      [users[1].get('display_name'), users[1].get('primaryEmail')],
      [users[2].get('display_name'), users[2].get('primaryEmail')]
    ]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Appointment via mail')
  I.waitForVisible('.mail-header-actions')
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Invite to appointment')

  I.waitForElement(calendar.editWindow)
  I.waitForText('Appointment via mail', 5, calendar.editWindow)
  I.waitForElement('.io-ox-calendar-edit-window input[name="location"]')
  I.fillField('Location', 'Conference Room 123')
  I.click('.datepicker-day-field')
  I.waitForFocus('.datepicker-day-field')
  I.fillField('Starts on', day)
  I.pressKey('Enter')
  I.clearField('~Start time')
  I.fillField('~Start time', '01:00 PM')
  I.pressKey('Enter')
  I.clearField('~End time')
  I.fillField('~End time', '03:00 PM')
  I.pressKey('Enter')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  I.openApp('Calendar')

  I.waitForElement('~Go to next month')
  I.click('~Go to next month', '.date-picker')
  I.click(`//td[contains(@aria-label, "${day}")]`, '.date-picker')

  calendar.switchView('Day')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Week')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Workweek')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Month')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('List')
  I.waitForText('Load appointments until')
  I.click('Load appointments until')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  I.waitForElement('~Go to next month')
  I.click('~Go to next month', '.date-picker')
  I.click(`//td[contains(@aria-label, "${day}")]`, '.date-picker')

  calendar.switchView('Day')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Week')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Workweek')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('Month')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')

  calendar.switchView('List')
  I.waitForText('Load appointments until')
  I.click('Load appointments until')
  I.waitForText('Appointment via mail', 5, '.page.current .appointment')
})

Scenario('[C7427] Create appointment with external participants', async ({ I, users, contexts, calendar, mail }) => {
  const ctx = await contexts.create()
  const extUser = await users.create(users.getRandom(), ctx)
  const day = moment().add(1, 'month').startOf('month').add(1, 'week').isoWeekday(2).format('M/D/YYYY')
  const calendarDay = `//td[contains(@aria-label, "${day}")]`

  function checkViews () {
    I.waitForElement('~Go to next month')
    I.click('~Go to next month', '.date-picker')
    I.click(calendarDay, '.date-picker')

    calendar.switchView('Day')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Week')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Workweek')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Month')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('List')
    I.waitForText('Load appointments until')
    I.click('Load appointments until')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')
  }

  I.login('app=io.ox/calendar')

  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Meetup XY')
  I.fillField('Location', 'Conference Room 123')
  I.fillField('Starts on', day)
  I.pressKey('Enter')
  I.clearField('~Start time')
  I.fillField('~Start time', '01:00 PM')
  I.pressKey('Enter')
  await calendar.addParticipant(extUser.get('primaryEmail'), false)
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  checkViews()

  I.logout()

  I.login('app=io.ox/mail', { user: extUser })
  I.waitForApp()
  mail.selectMail('New appointment: Meetup XY')
  I.waitForElement('.mail-detail-frame')

  I.waitForText('Accept', undefined, '.mail-detail-pane')
  I.click('Accept', '.mail-detail-pane')

  I.openApp('Calendar')
  I.waitForApp()
  checkViews()
})

Scenario('[C7426] Create appointment with internal and external participants', async ({ I, users, contexts, calendar, mail }) => {
  const day = moment().add(1, 'month').startOf('month').add(1, 'week').isoWeekday(2).format('M/D/YYYY') // tuesday within next month for a stable clickable future appointment

  const ctx = await contexts.create()
  const intUser = users[1]
  const extUser = await users.create(users.getRandom(), ctx)

  function checkViews () {
    I.waitForElement('~Go to next month')
    I.click('~Go to next month', '.date-picker')
    I.click(`//td[contains(@aria-label, "${day}")]`, '.date-picker')

    calendar.switchView('Day')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Week')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Workweek')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('Month')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')

    calendar.switchView('List')
    I.waitForText('Load appointments until')
    I.click('Load appointments until')
    I.waitForElement('.page.current .appointment', 5)
    I.scrollTo('.page.current .appointment')
    I.waitForText('Meetup XY', 5, '.page.current .appointment')
  }

  I.login('app=io.ox/calendar')

  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Meetup XY')
  I.fillField('Location', 'Conference Room 123')
  I.click('.datepicker-day-field')
  I.waitForFocus('.datepicker-day-field')
  I.fillField('Starts on', day)
  I.pressKey('Enter')
  I.clearField('~Start time')
  I.fillField('~Start time', '01:00 PM')
  I.pressKey('Enter')
  await calendar.addParticipant(intUser.get('primaryEmail'), true)
  await calendar.addParticipant(extUser.get('primaryEmail'), false)
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  checkViews()
  I.logout()

  I.login('app=io.ox/mail', { user: intUser })
  I.waitForApp()
  mail.selectMail('New appointment: Meetup XY')
  I.waitForElement('.mail-detail-frame')

  I.waitForText('Accept', undefined, '.mail-detail-pane')
  I.click('Accept', '.mail-detail-pane')

  I.openApp('Calendar')
  I.waitForApp()
  checkViews()
  I.logout()

  I.login('app=io.ox/mail', { user: extUser })
  I.waitForApp()
  mail.selectMail('New appointment: Meetup XY')
  I.waitForElement('.mail-detail-frame')

  I.waitForText('Accept', undefined, '.mail-detail-pane')
  I.click('Accept', '.mail-detail-pane')

  I.openApp('Calendar')
  I.waitForApp()
  checkViews()
})

Scenario('[OXUIB-182] Choose correct start time on time change dates', async ({ I, calendar }) => {
  // last sunday of march
  const summerTimeChangeDate = moment().month('March').endOf('month').startOf('week')
  // last sunday of October
  const winterTimeChangeDate = moment().month('October').endOf('month').startOf('week')

  const startTimeslot = locate('.page.current .day .timeslot').at(21).as('start timeslot')
  const endTimeslot = locate('.page.current .day .timeslot').at(24).as('end timeslot')

  const changeDate = date => {
    // click the right month in date-picker
    I.click('.switch-mode')
    I.click(locate('.month.switch-mode')
      .inside('.date-picker')
      .withAttr({ 'data-value': `${date.month()}` })
    )
    I.waitForText(date.format('MMMM'), 5, '.switch-mode')
    I.click(`.date[aria-label^="${date.format('M/DD')}"]`, '.date-picker')
    I.waitForVisible(startTimeslot)
    I.waitForEnabled(startTimeslot)
    I.doubleClick(startTimeslot)

    I.waitForVisible('~Start time')
    I.waitForVisible('~End time')
    // verify the correct start time
    I.seeInField('~Start time', '10:00 AM')
    I.seeInField('~End time', '11:00 AM')
    I.click('Discard')
    I.waitForDetached(calendar.editWindow)

    I.waitForVisible(startTimeslot)
    I.waitForEnabled(startTimeslot)
    I.waitForVisible(endTimeslot)
    I.wait(0.2) // This is needed for scrollTo to work
    I.scrollTo(locate('.page.current .day .timeslot').at(19))
    I.dragAndDrop(startTimeslot, endTimeslot)

    I.waitForVisible('~Start time')
    I.waitForVisible('~End time')
    // verify the correct start time
    I.seeInField('~Start time', '10:00 AM')
    I.seeInField('~End time', '12:00 PM')
    I.click('Discard')
    I.waitForDetached(calendar.editWindow)
  }

  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')

  I.waitForApp()
  changeDate(summerTimeChangeDate)
  changeDate(winterTimeChangeDate)
})

Scenario('Create Appointment w/ category', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/categories', true)

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('Title', 'App w/ category')
  I.scrollTo('.io-ox-calendar-edit-window .categoriesrow-calendar')
  I.click('Add category')
  I.click('Important')
  I.waitForText('Important', 1, '.category-view')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.moveCalendarViewToNextWeek()
  I.waitForVisible(locate('.appointment'))
  I.waitForText('App w/ category', 1)
  I.click('.appointment')
  I.waitForText('App w/ category', 1, '.detail-popup-appointment')
  I.waitForText('Important', 1, '.detail-popup-appointment')
  I.click('~Edit appointment')
  I.waitForElement('.io-ox-calendar-edit-window .categoriesrow-calendar')
  I.scrollTo('.io-ox-calendar-edit-window .categoriesrow-calendar')
  I.waitForText('Add category', 1)
  I.click('Add category')
  I.waitForText('Business')
  I.click('Business')
  I.seeNumberOfVisibleElements('.io-ox-calendar-edit-window .categories-badges .category-view', 2)
  I.click('Save')
  I.waitForText('Important', 1, '.detail-popup-appointment .categories-badges')
  I.waitForText('Business', 1, '.detail-popup-appointment .categories-badges')
})

Scenario('Create and delete a simple appointment @smoketest', ({ I, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click('~Next week', '.page.current')

  calendar.newAppointment()
  I.fillField('Title', 'test title')
  I.fillField('Location', 'test location')
  I.fillField('Description', 'test description')
  I.fillField('~Start time', '12:00 PM')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.switchView('List')
  I.waitForText('test title', 5, '.calendar-list-view')
  I.waitForText('test location')
  I.waitForText('test description')

  // delete the appointment thus it does not create conflicts for upcoming appointments
  I.click('test title', '.calendar-list-view')
  I.waitForElement('~Delete')
  I.click('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.appointment')
})

Scenario('[OXUIB-1569] Autocomplete sometimes not showing desired contacts', async ({ I, users, calendar }) => {
  await Promise.all([
    users.create(),
    users.create(),
    users.create(),
    users.create()
  ])

  await Promise.all([
    I.executeSoapRequest('OXUserService', 'change', {
      ctx: { id: users[1].context.id },
      usrdata: { id: users[1].get('id'), given_name: 'Marion' },
      auth: users[1].context.admin
    }),
    I.executeSoapRequest('OXUserService', 'change', {
      ctx: { id: users[2].context.id },
      usrdata: { id: users[2].get('id'), given_name: 'Marvin' },
      auth: users[2].context.admin
    }),
    I.executeSoapRequest('OXUserService', 'change', {
      ctx: { id: users[3].context.id },
      usrdata: { id: users[3].get('id'), given_name: 'Markus' },
      auth: users[3].context.admin
    }),
    I.executeSoapRequest('OXUserService', 'change', {
      ctx: { id: users[4].context.id },
      usrdata: { id: users[4].get('id'), given_name: 'Margot' },
      auth: users[4].context.admin
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()

  await I.executeScript(async function () {
    const { settings: coreSettings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    const { settings: contactsSettings } = await import(String(new URL('io.ox/contacts/settings.js', location.href)))
    coreSettings.set('autocompleteApiLimit', 1)
    return contactsSettings.set('search', { minimumQueryLength: 2 })
  })

  calendar.newAppointment()
  await I.throttleNetwork('2G')

  I.waitForVisible('.add-participant.tt-input')
  I.waitForEnabled('.add-participant.tt-input')
  I.fillField('.add-participant.tt-input', 'marv')
  I.seeInField('.add-participant.tt-input', 'marv')
  I.waitForText('Marvin')
})

Scenario('[OXUIB-2264] Add appointment in other calendar', async ({ I, users, calendar, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')

  I.login(['app=io.ox/calendar'])
  I.waitForApp()

  // Create new public calendar
  I.waitForElement('~Folder-specific actions')
  I.click('Folder-specific actions')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  dialogs.clickButton('Add')
  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  // Change back to original calendar
  I.click(`~${users[0].get('sur_name')}`)
  // create new appointment
  calendar.newAppointment()
  const subject = 'The Long Dark Tea-Time of the Soul'
  I.fillField('Title', subject)
  I.click(users[0].get('sur_name'), '.folder-selection')
  I.clickDropdown('New calendar')
  I.waitForDetached('dropdown.open')
  I.click('Create', calendar.editWindow)
  I.waitForResponse(response => response.url().includes('api/attachment?action=all') && response.request().method() === 'GET', 10)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
  I.dontSeeElement('.io-ox-alert-error')
})

Scenario('Calendar folder handling @smoketest', async ({ I, calendar, dialogs }) => {
  I.login(['app=io.ox/calendar'])
  I.waitForApp()

  // add new calendar
  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.fillField('Calendar name', 'Calendar name')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.waitForText('Calendar name', 5, '.folder-tree')

  // rename calendar
  I.click('~Actions for Calendar name')
  I.clickDropdown('Rename')
  dialogs.waitForVisible()
  I.fillField('Folder name', 'Renamed calendar')
  dialogs.clickButton('Rename')
  I.waitForText('Renamed calendar', 5, '.folder-tree')

  // create appointment
  calendar.newAppointment()
  I.fillField('Title', 'Appointment name')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.waitForText('Appointment name')

  // toggle visibility of calendar
  I.click('.folder-arrow.invisible', '~Renamed calendar')
  I.dontSee('Appointment name')
  I.click('.folder-arrow.invisible', '~Renamed calendar')
  I.see('Appointment name')

  // hide calendar
  I.click('~Actions for Renamed calendar')
  I.clickDropdown('Hide')
  I.waitForDetached('~My calendars ~Renamed calendar', 5)
  I.dontSee('Appointment name')

  // show calendar
  I.waitForText('Hidden calendars')
  I.waitForVisible(locate('.folder-arrow').inside('~Hidden calendars').as('Folder arrow'))
  I.click('.folder-arrow', '~Hidden calendars')
  I.waitForText('Renamed calendar', 5, '.folder-tree')
  I.seeElement('li[aria-label*="Renamed calendar"][aria-checked="false"]')
  I.click('Renamed calendar', '.folder-tree')
  I.click('~Actions for Renamed calendar')
  I.clickDropdown('Show')
  I.waitForInvisible('~Hidden calendars')
  I.waitForText('Renamed calendar', 5, '~My calendars')

  // delete calendar
  I.click('Renamed calendar', '.folder-tree')
  I.click('~Actions for Renamed calendar')
  I.clickDropdown('Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('~Renamed calendar', 5)
  I.dontSee('Appointment name')
})

Scenario('View shared calendars via deep links', async ({ I, users, mail, dialogs }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // create new calendars
  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.fillField('Calendar name', 'First Calendar')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.waitForText('First Calendar', 5, '.folder-tree')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.fillField('Calendar name', 'Second Calendar')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.waitForText('Second Calendar', 5, '.folder-tree')

  // share calendars
  I.click('First Calendar', '.folder-tree')
  I.click('~Actions for First Calendar')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForElement('.form-control.tt-input')
  I.fillField('.form-control.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.click('Second Calendar', '.folder-tree')
  I.click('~Actions for Second Calendar')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForElement('.form-control.tt-input')
  I.fillField('.form-control.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()

  // view First Calendar
  mail.selectMail('First Calendar')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForText('View calendar')
    I.click('View calendar')
  })
  I.waitForApp()
  I.waitForElement('.selected[aria-label*="First Calendar"][aria-checked="true"]')

  // view Second Calendar
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForApp()
  mail.selectMail('Second Calendar')
  I.pressKey('ArrowUp')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForText('View calendar')
    I.click('View calendar')
  })
  I.waitForApp()
  I.waitForElement('.selected[aria-label*="Second Calendar"][aria-checked="true"]')
})
