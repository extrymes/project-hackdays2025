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

const expect = require('chai').expect
const moment = require('moment')
const _ = require('underscore')

Feature('Calendar')

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

Scenario('[C274425] Month label in Calendar week view', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  const firstDate = moment('2019-05-01')
  const secondDate = moment('2020-01-01')
  I.waitForApp()
  I.executeScript(async (firstDate) => {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    apps.get('io.ox/calendar').setDate(firstDate)
  }, firstDate)
  I.waitForText('April - May 2019', 5, '.weekview-container .calendar-header')
  I.waitForText('CW 18', 5, '.weekview-container .calendar-header')
  I.executeScript(async (secondDate) => {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    apps.get('io.ox/calendar').setDate(secondDate)
  }, secondDate)
  I.waitForText('December 2019 - January 2020', 5, '.weekview-container .calendar-header')
  I.waitForText('CW 1', 5, '.weekview-container .calendar-header')
})

Scenario('[C207509] Year view', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'year')
  I.login(['app=io.ox/calendar'])
  I.waitForApp()
  // Expected Result: The year view displays each day of the year separated in month.
  I.waitNumberOfVisibleElements('.year-view .month-container', 12)
  const calenderWeeks = await I.grabTextFromAll('.year-view tbody td.cw')

  const calenderWeeksSet = new Set(calenderWeeks.map(weekString => parseInt(weekString, 10)))
  expect(calenderWeeksSet.size).to.be.within(52, 53)

  // Expected Result: No appointments are displayed in this view.
  I.dontSee('.appointment')

  // 3. Resize the browser window
  const sizesAndStyles = new Map([
    [400, 'width: calc(100% - 16px);'],
    [1000, 'width: calc(50% - 16px);'],
    [1280, 'width: calc(33.3333% - 16px);'],
    [1600, 'width: calc(25% - 16px);'],
    [2300, 'width: calc(16.6667% - 16px);']
  ])

  const resizeAndCheckStyle = (width, style) => {
    I.resizeWindow(width, 1000)
    I.seeNumberOfVisibleElements(`.year-view .month-container[style*="${style}"]`, 12)
  }

  // Expected Result: Layout switches between a 1, 2, 3, 4 or 6 columned view
  sizesAndStyles.forEach((style, width) => resizeAndCheckStyle(width, style))

  // 4. Use the arrow icons at the top of the view to move between years.
  const actualYearString = await I.grabTextFrom('.year-view .info')
  const actualYear = parseInt(actualYearString, 10)

  const checkCorrectYear = async (addedYears) => {
    const yearString = await I.grabTextFrom('.year-view .info')
    const year = parseInt(yearString, 10)
    // Expected Result: Years will change accordingly
    expect(year).to.equal(actualYear + addedYears)
  }

  I.click('~Next year')
  await checkCorrectYear(1)

  I.click('~Previous year')
  I.click('~Previous year')
  await checkCorrectYear(-1)

  // reset year to the actual year
  I.click('~Next year')

  // 5. Click on the Year at the top of the view
  I.waitForText(`${actualYear}`, 5, '.calendar-header')
  I.click(`${actualYear}`)

  // Expected Result: A year picker will open
  I.waitForVisible('.date-picker.open')
  I.see(`${Math.floor(actualYear / 10) * 10} - ${(Math.floor(actualYear / 10) * 10) + 11}`)

  // 6. Choose a year -20 and +20 years in the past and future from now and verify the week days on random days are correct
  const checkCorrectDays = async (addedYears) => {
    const startDay = moment().startOf('year').add(addedYears, 'years').format('d')
    const endDay = moment().endOf('year').add(addedYears, 'years').format('d')
    const daysLocator = locate('td')
      .after('.cw')
      .inside('.year-view-container')
    const { 0: firstWeek, length: l, [l - 1]: lastWeek } = _(await I.grabTextFromAll(daysLocator)).chunk(7)
    expect(`${firstWeek.indexOf('1')}`).to.equal(startDay)
    expect(`${lastWeek.indexOf('31')}`).to.equal(endDay)
  }

  I.click('~Go to next decade')
  I.click('~Go to next decade')
  I.click(`#year_${actualYear + 20}`, '.date-picker.open')
  await checkCorrectDays(20)

  I.click(`${actualYear + 20}`)
  I.click('~Go to previous decade')
  I.click('~Go to previous decade')
  I.click('~Go to previous decade')
  I.click('~Go to previous decade')
  I.click(`#year_${actualYear - 20}`, '.date-picker.open')
  await checkCorrectDays(-20)

  // 7. Click on any date
  // click the first 15th this will reliably open January
  I.click('15', '.year-view .month-container')

  // Expected Result: The respective month will be opened in month view
  I.waitForVisible('.monthview-container')
  I.see('January', '.monthview-container')
})

Scenario('[C236795] Visibility Flags', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  const startDate = moment().startOf('week').add(1, 'days')
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Standard visibility')
  calendar.setDate('startDate', startDate)
  I.click('~Start time')
  I.click('12:00 PM')
  I.selectOption('Visibility', 'Standard')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.newAppointment()
  I.fillField('Title', 'Private visibility')
  calendar.setDate('startDate', startDate)
  I.click('~Start time')
  I.click('1:00 PM')
  I.selectOption('Visibility', 'Private')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.newAppointment()
  I.fillField('Title', 'Secret visibility')
  calendar.setDate('startDate', startDate)
  I.click('~Start time')
  I.click('2:00 PM')
  I.selectOption('Visibility', 'Secret')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.waitForElement(locate('.appointment').withText('Secret visibility'))
  within(locate('.appointment').withText('Standard visibility'), () => {
    I.dontSeeElement('.confidential-flag')
    I.dontSeeElement('.private-flag')
  })

  within(locate('.appointment').withText('Private visibility'), () => {
    I.seeElement('.confidential-flag')
    I.dontSeeElement('.private-flag')
  })

  within(locate('.appointment').withText('Secret visibility'), () => {
    I.dontSeeElement('.confidential-flag')
    I.seeElement('.private-flag')
  })
})

Scenario('[C236832] Navigate by using the mini calendar in folder tree', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  // 1. Sign in, switch to calendar
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // Expected Result: The current month switches as you click the "previous" or "next" month button
  // 2. Switch month by using the arrows of the mini calendar on the left
  const currentMonth = moment().format('MMMM YYYY')
  const nextMonth = moment().add(1, 'month').format('MMMM YYYY')
  const previousMonth = moment().subtract(1, 'month').format('MMMM YYYY')

  I.see(currentMonth, '.window-sidepanel .date-picker')
  I.click('~Go to next month')
  I.see(nextMonth, '.window-sidepanel .date-picker')
  I.click('~Go to previous month')
  I.click('~Go to previous month')
  I.see(previousMonth, '.window-sidepanel .date-picker')

  // 3. Click the name of the current calendar month
  const year = moment().subtract(1, 'month').format('YYYY')
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  I.click(previousMonth, '.window-sidepanel .date-picker')
  I.seeElement(locate('span').withText(year).inside('.window-sidepanel .date-picker'))

  // Expected Result: The mini calendar show all 12 months
  months.forEach(month => I.see(`${month.slice(0, 3)}`, '.window-sidepanel .date-picker .grid'))

  // 4. Click the number of the current year
  const minYear = Math.floor(Number(year) / 10) * 10
  const maxYear = minYear + 11
  const years = _.range(minYear, maxYear)
  I.click(year, '.window-sidepanel .date-picker')
  I.seeElement(locate('span').withText(`${minYear} - ${maxYear}`).inside('.window-sidepanel .date-picker'))

  // Expected Results: The mini calendar show all years from 2010-2021
  years.forEach(year => I.see(`${year}`, '.window-sidepanel .date-picker .grid'))

  // minyear + 8 is a bit more futureproof as hardcoded 2018
  // 5. Select "2018" as year
  I.click(`#year_${minYear + 8}`, '.window-sidepanel .date-picker .grid')
  I.seeElement(locate('span').withText(`${minYear + 8}`).inside('.window-sidepanel .date-picker'))

  // All months are displayed of 2018 (as in step 3)
  months.forEach(month => I.see(`${month.slice(0, 3)}`, '.window-sidepanel .date-picker .grid'))

  // 6. Select a month
  I.click(`#month_${minYear + 8}-07`, '.window-sidepanel .date-picker .grid')
  I.seeElement(locate('div').withText(`July ${minYear + 8}`).inside('.window-sidepanel .date-picker'))

  // Expected Result: The whole month is displayed
  const daysLocator = locate('td').after('.cw').inside('.window-sidepanel .date-picker .grid')
  const days = new Set(await I.grabTextFromAll(daysLocator))

  expect(days.size).to.equal(31)
  _.range(1, 32).forEach(day => expect(days.has(`${day}`)).to.be.true)

  // 7. Select a day
  const seventeenLocator = locate('td.date').withText('17').inside('.window-sidepanel .date-picker .grid .date')

  I.click(seventeenLocator)

  // Expected Result: The selected year, month and day is shown in the view on the right
  I.see(`July ${minYear + 8}`, '.weekview-container .info')
  I.see('17', '.weekview-container .weekview-toolbar .weekday')
})

Scenario('[C252158] All my public appointments', async ({ I, users, calendar, dialogs }) => {
  const [userA, userB] = users
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userA }),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userB })
  ])
  // 1. User#A: Login and go to Calendar
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // 2. User#A: Create a public calendar (Cal#A)
  I.waitForElement({ css: 'button[data-contextmenu="mycalendars"]' })
  I.click({ css: 'button[data-contextmenu="mycalendars"]' }, '.folder-tree')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.waitForElement('input', 5)
  I.fillField('Calendar name', 'Cal#A')
  I.checkOption('Add as public calendar')
  I.click('Add')
  I.waitForVisible('#io-ox-core')

  // 3. User#A: Share the newly created calendar to all other users
  I.waitForElement(locate('.folder-arrow').inside('~Public calendars'))
  I.forceClick(locate('.folder-arrow').inside('~Public calendars'))
  I.waitForText('Cal#A', 15, '.window-sidepanel')
  I.click('~Cal#A')
  I.rightClick('~Cal#A')
  I.waitForText('Permissions')
  I.click('Permissions')
  I.waitForVisible('.share-permissions-dialog')
  I.waitForFocus('.form-control.tt-input')
  I.fillField('.form-control.tt-input', userB.get('primaryEmail'))
  I.pressKey('Enter')
  I.click('Save')
  I.waitForDetached('.share-permissions-dialog')

  // 4. User#A: Create a new appointment in that calendar and invite User#B
  const subject = `${userA.get('name')}s awesome appointment`

  I.clickPrimary('New appointment')
  I.waitForText('Appointments in public calendar')
  I.click('Create in public calendar')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', subject)
  I.fillField('Starts on', moment().format('L'))
  I.see('Cal#A', '.io-ox-calendar-edit-window .folder-selection')
  I.click('~Start time')
  I.pressKey('Enter')
  I.pressKey(['Control', 'a'])
  I.pressKeys(moment().format('hh:mm'))
  I.pressKey('Enter')
  I.fillField('Participants and resources', userB.get('primaryEmail'))
  I.pressKey('Enter')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // 5. User#B: Login and go to Calendar
  I.logout()

  I.login('app=io.ox/calendar', { user: userB })
  I.waitForVisible('.io-ox-calendar-window')

  // 6. User#B: Enable "All my public appointments" view and disable Cal#A
  I.waitForVisible('~Public calendars')
  I.click(locate('.folder-arrow').inside('~Public calendars'))
  I.seeElement({ css: 'div[title="All my public appointments"] .color-label.selected' })
  I.dontSeeElement({ css: 'div[title="Cal#A"] .color-label.selected' })

  // Expected Result: The appointment from step 4 is shown
  I.waitForText(subject, 5, '.appointment')

  // 7. User#B: Enable "All my public appointments" view and enable Cal#A
  I.click('.color-label', { css: 'div[title="Cal#A"]' })
  I.seeElement({ css: 'div[title="Cal#A"] .color-label.selected' })

  // Expected Result: The appointment from step 4 is shown only once.
  I.waitForText(subject, 5, '.appointment')
  const ariaLabel = subject + ', Category: Blue'
  I.seeNumberOfElements(`.appointment[aria-label="${ariaLabel}"]`, 1)

  // 8. User#B: Disable "All my public appointments" view and enable Cal#A
  I.click('.color-label', { css: 'div[title="All my public appointments"]' })
  I.dontSeeElement({ css: 'div[title="All my public appointments"] .color-label.selected' })

  // Expected Result: The appointment from step 4 is shown
  I.waitForText(subject, 5, '.appointment')

  // 9. User#B: Disable "All my public appointments" view and disbale Cal#A
  I.click('.color-label', { css: 'div[title="Cal#A"]' })
  I.dontSeeElement({ css: 'div[title="Cal#A"] .color-label.selected' })

  // Expected Result: The appointment from step 4 is not shown
  I.seeNumberOfElements(`.appointment[aria-label="${ariaLabel}"]`, 0)
  I.dontSee(subject)
})

Scenario('[C265147] Appointment organizer should be marked in attendee list', async ({ I, calendar, users }) => {
  const [userA, userB] = users

  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userA }),
    I.haveSetting({ 'io.ox/calendar': { layout: 'week:week' } }, { user: userB })
  ])

  // 1. Login as User#A
  // 2. Go to Calendar
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // 3. Create new appointment
  const subject = `${userA.get('name')}s awesome appointment`
  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.retry(5).fillField('Title', subject)
  I.fillField('Starts on', moment().format('L'))
  const startTime = moment()
  I.click('~Start time')
  I.pressKey('Enter')
  I.pressKey(['Control', 'a'])
  I.pressKeys(startTime.format('hh:mm P'))
  I.pressKey('Enter')

  // 4. add User#B as participant
  I.fillField('Participants and resources', userB.get('primaryEmail'))
  I.pressKey('Enter')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
  I.logout()

  // 5. Login with User#B
  // 6. Go to Calendar
  I.login('app=io.ox/calendar', { user: userB })
  I.waitForVisible('.io-ox-calendar-window')
  I.waitForVisible('.appointment')

  // 7. Open Appointment
  I.click(subject, '.appointment')
  I.waitForElement('.calendar-detail.view')
  I.seeNumberOfElements('.calendar-detail.view', 1)

  // 8. Check if User#A is set as organizer
  I.see(subject, '.detail-popup')
  I.see(`${userA.get('sur_name')}, ${userA.get('given_name')}`, '.detail-popup')
  I.see(`${userB.get('sur_name')}, ${userB.get('given_name')}`, '.detail-popup')

  // Expected Result: User#A is set as Organizer
  const organizerLocator = locate('li.participant')
    .withDescendant({ css: `a[title="${userA.get('primaryEmail')}"]` })
    .withDescendant('.label-organizer')
  I.seeElement(organizerLocator)
})

Scenario('[C274410] Subscribe shared Calendar and [C274410] Unsubscribe shared Calendar', async ({ I, users, calendar, dialogs }) => {
  const sharedCalendarName = `${users[0].get('sur_name')}, ${users[0].get('given_name')}: New calendar`
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` })

  // share folder for preconditions
  // TODO: should be part of the haveFolder helper
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('New calendar')
  I.rightClick('[aria-label^="New calendar"]')
  I.waitForText('Share / Permissions')
  I.click('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForText('Permissions for calendar "New calendar"')
  I.fillField('.modal-dialog .tt-input', users[1].get('primaryEmail'))
  I.waitForText(calendar.getFullname(users[1]), undefined, '.tt-dropdown-menu')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.share-permissions-dialog .modal-dialog')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })

  I.retry(5).doubleClick('~Shared calendars')
  I.waitForText(sharedCalendarName)

  I.retry(5).click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared calendar')

  dialogs.waitForVisible()
  I.waitForText('Subscribe to shared calendars')

  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="subscribed"]' }))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedCalendarName)).find('.checkbox'))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="used_for_sync"]' }))

  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForInvisible(locate('*').withText(sharedCalendarName))

  I.retry(5).click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared calendar')

  dialogs.waitForVisible()
  I.waitForText('Subscribe to shared calendars')

  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedCalendarName)).find('.checkbox'))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedCalendarName)).find({ css: 'label' }).withText('Sync via DAV'))

  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForText(sharedCalendarName)
})

Scenario('Manage public Calendars', async ({ I, users, calendar, dialogs }) => {
  const publicCalendarName = `${users[0].get('sur_name')}, ${users[0].get('given_name')}: New public`

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // create public calendar
  I.say('Create public calendar')
  I.waitForElement({ css: 'button[data-contextmenu="mycalendars"]' })
  I.click({ css: 'button[data-contextmenu="mycalendars"]' }, '.folder-tree')

  I.clickDropdown('Add new calendar')

  dialogs.waitForVisible()
  I.fillField('input[placeholder="New calendar"]', publicCalendarName)
  I.waitForText('Add as public calendar', 5, dialogs.body)
  I.checkOption('Add as public calendar', dialogs.body)
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible('~Public calendars')
  I.click(locate('.folder-arrow').inside('~Public calendars'))

  I.waitForText(publicCalendarName)
  I.rightClick(`[aria-label^="${publicCalendarName}"]`)
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForElement('.form-control.tt-input', 5)

  await within('.modal-dialog', () => {
    I.waitForFocus('.tt-input')
    I.fillField('.tt-input[placeholder="Name or email address"]', 'All users')
    I.waitForVisible(locate('.tt-dropdown-menu').withText('All users'))
    I.pressKey('Enter')
    I.waitForVisible(locate('.permissions-view .row').withText('All users'))
  })

  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })

  I.waitForVisible('~Public calendars')
  I.doubleClick('~Public calendars')
  I.waitForText(publicCalendarName)

  I.click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared calendar')

  dialogs.waitForVisible()
  I.waitForText('Subscribe to shared calendars')

  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(publicCalendarName)).find({ css: 'input[name="subscribed"]' }))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(publicCalendarName)).find({ css: 'input[name="used_for_sync"]' }))

  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.logout()

  // cleanup
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // remove public calendar
  I.waitForText(publicCalendarName)
  I.rightClick(`~${publicCalendarName}`)

  I.clickDropdown('Delete')
  dialogs.waitForVisible()
  I.waitForElement('[data-action="delete"]', 5)
  dialogs.clickButton('Delete')
})

Scenario('Weeks with daylight saving changes are rendered correctly: Weekstart Sunday, change to daylight saving', async ({ I, calendar }) => {
  // see: OXUIB-146 Fix daylight saving issues

  await Promise.all([
    I.haveAppointment({
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { value: '20200329T120000' },
      endDate: { value: '20200329T130000' }
    }),
    I.haveAppointment({
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20200329T060000' },
      endDate: { tzid: 'America/New_York', value: '20200329T070000' }
    }),
    I.haveAppointment({
      summary: 'Monday 12-13 date without daylight saving change',
      startDate: { value: '20200330T120000' },
      endDate: { value: '20200330T130000' }
    }),
    I.haveAppointment({
      summary: 'Monday 12-13 date without daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20200330T060000' },
      endDate: { tzid: 'America/New_York', value: '20200330T070000' }
    })
  ])

  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // jump to daylight saving change
  await I.executeScript(async function (datestring) {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    apps.get('io.ox/calendar').setDate(moment('2020-03-29'))
  })

  // grab css
  I.waitForElement('.day:nth-child(2) .appointment')
  const topOfAppointment1 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(2) .appointment')

  I.waitForElement('.day:nth-child(2) .appointment')
  const topOfAppointment2 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(2) .appointment')

  I.waitForElement('.day:nth-child(3) .appointment')
  const topOfAppointment3 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(3) .appointment')

  I.waitForElement('.day:nth-child(3) .appointment')
  const topOfAppointment4 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(3) .appointment')

  // must be 50% because we set the appointments to 12 o clock
  expect(topOfAppointment1).to.equal('calc(50% - 1px)')
  expect(topOfAppointment2).to.equal('calc(50% - 1px)')
  expect(topOfAppointment3).to.equal('calc(50% - 1px)')
  expect(topOfAppointment4).to.equal('calc(50% - 1px)')
})

Scenario('Weeks with daylight saving changes are rendered correctly: Weekstart Sunday, change from daylight saving', async ({ I, calendar }) => {
  // see: OXUIB-146 Fix daylight saving issues
  await Promise.all([
    I.haveAppointment({
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { value: '20201025T120000' },
      endDate: { value: '20201025T130000' }
    }),
    I.haveAppointment({
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20201025T070000' },
      endDate: { tzid: 'America/New_York', value: '20201025T080000' }
    }),
    I.haveAppointment({
      summary: 'Monday 12-13 date without daylight saving change',
      startDate: { value: '20201026T120000' },
      endDate: { value: '20201026T130000' }
    }),
    I.haveAppointment({
      summary: 'Monday 12-13 date without daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20201026T070000' },
      endDate: { tzid: 'America/New_York', value: '20201026T080000' }
    })
  ])

  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // jump to daylight saving change
  await I.executeScript(async function (datestring) {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    apps.get('io.ox/calendar').setDate(moment('2020-10-25'))
  })

  // grab css
  I.waitForElement('.day:nth-child(2) .appointment')
  const topOfAppointment1 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(2) .appointment')

  I.waitForElement('.day:nth-child(2) .appointment')
  const topOfAppointment2 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(2) .appointment')

  I.waitForElement('.day:nth-child(3) .appointment')
  const topOfAppointment3 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(3) .appointment')

  I.waitForElement('.day:nth-child(3) .appointment')
  const topOfAppointment4 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(3) .appointment')

  // must be 50% because we set the appointments to 12 o clock
  expect(topOfAppointment1).to.equal('calc(50% - 1px)')
  expect(topOfAppointment2).to.equal('calc(50% - 1px)')
  expect(topOfAppointment3).to.equal('calc(50% - 1px)')
  expect(topOfAppointment4).to.equal('calc(50% - 1px)')
})

Scenario('Weeks with daylight saving changes are rendered correctly: Weekstart Monday, change to daylight saving', async ({ I, calendar }) => {
  // see: OXUIB-146 Fix daylight saving issues
  await I.haveSetting({
    'io.ox/core': { localeData: { firstDayOfWeek: 'monday' } },
    'io.ox/calendar': { layout: 'week:week' }
  })
  const folder = `cal://0/${await I.grabDefaultFolder('calendar')}`

  await Promise.all([
    I.haveAppointment({
      folder,
      summary: 'Saturday 12-13 date without daylight saving change',
      startDate: { value: '20200328T120000' },
      endDate: { value: '20200328T130000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Saturday 12-13 date without daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20200328T070000' },
      endDate: { tzid: 'America/New_York', value: '20200328T080000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { value: '20200329T120000' },
      endDate: { value: '20200329T130000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20200329T060000' },
      endDate: { tzid: 'America/New_York', value: '20200329T070000' }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // jump to daylight saving change
  await I.executeScript(async function (datestring) {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    apps.get('io.ox/calendar').setDate(moment('2020-03-23'))
  })

  // grab css
  I.waitForElement('.day:nth-child(7) .appointment')
  const topOfAppointment1 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(7) .appointment')

  I.waitForElement('.day:nth-child(7) .appointment')
  const topOfAppointment2 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(7) .appointment')

  I.waitForElement('.day:nth-child(8) .appointment')
  const topOfAppointment3 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(8) .appointment')

  I.waitForElement('.day:nth-child(8) .appointment')
  const topOfAppointment4 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(8) .appointment')

  // must be 50% because we set the appointments to 12 o clock
  expect(topOfAppointment1).to.equal('calc(50% - 1px)')
  expect(topOfAppointment2).to.equal('calc(50% - 1px)')
  expect(topOfAppointment3).to.equal('calc(50% - 1px)')
  expect(topOfAppointment4).to.equal('calc(50% - 1px)')
})

Scenario('Weeks with daylight saving changes are rendered correctly: Weekstart Monday, change from daylight saving', async ({ I, calendar }) => {
  // see: OXUIB-146 Fix daylight saving issues
  await I.haveSetting({
    'io.ox/core': { localeData: { firstDayOfWeek: 'monday' } },
    'io.ox/calendar': { layout: 'week:week' }
  })
  const folder = `cal://0/${await I.grabDefaultFolder('calendar')}`

  await Promise.all([
    I.haveAppointment({
      folder,
      summary: 'Saturday 12-13 date without daylight saving change',
      startDate: { value: '20201024T120000' },
      endDate: { value: '20201024T130000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Saturday 12-13 date without daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20201024T060000' },
      endDate: { tzid: 'America/New_York', value: '20201024T070000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { value: '20201025T120000' },
      endDate: { value: '20201025T130000' }
    }),
    I.haveAppointment({
      folder,
      summary: 'Sunday 12-13 date with daylight saving change',
      startDate: { tzid: 'America/New_York', value: '20201025T070000' },
      endDate: { tzid: 'America/New_York', value: '20201025T080000' }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // jump to daylight saving change
  await I.executeScript(async function (datestring) {
    const { default: apps } = await import(String(new URL('io.ox/core/api/apps.js', location.href)))
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    apps.get('io.ox/calendar').setDate(moment('2020-10-19'))
  })

  // grab css
  I.waitForElement('.day:nth-child(7) .appointment')
  const topOfAppointment1 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(7) .appointment')

  I.waitForElement('.day:nth-child(7) .appointment')
  const topOfAppointment2 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(7) .appointment')

  I.waitForElement('.day:nth-child(8) .appointment')
  const topOfAppointment3 = await I.executeScript(el => document.querySelectorAll(el)[0].style.top, '.day:nth-child(8) .appointment')

  I.waitForElement('.day:nth-child(8) .appointment')
  const topOfAppointment4 = await I.executeScript(el => document.querySelectorAll(el)[1].style.top, '.day:nth-child(8) .appointment')

  // must be 50% because we set the appointments to 12 o clock
  expect(topOfAppointment1).to.equal('calc(50% - 1px)')
  expect(topOfAppointment2).to.equal('calc(50% - 1px)')
  expect(topOfAppointment3).to.equal('calc(50% - 1px)')
  expect(topOfAppointment4).to.equal('calc(50% - 1px)')
})

Scenario('[C85743] Special-Use flags', async ({ I, dialogs, settings }) => {
  I.login('app=io.ox/settings&folder=virtual/settings/io.ox/settings/accounts')
  I.waitForApp()
  I.waitForText('Edit', 5, '.io-ox-accounts-settings')
  I.waitForNetworkTraffic()
  I.click('Edit', '.io-ox-accounts-settings')
  dialogs.waitForVisible()
  I.scrollTo('#sent_fullname')
  I.seeInField('#sent_fullname', 'Sent') // Default if no special use folder exists on imap (AdminUser.properties:SENT_MAILFOLDER_EN_US)
  I.dontSeeInField('#sent_fullname', 'Sent Messages')
})

Scenario('OXUIB-1278 Events from different timezones displayed on wrong day', async ({ I, users }) => {
  // create appointment
  await I.haveAppointment({
    summary: 'Pacific time',
    startDate: { value: '20220105T193000', tzid: 'America/Los_Angeles' },
    endDate: { value: '20220105T200000', tzid: 'America/Los_Angeles' },
    attendees: [{ entity: users[0].get('id') }]
  })

  // America timezone -> Event should be on january 5th
  await I.haveSetting({
    'io.ox/core': { timezone: 'America/Los_Angeles' },
    'io.ox/calendar': { layout: 'month' }
  })

  I.login(['app=io.ox/calendar'])
  I.waitForText('Today')
  I.executeScript(async function () {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    // january 2022
    ox.ui.App.getCurrentApp().setDate(1643379200000)
  })
  I.waitForText('Pacific time')
  I.see('Pacific time', '#\\32 022-1-5')
  I.logout()

  // Asia Timezone -> Event should be on january 6th
  await I.haveSetting({
    'io.ox/core': { timezone: 'Asia/Hong_Kong' },
    'io.ox/calendar': { layout: 'month' }
  })

  I.login(['app=io.ox/calendar'])
  I.waitForText('Today')
  I.executeScript(async function () {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    // january 2022
    ox.ui.App.getCurrentApp().setDate(1643379200000)
  })
  I.waitForText('Pacific time')
  I.see('Pacific time', '#\\32 022-1-6')
})

Scenario('[OXUIB-1894] Show this calendar only highlighting', async ({ I, calendar, users }) => {
  const time = moment().startOf('isoWeek').add(16, 'hours')

  const defaultFolder = `cal://0/${await I.grabDefaultFolder('calendar')}`

  await Promise.all([
    I.haveAppointment({
      folder: defaultFolder,
      summary: 'appointment in standard folder',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveAppointment({
      folder: await I.haveFolder({ title: 'New calendar', module: 'event', parent: defaultFolder }),
      summary: 'appointment in new folder',
      startDate: { value: time.add(1, 'hour') },
      endDate: { value: time.add(2, 'hour') }
    })
  ])

  I.login(['app=io.ox/calendar'])
  I.waitForApp()
  I.waitNumberOfVisibleElements('.appointment', 2)
  I.click('.contextmenu-control[data-contextmenu="default"]')
  I.waitForVisible('.dropdown.open')
  I.clickDropdown('Show this calendar only')
  I.waitForDetached('.dropdown.open')
  I.waitForNetworkTraffic()
  I.waitNumberOfVisibleElements('.appointment', 1)
  const backgroundPropertyUnselected = await I.grabCssPropertyFrom('.folder-node[title="New calendar"] .color-label', 'background')
  expect(backgroundPropertyUnselected).to.not.include('url("data:image/svg')

  I.click('.contextmenu-control[data-contextmenu="default"]')
  I.waitForVisible('.dropdown.open')
  I.click('Show all calendars')
  I.waitForDetached('.dropdown.open')
  I.waitForNetworkTraffic()
  I.waitNumberOfVisibleElements('.appointment', 2)
  const backgroundPropertySelected = await I.grabCssPropertyFrom('.folder-node[title="New calendar"] .color-label', 'background')
  expect(backgroundPropertySelected).to.include('url("data:image/svg')

  I.doubleClick(`.folder[data-id="${defaultFolder}"] .folder-label`)
  I.waitForNetworkTraffic()
  I.waitNumberOfVisibleElements('.appointment', 1)
  const propertyUnselectedDoubleclick = await I.grabCssPropertyFrom('.folder-node[title="New calendar"] .color-label', 'background')
  expect(propertyUnselectedDoubleclick).to.not.include('url("data:image/svg')

  I.doubleClick(`.folder[data-id="${defaultFolder}"] .folder-label`)
  I.waitForNetworkTraffic()
  I.waitNumberOfVisibleElements('.appointment', 2)
  const propertySelectedDoubleclick = await I.grabCssPropertyFrom('.folder-node[title="New calendar"] .color-label', 'background')
  expect(propertySelectedDoubleclick).to.include('url("data:image/svg')
})
