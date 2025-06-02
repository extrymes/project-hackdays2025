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

Feature('Widget Provisioning')

Before(async ({ users }) => {
  await users.create()
})

After(async ({ users }) => {
  await users.removeAll()
})

Scenario('Supports default values for widgets', async ({ I, users }) => {
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.see('Inbox', '.widget')
  I.see('Appointments', '.widget')
  I.see('My tasks', '.widget')
  I.see('Birthdays', '.widget')
  I.see('My latest files', '.widget')
  I.dontSee('Get OX Drive', '.widget')
})

Scenario('Provide default set of default widgets to user (eager)', async ({ I, users }) => {
  I.haveSetting('io.ox/portal//widgets/eager/gen_0', {
    oxdriveclients_0: {
      enabled: true,
      color: 'blue',
      plugin: 'pe/portal/plugins/oxdriveclients/register',
      type: 'oxdriveclients',
      index: 'first'
    },
    mail_0: {
      enabled: true,
      color: 'green',
      // legacy plugin path
      plugin: 'plugins/portal/mail/register',
      type: 'mail',
      index: 1
    }
  })
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.see('Get OX Drive', '.widget')
  I.see('Inbox', '.widget')
  I.click('~Inbox, Disable widget')
  I.click('~Get OX Drive, Disable widget')
  I.dontSeeElement('.widget')
})

Scenario('Provide default set of default widgets to user (protected)', async ({ I, users }) => {
  I.haveSetting('io.ox/portal//widgets/protected', {
    oxdriveclients_0: {
      enabled: true,
      color: 'blue',
      plugin: 'pe/portal/plugins/oxdriveclients/register',
      type: 'oxdriveclients',
      index: 'first',
      changeable: { index: true }
    },
    mail_0: {
      enabled: true,
      color: 'green',
      // legacy plugin path
      plugin: 'plugins/portal/mail/register',
      type: 'mail',
      index: 1
    }
  })
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.see('Get OX Drive', '.widget')
  I.see('Inbox', '.widget')
  I.dontSeeElement('.disable-widget')
  I.seeNumberOfElements('.widget.draggable', 1)
})

Scenario('Disable a widget completely', async ({ I, users }) => {
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.click('Add widget')
  I.see('Inbox', '.dropdown')
  I.see('Storage', '.dropdown')
  I.logout()
  I.haveSetting('io.ox/portal//widgets/protected', {
    quota_0: {
      enabled: false,
      id: 'quota_0',
      color: 'green',
      index: 1,
      inverse: false,
      plugin: 'pe/portal/plugins/quota/register',
      type: 'quota'
    }
  })
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.click('Add widget')
  I.see('Inbox', '.dropdown')
  I.dontSee('Storage', '.dropdown')
})
