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

Feature('Sharing')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C45021] Generate simple link for sharing @smoketest', async ({ I, drive, dialogs }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForElement(locate('.folder-tree .folder-label').withText('My files').as('My files'))
  I.selectFolder('Music')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this folder?')
  I.waitForText('Invited people only', 5)
  I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')
  I.waitForText('Copy link', 5)
  I.click('Copy link')
  I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
  let url = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
  url = Array.isArray(url) ? url[0] : url
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.amOnPage(url)
  I.waitForApp()
  I.dontSee('Documents', '.list-view')
  I.see('Music', '.folder-tree .selected')
})

Scenario('[C252159] Generate link for sharing including subfolders', async ({ I, drive, dialogs }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  // Share folder with subfolders
  I.waitForElement(locate('.folder-tree .folder-label').withText('My files').as('My files'))
  I.selectFolder('Music')
  I.waitForDetached('.page.current .busy')
  drive.clickSecondary('New folder')
  dialogs.waitForVisible()
  I.waitForText('Add new folder', 5, dialogs.header)
  I.fillField('Folder name', 'A subfolder')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')
  drive.clickSecondary('New folder')
  dialogs.waitForVisible()
  I.fillField('Folder name', 'Second subfolder')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')
  I.selectFolder('My files')
  drive.selectFile('Music')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Invited people only', 5)
  I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')
  I.waitForText('Copy link', 5)
  I.click('Copy link')
  I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
  const url = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  // Check sharing link
  I.amOnPage(url)
  I.waitForApp()
  I.waitForText('A subfolder', 5, '.list-view')
  I.seeNumberOfVisibleElements('.list-view li.list-item', 2)
  I.see('Second subfolder')
})

Scenario('[C45022] Generate simple link for sharing with password', async ({ I, drive, dialogs }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  I.waitForElement(locate('.folder-tree .folder-label').withText('My files'))
  I.selectFolder('Music')

  // Create sharing link with password
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
  let link = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
  link = Array.isArray(link) ? link[0] : link
  I.click('.settings-button')
  dialogs.waitForVisible()
  I.fillField('Password', 'CorrectHorseBatteryStaple')
  dialogs.clickButton('Save')

  I.waitForText('Copy link')
  I.click('Copy link')
  I.waitForText('The link has been copied to the clipboard', 5, '.io-ox-alert')
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.say('Check sharing link')
  I.amOnPage(link)
  I.waitForVisible('input[name="password"]')
  I.waitForFocus('input[name="password"]')
  I.fillField('input[name="password"]', 'CorrectHorseBatteryStaple')
  I.click('signin')
  I.waitForApp()
  I.see('Music', '.folder-tree .selected')
})

Scenario('[C85625] My Shares default sort order', async ({ I, drive, dialogs }) => {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFile(testFolder, 'media/files/0kb/document.txt'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.rtf'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.odt'),
    I.haveFile(testFolder, 'media/files/generic/testpresentation.ppsm')
  ])
  I.login('app=io.ox/files&folder=' + folder)
  I.waitForApp()

  drive.selectFile('document.txt')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForNetworkTraffic()
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('Testfolder')
  I.waitForApp()
  I.waitForText('Testfolder', undefined, '.breadcrumb-view.toolbar-item')

  drive.selectFile('testdocument.rtf')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForNetworkTraffic()
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')

  drive.selectFile('testpresentation.ppsm')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForNetworkTraffic()
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('My files')
  I.waitForApp()
  I.waitForText('My files', undefined, '.breadcrumb-view.toolbar-item')

  drive.selectFile('Testfolder')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this folder?')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForNetworkTraffic()
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('My shares')
  I.waitForApp()
  I.waitForText('My shares', undefined, '.breadcrumb-view.toolbar-item')

  I.waitForText('Testfolder', undefined, '.list-view')
  expect(await I.grabTextFromAll(locate('li.list-item .filename')))
    .to.deep.equal(['Testfolder', 'testpresentation', 'testdocument', 'document'])
  I.click('Sort by')
  I.waitForElement(locate('.dropdown.open a[aria-checked="true"]').withText('Date').as('Date'))
  I.waitForElement(locate('.dropdown.open a[aria-checked="true"]').withText('Descending').as('Descending'))
  I.pressKey('Escape')
})

Scenario('[C45026] Edit shared object with multiple users and modify the permissions for a specific user', async ({ I, users, mail, drive, dialogs, autocomplete }) => {
  const smartDropDown = '.smart-dropdown-container.dropdown.open'
  const document = '.white-page.letter.plain-text'

  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])

  function addUser (user) {
    I.fillField('input[placeholder="Name or email address"]', user.get('primaryEmail'))
    I.waitForElement('.participant-wrapper')
    autocomplete.selectFirst()
    I.waitForText(user.get('name'), 5, locate('.permission.row').withAttr({ 'aria-label': `${user.get('sur_name')}, User, Internal user.` }))
  }

  function setRights (curRole, targetRole, user) {
    I.waitForElement(locate('.permission.row').withAttr({ 'aria-label': `${user.get('sur_name')}, User, Internal user.` }))
    I.click(curRole, locate('.permission.row').withAttr({ 'aria-label': `${user.get('sur_name')}, User, Internal user.` }))
    I.waitForText(targetRole, 5, smartDropDown)
    I.clickDropdown(targetRole)
  }

  function openDocument () {
    I.openApp('Mail')
    I.waitForApp()
    mail.selectMail(users[0].get('name'), 'Sender')

    I.waitForElement('.mail-detail-frame')
    within({ frame: '.mail-detail-frame' }, () => {
      I.waitForText('View file')
      I.click('View file')
    })
  }

  await session('Alice', async () => {
    const folder = await I.grabDefaultFolder('infostore')
    await I.haveFile(folder, 'media/files/0kb/document.txt')

    I.login('app=io.ox/files')
    I.waitForApp()

    I.waitForElement('.filename[title="document.txt"]')
    I.rightClick('.list-view .filename[title="document.txt"]')
    I.waitForText('Share / Permissions', 5, smartDropDown)
    I.clickDropdown('Share / Permissions')

    I.waitForElement('.modal-dialog')
    within('.modal-dialog', () => {
      I.waitForFocus('input[placeholder="Name or email address"]')
      addUser(users[1])
      addUser(users[2])
      addUser(users[3])
    })

    setRights('Viewer', 'Reviewer', users[2])
    setRights('Viewer', 'Reviewer', users[3])
    I.fillField('.form-control.message-text', 'Hello')

    dialogs.clickButton('Share')
  })

  await session('Charlie', () => {
    I.login('app=io.ox/files', { user: users[2] })
    I.waitForApp()
    I.waitForDetached('.filename[title="document.txt"]')
    openDocument()
    I.waitForElement(locate(document).withText(''), 30)
    I.waitForElement('~Edit', 10)
    I.click('~Edit', '.viewer-toolbar')
    I.waitForElement('.io-ox-editor textarea.content')
    I.waitForFocus('.io-ox-editor textarea.content')
    I.fillField('.io-ox-editor textarea.content', 'here is charlie')
    I.click('Save', '.io-ox-editor-window .window-footer')
  })

  await session('Dave', () => {
    I.login('app=io.ox/files', { user: users[3] })
    I.waitForApp()
    I.waitForDetached('.filename[title="document.txt"]')
    openDocument()
    I.waitForElement(locate(document).withText(''), 30)
    I.waitForElement('~Edit', 10)
    I.click('~Edit', '.viewer-toolbar')
    I.waitForElement('.io-ox-editor textarea.content')
    I.waitForFocus('.io-ox-editor textarea.content')
    I.fillField('.io-ox-editor textarea.content', 'here is dave')
    I.click('Save', '.io-ox-editor-window .window-footer')
  })

  await session('Charlie', () => {
    I.click('Save', '.io-ox-editor-window .window-footer')
    I.fillField('.io-ox-editor textarea.content', 'here is charlie again')
  })

  await session('Bob as Viewer', () => {
    I.login('app=io.ox/files', { user: users[1] })
    I.waitForApp()
    I.waitForDetached('.filename[title="document.txt"]')
    openDocument()
    I.waitForElement(locate(document).withText('here is charlie'), 30)
    I.dontSee('Edit', '.viewer-toolbar')
  })

  await session('Alice', () => {
    // set charlies rights to viewer rights
    I.rightClick('.list-view .filename[title="document.txt"]')
    I.waitForText('Share / Permissions', 5, smartDropDown)
    I.click('Share / Permissions', smartDropDown)
    setRights('Reviewer', 'Viewer', users[2])
    dialogs.clickButton('Share')
    I.waitForNetworkTraffic()
  })

  await session('Charlie', () => {
    I.click('Save', '.io-ox-editor-window .window-footer')
    I.waitForElement('.io-ox-alert-error')
    within('.io-ox-alert-error', () => {
      I.waitForText('You do not have the appropriate permissions to update the document.')
    })
  })

  await session('Alice', () => {
    I.rightClick('.list-view .filename[title="document.txt"]')
    I.clickDropdown('Share / Permissions')
    // revoke access of dave
    I.waitForElement('button[title="Actions"]')
    I.click('button[title="Actions"]', locate('.permission.row').withAttr({ 'aria-label': `${users[3].get('sur_name')}, User, Internal user.` }))
    I.waitForText('Revoke access', 5, '.smart-dropdown-container.dropdown.open')
    I.clickDropdown('Revoke access')
    I.waitNumberOfVisibleElements('.permission.row', 2)
    dialogs.clickButton('Share')
    I.waitForNetworkTraffic()
  })

  await session('Dave', () => {
    I.click('Close', '.io-ox-editor-window .window-footer')
    I.waitForDetached('.io-ox-editor-window')
    openDocument()
    I.waitForElement('.io-ox-alert-error')
    within('.io-ox-alert-error', () => {
      I.waitForText('You do not have the appropriate permissions to read the document.')
    })
  })
})

Scenario('[C45025] Create shared object with multiple users (external users) with different permissions', async ({ I, users, contexts, drive, dialogs, mail, autocomplete }) => {
  const ctx = await contexts.create()
  await Promise.all([
    users.create(users.getRandom(), ctx),
    users.create(users.getRandom(), ctx)
  ])

  await session('Alice', async () => {
    const folder = await I.grabDefaultFolder('infostore')
    await I.haveFile(folder, 'media/files/0kb/document.txt')

    I.login('app=io.ox/files')
    I.waitForApp()
    I.waitForElement('.filename[title="document.txt"]')
    I.rightClick('.list-view .filename[title="document.txt"]')
    I.clickDropdown('Share / Permissions')

    dialogs.waitForVisible()
    await within('.modal-dialog', () => {
      I.waitForFocus('input[placeholder="Name or email address"]')
      I.fillField('input[placeholder="Name or email address"]', users[1].get('primaryEmail'))
      I.seeInField('input[placeholder="Name or email address"]', users[1].get('primaryEmail'))
      I.waitForInvisible(autocomplete.suggestions)
      I.pressKey('Enter')
      I.waitForText(users[1].get('name'), 5, locate('.permission.row').withAttr({ 'aria-label': `${users[1].get('primaryEmail')}, Guest.` }))
      I.waitForEnabled('.form-control.tt-input')
      I.fillField('input[placeholder="Name or email address"]', users[2].get('primaryEmail'))
      I.seeInField('input[placeholder="Name or email address"]', users[2].get('primaryEmail'))
      I.waitForInvisible(autocomplete.suggestions)
      I.wait(0.2)
      I.pressKey('Enter')
      I.waitForText(users[2].get('name'), 5, locate('.permission.row').withAttr({ 'aria-label': `${users[2].get('primaryEmail')}, Guest.` }))
      I.click('Viewer', locate('.permission.row').withAttr({ 'aria-label': `${users[1].get('primaryEmail')}, Guest.` }))
    })
    I.clickDropdown('Reviewer')
    dialogs.clickButton('Share')
  })

  await session('Bob as Reviewer', async () => {
    I.login('app=io.ox/files', { user: users[1] })
    I.waitForApp()
    I.waitForDetached('.filename[title="document.txt"]')
    I.openApp('Mail')

    I.waitForApp()
    I.waitForElement('.list-view.visible-selection.mail-item')
    mail.selectMail(users[0].get('name'), 'Sender')
    I.waitForElement('.mail-detail-frame')
    await within({ frame: '.mail-detail-frame' }, () => {
      I.waitForText('View file')
      I.retry(5).click('View file')
    })

    I.wait(0.3)
    I.retry(7).switchToNextTab()
    I.waitForElement('~Edit', 10)
    I.retry(5).click('~Edit', '.viewer-toolbar')

    I.waitForElement('.io-ox-editor textarea.content')
    I.waitForFocus('.io-ox-editor textarea.content')
    I.fillField('.io-ox-editor textarea.content', 'here is bob')
    I.seeInField('.io-ox-editor textarea.content', 'here is bob')
    I.wait(0.2)
    I.click('Save', '.io-ox-editor-window .window-footer')
  })

  await session('Charlie as Viewer', async () => {
    I.login('app=io.ox/files', { user: users[2] })
    I.waitForApp()
    I.waitForDetached('.filename[title="document.txt"]')
    I.openApp('Mail')

    I.waitForApp()
    I.waitForElement('.list-view.visible-selection.mail-item')
    mail.selectMail(users[0].get('name'), 'Sender')
    I.waitForElement('.mail-detail-frame')
    await within({ frame: '.mail-detail-frame' }, () => {
      I.waitForText('View file')
      I.retry(5).click('View file')
    })

    I.wait(0.3)
    I.retry(7).switchToNextTab()
    I.waitForElement('.white-page.letter.plain-text', 10)
    I.waitForText('here is bob', 5, '.white-page.letter.plain-text')
    I.dontSee('Edit', '.viewer-toolbar')
  })
})

Scenario('[C83277] Create shared object with expiration date', async ({ I, drive, dialogs }) => {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')

  I.login('app=io.ox/files')
  I.waitForApp()

  I.click(locate('.list-item.selectable.file-type-txt'))
  I.waitForElement('~Share')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.selectOption('.form-group select', 'Anyone with the link and invited people')
  I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
  let link = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
  I.click('.settings-button')
  dialogs.waitForVisible()
  I.selectOption('Expiration', 'One week')
  dialogs.clickButton('Save')

  I.waitForText('Copy link')
  I.click('Copy link')
  I.waitForText('The link has been copied to the clipboard', 5, '.io-ox-alert')
  link = Array.isArray(link) ? link[0] : link

  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.amOnPage(link)
  I.waitForText('document.txt', 15, '.viewer-toolbar-filename')
})

Scenario('[C110280] Personalized no-reply share mails', async ({ I, users, drive, mail, dialogs, autocomplete }) => {
  await Promise.all([
    users.create(),
    users[0].hasAccessCombination('drive'),
    users[0].hasConfig('com.openexchange.share.notification.usePersonalEmailAddress', true)
  ])

  await session('Alice', async () => {
    I.login('app=io.ox/files')
    I.waitForApp()
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.waitForElement(locate('input').withAttr({ placeholder: 'Name or email address' }))
    I.fillField(locate('input').withAttr({ placeholder: 'Name or email address' }), users[1].get('sur_name'))
    I.waitForVisible(autocomplete.suggestion)
    I.pressKey('Enter')
    I.waitForText(users[1].get('sur_name'), 5, '.modal-dialog .permissions-view')
    I.fillField('.form-control.message-text', 'Hello')
    I.seeInField('.form-control.message-text', 'Hello')
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')
  })

  await session('Bob', async () => {
    I.login('app=io.ox/mail', { user: users[1] })
    I.waitForApp()
    mail.selectMail(`test.user-${users[0].get('sur_name')}`)
    I.waitForText(`<${users[0].get('primaryEmail')}>`)
  })
})

Scenario('[C318836] Generate simple link for sharing', async ({ I, drive, dialogs, users }) => {
  let publicLinkURL

  await users.create()

  await session('Alice', async () => {
    const infostoreFolderID = await I.grabDefaultFolder('infostore')
    await I.haveFile(infostoreFolderID, { content: 'file content', name: 'C318836.txt' })

    I.login('app=io.ox/files')
    I.waitForApp()

    I.dontSeeElementInDOM('.list-view > .list-item .icons > .public-link > svg.bi-link')

    drive.selectFile('C318836.txt')

    I.clickToolbar('~Share')
    dialogs.waitForVisible()

    I.waitForText('Invited people only')
    I.selectOption('Who can access this file?', 'Anyone with the link and invited people')
    I.waitForText('Copy link')
    I.click('Copy link')

    I.waitForVisible('.io-ox-alert')
    I.waitForVisible(locate('.io-ox-alert').withText('The link has been copied to the clipboard.'))

    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    publicLinkURL = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')

    dialogs.clickButton('Share')

    I.waitForVisible('.list-view > .list-item .icons > .public-link > svg.bi-link')
    I.waitForDetached('.modal-dialog')

    I.logout()
  })

  // paste the copied link in a new browser session
  await session('Bob', async () => {
    I.amOnPage(publicLinkURL)
    I.waitForVisible('.io-ox-viewer')
    I.waitForVisible(locate('.io-ox-viewer .swiper-slide > .white-page').withText('file content'))
  })
})

Scenario('[C318837A] Generate link for sharing including subfolders', async ({ I, drive, dialogs, users }) => {
  let publicLinkURL

  await users.create()

  await session('Alice', async () => {
    const myFiles = await I.grabDefaultFolder('infostore')
    const folderA = await I.haveFolder({ title: 'folderA', module: 'infostore', parent: myFiles })
    const folderB = await I.haveFolder({ title: 'folderB', module: 'infostore', parent: folderA })

    await Promise.all([
      I.haveFile(folderA, { content: 'file content in folder A', name: 'C318837_A.txt' }),
      I.haveFile(folderB, { content: 'file content in folder B', name: 'C318837_B.txt' })
    ])

    I.login('app=io.ox/files')
    I.waitForApp()

    drive.selectFile('folderA')

    I.clickToolbar('~Share')
    dialogs.waitForVisible()

    I.waitForText('Invited people only')
    I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')
    I.waitForText('Copy link')
    I.click('Copy link')

    I.waitForVisible('.io-ox-alert')
    I.waitForVisible(locate('.io-ox-alert').withText('The link has been copied to the clipboard.'))

    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    publicLinkURL = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')

    dialogs.clickButton('Share')

    I.waitForVisible(locate('.list-view > .list-item .icons > .public-link > svg.bi-link'))
    I.waitForDetached('.modal-dialog')

    I.logout()
  })

  // paste the copied link in a new browser session
  await session('Bob', async () => {
    I.amOnPage(publicLinkURL)
    I.waitForVisible('.io-ox-files-main')
    I.waitForVisible(locate('.io-ox-files-main .list-view .filename').withText('folderB'))
    I.waitForVisible(locate('.io-ox-files-main .list-view .filename').withText('C318837_A'))

    I.doubleClick(locate('.io-ox-files-main .list-view .filename').withText('folderB'))
    I.waitForVisible(locate('.io-ox-files-main .list-view .filename').withText('C318837_B'))
  })
})

Scenario('[C318837B] Generate link for sharing without subfolders', async ({ I, drive, dialogs, users }) => {
  let publicLinkURL

  await users.create()

  await session('Alice', async () => {
    const myFiles = await I.grabDefaultFolder('infostore')

    const folderA = await I.haveFolder({ title: 'folderA', module: 'infostore', parent: myFiles })
    const folderB = await I.haveFolder({ title: 'folderB', module: 'infostore', parent: folderA })

    await Promise.all([
      I.haveFile(folderA, { content: 'file content in folder A', name: 'C318837_A.txt' }),
      I.haveFile(folderB, { content: 'file content in folder B', name: 'C318837_B.txt' })
    ])

    I.login('app=io.ox/files')
    I.waitForApp()

    drive.selectFile('folderA')

    I.clickToolbar('~Share')
    dialogs.waitForVisible()

    I.waitForText('Invited people only')
    I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')

    I.wait(1) // important for the following settings dialog

    I.click('~Sharing options')
    I.waitForVisible('.modal-dialog .modal-body.share-options')
    I.waitForVisible('.modal-dialog .modal-body.share-options .cascade input')
    I.click('.modal-dialog .modal-body.share-options .cascade label')
    I.wait(0.5) // setting the focus
    I.click('.modal-dialog .modal-body.share-options .cascade label')
    I.wait(0.5) // disabling the checkbox

    dialogs.clickButton('Save')

    I.waitForText('Copy link')
    I.click('Copy link')

    I.waitForVisible('.io-ox-alert')
    I.waitForVisible(locate('.io-ox-alert').withText('The link has been copied to the clipboard.'))

    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    publicLinkURL = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')

    dialogs.clickButton('Share')

    I.waitForVisible(locate('.list-view > .list-item .icons > .public-link > svg.bi-link'))
    I.waitForDetached('.modal-dialog')

    I.logout()
  })

  // paste the copied link in a new browser session
  await session('Bob', async () => {
    I.amOnPage(publicLinkURL)
    I.waitForVisible('.io-ox-files-main')
    // file in 'folderA' is shown
    I.waitForVisible(locate('.io-ox-files-main .list-view .filename').withText('C318837_A'))
    // subfolder 'folderB' is not visible
    I.dontSeeElementInDOM(locate('.io-ox-files-main .list-view .filename').withText('folderB'))
  })
})

Scenario('[C318838] Generate simple link for sharing with password', async ({ I, drive, dialogs, users }) => {
  let publicLinkURL

  await users.create()

  await session('Alice', async () => {
    const infostoreFolderID = await I.grabDefaultFolder('infostore')
    await I.haveFile(infostoreFolderID, { content: 'file content', name: 'C318838.txt' })

    I.login('app=io.ox/files')
    I.waitForApp()

    I.dontSeeElementInDOM('.list-view > .list-item .icons > .public-link > svg.bi-link')

    drive.selectFile('C318838.txt')

    I.clickToolbar('~Share')
    dialogs.waitForVisible()

    I.waitForText('Invited people only')
    I.click('~Sharing options')

    // check share option without existing public link
    dialogs.waitForVisible()
    I.see('Never', 'select:disabled option[selected="selected"]')
    I.seeElement('input[type=password]:disabled')

    dialogs.clickButton('Cancel')
    I.waitForDetached('.modal-dialog .share-options')

    // create link
    I.waitForText('Invited people only')
    I.selectOption('Who can access this file?', 'Anyone with the link and invited people')
    // Sharing dialog does not handle state properly when link API requests are pending
    I.wait(0.5)

    // check share options with existing public link
    I.click('~Sharing options')
    dialogs.waitForVisible()
    I.see('Never', 'select:enabled option[selected="selected"]')
    I.seeElement('input[type=password]:enabled')

    I.fillField('Password (optional)', 'secret')
    dialogs.clickButton('Save')

    I.waitForDetached('.modal-dialog .share-options')
    I.waitForText('Copy link')
    I.click('Copy link')

    I.waitForVisible('.io-ox-alert')
    I.waitForVisible(locate('.io-ox-alert').withText('The link has been copied to the clipboard.'))

    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    publicLinkURL = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')

    dialogs.clickButton('Share')

    I.waitForVisible('.list-view > .list-item .icons > .public-link > svg.bi-link')
    I.waitForDetached('.modal-dialog')

    I.logout()
  })

  // paste the copied link in a new browser session
  await session('Bob', async () => {
    I.amOnPage(publicLinkURL)
    I.waitForVisible('#io-ox-login-password')
    I.waitForFocus('#io-ox-login-password')
    I.fillField('#io-ox-login-password', 'secret')
    I.click('#io-ox-login-button')

    I.waitForVisible('.io-ox-viewer')
    I.waitForVisible(locate('.io-ox-viewer .swiper-slide > .white-page').withText('file content'))
  })
})

Scenario('[C352006] Shared file: Unshare the file', async ({ I, drive, dialogs, users, mail }) => {
  await Promise.all([
    users.create()
  ])
  const [userA, userB] = users

  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/document.txt')

  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForText('My files', 5, '.folder-tree')

  // Step 1: Select a file
  drive.selectFile('document.txt', { timeout: 5 })

  // Step 2: Click on "Share" button in the toolbar
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')

  // Step 3: In the drop down menu "Who can access the file?" keep "Invited people only" (default)
  I.waitForText('Invited people only', 5, 'select:enabled option[selected="selected"]')
  // Step 4: In the drop down menu "Invite as" select "Reviewer (Read and write)"
  I.waitForText('Viewer')
  I.click('Viewer')
  I.clickDropdown('Reviewer')
  I.waitForDetached('.smart-dropdown-container.open')

  // Step 5: In the input field "Invite people" start to type the name of a valid internal contact
  // TODO: A11y bug - input field is not accessible by label
  I.fillField('input[placeholder="Name or email address"]', userB.get('sur_name'))
  I.waitForVisible('.tt-suggestion .participant-name')
  I.seeInField('input[placeholder="Name or email address"]', userB.get('sur_name'))

  // Step 6: Click the user name of the internal contact "User B"
  I.pressKey('Enter')
  I.waitForEnabled('.form-control.tt-input')

  // Step 7: Click on "Share"
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.waitForNetworkTraffic()

  I.waitForText('1', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 1)
  I.waitForText('Shares', 5, '.viewer-shares-info')
  I.click('.panel-toggle-btn', '.viewer-shares-info')
  drive.seeInternalUserInShareSection(`${userB.get('sur_name')}, ${userB.get('given_name')}`, userB.get('primaryEmail'))
  drive.seeNumberOfListViewIcons('document.txt', 1)
  drive.seeListViewIcon('document.txt', 'bi-person-fill', 'Shared with internal users')

  I.logout()

  // user B has shared file with edit rights
  I.login('app=io.ox/mail', { user: userB })
  I.waitForApp()
  I.waitForText(userA.get('sur_name'))
  mail.selectMail(userA.get('sur_name'), 'Sender')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForText('document.txt', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('Hello', 5, '.io-ox-viewer .white-page')
  I.click('~Edit', '.viewer-toolbar')
  I.waitForText('document.txt', 5, '.io-ox-editor-window .title')
  I.seeInField('.io-ox-editor textarea.content', 'Hello')
  I.logout()

  I.login('app=io.ox/files')
  I.waitForApp()

  // Step 8: Click on "Share" button in the toolbar
  I.waitForText('My files', 5, '.folder-tree')
  drive.selectFile('document.txt', { timeout: 5 })
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')

  // Step 9: Click on "Unshare"
  dialogs.clickButton('Unshare')
  I.waitForText('Remove shares')

  // Step 10: Click "Remove shares"
  dialogs.clickButton('Remove shares')

  I.waitForText('None', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 0)
  drive.seeNumberOfListViewIcons('document.txt', 0)

  I.logout()

  // user B has file share removed
  I.login('app=io.ox/mail', { user: userB })
  I.waitForApp()
  I.waitForText(userA.get('sur_name'))
  mail.selectMail(userA.get('sur_name'), 'Sender')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForText('You do not have the appropriate permissions to read the document.', 5)
})

Scenario('[C351977] Change Viewer rights to Reviewer', async ({ I, users, mail, drive, dialogs }) => {
  await users.create()

  const [userA, userB] = users

  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  // Step 1: Select a txt file
  drive.selectFile('document.txt', { timeout: 5 })

  // Step 2: Click on "Share" button in the toolbar
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')

  // Step 3: In the drop down menu "Who can access the file?" keep "Invited people only" (default)
  I.waitForText('Invited people only', 5, 'select:enabled option[selected="selected"]')

  // Step 4: in the input field "Invite people" start to type the name of a valid internal contact
  I.fillField('input[placeholder="Name or email address"]', userB.get('sur_name'))
  I.waitForVisible('.tt-suggestion .participant-name')
  I.seeInField('input[placeholder="Name or email address"]', userB.get('sur_name'))

  // Step 5: Click the user name of the internal contact "User B"
  I.pressKey('Enter')
  I.waitForEnabled('.form-control.tt-input')

  // Step 6: Click on "Share"
  dialogs.clickButton('Share')
  I.waitForDetached('.share-permissions-dialog')
  I.waitForNetworkTraffic()
  drive.selectFile('document.txt', { timeout: 5 })

  I.waitForText('1', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 1)
  I.waitForText('Shares', 5, '.viewer-shares-info')
  I.click('.panel-toggle-btn', '.viewer-shares-info')
  drive.seeInternalUserInShareSection(`${userB.get('sur_name')}, ${userB.get('given_name')}`, userB.get('primaryEmail'))
  drive.seeNumberOfListViewIcons('document.txt', 1)
  drive.seeListViewIcon('document.txt', 'bi-person-fill', 'Shared with internal users')

  I.logout()

  // user B has shared file with view rights
  I.login('app=io.ox/mail', { user: userB })
  I.waitForApp()
  I.waitForText(userA.get('sur_name'))
  mail.selectMail(userA.get('sur_name'), 'Sender')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForText('document.txt', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('Hello', 5, '.io-ox-viewer .white-page')
  I.dontSeeElement('.viewer-toolbar *[aria-label="Edit"]')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-viewer')
  I.logout()

  I.login('app=io.ox/files')
  drive.selectFile('document.txt', { timeout: 5 })

  // Step 7: As "User A" click on "Share" button in the toolbar
  I.waitForElement('~Share')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText(userB.get('name'), 5, '#invite-people-pane .permissions-view')

  // Step 8: Click on the "Viewer" dropdown menu
  I.click('Viewer', `~${userB.get('sur_name')}, ${userB.get('given_name')}, Internal user.`)

  // Step 9: Click on "Review"
  I.clickDropdown('Reviewer')

  // Step 10: Click on "Share"
  dialogs.waitForVisible()
  dialogs.clickButton('Share')
  I.waitForDetached('.share-permissions-dialog')
  I.waitForNetworkTraffic()
  drive.selectFile('document.txt', { timeout: 5 })

  I.waitForText('1', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 1)
  I.waitForText('Shares', 5, '.viewer-shares-info')
  I.click('.panel-toggle-btn', '.viewer-shares-info')
  drive.seeInternalUserInShareSection(`${userB.get('sur_name')}, ${userB.get('given_name')}`, userB.get('primaryEmail'))
  drive.seeNumberOfListViewIcons('document.txt', 1)
  drive.seeListViewIcon('document.txt', 'bi-person-fill', 'Shared with internal users')

  I.logout()

  // user B has shared file with edit rights
  I.login('app=io.ox/mail', { user: userB })
  I.waitForApp()
  I.waitForText(userA.get('sur_name'))
  mail.selectMail(userA.get('sur_name'), 'Sender')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForText('document.txt', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('Hello', 5, '.io-ox-viewer .white-page')
  I.click('~Edit', '.viewer-toolbar')
  I.waitForText('document.txt', 5, '.io-ox-editor-window .title')
  I.seeInField('.io-ox-editor textarea.content', 'Hello')
})

Scenario('[C351979] Share file as Reviewer with invitation message', async ({ I, users, mail, drive, dialogs }) => {
  await users.create()

  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  // Step 1: Select a txt file
  drive.selectFile('document.txt', { timeout: 5 })

  // Step 2: Click on "Share" button in the toolbar
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.waitForText('Who can access this file?')

  // Step 3: In the drop down menu "Who can access the file?" keep "Invited people only" (default)
  I.waitForText('Invited people only', 5, 'select:enabled option[selected="selected"]')

  // Step 4: In the drop down menu "Invite as" select "Reviewer (Read and write)
  I.click('Viewer')
  I.clickDropdown('Reviewer')

  // Step 5: In the input field "Invite people" start to type the name of a valid internal contact
  I.fillField('input[placeholder="Name or email address"]', users[1].get('sur_name'))
  I.waitForVisible('.tt-suggestion .participant-name')
  I.seeInField('input[placeholder="Name or email address"]', users[1].get('sur_name'))

  // Step 6: Click the user name of the internal contact 'User B'
  I.pressKey('Enter')
  I.waitForEnabled('.form-control.tt-input')

  // Step 7: Type a message into the "Invitation message" field
  I.fillField('textarea.form-control.message-text', 'Hi user B')

  // Step 8: Click on share
  dialogs.clickButton('Share')
  I.waitForDetached('.share-permissions-dialog')
  I.waitForNetworkTraffic()

  I.waitForText('1', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 1)
  I.waitForText('Shares', 5, '.viewer-shares-info')
  I.click('.panel-toggle-btn', '.viewer-shares-info')
  drive.seeInternalUserInShareSection(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, users[1].get('primaryEmail'))
  drive.seeNumberOfListViewIcons('document.txt', 1)
  drive.seeListViewIcon('document.txt', 'bi-person-fill', 'Shared with internal users')

  I.logout('app=io.ox/files')

  // ---------- user B has shared file with edit rights -----------
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.waitForText(users[0].get('sur_name'))
  mail.selectMail(users[0].get('sur_name'), 'Sender')
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('Hi user B')
    I.waitForText('View file')
    I.click('View file')
  })

  I.waitForText('document.txt', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('Hello', 5, '.io-ox-viewer .white-page')
  I.click('~Edit', '.viewer-toolbar')
  I.waitForText('document.txt', 5, '.io-ox-editor-window .title')
  I.seeInField('.io-ox-editor textarea.content', 'Hello')
})

Scenario('[C351976a] Share file as viewer', async ({ I, users, mail, drive, dialogs }) => {
  await users.create()

  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  // Step 1: Select a txt file
  drive.selectFile('document.txt', { timeout: 2 })

  // Step 2: Click on "Share" button in the toolbar
  I.clickToolbar('~Share')
  dialogs.waitForVisible()

  // Step 3: In the drop down menu "Who can access the file?" keep "Invited people only" (default)
  I.waitForText('Invited people only', 5, 'select:enabled option[selected="selected"]')

  // Step 4: In the input field "Invite people" start to type the name of a valid internal contact
  I.fillField('input[placeholder="Name or email address"]', users[1].get('sur_name'))
  I.waitForVisible('.tt-suggestion .participant-name')
  I.seeInField('input[placeholder="Name or email address"]', users[1].get('sur_name'))

  // Step 5: Click the user name of the internal contact "User B"
  I.pressKey('Enter')
  I.waitForEnabled('.form-control.tt-input')

  // Step 6: Click on share
  dialogs.clickButton('Share')
  I.waitForDetached('.share-permissions-dialog')
  I.waitForNetworkTraffic()

  I.waitForText('1', 5, '.viewer-shares-info .share-count')
  I.seeNumberOfElements('.viewer-shares-info .sidebar-panel-body li', 1)
  I.waitForText('Shares', 5, '.viewer-shares-info')
  I.click('.panel-toggle-btn', '.viewer-shares-info')
  drive.seeInternalUserInShareSection(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, users[1].get('primaryEmail'))
  drive.seeNumberOfListViewIcons('document.txt', 1)
  drive.seeListViewIcon('document.txt', 'bi-person-fill', 'Shared with internal users')

  I.logout()

  // ---------- user B has shared file with view rights -----------
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.waitForText(users[0].get('sur_name'))
  mail.selectMail(users[0].get('sur_name', 'Sender'))
  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForText('document.txt', 10, '.io-ox-viewer .viewer-toolbar')
  I.waitForText('Hello', 5, '.io-ox-viewer .white-page')
  I.dontSeeElement('.viewer-toolbar *[aria-label="Edit"]')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-viewer')
})
