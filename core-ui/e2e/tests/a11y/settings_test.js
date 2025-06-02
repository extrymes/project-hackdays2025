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

const { expect } = require('chai')

Feature('Accessibility')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Settings - General', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/core'])
  I.waitForApp()

  // ensure that a11y is achieved with collapsed sections as well
  I.wait(1)
  expect(await I.grabAxeReport()).to.be.accessible

  settings.expandSection('Language & Time zone')
  settings.expandSection('Start app & Quick launch bar')
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Notifications', async ({ I, settings, users }) => {
  await users[0].hasCapability('switchboard') // enable Zoom

  I.login(['app=io.ox/mail&settings=virtual/settings/notifications'])
  I.waitForApp()
  settings.expandSection('Notification area')
  settings.expandSection('Mail')
  settings.expandSection('Calendar')
  settings.expandSection('Tasks')
  settings.expandSection('Zoom')
  settings.expandSection('Jitsi')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Security', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/security'])
  I.waitForApp()
  settings.expandSection('External images in emails')
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Accounts', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/settings/accounts'])
  I.waitForApp()
  settings.expandSection('Subscriptions')
  settings.expandSection('External Apps')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Mail', async ({ I, settings }) => {
  I.haveSetting('io.ox/core//features/templates', true)
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/mail'])
  I.waitForApp()
  settings.expandSection('Signatures')
  settings.expandSection('Compose & Reply')
  settings.expandSection('Templates')
  settings.expandSection('Rules')
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Calendar', async ({ I, settings, users }) => {
  await users[0].hasCapability('switchboard') // enable Zoom

  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/calendar'])
  I.waitForApp()

  I.refreshPage() // otherwise zoom integration doesn't get loaded
  I.waitForApp()

  settings.expandSection('Appointment reminders')
  settings.expandSection('Additional time zones')
  settings.expandSection('Zoom meetings')
  settings.expandSection('Jitsi meetings')
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible

  // with connected zoom account
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForText('Grande, Harry', 30)
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Address Book', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/contacts'])
  I.waitForApp()
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Drive', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/files'])
  I.waitForApp()
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Settings - Portal', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/portal'])
  I.waitForApp()
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Resources', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/administration/resources'])
  I.waitForApp()
  I.wait(1)

  // Empty list
  expect(await I.grabAxeReport()).to.be.accessible

  // Create new resource modal
  await I.dontHaveResource('Meeting room')
  I.refreshPage()
  I.waitForApp()
  I.wait(0.5)
  I.click('Create new resource')
  expect(await I.grabAxeReport()).to.be.accessible
  I.fillField('Name', 'Meeting room')
  I.fillField('Email address', 'meeting-room@example.com')
  I.click('Create')
  I.waitForDetached('.resource-editor-dialog')

  // Populated list and esource detail view
  I.click('Meeting room')
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Groups', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/administration/groups'])
  I.waitForApp()
  I.wait(1)
  expect(await I.grabAxeReport()).to.be.accessible
})

Scenario('Download personal data', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&settings=virtual/settings/personaldata'])
  I.waitForApp()
  I.wait(1)
  expect(await I.grabAxeReport()).to.be.accessible
})
