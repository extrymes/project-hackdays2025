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

Feature('Sharing')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C45032] Edit Permissions at "My shares"', async ({ I, users, drive, dialogs }) => {
  const [alice, bob] = users
  session('Alice', () => {
    I.login('app=io.ox/files')
    I.waitForApp()
    I.waitForText('My shares')
    I.selectFolder('My shares')
    I.waitForApp()
    // sometimes this is not fast enough and there are 4 objects
    I.waitForInvisible(locate({ xpath: '//li[contains(@class, "list-item selectable")]' }).as('List item'))

    I.click('My files', '.folder-tree')
    I.selectFolder('Music')
    I.waitForText('Music', 5, '.breadcrumb-tail[data-module="infostore"]')
    I.waitForElement('~Share')
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.click('~Select contacts')
    I.waitForElement('.modal .list-view.address-picker li.list-item')
    I.fillField('Search', bob.get('name'))
    I.waitForText(bob.get('name'), 5, '.modal-dialog .address-picker')
    I.waitForText(bob.get('primaryEmail'))
    I.click(bob.get('primaryEmail'), '.address-picker .list-item')
    dialogs.clickButton('Select')
    I.waitForDetached('.modal-dialog .address-picker')
    I.waitForElement(locate('.permissions-view .row').at(2).as('.permissions-view .row (2)'))
    I.dontSee('Guest', '.permissions-view')
    I.waitForElement(locate('.permission.row').at(1).as('.permission.row (1)'))
    I.waitForElement(locate('.permission.row').at(2).as('.permission.row (2)'))
    I.waitForText('Viewer')
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')

    I.selectFolder('My shares')
    I.waitForElement('.filename[title="Music"]')
    I.waitForElement('.list-item.selectable.file-type-folder')
    I.waitForText('Music', 5, '.list-view .filename')
    I.click('Music', '.list-view .filename')
  })

  session('Bob', () => {
    I.login('app=io.ox/files', { user: bob })
    I.waitForApp()
    I.waitForText('Shared files', 5, '.folder-tree')
    I.selectFolder('Shared files')
    I.waitForApp()
    I.waitForText(alice.get('name'))
    I.selectFolder(alice.get('name'))
    I.waitForText('Music', 5, '.list-view')
    I.selectFolder('Music')
    I.waitForInvisible('New')
    I.selectFolder(alice.get('name'))
  })

  session('Alice', () => {
    I.click('~Edit share')
    I.waitForText('Share folder')
    I.waitForText('Details', 5, locate('.permissions-view .row').at(2).as('.permissions-view .row (2)'))
    I.click('Details', locate('.permissions-view .row').at(2).as('.permissions-view .row (2)'))
    I.clickDropdown('Create objects and subfolders')
    // close the dropdown
    I.pressKey('Escape')

    dialogs.waitForVisible()
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')
  })

  session('Bob', () => {
    I.triggerRefresh()

    I.selectFolder('Music')
    drive.clickSecondary('New folder')
    dialogs.waitForVisible()
    I.waitForText('Add new folder', 5, dialogs.header)
    I.fillField('Folder name', 'Hello from Bob')
    dialogs.clickButton('Add')
    I.waitForDetached('.modal-dialog')
  })

  session('Alice', () => {
    I.selectFolder('Music')
    I.triggerRefresh()
    I.waitForText('Hello from Bob')
  })
})

Scenario('[C107063] Revoke Permissions at "My shares"', async ({ I, users, drive, dialogs }) => {
  session('Alice', () => {
    I.login('app=io.ox/files')
    I.waitForApp()
    I.selectFolder('My shares')
    // sometimes this is not fast enough and there are 4 objects
    I.retry(3).seeNumberOfElements('.list-view li.list-item', 0)

    I.selectFolder('Music')
    I.waitForElement('~Share')
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.click('~Select contacts')
    I.waitForElement('.modal .list-view.address-picker li.list-item')
    I.fillField('Search', users[1].get('name'))
    I.waitForText(users[1].get('name'), 5, '.modal-dialog .address-picker')
    I.waitForText(users[1].get('primaryEmail'))
    I.click(users[1].get('primaryEmail'), '.address-picker .list-item')
    dialogs.clickButton('Select')
    I.waitForDetached('.modal-dialog .address-picker')
    I.waitForElement(locate('.permissions-view .row').at(2).as('.permissions-view .row (2)'))
    I.dontSee('Guest', '.permissions-view')
    I.seeNumberOfElements('.permissions-view .permission.row', 2)
    dialogs.waitForVisible()
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')

    I.selectFolder('My shares')
    I.waitForElement('.filename[title="Music"]')
    I.seeNumberOfElements('.list-view li.list-item', 1)
    drive.selectFile('Music')
  })

  session('Bob', () => {
    I.login('app=io.ox/files', { user: users[1] })
    I.waitForApp()
    I.click('.folder-arrow', '~Shared files')
    I.waitForText(users[0].get('name'), 5, '.folder-tree')
    I.selectFolder(users[0].get('name'))
    I.waitForText('Music', 5, '.list-view')
  })

  session('Alice', () => {
    // must be ~Revoke access if icon
    I.clickToolbar('~Edit share')
    dialogs.waitForVisible()
    dialogs.clickButton('Unshare')
  })

  session('Bob', () => {
    I.triggerRefresh()
    I.waitForInvisible('Shared files', 5)
  })
})

Scenario('[C73919] Copy a shared file to another folder', async ({ I, users, drive, dialogs }) => {
  // the test case also shares with an external user, this is left out for now.

  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('document.txt')
  I.clickToolbar('~View')
  I.waitForText('Details', 10, '.io-ox-viewer .detail-pane h1')
  I.waitForEnabled('.io-ox-viewer input.file-input')
  I.attachFile('.io-ox-viewer input.file-input', 'media/files/0kb/document.txt')
  dialogs.waitForVisible()
  dialogs.clickButton('Upload')
  I.waitForElement(locate('.version-count').withText('2').as('.version-count (2)'))
  I.clickToolbar('~Close viewer')
  I.waitForDetached('.io-ox-viewer')
  I.waitForElement(locate('.version-count').withText('2').as('.version-count (2)'))

  I.waitForElement('~Share')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.click('~Select contacts')
  I.waitForElement('.modal .list-view.address-picker li.list-item')
  I.fillField('Search', users[1].get('name'))
  I.waitForText(users[1].get('name'), 5, '.modal-body .address-picker')
  I.waitForText(users[1].get('primaryEmail'))
  I.click(users[1].get('primaryEmail'), '.address-picker .list-item')
  dialogs.clickButton('Select')
  I.waitForElement(locate('.permissions-view .row').at(1).as('.permissions-view .row (1)'))
  I.fillField('.form-control.message-text', 'Hello')
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.waitForElement(locate('.detail-pane .share-count').withText('1').as('.detail-pane .share-count 1'))

  I.clickToolbar('~More actions')
  I.click('Copy')
  dialogs.waitForVisible()
  I.waitForText('Copy', 5, '.modal')
  I.pressKey('Arrow_Down')
  I.waitForText('Documents', 5, '.modal')
  I.click('Documents', '.modal')
  I.waitForElement(locate('li.selected').withAttr({ 'aria-label': 'Documents' }).inside('.modal-body').as('Documents (selected)'))
  dialogs.clickButton('Copy')
  I.waitForText('File has been copied', 5)

  I.selectFolder('Documents')
  I.waitForElement('.filename[title="document.txt"]')
  I.waitForNetworkTraffic()
  drive.selectFile('document.txt')
  I.see('Upload new version', '.detail-pane')
  I.dontSeeElement(locate('.detail-pane .version-count').withText('2').as('.detail-pane .version-count 2'))
  I.see('Shares', '.detail-pane')
  I.waitForText('None', 5, '.detail-pane .share-count')

  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForText('has shared the file', undefined, '.list-view')
  I.click('.list-item')
  I.waitForElement('.mail-detail-frame')
  within({ frame: '.mail-detail-frame' }, () => {
    I.waitForText('View file')
    I.click('View file')
  })
  I.waitForElement('[aria-label="View details"]')
  I.click('~View details')
  I.click('Shared files', '.detail-pane')
  I.waitForDetached('.busy-indicator.io-ox-busy')
  drive.selectFile('document.txt')
  I.seeElement(locate('.detail-pane .version-count').withText('2').as('.detail-pane .version-count 2'))
  I.waitForText('None', 5, '.detail-pane .share-count')

  I.clickToolbar('~More actions')
  I.click('Copy', locate('.dropdown.open.more-dropdown li').withText('Copy').as('Copy'))
  dialogs.waitForVisible()
  I.waitForText('Copy', 5, '.modal')
  I.pressKey('Arrow_Down')
  I.waitForText('Documents', 5, '.modal')
  I.click('Documents', '.modal')
  I.waitForElement(locate('li.selected').withAttr({ 'aria-label': 'Documents' }).inside('.modal-body').as('Documents (selected)'))
  dialogs.clickButton('Copy')
  I.waitForDetached('.modal-dialog')
  I.waitForText('File has been copied', 5)

  I.selectFolder('My files')
  I.waitForElement('.io-ox-files-main .list-view.complete')
  I.selectFolder('Documents')
  drive.selectFile('document.txt')
  I.waitForText('Upload new version', 5, '.detail-pane')
  I.dontSeeElement(locate('.detail-pane .version-count').withText('2').as('.detail-pane .version-count 2'))
  I.see('Shares', '.detail-pane')
  I.see('None', '.detail-pane .share-count')
})

Scenario('[DOCS-3066] Sharing link area is visible for decrypted files and invisible for encrypted files on click details view "This file is shared with others"', async ({ I, users, drive, dialogs }) => {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.selectFile('document.txt')
  I.waitForText('', 5, '.file-list-view')
  I.click(locate('.list-view li').withText('document.txt').as('document.txt'))

  I.waitForElement('~Share')
  I.clickToolbar('~Share')
  dialogs.waitForVisible()
  I.click('~Select contacts')
  I.waitForElement('.modal .list-view.address-picker li.list-item')
  I.fillField('Search', users[1].get('name'))
  I.waitForText(users[1].get('name'), 5, '.modal-body .address-picker')
  I.waitForText(users[1].get('primaryEmail'))
  I.click(users[1].get('primaryEmail'), '.address-picker .list-item')
  dialogs.clickButton('Select')
  I.waitForElement(locate('.permissions-view .row').at(1).as('.permissions-view .row (1)'))
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.click(locate('.list-view li').withText('document.txt').as('document.txt'))
  I.seeElement(locate('.detail-pane .share-count').withText('1').as('.detail-pane .share-count 1'))

  I.click('~Open sharing dialog')
  dialogs.waitForVisible()
  I.waitForElement('.access-select')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.rightClick(locate('.list-view li').withText('document.txt').as('document.txt'))
  I.waitForText('Rename', 5, '.smart-dropdown-container.dropdown.open')
  I.click('Rename', '.smart-dropdown-container.dropdown.open')
  dialogs.waitForVisible()
  I.fillField('.modal input', 'document.txt.pgp')
  dialogs.clickButton('Rename')
  I.waitForText('Yes')
  dialogs.clickButton('Yes')
  I.waitForDetached('.modal-dialog')

  drive.selectFile('document.txt.pgp')
  I.seeElement(locate('.detail-pane .share-count').withText('1').as('.detail-pane .share-count 1'))
  I.click('~Open sharing dialog')
  dialogs.waitForVisible()
  I.dontSeeElementInDOM('.access-select')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
})

Scenario('[OXUIB-1830] Without share_links and invite_guests capabilities the user is able to share to internal users only', async ({ I, users, drive, dialogs }) => {
  const [user] = users

  const folder = await I.grabDefaultFolder('infostore')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFile(testFolder, 'media/files/0kb/document.txt'),
    user.doesntHaveCapability('share_links'),
    user.doesntHaveCapability('invite_guests')
  ])
  await I.waitForCapability('share_links', 15, { shouldBe: false })
  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForText('Testfolder', 5, '.file-list-view')
  I.rightClick('Testfolder', '.file-list-view')
  I.clickDropdown('Share / Permissions')
  I.waitForText('Share folder "Testfolder', 5, '.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog .invite-people')
  I.waitForInvisible('.share-permissions-dialog .access-select')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.share-permissions-dialog')

  I.doubleClick('My files', '.private-drive-folders')
  I.waitForText('Testfolder', 5, '.private-drive-folders')
  I.rightClick(locate('.folder-label').withText('Testfolder').as('Testfolder'), '.private-drive-folders')
  I.clickDropdown('Share / Permissions')
  I.waitForText('Permissions for folder "Testfolder', 5, '.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog .invite-people')
  I.dontSeeElement('.share-permissions-dialog .access-select')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.share-permissions-dialog')

  I.waitForText('document', 5, '.file-list-view')
  I.rightClick('document.txt', '.file-list-view')
  I.clickDropdown('Share / Permissions')
  I.waitForText('Share file "document.txt', 5, '.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog .invite-people')
  I.dontSeeElement('.share-permissions-dialog .access-select')
})

Scenario('[OXUIB-1830] Viewers do not see sharing options in the context menu but permissions information in the folder view', async ({ I, users, drive, dialogs }) => {
  const [user, guest] = users

  const folder = await I.grabDefaultFolder('infostore')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await I.haveFile(testFolder, 'media/files/0kb/document.txt')

  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForText('Testfolder', 5, '.file-list-view')
  I.rightClick('Testfolder', '.file-list-view')
  I.clickDropdown('Share / Permissions')
  I.waitForText('Share folder "Testfolder', 5, '.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog')
  I.waitForElement('.share-permissions-dialog .invite-people')
  I.click('.twitter-typeahead .tt-input')
  I.waitForFocus('.twitter-typeahead .tt-input')
  I.fillField('.twitter-typeahead .tt-input', guest.get('email1'))
  I.pressKey('Enter')
  I.waitForText(guest.get('display_name'))
  dialogs.clickButton('Share')
  I.waitForDetached('.share-permissions-dialog')

  I.logout()

  I.login('app=io.ox/files', { user: guest })
  I.waitForApp()

  I.waitForText('Shared files', 5, '.public-drive-folders')
  I.doubleClick('Shared files', '.public-drive-folders')
  I.waitForText(user.get('display_name'), 5, '.public-drive-folders')
  I.click(user.get('display_name'), '.public-drive-folders')
  I.waitForText('Testfolder', 5, '.file-list-view')
  I.rightClick('Testfolder', '.file-list-view')
  I.waitForElement('.dropdown-menu')
  I.waitForText('Add to favorites')
  I.dontSee('Share / Permissions')
  I.pressKey('Escape')

  I.doubleClick(locate('.folder-label').withText(user.get('display_name')).as(user.get('display_name')), '.public-drive-folders')
  I.rightClick(locate('.folder-label').withText('Testfolder').as('Testfolder'), '.public-drive-folders')
  I.waitForElement('.dropdown-menu')
  I.waitForText('Add to favorites')
  I.waitForText('Permissions')
  I.pressKey('Escape')

  I.doubleClick(locate('.folder-label').withText('Testfolder').as('Testfolder'), '.public-drive-folders')
  I.waitForText('document', 5, '.file-list-view')
  I.rightClick('document.txt', '.file-list-view')
  I.waitForElement('.dropdown-menu')
  I.waitForText('View')
  I.dontSee('Share / Permissions')
})
