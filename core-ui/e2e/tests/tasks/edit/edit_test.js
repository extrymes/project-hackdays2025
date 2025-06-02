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

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7738] Edit task with all fields filled', async ({ I, tasks }) => {
  await I.haveTask({
    title: 'C7738',
    status: '1',
    percent_completed: '0',
    folder_id: await I.grabDefaultFolder('tasks'),
    recurrence_type: '0',
    full_time: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    notification: true,
    target_duration: '1337',
    actual_duration: '1336',
    target_costs: '1335',
    actual_costs: '1334',
    trip_meter: '1337mm',
    billing_information: 'Don not know any Bill',
    companies: 'Open-Xchange GmbH',
    note: 'Edit task with all fields filled',
    currency: 'EUR'
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.task-details')
  I.see('Estimated duration in minutes', '.task-details')
  I.see('1337', '.task-details')
  I.see('Actual duration in minutes', '.task-details')
  I.see('1336', '.task-details')
  I.see('Estimated costs', '.task-details')
  I.see('€1,335', '.task-details')
  I.see('Actual costs', '.task-details')
  I.see('€1,334', '.task-details')
  I.see('Distance', '.task-details')
  I.see('1337mm', '.task-details')
  I.see('Billing information', '.task-details')
  I.see('Don not know any Bill', '.task-details')
  I.see('Companies', '.task-details')
  I.see('Open-Xchange GmbH', '.task-details')

  tasks.editTask()
  I.fillField('Estimated duration in minutes', '1339')
  I.fillField('Actual duration in minutes', '1338')
  I.fillField('Estimated costs', '1339')
  I.fillField('Actual costs', '1338')
  I.selectOption('Currency', 'RUB')
  I.fillField('Distance', '1338mm')
  I.fillField('Billing information', 'Yes, i know any Bill')
  I.fillField('Companies', 'Open-Xchange Inc.')
  tasks.save()

  I.waitForElement('.task-details')
  I.waitForText('1339', undefined, '.task-details')
  I.waitForText('1338', undefined, '.task-details')
  I.waitForText('RUB', undefined, '.task-details')
  I.waitForText('1,339.00', undefined, '.task-details')
  I.waitForText('1,338.00', undefined, '.task-details')
  I.waitForText('1338mm', undefined, '.task-details')
  I.waitForText('Yes, i know any Bill', undefined, '.task-details')
  I.waitForText('Open-Xchange Inc.', undefined, '.task-details')
})

Scenario('[C7739] Change tasks due date in dropdown', async ({ I, tasks }) => {
  const moment = require('moment')

  await I.haveTask({ title: 'C7739', folder_id: await I.grabDefaultFolder('tasks'), note: 'Change tasks due date in dropdown' })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview')

  const list = moment().isoWeekday() < 6
    ? ['Tomorrow', 'This weekend (Saturday)', 'Next week (Monday)']
    : ['Tomorrow', 'Next week (Monday)']
  list.forEach(function (day, i) {
    I.clickToolbar('~Change due date')
    I.waitForElement('.dropdown.open .dropdown-menu')
    I.clickToolbar(day)
    I.waitForText('Due', 5, '.task-details .detail-label')
    const date = getDate(day).format('M/D/YYYY')
    I.waitForText(date, 5, '.task-details .detail-value')
    I.waitForText(date, 5, '.vgrid .end_date')
    const closeButton = '.io-ox-alert [data-action="close"]'
    I.waitForElement(closeButton)
    I.click(closeButton)
    I.waitForDetached('.io-ox-alert')
  })

  function getDate (day) {
    const now = moment().startOf('hour').hours(8)
    if (day === 'Tomorrow') return now.add(1, 'day')
    if (day === 'This weekend (Saturday)') return now.isoWeekday(6)
    return now.isoWeekday(8)
  }
})

Scenario('[C7740] Edit Task', async ({ I, tasks }) => {
  await I.haveTask({ title: 'C7740', folder_id: await I.grabDefaultFolder('tasks'), note: 'Edit Task' })
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.editTask()
  I.fillField('Subject', 'C7740 - 2')
  I.waitForText('C7740 - 2', 5, '.floating-window-content .title')
  tasks.save()
  I.waitForText('C7740 - 2', 5, '.tasks-detailview .title')
  I.waitForText('C7740 - 2', 5, '[role="navigation"] .title')
})

Scenario('[C7741] Mark Task as Done', async ({ I, tasks }) => {
  await I.haveTask({ title: 'C7741', folder_id: await I.grabDefaultFolder('tasks'), note: 'Mark Task as Done' })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  I.clickToolbar('~Mark as done')
  I.waitForText('DONE', 5, '[aria-label="Task list"] .status.badge-done')
  I.waitForText('Progress', 5, '.task-details')
  I.waitForText('100 %', 5, '.task-details')
  I.waitForText('DONE', 5, '.task-details .badge-done.state')
  I.waitForText('Date completed', 5, '.task-details')
})

Scenario('[C7742] Mark Task as Undone', async ({ I, tasks }) => {
  await I.haveTask({
    title: 'C7742',
    folder_id: await I.grabDefaultFolder('tasks'),
    note: 'Mark Task as Undone',
    percent_completed: 100,
    status: 3
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  I.clickToolbar('~Mark as undone')
  I.waitForText('NOT STARTED', 5, '[aria-label="Task list"] .status.badge-notstarted')
  I.dontSee('Progress 100 %')
  I.waitForText('NOT STARTED', 5, '.tasks-detailview .badge-notstarted')
})

Scenario('[C7743] Move single Task', async ({ I, tasks, dialogs }) => {
  const taskDefaultFolder = await I.grabDefaultFolder('tasks')

  await Promise.all([
    I.haveFolder({ module: 'tasks', title: 'C7743', parent: taskDefaultFolder }),
    I.haveTask({ title: 'C7743', folder_id: taskDefaultFolder, note: 'Move single Task' })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.clickToolbar('~More actions')
  I.click('Move')
  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('.modal .section .folder-arrow')
  I.click('.modal li[aria-label="My lists"] .folder-arrow svg')
  I.waitForElement('.modal .section.open [aria-label="C7743"]', 5)
  I.click('.modal [aria-label="C7743"]')
  I.waitForEnabled('.modal button.btn-primary')
  dialogs.clickButton('Move')
  I.waitForNetworkTraffic()
  I.selectFolder('C7743')
  I.waitForElement(locate('.vgrid-cell').withText('C7743'))
  I.click(locate('.vgrid-cell').withText('C7743'))
  I.waitForText('C7743', 5, '.tasks-detailview .title')
  I.waitForText('C7743', 5, '[role="navigation"] .title')
})

Scenario('[C7744] Mark several task as done at the same time', async ({ I, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'C7744 - 1', folder_id: defaultFolder, note: 'Mark several task as done at the same time' }),
    I.haveTask({ title: 'C7744 - 2', folder_id: defaultFolder, note: 'Mark several task as done at the same time' }),
    I.haveTask({ title: 'C7744 - 3', folder_id: defaultFolder, note: 'Mark several task as done at the same time' })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  await tasks.selectAll()
  I.seeNumberOfElements('li.selected.vgrid-cell', 3)
  I.waitForText('3 items selected', 5, '.task-detail-container .message')
  I.clickToolbar('~Mark as done')
  I.retry(5).seeNumberOfElements('[aria-label="Task list"][role="navigation"] .badge-done.status', 3)

  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7744 - 1, Done."]')
  I.click('~C7744 - 1')
  I.waitForElement(locate('.selectable.tasks.selected div.title').withText('C7744 - 1'))
  I.waitForElement('.task-details', 5)
  I.waitForText('C7744 - 1', 5, '.task-header .title')
  I.waitForText('Progress', 5, '.task-details')
  I.waitForText('100 %', 5, '.task-details')
  I.waitForText('DONE', 5, '.task-details .badge-done.state')
  I.waitForText('Date completed', 5, '.task-details')

  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7744 - 2, Done."]')
  I.click('~C7744 - 2')
  I.waitForElement(locate('.selectable.tasks.selected div.title').withText('C7744 - 2'))
  I.waitForElement('.task-details', 5)
  I.waitForText('C7744 - 2', 5, '.task-header .title')
  I.waitForText('Progress', 5, '.task-details')
  I.waitForText('100 %', 5, '.task-details')
  I.waitForText('DONE', 5, '.task-details .badge-done.state')
  I.waitForText('Date completed', 5, '.task-details')

  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7744 - 3, Done."]')
  I.click('~C7744 - 3')
  I.waitForElement(locate('.selectable.tasks.selected div.title').withText('C7744 - 3'))
  I.waitForElement('.task-details', 5)
  I.waitForText('C7744 - 3', 5, '.task-header .title')
  I.waitForText('Progress', 5, '.task-details')
  I.waitForText('100 %', 5, '.task-details')
  I.waitForText('DONE', 5, '.task-details .badge-done.state')
  I.waitForText('Date completed', 5, '.task-details')
})

Scenario('[C7745] Mark several Task as Undone at the same time', async ({ I, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')

  await Promise.all([
    I.haveTask({ title: 'C7745 - 1', folder_id: defaultFolder, note: 'Mark several Task as Undone at the same time', percent_completed: 100, status: 3 }),
    I.haveTask({ title: 'C7745 - 2', folder_id: defaultFolder, note: 'Mark several Task as Undone at the same time', percent_completed: 100, status: 3 }),
    I.haveTask({ title: 'C7745 - 3', folder_id: defaultFolder, note: 'Mark several Task as Undone at the same time', percent_completed: 100, status: 3 })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  await tasks.selectAll()
  I.seeNumberOfElements('li.selected.vgrid-cell', 3)
  I.waitForText('3 items selected', 5, '.task-detail-container .message')
  I.clickToolbar('~Mark as undone')
  I.retry(5).seeNumberOfElements('[aria-label="Task list"][role="navigation"] .badge-notstarted.status', 3)

  I.click('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 1, Not started."]')
  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 1, Not started."].selected', 5)
  I.waitForElement('.task-details', 5)
  I.waitForText('NOT STARTED', 5, '.task-details .badge-notstarted')
  I.waitForText('C7745 - 1', 5, '.task-header .title')

  I.click('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 2, Not started."]')
  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 2, Not started."].selected', 5)
  I.waitForElement('.task-details', 5)
  I.waitForText('NOT STARTED', 5, '.task-details .badge-notstarted')
  I.waitForText('C7745 - 2', 5, '.task-header .title')

  I.click('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 3, Not started."]')
  I.waitForElement('[role="navigation"][aria-label="Task list"] [aria-label="C7745 - 3, Not started."].selected', 5)
  I.waitForElement('.task-details', 5)
  I.waitForText('NOT STARTED', 5, '.task-details .badge-notstarted')
  I.waitForText('C7745 - 3', 5, '.task-header .title')
})

Scenario('[C7746] Move several tasks to an other folder at the same time', async ({ I, tasks, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')

  await Promise.all([
    I.haveFolder({ module: 'tasks', title: 'C7746', parent: defaultFolder }),
    I.haveTask({ title: 'C7746 - 1', folder_id: defaultFolder, not: 'Move several tasks to an other folder at the same time' }),
    I.haveTask({ title: 'C7746 - 2', folder_id: defaultFolder, note: 'Move several tasks to an other folder at the same time' }),
    I.haveTask({ title: 'C7746 - 3', folder_id: defaultFolder, note: 'Move several tasks to an other folder at the same time' })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.vgrid-cell.selected.tasks')
  I.waitForElement('.tasks-detailview')
  await tasks.selectAll()
  I.seeNumberOfElements('.vgrid-cell.selected', 3)
  I.waitForText('3 items selected', 5, '.task-detail-container .message')

  I.click('.task-detail-container [aria-label="More actions"]')
  I.clickDropdown('Move')
  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('.modal .section .folder-arrow')
  I.click('.modal li[aria-label="My lists"] .folder-arrow svg')
  I.waitForElement('.modal .section.open [aria-label="C7746"]', 5)
  I.click('.modal [aria-label="C7746"]')
  I.waitForEnabled('.modal button.btn-primary')
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')
  I.triggerRefresh()
  I.selectFolder('C7746')
  I.waitForApp()
  I.waitForElement('~C7746 - 1')
  I.click('~C7746 - 1')
  I.waitForElement('.task-details')

  I.see('C7746 - 1', '.vgrid-cell')
  tasks.selectTask('C7746 - 1')
  I.waitForText('C7746 - 1', 2, '.task-header')

  I.see('C7746 - 2', '.vgrid-cell')
  tasks.selectTask('C7746 - 2')
  I.waitForText('C7746 - 2', 2, '.task-header')

  I.see('C7746 - 3', '.vgrid-cell')
  tasks.selectTask('C7746 - 3')
  I.waitForText('C7746 - 3', 2, '.task-header')
})

Scenario('[C7749] Edit existing Task as participant', async ({ I, users, tasks }) => {
  await I.haveTask({
    title: 'C7749',
    status: '1',
    percent_completed: '0',
    folder_id: await I.grabDefaultFolder('tasks'),
    recurrence_type: '0',
    full_time: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    notification: true,
    note: 'Edit existing Task as participant',
    participants: [{ id: users[1].get('id'), type: 1 }]
  })

  I.login('app=io.ox/tasks', { user: users[1] })
  I.waitForApp()
  I.waitForText('C7749', 5, '.window-body')
  I.waitForText('C7749', 5, '.tasks-detailview .title')
  tasks.editTask()
  I.fillField('Subject', 'Edit existing Task as participant - 2')
  I.fillField('Description', 'Edit existing Task as participant - 2')
  tasks.save()
  I.waitForText('Edit existing Task as participant - 2', 5, '.window-body')
  I.waitForText('Edit existing Task as participant - 2', 5, '.tasks-detailview .title')
  I.logout()

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('Edit existing Task as participant - 2', 5, '.window-body')
  I.waitForText('Edit existing Task as participant - 2', 5, '.tasks-detailview .title')
})

Scenario('[C7750] Edit existing Task in a shared folder', async ({ I, users, tasks }) => {
  const folderId = await I.haveFolder({
    module: 'tasks',
    subscribed: 1,
    title: 'C7750',
    permissions: [
      { bits: 403710016, entity: users[0].get('id'), group: false },
      { user: users[1], access: 'author' }
    ],
    parent: await I.grabDefaultFolder('tasks')
  })

  await I.haveTask({
    title: 'C7750',
    status: '1',
    percent_completed: '0',
    folder_id: folderId,
    recurrence_type: '0',
    full_time: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    notification: true,
    note: 'Edit existing Task in a shared folder'
  })

  I.login('app=io.ox/tasks', { user: users[1] })
  I.waitForApp()
  I.waitForText('My lists')
  I.selectFolder('C7750')
  I.waitForText('C7750', undefined, '.tasks.even')
  I.click('.tasks.even[data-index="0"]')
  I.waitForText('C7750', 15, '.window-body')
  I.waitForText('C7750', 15, '.tasks-detailview .title')
  tasks.editTask()
  I.waitForElement('.floating-window-content .container.io-ox-tasks-edit', 5)
  I.fillField('Subject', 'C7750 - 2')
  I.fillField('Description', 'Edit existing Task in a shared folder - 2')
  tasks.save()
  I.waitForText('My lists')
  I.selectFolder('C7750')
  I.waitForText('C7750', undefined, '.tasks.even')
  I.click('.tasks.even[data-index="0"]')
  I.waitForText('C7750 - 2', 15, '.window-body')
  I.waitForText('C7750 - 2', 15, '.tasks-detailview .title')
  I.logout()

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('My lists')
  I.selectFolder('C7750')
  I.waitForText('C7750', undefined, '.tasks.even')
  I.click('.tasks.even[data-index="0"]')
  I.waitForText('C7750 - 2', 15, '.window-body')
  I.waitForText('C7750 - 2', 15, '.tasks-detailview .title')
})

Scenario('[C7751] Close Task with the X', ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.clickPrimary('New task')
  I.waitForVisible('.io-ox-tasks-edit-window')
  I.see('Create')
  I.see('Discard')
  I.click('~Close', '.io-ox-tasks-edit-window')
  I.waitForDetached('.io-ox-tasks-edit-window')
})

Scenario('[C7752] Close Task with the X after adding some information', ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'C7752')
  I.fillField('Description', 'Close Task with the X after adding some information')
  I.click('Discard')
  I.waitForText('Do you really want to discard your changes?')
  I.click('Cancel')
  I.click('~Close', '.io-ox-tasks-edit-window')
  I.waitForText('Do you really want to discard your changes?')
  I.click('Cancel')
  I.click('~Close', '.io-ox-tasks-edit-window')
  I.waitForText('Do you really want to discard your changes?')
  I.click('Discard changes')
  I.waitForDetached('.io-ox-tasks-edit-window')
})
