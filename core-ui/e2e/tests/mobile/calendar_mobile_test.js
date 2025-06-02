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

Feature('Mobile > Calendar')

const moment = require('moment')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create and delete appointment with all fields @mobile', ({ I, users, dialogs, mobileCalendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  mobileCalendar.newAppointment()

  I.fillField('Title', 'test title')
  I.fillField('Location', 'test location')
  I.fillField('Description', 'test description')
  mobileCalendar.setDate('startDate', moment().set({ hour: 12, minutes: 0 }))
  I.click('Expand form', '.io-ox-calendar-edit-window')
  I.fillField('Participants and resources', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.selectOption('Visibility', 'Private')
  I.checkOption('All day')
  I.checkOption('Show as free')
  I.click('No reminder')
  dialogs.waitForVisible()
  I.waitForText('Add reminder', 5, dialogs.body)
  I.click('Add reminder')
  I.waitForText('15 minutes', 5, '.alarm-list-item')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Notify 15 minutes before start')
  I.click('Create', '.io-ox-calendar-edit-window')

  I.waitForDetached('.io-ox-calendar-edit-window', 15)
  I.waitForVisible('.page.current .appointment-panel .appointment.private.free')
  I.waitForText('test title', 5, '.day')
  I.see('test location', '.day')
  I.seeElement('.page.current .appointment-panel .appointment.private.free')
  I.seeElement('.confidential-flag')

  I.click('test title', '.fulltime-container')
  I.waitForElement('~Delete', 5)
  I.click('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.appointment')
})

Scenario('Create and discard appointment @mobile', ({ I, dialogs, mobileCalendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  mobileCalendar.newAppointment()

  I.fillField('Title', 'test title')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.clearField('Title')
  I.click('Discard')

  I.waitForDetached('.io-ox-calendar-edit')
})

Scenario('Edit an appointment in list view @mobile', async ({ I, mobileCalendar }) => {
  const time = moment().startOf('day').add(8, 'hours')
  await I.haveAppointment({
    summary: 'Test appointment',
    location: 'Test location',
    description: 'Test description',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('Test appointment', 5, '.appointment-container .appointment')
  I.waitForText('Test location', 5, '.appointment-container .appointment')
  I.click('.appointment-container .appointment')
  I.waitForText('Test location', 5, '.io-ox-calendar-window')
  I.waitForText('Test description', 5, '.io-ox-calendar-window')

  // edit the appointment
  I.waitForClickable('~Edit')
  I.click('~Edit')
  I.waitForVisible('.io-ox-calendar-edit-window')
  I.waitForVisible('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'edited title')
  I.fillField('Location', 'edited location')
  I.fillField('Description', 'edited description')

  I.click('Save')
  I.waitForDetached('.io-ox-calendar-edit-window')

  // validate edited appointment in detail view
  I.waitForText('edited title', 5, '.io-ox-calendar-window')
  I.waitForText('edited location', 5, '.io-ox-calendar-window')
  I.waitForText('edited description', 5, '.io-ox-calendar-window')
  I.dontSee('Test')
  // validate edited appointment in list view
  I.click('Back')
  I.waitForText('edited title', 5, '.appointment-container .appointment')
  I.waitForText('edited location', 5, '.appointment-container .appointment')
})

Scenario('Edit an appointment from list view @mobile', async ({ I, mobileCalendar }) => {
  const time = moment().startOf('day').add(8, 'hours')
  await I.haveAppointment({
    summary: 'Test appointment',
    location: 'Test location',
    description: 'Test description',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.click('~List view', '.mobile-toolbar')
  I.waitForText('Test appointment', 5, '.calendar-list-view')
  I.waitForText('Test location', 5, '.calendar-list-view')
  I.click('.list-item.appointment')
  I.waitForText('Test location', 5, '.calendar-detail-pane')
  I.waitForText('Test description', 5, '.calendar-detail-pane')

  // edit the appointment
  I.waitForVisible('~Edit')
  I.click('~Edit')
  I.waitForVisible('.io-ox-calendar-edit-window')
  I.waitForVisible('.io-ox-calendar-edit-window input[name="summary"]')
  I.fillField('Title', 'edited title')
  I.fillField('Location', 'edited location')
  I.fillField('Description', 'edited description')

  I.click('Save')
  I.waitForDetached('.io-ox-calendar-edit-window')

  // validate edited appointment in detail view
  I.waitForText('edited title', 5, '.calendar-detail-pane')
  I.waitForText('edited location', 5, '.calendar-detail-pane')
  I.waitForText('edited description', 5, '.calendar-detail-pane')
  I.dontSee('Test')
  // validate edited appointment in list view
  I.click('Back')
  I.waitForText('edited title', 5, '.calendar-list-view')
  I.waitForText('edited location', 5, '.calendar-list-view')
})

Scenario('Create an appointment in day view and delete it in list view @mobile', ({ I, dialogs, mobileCalendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  mobileCalendar.newAppointment()

  I.fillField('Title', 'test title')
  I.click('Create', mobileCalendar.editWindow)
  I.waitForDetached(mobileCalendar.editWindow, 15)

  I.click('~List view', '.mobile-toolbar')
  I.waitForText('test title', 5, '.list-item.appointment')
  I.click('.list-item.appointment')

  I.waitForClickable('~Delete')
  I.click('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete appointment')
  I.waitForDetached('.modal-dialog')
  I.waitForText('No appointments found')
})

// all I.wait()'s are necessary to wait for animations to settle
Scenario('Folder handling @mobile', ({ I, mobileCalendar, dialogs }) => {
  const toolbarLeft = locate({ xpath: './/*[contains(@class, "navbar-action left") and not(ancestor::*[contains(@style, "display: none;")])]' })
  const toolbarRight = locate({ xpath: './/*[contains(@class, "navbar-action right") and not(ancestor::*[contains(@style, "display: none;")])]' })
  const month = moment().format('MMMM')
  I.login(['app=io.ox/calendar'])
  I.waitForApp()

  // navigate to folder view and enter edit mode
  I.waitForVisible(toolbarLeft.withText(month).as('< To month view'))
  I.wait(1)
  I.click(toolbarLeft.withText(month).as('To month view'))
  I.waitForVisible(toolbarLeft.withText('Calendars').as('< Calendars'))
  I.wait(1)
  I.click(toolbarLeft.withText('Calendars').as('< Calendars'))
  I.waitForVisible(toolbarLeft.withText('Edit').as('Edit'))
  I.click(toolbarLeft.withText('Edit').as('Edit'))
  I.wait(0.5)

  // add new calendar
  I.click(locate('.folder-label').withText('My calendars'))
  I.waitForVisible('.dropdown-menu.custom-dropdown')
  I.wait(1)
  I.click('Add new calendar', '.dropdown-menu.custom-dropdown')
  dialogs.waitForVisible()
  I.fillField('Calendar name', 'Calendar name')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Calendar name', 5, '.folder-tree')

  // rename calendar
  I.click(locate('.folder-label').withText('Calendar name'))
  I.waitForVisible('.dropdown-menu.custom-dropdown')
  I.wait(1)
  I.click('Rename', '.dropdown-menu.custom-dropdown')
  dialogs.waitForVisible()
  I.fillField('Folder name', 'Renamed calendar')
  dialogs.clickButton('Rename')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Renamed calendar', 5, '.folder-tree')

  // cancel edit mode and navigate to day view
  I.waitForVisible(toolbarLeft.withText('Cancel').as('< Cancel'))
  I.wait(1)
  I.click(toolbarLeft.withText('Cancel').as('< Cancel'))
  I.waitForVisible(toolbarRight.withText('Back').as('Back >'))
  I.wait(1)
  I.click(toolbarRight.withText('Back').as('Back >'))
  I.waitForVisible('.month .today')
  I.wait(0.5)
  I.click('.month .today')
  I.waitForVisible('.appointment-container')
  I.wait(0.5)

  // create appointment
  mobileCalendar.newAppointment()
  I.fillField('Title', 'Appointment name')
  mobileCalendar.setDate('startDate', moment().set({ hour: 14, minutes: 0 }))
  I.click('Create', mobileCalendar.editWindow)
  I.waitForDetached(mobileCalendar.editWindow, 15)
  I.waitForText('Appointment name', 10)

  // navigate to folder view and enter edit mode
  I.waitForVisible(toolbarLeft.withText(month).as('< To month view'))
  I.wait(1)
  I.click(toolbarLeft.withText(month).as('To month view'))
  I.waitForVisible(toolbarLeft.withText('Calendars').as('< Calendars'))
  I.wait(1)
  I.click(toolbarLeft.withText('Calendars').as('< Calendars'))
  I.waitForVisible(toolbarLeft.withText('Edit').as('Edit'))
  I.click(toolbarLeft.withText('Edit').as('Edit'))
  I.wait(0.5)

  // delete calendar
  I.click(locate('.folder-label').withText('Renamed calendar'))
  I.waitForVisible('.dropdown-menu.custom-dropdown')
  I.wait(1)
  I.click('Delete', '.dropdown-menu.custom-dropdown')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached(locate('.folder-label').withText('Renamed calendar'))

  // cancel edit mode and navigate to day view
  I.waitForVisible(toolbarLeft.withText('Cancel').as('< Cancel'))
  I.wait(1)
  I.click(toolbarLeft.withText('Cancel').as('< Cancel'))
  I.waitForVisible(toolbarRight.withText('Back').as('Back >'))
  I.wait(1)
  I.click(toolbarRight.withText('Back').as('Back >'))
  I.waitForVisible('.month .today')
  I.wait(1)
  I.click('.month .today')
  I.waitForVisible('.appointment-container')
  I.waitForDetached('.appointment')
  I.dontSee('Appointment name')
})
