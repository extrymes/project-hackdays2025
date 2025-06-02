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

Feature('Mailfilter > Apply to folder')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C290529] Refilter mails in INBOX folder', async ({ I, users, dialogs, settings }) => {
  await Promise.all([
    I.haveMail({
      from: users[0],
      to: users[0],
      subject: 'foobar',
      content: 'nothing special'
    }),
    I.haveFolder({ title: 'foo', module: 'mail', parent: 'default0/INBOX' }),
    I.haveMailFilterRule({
      id: 0,
      position: 0,
      rulename: 'no foobar in inbox',
      active: true,
      flags: [],
      test: { id: 'subject', comparison: 'contains', values: ['foobar'] },
      actioncmds: [{ id: 'move', into: 'default0/INBOX/foo' }]
    })
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('Add new rule', 30, '.settings-detail-pane')

  I.click('Apply')
  dialogs.waitForVisible()
  I.waitForElement(locate('.modal .folder.selected').withText('Inbox'))
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForText('Apply')
  I.waitForElement('~Currently refreshing')
  I.waitForElement('~Refresh')
  settings.close()

  I.waitToHide('foobar')
  I.waitForText('This folder is empty')
  I.selectFolder('foo')
  I.waitForElement('.list-view .list-item .subject .drag-title', 10)
  I.see('foobar', '.list-view .list-item .subject .drag-title')
})

Scenario('[C290530] Create and apply new filter rule', async ({ I, users, dialogs, settings }) => {
  await Promise.all([
    I.haveMail({
      from: users[0],
      to: users[0],
      subject: 'foobar',
      content: 'nothing special'
    }),
    I.haveFolder({ title: 'foo', module: 'mail', parent: 'default0/INBOX' })
  ])
  I.login()
  I.waitForText('nothing special')
  I.waitForText('foobar', 5, '.subject')
  settings.open('Mail', 'Rules')
  I.waitForText('Add new rule')
  I.click('Add new rule')
  dialogs.waitForVisible()

  I.fillField('Rule name', 'move foobar mails')

  I.click('Add condition')
  I.clickDropdown('Subject')
  // Should wait for focus on input field, see: https://jira.open-xchange.com/browse/OXUI-1163
  I.wait(0.5)
  I.fillField('Subject Contains', 'foobar')
  I.click('Add action')
  I.click('File into')
  I.click('Select folder')
  dialogs.waitForVisible()
  I.waitForText('foo', 5, '.folder-picker-dialog')
  // I.click(locate('.modal .folder.selectable .folder-node').withText('foo'))
  I.click('.folder-node[title*="foo"]', '.folder-picker-dialog')
  dialogs.clickButton('Select')

  I.waitForText('Create new rule', 5, dialogs.header)
  dialogs.clickButton('Save and apply rule now')
  I.waitForVisible(locate('.folder.selected').withText('Inbox'))
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForText('Apply')
  I.waitForElement('~Currently refreshing')
  I.waitForElement('~Refresh')
  settings.close()

  I.waitToHide('foobar')
  I.waitForText('This folder is empty')
  I.selectFolder('foo')
  I.waitForElement('.list-view .list-item .subject .drag-title', 10)
  I.see('foobar', '.list-view .list-item .subject .drag-title')
})

Scenario('[C290531] Edit and apply existing filter rule', async ({ I, users, dialogs, settings }) => {
  await Promise.all([
    I.haveMail({
      from: users[0],
      to: users[0],
      subject: 'foobar',
      content: 'nothing special'
    }),
    I.haveFolder({ title: 'foo', module: 'mail', parent: 'default0/INBOX' }),
    I.haveMailFilterRule({
      id: 0,
      position: 0,
      rulename: 'no foobar in inbox',
      active: true,
      flags: [],
      test: { id: 'subject', comparison: 'contains', values: ['foobar'] },
      actioncmds: [{ id: 'move', into: 'default0/INBOX/foo' }]
    })
  ])
  I.login()
  I.waitForText('nothing special')
  I.waitForText('foobar', 5, '.subject')
  settings.open('Mail', 'Rules')
  I.waitForText('Add new rule', 30, '.settings-detail-pane')

  I.click('Edit')
  dialogs.waitForVisible()
  I.fillField('Rule name', 'no foo in inbox')
  I.fillField('Subject Contains', 'foo')
  dialogs.clickButton('Save and apply rule now')
  I.waitForVisible(locate('.modal .folder.selected').withText('Inbox'))
  dialogs.clickButton('Apply filter rule')

  I.waitForText('Apply')
  I.waitForElement('~Currently refreshing')
  I.waitForElement('~Refresh')
  settings.close()

  I.openApp('Mail')
  I.waitToHide('foobar')
  I.waitForText('This folder is empty')
  I.selectFolder('foo')
  I.waitForElement('.list-view .list-item .subject .drag-title', 10)
  I.see('foobar', '.list-view .list-item .subject .drag-title')
})
