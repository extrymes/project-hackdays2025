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

Feature('Shortcuts')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Show shortcut help', async ({ I, users, settings, dialogs }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login('app=io.ox/mail')
  I.waitForApp()

  I.pressKey(['?'])
  dialogs.waitForVisible()
  I.seeNumberOfElements('.modal-dialog', 1)
  I.waitForText('Keyboard shortcuts')
})

Scenario('Switch apps with keyboard shortcuts', async ({ I, users, settings, dialogs }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login('app=io.ox/mail')
  I.waitForApp()

  I.pressKey(['Control', 'Alt', 'c'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/calendar')

  I.pressKey(['Control', 'Alt', 'a'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/contacts')

  I.pressKey(['Control', 'Alt', 't'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/tasks')

  I.pressKey(['Control', 'Alt', 'd'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/files')

  I.pressKey(['Control', 'Alt', 'p'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/portal')

  I.pressKey(['Control', 'Alt', 'm'])
  I.waitForApp()
  I.seeInCurrentUrl('io.ox/mail')

  I.pressKey(['Control', 'Alt', 's'])
  I.waitForApp()
  I.seeInCurrentUrl('settings=virtual/settings/io.ox')
})
