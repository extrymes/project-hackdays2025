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

const { I } = inject()

module.exports = {

  // attr: [startDate, endDate]
  async setDate (attr, value) {
    const date = value.format('YYYY-MM-DDTHH:mm')
    await I.executeScript(async (attr, date) => {
      const fieldset = document.querySelector(`fieldset[data-attribute="${attr}"]`)
      const input = fieldset.querySelector('input')
      input.value = date
      input.dispatchEvent(new Event('input'))
    }, attr, date)
  },
  newAppointment () {
    I.wait(0.5) // prevent clicking a detached element caused by the bottom toolbar being re-rendered multiple times
    I.click('~Create appointment', '.io-ox-calendar-window .mobile-toolbar')
    I.waitForVisible('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
    I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  }
}
