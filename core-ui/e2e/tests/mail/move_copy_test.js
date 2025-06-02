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

Feature('Mail > Move/Copy')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7407] Move mail from inbox to a sub-folder', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveMail({
      attachments: [{ content: '<p>C7407-subject</p>', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      sendtype: 0,
      subject: 'C7407-subject',
      to: users[0]
    }),
    I.haveFolder({ title: 'C7407-folder', module: 'mail', parent: 'default0/INBOX' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.click('.list-view .selectable:not(.selected)')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/move"]')

  I.waitForElement('.folder-picker-dialog')
  I.click('.folder-picker-dialog .folder[data-id="virtual/myfolders"] .folder-arrow')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7407-folder"]')
  I.click('.folder-picker-dialog .folder[data-id="default0/INBOX/C7407-folder"]')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7407-folder"].selected')
  I.waitForEnabled('.folder-picker-dialog button[data-action="ok"]')
  I.click('Move', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.seeTextEquals('This folder is empty', '.list-view .notification')

  I.selectFolder('C7407-folder')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C7407-subject', 5, '.list-view.mail-item')
})

Scenario('[C7408] Move several mails from inbox to a sub-folder', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//listViewLayout', 'checkboxes'),
    I.haveMails([
      {
        subject: 'C7408-1',
        attachments: [{ content: '<p>C7408-1</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        sendtype: 0,
        to: users[0]
      }, {
        subject: 'C7408-2',
        attachments: [{ content: '<p>C7408-2</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }, {
        subject: 'C7408-3',
        attachments: [{ content: '<p>C7408-3</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }
    ]),
    I.haveFolder({ title: 'C7408-folder', module: 'mail', parent: 'default0/INBOX' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.click('~Move')
  I.waitForElement('.folder-picker-dialog')
  I.click('.folder-picker-dialog .folder[data-id="virtual/myfolders"] .folder-arrow')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7408-folder"]')
  I.click('.folder-picker-dialog .folder[data-id="default0/INBOX/C7408-folder"]')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7408-folder"].selected')
  I.waitForEnabled('.folder-picker-dialog button[data-action="ok"]')
  I.click('Move', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.seeTextEquals('This folder is empty', '.list-view .notification')

  I.selectFolder('C7408-folder')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 3)
  I.waitForText('C7408-1', 5, '.list-view.mail-item')
  I.waitForText('C7408-2', 5, '.list-view.mail-item')
  I.waitForText('C7408-3', 5, '.list-view.mail-item')
})

Scenario('[C7409] Copy mail from inbox to a sub-folder', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveMail({
      subject: 'C7409-2',
      attachments: [{ content: '<p>C7409-2</p>', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      to: users[0],
      sendtype: 0
    }),
    I.haveFolder({ title: 'C7409-1', module: 'mail', parent: 'default0/INBOX' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('C7409')
  I.click('~More actions', '.mail-detail-pane')
  I.clickDropdown('Copy')
  I.waitForElement('.folder-picker-dialog')
  I.click('.folder-picker-dialog .folder[data-id="virtual/myfolders"] .folder-arrow')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7409-1"]')
  I.click('.folder-picker-dialog .folder[data-id="default0/INBOX/C7409-1"]')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7409-1"].selected')
  I.waitForEnabled('.folder-picker-dialog button[data-action="ok"]')
  I.click('Copy', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C7409-2', 5, '.list-view.mail-item')

  I.selectFolder('C7409-1')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C7409-2', 5, '.list-view.mail-item')
})

Scenario('[C7410] Copy several mails from inbox to a sub-folder', async ({ I, users, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//listViewLayout', 'checkboxes'),
    I.haveMails([
      {
        subject: 'C7410-1',
        attachments: [{ content: '<p>C7410-1</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }, {
        subject: 'C7410-2',
        attachments: [{ content: '<p>C7410-2</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }, {
        subject: 'C7410-3',
        attachments: [{ content: '<p>C7410-3</p>', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }
    ]),
    I.haveFolder({ title: 'C7410', module: 'mail', parent: 'default0/INBOX' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.click('.list-view .selectable:not(.selected) .list-item-checkmark')
  I.waitForVisible('.classic-toolbar-container')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.classic-toolbar-container')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/copy"]')
  I.waitForElement('.folder-picker-dialog')
  I.click('.folder-picker-dialog .folder[data-id="virtual/myfolders"] .folder-arrow')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7410"]')
  I.click('.folder-picker-dialog .folder[data-id="default0/INBOX/C7410"]')
  I.waitForElement('.folder-picker-dialog .folder[data-id="default0/INBOX/C7410"].selected')
  I.waitForEnabled('.folder-picker-dialog button[data-action="ok"]')
  I.click('Copy', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 3)
  I.waitForText('C7410-1', 5, '.list-view.mail-item')
  I.waitForText('C7410-2', 5, '.list-view.mail-item')
  I.waitForText('C7410-3', 5, '.list-view.mail-item')
  I.selectFolder('C7410')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 3)
  I.waitForText('C7410-1', 5, '.list-view.mail-item')
  I.waitForText('C7410-2', 5, '.list-view.mail-item')
  I.waitForText('C7410-3', 5, '.list-view.mail-item')
})

Scenario('[C114349] Create folder within move dialog', async ({ I, users, mail }) => {
  await I.haveMail({
    subject: 'C114349-move',
    attachments: [{ content: '<p>C114349-move</p>', content_type: 'text/html', disp: 'inline' }],
    from: users[0],
    to: users[0],
    sendtype: 0
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.click('.list-view .selectable:not(.selected)')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/move"]')
  I.waitForVisible('.folder-picker-dialog')
  I.click('Create folder', '.folder-picker-dialog')
  I.waitForElement('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.fillField('Folder name', 'C114349-move')
  I.click('Add')

  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.waitForText('C114349-move', undefined, '.folder-picker-dialog .selected:not(.disabled) .folder-label')
  I.click('Move', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.seeTextEquals('This folder is empty', '.list-view .notification')

  I.selectFolder('C114349-move')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C114349-move', 5, '.list-view.mail-item')
})

Scenario('[C114349] Create folder within copy dialog', async ({ I, users, mail }) => {
  await I.haveMail({
    subject: 'C114349-copy',
    attachments: [{ content: '<p>C114349-copy</p>', content_type: 'text/html', disp: 'inline' }],
    from: users[0],
    to: users[0],
    sendtype: 0
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.click('.list-view .selectable:not(.selected)')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/copy"]')
  I.waitForVisible('.folder-picker-dialog')
  I.click('Create folder', '.folder-picker-dialog')
  I.waitForElement('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.fillField('Folder name', 'C114349-copy')
  I.click('Add')

  I.waitForDetached('.modal[data-point="io.ox/core/folder/add-popup"]')
  I.waitForText('C114349-copy', undefined, '.folder-picker-dialog .selected:not(.disabled) .folder-label')
  I.click('Copy', '.folder-picker-dialog')
  I.waitForDetached('.folder-picker-dialog')

  I.selectFolder('Inbox')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C114349-copy', 5, '.list-view.mail-item')

  I.selectFolder('C114349-copy')
  I.waitNumberOfVisibleElements('.list-view li.list-item', 1)
  I.waitForText('C114349-copy', 5, '.list-view.mail-item')
})

Scenario('[OXUIB-1643] Move mails to trigger pagination', async ({ I, users, mail }) => {
  /** This is solved with tabs see drive/folder_test.js for sessions */

  await Promise.all([
    I.haveSetting('io.ox/mail//listview/primaryPageSize', 2),
    I.haveSetting('io.ox/core//refreshInterval', 3000000),
    I.haveMails([
      {
        subject: 'subject0',
        attachments: [{ content: 'content', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0

      },
      {
        subject: 'subject1',
        attachments: [{ content: 'content', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      },
      {
        subject: 'subject2',
        attachments: [{ content: 'content', content_type: 'text/html', disp: 'inline' }],
        from: users[0],
        to: users[0],
        sendtype: 0
      }
    ])
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.pressKeyDown('Command')
  mail.selectMail('subject1')
  I.click('subject2')
  I.pressKeyUp('Command')

  I.clickToolbar('~Move')

  I.waitForElement('.folder-picker-dialog')
  I.waitForText('Drafts', 5, '.folder-picker-dialog')
  I.click('~Drafts', '.folder-picker-dialog')
  I.waitForElement(locate('.folder-picker-dialog .selected').withText('Drafts'))
  I.click('Move', '.folder-picker-dialog')

  I.waitForDetached('.folder-picker-dialog')
  I.waitForElement('.mail-detail-frame')

  /** Tab2 move back */
  I.usePuppeteerTo('open new tab', async function ({ browser }) {
    const newTab = await browser.newPage()
    await newTab.goto(process.env.LAUNCH_URL)
  })
  I.switchToNextTab()
  I.waitForApp()
  I.selectFolder('Drafts')
  I.pressKeyDown('Command')
  mail.selectMail('subject1')
  I.click('subject2')
  I.pressKeyUp('Command')

  I.clickToolbar('~Move')
  I.waitForElement('.folder-picker-dialog')
  within('.folder-picker-dialog', () => {
    I.waitForText('Inbox')
    I.click('~Inbox')
    I.waitForElement(locate('.selected').withText('Inbox'))
    I.click('Move')
  })
  I.waitForDetached('.folder-picker-dialog')

  I.switchToPreviousTab(1)
  I.triggerRefresh()
  I.waitForApp()
  I.waitForText('subject1')
  I.see('subject1')
  I.waitForText('subject2')
  I.see('subject2')
  I.dontSeeElement('.busy-indicator')
})
