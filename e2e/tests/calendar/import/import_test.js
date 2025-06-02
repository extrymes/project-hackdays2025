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

Feature('Calendar > Import')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C104270] Import App Suite iCal basic and test import dialog', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/appsuite-783_basic_appointment.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple Single Appointment', 5, '.appointment-container .appointment.reserved .title')
  I.see('With Location')

  calendar.clickAppointment('Simple Single Appointment')

  I.waitForText('Simple Single Appointment', 5, '.detail-popup h1.subject')
  I.see('Thu, 12/1/2016', '.detail-popup')
  I.see('4:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('5:30\u202FPM', '.detail-popup')
  I.see('With Location', '.detail-popup')
  I.see('And Description', '.detail-popup')
  // close popup
  I.click('#io-ox-appcontrol')
  I.waitForDetached('.detail-popup')
})

Scenario('[C104270] Import App Suite iCal two appointments', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/appsuite-783_two_appointments.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  calendar.clickAppointment('Simple Single Appointment')
  I.waitForText('Simple Single Appointment', 5, '.detail-popup h1.subject')
  I.see('Thu, 12/1/2016', '.detail-popup')
  I.see('4:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('5:30\u202FPM', '.detail-popup')
  I.see('With Location', '.detail-popup')
  I.see('And Description', '.detail-popup')
  // close popup
  I.click('#io-ox-appcontrol')
  I.waitForDetached('.detail-popup')

  calendar.clickAppointment('All-day Appointment')
  I.waitForText('All-day Appointment', 5, '.detail-popup h1.subject')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104270] Import App Suite iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/appsuite-783_recurring_appointment.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring appointment', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 5)
  calendar.clickAppointment('Recurring appointment')
  I.waitForText('Recurring appointment', 5, '.detail-popup h1.subject')
  I.see('Sun, 11/27/2016', '.detail-popup')
  I.see('1:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('2:30\u202FPM', '.detail-popup')
  I.see('Every day. The series ends after 5 occurrences.', '.detail-popup')
})

Scenario('[C104279] Import Outlook iCal en simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlook_2013_en_simple.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Thu, 12/1/2016', '.detail-popup')
  I.see('11:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('12:30\u202FPM', '.detail-popup')
})

Scenario('[C104279] Import Outlook iCal en allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlook_2013_en_allday.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('All day', 5, '.fulltime-container .appointment.free .title')
  I.click('.fulltime-container .appointment.free')
  I.waitForText('All day', 5, '.detail-popup h1.subject')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104279] Import Outlook iCal en recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlook_2013_en_recurring.ics' })

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('10:00', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('10:30\u202FAM', '.detail-popup')
  I.see('Every day. The series ends after 5 occurrences.', '.detail-popup')
})

Scenario('[C104279] Import Outlook iCal en full', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlook_2013_en_full.ics' })

  I.waitForText('Busy', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 6)
  calendar.clickAppointment('Busy')
  I.waitForText('Busy', 5, '.detail-popup h1.subject')
})

Scenario('[C104295] Import Apple Calendar iCal simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/macos_1011_simple.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Fri, 12/2/2016', '.detail-popup')
  I.see('2:00', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('3:00\u202FPM', '.detail-popup')
})

Scenario('[C104295] Import Apple Calendar iCal allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/macos_1011_allday.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('All day!', 5, '.fulltime-container .appointment.free .title')
  I.click('.fulltime-container .appointment.free')
  I.waitForText('All day!', 5, '.detail-popup h1.subject')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104295] Import Apple Calendar iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/macos_1011_recurring.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('11:45', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('12:45\u202FPM', '.detail-popup')
  I.see('Every day. The series ends after 5 occurrences.', '.detail-popup')
})

Scenario('[C104295] Import Apple Calendar iCal full', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/macos_1011_full.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 6)
  I.seeNumberOfElements('.fulltime-container .appointment.free', 1)
})

Scenario('[C104301] Import Outlook.com iCal simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlookcom_2016_simple.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Thu, 12/1/2016', '.detail-popup')
  I.see('3:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('4:00\u202FPM', '.detail-popup')
  I.see('Some line\n\nbräiks') // cSpell:disable-line
})

Scenario('[C104301] Import Outlook.com iCal allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlookcom_2016_allday.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('All-day', 5, '.fulltime-container .appointment .title')
  I.click('.fulltime-container .appointment')
  I.waitForText('All-day', 5, '.detail-popup h1.subject')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('Somewhere', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104301] Import Outlook.com iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/outlookcom_2016_recurring.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 5)
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Mon, 11/28/2016', '.detail-popup')
  I.see('1:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('2:00\u202FPM', '.detail-popup')
  I.see('Every day. The series ends on 12/2/2016.', '.detail-popup')
})

Scenario('[C104299] Import Google iCal simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/google_2016_simple.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Fri, 12/2/2016', '.detail-popup')
  I.see('2:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('4:00\u202FPM', '.detail-popup')
})

Scenario('[C104299] Import Google iCal allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/google_2016_allday.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('All-day', 5, '.fulltime-container .appointment.free .title')
  I.click('.fulltime-container .appointment.free')
  I.waitForText('All-day', 5, '.detail-popup h1.subject')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104299] Import Google iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/google_2016_recurring.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 5)
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('12:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('1:30\u202FPM', '.detail-popup')
  I.see('Every day. The series ends after 5 occurrences.', '.detail-popup')
})

Scenario('[C104299] Import Google iCal full', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/google_2016_full.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 6)
  I.seeNumberOfElements('.fulltime-container .appointment.free', 1)
})

Scenario('[C104292] Import Thunderbird iCal simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  await I.importAppointment({ sourcePath: 'media/imports/calendar/thunderbird_45_simple.ics' })

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Fri, 12/2/2016', '.detail-popup')
  I.see('1:00', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('2:00\u202FPM', '.detail-popup')
})

Scenario('[C104292] Import Thunderbird iCal allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/thunderbird_45_allday.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('All-day', 5, '.fulltime-container .appointment.free .title')
  I.click('.fulltime-container .appointment.free')
  I.waitForText('All-day', 5, '.detail-popup h1.subject')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104292] Import Thunderbird iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/thunderbird_45_recurring.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 4)
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Some Description\n\nLala')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('10:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('11:30\u202FAM', '.detail-popup')
  I.see('Every day. The series ends on 12/2/2016.', '.detail-popup')
})

Scenario('[C104292] Import Thunderbird iCal full', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/thunderbird_45_full.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 5)
  I.seeNumberOfElements('.fulltime-container .appointment.free', 1)
})

Scenario('[C104276] Import emClient iCal, emclient', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/emclient_7.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  // don't use waitForText. Fails because of ellipsis
  I.waitForElement('.appointment-content[title="Simple appointment"]')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 6)
  I.seeNumberOfElements('.fulltime-container .appointment.reserved', 1)
  calendar.clickAppointment('Simple appointment')
  I.waitForText('Simple appointment', 5, '.detail-popup h1.subject')
  I.see('Thu, 12/1/2016', '.detail-popup')
  I.see('12:00', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('1:00\u202FPM', '.detail-popup')
})

Scenario('[C104276] Import emClient iCal simple', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/yahoo_2016_simple.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Simple', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Simple')
  I.waitForText('Simple', 5, '.detail-popup h1.subject')
  I.see('Fri, 12/2/2016', '.detail-popup')
  I.see('3:00', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('3:30\u202FPM', '.detail-popup')
})

Scenario('[C104276] Import emClient iCal allday', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  await I.importAppointment({ sourcePath: 'media/imports/calendar/yahoo_2016_allday.ics' })

  I.waitForText('All-day', 5, '.fulltime-container .appointment.reserved .title')
  I.click('.fulltime-container .appointment.reserved')
  I.waitForText('All-day', 5, '.detail-popup h1.subject')
  I.see('Somewhere', '.detail-popup')
  I.see('Wed, 11/30/2016', '.detail-popup')
  I.see('All day', '.detail-popup')
})

Scenario('[C104276] Import emClient iCal recurring', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/yahoo_2016_recurring.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  calendar.clickAppointment('Recurring')
  I.waitForText('Recurring', 5, '.detail-popup h1.subject')
  I.see('Tue, 11/29/2016', '.detail-popup')
  I.see('2:30', '.detail-popup')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see('3:00\u202FPM', '.detail-popup')
})

Scenario('[C104276] Import emClient iCal full', async ({ I, calendar, users, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:week')
  await I.importAppointment({ sourcePath: 'media/imports/calendar/yahoo_2016_full.ics' })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  // go to 2016-11-27
  I.executeScript(async function gotoDate (t) {
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(t)
  }, 1480201200000)

  I.waitForText('Recurring', 5, '.appointment-container .appointment.reserved .title')
  I.seeNumberOfElements('.appointment-container .appointment.reserved', 6)
  I.seeNumberOfElements('.fulltime-container .appointment.reserved', 1)
})
