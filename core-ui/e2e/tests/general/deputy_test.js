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

Feature('General > Deputy Management')

Before(async ({ users, contexts }) => {
  await users.create()
  await Promise.all([
    users[0].context.hasConfig('com.openexchange.deputy.enabled', true),
    users[0].context.hasCapability('deputy')
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Show manage deputies button in settings', async ({ I, users, settings }) => {
  I.login('app=io.ox/mail&settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  I.waitForText('Manage deputies')
  I.click('Manage deputies')
  I.waitForElement('.deputy-dialog-body')
})

Scenario('Show manage deputies button in foldertrees', async ({ I, users, calendar, mail, dialogs }) => {
  await I.waitForCapability('deputy')

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForEnabled(`~Actions for ${users[0].get('sur_name')}, ${users[0].get('given_name')}`)
  I.click(`~Actions for ${users[0].get('sur_name')}, ${users[0].get('given_name')}`)
  I.waitForText('Manage deputies', 5, '.smart-dropdown-container.open')
  I.click('Manage deputies', '.smart-dropdown-container.open')
  I.waitForElement('.deputy-dialog-body')
  dialogs.clickButton('Close')

  I.openApp('Mail')
  I.waitForApp()

  I.waitForEnabled('~Actions for Inbox')
  I.click('~Actions for Inbox')
  I.waitForText('Manage deputies', 5, '.smart-dropdown-container.open')
  I.click('Manage deputies', '.smart-dropdown-container.open')
  I.waitForElement('.deputy-dialog-body')
})

Scenario('Can add edit and remove deputies', async ({ I, users, dialogs, settings }) => {
  await users.create()
  await I.waitForCapability('deputy')

  I.login('app=io.ox/mail&settings=virtual/settings/io.ox/core&section=io.ox/settings/general/advanced')
  I.waitForApp()
  const button = locate('button').withText('Manage deputies ...').as('Manage deputies ...')
  I.waitForElement(button)
  I.scrollTo(button)
  I.click('Manage deputies ...')

  I.waitForElement('.deputy-dialog-body .add-participant.tt-input')
  I.fillField('Add people', users[1].get('primaryEmail'))
  I.pressKey('Enter')

  I.waitForText('The deputy has the following permissions')
  I.click('Deputy can send emails on your behalf')
  dialogs.clickButton('Save')

  I.waitForText('Allowed to send emails on your behalf, Inbox (Viewer), Calendar (Viewer)')
  I.seeElement('.deputy-list-view li .flex-item')
  I.click('Edit')

  I.waitForText('The deputy has the following permissions')
  I.click('Deputy can send emails on your behalf')
  I.selectOption('Inbox', 'Author (create/edit/delete emails)')
  I.selectOption('Calendar', 'None')
  dialogs.clickButton('Save')

  I.waitForText('Inbox (Author), Calendar (None)')
  I.click('~Remove')

  I.waitForText('Do you want to remove ' + users[1].get('sur_name') + ', ' + users[1].get('given_name') + ' from your deputy list?')
  dialogs.clickButton('Remove')

  I.waitForText('Manage deputies')
  I.waitForInvisible('.deputy-list-view li .flex-item')
})
