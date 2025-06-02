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

Feature('Tasks > Delete')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7753] Delete single Task', async ({ I, tasks, dialogs }) => {
  await I.haveTask({
    title: 'C7753',
    status: '1',
    percent_completed: '0',
    folder_id: await I.grabDefaultFolder('tasks'),
    recurrence_type: '0',
    full_time: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    notification: true,
    note: 'Delete single Task'
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('C7753', 5, '.window-body')
  I.waitForText('C7753', 5, '.tasks-detailview .title')
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to delete this task?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForText('No elements selected')
  I.waitForText('This task list is empty', 5, '.vgrid')
})

Scenario('[C7754] Delete several Task at the same time', async ({ I, tasks, dialogs }) => {
  const folderId = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'C7754 - 1', folder_id: folderId, note: 'Delete several Task at the same time' }),
    I.haveTask({ title: 'C7754 - 2', folder_id: folderId, note: 'Delete several Task at the same time' }),
    I.haveTask({ title: 'C7754 - 3', folder_id: folderId, note: 'Delete several Task at the same time' })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  await tasks.selectAll()
  I.seeNumberOfElements('li.selected.vgrid-cell', 3)
  I.waitForText('3 items selected', 5, '.task-detail-container')
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to delete these tasks?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForText('No elements selected')
  I.waitForText('This task list is empty', 5, '.vgrid')
})

Scenario('[C7755] Delete recurring Task', async ({ I, tasks, dialogs }) => {
  await I.haveTask({
    title: 'C7755',
    note: 'Delete recurring Task',
    status: '1',
    percent_completed: '0',
    folder_id: await I.grabDefaultFolder('tasks'),
    recurrence_type: 2,
    full_time: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    notification: true,
    start_time: 1551657600000,
    end_time: 1551744000000,
    interval: 1,
    days: 2
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to delete this task?', 5, dialogs.body)
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForText('No elements selected')
  I.waitForText('This task list is empty', 5, '.vgrid')
})
