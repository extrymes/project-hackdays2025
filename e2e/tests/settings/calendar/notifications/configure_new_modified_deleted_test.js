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

Feature('Settings > Calendar')

Before(async ({ users }) => {
  await Promise.all([users.create(), users.create()])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7870] Configure notifications for new/modified/deleted', async ({ I, users, calendar, mail, settings }) => {
  const [userA, userB] = users
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userA }),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userB })
  ])

  async function createModifyDeleteAppointment () {
    I.waitForApp()
    calendar.newAppointment()
    const startString = await calendar.getDate('startDate')
    const setDate = moment(moment(String(startString), 'M/D/YYYY')).unix()
    const currentDate = moment().unix()
    I.fillField('Title', 'C7870')
    await calendar.addParticipant(userA.get('primaryEmail'), false)
    I.click('Create', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)

    // check if late appointment was created
    if (setDate > currentDate) {
      I.wait(0.2)
      I.click(locate('~Today').inside('.date-picker'))
      I.wait(0.2)
      I.pressKey('ArrowRight')
      I.wait(0.2)
      I.pressKey('Enter')
    }
    I.seeElement('.page.current .appointment')

    // Modify appointment
    I.doubleClick('.page.current .appointment')
    I.waitForVisible(calendar.editWindow)
    I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
    I.fillField('Title', 'Modified Subject C7870')
    I.click('Save', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)

    // Delete appointment
    I.click('.page.current .appointment')
    I.waitForVisible('.detail-popup .calendar-detail')
    calendar.deleteAppointment()
    I.wait(1)
  }

  // Login userA and verify notifyNewModifiedDeleted is set
  await session('userA', () => {
    I.login('section=io.ox/settings/notifications/calendar&settings=virtual/settings/notifications', { user: userA })
    I.waitForText('Receive notifications when an appointment')
    I.checkOption('.calendar-email-notifications [name="notifyNewModifiedDeleted"]')
    I.seeCheckboxIsChecked('.calendar-email-notifications [name="notifyNewModifiedDeleted"]')
    settings.close()
  })

  // Login userB, create appointment and invite userA
  await session('userB', async () => {
    I.login('app=io.ox/calendar', { user: userB })
    await createModifyDeleteAppointment()
  })

  // Verify notifications emails with userA with notifyNewModifiedDeleted set
  await session('userA', () => {
    I.openApp('Mail')
    I.refreshPage()
    I.waitForApp()
    I.waitForVisible('.folder.standard-folders [aria-label^="Inbox, 3 unread"]', 10)
    I.waitForText('New appointment')
    I.waitForText('Appointment changed:')
    I.waitForText('Appointment canceled:')
    I.openFolderMenu('Inbox')
    I.clickDropdown('Mark all messages as read')

    // Unset notifyNewModifiedDeleted
    settings.open('Notifications', 'Calendar')
    I.waitForText('Receive notifications when an appointment')
    I.uncheckOption('.calendar-email-notifications [name="notifyNewModifiedDeleted"]')
    I.waitForNetworkTraffic()
    I.dontSeeCheckboxIsChecked('.calendar-email-notifications [name="notifyNewModifiedDeleted"]')
    settings.close()
  })

  // UserB creates appointment again
  await session('userB', async () => {
    await createModifyDeleteAppointment()
  })

  // Verify that only the deleted notification email was send to userA
  await session('userA', () => {
    I.openApp('Mail')
    I.waitForApp()
    I.dontSeeElement('.list-view-control .seen-unseen-indicator')
  })
})
