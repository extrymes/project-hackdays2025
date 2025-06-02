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

Feature('PIM Categories')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Settings page', async ({ I }) => {
  await I.haveSetting('io.ox/core//features/categories', true)
  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  I.waitForText('Manage categories ...')
  I.click('Manage categories ...')
  I.waitForText('Manage categories')
  I.see('Close')
  I.see('New category')
  I.seeNumberOfVisibleElements('.category-list-item', 4)
})

Scenario('Supports default and predefined categories', async ({ I }) => {
  await I.haveSetting({
    'io.ox/core': {
      features: { categories: true },
      categories: {
        predefined: [{
          name: 'Confidential'
        }]
      }
    }
  })

  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  I.waitForText('Manage categories ...')
  I.click('Manage categories ...')
  I.waitForText('Manage categories')

  // number and type
  I.seeNumberOfVisibleElements('.category-list-item', 5)
  I.seeNumberOfVisibleElements('.category-view[data-type="predefined"]', 1)
  I.seeNumberOfVisibleElements('.category-view[data-type="default"]', 4)

  // actions
  I.seeNumberOfVisibleElements('.category-list-item .delete', 4)
  I.seeNumberOfVisibleElements('.category-list-item .edit', 4)

  // check predefined (immutable)
  I.see('Confidential')
  I.dontSeeElement('.category-list-item:nth-of-type(1) .category-view .bi')
  I.dontSeeElement('.category-list-item:nth-of-type(1) .category-view .edit')
  I.dontSeeElement('.category-list-item:nth-of-type(1) .category-view .delete')

  // check default
  I.see('Important')
  I.seeElement('.category-view .bi-exclamation-circle')
  I.see('Business')
  I.seeElement('.category-view .bi-briefcase')
  I.see('Meeting')
  I.seeElement('.category-view .bi-house-door')
  I.see('Private')
  I.dontSeeElement('.category-list-item:nth-of-type(5) .category-view .bi')
})

Scenario('Add, edit and remove', async ({ I }) => {
  const userCategories = [{
    name: 'user:icon',
    color: '#ff2968',
    icon: 'bi/exclamation-circle.svg'
  }, {
    name: 'user:delete',
    color: '#16adf8'
  },
  {
    name: 'user:edit',
    color: '#707070'
  }]
  await I.haveSetting({ 'io.ox/core': { features: { categories: true }, categories: { userCategories } } })

  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  I.waitForText('Manage categories ...')
  I.click('Manage categories ...')
  I.waitForText('Manage categories')

  I.seeNumberOfVisibleElements('.category-list-item', 3)
  I.seeNumberOfVisibleElements('.category-list-item .delete', 3)
  I.seeNumberOfVisibleElements('.category-list-item .edit', 3)

  I.see('user:icon')
  I.see('user:delete')
  I.see('user:edit')

  // single one with item
  I.seeElement('.category-list-item:nth-of-type(1) .bi-exclamation-circle')

  // delete
  I.click('~Delete user:delete')
  I.waitForText('Delete category')
  I.click('Delete')
  I.waitForText('Manage categories')

  // set icon
  I.click('~Edit user:edit')
  I.waitForText('Edit category', 1)
  I.fillField('Name', 'user:edit:renamed')
  I.checkOption('[title="Alarm"]')
  I.click('Save')
  I.waitForText('New category')

  // create
  I.click('New category')
  I.waitForText('Create category', 1)
  I.fillField('Name', 'user:new')
  I.click('Create')
  I.waitForText('Manage categories')
  I.waitForResponse(response => response.url().includes('api/jslob?action=set') && response.request().method() === 'PUT', 10)
  I.logout()

  // check restore
  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  I.waitForText('Manage categories ...')
  I.click('Manage categories ...')
  I.waitForText('Manage categories')

  I.waitForText('user:new')
  I.see('user:icon')
  I.dontSee('user:delete')
  I.see('user:edit:renamed')
  I.seeElement('.category-list-item:nth-of-type(2) .bi-alarm')
  I.see('user:new', '.category-list-item')
})

Scenario('Validate categories', async ({ I }) => {
  await I.haveSetting('io.ox/core//features/categories', true)

  I.login('settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()

  I.waitForText('Manage categories ...')
  I.click('Manage categories ...')
  I.waitForText('Manage categories')
  // default categories
  I.seeNumberOfVisibleElements('.category-list-item', 4)

  // validate duplicate: edit
  I.click('~Edit Private')
  I.waitForText('Edit category', 1)
  I.fillField('Name', 'Business')
  I.click('Save')
  I.see('Name is already taken.')
  I.pressKey('Tab')
  I.click('.category-modal-update button[data-action="cancel"]')
  I.waitForText('Manage categories')

  // validate duplicate: new
  I.click('New category')
  I.waitForText('Create category', 1)
  I.fillField('Name', 'Meeting')
  I.click('Create')
  I.see('Name is already taken.')
  I.pressKey('Tab')
  I.click('.category-modal-update button[data-action="cancel"]')
  I.waitForText('Manage categories')

  // validate empty name
  I.click('New category')
  I.waitForText('Create category', 1)
  I.fillField('Name', '')
  I.click('Create')
  I.see('Please enter a name.')
})

Scenario('Search space separated categories', async ({ I, tasks }) => {
  await I.haveSetting({
    'io.ox/core': {
      'features/categories': true,
      'categories/userCategories': { name: 'space separated' }
    }
  })
  I.login('app=io.ox/tasks')
  I.waitForApp()
  tasks.newTask()

  I.waitForElement('.io-ox-tasks-edit')
  I.fillField('Subject', 'Task title')
  I.click('Expand form')
  I.click('Add category')
  I.click('space separated')
  I.click('Create')
  I.waitForDetached('.io-ox-tasks-edit-window')
  I.waitForNetworkTraffic()

  I.click('[data-point="io.ox/tasks/search/dropdown"] .search-field')
  I.waitForFocus('[data-point="io.ox/tasks/search/dropdown"] .search-field')
  I.fillField('Search tasks', 'space')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('Task title', 5, '.vgrid-cell')

  I.fillField('Search tasks', 'separated')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('Task title', 5, '.vgrid-cell')

  I.fillField('Search tasks', 'space separated')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('Task title', 5, '.vgrid-cell')
})

Scenario('Change icon of a category', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/categories', true)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.scrollTo('.category-dropdown .dropdown-label')
  I.click('.category-dropdown .dropdown-label')
  I.clickDropdown('Manage categories ...')
  I.waitForText('New category')
  I.click('New category')
  I.fillField('Name', 'Custom category')
  I.click(locate('.item-picker-item').withText('Meeting'))
  I.click('Create', '.category-modal-update')
  I.waitToHide('.category-modal-update')

  I.seeElement('.category-view[data-name="Custom category"] svg.bi-people')
  I.click('~Edit Custom category')
  I.waitForElement('.category-modal-update')
  I.click(locate('.item-picker-item').withText('Important'))
  I.click('Save', '.category-modal-update')
  I.waitToHide('.category-modal-update')
  I.seeElement('.category-view[data-name="Custom category"] svg.bi-exclamation-circle')

  I.click('~Edit Custom category')
  I.waitForElement('.category-modal-update')
  I.click(locate('.item-picker-item').withText('Meeting'))
  I.click('Save', '.category-modal-update')
  I.waitToHide('.category-modal-update')
  I.seeElement('.category-view[data-name="Custom category"] svg.bi-people')

  I.click('~Edit Custom category')
  I.waitForElement('.category-modal-update')
  I.click(locate('.item-picker-item').withText('Important'))
  I.click('Save', '.category-modal-update')
  I.waitToHide('.category-modal-update')
  I.seeElement('.category-view[data-name="Custom category"] svg.bi-exclamation-circle')
})
