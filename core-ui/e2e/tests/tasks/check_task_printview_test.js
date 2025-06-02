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

Feature('Tasks > Edit')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7756] Check Task printview ', async ({ I, tasks, users }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ folder_id: defaultFolder, title: 'C7756 - task 1', note: 'Do something', priority: 2, status: 1 }),
    I.haveTask({ folder_id: defaultFolder, title: 'C7756 - task 2', note: 'Do something else', percent_completed: 50, status: 2 })
  ])

  // #1 - login and check that those tasks exist, select all available tasks
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('C7756 - task 1')
  I.waitForText('C7756 - task 2')
  await tasks.selectAll()

  // #2 Chose print option
  I.click('~More actions', '~Selection Details')
  I.click('Print', '.dropdown.open .dropdown-menu')

  I.wait(1)
  I.switchToNextTab()

  // #3 verify the content of the print dialog
  I.waitForText('C7756 - task 1')
  I.see('Do something')
  I.see('Not started')

  I.see('C7756 - task 2')
  I.see('Do something else')
  I.see('In progress, Progress: 50%')
})
