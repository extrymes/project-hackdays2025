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

const actor = require('@open-xchange/codecept-helper').actor
const _ = require('underscore')

module.exports = actor({
  // remove previously created appointments by appointment title
  async removeAllAppointments (title) {
    const { skipRefresh } = await this.executeScript(async function (title) {
      const appointments = [...document.querySelectorAll('.appointment')]
        .map(function (el) {
          const folder = el.getAttribute('data-folder')
          return { folder, id: el.getAttribute('data-cid').replace(folder + '.', '') }
        })
      if (appointments.length === 0) return { skipRefresh: true }
      const { default: api } = await import(String(new URL('io.ox/calendar/api.js', location.href)))
      return await api.remove(appointments, {})
    }, title)
    if (skipRefresh === true) return
    this.click('#io-ox-refresh-icon')
    this.waitForDetached('#io-ox-refresh-icon .fa-spin')
  },

  createAppointment ({ subject, location, folder, startDate, startTime, endDate, endTime }) {
    // select calendar
    if (folder) {
      this.selectFolder(folder)
      this.waitForElement('li.selected[aria-label^="' + folder + '"] .color-label')
    }

    this.clickPrimary('New appointment')
    this.waitForVisible(locate('.io-ox-calendar-edit-window').as('Edit Dialog'))
    this.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

    this.retry(5).fillField('Title', subject)

    if (folder) {
      this.see(folder, '.io-ox-calendar-edit-window .folder-selection')
    }

    if (location) {
      this.fillField('Location', location)
    }

    if (startDate) {
      this.click('~Date (M/D/YYYY)')
      this.pressKey(['Control', 'a'])
      this.pressKey(startDate)
      this.pressKey('Enter')
    }

    if (startTime) {
      this.click('~Start time')
      this.click(startTime)
    }

    if (endDate) {
      this.click('~Date (M/D/YYYY)', '.dateinput[data-attribute="endDate"]')
      this.pressKey(['Control', 'a'])
      this.pressKey(startDate)
      this.pressKey('Enter')
    }

    if (endTime) {
      this.click('~End time')
      this.click(endTime)
    }

    // save
    this.click('Create', '.io-ox-calendar-edit-window')
    this.waitForDetached('.io-ox-calendar-edit-window', 5)
  },

  waitForNetworkTraffic () {
    this.waitForDetached('~Currently refreshing', 15)
  },

  // Use the next two helpers together. Example that checks for old toolbar to be removed/redrawn after folder change:

  // let listenerID = I.registerNodeRemovalListener('.classic-toolbar');
  // I.selectFolder('test address book');
  // I.waitForNodeRemoval(listenerID);

  // usually a save way to check for updates after some action is done (toolbar redraw, contact picture changes etc)
  registerNodeRemovalListener (selector) {
    const guid = _.uniqueId('e2eNodeRemovalListener')
    this.executeScript(async function (selector, guid) {
      const { default: $ } = await import(String(new URL('jquery.js', location.href)))
      const element = $(selector + ':visible').get(0)
      element.parentElement.addEventListener('DOMNodeRemoved', function (e) {
        if (e.target === element) window[guid] = true
      })
    }, selector, guid)
    return guid
  },

  // use guid from registerNodeRemovalListener
  waitForNodeRemoval (guid, time = 5) {
    this.waitForFunction(function (guid) { return window[guid] }, [guid], time)
    this.executeScript(function (guid) { delete window[guid] }, guid)
  },

  triggerRefresh () {
    this.retry(5).click('~Refresh')
    this.waitForDetached('~Currently refreshing')
    this.waitForVisible('~Refresh')
  },

  async grabBackgroundImageFrom (selector) {
    let backgroundImage = await this.grabCssPropertyFrom(selector, 'backgroundImage')
    backgroundImage = Array.isArray(backgroundImage) ? backgroundImage[0] : backgroundImage
    return backgroundImage || 'none'
  },

  clickDropdown (text) {
    this.waitForText(text, 10, '.dropdown.open .dropdown-menu, .primary-action > .open .dropdown-menu')
    this.retry(5).click(text, '.dropdown.open .dropdown-menu, .primary-action > .open .dropdown-menu')
  },

  clickFolderContext (folder, text) {
    this.rightClick(folder)
    this.waitForText(text, 10, '.dropdown.open .dropdown-menu')
    this.retry(5).click(text, '.dropdown.open .dropdown-menu')
  },

  clickPrimary (text) {
    const button = locate('.primary-action .btn-primary').withText(text).as(`Primary Button: ${text}`)
    this.waitForVisible(button, 5)
    this.click(button)
  },

  clickPrimaryDropdown (text) {
    const button = locate('.primary-action .btn-group').withText(text).as(`Primary Dropdown Button: ${text}`)
    this.waitForVisible(button, 5)
    this.click(locate('.dropdown-toggle').inside(button).as('Dropdown Toggle'))
  },

  openFolderMenu (folderName) {
    const item = `.folder-tree [title*="${folderName}"]`
    this.waitForVisible(item)
    this.rightClick(item)
  },

  saveSettings (moduleId) {
    this.executeAsyncScript(async (moduleId, done) => {
      const { settings } = await import(String(new URL(`${moduleId}.js`, location.href)))
      await settings.save(null, { force: true })
      done()
    }, moduleId)
  },

  changeTheme ({ theme }) {
    // "White" "Blue" "Steel gray" "Dark" "Mountains" "Beach" "City" "Blue Sunset"
    this.click('[aria-label="Settings"]')
    this.waitForVisible('#topbar-settings-dropdown', 5)
    this.click(`div[aria-label="Themes"] a[title="${theme}"]`)
    this.click('.abs')
  }
})
