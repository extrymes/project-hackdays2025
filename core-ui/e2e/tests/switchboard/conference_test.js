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

Feature('Switchboard > Conference')

Before(async ({ users }) => {
  await Promise.all([users.create(), users.create()])
  await users[0].context.hasCapability('switchboard')
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointment with zoom conference', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: users[1] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])

  await session('userA', async () => {
    I.login('app=io.ox/calendar')
    calendar.newAppointment()
    I.fillField('[data-attribute="startDate"] .datepicker-day-field', moment().startOf('day').add(10, 'hours').format('L'))
    I.clearField('[data-attribute="startDate"] .time-field')
    I.fillField('[data-attribute="startDate"] .time-field', '8:00')
    I.fillField('Title', 'Appointment with Zoom conference')
    I.selectOption('conference-type', 'Zoom Meeting')
    I.waitForText('Connect with Zoom')
    I.click('Connect with Zoom')
    I.waitForVisible('.conference-view.zoom > .conference-logo')
    I.waitForText('Link', 10, '.conference-view.zoom')
    await calendar.addParticipant(users[1].get('name'))
    I.click('Create')
  })

  await session('userB', () => {
    I.login('app=io.ox/calendar', { user: users[1] })
    I.waitForApp()
    I.waitForVisible('.page.current .appointment')
    I.scrollTo('.page.current .appointment')
    I.waitForText('Appointment with Zoom conference', 5, '.page.current .appointment')
    I.click('Appointment with Zoom conference', '.page.current .appointment')
    I.waitForVisible('.detail-popup button[data-action="join"]')
    I.click('.detail-popup button[data-action="join"]')
  })

  await session('userA', () => {
    I.waitForVisible('.page.current .appointment')
    I.scrollTo('.page.current .appointment')
    I.waitForText('Appointment with Zoom conference', 5, '.page.current .appointment')
    I.click('Appointment with Zoom conference', '.page.current .appointment')
    I.waitForVisible('.detail-popup button[data-action="join"]')
    I.click('.detail-popup button[data-action="join"]')
  })
})

Scenario('Creating never ending recurring appointment with zoom conference', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Recurring Zoom Appointment')
  calendar.recurAppointment()
  I.waitForText('Apply', 5, '.recurrence-view-dialog')
  I.click('Apply', '.recurrence-view-dialog')
  I.selectOption('conference-type', 'Zoom Meeting')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo')
  I.waitForText('Link', 10, '.conference-view.zoom')
  I.waitForVisible('.alert-info.recurrence-warning')
  I.waitForText('Zoom meetings expire after 365 days.')
  I.click('Create')
  I.waitForVisible('.io-ox-alert')
})

Scenario('Appointment series with zoom conference can be changed into a single appointment', async ({ I, calendar, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  // Create recurring appointment with zoom conference
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  const date = calendar.startNextMonday()
  I.fillField('Title', 'OXUIB-397')
  I.selectOption('conference-type', 'Zoom Meeting')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo')
  I.waitForText('Link', 10, '.conference-view.zoom')
  calendar.recurAppointment(date)
  I.selectOption('.modal-dialog [name="until"]', 'After a number of occurrences')
  I.waitForVisible('.modal-dialog [name="occurrences"]')
  I.fillField('.modal-dialog [name="occurrences"]', '10')
  I.click('Apply', '.modal-footer')
  I.waitForDetached('.recurrence-view-dialog')
  I.click('Create')

  // Change appointment series into a single appointment
  I.waitForDetached(calendar.editWindow)
  calendar.moveCalendarViewToNextWeek()
  calendar.clickAppointment('OXUIB-397')
  I.waitForVisible('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForClickable('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit series')
  I.waitForVisible(calendar.editWindow)
  I.waitForVisible('.io-ox-calendar-edit select[name="conference-type"]')
  I.selectOption('conference-type', 'None')
  I.waitForDetached('.conference-view.zoom')
  I.dontSee('Link:')
  I.dontSeeElement('.conference-view.zoom > .conference-logo')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitToHide(locate('.detail-popup div').withText('Join Zoom meeting').as('Join Zoom meeting'), 5)
})

Scenario('Remove zoom conference from series exception', async ({ I, calendar, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  calendar.startNextMonday()
  I.fillField('Title', 'Series')
  I.selectOption('conference-type', 'Zoom Meeting')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo')
  I.waitForText('Link', 10, '.conference-view.zoom')
  calendar.recurAppointment()
  I.selectOption('.modal-dialog [name="until"]', 'After a number of occurrences')
  I.waitForVisible('.modal-dialog [name="occurrences"]')
  I.fillField('.modal-dialog [name="occurrences"]', '10')
  I.click('Apply', '.modal-footer')
  I.waitForDetached('.recurrence-view-dialog')
  I.click('Create')
  calendar.moveCalendarViewToNextWeek()
  // Check next series entry and remove zoom conference
  I.click('.control.next')
  calendar.clickAppointment('Series')
  I.waitForVisible('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForClickable('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit this appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForVisible('.io-ox-calendar-edit select[name="conference-type"]')
  I.selectOption('conference-type', 'None')
  I.waitForDetached('.conference-view.zoom')
  I.dontSee('Link:')
  I.dontSeeElement('.conference-view.zoom > .conference-logo')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.waitForDetached('.detail-popup')
  calendar.clickAppointment('Series')
  I.waitForVisible('.detail-popup')
  I.dontSeeElement('.detail-popup .horizontal-action-buttons')
  I.dontSee('Join Zoom meeting', '.detail-popup')
  I.click('~Close', '.detail-popup')

  // Check if next entry still has zoom conference
  I.click('.control.next')
  calendar.clickAppointment('Series')
  I.waitForVisible('.detail-popup')
  I.waitForText('Join Zoom meeting')
})

Scenario('Remove zoom conference from appointment series and check exception', async ({ I, calendar, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Series')
  I.selectOption('conference-type', 'Zoom Meeting')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo')
  I.waitForText('Link', 10, '.conference-view.zoom')
  await calendar.setDate('startDate', moment().startOf('isoWeek'))
  I.fillField('~Start time', '12:00 PM')
  calendar.recurAppointment()
  I.selectOption('.modal-dialog select[name="recurrence_type"]', 'Daily')
  I.selectOption('.modal-dialog select[name="until"]', 'After a number of occurrences')
  I.waitForVisible('.modal-dialog input[name="occurrences"]')
  I.fillField('.modal-dialog input[name="occurrences"]', '5')
  I.click('Apply', '.modal-footer')
  I.waitForDetached('.recurrence-view-dialog')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.seeNumberOfVisibleElements('.page.current .appointment', 5)

  // Edit second appointment of the series to make it an exception
  calendar.clickAppointment('Series', 2)
  I.waitForVisible('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForClickable('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit this appointment')
  I.waitForVisible(calendar.editWindow)
  I.waitForVisible('.io-ox-calendar-edit input[name="summary"]')
  I.fillField('Title', 'Exception')
  I.fillField('~Start time', '14:00 PM')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  // Edit the whole series and remove zoom conference
  calendar.clickAppointment('Series')
  I.waitForVisible('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.waitForClickable('.detail-popup button[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit series')
  I.waitForVisible(calendar.editWindow)
  I.waitForVisible('.io-ox-calendar-edit select[name="conference-type"]')
  I.selectOption('conference-type', 'None')
  I.waitForDetached('.conference-view.zoom')
  I.dontSee('Link:')
  I.dontSeeElement('.conference-view.zoom > .conference-logo')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.waitForDetached('.detail-popup .horizontal-action-buttons')
  I.waitForInvisible('Join Zoom meeting')
  I.click('.popup-close')

  // See if exception still has a zoom conference
  calendar.clickAppointment('Exception')
  I.waitForVisible('.detail-popup')
  I.waitForText('Join Zoom meeting', 5, '.detail-popup')
})
