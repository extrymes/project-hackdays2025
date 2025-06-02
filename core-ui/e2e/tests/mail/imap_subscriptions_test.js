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

Feature('Settings > Mail > IMAP subscriptions')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUI-1157] Returns focus from Change IMAP Subscription Modal', async ({ I }) => {
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText('Change IMAP subscriptions ...')
  I.click('Change IMAP subscriptions ...')
  I.waitForVisible('.modal.subscribe-imap-folder')
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Escape')
  I.waitForDetached('.modal.subscribe-imap-folder')
  I.waitForFocus('[data-action="change-image-supscriptions"]')
})

Scenario('[7783] Unsubscribe folder', async ({ I, settings }) => {
  await Promise.all([
    I.haveFolder({ title: 'First Folder', module: 'mail', parent: 'default0' }),
    I.haveFolder({ title: 'Second Folder', module: 'mail', parent: 'default0' })
  ])
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText('Change IMAP subscriptions ...')
  I.click('Change IMAP subscriptions ...')
  I.waitForVisible('.modal.subscribe-imap-folder')
  I.waitForText('E-Mail')
  I.waitForText('First Folder')
  I.click('.folder [value="default0/First Folder"]')
  I.click('Save')
  I.waitForDetached('.modal.subscribe-imap-folder')
  settings.close()

  I.waitForApp()

  I.click('.tree-container [data-model="virtual/myfolders"] .folder-arrow')
  I.waitForText('Second Folder')
  I.dontSee('First Folder')
})

Scenario('[7784] Subscribe folder', async ({ I, mail, settings }) => {
  await Promise.all([
    I.haveFolder({ title: 'First Folder', module: 'mail', parent: 'default0' }),
    I.haveFolder({ title: 'Second Folder', module: 'mail', parent: 'default0' })
  ])
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText('Change IMAP subscriptions ...')
  I.click('Change IMAP subscriptions ...')
  I.waitForVisible('.modal.subscribe-imap-folder')
  I.waitForText('E-Mail')
  I.waitForText('First Folder')
  I.click('Save')
  I.waitForDetached('.modal.subscribe-imap-folder')
  settings.close()
  I.waitForApp()

  I.click('.tree-container [data-model="virtual/myfolders"] .folder-arrow')
  I.waitForText('Second Folder')
  I.see('First Folder')
})
