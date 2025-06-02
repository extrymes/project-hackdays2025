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

Feature('Tasks > Create')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7730] Create a private Task with participant with keyboard shortcut', async ({ I, users, tasks }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.pressKey('c')
  I.waitForElement('.io-ox-tasks-edit')

  I.fillField('Subject', 'C7730')
  I.fillField('Description', 'Create a private Task with participant')
  I.click('Expand form')
  I.click('input[name=private_flag]')
  I.fillField('Add contact', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email').withText(users[1].get('primaryEmail')).inside('.participant-wrapper'))
  I.click('Create')
  I.waitForElement('.message[role="alert"]', 5)
  I.see('Tasks with private flag cannot be delegated.')
})

Scenario('[C7728] Create simple Task @smoketest', async ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'C7728')
  I.fillField('Description', 'Create simple Task')

  tasks.create()

  I.see('C7728', '.tasks-detailview')
  I.see('Create simple Task', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
})

Scenario('CommandOrControl creates a task', async ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'CommandOrControl')
  I.fillField('Description', 'Create simple Task')

  I.pressKey(['CommandOrControl', 'Enter'])
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForElement('.vgrid-cell.selected.tasks')
  I.waitForElement('.tasks-detailview')

  I.see('CommandOrControl', '.tasks-detailview')
  I.see('Create simple Task', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
})

Scenario('[C7729] Create Task with participants', async ({ I, users, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()
  I.fillField('Subject', 'C7729')
  I.fillField('Description', 'Create Task with participants')
  I.click('Expand form')
  I.fillField('Add contact', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForText('Participants (1)')
  I.fillField('Add contact', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForText('Participants (2)')

  tasks.create()
  I.see('C7729', '.tasks-detailview')
  I.retry(5).see('Create Task with participants', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
  I.waitForElement(`.participant-list .participant [title="${users[1].get('primaryEmail')}"]`)
  I.waitForElement(`.participant-list .participant [title="${users[2].get('primaryEmail')}"]`)
  I.logout()

  I.login('app=io.ox/tasks', { user: users[1] })
  I.waitForApp()
  I.retry(5).see('C7729', '.tasks-detailview')
  I.see('Create Task with participants', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
  I.waitForElement(`.participant-list .participant [title="${users[1].get('primaryEmail')}"]`)
  I.waitForElement(`.participant-list .participant [title="${users[2].get('primaryEmail')}"]`)
  I.logout()

  I.login('app=io.ox/tasks', { user: users[2] })
  I.waitForApp()
  I.retry(5).see('C7729', '.tasks-detailview')
  I.see('Create Task with participants', '.tasks-detailview')
  I.dontSeeElement('[title="High priority"]')
  I.dontSeeElement('[title="Low priority"]')
  I.see('NOT STARTED')
  I.waitForElement(`.participant-list .participant [title="${users[1].get('primaryEmail')}"]`)
  I.waitForElement(`.participant-list .participant [title="${users[2].get('primaryEmail')}"]`)
})

Scenario('[C7734] Create Task without any information', ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()
  I.seeElement('.floating-window-content .btn-primary[disabled=""][data-action="save"]')
})

Scenario('[C7733] Set Task startdate behind due date', async ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()
  I.fillField('Subject', 'C7733')
  I.fillField('Description', 'Set Task startdate behind due date')
  I.click('Expand form')
  I.click('All day')
  I.fillField('[data-attribute="start_time"] .datepicker-day-field', '12/14/2114')
  I.click('[data-attribute="start_time"] .time-field')
  I.fillField('[data-attribute="start_time"] .time-field', '12:00 PM')
  I.fillField('[data-attribute="end_time"] .datepicker-day-field', '12/13/2114')
  I.click('[data-attribute="end_time"] .time-field')
  I.click('Create')
  I.retry(5).seeTextEquals('The dialog contains invalid data', '.io-ox-alert .message div')
  I.retry(5).seeTextEquals('The start date must be before the due date.', '[data-attribute="start_time"] div.error')
  I.retry(5).seeTextEquals('The due date must not be before the start date.', '[data-attribute="end_time"] div.error')
})

Scenario('[Bug 62240] Creating tasks while on a different time zone with a yearly or monthly repeat leads to wrong dates', async ({ I, tasks, dialogs }) => {
  await I.haveSetting({
    'io.ox/core': { timezone: 'America/New_York' }
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.click('Expand form')
  I.checkOption('All day')
  I.fillField('[data-attribute="start_time"] .datepicker-day-field', '4/21/2020')
  I.pressKey('Escape')

  I.checkOption('Repeat')
  I.click('Every Tuesday.')
  dialogs.waitForVisible()
  await within('.modal-dialog', async function () {
    I.selectOption('Repeat', 'Monthly')
    I.waitForText('Every month on day 21.')
  })
})

Scenario('Create task in shared folder', async ({ I, tasks, users, dialogs }) => {
  const user = users[1]
  const sharedUserName = `${user.get('sur_name')}, ${user.get('given_name')}`
  const parent = await I.grabDefaultFolder('tasks', { user })

  await I.haveFolder({
    module: 'tasks',
    title: 'Shared list',
    parent,
    permissions: [
      // other user has owner access
      { bits: 403710016, entity: user.get('id'), group: false },
      // read-only access to default user
      { bits: 257, entity: users[0].get('id'), group: false }
    ]
  }, { user })

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.selectFolder(`${sharedUserName}: Shared list`)
  I.waitForText(`${sharedUserName}: Shared list`, null, '.window-body')
  I.clickPrimary('New task')
  I.waitForText(`You cannot add tasks in "${sharedUserName}: Shared list". Do you want to add a new task to your default folder instead?`)
  dialogs.clickButton('Use default')

  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Task from shared')
  I.click('Create')
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForNetworkTraffic()

  I.selectFolder('Tasks')
  I.waitForText('Task from shared')
})

Scenario('Create task in public folder', async ({ I, tasks, users, dialogs }) => {
  const user = users[1]

  await I.haveFolder({
    module: 'tasks',
    title: 'Public list',
    // set '2' as parent makes it a public list
    parent: '2',
    permissions: [
      // other user has owner access
      { bits: 403710016, entity: user.get('id'), group: false },
      // read-only access to default user
      { bits: 257, entity: users[0].get('id'), group: false }
    ]
  }, { user })

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.selectFolder('Public list')
  I.waitForText('Public list', null, '.window-body')
  I.clickPrimary('New task')
  I.waitForText('You cannot add tasks in "Public list". Do you want to add a new task to your default folder instead?')
  dialogs.clickButton('Use default')

  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Task from public')
  I.click('Create')
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForNetworkTraffic()

  I.selectFolder('Tasks')
  I.waitForText('Task from public')
})

Scenario('Create task with a category', async ({ I, tasks, users, dialogs }) => {
  await I.haveSetting('io.ox/core//features/categories', true)
  const category = 'Important'
  const newCategory = 'NewCat'
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Task w/ category')

  I.click('Expand form')
  I.click('Add category')
  I.click(category)

  I.waitForText(category, 1, '.category-view')

  I.click('Add category')
  I.click('Manage categories ...')

  I.waitForText('Manage categories', 1, '.modal h1')

  I.dontSee(newCategory)

  I.click('New category')
  I.waitForText('Create category', 1)
  I.fillField('Name', newCategory)
  I.click(locate('.item-picker-item').withText('Orange'))
  I.click(locate('.item-picker-item').withText('Alarm'))
  I.click('button[data-action="save"]', '.category-modal-update')
  I.waitForText(newCategory)

  I.click('~Delete Business')
  I.waitForText('Delete category', 1)
  I.click('Delete')
  I.dontSee('Business')

  I.click(`~Edit ${newCategory}`)
  I.waitForText('Edit category', 1)

  I.seeInField('input.form-control[name="name"]', newCategory)
  I.seeAttributesOnElements('[data-name=Orange]', { checked: true })
  I.seeAttributesOnElements('[data-name=Alarm]', { checked: true })

  I.click('button[data-action="save"]', '.category-modal-update')
  I.click('Close', '.category-modal')

  I.click('Add category')
  I.click(newCategory)

  I.see(category)
  I.click(`div[title='Remove category "${category}"']`)
  I.dontSee(category, '.categories-badges')

  I.click('Create')
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForNetworkTraffic()

  I.selectFolder('Tasks')
  I.waitForText('Task w/ category')
  I.see('Categories')
  I.dontSee(category)
})

Scenario('Categories escape untrusted content', async ({ I, tasks, users }) => {
  await I.haveSetting('io.ox/core//features/categories', true)
  const category = 'testcategory<div></div>'
  const title = 'task 1'

  await I.haveTask({
    title,
    folder_id: await I.grabDefaultFolder('tasks'),
    categories: [category]
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.waitForText(title)
  I.click(title)
  I.see(category)
})

Scenario('Create task with all fields', async ({ I, tasks, calendar, users, contactpicker }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/categories', true),
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'Task with all fields')

  I.fillField('Description', 'Task with all fields')

  I.click('Expand form')

  I.click('Start date')
  I.click('.today', '.date-picker.open')
  I.fillField('Due date', calendar.getNextMonday().format('L'))
  I.uncheckOption('All day')
  // Needs this selector because no aria-label is provided
  I.fillField('.dateinput[data-attribute="start_time"] .time-field', '12:00 PM')
  I.fillField('.dateinput[data-attribute="end_time"] .time-field', '12:30 PM')
  const startDate = await I.grabValueFrom('.dateinput[data-attribute="start_time"] input')
  const endDate = await I.grabValueFrom('.dateinput[data-attribute="end_time"] input')

  calendar.recurAppointment()
  I.waitForText('Edit recurrence')
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily on workdays')
  I.waitForText('On workdays.')
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Weekly')
  I.waitForText('week(s)')
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Monthly')
  I.waitForText('month(s)')
  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Yearly')
  I.waitForText('Every year')

  I.selectOption('.modal-dialog [name="recurrence_type"]', 'Daily')
  I.waitForText('Every day.')
  I.click('Apply')
  I.selectOption('Reminder', 'In one hour')

  I.selectOption('Status', 'Waiting')

  I.fillField('Progress in %', '40')
  I.click('button[data-action="minus"]')
  I.click('button[data-action="plus"]')

  I.selectOption('Priority', 'High')

  I.pressKey('Pagedown')
  I.click('Add category')
  I.click('Important')
  I.waitForText('Important', 1, '.category-view')

  I.click('~Select contacts')
  contactpicker.add(calendar.getFullname(users[1]))
  contactpicker.close()
  I.waitForText(calendar.getFullname(users[1]))

  I.attachFile('Add attachment', 'media/files/generic/testdocument.odt')
  I.waitForText('testdocument.odt', 5, '.attachment-list')
  I.seeNumberOfElements('.attachment', 1)

  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add', '.add-infostore-file')
  I.waitForText('100x100.png', 5, '.attachment-list')
  I.seeNumberOfElements('.attachment', 2)

  I.click('Show details')
  I.pressKey('Pagedown')
  I.fillField('Estimated duration in minutes', '60')
  I.fillField('Actual duration in minutes', '75')
  I.fillField('Estimated costs', '150')
  I.fillField('Actual costs', '175')
  I.fillField('Currency', 'EUR')
  I.fillField('Distance', '10.5')
  I.fillField('Billing information', 'Paypal')
  I.fillField('Companies', 'Cool Company')
  tasks.create()

  I.waitForElement('h1.title span.high')
  I.waitForText('This task recurs', 5, '.task-details')
  I.see('Every day.', '.task-details')
  I.see('Categories', '.task-details')
  I.see('Important', '.task-details')
  I.see('Status', '.task-details')
  I.see('WAITING', '.task-details')
  I.see('Progress', '.task-details')
  I.see('40 %', '.task-details')
  I.see('Due', '.task-details')
  I.see(`${startDate}, 12:00 PM`, '.task-details')
  I.see('Start date', '.task-details')
  I.see(`${endDate}, 12:30 PM`, '.task-details')
  I.see('Description', '.task-details')
  I.see('Task with all fields', '.task-details')
  I.see('Estimated duration in minutes', '.task-details')
  I.see('60', '.task-details')
  I.see('Actual duration in minutes', '.task-details')
  I.see('75', '.task-details')
  I.see('Estimated costs', '.task-details')
  I.see('€150.00', '.task-details')
  I.see('Actual costs', '.task-details')
  I.see('€175.00', '.task-details')
  I.see('Distance', '.task-details')
  I.see('10.5', '.task-details')
  I.see('Billing information', '.task-details')
  I.see('Paypal', '.task-details')
  I.see('Companies', '.task-details')
  I.see('Cool Company', '.task-details')
  I.see('Attachments', '.task-details')
  I.see('testdocument.odt', '.task-details')
  I.see('100x100.png', '.task-details')

  I.see(calendar.getFullname(users[1]), '.participants-view')
})

Scenario('Create task with reminder', async ({ I, tasks }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'Reminder Task')
  I.click('Expand form')

  I.selectOption('Reminder', 'Manual input')
  const time = new Date()
  const dd = time.getDate()
  const mm = time.getMonth() + 1
  const yyyy = time.getFullYear()
  if (time.getSeconds() > 55) time.setSeconds(time.getSeconds() + 10)
  I.fillField('Reminder date', `${mm}/${dd}/${yyyy}`)
  I.pressKey('Tab')
  // Needs this selector because no aria-label is provided
  I.fillField('.dateinput[data-attribute="alarm"] .time-field', time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }))

  tasks.create()
  I.waitForElement('.btn-topbar[title="There is a new notification"]', 10)
})
