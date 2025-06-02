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

/// <reference path="../../steps.d.ts" />

Feature('General > Mobile App Launcher')

Before(async ({ I, users }) => {
  await users.create()

  // open mobile app launcher but don't load any app
  I.haveSetting({ 'io.ox/core': { autoStart: 'none' } })
  I.emulateSmartphone()
  I.login()
  I.waitForNetworkTraffic()
  I.waitForElement('#io-ox-launcher', 30)
  I.click('#io-ox-launcher button')
  I.waitForElement('.launcher-dropdown', 5)
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Launch "Change contact photo" application @mobile @smoketest', ({ I }) => {
  I.click('.launcher-dropdown .user-picture-container')
  I.waitForText('Change contact photo', 5, '.modal.edit-picture .modal-title')
})

Scenario('Launch "E-Mail" application @mobile @smoketest', ({ I }) => {
  I.click('Mail', '.launcher-dropdown')
  I.waitForText('Inbox', 5, '.io-ox-mail-window .mobile-navbar .navbar-title')
})

Scenario('Launch "Calendar" application @mobile @smoketest', ({ I }) => {
  I.click('Calendar', '.launcher-dropdown')
  I.waitForText('Today', 5, '.io-ox-calendar-window .mobile-toolbar')
})

Scenario('Launch "Address Book" application @mobile @smoketest', ({ I }) => {
  I.click('Address Book', '.launcher-dropdown')
  I.waitForText('Contacts', 5, '.io-ox-contacts-window .navbar-title')
})

Scenario('Launch "Tasks" application @mobile @smoketest', ({ I }) => {
  I.click('Tasks', '.launcher-dropdown')
  I.waitForText('This task list is empty', 5, '.io-ox-tasks-window')
})

Scenario('Launch "Drive" application @mobile @smoketest', ({ I }) => {
  I.click('Drive', '.launcher-dropdown')
  I.waitForText('My files', 5, '.io-ox-files-window')
})

Scenario('Launch "Portal" application @mobile @smoketest', ({ I }) => {
  I.click('Portal', '.launcher-dropdown')
  I.waitForElement('.window-content.io-ox-portal .greeting-phrase', 5)
})

Scenario('Launch "Edit personal information" application @mobile @smoketest', ({ I }) => {
  I.click('Edit personal data', '.launcher-dropdown')
  I.waitForText('First name', 5, '.io-ox-contacts-edit-window')
})

Scenario('Launch "Settings" application @mobile @smoketest', ({ I }) => {
  I.click('Settings', '.launcher-dropdown')
  I.waitForText('Settings', 5, '~Settings Folders')
})

Scenario('Launch "Connect this device" application @mobile @smoketest', ({ I }) => {
  I.click('Connect this device', '.launcher-dropdown')
  I.waitForText('Connect your device', 5, '.wizard-header')
})

Scenario('Launch "Help" application @mobile @smoketest', async ({ I }) => {
  I.click('Help', '.launcher-dropdown')
  I.waitForElement('.inline-help-iframe', 5)
  await within({ frame: '.inline-help-iframe' }, async () => {
    I.waitForText('User Guide', 5)
  })
})

Scenario('Launch "Updates" modal @mobile @smoketest', ({ I }) => {
  I.click('Updates', '.launcher-dropdown')
  I.waitForText('Updates', 5, '.modal.mobile-dialog.whats-new-dialog')
})

Scenario('Launch "Give feedback" modal @mobile @smoketest', ({ I }) => {
  I.click('Give feedback', '.launcher-dropdown')
  I.waitForText('We appreciate your feedback', 5, '.modal.mobile-dialog .modal-header')
})

Scenario('Launch "About" modal @mobile @smoketest', ({ I }) => {
  I.click('About', '.launcher-dropdown')
  I.waitForText('OX App Suite', 5, '.modal.mobile-dialog.about-dialog .modal-header')
})

Scenario('Sign out @mobile @smoketest', ({ I }) => {
  I.click('Sign out', '.launcher-dropdown')
  I.waitForText('Sign in', 5, '#io-ox-login-form')
})

Scenario('Close app launcher @mobile @smoketest', ({ I }) => {
  I.click('.btn-close')
  I.waitForDetached('.smart-dropdown-container .launcher-dropdown', 1)
})

Scenario('Don\'t close app launcher when not clicking on a menu item @mobile @smoketest', ({ I }) => {
  // regression test to prevent the default dropdown behaviour, where the dropdown closes when clicking anywhere
  I.click('.user .text-container')
  I.wait(0.5)
  I.seeElement('.smart-dropdown-container .launcher-dropdown')
})
