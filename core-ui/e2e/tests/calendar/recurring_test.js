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
const assert = require('assert')
const { util } = require('@open-xchange/codecept-helper')

Feature('Calendar > Create')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

async function updateAppointment (appointment, changes, options) {
  const { httpClient, session } = await util.getSessionForUser(options)
  const params = {
    action: 'update',
    session,
    folder: appointment.folder,
    id: appointment.id,
    timestamp: appointment.timestamp
  }
  if (appointment.recurrenceId) params.recurrenceId = appointment.recurrenceId
  const response = await httpClient.put('/api/chronos', { event: changes }, { params })
  assert.strictEqual(response.data.error, undefined, JSON.stringify(response.data))
  return response
}

Scenario('Create recurring appointments with one participant', async ({ I, users, calendar, dialogs }) => {
  const listViewLocator = locate('.calendar-list-view').as('List View')
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
  })
  const startDate = moment().add(1, 'months').startOf('week').add(1, 'days')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'test recurring')
  I.fillField('Location', 'invite location')
  calendar.setDate('startDate', startDate)
  I.click('~Start time')
  I.click('4:00 PM')

  I.checkOption('Repeat')
  I.click('Every Monday.')

  dialogs.waitForVisible()
  I.waitForText('Edit recurrence', 5, dialogs.header)

  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily')
  I.selectOption('.modal-dialog [name="until"]', 'After a number of occurrences')
  I.waitForElement('.modal-dialog [name="occurrences"]')
  I.fillField('.modal-dialog [name="occurrences"]', '5')

  I.pressKey('Enter')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  // add user 1
  await calendar.addParticipant(users[1].get('primaryEmail'), true)
  // save
  I.click('Create', calendar.editWindow)

  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  I.waitForText('Load appointments until', 5, listViewLocator)
  I.click('Load appointments until')
  I.waitForVisible(locate('.appointment').withText('test recurring').inside('.list-view').at(5).as('Appointment 5'))
  I.seeNumberOfElements('.list-view .appointment .title', 5)

  I.logout()

  // user 1
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
  }, { user: users[1] })

  // login new user1 for accept
  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  I.waitForNetworkTraffic()

  I.waitForText('Load appointments until', 10, listViewLocator)
  I.click('Load appointments until')
  I.waitForVisible(locate('.appointment').withText('test recurring').inside('.list-view').at(5).as('Appointment 5'))
  I.seeNumberOfElements('.list-view .appointment .title', 5)
  I.waitForElement(locate('.appointment').withText('test recurring').inside('.list-view').at(1))
  I.click(locate('.appointment').withText('test recurring').inside('.list-view').at(1))

  I.waitForDetached('.rightside .multi-selection-message')
  I.waitForText('test recurring', 5, '.rightside')
  I.waitForText('invite location', 5, '.rightside')

  I.waitForElement('.rightside [data-action="changestatus"]')
  I.click('.rightside [data-action="changestatus"]')

  dialogs.waitForVisible()
  dialogs.clickButton('Change series')
  I.waitForText('Change confirmation', 5, dialogs.header)
  I.click('Accept', '.modal')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForElement(`.rightside .participant.accepted a[title="${users[1].get('primaryEmail')}"]`)

  I.logout()

  // login owner
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForText('Load appointments until', 5, listViewLocator)
  I.click('Load appointments until')
  I.waitForText('test recurring', 5, locate('.appointment').inside('.list-view').at(2).as('Appointment 3'))
  I.retry(5).click(locate('.appointment').withText('test recurring').inside('.list-view').at(2).as('Appointment 3'))

  // owner
  I.waitForElement(`.rightside .participant.accepted a[title="${users[0].get('primaryEmail')}"]`)
  // accepted
  I.waitForElement(`.rightside .participant.accepted a[title="${users[1].get('primaryEmail')}"]`)

  // edit
  I.waitForVisible('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')

  dialogs.waitForVisible()
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  // TODO: Needs a fix. "All future appointments" is wrong since appointment has flag "first_occurrence"
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit all future appointments')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'test recurring edit')
  I.fillField('Location', 'invite location edit')
  I.click('Save', calendar.editWindow)

  I.waitForText('test recurring edit', 5, listViewLocator)
  I.seeNumberOfElements('.list-view .appointment .title', 5)

  // edit
  I.waitForText('test recurring edit', 5, listViewLocator)

  I.click({ xpath: '//div[text()="test recurring edit"]' })

  I.waitForVisible('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')

  dialogs.waitForVisible()
  dialogs.clickButton('Edit this appointment')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'test recurring edit new')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitForVisible(locate('.title').withText('test recurring edit new').inside('.list-view-control'))
  I.seeNumberOfElements(locate('.title').withText('test recurring edit new').inside('.list-view-control'), 1)

  I.click(locate('.title').withText('test recurring edit new').inside('.list-view-control'))

  // edit exception
  I.waitForVisible('[data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('[data-action="io.ox/calendar/detail/actions/edit"]')

  dialogs.waitForVisible()
  dialogs.clickButton('Edit this appointment')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'test recurring edit new edit')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.seeNumberOfElements(locate('.title').withText('test recurring edit new edit').inside('.list-view-control'), 1)
  I.click(locate('.title').withText('test recurring edit new edit').inside('.list-view-control'))

  I.waitForVisible('[data-action="io.ox/calendar/detail/actions/delete"]')
  I.click('[data-action="io.ox/calendar/detail/actions/delete"]')

  dialogs.waitForVisible()
  dialogs.clickButton('Delete this appointment')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible(locate('.title').withText('test recurring edit').inside('.list-view-control'))
  I.waitNumberOfVisibleElements(locate('.title').withText('test recurring edit').inside('.list-view-control'), 3)

  // check in Month view
  I.click(locate('.btn-next').inside('.date-picker'))
  I.click(`.date-picker td[aria-label*="${startDate.format('M/D/YYYY')}"]`)

  calendar.switchView('Month')
  I.waitForVisible(locate('.appointment .title').inside('.month').withText('test recurring edit'))
  I.seeNumberOfElements(locate('.appointment').inside('.month').withText('test recurring edit'), 3)

  calendar.switchView('Week')
  I.waitForVisible(locate('.appointment .title').inside('.weekview-container.week').withText('test recurring edit'))
  I.seeNumberOfElements(locate('.appointment').inside('.weekview-container.week').withText('test recurring edit'), 3)

  calendar.switchView('Workweek')
  I.waitForVisible(locate('.appointment .title').inside('.weekview-container.workweek').withText('test recurring edit'))
  I.seeNumberOfElements(locate('.appointment').inside('.weekview-container.workweek').withText('test recurring edit'), 3)

  I.logout()

  // login new user1 for decline
  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  I.waitForText('Load appointments until', 5, listViewLocator)
  I.click('Load appointments until')
  I.waitForText('test recurring edit', 5, listViewLocator)
  I.waitNumberOfVisibleElements('.list-view .appointment .title', 4)

  I.click(locate('.list-item.appointment').withText('test recurring edit'))

  I.waitForDetached('.rightside .multi-selection-message')
  I.see('test recurring edit', '.rightside')
  I.see('invite location', '.rightside')

  I.waitForVisible('.rightside [data-action="changestatus"]')
  I.click('~Add comment', '.rightside')

  dialogs.waitForVisible()
  dialogs.clickButton('Change series')
  I.waitForText('Change confirmation', 5, dialogs.header)
  I.click('Decline', '.modal')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog', 5)

  I.waitForElement('.rightside .participant.declined a[title="' + users[1].get('primaryEmail') + '"]')
  I.seeNumberOfElements('.list-view .appointment .declined', 3)

  I.click(locate('.list-item.appointment').withText('test recurring edit'))
  I.waitForVisible('.rightside [data-action="changestatus"]')
  I.click('~Add comment', '.rightside')

  dialogs.waitForVisible()
  dialogs.clickButton('Change appointment')
  I.waitForText('Change confirmation', 5, dialogs.header)
  I.click('Maybe', '.modal')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog', 5)
  I.waitForVisible('.list-view .appointment')
  I.waitNumberOfVisibleElements('.list-view .appointment .tentative', 1)
  I.waitNumberOfVisibleElements('.list-view .appointment .declined', 2)
})

Scenario('[Bug 63392][OXUIB-212] Recurring appointment can\'t changed to "Never ends"', async ({ I, calendar, dialogs }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
  })

  // Create Appointment
  // start tomorrow
  const startDate = moment().startOf('day').add(1, 'day')

  const appointment = await I.haveAppointment({
    summary: 'Install more rgb to improve fps',
    attendeePrivileges: 'DEFAULT',
    rrule: 'FREQ=DAILY;COUNT=3',
    startDate: { value: startDate.format('YYYYMMDD') },
    endDate: { value: startDate.add(1, 'day').format('YYYYMMDD') }
  })

  // startDate of root is recurrenceId for the first occurrence
  const cid = `${appointment.folder}.${appointment.id}.${appointment.startDate.value}`

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible(`li.list-item.selectable.appointment[data-cid="${cid}"]`)
  I.click(`li.list-item.selectable.appointment[data-cid="${cid}"]`)
  I.click('~Edit')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit series')
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

  // change recurrence to never ending
  I.click('Every day. The series ends after 3 occurrences.')
  dialogs.waitForVisible()
  I.selectOption('Ends', 'Never')
  dialogs.clickButton('Apply')

  I.waitForInvisible('.modal-dialog')
  I.click('Save')
  // no backend error should happen here
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForDetached(locate('.calendar-detail .recurrence').withText('Every day. The series ends after 3 occurrences.'))
  I.waitForText('Every day.')
})

Scenario('[Bug 62034] Appointment series ends one day to early', async ({ I, calendar, dialogs }) => {
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
  })

  const startDate = moment().startOf('day').add(1, 'day')

  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Until test')
  calendar.setDate('startDate', startDate)
  I.click('~Start time')
  I.click('4:00 PM')
  I.checkOption('Repeat')
  I.click('.recurrence-view .btn.btn-link.summary')
  dialogs.waitForVisible()
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily')
  I.selectOption('Ends', 'On specific date')
  I.fillField('.recurrence-view-dialog .datepicker-day-field', startDate.add(3, 'days').format('l'))
  dialogs.clickButton('Apply')
  I.waitForInvisible('.modal-dialog')
  I.click('Create')

  I.waitNumberOfVisibleElements('.list-item.selectable.appointment', 4)
})

Scenario('Confirm series should only appear for eligible exceptions', async ({ I, calendar, users, dialogs }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { autoOpenNotification: false, showDesktopNotifications: false },
      'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
    }),
    I.haveSetting({
      'io.ox/core': { autoOpenNotification: false, showDesktopNotifications: false },
      'io.ox/calendar': { showCheckboxes: true, layout: 'list' }
    }, { user: users[1] })
  ])

  const time = moment().startOf('day').add(16, 'hours')
  const format = 'YYYYMMDD[T]HHmmss'
  const appointment = await I.haveAppointment({
    summary: 'test appointment',
    startDate: { tzid: 'Europe/Berlin', value: time.format(format) },
    endDate: { tzid: 'Europe/Berlin', value: moment(time).add(1, 'hour').format(format) },
    rrule: 'FREQ=DAILY;COUNT=5',
    attendees: [
      { partStat: 'NEEDS-ACTION', entity: users[0].userdata.id, uri: `mailto:${users[0].userdata.primaryEmail}` },
      { partStat: 'NEEDS-ACTION', entity: users[1].userdata.id, uri: `mailto:${users[1].userdata.primaryEmail}` }
    ]
  })

  // no promise all, causes concurrent modification issues
  await updateAppointment({
    id: appointment.id,
    folder: appointment.folder,
    recurrenceId: `Europe/Berlin:${moment(time).add(2, 'days').format(format)}`,
    timestamp: appointment.lastModified
  },
  {
    startDate: { tzid: 'Europe/Berlin', value: moment(time).add(2, 'days').add(1, 'hour').format(format) },
    endDate: { tzid: 'Europe/Berlin', value: moment(time).add(2, 'days').add(2, 'hour').format(format) }
  })
  await updateAppointment({
    id: appointment.id,
    folder: appointment.folder,
    recurrenceId: `Europe/Berlin:${moment(time).add(3, 'days').format(format)}`,
    timestamp: appointment.lastModified + 100
  },
  {
    summary: 'edited test appointment'
  })

  // prepare exception
  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()
  I.waitNumberOfVisibleElements('.list-item.selectable.appointment', 5)
  I.click(locate('.appointment').withText('test appointment').inside('.list-view').at(5).as('5th occurrence of test appointment'))
  I.waitForText('Decline', 5, '.rightside .calendar-detail-pane')
  I.click('Decline', '.rightside .calendar-detail-pane')

  dialogs.waitForVisible()
  dialogs.clickButton('Change appointment')
  I.waitForDetached('.modal-dialog')

  I.waitForElement(`.rightside .participant.declined a[title="${users[1].userdata.primaryEmail}"]`)
  I.logout()

  // check all appointments
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitNumberOfVisibleElements('.list-item.selectable.appointment', 5)

  I.click(locate('.appointment').withText('test appointment').inside('.list-view').at(1).as('1st occurrence of test appointment'))
  I.waitForText('Accept', 5, '.rightside .calendar-detail-pane')
  I.click('Accept', '.rightside .calendar-detail-pane')

  dialogs.waitForVisible()
  I.waitForText('Change appointment')
  I.waitForText('Change series')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.click(locate('.appointment').withText('test appointment').inside('.list-view').at(2).as('2nd occurrence of test appointment'))
  I.waitForText('Accept', 5, '.rightside .calendar-detail-pane')
  I.click('Accept', '.rightside .calendar-detail-pane')

  dialogs.waitForVisible()
  I.waitForText('Change appointment')
  I.waitForText('Change series')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.click(locate('.appointment').withText('test appointment').inside('.list-view').at(3).as('3rd occurrence of test appointment'))
  I.waitForText('Accept', 5, '.rightside .calendar-detail-pane')
  I.click('Accept', '.rightside .calendar-detail-pane')

  I.waitForElement(`.rightside .participant.accepted a[title="${users[0].userdata.primaryEmail}"]`)

  I.click(locate('.appointment').withText('edited test appointment').inside('.list-view').as('edited test appointment (formerly 4th occurrence of test appointment)'))
  I.waitForElement('.rightside [data-action="participate/yes"]')
  I.click('.rightside [data-action="participate/yes"]')

  I.waitForElement(`.rightside .participant.accepted a[title="${users[0].userdata.primaryEmail}"]`)

  I.click(locate('.appointment').withText('test appointment').inside('.list-view').at(5).as('5th occurrence of test appointment'))
  I.waitForText('Accept', 5, '.rightside .calendar-detail-pane')
  I.click('Accept', '.rightside .calendar-detail-pane')

  dialogs.waitForVisible()
  I.waitForText('Change appointment')
  I.waitForText('Change series')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
})
