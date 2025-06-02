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

Feature('Tasks > Misc')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[Z104304] Subscribe shared folder and Unsubscribe shared folder', async ({ I, users, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  const sharedFolderName = `${users[0].get('sur_name')}, ${users[0].get('given_name')}: New folder`
  const busystate = locate('.modal modal-body.invisible')

  await I.haveFolder({
    title: 'New folder',
    module: 'tasks',
    parent: defaultFolder
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('My lists')
  I.retry(5).doubleClick('My lists')

  I.waitForText('New folder')
  I.rightClick('[aria-label^="New folder"]')
  I.waitForText('Share / Permissions')
  I.wait(0.2)
  I.click('Share / Permissions')
  I.waitForText('Permissions for folder "New folder"')
  I.waitForDetached(busystate)
  I.wait(0.5)

  I.fillField('.modal-dialog .tt-input', users[1].get('primaryEmail'))
  I.waitForText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, undefined, '.tt-dropdown-menu')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.click('Save')
  I.waitToHide('.share-permissions-dialog')
  I.logout()

  I.login('app=io.ox/tasks', { user: users[1] })
  I.retry(5).doubleClick('~Shared lists')
  I.waitForText(sharedFolderName)
  I.retry(5).click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared task folders')
  I.waitForText('Subscribe to shared task folders', 5, '.modal')

  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="used_for_sync"]' }))

  const blockLocator = locate('.item-block').withChild(locate('h4').withText('Shared tasks folders'))
  I.click(locate('.toggle').inside(blockLocator))

  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForInvisible(locate('*').withText(sharedFolderName))

  I.retry(5).click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared task folders')
  I.waitForText('Subscribe to shared task folders', 5, '.modal')

  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('.toggle').inside(blockLocator))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'input[name="used_for_sync"]' }))
  I.click(locate('li').withChild(locate('*').withText(sharedFolderName)).find({ css: 'label' }).withText('Sync via DAV'))

  I.click('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForText(sharedFolderName)
})
