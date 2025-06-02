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

const { expect } = require('chai')

Feature('Calendar > Planning View')

Before(async ({ users }) => { await Promise.all([users.create(), users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('use planning view opened from edit view', async ({ I, calendar, dialogs }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  I.fillField('Title', 'Planning View Test')

  I.click('Find a free time')

  dialogs.waitForVisible()
  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  // scroll to start (I.scrollTo doesn't work)
  I.executeScript(() => { document.querySelector('.freetime-time-view-body').scrollLeft = 0 })
  I.click('.timeline-day:first-child .freetime-hour:nth-child(6)')

  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal-dialog')

  I.waitForInvisible('.freetime-view-header')
  I.waitForInvisible('.freetime-view-body')

  I.waitForValue('~Start time', '12:00 PM')
  I.waitForValue('~End time', '1:00 PM')

  I.click('Create')
})

Scenario.skip('use planning view as Standalone app', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.openScheduling()

  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  // scroll to start (I.scrollTo doesn't work)
  I.executeScript(function () {
    document.querySelector('.freetime-time-view-body').scrollLeft = 0
  })

  I.click('.timeline-day:first-child .freetime-hour:nth-child(6)')

  // add a participant
  I.fillField('Participants and resources', 'testdude1@test.test')
  I.pressKey('Enter')
  I.see('testdude1')

  I.click('Create appointment')

  I.waitForInvisible('.freetime-view-header')
  I.waitForInvisible('.freetime-view-body')

  I.waitForVisible({ css: '*[data-app-name="io.ox/calendar/edit"]' })
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Planning View Test2')

  I.waitForValue('~Start time', '12:00 PM')
  I.waitForValue('~End time', '1:00 PM')

  I.see('testdude1')

  I.click('Create')
})

// TODO: shaky, msg: 'Cannot read property 'x' of null'
Scenario.skip('test planning view lasso', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.openScheduling()

  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  I.waitForNetworkTraffic()
  I.waitForVisible('.freetime-table-cell:nth-child(6)')
  I.scrollTo('.freetime-table-cell:nth-child(6)')

  // lasso
  I.dragAndDrop('.freetime-table-cell:nth-child(6)', '.freetime-table-cell:nth-child(8)')
  I.waitForVisible('.freetime-lasso')

  I.click('Create appointment')

  I.waitForInvisible('.freetime-view-header')
  I.waitForInvisible('.freetime-view-body')

  I.waitForVisible({ css: '*[data-app-name="io.ox/calendar/edit"]' })
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Planning View Test2')

  I.waitForValue('~Start time', '12:30 PM')
  I.waitForValue('~End time', '2:30 PM')

  I.click('Create')
})

Scenario('create distributionlist from planning view', async ({ I, users, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.openScheduling()

  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  // add a participant
  I.fillField('Add contact/resource', 'testdude1@test.test')
  I.pressKey('Enter')
  I.see(`${users[0].get('sur_name')}, ${users[0].get('given_name')}`)

  I.click('Save as distribution list')

  I.waitForVisible('.io-ox-contacts-distrib-window')

  I.fillField('Name', 'Test distribution list')
  I.click('Create list', '.io-ox-contacts-distrib-window')

  I.click('.scheduling-app-close')
})

Scenario('check planning view options and minimizing behavior', async ({ I, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.openScheduling()

  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  I.waitForVisible('.freetime-time-view-header .controls-container .control.prev')
  I.waitForVisible('.freetime-time-view-header .controls-container .control.next')
  I.waitForVisible('~Zoom out')
  I.waitForVisible('~Zoom in')
  I.see('Options', '.scheduling-app-header')

  I.click('Options', '.scheduling-app-header')

  I.waitForVisible('[data-name="compact"]')
  I.waitForVisible('[data-name="showFineGrid"]')
  I.waitForVisible('[data-name="showFree"]')
  I.waitForVisible('[data-value="week"][data-name="dateRange"]')
  I.waitForVisible('[data-value="month"][data-name="dateRange"]')
  I.waitForVisible('[data-name="onlyWorkingHours"]')

  I.pressKey('Escape')

  I.openApp('Mail')

  I.waitForInvisible('.freetime-view-header')
  I.waitForInvisible('.freetime-view-body')
  I.waitForVisible('.taskbar-button[aria-label="Scheduling"]')

  I.click('.taskbar-button[aria-label="Scheduling"]')

  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  I.click('.scheduling-app-close')
})

Scenario('[C7443] Check availability of participants', async ({ I, users, calendar }) => {
  await I.haveSetting('io.ox/calendar//scheduling/onlyWorkingHours', false)

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)

  I.retry(5).fillField('Title', 'Dance Party')
  I.fillField('Location', 'Dancefloor')

  await calendar.addParticipant(users[1].get('name'))
  await calendar.addParticipant(users[2].get('name'))

  I.click('Create')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

  await calendar.addParticipant(users[1].get('name'))
  await calendar.addParticipant(users[2].get('name'))

  I.click('Find a free time')
  I.waitForVisible('.freetime-popup')
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[1]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[2]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[3]' })
})

Scenario('[C7444] Check availability of resources', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/calendar//scheduling/onlyWorkingHours', false)

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  // just to be sure, cleanup artefacts
  await I.dontHaveResource('Evil Lair')
  await I.dontHaveResource('Laser Sharks')

  await I.haveResource({ description: 'Evil lair under an active volcano', display_name: 'EvilLair', name: 'EvilLair', mailaddress: 'lair@evil.inc' })
  await I.haveResource({ description: 'Evil sharks equipped with lasers', display_name: 'LaserSharks', name: 'LaserSharks', mailaddress: 'lasersharks@evil.inc' })

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)

  I.retry(5).fillField('Title', 'How to conquer the world')
  I.fillField('Location', 'Secret volcano lair')

  await calendar.addParticipant('EvilLair')
  await calendar.addParticipant('LaserSharks')

  I.click('Create')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

  await calendar.addParticipant('EvilLair')
  await calendar.addParticipant('LaserSharks')

  I.click('Find a free time')
  I.waitForVisible('.freetime-popup')
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[1]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[2]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[3]' })

  await I.dontHaveResource('EvilLair')
  await I.dontHaveResource('LaserSharks')
})

Scenario('[C7445] Check availability of resources and participants', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//scheduling/onlyWorkingHours', false),
    I.dontHaveResource('Eggs'),
    I.dontHaveResource('Colors')
  ])
  await Promise.all([
    I.haveResource({ description: 'Eggs from happy chickens', display_name: 'Eggs', name: 'Eggs', mailaddress: 'eggs@easter.bunny' }),
    I.haveResource({ description: 'Colors for Easter Eggs. 100% gluten free, organic', display_name: 'Colors', name: 'Colors', mailaddress: 'colors@easter.bunny' })
  ])

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')
  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)

  I.fillField('Title', 'Color Easter Eggs')
  I.fillField('Location', 'Easter Bunny house')

  await calendar.addParticipant('Eggs')
  await calendar.addParticipant('Colors')
  await calendar.addParticipant(users[1].get('name'))
  await calendar.addParticipant(users[2].get('name'))

  I.click('Create')

  calendar.newAppointment()
  I.waitForVisible(calendar.editWindow)
  I.waitForText('Find a free time', 5, calendar.editWindow)
  I.click('Find a free time')
  I.waitForVisible('.freetime-popup')

  await calendar.addParticipant('Eggs', true, '.freetime-view')
  await calendar.addParticipant('Colors', true, '.freetime-view')
  await calendar.addParticipant(users[1].get('name'), true, '.freetime-view')
  await calendar.addParticipant(users[2].get('name'), true, '.freetime-view')

  I.waitForElement({ xpath: '//div[@class="appointments"]/*[1]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[2]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[3]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[4]' })
  I.waitForElement({ xpath: '//div[@class="appointments"]/*[5]' })

  await Promise.all([I.dontHaveResource('Eggs'), I.dontHaveResource('Colors')])
})

Scenario('[C252157] Fine grid for high zoom levels ', async ({ I, users, calendar }) => {
  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  await Promise.all([
    I.dontHaveResource('Zebra'),
    I.dontHaveResource('Tiger')
  ])

  await Promise.all([
    I.haveResource({ description: 'Zebra with awesome stripes', display_name: 'Zebra', name: 'Zebra', mailaddress: 'zebra@zoo.zoo' }),
    I.haveResource({ description: 'Tiger with awesome stripes', display_name: 'Tiger', name: 'Tiger', mailaddress: 'tiger@zoo.zoo' })
  ])

  calendar.openScheduling()

  I.waitForVisible('.io-ox-calendar-scheduling-window')

  I.fillField('.freetime-view-header .add-participant.tt-input', 'Zebra')
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('Enter')

  I.fillField('.freetime-view-header .add-participant.tt-input', 'Tiger')
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('Enter')

  I.fillField('.freetime-view-header .add-participant.tt-input', users[1].get('name'))
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('Enter')

  I.fillField('.freetime-view-header .add-participant.tt-input', users[2].get('name'))
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('Enter')

  I.click('Options', '.scheduling-app-header')
  I.click('Show fine grid')
  I.pressKey('Escape')

  // 100%
  let [backgroundImage] = await I.grabCssPropertyFromAll('.freetime-table-cell', 'background-image')
  expect(backgroundImage).to.equal('linear-gradient(90deg, rgb(170, 170, 170) 0px, rgba(0, 0, 0, 0) 1px)')

  // 200%
  I.click('~Zoom in', '.zoomlevel-selector');

  [backgroundImage] = await I.grabCssPropertyFromAll('.freetime-table-cell', 'background-image')
  expect(backgroundImage).to.equal('linear-gradient(90deg, rgb(170, 170, 170) 0px, rgba(0, 0, 0, 0) 1px)')

  // 400%
  I.click('~Zoom in', '.zoomlevel-selector');

  [backgroundImage] = await I.grabCssPropertyFromAll('.freetime-table-cell', 'background-image')
  expect(backgroundImage).to.equal('linear-gradient(90deg, rgb(170, 170, 170) 0px, rgba(0, 0, 0, 0) 1px)')

  // 1000%
  I.click('~Zoom in', '.zoomlevel-selector');

  [backgroundImage] = await I.grabCssPropertyFromAll('.freetime-table-cell', 'background-image')
  expect(backgroundImage).to.equal('linear-gradient(90deg, rgb(51, 51, 51) 0px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 50px, rgb(136, 136, 136) 51px, rgba(0, 0, 0, 0) 51px, rgba(0, 0, 0, 0) 99px, rgb(136, 136, 136) 100px, rgba(0, 0, 0, 0) 100px, rgba(0, 0, 0, 0) 149px)')

  await Promise.all([
    I.dontHaveResource('Zebra'),
    I.dontHaveResource('Tiger')
  ])
})

Scenario('I can not see the users free busy states when freeBusyVisibility is set to "none"', async function ({ I, users, calendar }) {
  await I.haveSetting({ 'io.ox/calendar': { 'chronos/freeBusyVisibility': 'none' } }, { user: users[2] })

  I.login('app=io.ox/calendar')
  I.waitForVisible('.io-ox-calendar-window')

  calendar.openScheduling()
  I.waitForVisible('.freetime-view-header')
  I.waitForVisible('.freetime-view-body')

  I.fillField('.add-participant.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.see(users[1].get('sur_name'))
  I.waitForElement(`.appointment-table[data-value="mailto:${users[1].get('primaryEmail')}"]`)
  I.dontSee(`.appointment-table.missing-appointment-info[data-value="mailto:${users[1].get('primaryEmail')}"]`)

  I.fillField('.add-participant.tt-input', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.see(users[2].get('sur_name'))
  I.waitForElement(`.appointment-table.missing-appointment-info[data-value="mailto:${users[2].get('primaryEmail')}"]`)
  I.seeElement(`.attendee[data-uri="mailto:${users[2].get('primaryEmail')}"] .bi-eye-slash`)
})
