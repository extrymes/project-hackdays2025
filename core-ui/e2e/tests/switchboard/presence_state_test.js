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

Feature('Switchboard > Presence')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  await users[0].context.hasCapability('switchboard')
})

After(async ({ users }) => { await users.removeAll() })

const presenceStates = [
  { status: 'Absent', value: 'absent', class: 'absent' },
  { status: 'Busy', value: 'busy', class: 'busy' },
  { status: 'Invisible', value: 'invisible', class: 'offline' }
]

Scenario('Presence state is not shown in mails if no switchboard capability', async ({ I, users, mail }) => {
  await Promise.all([
    users[0].doesntHaveCapability('switchboard'),
    I.haveSetting({
      'io.ox/core': { features: { presence: true } },
      'io.ox/mail': { listViewLayout: 'avatars' }
    }),
    I.haveMail({
      from: users[0],
      sendtype: 0,
      subject: 'Switchboard presence state check',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Switchboard presence state check')
  I.dontSeeElement('.presence')
})

Scenario('No call history if no switchboard capability', async ({ I, users }) => {
  await Promise.all([
    users[0].doesntHaveCapability('switchboard'),
    I.haveSetting({
      'io.ox/switchboard': { zoom: { enabled: true } },
      'io.ox/core': { features: { presence: true } }
    })
  ])

  I.login('app=io.ox/mail')
  I.executeScript((mail, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(({ default: ch }) => {
      ch.add({ email: mail, incoming: true, missed: false, name, type: 'zoom' })
    })
  }, users[0].get('primaryEmail'), users[0].get('display_name'))
  I.dontSee('~Call history')
})

Scenario('Presence state is not shown for contacts if no switchboard capability', async ({ I, users }) => {
  await Promise.all([
    users[0].doesntHaveCapability('switchboard'),
    I.haveSetting('io.ox/core//features/presence', true),
    I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"]`)
  I.dontSeeElement('.presence')
})

Scenario('Presence state is not shown in mails if switchboard host is missing', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    users[0].hasConfig('io.ox/switchboard//host', ''),
    I.haveMail({
      from: users[1],
      sendtype: 0,
      subject: 'Switchboard presence state check',
      to: users[0]
    }, { user: users[1] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Switchboard presence state check')
  I.dontSeeElement('.presence')
})

Scenario('No call history if switchboard host is missing', async ({ I, users }) => {
  await Promise.all([
    users[1].hasConfig('io.ox/switchboard//host', ''),
    users[1].hasConfig('io.ox/core//features/presence', true)
  ])

  I.login('app=io.ox/mail', { user: users[1] })
  I.executeScript((mail, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add({ email: mail, incoming: true, missed: false, name, type: 'zoom' })
    })
  }, users[0].get('primaryEmail'), users[0].get('display_name'))
  I.dontSee('~Call history')
})

Scenario('Presence state is not shown for contacts if switchboard host is missing', async ({ I, users }) => {
  await Promise.all([
    users[1].hasConfig('io.ox/switchboard//host', ''),
    users[1].hasConfig('io.ox/core//features/presence', true)
  ])

  I.login('app=io.ox/contacts', { user: users[1] })
  I.waitForElement('.io-ox-contacts-window')
  I.waitForVisible('.io-ox-contacts-window .classic-toolbar')
  I.waitForVisible('.io-ox-contacts-window .tree-container')
  I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"]`)
  I.dontSeeElement('.presence')
})

Scenario('Presence state is not shown in mails if feature is disabled', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/core': { features: { presence: false } },
      'io.ox/mail': { listViewLayout: 'avatars' }
    }),
    I.haveMail({
      from: users[0],
      sendtype: 0,
      subject: 'Switchboard presence state check',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Switchboard presence state check')
  I.dontSeeElement('.presence')
})

Scenario('No call history if feature presence is disabled', async ({ I, users }) => {
  await I.haveSetting({
    'io.ox/switchboard': { zoom: { enabled: true } },
    'io.ox/core': { features: { presence: false } }
  })

  I.login('app=io.ox/mail')
  I.executeScript((mail, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add({ email: mail, incoming: true, missed: false, name, type: 'zoom' })
    })
  }, users[0].get('primaryEmail'), users[0].get('display_name'))
  I.dontSee('~Call history')
})

Scenario('Presence state is not shown for contacts if feature is disabled', async ({ I, users }) => {
  await I.haveSetting('io.ox/core//features/presence', false)
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"]`)
  I.dontSeeElement('.presence')
})

Scenario('Presence state is shown and can be changed', async ({ I }) => {
  await I.haveSetting('io.ox/core//features/presence', true)

  const checkStatus = (statusToClick, valueToCheck, classToCheck) => {
    I.say(`Check: ${statusToClick}`)
    I.clickDropdown(statusToClick)
    I.waitForDetached('.dropdown.open')
    // Check if state is updated in the topbar
    I.waitForVisible(`.taskbar .presence.${classToCheck}`)
    I.click('~My account')
    // Verify that the right status is marked as checked
    I.waitForVisible(`.dropdown.open a[data-value="${valueToCheck}"] svg`)
  }

  I.login()

  // Check default online state
  I.waitForVisible('.presence.online', 20)
  I.click('~My account')
  I.waitForVisible('.dropdown.open a[data-value="online"] svg')

  presenceStates.forEach((state) => {
    checkStatus(state.status, state.value, state.class)
  })
})

Scenario('Presence state is shown in mails', async ({ I, users, mail }) => {
  const checkStatus = (statusToClick, classToCheck) => {
    I.say(`Check: ${statusToClick}`)
    I.click('~My account')
    I.clickDropdown(statusToClick)
    I.waitForDetached('.dropdown.open')
    I.waitForVisible(`.mail-detail .presence.${classToCheck}`)
    if (statusToClick === 'Invisible') {
      I.waitForElement(`.list-view-control .presence.${classToCheck}`)
      I.dontSeeElement(`.list-view-control .presence.${classToCheck}`)
    } else I.waitForVisible(`.list-view-control .presence.${classToCheck}`)
  }

  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    I.haveMail({
      from: users[0],
      sendtype: 0,
      subject: 'Switchboard presence state check',
      to: users[0]
    }),
    I.haveSetting('io.ox/mail//listViewLayout', 'avatars')
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // Check presence in list view
  I.waitForVisible('.list-view-control .presence.online')
  mail.selectMail('Switchboard presence state check')
  // Check presence in mail detail
  I.waitForVisible('.mail-detail .presence.online')

  presenceStates.forEach(state => {
    checkStatus(state.status, state.class)
  })
})

Scenario('Presence state is shown in call history', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/presence', true),
    I.haveSetting('io.ox/switchboard//zoom/enabled', true)
  ])

  I.login('app=io.ox/mail')
  I.executeScript((mail, name) => {
    import(String(new URL('io.ox/switchboard/views/call-history.js', location.href))).then(function ({ default: ch }) {
      ch.add({ email: mail, incoming: true, missed: false, name, type: 'zoom' })
    })
  }, users[0].get('primaryEmail'), users[0].get('display_name'))
  I.waitForVisible('~Call history')
  I.click('~Call history')
  I.waitForVisible('.call-history .dropdown-menu .presence.online')
})

Scenario('Check presence state of new user', async ({ I, users }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/contacts': { startInGlobalAddressbook: true },
      'io.ox/core': { 'features/presence': true }
    }),
    I.haveSetting({
      'io.ox/contacts': { startInGlobalAddressbook: true },
      'io.ox/core': { 'features/presence': true }
    }, { user: users[1] })
  ])

  session('userA', () => {
    I.login('app=io.ox/contacts')
    I.waitForApp()
    I.waitForElement(`.vgrid [aria-label="${users[1].get('sur_name')}, ${users[1].get('given_name')}"]`)
  })

  session('userB', async () => {
    I.login('app=io.ox/contacts', { user: users[1] })
    I.waitForApp()
    I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .presence.online`)
    I.click('~My account')
    I.clickDropdown('Busy')
    I.waitForVisible(`.vgrid [aria-label="${users[1].get('sur_name')}, ${users[1].get('given_name')}"] .presence.busy`)
  })

  session('userA', () => {
    // this step fails, since userB presence is not updated currently
    I.waitForVisible(`.vgrid [aria-label="${users[1].get('sur_name')}, ${users[1].get('given_name')}"] .presence.busy`)
    I.click('~My account')
    I.clickDropdown('Absent')
    I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .presence.absent`)
  })

  session('userB', () => {
    I.waitForVisible(`.vgrid [aria-label="${users[0].get('sur_name')}, ${users[0].get('given_name')}"] .presence.absent`)
  })
})

Scenario('[OXUIB-497] Presence icon is visible after updating contact picture', async ({ I, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)

  I.login()

  // verify presence icon is there
  I.waitForVisible('.dropdown-toggle[aria-label="My account"] .presence .icon')
  I.waitForVisible('.contact-picture')
  I.click('.contact-picture')

  // I.waitForVisible('.dropdown.open');
  I.waitForVisible('.dropdown.open .action[data-name="user-picture"]')
  I.click('.action[data-name="user-picture"]')

  // Change user photo
  dialogs.waitForVisible()
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600.png')
  I.waitForInvisible('.edit-picture.empty')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  // verify presence icon is still there
  I.waitForVisible('.dropdown-toggle[aria-label="My account"] .presence .icon')
})
