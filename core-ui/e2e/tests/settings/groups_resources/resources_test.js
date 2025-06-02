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

Feature('Settings > Resources')

Before(async ({ users }) => {
  await users.create()
  await users[0].hasModuleAccess({ editResource: 'true' })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Resources editor is enabled by capability', async ({ I, users }) => {
  await users[0].hasModuleAccess({ editResource: 'false', editGroup: 'true' })
  I.login('app=io.ox/settings')
  I.waitForApp()
  I.waitForText('Groups')
  I.dontSee('Resources')
})

Scenario('Resources are listed and viewable', async ({ I, settings }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/core': { features: { managedResources: true } } }),
    I.haveResource({
      display_name: 'DeLorean',
      description: 'Time machine. Used but in good shape.',
      name: 'delorean@box.ox.io',
      mailaddress: 'delorean@box.ox.io',
      availability: false
    }),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  I.login('app=io.ox/settings')
  I.waitForText('Resources', 5, '.io-ox-settings-main')
  I.forceClick('Resources', '.io-ox-settings-main')
  I.waitForText('Create new resource', 5, '.resource-administration')
  // check list view
  I.waitForText('DeLorean', 5, '.resource-administration')
  // reach list and detail popup view via keyboard
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Enter')
  // check detail popup
  I.waitForText('DeLorean', 5, '.detail-popup')
  I.waitForText('delorean@box.ox.io', 5, '.detail-popup')
  I.waitForText('Time machine. Used but in good shape.', 5, '.detail-popup')
  I.pressKey('Escape')
  I.waitForDetached('.detail-popup')
})

Scenario('Resources are editable', async ({ I, settings, users, autocomplete }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/core': { features: { managedResources: true } } }),
    I.haveResource({
      display_name: 'DeLorean',
      description: 'Time machine. Used but in good shape.',
      name: 'delorean@box.ox.io',
      mailaddress: 'delorean@box.ox.io',
      availability: false
    }),
    I.haveResource({
      display_name: 'Volkswagen Beetle',
      description: 'Type 1',
      name: 'beetle@box.ox.io',
      mailaddress: 'beetle@box.ox.io',
      availability: false
    }),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room'),
    I.haveGroup({ name: 'McFly', display_name: 'McFly', members: [users[0].get('id')] })
  ])
  I.login('settings=virtual/settings/administration/resources')
  I.waitForApp()

  I.waitForText('Create new resource', 5, '.resource-administration')
  I.waitForText('DeLorean', 5, '.resource-administration')
  // edit via context menu
  // TODO: next line is shaky as the context menu does not always appear
  I.rightClick('DeLorean', '.list-item')
  I.clickDropdown('Edit')
  I.waitForText('Edit resource', 5)
  // check validation
  I.fillField('Name', 'Volkswagen Beetle')
  I.pressKey('Tab')
  I.waitForText('This name is already used. Please choose a different one.', 5, '.error.help-block')
  // edit and save
  I.fillField('Name', 'DeLorean DMC-12')
  I.pressKey('Tab')
  I.dontSee('This name is already used. Please choose a different one.', '.modal')
  I.checkOption('Resource delegates manually accept or decline the booking request.')
  I.pressKey('Tab')
  I.waitForVisible('.add-members .tt-input')
  I.waitForEnabled('.add-members .tt-input')
  // add group
  I.fillField('Add delegates', 'McFly')
  autocomplete.select('McFly', '*')
  I.waitForInvisible(autocomplete.suggestions)
  I.waitForElement('.delegate-wrapper')
  I.see('McFly', '.delegate-wrapper')
  // TODO: next line is shaky as the groups is empty sometimes
  I.see('1 member', '.delegate-wrapper')
  // add myself as delegate
  I.fillField('Add delegates', users[0].get('name'))
  autocomplete.select(users[0].get('name'), '*')
  I.waitForInvisible(autocomplete.suggestions)
  I.waitForElement('.delegate-wrapper')
  I.seeNumberOfElements('.delegate-wrapper', 2)
  I.click(`~Remove ${users[0].get('name')}`)
  I.waitForDetached('.delegate-wrapper.user')
  I.seeNumberOfElements('.delegate-wrapper', 1)
  I.click('Save')
  // check changes in list view
  I.waitForInvisible('.recurrence-edit-dialog')
  I.waitForVisible('.io-ox-settings-main')
  I.waitForText('DeLorean DMC-12', 5, '.list-item')
  I.waitForElement('.list-item .bi-people', 5)
  // reedit resource
  I.rightClick('DeLorean', '.list-item')
  I.clickDropdown('Edit')
  I.waitForText('Edit resource', 5)
  I.checkOption('Booking requests are automatically accepted if the resource is free.')
  I.click('Save')
  // check changes in list view
  I.waitForInvisible('.recurrence-edit-dialog')
  I.waitForVisible('.io-ox-settings-main')
  I.waitForText('DeLorean', 5, '.list-item')
  I.waitForDetached('.list-item .bi-people', 5)
})

Scenario('Resources can be deleted', async ({ I, settings }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/core': { features: { managedResources: true, '.user': { managedResources: true } } } }),
    I.haveResource({
      display_name: 'DeLorean',
      description: 'Time machine. Used but in good shape.',
      name: 'delorean@box.ox.io',
      mailaddress: 'delorean@box.ox.io',
      availability: false
    }),
    I.haveResource({
      display_name: 'Volkswagen Beetle',
      description: 'Type 1',
      name: 'beetle@box.ox.io',
      mailaddress: 'beetle@box.ox.io',
      availability: false
    }),
    I.dontHaveResource('Meeting room'),
    I.dontHaveResource('Conference room')
  ])

  I.login('settings=virtual/settings/administration/resources')
  I.waitForApp()

  I.waitForText('DeLorean', 5, '.resource-administration')
  I.click('DeLorean', '.list-item')
  I.waitForText('DeLorean', 5, '.detail-popup')
  // delete and abort
  I.click('~Delete', '.detail-popup')
  I.waitForText('Delete resource', 5)
  I.see('"DeLorean"', '.modal-body')
  I.click('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForVisible('.detail-popup')
  // delete and confirm
  I.click('~Delete', '.detail-popup')
  I.waitForText('Delete resource', 5)
  I.click('Delete resource')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForInvisible('.detail-popup')
  // check list view
  I.waitForText('Volkswagen Beetle', 5, '.list-item')
  I.dontSee('DeLorean', '.list-item')
})
