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

Feature('Tasks > Search')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

const moment = require('moment')

Scenario('Check available fields and default values', async ({ I, tasks, search }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  const timed = { start: moment().subtract(1, 'months').startOf('day'), end: moment().add(1, 'months').startOf('day') }
  const allday = { start: moment().subtract(6, 'months').startOf('day'), end: moment().add(6, 'months').startOf('day') }
  await Promise.all([
    I.haveTask({ title: '#2: timed', full_time: false, folder_id: defaultFolder, start_time: timed.start.add(1, 'hours').valueOf(), end_time: timed.end.add(23, 'hours').valueOf() }),
    I.haveTask({ title: '#1: allday', full_time: true, folder_id: defaultFolder, start_time: allday.start.add(1, 'hours').valueOf(), end_time: allday.end.add(23, 'hours').valueOf() })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  // check available fields
  search.openDropdown()

  I.waitForText('Search in')
  I.waitForText('Contains words')
  I.waitForText('After')
  I.waitForText('Before')

  // default values available
  I.seeInField('Search in', 'current')
  I.seeInField('Contains words', '')

  // ignore default values (start/end)
  I.click(search.submitButton)
  I.waitForInvisible(search.dropdown)

  I.waitForText('#1: allday', 5, '~Task list')
  I.waitForText('#2: timed', 5, '~Task list')

  // minimal search
  search.openDropdown()
  I.waitForText('Contains words')
  I.fillField('Contains words', '#')
  I.click(search.submitButton)
  I.waitForInvisible(search.dropdown)
  I.waitForText('#1: allday', 5, '~Task list')
  I.waitForText('#2: timed', 5, '~Task list')

  // small time range
  search.openDropdown()
  I.waitForText('Contains words')
  I.seeInField('Contains words', '#')
  I.fillField('After', moment().subtract(2, 'months').format('MM/DD/YYYY'))
  I.fillField('Before', moment().add(2, 'months').format('MM/DD/YYYY'))
  I.pressKey('Enter')
  I.waitForInvisible(search.dropdown)
  I.waitForText('#2: timed', 5, '~Task list')
  I.dontSee('#1: allday', '.vgrid-cell')

  // large time range
  search.openDropdown()
  I.waitForText('Contains words')
  I.fillField('After', moment().subtract(12, 'months').format('MM/DD/YYYY'))
  I.fillField('Before', moment().add(12, 'months').format('MM/DD/YYYY'))
  I.pressKey('Enter')
  I.waitForInvisible(search.dropdown)
  I.waitForText('#1: allday', 5, '~Task list')
  I.waitForText('#2: timed', 5, '~Task list')
})

Scenario('Try to run a script in search', async ({ I, tasks, search }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  search.doSearch('<script>document.body.innerHTML=\'I am a hacker\'</script>')
  I.dontSee('I am a hacker')
})

Scenario('Search for tasks', async ({ I, users, tasks }) => {
  const folderId = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'Task#1', folder_id: folderId, start_time: moment().add(2, 'days').valueOf(), end_time: moment().add(2, 'days').valueOf() }),
    I.haveTask({ title: 'Task#2 - a very late task', folder_id: folderId, start_time: moment().add(5, 'months').valueOf(), end_time: moment().add(5, 'months').valueOf() })
  ])
  I.login('app=io.ox/tasks')
  I.waitForApp()

  // Search for "Task#1"
  I.fillField('.search-field', 'Task#1')
  I.pressKey('Enter')

  I.dontSeeElement('.filter.flex-row')
  I.waitForText('Task#1')
  I.dontSee('Task#2')

  // Cancel search
  I.click('~Cancel search')
  I.waitForDetached('.filters.flex-row .filter.flex-row')
  I.seeInField('.search-field', '')
  I.click('~More search options')
  I.waitForElement('.form-control[name="folder"]')
  I.seeInField('folder', 'current')
  I.seeInField('words', '')
  I.click('~More search options')

  I.waitForText('Task#1')
  I.waitForText('Task#2')

  // Search for task with "before in 6 months"
  I.click('~More search options')
  I.fillField('before', moment().add(6, 'months').format('L'))
  I.pressKey('Enter')

  // Both before and after visible when changing any date (tbd)
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Task#1')
  I.waitForText('Task#2')

  // Search for task with "after in 4 months and before in 6 months"
  I.click('~More search options')
  I.fillField('after', moment().add(4, 'months').format('L'))
  I.fillField('before', moment().add(6, 'months').format('L'))
  I.pressKey('Enter')

  I.seeNumberOfVisibleElements('.filter.flex-row', 2)
  I.waitForText('Task#2')
  I.dontSee('Task#1')
})

Scenario('by category', async ({ I, tasks, users }) => {
  const folder = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'task 1', folder_id: folder, categories: ['Improvement'] }),
    I.haveTask({ title: 'task 2', folder_id: folder, categories: ['Meeting'] }),
    I.haveSetting({
      'io.ox/core': {
        features: { categories: true },
        categories: { userCategories: [{ name: 'Improvement' }, { name: 'Meeting' }] }
      }
    })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  // quick search
  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'Improvement')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('task 1', 5, '.vgrid-cell')
  I.dontSee('task 2', '.vgrid-cell')
  I.click('~Cancel search')

  // advanced search
  I.click('~More search options')
  I.waitForText('Contains words')
  I.fillField('Contains words', 'Improvement')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('task 1', 5, '.vgrid-cell')
  I.dontSee('task 2', '.vgrid-cell')
})

Scenario('by category via detail view', async ({ I, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveSetting('io.ox/core//features/categories', true),
    I.haveTask({ title: '3 categories', categories: ['withoutwhitespace', 'with whitespace', 'with more whitespace'], folder_id: defaultFolder }),
    I.haveTask({ title: '2 categories', categories: ['withoutwhitespace', 'with whitespace'], folder_id: defaultFolder }),
    I.haveTask({ title: '1 category', categories: ['withoutwhitespace'], folder_id: defaultFolder })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  // category: withoutwhitespace
  I.waitForText('withoutwhitespace', 5, '.tasks-detailview')
  I.click('withoutwhitespace', '.tasks-detailview')
  I.waitForText('Search results', 5, '.vgrid-toolbar')
  tasks.selectTask('3 categories')
  I.seeNumberOfElements('.vgrid-scrollpane .tasks', 3)

  // category: with whitespace
  tasks.selectTask('3 categories')
  I.waitForText('withoutwhitespace', 5, '.tasks-detailview')
  I.click('with whitespace', '.tasks-detailview')
  I.waitForText('Search results', 5, '.vgrid-toolbar')
  tasks.selectTask('3 categories')
  I.seeNumberOfElements('.vgrid-scrollpane .tasks', 2)

  // category: with more whitespace
  tasks.selectTask('3 categories')
  I.waitForText('withoutwhitespace', 5, '.tasks-detailview')
  I.click('with more whitespace', '.tasks-detailview')
  I.waitForText('Search results', 5, '.vgrid-toolbar')
  tasks.selectTask('3 categories')
  I.seeNumberOfElements('.vgrid-scrollpane .tasks', 1)
})

Scenario('No autosuggest when searching with categories disabled', async ({ I, tasks }) => {
  await I.haveSetting({ 'io.ox/core': { features: { categories: false } } })

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'aaa')
  I.dontSee('Categories', '.autocomplete')
})
