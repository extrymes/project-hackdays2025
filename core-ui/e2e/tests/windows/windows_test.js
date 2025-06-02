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

Feature('General > Floating windows')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

const { expect } = require('chai')

Scenario('Opening multiple windows', async ({ I, users, calendar, dialogs }) => {
  await I.haveSetting('io.ox/calendar//layout', 'week:workweek')
  I.login('app=io.ox/calendar')
  I.waitForApp()

  calendar.newAppointment()
  calendar.startNextMonday()
  I.retry(5).fillField('Title', 'Participants test')
  I.click('~Select contacts')
  dialogs.waitForVisible()
  I.waitForEnabled('.modal-content .search-field')
  I.fillField('.modal-content .search-field', users[1].get('primaryEmail'))
  I.waitForEnabled('.modal-content .list-item-content')
  I.click(users[1].get('sur_name'), '.modal-content .list-item-content')
  dialogs.clickButton('Select')
  I.waitForDetached('.modal-dialog')
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('Participants test', 5, '.page.current .appointment')
  I.click('Participants test', '.page.current .appointment')
  I.waitForText(users[1].get('sur_name'), 5, '.participants-view')
  I.click(users[1].get('sur_name'), '.participants-view')

  I.waitForVisible('[data-block="communication"]')
  I.click(users[1].get('primaryEmail'), '[data-block="communication"]')

  // wait until compose window is active
  I.waitForVisible('.io-ox-mail-compose-window.active')

  const composeIndex = await I.grabCssPropertyFromAll('.io-ox-mail-compose-window', 'zIndex')
  const sidePopupIndizes = await I.grabCssPropertyFromAll('.detail-popup', 'zIndex')
  sidePopupIndizes.map(s => Number.parseInt(s, 10)).forEach(function (sidePopupIndex) {
    expect(Number.parseInt(String(composeIndex), 10)).to.be.above(sidePopupIndex)
  })
})

Scenario('[OXUIB-987] Tabbing into header toolbar after changing window size', ({ I, mail }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.waitForElement('.io-ox-mail-compose-window.normal', 5)

  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])

  I.pressKey('ArrowRight')
  I.pressKey('Enter')
  I.seeElement('.io-ox-mail-compose-window.maximized')
  I.pressKey('ArrowRight')
  I.pressKey('Enter')
  I.waitForDetached('.io-ox-mail-compose-window', 5)
})
