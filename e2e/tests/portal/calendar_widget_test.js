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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// if the month changes between today and tomorrow
async function goToDate (I, date, direction = 'next') {
  const day = await I.executeScript(async function (date, direction) {
    const { moment } = await import(String(new URL('e2e.js', location.href)))
    const monthName = moment(date).format('MMMM')

    let currMonth = document.querySelector('.switch-mode').textContent.split(' ')[0]
    let retry = 5
    while (monthName !== currMonth && retry >= 0) {
      if (direction === 'next') document.querySelector('.btn-next').click()
      else document.querySelector('.btn-prev').click()
      currMonth = document.querySelector('.switch-mode').textContent.split(' ')[0]
      retry--
    }

    return moment(date).format('M/D/YYYY')
  }, date, direction)
  I.click({ css: `td[aria-label*="${day}"]` })
}

Scenario('Create new appointment and check display in portal widget', async ({ I, calendar, dialogs }) => {
  // use next monday to avoid problems when tests run over the weekend
  const day = moment().startOf('week').add('8', 'day').add('8', 'hour')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.selectFolder('Calendar')
  calendar.switchView('List')
  I.dontSeeElement('.appointment')

  // make sure portal widget is empty
  I.openApp('Portal')
  I.waitForApp()
  I.waitForText('You don\'t have any appointments in the near future.', 10, '[data-widget-id="calendar_0"] li.line')

  I.openApp('Calendar')
  I.waitForApp()
  calendar.switchView('List')

  // create in List view
  I.selectFolder('Calendar')
  I.waitForApp()
  calendar.switchView('List')
  calendar.newAppointment()

  I.retry(5).fillField('Title', 'test portal widget')
  I.fillField('Location', 'portal widget location')
  I.fillField('.time-field', '2:00 PM')
  await calendar.setDate('startDate', day)

  // save
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // check in week view
  calendar.switchView('Week')
  await goToDate(I, day)
  I.waitForVisible('.weekview-container.week .appointment .title')
  I.see('test portal widget', '.weekview-container.week .appointment .title')
  I.seeNumberOfElements('.weekview-container.week .appointment .title', 1)

  // check in portal
  I.openApp('Portal')
  I.waitForApp()
  I.waitForVisible('.io-ox-portal [data-widget-id="calendar_0"] li.item div')
  I.see('test portal widget', '[data-widget-id="calendar_0"] li.item div')

  // create a second appointment
  I.openApp('Calendar')
  I.waitForApp()
  calendar.switchView('List')

  // create in List view
  I.selectFolder('Calendar')
  calendar.switchView('List')
  calendar.newAppointment()

  I.retry(5).fillField('Title', 'second test portal widget ')
  I.fillField('Location', 'second portal widget location')
  I.fillField('.time-field', '2:00 PM')
  await calendar.setDate('startDate', day)

  // save
  I.click('Create', calendar.editWindow)
  dialogs.waitForVisible()
  dialogs.clickButton('Ignore conflicts')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // check in week view
  calendar.switchView('Week')
  await goToDate(I, moment(), 'prev')
  I.waitForVisible('.weekview-container.week button.weekday.today')
  I.seeNumberOfElements('.weekview-container.week .appointment .title', 0)
  await goToDate(I, day)
  I.seeNumberOfElements('.weekview-container.week .appointment .title', 2)
})
