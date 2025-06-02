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

Feature('Settings > Resources')

Before(async ({ users }) => {
  await Promise.all([users.create(), users.create(), users.create(), users.create()])
})
After(async ({ users }) => { await users.removeAll() })

Scenario('Check PIM detail popup with resources', async ({ I, calendar, users, autocomplete }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/core': { features: { managedResources: true, '.user': { managedResources: true } } } }),
    I.dontHaveGroup('some users'),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const group = await I.haveGroup({ name: 'some users', display_name: 'some users', members: [users[1].get('id'), users[2].get('id')] })

  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Phone: +1 (234) 567-890',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{
        entity: 0,
        group: true,
        privilege: 'ask_to_book'
      }, {
        entity: users[3].get('id'),
        group: false,
        privilege: 'delegate'
      }]
    }),
    I.haveResource({
      description: 'https://www.open-xchange.com/about-ox/events/',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{
        entity: 0,
        group: true,
        privilege: 'ask_to_book'
      }, {
        entity: group.id,
        group: true,
        privilege: 'delegate'
      }]
    })
  ])
  const time = calendar.getNextMonday()

  await I.haveAppointment({
    summary: 'Block meeting room',
    location: 'Testlocation',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    attendees: [{
      cuType: 'RESOURCE',
      entity: meetingRoomId
    }, {
      cuType: 'RESOURCE',
      entity: conferenceRoomId
    }]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  calendar.clickAppointment('Block meeting room')

  // detail popup: appointment
  I.waitForVisible('.detail-popup-appointment')
  I.waitForText('Conference room', 5, '.detail-popup-appointment')
  I.waitForText('Meeting room', 5, '.detail-popup-appointment')
  I.click('Conference room')

  // detail popup: conference room with clickable link in description
  I.waitForText('Conference room', 5, '.detail-popup-resource')
  I.waitForElement(locate({ css: 'a[href="https://www.open-xchange.com/about-ox/events/"]' }).as('a[href="https://www.open-xchange.com/about-ox/events/"]'))
  I.dontSee('Copy to description', '.detail-popup-resource')
  I.waitForText('Group: some users', 5, '.detail-popup-resource')
  I.click('Group: some users', '.detail-popup-resource')

  // detail popup: group and group users
  I.waitForText(users[1].get('display_name'), 5, '.detail-popup-group')
  I.click(users[1].get('display_name'), '.detail-popup-group')
  I.waitForText(users[1].get('email1'), 5, '.detail-popup-halo')
  I.pressKey('Escape')
  I.waitForDetached('.detail-popup-halo')
  I.waitForText(users[2].get('display_name'), 5, '.detail-popup-group')
  I.click(users[2].get('display_name'), '.detail-popup-group')
  I.waitForText(users[2].get('email1'), 5, '.detail-popup-halo')
  I.pressKey('Escape')
  I.waitForDetached('.detail-popup-halo')
  I.pressKey('Escape')
  I.waitForDetached('.detail-popup-group')

  // edit resource and check
  I.click('~Edit', '.detail-popup-resource')
  I.waitForText('Edit resource', 5)
  I.fillField('Name', 'Seminar room')
  I.waitForVisible('.add-members .tt-input')
  I.waitForEnabled('.add-members .tt-input')
  I.fillField('Add delegates', users[0].get('name'))
  autocomplete.select(users[0].get('name'), '*')
  I.waitForInvisible(autocomplete.suggestions)
  I.waitForElement('.delegate-wrapper')
  I.click('Save')
  I.waitForDetached('.recurrence-edit-dialog')

  I.waitForText('Seminar room', 5, '.detail-popup-appointment')

  I.waitForText('Seminar room', 5, '.detail-popup-resource')
  I.waitForText(users[0].get('name'), 5, '.detail-popup-resource')

  I.click('~Delete', '.detail-popup-resource')
  I.waitForText('Delete resource', 5, '.modal-dialog')
  I.see('"Seminar room"', '.modal-dialog')
  I.click('Delete resource', '.modal-dialog')
  I.waitForDetached('.modal-dialog')

  I.waitForInvisible('.detail-popup-resource')

  I.waitForInvisible('Seminar room')

  // edit appointment
  I.waitForElement('~Edit')
  I.click('~Edit')
  I.waitForVisible(calendar.editWindow)

  // detail popup: meeting room with clickable phone link and "copy" action
  I.waitForText('Meeting room', 5, calendar.editWindow)
  I.click('Meeting room', calendar.editWindow)
  I.waitForText('Meeting room', 5, '.detail-popup-resource')
  I.waitForElement(locate({ css: 'a[href="callto:+1234567890"]' }).withText('+1 (234) 567-890').as('a[href="callto:+1234567890"]'))
  I.waitForText('Copy to description', 5)
  I.click('Copy to description', '.detail-popup-resource')
  I.waitForText('Description has been copied')
  I.pressKey('Escape')
  I.waitForInvisible('.detail-popup-resource')

  I.seeInField('Description', 'Phone: +1 (234) 567-89')
  I.click('Save')
  I.waitForDetached(calendar.editWindow)
  I.waitForElement(locate({ css: 'a[href="callto:+1234567890"]' }).withText('+1 (234) 567-890').as('a[href="callto:+1234567890"]'))
})
