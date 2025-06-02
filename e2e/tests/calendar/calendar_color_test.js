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

Feature('Calendar')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create appointment and check if the color is correctly applied and removed', async ({ I, users, calendar }) => {
  const time = moment().startOf('day').add(16, 'hours')

  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveAppointment({
      summary: 'test appointment one',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForText('test appointment one', 5, '.weekview-container.week')
  I.see('test appointment one', '.weekview-container.week .appointment .title')

  I.seeNumberOfElements('.weekview-container.week .appointment .title', 1)

  // wait for folder color to be rendered
  const folderColorLabel = `li.selected[aria-label^="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .color-label`
  I.waitForElement(folderColorLabel)
  I.waitForVisible(folderColorLabel)
  const folderColor = await I.grabCssPropertyFrom(folderColorLabel, 'background-color')
  let appointmentColor = await I.grabCssPropertyFrom('.week .appointment', 'background-color')
  assert.equal(folderColor, appointmentColor)

  // Change color
  I.click('test appointment one', '.weekview-container.week .appointment .title')
  I.waitForVisible('.detail-popup [data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit', '.detail-popup')
  I.waitForVisible(calendar.editWindow)
  I.waitForElement('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.click('Appointment color', '.color-picker-dropdown')
  const redBackground = await I.grabCssPropertyFrom({ css: 'a[title="Red"]' }, 'background-color')
  const redBorder = await I.grabCssPropertyFrom({ css: 'a[title="Red"]' }, 'border-color')
  I.click('a[title="Red"]')
  I.waitForDetached('.dropdown.open')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  // get appointment color
  appointmentColor = await I.grabCssPropertyFrom('.week .appointment', 'background-color')
  assert.notEqual(folderColor, appointmentColor)
  // the color might differ if the appointment has .hover class which is not predictable
  function checkColor (color) {
    if (color === redBackground || color === redBorder) return true
    const rgb = color.substring(4, color.length - 1).split(',')
    // fuzzy check for red
    if (rgb[0] >= 240 && rgb[1] <= 185 && rgb[2] <= 205) return true
    return false
  }
  assert.ok(checkColor(appointmentColor))

  // Change color back to folder color
  I.waitForElement('~Edit')
  I.click('~Edit', '.detail-popup')
  I.waitForVisible(calendar.editWindow)
  I.waitForElement('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.click('Appointment color', '.color-picker-dropdown')
  I.click('Use calendar color')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  appointmentColor = await I.grabCssPropertyFrom('.week .appointment', 'background-color')
  // check if the color is back to folder color
  assert.equal(folderColor, appointmentColor)
})

Scenario('Changing calendar color should change appointment color that uses calendar color', async ({ I, users, calendar }) => {
  const time = moment().startOf('isoWeek').add(16, 'hours')

  await Promise.all([
    I.haveAppointment({
      summary: 'test appointment one',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    }),
    I.haveAppointment({
      summary: 'test appointment two',
      startDate: { value: time },
      endDate: { value: time.add(1, 'hour') }
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.say('Check colors')
  I.waitForText('test appointment one', 5, '.page.current')
  I.waitForText('test appointment two', 5, '.page.current')
  I.seeNumberOfElements('.page.current .appointment .title', 2)

  I.say('Change color of first appointment')
  I.click('test appointment one', '.page.current .appointment .title')
  I.waitForVisible('.detail-popup [data-action="io.ox/calendar/detail/actions/edit"]')
  I.click('~Edit', '.detail-popup')
  I.waitForVisible(calendar.editWindow)
  I.waitForText('Appointment color', 5, '.color-picker-dropdown')
  I.click('Appointment color', '.color-picker-dropdown')
  const redBackground = await I.grabCssPropertyFrom('a[title="Red"]', 'background-color')
  const redBorder = await I.grabCssPropertyFrom('a[title="Red"]', 'border-color')
  I.click('a[title="Red"]')
  I.waitForDetached('.dropdown.open')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)

  I.say('Change calendar color to dark green')
  I.rightClick(`~${calendar.getFullname(users[0])}`)
  I.waitForElement('.dropdown.open')
  I.waitForVisible('.io-ox-calendar-color-picker-container a[title="Green"]')
  const greenBackground = await I.grabCssPropertyFrom('a[title="Green"]', 'background-color')
  const greenBorder = await I.grabCssPropertyFrom('a[title="Green"]', 'border-color')
  I.say('Green')
  I.click('a[title="Green"]')
  I.waitForDetached('.dropdown.open')
  I.waitForText('test appointment one', 5, '.page.current')

  I.say('Check correctly applied colors')
  // get folder color
  const folderColor = await I.grabCssPropertyFrom(`li.selected[aria-label^="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .color-label`, 'background-color')
  // get appointment colors
  const appointmentOneColor = await I.grabCssPropertyFrom('.page.current .appointment[aria-label*="test appointment one"]', 'background-color')
  const appointmentTwoColor = await I.grabCssPropertyFrom('.page.current .appointment[aria-label*="test appointment two"]', 'background-color')
  assert.equal(folderColor, greenBackground)
  assert.ok(appointmentOneColor === redBackground || appointmentOneColor === redBorder)
  assert.ok(appointmentTwoColor === greenBackground || appointmentTwoColor === greenBorder)
})

Scenario('Check appointment colors of appointments the user got invited to', async ({ I, users, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: users[1] })
  ])
  I.login('app=io.ox/calendar')
  const greyColor = 'rgb(230, 230, 230)'
  const blueColor = 'rgb(206, 238, 253)'

  calendar.newAppointment()
  I.fillField('Title', 'Test Appointment')
  I.fillField('~Start time', '9:00 AM')
  I.fillField('Participants and resources', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.scrollTo('.attendee-change-checkbox')
  I.waitForEnabled('[name=attendeePrivileges]')
  I.checkOption('attendeePrivileges')
  I.scrollTo('.color-picker-dropdown')
  I.click('Appointment color', '.color-picker-dropdown')
  I.waitForElement('a[title="Green"]')
  I.click('a[title="Green"]')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)

  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })
  I.waitForText('Test Appointment', 5, '.page.current')
  I.click('~Test Appointment')
  I.waitForText('Accept')
  I.click('Accept')
  I.click('~Edit appointment', '.detail-popup')
  I.waitForElement('.color-picker-dropdown button.disabled')
  I.waitForElement('.color-picker-dropdown .picked-color')
  const color = await I.grabCssPropertyFrom('.color-picker-dropdown .picked-color', 'background-color')
  assert.equal(color, greyColor)
  I.click('Discard', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.click('~Close', '.detail-popup-appointment')
  I.waitForDetached('.detail-popup-appointment')

  const appointmentColor = await I.grabCssPropertyFrom('~Test Appointment', 'background-color')
  assert.equal(appointmentColor, blueColor)
})

Scenario('Check appointment colors of public calendar appointments the user got invited to', async ({ I, users, calendar, dialogs }) => {
  const redColor = 'rgb(255, 204, 219)'
  const greenColor = 'rgb(221, 247, 212)'

  I.login('app=io.ox/calendar')

  I.say('Create a new public calendar that gets shared with user B')
  I.waitForElement('~Folder-specific actions')
  I.click('~Folder-specific actions')
  I.clickDropdown('Add new calendar')
  dialogs.waitForVisible()
  I.waitForText('Add as public calendar', 5, dialogs.body)
  I.checkOption('Add as public calendar', dialogs.body)
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')
  I.say('Grant permission to user b')
  I.click(locate('.folder-arrow').inside('~Public calendars').as('Public calendars'))
  I.rightClick('~New calendar')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForElement('.form-control.tt-input')
  I.fillField('.form-control.tt-input', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.click({ css: 'button[title="Current role"]' }, '.supports-personal-shares')
  I.clickDropdown('Author')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.say('Create a new appointment in the public calendar and invite user B')
  I.clickPrimary('New appointment')
  I.waitForText('Appointments in public calendars')
  dialogs.clickButton('Create in public calendar')
  I.waitForDetached('.modal-dialog')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Test Appointment')
  I.fillField('~Start time', '12:00 PM')
  I.fillField('Participants and resources', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.scrollTo('.color-picker-dropdown')
  I.waitForClickable('.color-picker-dropdown')
  I.click('Appointment color', '.color-picker-dropdown')
  I.click('.color-picker-dropdown.open a[title="Red"]')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  I.logout()

  I.login('app=io.ox/calendar', { user: users[1] })

  I.waitForText('Test Appointment')

  calendar.clickAppointment('Test Appointment')
  I.waitForText('Accept', 5, '.detail-popup-appointment')
  I.click('Accept', '.detail-popup-appointment')
  I.click('~Close', '.detail-popup-appointment')
  I.waitForDetached('.detail-popup-appointment')

  const appointmentColorBefore = await I.grabCssPropertyFrom('~Test Appointment', 'background-color')
  assert.equal(appointmentColorBefore, redColor)

  calendar.clickAppointment('Test Appointment')
  I.waitForElement('~Edit appointment')
  I.click('~Edit appointment', '.detail-popup')
  I.waitForElement('.color-picker-dropdown .picked-color')
  I.wait(0.2)
  I.scrollTo('.color-picker-dropdown')
  const color = await I.grabCssPropertyFrom('.color-picker-dropdown .picked-color', 'background-color')
  assert.equal(color, redColor)
  I.waitForClickable('.color-picker-dropdown')
  I.click('Appointment color', '.color-picker-dropdown')
  I.click('.color-picker-dropdown.open a[title="Green"]')
  I.click('Save', calendar.editWindow)
  I.waitForDetached(calendar.editWindow)
  I.click('~Close', '.detail-popup-appointment')
  I.waitForDetached('.detail-popup-appointment')

  const appointmentColorAfter = await I.grabCssPropertyFrom('~Test Appointment', 'background-color')
  assert.equal(appointmentColorAfter, greenColor)
})
