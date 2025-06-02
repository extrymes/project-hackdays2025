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
  await Promise.all([users.create(), users.create(), users.create()])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7871] Configure accept/decline notification for creator', async ({ I, users, settings, calendar, mail, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: users[1] })
  ])

  // Login userA and check, if setting notifyAcceptedDeclinedAsCreator is set
  await session('userA', async () => {
    I.login('section=io.ox/settings/notifications/calendar&settings=virtual/settings/notifications')
    I.waitForApp()
    I.waitForText('Receive notification as appointment creator')
    I.checkOption('.calendar-email-notifications [name="notifyAcceptedDeclinedAsCreator"]')
    I.seeCheckboxIsChecked('.calendar-email-notifications [name="notifyAcceptedDeclinedAsCreator"]')
    settings.close()
    I.openApp('Calendar')

    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', 'C7871')
    I.fillField('Starts on', moment().startOf('week').add(8, 'day').format('l'))
    await calendar.addParticipant(users[1].get('primaryEmail'))
    I.click('Create', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
  })

  await session('userB', async () => {
    I.login('app=io.ox/calendar', { user: users[1] })
    I.waitForApp()
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForNetworkTraffic()
    I.waitForText('C7871', 5, '.page.current .appointment')
    I.click('C7871', locate('.appointment').withText('C7871'))
    I.waitForVisible('.detail-popup .btn-group')
    I.click('Accept')
    I.waitForNetworkTraffic()
    I.click('Decline')
    I.waitForNetworkTraffic()
    I.click('~Add comment')
    dialogs.waitForVisible()
    I.click('Maybe', '.modal')
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
    I.retry(5).click('~Close', '.detail-popup')
  })

  // Verify that all 3 notification emails were received as userA
  await session('userA', async () => {
    I.refreshPage()
    I.waitForApp()

    I.openApp('Mail')
    I.waitForApp()
    I.waitForVisible('~Inbox, 3 unread')
    I.waitForText('accepted the invitation')
    I.waitForText('declined the invitation')
    I.waitForText('tentatively accepted')

    I.openFolderMenu('Inbox')
    I.clickDropdown('Delete all messages')
    dialogs.waitForVisible()
    dialogs.clickButton('Empty folder')
    I.waitForDetached('.modal-dialog')

    // Unset notifyAcceptedDeclinedAsCreator
    settings.open('Notifications', 'Calendar')
    I.waitForText('Receive notification as appointment creator')
    I.uncheckOption('.calendar-email-notifications [name="notifyAcceptedDeclinedAsCreator"]')
    I.waitForNetworkTraffic()
    I.dontSeeCheckboxIsChecked('.calendar-email-notifications [name="notifyAcceptedDeclinedAsCreator"]')
    settings.close()
    // Delete old appointment to get a clean slate
    I.openApp('Calendar', { perspective: 'week:week' })
    I.waitForApp()
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
    I.waitForText('C7871')
    I.click(locate('.appointment').withText('C7871'))
    I.waitForVisible('.detail-popup')
    calendar.deleteAppointment()
    I.waitForDetached('.detail-popup')
    I.waitForDetached('.page.current .appointment')

    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', 'C7871')
    I.fillField('Starts on', moment().startOf('week').add(8, 'day').format('l'))
    await calendar.addParticipant(users[1].get('primaryEmail'))
    I.click('Create', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
  })

  await session('userB', async () => {
    I.refreshPage()
    I.waitForApp()
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForNetworkTraffic()
    I.waitForText('C7871', 5, '.page.current .appointment')
    I.click(locate('.appointment').withText('C7871'))
    I.waitForVisible('.detail-popup .btn-group')
    I.click('Accept')
    I.waitForNetworkTraffic()
    I.click('Decline')
    I.waitForNetworkTraffic()
    I.click('~Add comment')
    dialogs.waitForVisible()
    I.click('Maybe', '.modal')
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
    I.retry(5).click('~Close', '.detail-popup')
  })

  // Verify that no notification email was sent
  await session('userA', async () => {
    I.refreshPage()
    I.waitForApp()
    I.openApp('Mail')
    I.waitForApp()
    I.dontSee('accepted the invitation')
    I.dontSee('declined the invitation')
    I.dontSee('tentatively accepted')
  })
})

Scenario('[C7872] Configure accept/decline for participant', async ({ I, mail, calendar, users, dialogs, settings }) => {
  const [userA, userB, userC] = users
  const subject = '[C7872]'

  async function verifyParticipants (subject, participants) {
    I.refreshPage()
    I.waitForApp()
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    calendar.clickAppointment(subject)

    I.waitForVisible('.detail-popup', 15)
    I.waitForVisible('.detail-popup .participant-list')
    participants.forEach(part => I.waitForText(`${part.get('sur_name')}, User`))
  }

  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userA }),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userB }),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: userC })
  ])

  // Login userC and set notifyAcceptedDeclinedAsParticipant
  await session('userC', () => {
    I.login('section=io.ox/settings/notifications/calendar&settings=virtual/settings/notifications', { user: userC })
    I.waitForApp()
    I.waitForText('Receive notification as appointment participant')
    I.checkOption('.calendar-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]')
    I.seeCheckboxIsChecked('.calendar-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]')
    settings.close()
  })

  // Login userA and create appointment with all participants
  await session('userA', async () => {
    I.login('app=io.ox/calendar', { user: userA })
    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', subject)
    I.fillField('Starts on', moment().startOf('week').add(8, 'day').format('l'))
    await calendar.addParticipant(userB.get('primaryEmail'))
    await calendar.addParticipant(userC.get('primaryEmail'))
    I.click('Create', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
  })

  // Login userB, verify all participants and change status
  await session('userB', async () => {
    I.login('app=io.ox/calendar', { user: userB })
    await verifyParticipants(subject, [userA, userB, userC])
    I.waitForVisible('.detail-popup .btn-group')
    I.click('Accept')
    // if we don't wait we eventually won't have 4 notifications emails in the inbox
    I.wait(2)
    I.click('Decline')
    I.waitForNetworkTraffic()
    I.wait(2)
    I.click('~Add comment')
    dialogs.waitForVisible()
    I.click('Maybe', '.modal')
    dialogs.clickButton('Save')
    I.waitForNetworkTraffic()
    I.waitForDetached('.modal-dialog')
    I.retry(5).click('~Close', '.detail-popup')
  })

  // As userC verify that all notification mails were received
  await session('userC', async () => {
    // there are 4 mails, as the invitation mail is also sent
    I.waitForVisible('#io-ox-appcontrol', 10)
    I.openApp('Mail')
    I.waitForApp()
    I.refreshPage()
    I.waitForElement('~Inbox, 4 unread', 30)
    I.waitForText('accepted the invitation')
    I.waitForText('declined the invitation')
    I.waitForText('tentatively accepted')

    I.openFolderMenu('Inbox')
    I.clickDropdown('Delete all messages')
    dialogs.waitForVisible()
    dialogs.clickButton('Empty folder')
    I.waitForDetached('.modal-dialog')

    // As userC unset notifyAcceptedDeclinedAsParticipant
    settings.open('Notifications', 'Calendar')
    I.waitForText('Receive notification as appointment participant')
    I.uncheckOption('.calendar-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]')
    I.dontSeeCheckboxIsChecked('.calendar-email-notifications [name="notifyAcceptedDeclinedAsParticipant"]')
    I.waitForNetworkTraffic()
    settings.close()
  })

  await session('userA', async () => {
    I.waitForText(subject)
    // Delete old appointment to get a clean slate
    I.openApp('Calendar', { perspective: 'week:week' })
    I.waitForApp()
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
    I.waitForText(subject)
    I.click(locate('.appointment').withText(subject))
    I.waitForVisible('.detail-popup')
    calendar.deleteAppointment()
    I.waitForDetached('.detail-popup')
    I.waitForDetached('.page.current .appointment')

    // As userA create appointment again with all participants
    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', subject)
    I.fillField('Starts on', moment().startOf('week').add(8, 'day').format('l'))
    await calendar.addParticipant(userB.get('primaryEmail'))
    await calendar.addParticipant(userC.get('primaryEmail'))
    I.click('Create', calendar.editWindow)
    I.waitForDetached(calendar.editWindow)
    I.waitForText('Today')
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    I.waitForElement('.page.current .appointment .title')
  })

  // As userB, verify all participants and change status again
  await session('userB', async () => {
    I.refreshPage()
    await verifyParticipants(subject, [userA, userB, userC])
    I.waitForVisible('.detail-popup .btn-group')
    I.click('Accept')
    // if we don't wait we eventually won't have 4 notifications emails in the inbox
    I.wait(2)
    I.click('Decline')
    I.wait(2)
    I.click('~Add comment')
    dialogs.waitForVisible()
    I.click('Maybe', '.modal')
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
    I.retry(5).click('~Close', '.detail-popup')
  })

  // As userC, verify that no notification mails were received
  await session('userC', async () => {
    I.refreshPage()
    I.waitForVisible('#io-ox-appcontrol', 10)
    I.openApp('Mail')
    I.waitForApp()
    I.dontSee('accepted the invitation')
    I.dontSee('declined the invitation')
    I.dontSee('tentatively accepted')
  })
})
