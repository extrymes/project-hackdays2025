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

Feature('Calendar > Managed Resources')

Before(async ({ I, users }) => {
  await Promise.all([users.create(), users.create()])

  await Promise.all([
    I.haveSetting({
      'io.ox/core': {
        features: {
          managedResources: true,
          resourceCalendars: true,
          '.user': { managedResources: true }
        }
      }
    }),
    I.haveSetting({
      'io.ox/core': {
        features: {
          managedResources: true,
          resourceCalendars: true,
          '.user': { managedResources: true }
        }
      }
    }, { user: users[1] })
  ])
})

After(async ({ I, users }) => { await users.removeAll() })

Scenario('Participant status in detail and edit view reflects resource permissions', async ({ I, users, calendar, dialogs }) => {
  await Promise.all([
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])
  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Meeting room',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{ entity: 0, group: true, privilege: 'ask_to_book' }, { entity: users[0].get('id'), group: false, privilege: 'delegate' }]
    }),
    I.haveResource({
      description: 'Conference room',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{ entity: 0, group: true, privilege: 'book_directly' }]
    })
  ])
  const resourceSettings = {
    enabled: true,
    groups: {
      general: {
        folderId: 'flat/event/resources.general',
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

  await I.haveSetting({
    'io.ox/calendar': {
      resources: resourceSettings,
      folderview: {
        open: {
          large: [
            'virtual/flat/event/private',
            'virtual/flat/event/resources.general'
          ]
        }
      },
      selectedFolders: [`cal://0/${await I.grabDefaultFolder('calendar')}`, `cal://0/resource${meetingRoomId}`],
      layout: 'list'
    }
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // prepare edit view
  calendar.newAppointment()
  I.fillField('Title', 'test title')
  I.fillField('Participants and resources', 'Meeting room')
  I.waitForElement('.tt-dropdown-menu .participant-wrapper')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.fillField('Participants and resources', 'Conference room')
  I.waitForElement('.tt-dropdown-menu .participant-wrapper')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')

  I.seeElement('[data-uri="mailto:room@meeting.io"] .participation-status.accepted')
  I.seeElement('[data-uri="mailto:room@conference.io"] .participation-status.accepted')
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window')

  I.waitForText('test title', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForElement('.participant.accepted [title="Meeting room"]')
  I.waitForElement('.participant.accepted [title="Conference room"]')
  I.click('~Delete appointment', '.classic-toolbar')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete appointment')
  I.waitForDetached('.modal-dialog')
  I.logout()

  await I.haveSetting('io.ox/calendar//layout', 'list', { user: users[1] })
  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForApp()

  // prepare edit view
  calendar.newAppointment()
  I.fillField('Title', 'test title')
  I.fillField('Participants and resources', 'Meeting room')
  I.waitForElement('.tt-dropdown-menu .participant-wrapper')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.fillField('Participants and resources', 'Conference room')
  I.waitForElement('.tt-dropdown-menu .participant-wrapper')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')

  I.seeElement('[data-uri="mailto:room@meeting.io"] .participation-status.needs-action')
  I.seeElement('[data-uri="mailto:room@conference.io"] .participation-status.accepted')
  I.click('Create')
  I.waitForDetached('.io-ox-calendar-edit-window')

  I.waitForText('test title', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForText('Meeting room', 5, '.calendar-detail .participant.needs-action')
  I.waitForElement('.participant.accepted [title="Conference room"]')
})

Scenario('Detail view draws blue badge and change confirmation button correctly', async ({ I, users, calendar, dialogs }) => {
  await Promise.all([
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])
  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Meeting room',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{ entity: 0, group: true, privilege: 'ask_to_book' }, { entity: users[0].get('id'), group: false, privilege: 'delegate' }]
    }),
    I.haveResource({
      description: 'Conference room',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{ entity: 0, group: true, privilege: 'book_directly' }]
    })
  ])
  const resourceSettings = {
    enabled: true,
    groups: {
      general: {
        folderId: 'flat/event/resources.general',
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

  await I.haveSetting({
    'io.ox/calendar': {
      resources: resourceSettings,
      folderview: {
        open: {
          large: [
            'virtual/flat/event/private',
            'virtual/flat/event/resources.general'
          ]
        }
      },
      selectedFolders: [`cal://0/${await I.grabDefaultFolder('calendar')}`, `cal://0/resource${meetingRoomId}`],
      layout: 'list'
    }
  })

  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'Test',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'NEEDS-ACTION', cuType: 'RESOURCE', cn: 'Meeting room', entity: meetingRoomId, uri: 'mailto:room@meeting.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })
  await I.haveAppointment({
    summary: 'Test2',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'ACCEPTED', cuType: 'RESOURCE', cn: 'Conference room', entity: conferenceRoomId, uri: 'mailto:room@conference.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  // check event
  I.waitForClickable('.folder[aria-label*="Conference room"] .color-label', 5)
  I.click('.folder[aria-label*="Conference room"] .color-label', '~Resources')
  I.waitForClickable('.folder[aria-label*="Meeting room"] .color-label', 5)
  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForText('Reservation for: Conference room', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForText('Reservation for: Conference room', 5, '.calendar-detail')
  I.dontSeeElement('.resource-management-info')

  // check next event
  I.waitForClickable('.folder[aria-label*="Conference room"] .color-label', 5)
  I.click('.folder[aria-label*="Conference room"] .color-label', '~Resources')
  I.waitForClickable('.folder[aria-label*="Meeting room"] .color-label', 5)
  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForText('Test', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForText('Test', 5, '.calendar-detail')
  I.waitForElement('.resource-management-info')
  I.waitForText('Meeting room', 5, '.calendar-detail .participant.needs-action')

  // accept confirmation
  I.click('Change confirmation', '.calendar-detail .participant.needs-action')
  dialogs.waitForVisible()
  I.checkOption('Accept')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.resource-management-info', 5)
  I.waitForElement('.participant.accepted [title="Meeting room"]')
  I.dontSeeElement('.resource-management-info')
})

Scenario('Detail view confirmation buttons use calendar owner', async ({ I, users, calendar, dialogs }) => {
  await Promise.all([
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])
  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Meeting room',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{ entity: 0, group: true, privilege: 'ask_to_book' }, { entity: users[0].get('id'), group: false, privilege: 'delegate' }]
    }),
    I.haveResource({
      description: 'Conference room',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{ entity: 0, group: true, privilege: 'book_directly' }]
    })
  ])
  await I.haveSetting({
    'io.ox/calendar': {
      resources: {
        enabled: true,
        groups: {
          general: {
            folderId: 'flat/event/resources.general',
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
      },
      folderview: {
        open: {
          large: [
            'virtual/flat/event/private',
            'virtual/flat/event/resources.general'
          ]
        }
      },
      selectedFolders: [`cal://0/${await I.grabDefaultFolder('calendar')}`, `cal://0/resource${meetingRoomId}`],
      layout: 'list'
    }
  })

  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'Test',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'NEEDS-ACTION', cuType: 'RESOURCE', cn: 'Meeting room', entity: meetingRoomId, uri: 'mailto:room@meeting.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` },
      { partStat: 'NEEDS-ACTION', cuType: 'INDIVIDUAL', entity: users[0].get('id'), cn: users[0].get('display_name'), uri: `mailto:${users[0].get('email1')}` }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForClickable('.folder[aria-label*="Meeting room"] .color-label', 5)
  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForNetworkTraffic()
  I.waitForText('Test', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForText('Test', 5, '.calendar-detail')
  I.waitForElement('.resource-management-info')

  I.click('[data-action="changestatus"]')
  dialogs.waitForVisible()
  I.dontSee('This is a booking request for Meeting room')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.waitForClickable(`.folder[aria-label*="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .color-label`, 5)
  I.click(`.folder[aria-label*="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .color-label`)
  I.waitForClickable('.folder[aria-label*="Meeting room"] .color-label', 5)
  I.click('.folder[aria-label*="Meeting room"] .color-label', '~Resources')
  I.waitForNetworkTraffic()
  I.waitForText('Test', 5, '.calendar-list-view')
  I.click('.calendar-list-view .list-item.selectable.appointment')
  I.waitForText('Test', 5, '.calendar-detail')
  I.waitForElement('.resource-management-info')

  I.click('[data-action="changestatus"]')
  dialogs.waitForVisible()
  I.see('This is a booking request for Meeting room')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
})

Scenario('Resource requests show up in notification area', async ({ I, users, calendar }) => {
  await Promise.all([
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])
  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Meeting room',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{ entity: 0, group: true, privilege: 'ask_to_book' }, { entity: users[0].get('id'), group: false, privilege: 'delegate' }]
    }),
    I.haveResource({
      description: 'Conference room',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{ entity: 0, group: true, privilege: 'book_directly' }]
    })
  ])
  const resourceSettings = {
    enabled: true,
    groups: {
      general: {
        folderId: 'flat/event/resources.general',
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

  await I.haveSetting({
    'io.ox/calendar': {
      resources: resourceSettings,
      folderview: {
        open: {
          large: [
            'virtual/flat/event/private',
            'virtual/flat/event/resources.general'
          ]
        }
      },
      selectedFolders: [`cal://0/${await I.grabDefaultFolder('calendar')}`, `cal://0/resource${meetingRoomId}`],
      layout: 'list'
    }
  })

  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'Test',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'NEEDS-ACTION', cuType: 'RESOURCE', cn: 'Meeting room', entity: meetingRoomId, uri: 'mailto:room@meeting.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })
  await I.haveAppointment({
    summary: 'Test2',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'ACCEPTED', cuType: 'RESOURCE', cn: 'Conference room', entity: conferenceRoomId, uri: 'mailto:room@conference.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle')
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')

  I.waitForText('Resource booking requests', 10)
  I.see('1', '.counter')
  I.waitForText('Test', 10, '.item[data-type="resource:invitation"]')
  I.click('Accept', '.item[data-type="resource:invitation"]')
  I.waitForDetached('.item[data-type="resource:invitation"]', 0.2)
  I.dontSee('Resource booking requests')
  I.click('#io-ox-notifications-toggle')

  I.waitForText('Test', 5, '.calendar-list-view')
  I.click('Test', '.calendar-list-view')
  I.waitForText('Test', 5, '.calendar-detail')
  I.dontSeeElement('.resource-management-info')
  I.waitForElement('.participant.accepted [title="Meeting room"]')
})

Scenario('iTip mails offer actions and show blue badge in change confirmation dialog', async ({ I, users, calendar, dialogs, mail }) => {
  await Promise.all([
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])
  const [meetingRoomId, conferenceRoomId] = await Promise.all([
    I.haveResource({
      description: 'Meeting room',
      display_name: 'Meeting room',
      name: 'Meeting room',
      mailaddress: 'room@meeting.io',
      permissions: [{ entity: 0, group: true, privilege: 'ask_to_book' }, { entity: users[0].get('id'), group: false, privilege: 'delegate' }]
    }),
    I.haveResource({
      description: 'Conference room',
      display_name: 'Conference room',
      name: 'Conference room',
      mailaddress: 'room@conference.io',
      permissions: [{ entity: 0, group: true, privilege: 'book_directly' }]
    })
  ])
  const resourceSettings = {
    enabled: true,
    groups: {
      general: {
        folderId: 'flat/event/resources.general',
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

  await I.haveSetting({
    'io.ox/calendar': {
      resources: resourceSettings,
      folderview: {
        open: {
          large: [
            'virtual/flat/event/private',
            'virtual/flat/event/resources.general'
          ]
        }
      },
      selectedFolders: [`cal://0/${await I.grabDefaultFolder('calendar')}`, `cal://0/resource${meetingRoomId}`],
      layout: 'list'
    }
  })

  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'Test',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'NEEDS-ACTION', cuType: 'RESOURCE', cn: 'Meeting room', entity: meetingRoomId, uri: 'mailto:room@meeting.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })
  await I.haveAppointment({
    summary: 'Test2',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: users[1].get('display_name'),
      email: users[1].get('email1'),
      uri: `mailto:${users[1].get('email1')}`
    },
    attendees: [
      { partStat: 'ACCEPTED', cuType: 'RESOURCE', cn: 'Conference room', entity: conferenceRoomId, uri: 'mailto:room@conference.io' },
      { partStat: 'ACCEPTED', cuType: 'INDIVIDUAL', entity: users[1].get('id'), cn: users[1].get('display_name'), uri: `mailto:${users[1].get('email1')}` }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.waitForText('New appointment for resource Meeting room', 30)
  mail.selectMail('New appointment for resource Meeting room')
  I.waitForElement('.mail-detail-frame')
  I.waitForText('Accept', 5, '.itip-actions')
  I.see('Maybe', '.itip-actions')
  I.see('Decline', '.itip-actions')

  // accept confirmation
  I.click('[data-action="changestatus"]')
  dialogs.waitForVisible()
  I.checkOption('Accept')
  I.waitForText('This is a booking request for Meeting room')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
})
