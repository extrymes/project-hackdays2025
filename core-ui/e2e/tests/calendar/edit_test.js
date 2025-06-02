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
const expect = require('chai').expect

Feature('Calendar > Edit')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  const { I } = inject()
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7449] Move appointment to folder', async ({ I, calendar, dialogs }) => {
  const folder = `cal://0/${await I.grabDefaultFolder('calendar')}`
  const time = moment().startOf('week').add(8, 'days').add(10, 'hours')
  await I.haveFolder({ title: 'New calendar', module: 'event', parent: folder })
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  if (!moment().isSame(time, 'month')) I.click('~Go to next month', calendar.miniCalendar)
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, calendar.miniCalendar)

  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('List')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')

  I.waitForVisible(locate('~More actions').inside('.detail-popup'))
  I.click('~More actions', '.detail-popup')
  I.click('Move')

  dialogs.waitForVisible()
  within('.modal-dialog', () => {
    I.click('.folder-arrow', '~My calendars')
    I.waitForVisible('[title="New calendar"]')
    I.click('[title="New calendar"]')
  })
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')

  // disable the other folder
  I.waitForElement('[aria-label^="New calendar"][aria-checked="true"]')
  I.click('[title="New calendar"] .color-label')
  I.waitForElement('[aria-label^="New calendar"][aria-checked="false"]')

  // check all views to verify that the appointment is gone
  I.waitForInvisible('.page.current .appointment')
  I.dontSee('Testappointment')

  calendar.switchView('Day')
  I.waitForInvisible('.page.current .appointment')
  I.dontSee('Testappointment')

  calendar.switchView('Month')
  I.waitForInvisible('.page.current .appointment')
  I.dontSee('Testappointment')

  calendar.switchView('List')
  I.waitForInvisible('.page.current .appointment')
  I.dontSee('Testappointment')

  calendar.switchView('Workweek')
  I.waitForInvisible('.page.current .appointment')
  I.dontSee('Testappointment')

  // enable the other folder
  I.click('[title="New calendar"] .color-label')
  I.waitForElement('[aria-label^="New calendar"][aria-checked="true"]')

  // open all views and verify that the appointment is there again
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('List')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
})

Scenario('[C7450] Edit private appointment', async ({ I, calendar }) => {
  const time = moment().startOf('week').add(8, 'days').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    class: 'CONFIDENTIAL'
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  if (!moment().isSame(time, 'month')) I.click('~Go to next month', '.window-sidepanel')
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, '.window-sidepanel')

  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.seeElement('div[title="Testappointment"] .bi-eye-slash, .contentContainer .bi-eye-slash')

  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.seeElement('div[title="Testappointment"] .bi-eye-slash, .contentContainer .bi-eye-slash')

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.seeElement('div[title="Testappointment"] .bi-eye-slash, .contentContainer .bi-eye-slash')

  calendar.switchView('List')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.seeElement('div[title="Testappointment"] .bi-eye-slash, .contentContainer .bi-eye-slash')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.seeElement('div[title="Testappointment"] .bi-eye-slash, .contentContainer .bi-eye-slash')

  // edit the appointment
  I.doubleClick('.page.current .appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForText('Visibility', 5, calendar.editWindow)
  I.selectOption('Visibility', 'Standard')

  I.click('Save')
  I.waitForDetached(calendar.editWindow)

  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.waitForInvisible(locate('.bi-eye-slash').inside('~Testappointment').inside('.page.current'))

  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.waitForInvisible(locate('.bi-eye-slash').inside('~Testappointment').inside('.page.current'))

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.waitForInvisible(locate('.bi-eye-slash').inside('~Testappointment').inside('.page.current'))

  calendar.switchView('List')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.waitForInvisible(locate('.bi-eye-slash').inside('~Testappointment').inside('.page.current'))

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.see('Testappointment')
  I.waitForInvisible(locate('.bi-eye-slash').inside('~Testappointment').inside('.page.current'))
})

Scenario('[OXUIB-818] Edit public appointment when folder not checked', async ({ I, calendar }) => {
  const folder = await I.haveFolder({ title: 'myPublic', module: 'event', subscribed: 1, parent: '2' })
  const time = moment().startOf('week').add(1, 'days').add(10, 'hours')
  I.say(folder)
  await I.haveAppointment({
    folder,
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    class: 'PUBLIC'
  })

  // load
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.switchView('Week')
  I.waitForText('Testappointment')

  // check
  I.doubleClick('.page.current .appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForText('Save')
  I.click('Save')
  I.waitForDetached(calendar.editWindow)
})

Scenario('[C7451] Edit yearly series via doubleclick', async ({ I, calendar }) => {
  const time = moment('1612', 'DDMM').add(10, 'hours') // cSpell:disable-line
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    rrule: 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=16' // cSpell:disable-line
  })

  I.login('app=io.ox/calendar')
  I.waitForElement('~Go to next month')

  // select the next 16.th december via the mini calendar
  const diffMonth = time.diff(moment().startOf('month'), 'months')
  for (let i = 0; i < diffMonth; i++) I.click('~Go to next month', calendar.miniCalendar)
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, calendar.miniCalendar)

  calendar.switchView('Week')
  I.waitForVisible(`.page.current .day:nth-child(${time.weekday() + 2}) .appointment`)
  I.click('.appointment', '.page.current')
  I.waitForElement('~Edit')
  I.click('~Edit', '.detail-popup')
  I.waitForText('Do you want to edit the whole series or just this appointment within the series?')
  I.click('Edit series')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  await calendar.setDate('startDate', time.startOf('week').add(10, 'hours'))

  I.click('Save')
  I.waitForDetached(calendar.editWindow)

  I.waitForVisible(`.page.current .day:nth-child(${time.weekday() + 2}) .appointment`)

  time.add(1, 'year')
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click('~Go to next month', calendar.miniCalendar)
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, calendar.miniCalendar)

  I.waitForVisible(`.page.current .day:nth-child(${time.weekday() + 2}) .appointment`)
})

Scenario('[C7464] Change appointment in shared folder as guest', async ({ I, users, calendar }) => {
  const time = moment().startOf('isoWeek').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }]
  })

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForText('Testappointment')

  I.doubleClick('.appointment')
  I.dontSeeElement(calendar.editWindow)
})

Scenario('[C7465] Edit appointment in shared folder as author', async ({ I, users, calendar, dialogs }) => {
  const folder = await I.haveFolder({ title: 'New calendar', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` })
  const time = moment().startOf('isoWeek').add(7, 'days').add(10, 'hours')
  await I.haveAppointment({
    folder,
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  // share folder for preconditions
  // TODO: should be part of the haveFolder helper
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('New calendar')
  I.rightClick('[aria-label^="New calendar"]')
  I.waitForText('Share / Permissions')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForText('Permissions for calendar "New calendar"')
  I.waitForVisible('.permission-pre-selection .btn')
  I.click('.permission-pre-selection .btn')
  I.clickDropdown('Author')
  I.waitForDetached('.dropdown.open')
  I.fillField('.modal-dialog .tt-input', users[1].get('primaryEmail'))
  I.waitForVisible(locate('*').withText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`).inside('.tt-dropdown-menu'))
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.share-permissions-dialog')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })

  I.waitForElement('.folder[data-id="virtual/flat/event/shared"]')
  // switch on New calendar
  I.click('.folder[data-id="virtual/flat/event/shared"] .folder-arrow')
  I.click({ css: `[title="${users[0].get('sur_name')}, ${users[0].get('given_name')}: New calendar"] .color-label` })
  I.click('~Next week', '.page.current')

  I.waitForText('Testappointment')

  // 1. Double click to the appointment
  I.doubleClick('.page.current .appointment')
  I.waitForVisible(calendar.editWindow)

  // 2. Change Subject, Location and Description.
  I.waitForText('Title', 5, calendar.editWindow)
  I.fillField('Title', 'Changedappointment')
  I.fillField('Location', 'Changedlocation')
  I.fillField('Description', 'Changeddescription')

  // 3. Click "Save"
  I.click('Save')
  I.waitForDetached(calendar.editWindow)

  // 4. Check this appointment in all views.
  calendar.switchView('Workweek')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.click('.appointment', '.page.current')
  I.waitForText('Changedappointment', 5, '.calendar-detail')
  I.see('Changedlocation')
  I.see('Changeddescription')

  calendar.switchView('Week')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.click('.appointment', '.page.current')
  I.waitForText('Changedappointment', 5, '.calendar-detail')
  I.see('Changedlocation')
  I.see('Changeddescription')

  calendar.switchView('Day')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.click('.appointment', '.page.current')
  I.waitForText('Changedappointment', 5, '.calendar-detail')
  I.see('Changedlocation')
  I.see('Changeddescription')

  calendar.switchView('Month')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.click('.appointment', '.page.current')
  I.waitForText('Changedappointment', 5, '.calendar-detail')
  I.see('Changedlocation')
  I.see('Changeddescription')

  calendar.switchView('List')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  I.click('.appointment', '.page.current')
  I.waitForText('Changedappointment', 5, '.calendar-detail')
  I.see('Changedlocation')
  I.see('Changeddescription')
})

Scenario('[C234659] Split appointment series', async ({ I, users, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)

  I.fillField('Title', 'Testsubject')
  await calendar.setDate('startDate', moment().startOf('isoWeek'))
  I.click('~Start time')
  I.click('4:00 PM')

  I.checkOption('Repeat')
  I.click('Every Monday.')

  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.waitForText('Testsubject')
  I.seeNumberOfElements('.appointment', 5)

  I.click(locate('.appointment').at(2))
  I.waitForVisible('.detail-popup .inline-toolbar-container')

  I.click('~Edit')
  I.waitForText('Do you want to edit this and all future appointments or just this appointment within the series?')
  I.click('Edit all future appointments')

  I.waitForVisible(calendar.editWindow)

  I.fillField('input.add-participant.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')

  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.click('.appointment')
  I.waitForVisible('.detail-popup')
  I.dontSee(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, '.detail-popup')
  I.click('~Close', '.detail-popup')

  I.click(locate('.appointment').at(2))
  I.waitForVisible('.detail-popup')
  I.see(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, '.detail-popup')
})

Scenario('[C234679] Exceptions changes on series modification', async ({ I, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)

  I.waitForText('Title', 5, calendar.editWindow)
  I.fillField('Title', 'Testsubject')
  await calendar.setDate('startDate', moment().startOf('isoWeek'))
  I.click('~Start time')
  I.click('4:00 PM')

  I.checkOption('Repeat')
  I.click('Every Monday.')

  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.waitForText('Testsubject')
  I.seeNumberOfElements('.appointment', 5)

  I.click(locate('.appointment').at(2).as('appointment'))
  I.waitForVisible('.detail-popup')

  I.waitForElement('~Edit')
  I.click('~Edit')
  I.waitForText('Do you want to edit this and all future appointments or just this appointment within the series?')
  I.click('Edit this appointment')

  I.waitForVisible(calendar.editWindow)

  I.waitForElement('~Start time')
  I.click('~Start time')
  I.fillField('Start time', '5:00 PM')

  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // click on the first .appointment and edit it
  I.click('.appointment')
  I.waitForVisible('.detail-popup')

  I.waitForElement('~Edit')
  I.click('~Edit')
  I.waitForText('Do you want to edit the whole series or just this appointment within the series?')
  I.click('Edit series')

  I.waitForVisible(calendar.editWindow)

  I.waitForText('Title', 5, calendar.editWindow)
  I.fillField('Title', 'Changedsubject')

  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.click(locate('.appointment').at(2).as('appointment'))
  I.waitForVisible('.detail-popup')
  I.waitForText('Changedsubject', undefined, '.detail-popup')
})

Scenario('[C7467] Delete recurring appointment in shared folder as author', async ({ I, users, calendar, dialogs }) => {
  const folder = await I.haveFolder({ title: 'New calendar', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` })
  const time = moment().startOf('isoWeek').add(10, 'hours')
  await I.haveAppointment({
    folder,
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    rrule: 'FREQ=DAILY;COUNT=5'
  })

  // share folder for preconditions
  // TODO: should be part of the haveFolder helper
  I.login('app=io.ox/calendar')

  I.waitForText('New calendar')
  I.rightClick('[aria-label^="New calendar"]')
  I.waitForText('Share / Permissions')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForText('Permissions for calendar "New calendar"')
  I.waitForVisible('.permission-pre-selection .btn')
  I.click('.permission-pre-selection .btn')
  I.clickDropdown('Author')
  I.waitForDetached('.dropdown.open')
  I.fillField('.modal-dialog .tt-input', users[1].get('primaryEmail'))
  I.waitForVisible(locate('*').withText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`).inside('.tt-dropdown-menu'))
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.share-permissions-dialog')

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })

  I.waitForElement('[data-id="virtual/flat/event/shared"]')
  // switch on New calendar
  I.doubleClick('~Shared calendars')
  I.click(`[title="${users[0].get('sur_name')}, ${users[0].get('given_name')}: New calendar"] .color-label`)

  I.waitForText('Testappointment')

  // delete appointment
  I.click('.page.current .appointment')

  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup .inline-toolbar-container')

  I.waitForText('Do you want to delete all appointments of the series or just this appointment?')
  I.click('Delete all appointments')

  I.waitForDetached('.detail-popup')

  I.waitForInvisible('.appointment')
})

Scenario('[C7470] Delete a recurring appointment', async ({ I, calendar }) => {
  const folder = await I.haveFolder({ title: 'New calendar', module: 'event', parent: `cal://0/${await I.grabDefaultFolder('calendar')}` })
  const time = moment().startOf('isoWeek').add(10, 'hours')
  await I.haveAppointment({
    folder,
    summary: 'Testappointment',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    rrule: 'FREQ=DAILY'
  })

  I.login('app=io.ox/calendar')
  I.waitForText('Testappointment')

  calendar.switchView('Week')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  calendar.switchView('Day')
  I.click(`.date-picker td[aria-label*="${time.format('M/D/YYYY')}"]`)
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  calendar.switchView('Month')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  calendar.switchView('List')
  I.waitForVisible(locate('.appointment').inside('.page.current'))
  calendar.switchView('Workweek')
  I.waitForVisible(locate('.appointment').inside('.page.current'))

  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')

  I.click('~Delete')

  I.waitForText('Do you want to delete all appointments of the series or just this appointment?')
  I.click('Delete all appointments')

  I.waitForDetached('.detail-popup')

  I.waitForInvisible(locate('.appointment').inside('.page.current'))
  calendar.switchView('Workweek')
  I.dontSee('.appointment', '.page.current')
  calendar.switchView('Week')
  I.dontSee('.appointment', '.page.current')
  calendar.switchView('Day')
  I.dontSee('.appointment', '.page.current')
  calendar.switchView('Month')
  I.dontSee('.appointment', '.page.current')
  calendar.switchView('List')
  I.dontSee('.appointment', '.page.current')
})

Scenario('[C274402] Change organizer of appointment with internal attendees', async ({ I, users, calendar, dialogs }) => {
  await I.haveSetting({ 'io.ox/calendar': { 'chronos/allowChangeOfOrganizer': true } })
  const time = moment().startOf('isoWeek').add(3, 'days').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Testsubject',
    location: 'Testlocation',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }]
  })
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('Testsubject')
  I.click('.appointment')

  I.waitForVisible('.detail-popup')
  I.waitForText(calendar.getFullname(users[0]), 5, '.detail-popup .participant')
  I.waitForElement(locate('li.participant').at(1).withChild(`a[title="${users[0].get('primaryEmail')}"]`))
  I.waitForElement(locate('li.participant').at(1).withChild('.label-organizer'))

  I.click('~More actions', '.detail-popup')
  I.click('Change organizer')

  dialogs.waitForVisible()
  I.waitForText('Change organizer', 5, dialogs.header)
  I.fillField('New organizer', users[1].get('primaryEmail'))
  I.waitForVisible(locate('*').withText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`).inside('.tt-dropdown-menu'))
  I.pressKey('ArrowDown')
  I.pressKey('Enter')

  I.fillField('Add a message to the notification email for the other participants.', 'Testcomment')
  dialogs.clickButton('Change')
  I.waitForDetached('.modal-dialog')

  I.waitForElement(locate('li.participant').at(1).withChild(`a[title="${users[1].get('primaryEmail')}"]`))
  I.waitForElement(locate('li.participant').at(1).withChild('.label-organizer'))
})

Scenario('[C274409] Change organizer of series with internal attendees', async ({ I, users, calendar, dialogs }) => {
  const time = moment().startOf('isoWeek').add(10, 'hours')
  await Promise.all([
    I.haveSetting({ 'io.ox/calendar': { 'chronos/allowChangeOfOrganizer': true } }),
    I.haveAppointment({
      summary: 'Testsubject',
      location: 'Testlocation',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') },
      attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }],
      rrule: 'FREQ=DAILY;COUNT=5'
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForText('Testsubject')
  I.waitForEnabled(locate('.appointment').at(2))
  I.click(locate('.appointment').at(2))
  I.waitForVisible('.detail-popup')
  I.waitForText(calendar.getFullname(users[0]), 5, '.detail-popup .participant')
  I.waitForElement(locate('li.participant').at(1).withChild(`a[title="${users[0].get('primaryEmail')}"]`))
  I.waitForElement(locate('li.participant').at(1).withChild('.label-organizer'))

  I.click('~More actions', '.detail-popup')
  I.click('Change organizer')

  I.waitForText('Do you want to edit this and all future appointments or the whole series?')
  I.click('Edit all future appointments')

  dialogs.waitForVisible()
  I.waitForText('Change organizer', 5, dialogs.header)
  I.fillField('New organizer', users[1].get('primaryEmail'))
  I.waitForVisible(locate('*').withText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`).inside('.tt-dropdown-menu'))
  I.pressKey('ArrowDown')
  I.pressKey('Enter')

  I.fillField('Add a message to the notification email for the other participants.', 'Testcomment')
  dialogs.clickButton('Change')
  I.waitForDetached('.modal-dialog')

  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  I.waitForEnabled(locate('.appointment').at(2))
  I.click(locate('.appointment').at(2))
  I.waitForVisible('.detail-popup')
  I.waitForText(calendar.getFullname(users[1]), 5, '.detail-popup .participant')
  I.waitForElement(locate('li.participant').at(1).withChild(`a[title="${users[1].get('primaryEmail')}"]`))
  I.waitForElement(locate('li.participant').at(1).withChild('.label-organizer'))
  I.click('~Close', '.detail-popup')

  I.waitForEnabled(locate('.appointment').at(1))
  I.click(locate('.appointment').at(1))
  I.waitForVisible('.detail-popup')
  I.waitForText(calendar.getFullname(users[0]), 5, '.detail-popup .participant')
  I.waitForElement(locate('li.participant').at(1).withChild(`a[title="${users[0].get('primaryEmail')}"]`))
  I.waitForElement(locate('li.participant').at(1).withChild('.label-organizer'))
})

Scenario('[C265149] As event organizer I can add a textual reason why an event was canceled', async ({ I, users, calendar, dialogs }) => {
  await I.haveSetting({ 'io.ox/calendar': { notifyNewModifiedDeleted: true } })
  const time = moment().startOf('isoWeek').add(10, 'hours')
  // single appointment without additional participants
  await Promise.all([
    I.haveAppointment({
      summary: 'Appointment1',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    // recurring appointment without additional participants
    I.haveAppointment({
      summary: 'Appointment2',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') },
      rrule: 'FREQ=DAILY;COUNT=5'
    }),
    // single appointment with additional participants
    I.haveAppointment({
      summary: 'Appointment3',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') },
      attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }]
    }),
    // recurring appointment with additional participants
    I.haveAppointment({
      summary: 'Appointment4',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') },
      attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }],
      rrule: 'FREQ=DAILY;COUNT=5'
    })
  ])

  I.login('app=io.ox/calendar')

  // Delete single appointment without additional participants => no comment field
  I.waitForVisible('.appointment')
  I.click('Appointment1', '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to delete this appointment?', 5, dialogs.body)
  dialogs.clickButton('Delete appointment')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.detail-popup')

  // Delete recurring appointment without additional participants => no comment field
  I.click('Appointment2', '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  I.waitForText('Do you want to delete all appointments of the series or just this appointment?', 5, dialogs.body)
  dialogs.clickButton('Delete all appointments')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.detail-popup')

  // Delete single appointment with additional participants => comment field
  I.click('Appointment3', '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  I.waitForText('Delete appointment', 5, dialogs.header)
  I.waitForText('Add a message to the notification email for the other participants.', 5, dialogs.body)
  dialogs.clickButton('Delete appointment')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.detail-popup')

  // Delete recurring appointment with additional participants => comment field
  I.click('Appointment4', '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Delete', 5)
  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  I.waitForText('Delete appointment', 5, dialogs.header)
  I.waitForText('Add a message to the notification email for the other participants.', 5, dialogs.body)
  dialogs.clickButton('Delete all appointments')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.detail-popup')
})

Scenario('[C7452] Edit weekly recurring appointment via Drag&Drop', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { notifyNewModifiedDeleted: true } })
  // recurring appointment without additional participants
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: moment().startOf('isoWeek').add(10, 'hours') },
    endDate: { value: moment().startOf('isoWeek').add(10, 'hours').add(1, 'hour') },
    rrule: 'FREQ=WEEKLY;BYDAY=MO;INTERVAL=2;COUNT=3' // cSpell:disable-line
  })

  I.login('app=io.ox/calendar')

  I.waitForText('Testappointment')
  I.see('Testappointment', locate('.page.current .day').at(1))
  I.scrollTo('.page.current .appointment')
  I.dragAndDrop('.page.current .appointment', locate('.page.current .day').at(2).find('.timeslot').at(21))
  I.waitForText('Do you want to edit the whole series or just this appointment within the series?')
  I.click('Edit series')

  I.waitForInvisible('.page.current .appointment.io-ox-busy')
  I.see('Testappointment', locate('.page.current .day').at(2))

  calendar.switchView('Week')

  if (moment().day() === 0) I.click(locate('~Previous week').at(2))
  I.waitForVisible('.page.current .appointment')
  I.see('Testappointment', locate('.page.current .day').at(3))

  // use 5th child here as the container has another child before the first .day
  I.scrollTo('.page.current .appointment')
  I.dragAndDrop(locate('.page.current .appointment'), locate('.page.current .day').at(4).find('.timeslot').at(21))
  I.waitForText('Do you want to edit the whole series or just this appointment within the series?')
  I.click('Edit series')

  I.waitForInvisible('.page.current .appointment.io-ox-busy')
  I.see('Testappointment', locate('.page.current .day').at(4))

  calendar.switchView('Month')

  I.waitForVisible('.page.current .appointment')
  I.see('Testappointment', `[id="${moment().startOf('isoWeek').add(10, 'hours').add(2, 'days').format('YYYY-M-D')}"]`)

  I.scrollTo('.page.current .appointment')
  I.dragAndDrop(locate('.page.current .appointment'), `[id="${moment().startOf('isoWeek').add(10, 'hours').add(3, 'days').format('YYYY-M-D')}"]`)
  I.waitForText('Do you want to edit the whole series or just this appointment within the series?')
  I.click('Edit series')

  I.waitForInvisible('.page.current .appointment.io-ox-busy')
  I.see('Testappointment', { css: `[id="${moment().startOf('isoWeek').add(10, 'hours').add(3, 'days').format('YYYY-M-D')}"]` })
})

Scenario('[C7453] Edit appointment, set the all day checkmark', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { 'chronos/allowChangeOfOrganizer': true } })
  const time = moment().startOf('isoWeek').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Testsubject',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })
  const appointment = locate('.page.current .appointment-container .appointment')
    .withText('Testsubject')
    .as('Test appointment container')

  I.login('app=io.ox/calendar')
  I.waitForElement(appointment)

  I.doubleClick('.page.current .appointment')
  I.waitForElement(calendar.editWindow)
  I.waitForText('All day')
  I.checkOption('All day')
  I.click('Save')

  I.waitForInvisible(appointment)
  I.waitForVisible(locate('.page.current .fulltime-container .appointment').withText('Testsubject'))
})

Scenario('[C7457] Edit appointment via toolbar', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { 'chronos/allowChangeOfOrganizer': true } })
  const time = moment().startOf('week').add(8, 'days').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Testsubject',
    location: 'Testlocation',
    description: 'Testdescription',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // select the according day in the mini datepicker
  if (!moment().isSame(time, 'month')) I.click('~Go to next month', calendar.miniCalendar)
  I.waitForElement(`~${time.format('l, dddd')}, CW ${time.week()}`)
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, calendar.miniCalendar)

  // open all views and load the appointment there
  calendar.switchView('Day')
  I.waitForVisible(locate('*').withText('Testsubject').inside('.page.current'))

  calendar.switchView('Month')
  I.waitForVisible(locate('*').withText('Testsubject').inside('.page.current'))

  calendar.switchView('List')
  I.waitForVisible(locate('*').withText('Testsubject').inside('.page.current'))

  calendar.switchView('Week')
  I.waitForVisible(locate('*').withText('Testsubject').inside('.page.current'))

  calendar.switchView('Workweek')
  I.waitForVisible(locate('*').withText('Testsubject').inside('.page.current'))

  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForElement('~Edit', 5)
  I.click('~Edit')

  I.waitForVisible(calendar.editWindow)
  I.waitForText('Title', 5, calendar.editWindow)
  I.fillField('Title', 'Newsubject')
  I.fillField('Location', 'Newlocation')
  I.fillField('Description', 'Newdescription')
  I.click('Save')

  // open all views and check the appointment there
  calendar.switchView('Day')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForText('Newsubject', 5, '.calendar-detail')
  I.see('Newlocation', '.calendar-detail')
  I.see('Newdescription', '.calendar-detail')
  I.click('~Close', '.detail-popup')

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForText('Newsubject', 5, '.calendar-detail')
  I.see('Newlocation', '.calendar-detail')
  I.see('Newdescription', '.calendar-detail')
  I.click('~Close', '.detail-popup')

  calendar.switchView('List')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForText('Newsubject', 5, '.calendar-detail')
  I.see('Newlocation', '.calendar-detail')
  I.see('Newdescription', '.calendar-detail')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForText('Newsubject', 5, '.calendar-detail')
  I.see('Newlocation', '.calendar-detail')
  I.see('Newdescription', '.calendar-detail')
  I.click('~Close', '.detail-popup')

  calendar.switchView('Workweek')
  I.waitForElement('.page.current .appointment')
  I.click('.appointment', '.page.current')
  I.waitForVisible('.detail-popup')
  I.waitForText('Newsubject', 5, '.calendar-detail')
  I.see('Newlocation', '.calendar-detail')
  I.see('Newdescription', '.calendar-detail')
  I.click('~Close', '.detail-popup')
})

Scenario('[C7454] Edit appointment, all-day to one hour', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveAppointment({
      summary: 'C7454',
      location: 'C7454',
      description: 'C7454',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().format('YYYYMMDD') },
      endDate: { value: moment().format('YYYYMMDD') },
      attendees: [
        {
          cuType: 'INDIVIDUAL',
          cn: `${users[0].get('given_name')} ${users[0].get('sur_name')}`,
          partStat: 'ACCEPTED',
          entity: users[0].get('id'),
          email: users[0].get('primaryEmail'),
          uri: `mailto:${users[0].get('primaryEmail')}`,
          contact: {
            display_name: `${users[0].get('given_name')} ${users[0].get('sur_name')}`,
            first_name: users[0].get('given_name'),
            last_name: users[0].get('sur_name')
          }
        }
      ]
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  calendar.clickAppointment('C7454')
  I.waitForElement('.detail-popup', 5)
  I.waitForElement('~Edit', 5)
  I.click('~Edit')
  I.waitForElement('[data-app-name="io.ox/calendar/edit"] .io-ox-calendar-edit', 5)
  I.waitForVisible('[data-app-name="io.ox/calendar/edit"] .io-ox-calendar-edit', 5)
  I.uncheckOption({ css: 'input[name="allDay"]' })
  I.click('~Start time')
  I.click('[data-attribute="startDate"] [data-value="12:00 PM"]', '.dropdown-menu.calendaredit')
  I.click('~End time')
  I.click('[data-attribute="endDate"] [data-value="1:00 PM"]')
  I.click('Save')
  I.waitForDetached('[data-app-name="io.ox/calendar/edit"] .io-ox-calendar-edit')
  calendar.clickAppointment('C7454')
  I.waitForElement('.detail-popup', 5)
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('12:00\u2009–\u20091:00\u202FPM')
})

Scenario('[C7462] Remove a participant', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveAppointment({
      summary: 'C7462',
      location: 'C7462',
      description: 'C7462',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment() },
      endDate: { value: moment().add(1, 'hours') },
      attendees: [{
        cuType: 'INDIVIDUAL',
        cn: `${users[0].get('given_name')} ${users[0].get('sur_name')}`,
        partStat: 'ACCEPTED',
        entity: users[0].get('id'),
        email: users[0].get('primaryEmail'),
        uri: `mailto:${users[0].get('primaryEmail')}`,
        contact: {
          display_name: `${users[0].get('given_name')} ${users[0].get('sur_name')}`,
          first_name: users[0].get('given_name'),
          last_name: users[0].get('sur_name')
        }
      },
      {
        cuType: 'INDIVIDUAL',
        cn: `${users[1].get('given_name')} ${users[1].get('sur_name')}`,
        partStat: 'ACCEPTED',
        entity: users[1].get('id'),
        email: users[1].get('primaryEmail'),
        uri: 'mailto:' + users[1].get('primaryEmail'),
        contact: {
          display_name: `${users[1].get('given_name')} ${users[1].get('sur_name')}`,
          first_name: users[1].get('given_name'),
          last_name: users[1].get('sur_name')
        }
      }]
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.appointment-container [aria-label^="C7462, C7462"]')
  I.click('.appointment-container [aria-label^="C7462, C7462"]')
  I.waitForVisible('.detail-popup')
  I.waitForElement('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForElement('.detail-popup a[title="' + users[1].get('primaryEmail') + '"]')
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForVisible('.io-ox-calendar-edit.container')

  I.scrollTo('.attendee-container')
  const removeButton = `.attendee[data-uri="mailto:${users[1].get('primaryEmail')}"] .remove`
  I.waitForElement(removeButton)
  I.click(removeButton)
  I.waitForDetached(removeButton)
  I.click('Save')
  I.waitForDetached('.floating-window-content')

  I.waitForElement('.appointment-container [aria-label^="C7462, C7462"]')
  I.waitForVisible('.detail-popup')
  I.waitForElement('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForElement('.bi-people')
  I.waitForText(calendar.getFullname(users[0]), 5, '.detail-popup .participant')
  const removeUser = locate('.detail-popup .participant').withText(calendar.getFullname(users[1]))
  I.waitForDetached(removeUser)
})

Scenario('[C7455] Edit appointment by changing the timeframe', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:day'),
    I.haveAppointment({
      summary: 'Dinner for one',
      startDate: { value: moment().startOf('day').add(12, 'hours') },
      endDate: { value: moment().startOf('day').add(13, 'hours') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForVisible('.appointment')
  I.scrollTo('.page.current .timeslot:nth-child(20)')
  I.dragAndDrop('.appointment .resizable-n', '.day .timeslot:nth-child(23)')
  I.waitForVisible('.appointment:not(.resizing) .appointment-content')
  I.waitForDetached('.appointment.io-ox-busy')
  I.click('.appointment')
  I.waitForVisible('.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('11:00\u2009–\u20091:00\u202FPM')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')
  I.scrollTo('.page.current .timeslot:nth-child(25)')
  I.dragAndDrop('.appointment .resizable-s', '.day .timeslot:nth-child(28)')
  I.waitForVisible('.page.current .appointment:not(.resizing) .appointment-content')
  I.waitForDetached('.appointment.io-ox-busy')
  I.click('.appointment')
  I.waitForVisible('.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('11:00\u2009–\u20092:00\u202FPM')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  calendar.switchView('Week')
  I.waitForText('Dinner for one')
  I.click('.page.current .appointment')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('11:00\u2009–\u20092:00\u202FPM')

  calendar.switchView('Month')
  I.waitForText('Dinner for one')
  I.click('.page.current .appointment')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('11:00\u2009–\u20092:00\u202FPM')
  calendar.switchView('List')
  I.waitForText('11:00 AM')
})

Scenario('[C7456] Edit appointment via Drag & Drop', async ({ I, calendar }) => {
  const summary = 'Brexit'
  // Create Appointment
  await I.haveAppointment({
    summary,
    description: 'This appointment is moved constantly.',
    startDate: { value: moment().startOf('day').add(12, 'hours') },
    endDate: { value: moment().startOf('day').add(13, 'hours') }
  })
  await I.haveSetting('io.ox/calendar//layout', 'week:day')

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  I.waitForElement('.appointment')
  // have to scroll appointment into view for drag & drop to work

  // select first appointment element
  I.executeScript(() => document.querySelector('.appointment-content').scrollIntoView(true))

  I.dragAndDrop('.appointment .appointment-content', '.day .timeslot:nth-child(27)')
  I.wait(0.5) // wait for animation

  I.click(summary, '.appointment')
  I.waitForVisible('.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('1:00\u2009–\u20092:00\u202FPM')

  calendar.switchView('Week')
  I.waitForElement('.page.current .appointment')
  I.click('.page.current .appointment')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('1:00\u2009–\u20092:00\u202FPM')

  calendar.switchView('Month')
  I.waitForElement('.page.current .appointment')
  I.click('.page.current .appointment')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText('1:00\u2009–\u20092:00\u202FPM')

  calendar.switchView('List')
  I.waitForText('1:00 PM')
})

Scenario('[C7458] Edit appointment by doubleclick', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { notifyNewModifiedDeleted: true, layout: 'week:week' } })

  // You already had created a non all-day appointment
  await I.haveAppointment({
    summary: 'Mr. Torques early explosions',
    startDate: { value: moment().startOf('day').add(1, 'hour') },
    endDate: { value: moment().startOf('day').add(2, 'hour') }
  })

  // 1. Double click to an appointment
  I.login(['app=io.ox/calendar'])
  I.waitForApp()
  I.waitForText('Mr. Torques early explosions', 5, '.appointment')
  I.doubleClick('.page.current .appointment')

  // Expected Result: Edit tab is opened.
  I.waitForVisible(calendar.editWindow)

  // 2. Change Subject, Location and Description.
  I.waitForText('Title', 5, '.io-ox-calendar-edit-window')
  I.fillField('Title', 'EXPLOSIONS in the morning')
  I.fillField('Location', 'Pandora')
  I.fillField('Description', 'Lorem EXPLOSIONS sit dolor!')

  // 3. Click "Save"
  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // 4. Check this appointment in all views.
  // Expected Result: The appointment has been changed successfully.
  calendar.switchView('Week')
  I.waitForText('EXPLOSIONS in the morning', 5, '.page.current .appointment')
  I.click('EXPLOSIONS in the morning', '.page.current .appointment')
  I.waitForText('EXPLOSIONS in the morning', 5, '.detail-popup')
  I.waitForText('Pandora', 5, '.detail-popup')
  I.waitForText('Lorem EXPLOSIONS sit dolor!', 5, '.detail-popup')

  calendar.switchView('Day')
  I.waitForText('EXPLOSIONS in the morning', 5, '.page.current .appointment')
  I.click('EXPLOSIONS in the morning', '.page.current .appointment')
  I.waitForText('EXPLOSIONS in the morning', 5, '.detail-popup')
  I.waitForText('Pandora', 5, '.detail-popup')
  I.waitForText('Lorem EXPLOSIONS sit dolor!', 5, '.detail-popup')

  calendar.switchView('Month')
  I.waitForText('EXPLOSIONS in the morning', 5, '.page.current .appointment')
  I.click('EXPLOSIONS in the morning', '.page.current .appointment')
  I.waitForText('EXPLOSIONS in the morning', 5, '.detail-popup')
  I.waitForText('Pandora', 5, '.detail-popup')
  I.waitForText('Lorem EXPLOSIONS sit dolor!', 5, '.detail-popup')

  calendar.switchView('List')
  I.waitForText('EXPLOSIONS in the morning', 5, '.page.current .appointment')
  I.click('EXPLOSIONS in the morning', '.page.current .appointment')
  I.waitForText('EXPLOSIONS in the morning', 5, '.calendar-detail-pane')
  I.waitForText('Pandora', 5, '.calendar-detail-pane')
  I.waitForText('Lorem EXPLOSIONS sit dolor!', 5, '.calendar-detail-pane')
})

Scenario('[C7463] Remove a resource', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { layout: 'week:week' } })
  const timestamp = Math.round(+new Date() / 1000)
  const name = `C7463 - ${timestamp}`
  const mailaddress = `C7463${timestamp}@bla.de`
  const resourceID = await I.haveResource({ description: name, display_name: name, name, mailaddress })
  await I.haveAppointment({
    summary: name,
    location: name,
    description: name,
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().add(1, 'hours') },
    startDate: { value: moment() },
    attendees: [{
      cuType: 'RESOURCE',
      comment: timestamp,
      cn: resourceID.display_name,
      email: mailaddress,
      entity: resourceID
    }]
  })
  const haloResourceLink = locate('[data-detail-popup="resource"]').inside('.participant-list').withText(name)
  const participantName = locate('.attendee-name').withText(name)
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')
  I.waitForElement(locate('.calendar-header button').withText('Today'))
  I.waitForElement('.appointment-container [aria-label^="' + name + ', ' + name + '"]', 5)
  I.click('.appointment-container [aria-label^="' + name + ', ' + name + '"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForElement('[data-action="io.ox/calendar/detail/actions/edit"]', 5)
  expect(await I.grabNumberOfVisibleElements(haloResourceLink)).to.equal(1)
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForElement(participantName)
  expect(await I.grabNumberOfVisibleElements(participantName)).to.equal(1)
  I.click(`.attendee[data-uri="mailto:${mailaddress}"] .remove`)
  expect(await I.grabNumberOfVisibleElements(participantName)).to.equal(0)
  I.click('Save')
  I.waitForDetached('.io-ox-calendar-edit.container', 5)
  I.waitForDetached(haloResourceLink)
  expect(await I.grabNumberOfVisibleElements(haloResourceLink)).to.equal(0)
  await I.dontHaveResource(name)
})

Scenario('Resource visibility in address book picker', async ({ I, users, calendar, mail, dialogs }) => {
  const [user1, user2] = users
  await I.dontHaveResource('Meeting room')
  await I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' })

  // check mail compose
  I.login()
  I.waitForApp()
  mail.newMail()
  I.waitForVisible('~Select contacts')
  I.click('~Select contacts')
  dialogs.waitForVisible()

  I.waitForText(user1.get('primaryEmail'), 5, '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')
  I.dontSee('Meeting room', '.modal.addressbook-popup')

  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal.addressbook-popup')
  I.click('~Close', '.io-ox-mail-compose-window')

  // Check calendar and permission
  I.openApp('Calendar')
  I.waitForApp()
  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('Title', 'test')
  I.waitForVisible('~Select contacts')
  I.scrollTo('~Select contacts')
  I.click('~Select contacts')

  dialogs.waitForVisible()
  I.waitForText('Meeting room', 5, '.modal.addressbook-popup')
  I.see(user1.get('primaryEmail'), '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')

  I.selectOption('.folder-dropdown', 'All resources')
  I.dontSee(user1.get('primaryEmail'), '.modal.addressbook-popup')
  I.dontSee(user2.get('primaryEmail'), '.modal.addressbook-popup')
  I.see('Meeting room', '.modal.addressbook-popup')

  I.click('.list-item.selectable', '.modal.addressbook-popup')
  I.waitForText('1 address selected')
  dialogs.clickButton('Select')
  I.waitForDetached('.modal.addressbook-popup')

  I.waitForText('Meeting room', 5, '.attendee[data-type="resource"]')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  calendar.moveCalendarViewToNextWeek()
  I.waitForElement('.page.current .appointment')
  I.click(`~Actions for ${user1.get('sur_name')}, ${user1.get('given_name')}`)
  I.waitForVisible('.dropdown.open')

  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForEnabled('~Select contacts')
  I.click('~Select contacts')

  dialogs.waitForVisible()
  I.waitForText(user1.get('primaryEmail'), 5, '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')
  I.dontSee('Meeting room', '.modal.addressbook-popup')

  dialogs.clickButton('Cancel')
  I.waitForInvisible('.modal.addressbook-popup')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.share-permission-dialog')

  calendar.newAppointment()
  I.waitForVisible('~Select contacts')
  I.scrollTo('~Select contacts')
  I.click('~Select contacts')

  dialogs.waitForVisible()
  I.waitForText('Meeting room', 5, '.modal.addressbook-popup')
  I.see(user1.get('primaryEmail'), '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')
  dialogs.clickButton('Cancel')
  I.waitForInvisible('.addressbook-popup')
  I.waitForText('Discard')
  I.click('Discard', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitForDetached('.dropdown-toggle.disabled')
  I.waitForEnabled('.io-ox-calendar-window .primary-action .dropdown-toggle')
  I.click('~More actions', '.io-ox-calendar-window')
  I.waitForText('Scheduling')
  I.click('Scheduling')
  I.waitForVisible('~Select contacts')
  I.click('~Select contacts')

  dialogs.waitForVisible()
  I.waitForText(user1.get('primaryEmail'), 5, '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')
  I.see('Meeting room', '.modal.addressbook-popup')
  I.click(locate('.list-item.selectable').withText('Meeting room').inside('.modal.addressbook-popup'))
  I.waitForText('1 address selected')
  dialogs.clickButton('Select')
  I.waitForInvisible('.modal.addressbook-popup')

  I.waitForText('Meeting room', 5, '.attendee[data-type="resource"]')

  I.click('Save as distribution list')
  I.waitForVisible('.io-ox-contacts-distrib-window')
  I.waitForText(user1.get('primaryEmail'))
  I.dontSee('Meeting room', '.io-ox-contacts-distrib-window')

  I.waitForVisible('~Select contacts')
  I.click('~Select contacts', '.io-ox-contacts-distrib-window')
  dialogs.waitForVisible()
  I.waitForText(user1.get('primaryEmail'), 5, '.modal.addressbook-popup')
  I.see(user2.get('primaryEmail'), '.modal.addressbook-popup')
  I.dontSee('Meeting room', '.modal.addressbook-popup')
})

Scenario('Edit a simple appointment @smoketest', async ({ I, calendar }) => {
  const time = moment().startOf('week').add(8, 'days').add(10, 'hours')
  await I.haveAppointment({
    summary: 'Test appointment',
    location: 'Test location',
    description: 'Test description',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  if (!moment().isSame(time, 'month')) I.click('~Go to next month', '.window-sidepanel')
  I.click(`~${time.format('l, dddd')}, CW ${time.week()}`, '.window-sidepanel')

  calendar.switchView('List')
  I.waitForText('Test appointment', 5, '.calendar-list-view')
  I.waitForText('Test location', 5, '.calendar-list-view')
  I.waitForText('Test description', 5, '.calendar-list-view .rightside')

  // edit the appointment
  calendar.clickAppointment('Test appointment')
  I.waitForVisible('~Edit appointment')
  I.click('~Edit appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForVisible('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'edited title')
  I.fillField('Location', 'edited location')
  I.fillField('Description', 'edited description')

  I.click('Save')
  I.waitForDetached(calendar.editWindow)

  // validate edited appointment
  I.waitForText('edited title', 5, '.calendar-list-view')
  I.waitForText('edited location', 5, '.calendar-list-view')
  I.waitForText('edited description', 5, '.calendar-list-view .rightside')
  I.dontSee('Test')
})

Scenario('Mark participants as optional', async ({ I, users, calendar }) => {
  const time = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'Optional participants',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    attendees: [{ entity: users[0].get('id') }, { entity: users[1].get('id') }]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('Optional participants', 5, '.appointment')
  I.click('Optional participants', '.appointment')
  I.waitForElement('.detail-popup ul.participant-list')
  I.see(calendar.getFullname(users[0]), '.participant')
  I.see(calendar.getFullname(users[1]), '.participant')
  I.dontSee('Optional', '.participant')

  I.click('~Edit', '.detail-popup')
  I.waitForVisible('.io-ox-calendar-edit-window .attendee-container')
  I.scrollTo('.attendee-container')
  const context = `.attendee[data-uri="mailto:${users[1].get('primaryEmail')}"]`
  I.click(`${context} .toggle-optional`)
  I.waitForText('Optional', 5, context)
  I.click('Save')
  I.waitForDetached(calendar.editWindow)

  I.waitForText('Optional', 5, 'ul.participant-list')
  I.seeNumberOfElements(locate('.detail-popup .participant').withText('Optional'), 1)
})
