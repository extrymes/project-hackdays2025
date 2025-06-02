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

Feature('Calendar')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Use countdown for upcoming meeting', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { countdown: true, '.user': { countdown: true } } }
    }),
    I.haveAppointment({
      summary: 'My next meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=12345',
      description: 'Lorem ipsum',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(3, 'minutes') },
      endDate: { value: moment().startOf('minute').add(3, 'minutes').add(30, 'minutes') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // countdown shows up
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')
  // proper set of buttons
  I.waitForElement('.countdown [data-action="close"]')
  I.waitForElement('.countdown [data-action="minimize"]')
  I.dontSeeElement('.countdown [data-action="feedback"]')
  // not started yet
  I.dontSeeElement('.countdown.started')
  // contains button to join meeting
  I.see('Join Zoom meeting ...', '.countdown')
  // open and close detail popup from countdown popup
  I.click('.countdown')
  I.waitForText('My next meeting', 5, '.detail-popup')
  I.click('.countdown')
  I.dontSeeElement('.detail-popup')
  // minimize
  I.dontSeeElement('.countdown.small')
  I.click('.countdown [data-action="minimize"]')
  I.waitForElement('.countdown.small')
})

Scenario('Use countdown for running meeting', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { countdown: true, '.user': { countdown: true } } }
    }),
    I.haveAppointment({
      summary: 'My next meeting',
      location: 'Somewhere',
      description: 'Lorem ipsum https://meet.google.com/123ABC ',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').subtract(5, 'minutes') },
      endDate: { value: moment().startOf('minute').subtract(5, 'minutes').add(30, 'minutes') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // countdown shows up
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')
  // started yet
  I.waitForElement('.countdown.late')
  // contains button to join meeting (based on description)
  I.see('Join with Google Meet ...', '.countdown')
  I.seeElement('.countdown [data-action="join"]')
})

Scenario('Use countdown for meetings only', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { countdown: true, '.user': { countdown: true } } },
      'io.ox/calendar': { countdown: { meetingsOnly: true } }
    }),
    I.haveAppointment({
      summary: 'My next meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=12345',
      description: 'Lorem ipsum',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(3, 'minutes') },
      endDate: { value: moment().startOf('minute').add(3, 'minutes').add(30, 'minutes') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // countdown shows up
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')
  // open detail popup and edit appointment
  I.click('.countdown')
  I.waitForText('My next meeting', 5, '.detail-popup')
  I.click('~Edit appointment', '.detail-popup')
  I.waitForText('Location', 5, calendar.editWindow)
  I.fillField('Location', 'No meeting anymore')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow, 5)

  // popup will disappear
  I.waitForDetached(locate('.countdown').withText('My next meeting').as('My next meeting'))

  // edit again
  I.click('~Edit appointment', '.detail-popup')
  I.waitForText('Location', 5, calendar.editWindow)
  I.fillField('Location', 'Zoom https://foo.zoom.us/my/ox035?pwd=12345')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow, 5)

  // countdown should re-appear
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')
})

Scenario('Use countdown with different lead times', async ({ I, calendar, settings }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { countdown: true, '.user': { countdown: true } } },
      'io.ox/calendar': { countdown: { leadTime: '15' } }
    }),
    I.haveAppointment({
      summary: 'My next meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=12345',
      description: 'Lorem ipsum',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(11, 'minutes') },
      endDate: { value: moment().startOf('minute').add(11, 'minutes').add(30, 'minutes') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // countdown shows up
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')

  // Change settings
  settings.open('Notifications', 'Calendar')
  I.waitForElement('#settings-countdown-leadTime')
  I.selectOption('#settings-countdown-leadTime', '5 minutes before the appointment starts')

  // popup will disappear
  I.waitForDetached(locate('.countdown').withText('My next meeting').as('My next meeting'))

  // change settings again
  I.selectOption('#settings-countdown-leadTime', '30 minutes before the appointment starts')

  // countdown should re-appear
  I.waitForVisible('.countdown')
  I.waitForText('My next meeting', 5, '.countdown')
})

Scenario('Use multiple countdowns for parallel appointments', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { countdown: true, '.user': { countdown: true } } },
      'io.ox/calendar': { countdown: { leadTime: '15' } }
    }),
    I.haveAppointment({
      summary: 'My next meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=12345',
      description: 'Lorem ipsum',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(3, 'minutes') },
      endDate: { value: moment().startOf('minute').add(3, 'minutes').add(30, 'minutes') }
    }),
    I.haveAppointment({
      summary: 'And another meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=2222',
      description: '',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(6, 'minutes') },
      endDate: { value: moment().startOf('minute').add(6, 'minutes').add(60, 'minutes') }
    }),
    I.haveAppointment({
      summary: 'And a third meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=3333',
      description: '',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(9, 'minutes') },
      endDate: { value: moment().startOf('minute').add(9, 'minutes').add(60, 'minutes') }
    }),
    I.haveAppointment({
      summary: 'And a forth meeting',
      location: 'https://foo.zoom.us/my/ox035?pwd=4444',
      description: '',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('minute').add(12, 'minutes') },
      endDate: { value: moment().startOf('minute').add(12, 'minutes').add(60, 'minutes') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  // countdown shows up
  I.waitForVisible('.countdown-collection')
  I.waitForVisible('.countdown')
  I.seeNumberOfElements('.countdown', 3)
  I.waitForText('My next meeting', 5, '.countdown-collection')
  I.waitForText('And another meeting', 5, '.countdown-collection')
  I.waitForText('And a third meeting', 5, '.countdown-collection')
  I.dontSee('And a forth meeting', '.countdown-collection')
})
