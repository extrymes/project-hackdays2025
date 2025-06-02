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

Feature('Calendar > Resource calendars')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Add and remove calendars from resource groups', async ({ I, calendar, dialogs, contactpicker }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/resourceCalendars', true),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' }),
    I.haveResource({ description: 'Conference room', display_name: 'Conference room', name: 'Conference room', mailaddress: 'room@conference.io' })
  ])

  await Promise.all([
    I.haveAppointment({
      summary: 'Block meeting room',
      location: 'Testlocation',
      startDate: { value: moment().startOf('isoWeek').add(10, 'hours') },
      endDate: { value: moment().startOf('isoWeek').add(10, 'hours').add(1, 'hour') },
      attendees: [{
        cuType: 'RESOURCE',
        entity: meetingRoomId
      }]
    }),
    I.haveAppointment({
      summary: 'Block conference room',
      location: 'Testlocation',
      startDate: { value: moment().startOf('isoWeek').add(10, 'hours') },
      endDate: { value: moment().startOf('isoWeek').add(10, 'hours').add(4, 'hour') },
      attendees: [{
        cuType: 'RESOURCE',
        entity: conferenceRoomId
      }]
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForText('My calendars')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar')

  dialogs.waitForVisible()
  I.waitForText('Meeting room')
  contactpicker.add('Meeting room')
  contactpicker.close()
  I.waitForDetached('.addressbook-popup')

  I.waitForText('Resources', 5, '.folder-tree')
  I.click('.folder-arrow', '~Resources')
  I.waitForText('Meeting room')
  I.seeElement('.folder[aria-label*="Meeting room"] .color-label.selected')

  I.waitForElement(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.waitForVisible('~Appointment has resources')

  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar group')

  dialogs.waitForVisible()
  I.waitForText('Add new resource calendar group')
  I.fillField('Resource calendar group name', 'testgroup')
  dialogs.clickButton('Add')

  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('testgroup', 5, '.folder-tree')
  I.click('.folder-arrow', '~testgroup')
  I.waitForText('Conference room')
  I.seeElement('.folder[aria-label*="Conference room"] .color-label.selected')

  I.waitForElement(`.appointment[data-folder="cal://0/resource${conferenceRoomId}"]`)
  I.seeNumberOfElements('~Appointment has resources', 2)

  I.click('Meeting room')
  I.waitForVisible('~Actions for Meeting room')
  I.click('~Actions for Meeting room')
  I.clickDropdown('Remove resource calendar')

  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.dontSee('Resources', '.folder-tree')

  I.click('.folder-node', '~testgroup')
  I.openFolderMenu('Actions for testgroup')
  I.clickDropdown('Delete resource group')

  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached(`.appointment[data-folder="cal://0/resource${conferenceRoomId}"]`)
  I.dontSee('testgroup', '.folder-tree')
})

Scenario('Create/Update/Delete appointments that are duplicated in resource calendars', async ({ I, calendar, dialogs, contactpicker }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/resourceCalendars', true),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const [defaultFolder, meetingRoomId, conferenceRoomId] = await Promise.all([
    `cal://0/${await I.grabDefaultFolder('calendar')}`,
    I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' }),
    I.haveResource({ description: 'Conference room', display_name: 'Conference room', name: 'Conference room', mailaddress: 'room@conference.io' })
  ])

  const resourceSettings = {
    enabled: true,
    groups: {
      general: {
        folderId: 'flat/event/resources.general',
        folders: [meetingRoomId, conferenceRoomId]
      },
      testgroup: {
        folderId: 'flat/event/resources.testgroup',
        title: 'testgroup',
        folders: [meetingRoomId, conferenceRoomId]
      }
    },
    folders: {
      [meetingRoomId]: {
        folderId: `cal://0/resource${meetingRoomId}`,
        'com.openexchange.calendar.extendedProperties': { color: { value: '#16adf8' } }
      },
      [conferenceRoomId]: {
        folderId: `cal://0/resource${conferenceRoomId}`,
        'com.openexchange.calendar.extendedProperties': { color: { value: '#16adf8' } }
      }
    }
  }

  await Promise.all([
    I.haveSetting('io.ox/calendar//resources', resourceSettings),
    I.haveSetting('io.ox/calendar//folderview', {
      open: {
        large: [
          'virtual/flat/event/private',
          'virtual/flat/event/resources.general',
          'virtual/flat/event/resources.testgroup'
        ]
      }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()

  I.waitForText('Meeting room')
  I.click('.folder[aria-label*="Meeting room"] .color-label')
  I.click('.folder[aria-label*="Meeting room"] .folder-node')
  I.waitForElement('.folder[aria-label*="Meeting room"].selected')

  // Create appointment with resource calendar selected and focussed
  calendar.newAppointment()
  I.waitForText('Selected resources were automatically added to this appointment')
  I.waitForText('Meeting room', 5, '.attendee-container')
  calendar.startNextMonday()
  I.checkOption('Repeat')
  calendar.recurAppointment()
  I.waitForText('Edit recurrence')
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily on workdays')
  I.waitForText('On workdays')
  dialogs.clickButton('Apply')
  I.waitForDetached('.recurrence-view-dialog')
  I.fillField('Title', 'Block meeting room')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitNumberOfVisibleElements(locate('.appointment').withText('Block meeting room'), 10)
  I.seeNumberOfVisibleElements('.appointment .resource-flag', 5)

  I.scrollTo('.appointment')

  // Select conf room and deselect meeting room
  I.click('.folder[aria-label*="Conference room"] .color-label', '~Resources')
  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForDetached('.appointment .resource-flag')
  I.click('.folder-node', '~Resources')
  // Create appointment with resources in group, that are selected
  calendar.newAppointment()
  I.waitForText('Selected resources were automatically added to this appointment')
  I.waitForText('Conference room', 5, '.attendee-container')
  I.dontSee('Meeting Room', '.attendee-container')
  I.fillField('~Start time', '10:00 AM')
  I.fillField('Title', 'Block conference room')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitNumberOfVisibleElements(locate('.appointment').withText('Block conference room'), 2)

  I.openFolderMenu('Actions for Resources')
  I.clickDropdown('Show this group only')

  I.dontSeeElement(`.appointment[data-folder="${defaultFolder}"]`)

  // Create appointment with all resources in group
  calendar.newAppointment()
  I.waitForText('Selected resources were automatically added to this appointment')
  I.waitForText('Conference room', 5, '.attendee-container')
  I.waitForText('Meeting room', 5, '.attendee-container')
  I.fillField('~Start time', '12:00 PM')
  I.fillField('Title', 'Block all')
  I.click('Create', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitNumberOfVisibleElements(locate('.appointment').withText('Block all'), 2)

  I.openFolderMenu('Actions for Resources')
  I.clickDropdown('Show all calendars')

  I.click(locate(`.appointment[data-folder="${defaultFolder}"]`).withText('Block all'))
  I.waitForVisible('.detail-popup')
  calendar.deleteAppointment()
  I.waitForDetached(locate(`.appointment[data-folder="${defaultFolder}"]`).withText('Block all'))
  // Make sure appointments from resource calendars are gone as well
  I.dontSee('Block all')

  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForVisible(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.click(locate(`.appointment[data-folder="${defaultFolder}"]`).withText('Block meeting room'))
  I.waitForVisible('.detail-popup')
  I.waitForVisible('~Edit appointment')
  I.click('~Edit appointment')
  dialogs.waitForVisible()
  dialogs.clickButton('Edit series')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Changed Title')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.waitForVisible('.detail-popup')
  I.waitForElement('~Close')
  I.click('~Close', '.detail-popup')

  // Make sure all appointment summaries are updated accordingly
  I.waitNumberOfVisibleElements(locate('.appointment').withText('Changed Title'), 10)
  I.dontSee('Block meeting room')
})

Scenario('Check appointments in resource calendars without viewing rights', async ({ I, calendar, dialogs, contactpicker, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/resourceCalendars', true),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const [meetingRoomId, conferenceRoomId, user2] = await Promise.all([
    I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' }),
    I.haveResource({ description: 'Conference room', display_name: 'Conference room', name: 'Conference room', mailaddress: 'room@conference.io' }),
    users.create()
  ])
  const time = calendar.getNextMonday()

  await I.haveAppointment({
    summary: 'Block meeting room',
    location: 'Testlocation',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    attendees: [
      { cuType: 'RESOURCE', entity: meetingRoomId },
      { cuType: 'RESOURCE', entity: conferenceRoomId },
      { entity: user2.get('id') }]
  }, { user: user2 })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar')

  dialogs.waitForVisible()
  I.waitForText('Meeting room')
  contactpicker.add('Meeting room')
  I.fillField('.addressbook-popup .search-field', 'Conference room')
  I.waitForText('Conference room', 5, contactpicker.results)
  contactpicker.selectFirst()
  contactpicker.close()
  I.waitForDetached('.addressbook-popup')

  I.waitForText('Resources', 5, '.folder-tree')
  I.click('.folder-arrow', '~Resources')
  I.waitForText('Meeting room')
  I.seeElement('.folder[aria-label*="Meeting room"] .color-label.selected')
  I.waitForText('Conference room')
  I.seeElement('.folder[aria-label*="Meeting room"] .color-label.selected')

  I.waitForElement(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.waitForElement(`.appointment[data-folder="cal://0/resource${conferenceRoomId}"]`)

  I.scrollTo(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)

  I.see('Reservation for: Meeting room', `.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.see('Reservation for: Conference room', `.appointment[data-folder="cal://0/resource${conferenceRoomId}"]`)

  // Make sure appointment title and participants are correctly displayed
  I.click(`.appointment[data-folder="cal://0/resource${meetingRoomId}"]`)
  I.waitForVisible('.detail-popup')
  I.waitForText('Reservation for: Meeting room', 5, '.detail-popup')
  I.waitForElement('.bi-gear')
  I.waitForText('Meeting room', 5, '.participant')
  I.dontSee('Private')
  I.click('~Close', '.detail-popup')

  I.click('.folder[aria-label*="Conference room"] .folder-node')
  I.waitForVisible('~Actions for Conference room')
  I.click('~Actions for Conference room')
  I.waitForVisible('.dropdown.open.context-dropdown')
  I.waitForVisible('.color-box-link[title="Red"]')

  I.click('.color-box-link[title="Red"]')
  I.waitForDetached('.dropdown.open.context-dropdown')
  I.waitForNetworkTraffic()

  // wait for folder color to be rendered
  const folderColorLabel = 'li.selected[aria-label^="Conference room"] .color-label'
  I.waitForElement(folderColorLabel)
  I.waitForVisible(folderColorLabel)
  // need to wait for colors to "settle"
  I.wait(0.75)
  const folderColor = await I.grabCssPropertyFrom(folderColorLabel, 'background-color')
  const appointmentColor = await I.grabCssPropertyFrom(`.appointment[data-folder="cal://0/resource${conferenceRoomId}"]`, 'background-color')
  assert.equal(folderColor, appointmentColor)
})

Scenario('Add resource calendar group and rename it afterwards', async ({ I, calendar, dialogs, contactpicker }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/resourceCalendars', true),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const [meetingRoomId] = await Promise.all([
    I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' }),
    I.haveResource({ description: 'Conference room', display_name: 'Conference room', name: 'Conference room', mailaddress: 'room@conference.io' })
  ])

  const resourceSettings = {
    enabled: true,
    groups: {
      testgroup: {
        folderId: 'flat/event/resources.testgroup',
        title: 'testgroup',
        folders: [meetingRoomId]
      }
    },
    folders: {
      [meetingRoomId]: {
        folderId: `cal://0/resource${meetingRoomId}`,
        'com.openexchange.calendar.extendedProperties': { color: { value: '#16adf8' } }
      }
    }
  }

  await Promise.all([
    I.haveSetting('io.ox/calendar//resources', resourceSettings)
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar group')

  dialogs.waitForVisible()
  I.waitForText('Add new resource calendar group')
  I.fillField('Resource calendar group name', 'Name with /')
  dialogs.clickButton('Add')
  I.waitForText('Folder names must not contain slashes')
  I.clearField('Resource calendar group name')
  dialogs.clickButton('Add')
  I.waitForText('Folder names must not be empty')
  I.fillField('Resource calendar group name', 'testgroup')
  dialogs.clickButton('Add')
  I.waitForText('A resource group named "testgroup" already exists!')
  I.fillField('Resource calendar group name', 'unique name')
  dialogs.clickButton('Add')

  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('unique name', 5, '.folder-tree')
  I.click('.folder-arrow', '~unique name')
  I.waitForText('Conference room')
  I.seeElement('.folder[aria-label*="Conference room"] .color-label.selected')

  I.click('.folder-node', '~unique name')
  I.openFolderMenu('Actions for unique name')
  I.clickDropdown('Rename resource group')

  dialogs.waitForVisible()
  I.waitForText('Rename folder')
  I.fillField('Folder name', 'Name with /')
  dialogs.clickButton('Rename')
  I.waitForText('Folder names must not contain slashes')
  I.fillField('Folder name', 'group name')
  dialogs.clickButton('Rename')
  I.waitForDetached('.modal-dialog')

  I.waitForText('group name', 5, '.folder-tree')
  I.dontSee('unique name')
})

Scenario('Alphabetical ordering of resource groups', async ({ I, calendar, dialogs, contactpicker }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/resourceCalendars', true),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  const [meetingRoomId] = await Promise.all([
    I.haveResource({ description: 'Meeting room', display_name: 'Meeting room', name: 'Meeting room', mailaddress: 'room@meeting.io' }),
    I.haveResource({ description: 'Conference room', display_name: 'Conference room', name: 'Conference room', mailaddress: 'room@conference.io' })
  ])

  const resourceSettings = {
    enabled: true,
    groups: {
      testgroup: {
        folderId: 'flat/event/resources.testgroup',
        title: 'testgroup',
        folders: [meetingRoomId]
      }
    },
    folders: {
      [meetingRoomId]: {
        folderId: `cal://0/resource${meetingRoomId}`,
        'com.openexchange.calendar.extendedProperties': { color: { value: '#16adf8' } }
      }
    }
  }

  await Promise.all([
    I.haveSetting('io.ox/calendar//resources', resourceSettings)
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.click('.folder-arrow', '~My calendars')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar group')

  dialogs.waitForVisible()
  I.fillField('Resource calendar group name', 'abc')
  dialogs.clickButton('Add')
  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('abc', 5, '.folder-tree')
  I.see('My calendars\nPublic calendars\nabc\ntestgroup', '.folder-tree')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar group')

  dialogs.waitForVisible()
  I.fillField('Resource calendar group name', 'bgroup')
  dialogs.clickButton('Add')
  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('bgroup', 5, '.folder-tree')
  I.see('My calendars\nPublic calendars\nabc\nbgroup\ntestgroup', '.folder-tree')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar')

  dialogs.waitForVisible()
  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('Resources', 5, '.folder-tree')
  I.see('My calendars\nPublic calendars\nResources\nabc\nbgroup\ntestgroup', '.folder-tree')

  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new resource calendar group')
  dialogs.waitForVisible()
  I.fillField('Resource calendar group name', '0group')
  dialogs.clickButton('Add')
  contactpicker.ready()
  contactpicker.add('Conference room')
  contactpicker.close()

  I.waitForText('0group', 5, '.folder-tree')
  I.see('My calendars\nPublic calendars\nResources\n0group\nabc\nbgroup\ntestgroup', '.folder-tree')
})
