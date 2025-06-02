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
const jitsiMockJoinLink = 'customer-1.ox.jitsi/asdc-vvfg-04456670-ju?pw=xcSD4th78jQSgh!e677' // cSpell:disable-line

Feature('Switchboard > Jitsi')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  await Promise.all([
    users[0].context.hasCapability('switchboard'),
    users[0].hasConfig('io.ox/jitsi//enabled', true),
    users[0].hasConfig('io.ox/zoom//enabled', false)
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-442] Calling contact via jitsi', async ({ I, users, contacts, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  let meetingURL

  await session('userB', async () => {
    await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
    I.login('app=io.ox/contacts', { user: users[1] })
  })

  await session('userA', async () => {
    await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
    I.login('app=io.ox/contacts')
    I.waitForElement('.io-ox-contacts-window')
    I.waitForVisible('.io-ox-contacts-window .classic-toolbar')
    I.waitForVisible('.io-ox-contacts-window .tree-container')
    contacts.selectContact(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`)
    I.waitForText('Call', 5, '.horizontal-action-buttons')
    I.waitForEnabled(locate('.horizontal-action-buttons button').withText('Call'))
    I.click('Call')
    I.waitForText('Call via Jitsi', 5, '.dropdown.open')
    I.waitForEnabled('.dropdown.open .dropdown-menu a')
    I.click('Call via Jitsi')
    dialogs.waitForVisible()
    I.waitForText(jitsiMockJoinLink, 5, '.conference-view.jitsi')
    dialogs.clickButton('Call')
    I.waitForText('Hang up', 5, dialogs.footer)
    I.wait(0.3)
    I.switchToNextTab()
    meetingURL = await I.grabCurrentUrl()
  })

  await session('userB', async () => {
    dialogs.waitForVisible()
    I.waitForText('Incoming call')
    dialogs.clickButton('Answer')
    I.wait(0.3)
    I.switchToNextTab()
    const url = await I.grabCurrentUrl()
    expect(meetingURL).to.be.equal(url)
  })
})

Scenario('[J2] Create call from call history and check call history after hang up for jitsi', async ({ I, users, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  await session('userB', () => {
    I.login({ user: users[1] })
  })

  await session('userA', () => {
    I.login({ user: users[0] })
    I.executeScript((mail, name) => {
      import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
        ch.add({ email: mail, incoming: true, missed: false, name, type: 'jitsi' })
      })
    }, users[1].get('primaryEmail'), users[1].get('display_name'))
    I.waitForVisible('~Call history')
    I.click('~Call history')
    I.waitForVisible('.dropdown.open .call-history-item')
    I.click('.dropdown.open .call-history-item a')
    dialogs.waitForVisible()
    I.waitForText('Call', 5, dialogs.footer)
    dialogs.clickButton('Call')
    I.waitForText('Hang up', 5, dialogs.footer)
  })

  await session('userB', () => {
    dialogs.waitForVisible()
    I.waitForText('Incoming call')
    I.waitForText('Answer')
  })

  await session('userA', () => {
    I.wait(0.3)
    I.switchToNextTab()
    I.closeCurrentTab()
    I.wait(0.2)
    I.waitForText('Hang up')
    dialogs.clickButton('Hang up')
    I.waitForDetached('.modal')
    I.waitForVisible('~Call history')
    I.waitForEnabled('~Call history')
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `You called ${users[1].get('sur_name')}, ${users[1].get('given_name')}` })
    )
  })

  await session('userB', () => {
    I.waitForVisible('~Call history')
    I.waitForEnabled('~Call history')
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `Missed call from ${users[0].get('sur_name')}, ${users[0].get('given_name')}` })
    )
  })
})

Scenario('Create appointment with Jitsi conference', async ({ I, users, calendar }) => {
  let meetingURL
  await session('userA', async () => {
    I.login('app=io.ox/calendar', { user: users[0] })
    calendar.newAppointment()
    calendar.startNextMonday()
    I.fillField('Title', 'Appointment with Jitsi conference')
    I.selectOption('conference-type', 'Jitsi Conference')
    I.waitForVisible('.conference-view > .conference-logo')
    I.waitForText(jitsiMockJoinLink, 5, '.conference-view')
    await calendar.addParticipant(users[1].get('name'))
    I.click('Create')
  })

  await session('userB', async () => {
    I.login('app=io.ox/calendar', { user: users[1] })
    I.waitForApp()
    calendar.moveCalendarViewToNextWeek()
    I.scrollTo('.page.current .appointment')
    I.waitForVisible('.page.current .appointment')
    I.click('.page.current .appointment')
    I.waitForVisible('.detail-popup')
    I.waitForVisible('.detail-popup button[data-action="join"]')
    I.waitForEnabled('.detail-popup button[data-action="join"]')
    I.retry(3).click('.detail-popup button[data-action="join"]')
    I.wait(0.3)
    I.switchToNextTab()
    meetingURL = await I.grabCurrentUrl()
  })

  await session('userA', async () => {
    calendar.moveCalendarViewToNextWeek()
    I.scrollTo('.page.current .appointment')
    I.waitForVisible('.page.current .appointment')
    I.click('.page.current .appointment')
    I.waitForVisible('.detail-popup')
    I.waitForVisible('.detail-popup button[data-action="join"]')
    I.waitForEnabled('.detail-popup button[data-action="join"]')
    I.retry(3).click('.detail-popup button[data-action="join"]')
    I.wait(0.3)
    I.switchToNextTab()
    const url = await I.grabCurrentUrl()
    expect(meetingURL).to.be.equal(url)
  })
})
