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
const moment = require('moment')

Feature('Accessibility > Switchboard')

Before(async function ({ users }) {
  await users.create()
  await users[0].context.hasCapability('switchboard')
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Switchboard - Call history', async ({ I }) => {
  await I.haveSetting('io.ox/core//features/presence', true)

  const primaryEmail = 'someone@schmalzgollum.com'
  const displayName = 'someone'

  I.login('app=io.ox/mail')
  I.waitForText('This folder is empty', 5, '.list-view')
  await I.executeScript((mail, name) => import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
    ch.add(
      [
        { email: mail, incoming: true, missed: false, name, type: 'zoom' },
        { email: mail, incoming: true, missed: true, name, type: 'zoom' },
        { email: mail, incoming: true, missed: false, name, type: 'zoom' },
        { email: mail, incoming: true, missed: true, name, type: 'zoom' }
      ]
    )
  }), primaryEmail, displayName)
  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitForVisible('.dropdown.open')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Switchboard - Presence', async ({ I }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login()
  I.waitForText('Loading')
  I.waitToHide('Loading')
  I.waitForVisible('~My account')
  I.click('~My account')
  I.waitForVisible('.dropdown.open')

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Switchboard - Call dialog', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)

  const primaryEmail = 'someone@schmalzgollum.com'
  const displayName = 'someone'

  I.login('app=io.ox/mail')
  I.waitForText('This folder is empty', 5, '.list-view')
  await I.executeScript((mail, name) => import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
    ch.add({ email: mail, incoming: true, missed: true, name, type: 'zoom' })
  }), primaryEmail, displayName)

  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitForVisible('.dropdown.open')
  I.click('.call-history-item', '.dropdown.open')
  dialogs.waitForVisible()

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Switchboard - Addressbook', async ({ I, users, contacts }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login('app=io.ox/contacts')
  I.waitForApp()

  contacts.selectContact(`${users[0].get('sur_name')}, ${users[0].get('given_name')}`)
  I.waitForElement(locate('.btn-circular').withText('Call'))

  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Switchboard - Calendar', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/presence', true)

  const time = moment().startOf('day').add(10, 'hours')

  await I.haveAppointment({
    summary: 'test invite accept/decline/accept tentative',
    startDate: { value: time },
    endDate: { value: time.add(1, 'hour') },
    flags: ['conferences', 'organizer', 'accepted'],
    conferences: [{
      id: 456,
      uri: 'https://localhost',
      label: 'Zoom Meeting',
      features: ['AUDIO', 'VIDEO'],
      extendedParameters: {
        'X-OX-TYPE': 'zoom',
        'X-OX-ID': '65498713',
        'X-OX-OWNER': 'test.user@schmalzgollum.com'
      }
    }]
  })

  await I.haveSetting('io.ox/calendar//layout', 'month')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('.appointment')
  I.click('.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForElement(locate('.btn-default').withText('Join Zoom meeting'))
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Switchboard - Call history keyboard navigation', async ({ I, mail, settings }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    I.haveSetting('io.ox/switchboard//callHistory/entries', [
      { email: 'somecall@oxoe.io', incoming: true, missed: false, name: 'somecall', type: 'zoom' },
      { email: 'missedcall@oxoe.io', incoming: true, missed: true, name: 'missedcall', type: 'zoom' }
    ])
  ])
  I.login()
  I.waitForApp()

  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitForVisible('.dropdown.open.call-history')
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Space')
  I.waitForInvisible(locate('.call-history-item').withText('somecall'))
  I.pressKey(['Shift', 'Tab'])
  I.pressKey('Space')
  I.waitForVisible(locate('.call-history-item').withText('somecall'))
  I.pressKey(['Shift', 'Tab'])
  I.waitForInvisible(locate('.call-history-item').withText('missedcall'))
})
