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

Feature('Mobile > Accessibility > Settings')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
  await I.haveSetting('io.ox/core//features/templates', true)
})

After(async ({ users }) => { await users.removeAll() })

const options = {
  rules: {
    'meta-viewport': { enabled: false } // [CRITICAL] Zooming and scaling must not be disabled
  }
}

Scenario('General @mobile', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&section=io.ox/settings/general/language&settings=virtual/settings/io.ox/core'])
  I.waitForApp()
  I.wait(0.5)
  // ensure that a11y is achieved with collapsed sections as well
  expect(await I.grabAxeReport(options)).to.be.accessible
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Notifications @mobile', async ({ I, users, settings }) => {
  await users[0].hasCapability('switchboard') // enable Zoom
  I.login(['app=io.ox/mail&section=io.ox/settings/notifications/area&settings=virtual/settings/notifications'])
  I.waitForApp()
  I.wait(0.5)

  settings.expandSection('Calendar')
  settings.expandSection('Tasks')
  settings.expandSection('Zoom')
  settings.expandSection('Jitsi')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Security @mobile', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&section=io.ox/settings/security/images&settings=virtual/settings/security'])
  I.waitForApp()
  I.wait(0.5)
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Account @mobile', async ({ I, settings }) => {
  I.login(['app=io.ox/mail&section=io.ox/settings/accounts/subscriptions&settings=virtual/settings/io.ox/settings/accounts'])
  I.waitForApp()
  I.wait(0.5)
  settings.expandSection('External Apps')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Mail @mobile', async ({ I, settings }) => {
  I.login('section=io.ox/mail/settings/reading&settings=virtual/settings/io.ox/mail')
  I.waitForApp()
  I.wait(0.5)
  settings.expandSection('Signatures')
  settings.expandSection('Compose & Reply')
  settings.expandSection('Templates')
  settings.expandSection('Rules')
  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Calendar @mobile', async ({ I, users, settings }) => {
  await users[0].hasCapability('switchboard') // enable Zoom
  await I.waitForCapability('switchboard')
  I.login('section=io.ox/calendar/settings/view&settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  I.wait(0.5)

  settings.expandSection('Appointment reminders')
  settings.expandSection('Jitsi meetings')
  settings.expandSection('Advanced settings')
  settings.expandSection('Zoom meetings')
  expect(await I.grabAxeReport(options)).to.be.accessible
  I.refreshPage()
  I.waitForApp()
  I.wait(0.5)
  // with connected zoom account
  I.waitForText('Connect with Zoom')
  I.click('Connect with Zoom')
  I.waitForText('Grande, Harry', 30)
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Address Book @mobile', async ({ I, settings }) => {
  I.login('section=io.ox/contacts/settings/view&settings=virtual/settings/io.ox/contacts')
  I.waitForApp()
  I.wait(0.5)

  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Drive @mobile', async ({ I, settings }) => {
  I.login('section=io.ox/files/settings/add&settings=virtual/settings/io.ox/files')
  I.waitForApp()
  I.wait(0.5)

  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Portal @mobile', async ({ I, settings }) => {
  I.login('section=io.ox/portal/settings/widgets&settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.wait(0.5)

  settings.expandSection('Advanced settings')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Resources @mobile', async ({ I }) => {
  I.login('settings=virtual/settings/administration/resources')
  I.waitForApp()
  I.wait(0.5)

  // Empty list
  expect(await I.grabAxeReport(options)).to.be.accessible

  // Create new resource modal
  await I.dontHaveResource('Meeting room')
  I.refreshPage()
  I.waitForApp()
  I.wait(0.5)
  I.click('Create new resource')
  expect(await I.grabAxeReport(options)).to.be.accessible
  I.fillField('Name', 'Meeting room')
  I.fillField('Email address', 'meeting-room@example.com')
  I.click('Create')
  I.waitForDetached('.resource-editor-dialog')

  // Populated list
  expect(await I.grabAxeReport(options)).to.be.accessible

  // Resource detail view
  I.click('Meeting room')
  expect(await I.grabAxeReport(options)).to.be.accessible
})

Scenario('Download personal data @mobile', async ({ I, settings }) => {
  I.login('settings=virtual/settings/personaldata')
  I.waitForApp()
  I.wait(0.5)

  expect(await I.grabAxeReport(options)).to.be.accessible
})
