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

Feature('Switchboard > Zoom')

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  await users[0].context.hasCapability('switchboard')
})

After(async ({ users }) => { await users.removeAll() })

Scenario('User can see zoom settings if presence is disabled', async ({ I, settings }) => {
  await I.haveSetting('io.ox/core//features/presence', false)
  I.login('settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  I.see('Zoom meetings')
})

Scenario('User can select Zoom in appointments if presence is disabled', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/presence', false)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.waitForText('Conference', 5, calendar.editWindow)
  I.seeElementInDOM('option[value="zoom"]')
})

Scenario('User can connect zoom account through settings', async ({ I, settings }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('settings=virtual/settings/io.ox/calendar&section=io.ox/calendar/settings/zoom')
  I.waitForApp()
  I.waitForText('Connect with Zoom', 5, settings.main)
  I.click('Connect with Zoom')
  I.waitForText('You have linked the following Zoom account', 10, settings.main)
})

Scenario('User can connect zoom account through appointments', async ({ I, calendar }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.waitForText('Conference', 5, calendar.editWindow)
  I.selectOption('conference-type', 'zoom')
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForVisible('.conference-view.zoom > .conference-logo')
  I.waitForText('Link', 5, '.conference-view.zoom')
  I.dontSee('Connect with Zoom')
})

Scenario('User can connect zoom account through address book', async ({ I, users, contacts, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/contacts&folder=6')
  I.waitForElement('.io-ox-contacts-window')
  I.waitForVisible('.io-ox-contacts-window .classic-toolbar')
  I.waitForVisible('.io-ox-contacts-window .tree-container')
  contacts.selectContact(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`)
  I.waitForText('Call', 5, '.horizontal-action-buttons')
  I.click('Call')
  I.waitForText('Call via Zoom', 5, '.dropdown.open')
  I.click('Call via Zoom')
  dialogs.waitForVisible()
  I.waitForText('You first need to connect OX App Suite with Zoom.', 5, dialogs.body)
  I.click('Connect with Zoom', dialogs.footer)
  I.waitForText('Call', 5, dialogs.footer)
  I.dontSee('You first need to connect OX App Suite with Zoom.')
  I.dontSee('Connect with Zoom')
})

Scenario('[OXUIB-420] Compose mail and invite to appointment from addressbook', async ({ I, calendar, dialogs }) => {
  await I.haveSetting('io.ox/core//features/presence', true)
  I.login('app=io.ox/contacts&folder=6')
  I.waitForElement('.io-ox-contacts-window')
  I.waitForVisible('.io-ox-contacts-window .classic-toolbar')
  I.waitForVisible('.io-ox-contacts-window .tree-container')
  I.waitForText('Call', 5, '.horizontal-action-buttons')

  I.click('Email', '.horizontal-action-buttons')
  I.waitForVisible('.io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.io-ox-mail-compose [placeholder="To"]')
  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete draft')
  I.waitForDetached('.io-ox-mail-compose-window')

  I.click('Invite', '.horizontal-action-buttons')
  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.click('~Close', calendar.editWindow)
})
