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

Feature('General > User feedback')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C125002] Enable user feedback dialog', ({ I, mail, dialogs }) => {
  I.login()
  I.waitForApp()
  I.waitForElement('~Help')
  I.click('~Help')
  I.clickDropdown('Give feedback')
  dialogs.waitForVisible()
  I.see('Please rate the following application')
})

Scenario('[C125004] App aware user feedback', ({ I, mail, drive, contacts, calendar, tasks, dialogs }) => {
  // Check if 'appType' is the value selected by default
  function testFeedback (appType = 'general') {
    I.waitForElement('~Help')
    I.click('~Help')
    I.clickDropdown('Give feedback')
    dialogs.waitForVisible()
    I.waitForText('Please rate the following application', 5, dialogs.body)
    I.waitForValue('.feedback-select-box', appType)
    dialogs.clickButton('Cancel')
    I.waitForDetached('.modal-dialog')
  }

  I.login('app=io.ox/mail')
  I.waitForApp()
  testFeedback('io.ox/mail')

  I.openApp('Drive')
  I.waitForApp()
  testFeedback('io.ox/files')

  I.openApp('Address Book')
  I.waitForApp()
  testFeedback('io.ox/contacts')

  I.openApp('Calendar')
  I.waitForApp()
  testFeedback('io.ox/calendar')

  I.openApp('Portal')
  I.waitForApp()
  testFeedback()

  I.openApp('Tasks')
  I.waitForApp()
  testFeedback()
})

Scenario('[C125005] Provide user feedback', ({ I, mail, dialogs }) => {
  const appArr = ['Mail', 'General', 'Calendar', 'Address Book', 'Drive']
  const giveFeedback = (app) => {
    I.click('~Help')
    I.clickDropdown('Give feedback')
    dialogs.waitForVisible()
    I.waitForText('Please rate the following application:', 5, dialogs.body)
    I.see(app) // check if app is in options dropdown
    I.selectOption('.feedback-select-box', app)
    I.click(locate('.star-rating label').at(getRandom()))
    I.fillField('.feedback-note', 'It is awesome')
    dialogs.clickButton('Send')
    I.waitForText('Thank you for your feedback')
    I.waitForDetached('.modal-dialog')
  }
  const getRandom = () => {
    return Math.floor(Math.random() * (5)) + 1
  }

  I.login()
  I.waitForApp()
  I.waitForElement('~Help')
  // Open Feedback dialog and rate each app in turn
  appArr.forEach(giveFeedback)

  // Open Feedback dialog and try to send feedback without rating
  I.click('~Help')
  I.clickDropdown('Give feedback')
  dialogs.waitForVisible()
  dialogs.clickButton('Send')
  I.waitForText('Please select a rating.')
})
