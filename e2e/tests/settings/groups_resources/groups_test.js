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

Feature('Settings > Groups')

Before(async ({ users }) => {
  await users.create()
  await Promise.all([
    users[0].hasModuleAccess({ editGroup: 'true', editResource: 'true' })
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-1898] Check if groups editor is showing (oauth-grants set)', async ({ I, settings, users }) => {
  await users[0].context.hasCapability('oauth-grants')

  I.login('settings=virtual/settings/administration/groups')
  I.waitForApp()
  I.waitForText('Create new group', 5, '.group-administration')
})

Scenario('[OXUIB-1898] Check if groups editor is showing up', async ({ I, settings, users }) => {
  I.login('settings=virtual/settings/administration/groups')
  I.waitForApp()
  I.waitForText('Create new group', 5, '.group-administration')
})

Scenario('[OXUIB-1898] Check if group can be added and deleted', async ({ I, settings, users, dialogs }) => {
  const name = 'Groupies'
  I.login('settings=virtual/settings/administration/groups')
  I.waitForApp()
  I.waitForText('Create new group', 5, '.group-administration')
  I.forceClick('Create new group', '.group-administration')
  I.waitForText('Group name', 5, '.administration-group-editor')
  I.fillField('display_name', name)
  I.fillField('.form-control.tt-input', users[0].get('primaryEmail'))
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Create')
  I.waitForDetached('Group name')
  I.waitForText(name)

  // edit the group (regression test for OXUIB-2127)
  I.click(locate('li.selectable').withText(name))
  I.waitForText(name, 5, 'h2')
  I.click('Edit')
  I.waitForText('Edit group')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.dontSee('The server is refusing to process the request.')

  // delete the group
  I.click('Delete')
  I.waitForText('Delete group')
  dialogs.clickButton('Delete group')
  I.waitForDetached('Delete group')
  I.waitForText('Groups')
  I.waitForInvisible(name)
})

Scenario('Check if group can be edited', async ({ I, users, dialogs }) => {
  const name = 'Test group'
  const newName = 'Edited group'
  I.login('settings=virtual/settings/administration/groups')
  await I.dontHaveGroup(name)
  I.waitForApp()
  I.waitForText('Create new group', 5, '.group-administration')
  I.forceClick('Create new group', '.group-administration')
  I.waitForText('Group name', 5, '.administration-group-editor')
  I.fillField('display_name', name)
  I.fillField('.form-control.tt-input', users[0].get('primaryEmail'))
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Create')
  I.waitForDetached('Group name')
  I.waitForText(name)

  // edit the group
  I.click(locate('li.selectable').withText(name))
  I.waitForText(name, 5, 'h2')
  I.click('Edit')
  I.waitForText('Edit group')
  I.waitForVisible('.form-control[name="display_name"]')
  I.fillField('display_name', newName)
  dialogs.clickButton('Save')
  I.waitForDetached('Edit group')
  I.waitForText(newName)
  I.dontSee(name)
})
