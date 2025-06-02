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

const { I, contactpicker, autocomplete, dialogs } = inject()
const moment = require('moment')

module.exports = {

  editWindow: '.io-ox-calendar-edit-window',
  miniCalendar: '.window-sidepanel .date-picker',

  newAppointment () {
    I.wait(1)
    I.clickPrimary('New appointment')
    I.waitForVisible(this.editWindow)
    I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  },

  clickAppointment (title, position = 1) {
    const appointment = locate('.page.current .appointment').withText(title).at(position).as('Appointment')
    I.waitForElement(appointment)
    I.scrollTo(appointment)
    I.click(appointment)
  },

  getNextMonday () {
    // isoWeekday is Monday=1 ... Sunday=7
    // 8 means next Monday; also over the weekend before
    return moment().isoWeekday(8).set('hour', 8)
  },

  startNextMonday () {
    // use next monday to avoid problems when tests run over the weekend
    const date = this.getNextMonday()
    I.fillField('Starts on', date.format('L'))
    I.clearField('~Start time')
    I.fillField('~Start time', '8:00')
    return date
  },

  moveCalendarViewToNextWeek () {
    I.click('Today')
    I.waitForElement('~Next week')
    I.click('~Next week')
    // look for proper aria-label
    I.waitForElement('~' + this.getNextMonday().format('ddd D') + ', create all-day appointment')
  },

  openScheduling () {
    I.waitForElement(locate('button').withText('New appointment').as('New appointment'))
    I.click('.primary-action button[aria-label="More actions"]')
    I.waitForElement('.primary-action .dropdown-menu')
    I.click('Scheduling', '.primary-action .dropdown-menu')
  },

  recurAppointment (date) {
    I.checkOption('Repeat')
    if (date) I.see(`Every ${date.format('dddd')}.`)
    I.click('.recurrence-view button.summary')
    I.waitForElement('.recurrence-view-dialog', 5)
  },

  deleteAppointment () {
    I.waitForElement('~Delete')
    I.click('~Delete', '.detail-popup')
    dialogs.waitForVisible()
    dialogs.clickButton('Delete')
    I.waitForDetached('.modal-dialog')
  },

  // attr: [startDate, endDate, until]
  setDate (attr, value) {
    I.click('~Date (M/D/YYYY)', locate(`[data-attribute="${attr}"]`).as('Date input'))
    I.waitForElement('.date-picker.open')
    I.click(`.dateinput[data-attribute="${attr}"] .datepicker-day-field`)
    I.fillField(`.dateinput[data-attribute="${attr}"] .datepicker-day-field`, value.format('L'))
    I.pressKey('Enter')
    I.waitForDetached('.date-picker.open')
  },

  async getDate (attr) {
    return I.executeScript(function (attr) {
      // fillfield works only for puppeteer, pressKey(11/10....) only for webdriver
      // @ts-ignore
      return document.querySelector(`.dateinput[data-attribute="${attr}"] .datepicker-day-field`).value
    }, attr)
  },

  async getTime (attr) {
    return I.executeScript(function (attr) {
      // fillfield works only for puppeteer, pressKey(11/10....) only for webdriver
      // @ts-ignore
      return document.querySelector(`.dateinput[data-attribute="${attr}"] .time-field`).value
    }, attr)
  },

  async addParticipant (name, exists, context, addedParticipants) {
    if (!context) context = '*'
    if (!addedParticipants) addedParticipants = 1

    // does suggestion exists (for contact, user, ...)
    exists = typeof exists === 'boolean' ? exists : true
    const number = await I.grabNumberOfVisibleElements(locate('.attendee').inside(context).as('Attendee')) + addedParticipants
    const addParticipantsLocator = locate('.add-participant.tt-input').inside(context).as('Add participant field')
    // input field
    I.waitForVisible(addParticipantsLocator)
    I.waitForEnabled(addParticipantsLocator)
    I.fillField(addParticipantsLocator, name)
    I.seeInField(addParticipantsLocator, name)
    // tokenfield/typeahead
    if (exists) {
      autocomplete.select(name, context.replace('.', ''))
    } else {
      I.pressKey('Enter')
    }

    I.waitForInvisible(autocomplete.suggestions)
    // note: might be more than one that get's added (group)
    I.waitForElement(locate('.attendee').inside(context).at(number).as(`Attendee ${number}`))
  },

  addParticipantByPicker (name) {
    I.click('~Select contacts')
    contactpicker.add(name)
    contactpicker.close()
    I.waitForText(name, 5, '.attendee-container')
  },

  switchView (view) {
    I.waitForElement('.page.current .calendar-header > .dropdown button')
    I.click('.page.current .calendar-header > .dropdown button')
    I.waitForText(view, 5, '.open .dropdown-menu')
    I.click(locate('.dropdown.open a').withText(view).as('Switch to ' + view))
  },

  getFullname (user) {
    return `${user.get('sur_name')}, ${user.get('given_name')}`
  }
}
