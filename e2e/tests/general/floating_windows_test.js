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

Feature('General > Floating windows')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C237267] Check if specific apps open as floating windows @contentReview', ({ I, tasks }) => {
  I.login(['app=io.ox/tasks'])
  I.waitForVisible('.io-ox-tasks-window', 30)

  tasks.newTask()
  I.waitForVisible('.floating-window')

  within('.floating-window', async () => {
    I.click('[data-action=close]')
  })
})

Scenario('[C237268] Open floating apps and verify the taskbar', async ({ I, mail, tasks }) => {
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login(['app=io.ox/mail'])
  I.waitForApp()

  mail.newMail()
  I.dontSeeElement('#io-ox-taskbar-container')
  I.openApp('Address Book')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.seeElement('.io-ox-mail-compose-window')
  I.openApp('Tasks')
  tasks.newTask()
  I.seeElement('.io-ox-mail-compose')
  I.seeElement('.io-ox-contacts-edit-window')
  I.click('~Minimize', '.io-ox-mail-compose-window')
  I.waitForVisible('#io-ox-taskbar-container')
  I.waitForVisible('#io-ox-taskbar-container button[aria-label="New email"]')
})

Scenario('[C237269] Toggle display styles of floating windows @contentReview', ({ I, tasks }) => {
  I.login(['app=io.ox/tasks'])
  I.waitForVisible('.io-ox-tasks-window', 30)

  tasks.newTask()
  I.waitForVisible('.floating-window')

  I.click('[data-action=maximize]')
  I.waitForVisible('.floating-window.maximized')

  I.click('[data-action=normalize]')
  I.waitForVisible('.floating-window.normal')

  I.click('[data-action=minimize]')
  I.wait(1)
  I.dontSeeElement('.floating-window')
  I.waitForVisible('[data-action=restore]')
})

Scenario('Closing a floating window focusses the next open floating window', ({ I, tasks }) => {
  I.login(['app=io.ox/tasks'])
  I.waitForVisible('.io-ox-tasks-window', 30)

  tasks.newTask()
  tasks.newTask()
  tasks.newTask()
  I.waitForVisible('.floating-window')

  I.seeNumberOfVisibleElements('.floating-window', 3)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.seeNumberOfVisibleElements('.floating-window', 2)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.seeNumberOfVisibleElements('.floating-window', 1)
  I.waitForFocus('.floating-window:last-of-type input.title-field')
  I.pressKey('Escape')

  I.waitForDetached('.floating-window')
  I.waitForFocus('.primary-action > div > button:nth-child(1)')
})

Scenario('Navigate between floating windows', async ({ I, tasks }) => {
  I.login(['app=io.ox/tasks'])
  I.waitForVisible('.io-ox-tasks-window', 30)

  tasks.newTask()
  I.fillField('.active input.title-field', 'window 1')
  tasks.newTask()
  I.fillField('.active input.title-field', 'window 2')
  tasks.newTask()
  I.fillField('.active input.title-field', 'window 3')
  I.waitForVisible('.floating-window')
  I.seeNumberOfVisibleElements('.floating-window', 3)

  I.pressKey(['Control', '.'])
  expect(await I.grabValueFrom('.active input.title-field')).to.equal('window 1')

  I.pressKey(['Control', '.'])
  expect(await I.grabValueFrom('.active input.title-field')).to.equal('window 2')

  I.pressKey(['Control', '.'])
  expect(await I.grabValueFrom('.active input.title-field')).to.equal('window 3')

  // I.pressKey(['Control', ','])
  // expect(await I.grabValueFrom('.active input.title-field')).to.equal('window 2')
})
