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

Feature('Mobile > Tasks')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create a simple tasks @mobile', ({ I, dialogs }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.wait(0.5) // prevent clicking a detached element caused by the bottom toolbar being re-rendered multiple times
  I.waitForClickable('.mobile-toolbar [aria-label="New task"]', 5)
  I.click('~New task', '.mobile-toolbar')
  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Test Subject Matter')
  I.fillField('Description', 'Create simple Task')
  I.click('Create')
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForElement('.vgrid-cell.selected.tasks')
  I.waitForElement('.tasks-detailview')
  I.see('Test Subject Matter', '.tasks-detailview')
  I.see('Create simple Task', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
})

Scenario('Create and discard task @mobile', ({ I, dialogs }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.wait(0.5) // prevent clicking a detached element caused by the top toolbar being re-rendered multiple times
  I.waitForClickable('.mobile-toolbar [aria-label="New task"]', 5)
  I.click('~New task', '.mobile-toolbar')
  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Test')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.clearField('Subject')
  I.click('Discard')
  I.waitForDetached('.io-ox-tasks-edit')
})
