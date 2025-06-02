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

Feature('Switchboard > Calls')

Before(async ({ users }) => {
  await Promise.all([users.create(), users.create()])
  await users[0].context.hasCapability('switchboard')
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create call and check call history from addressbook', async ({ I, users, contacts, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  const [userA, userB] = users

  session('userB', async () => {
    await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
    I.login({ user: userB })
  })

  session('userA', async () => {
    await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
    I.login('app=io.ox/contacts')
    I.waitForElement('.io-ox-contacts-window')
    I.waitForVisible('.io-ox-contacts-window .classic-toolbar')
    I.waitForVisible('.io-ox-contacts-window .tree-container')
    contacts.selectContact(`${userB.get('sur_name')}, ${userB.get('given_name')}`)

    I.waitForText('Call', 5, '.horizontal-action-buttons')
    I.waitForEnabled(locate('.horizontal-action-buttons .btn-circular').withText('Call'))
    I.click('Call')
    I.waitForText('Call via Zoom', 5, '.dropdown.open')
    I.waitForEnabled('.dropdown.open .dropdown-menu a')
    I.click('Call via Zoom')
    dialogs.waitForVisible()
    I.waitForText('You first need to connect OX App Suite with Zoom.', 5, dialogs.body)
    I.click('Connect with Zoom', dialogs.footer)
    I.waitForText('Call', 5, dialogs.footer)
    dialogs.clickButton('Call')
    I.waitForText('Hang up', 5, dialogs.footer)
  })

  session('userB', () => {
    dialogs.waitForVisible()
    I.waitForText('Incoming call')
    dialogs.clickButton('Answer')
    I.waitForDetached('.modal-dialog')
    I.switchToNextTab()
    I.closeCurrentTab()

    I.waitForVisible('~Call history')
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `Answered call from ${userA.get('sur_name')}, ${userA.get('given_name')}` })
    )
    I.seeNumberOfElements('.dropdown.open .call-history-item', 1)
  })

  session('userA', () => {
    I.switchToNextTab()
    I.closeCurrentTab()
    I.waitForVisible('~Call history')
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `You called ${userB.get('sur_name')}, ${userB.get('given_name')}` })
    )
    I.seeNumberOfElements('.dropdown.open .call-history-item', 1)
    I.click('.call-history-item a')
    dialogs.waitForVisible()

    dialogs.clickButton('Call')
    I.waitForText('Hang up', 5, dialogs.footer)
  })

  session('userB', () => {
    // second call sometimes does not go through
    dialogs.waitForVisible()
    dialogs.clickButton('Decline')
    I.waitForDetached('.modal-dialog')
  })

  session('userA', () => {
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `You called ${userB.get('sur_name')}, ${userB.get('given_name')}` })
    )
    I.seeNumberOfElements('.dropdown.open .call-history-item', 2)
  })
})

Scenario('Create call from call history and check call history after hang up', async ({ I, users, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  const [userA, userB] = users

  session('userB', () => {
    I.login({ user: userB })
  })

  session('userA', () => {
    I.login()
    I.executeScript((mail, name) => {
      import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
        ch.add({ email: mail, incoming: true, missed: false, name, type: 'zoom' })
      })
    }, userB.get('primaryEmail'), userB.get('display_name'))
    I.waitForVisible('~Call history')
    I.click('~Call history')
    I.waitForVisible('.dropdown.open .call-history-item')
    I.click('.dropdown.open .call-history-item a')
    dialogs.waitForVisible()
    I.waitForText('You first need to connect OX App Suite with Zoom.', 5, dialogs.body)
    I.click('Connect with Zoom', dialogs.footer)
    I.waitForText('Call', 5, dialogs.footer)
    dialogs.clickButton('Call')
    I.waitForText('Hang up', 5, dialogs.footer)
  })

  session('userB', () => {
    dialogs.waitForVisible()
  })

  session('userA', () => {
    dialogs.clickButton('Hang up')
    I.waitForDetached('.modal')
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `You called ${userB.get('sur_name')}, ${userB.get('given_name')}` })
    )
  })

  session('userB', () => {
    I.click('~Call history')
    I.waitForVisible(
      locate('.call-history-item')
        .inside('.dropdown.open')
        .withAttr({ title: `Missed call from ${userA.get('sur_name')}, ${userA.get('given_name')}` })
    )
  })
})

Scenario('Check call history filtering', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  const [, userB] = users

  I.login()
  I.executeScript((email, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add([
        { email, incoming: true, missed: false, name, type: 'zoom' },
        { email, incoming: true, missed: true, name, type: 'zoom' },
        { email, incoming: true, missed: false, name, type: 'zoom' },
        { email, incoming: true, missed: true, name, type: 'zoom' }
      ])
    })
  }, userB.get('primaryEmail'), userB.get('displayName'))

  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitNumberOfVisibleElements('.call-history-item', 4)
  I.clickDropdown('Missed')
  I.waitNumberOfVisibleElements('.call-history-item.missed', 2)
  I.waitForInvisible('.call-history-item:not(.missed)')
  I.waitNumberOfVisibleElements('.call-history-item', 2)
})

Scenario('Call history is not visible when empty', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  const [, userB] = users

  I.login()
  I.waitForVisible('.taskbar')
  I.dontSeeElement('~Call history')

  I.executeScript((email, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add({ email, incoming: true, missed: true, name, type: 'zoom' })
    })
  }, userB.get('primaryEmail'), userB.get('display_name'))

  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitForVisible('.dropdown.open .call-history-item')
})

Scenario('Call history closes on second click', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true, { user: users[0] }),
    I.haveSetting('io.ox/core//features/presence', true, { user: users[1] })
  ])
  const [, userB] = users

  I.login()
  I.executeScript((email, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add(
        [
          { email, incoming: true, missed: false, name, type: 'zoom' },
          { email, incoming: true, missed: true, name, type: 'zoom' },
          { email, incoming: true, missed: false, name, type: 'zoom' },
          { email, incoming: true, missed: true, name, type: 'zoom' }
        ]
      )
    })
  }, userB.get('primaryEmail'), userB.get('display_name'))

  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.seeNumberOfVisibleElements('.call-history-item', 4)
  I.click('~Call history')
  I.waitForDetached('.dropdown.open')
  I.dontSee('Call History', '.dropdown.call-history')

  I.slowClick('~Call history')
  I.clickDropdown('Missed')
  I.waitForInvisible('.call-history-item:not(.missed)')
  I.slowClick('~Call history')
  I.waitForDetached('.dropdown.open')
  I.dontSee('Call History', '.dropdown.call-history')
})
