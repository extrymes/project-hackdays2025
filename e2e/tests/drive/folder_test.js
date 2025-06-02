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

Feature('Drive > Folder')

// Returns permission bitmasks for shared folder (user 1 is owner, user 2 is viewer)
function sharedFolder (folderName, parent, users) {
  return {
    module: 'infostore',
    subscribed: 1,
    title: folderName,
    permissions: [
      { entity: users[0].get('id'), group: false, bits: 403710016 },
      { entity: users[1].get('id'), group: false, bits: 257 }
    ],
    parent
  }
}

Before(async ({ users }) => {
  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

// Note: The title of this test, does not really reflect what is tested here
// A better title would be something like: Public files: Upload and new actions not shown in root folder
Scenario('[C8374] Public files: Add a file', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Public files')
  drive.openSecondary()
  I.waitForNetworkTraffic()
  I.see('New folder', '.dropdown.open a:not(.disabled)')
  I.see('Upload files', '.dropdown.open a.disabled')
  I.see('Upload folder', '.dropdown.open a.disabled')
  I.see('New note', '.dropdown.open a.disabled')
})

// Note: The title of this test, does not really reflect what is tested here (again)
// A better title would be something like: Public files: Moving files to root folder not possible
Scenario('[C8375] Public files: Move a file', async ({ I, drive, dialogs }) => {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('document.txt')
  I.clickToolbar('~More actions')
  I.clickDropdown('Move')

  dialogs.waitForVisible()
  I.waitForText('Public files', undefined, '.folder-picker-dialog')
  I.click('~Public files', '.folder-picker-dialog')
  I.waitForElement('.modal-footer .btn[data-action="ok"][disabled]')
})

Scenario('[C8376] Add a subfolder', async ({ I, drive, dialogs }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.clickSecondary('New folder')
  dialogs.waitForVisible()
  I.fillField('Folder name', 'Testfolder')
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')
  I.waitForText('Testfolder', 5, '.file-list-view')
})

Scenario('[C8377] Invite a person', async ({ I, users, drive, dialogs }) => {
  await session('Alice', () => {
    I.login('app=io.ox/files')
    I.waitForApp()

    I.selectFolder('My files')
    I.waitForText('Music')
    I.selectFolder('Music')
    drive.shareFolder(users[1].get('name'), 'Viewer')
    I.waitForApp()
    I.selectFolder('My shares')
    I.waitForElement('.filename[title="Music"]')
    I.seeNumberOfElements('.list-view li.list-item', 1)
  })

  await session('Bob', () => {
    I.login('app=io.ox/files', { user: users[1] })
    I.waitForApp()

    I.selectFolder('Shared files')
    I.waitForText(users[0].get('name'))
    I.selectFolder(users[0].get('name'))
    I.waitForElement('.filename[title="Music"]')
    I.doubleClick(locate('.filename').withText('Music').inside('.list-view'))
    I.openFolderMenu('Music')
    I.clickDropdown('Permissions')
    I.waitForElement(locate('.permissions-view .row').at(2))
    I.waitForText('Viewer', 2, '.permissions-view')
    I.click('Close')
  })

  // Repeat for Public Folder
  const publicFolderName = 'C8377-' + new Date().getTime()
  await session('Alice', () => {
    // Add public folder
    I.waitForText('Public files', 5, '.folder-tree')
    I.selectFolder('Public files')

    drive.clickSecondary('New folder')
    dialogs.waitForVisible()
    I.waitForText('Add new folder', 5, dialogs.header)
    I.fillField('Folder name', publicFolderName)
    dialogs.clickButton('Add')
    I.waitForDetached('.modal-dialog')

    I.waitForApp()
    I.selectFolder(publicFolderName)
    drive.shareFolder(users[1].get('name'), 'Viewer')
  })

  await session('Bob', () => {
    I.waitForText('Public files', 5, '.folder-tree')
    I.selectFolder('Public files')
    I.waitForText(publicFolderName, 5, '.list-view')
    I.selectFolder(publicFolderName)
    I.openFolderMenu(publicFolderName)
    I.clickDropdown('Permissions')
    I.waitForElement(locate('.permissions-view .row').at(2))
    I.see('Viewer', '.permissions-view .row .role')
  })
})

Scenario('[C8378] Invite a group', async ({ I, users, drive, dialogs }) => {
  // Testrail description:
  // 1. Go to Drive
  // 2. Choose a folder and click the gear button (Context Menu)
  // 3. Choose Invite
  // 4. Invite a group and save (Group has given rights in folder)
  // 5. Verify with two of the group members
  // 6. Repeat for public folder
  const folderName = 'C8378'
  const groupName = 'C8378-group'
  const group = {
    name: groupName,
    display_name: groupName,
    members: [users[1].get('id'), users[2].get('id')]
  }

  await Promise.all([
    I.dontHaveGroup(groupName),
    I.haveGroup(group)
  ])

  const folder = await I.haveFolder({ title: folderName, module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()
  I.clickToolbar('~Share')

  dialogs.waitForVisible()
  I.fillField('input.tt-input', groupName)
  I.waitForVisible('.tt-dropdown-menu')
  I.pressKey('Enter')
  I.waitForText('Group', 5)
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.login('app=io.ox/files&folder=' + folder, { user: users[1] })
  I.waitForApp()
  I.openFolderMenu(folderName)
  I.clickDropdown('Permissions')
  dialogs.waitForVisible()
  I.waitForElement(locate('.permissions-view .row').at(2))
  I.see('Viewer', '.permissions-view .row .role')
  dialogs.clickButton('Close')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.login('app=io.ox/files&folder=' + folder, { user: users[2] })
  I.waitForApp()
  I.openFolderMenu(folderName)
  I.clickDropdown('Permissions')
  dialogs.waitForVisible()
  I.waitForElement(locate('.permissions-view .row').at(2))
  I.see('Viewer', '.permissions-view .row .role')
  dialogs.clickButton('Close')
  I.waitForDetached('.modal-dialog')
})

Scenario('[C8379] Add a file', async ({ I, users, drive }) => {
  // Testrail description:
  // No rights to upload a file, "Viewer" role
  // 1. Try to upload a file (Denied of missing permission)

  const folder = await I.haveFolder(sharedFolder('C8379', await I.grabDefaultFolder('infostore'), users))
  I.login(`app=io.ox/files&folder=${folder}`, { user: users[1] })
  I.waitForApp()
  I.dontSee('New', '.classic-toolbar')
})

Scenario('[C8381] Lock a file', async ({ I, users, drive }) => {
  // Testrail description:
  // Shared or public folder with other member
  // 1. Choose a file (Popup window)
  // 2. "More"-->"Lock" (File is locked for you)
  // 3. Verify with other user
  const folder = await I.haveFolder(sharedFolder('C8381', await I.grabDefaultFolder('infostore'), users))
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()
  I.waitForElement('~document.txt')
  I.click('~document.txt', '.list-view')
  I.clickToolbar('~More actions')
  I.clickDropdown('Lock')
  I.waitForElement('.filename[title="document.txt (Locked)"]')
  I.logout()

  I.login('app=io.ox/files&folder=' + folder, { user: users[1] })
  I.waitForApp()
  I.waitForElement('.filename[title="document.txt (Locked)"]')
})

Scenario('[C8382] Delete a file', async ({ I, users, drive }) => {
  // Testrail description:
  // Shared or public folder with other member
  // 1. Select a file
  // 2. Delete it (File removed)
  const folder = await I.haveFolder(sharedFolder('C8382', await I.grabDefaultFolder('infostore'), users))
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()
  drive.selectFile('document.txt')
  I.clickToolbar('~Delete')
  I.waitForText('Do you really want to delete this item?')
  I.click('Delete')
  I.logout()

  I.login('app=io.ox/files&folder=' + folder, { user: users[1] })
  I.waitForApp()
  I.waitForDetached('.filename[title="document.txt"]')
})

Scenario('[C8383] Unlock a file', async ({ I, users, drive }) => {
  // Testrail description:
  // 1. Choose a locked file
  // 2. "More"-- > "Unlock" (File is unlocked)
  // 3. Verify with another user
  const folder = await I.haveFolder(sharedFolder('C8383', await I.grabDefaultFolder('infostore'), users))
  const data = await I.haveFile(folder, 'media/files/0kb/document.txt')
  await I.haveLockedFile(data)
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()
  drive.selectFile('document.txt (Locked)')
  I.clickToolbar('~More actions')
  I.clickDropdown('Unlock')
  I.waitForText('document.txt')
  I.dontSee('Locked')
  I.logout()

  I.login('app=io.ox/files&folder=' + folder, { user: users[1] })
  I.waitForApp()
  I.waitForElement('.filename[title="document.txt"]')
  I.dontSee('Locked')
})

Scenario('[C8385] Uninvite a person', async ({ I, users, drive, dialogs }) => {
  // Testrail description:
  // Person is invited to the folder
  // 1. Choose a folder
  // 2. Click the gear button (context menu)
  // 3. Choose "Share / Permissions" (A new pop up window opens with an overview of the invited people and their permissions.)
  // 4. Click the gear button next to Person B that needs to be deleted from the folder. (Context menu opens.)
  // 5. Click on "Revoke access" (The person disappears from the list.)
  // 6. Log in with Person B. (Person B is logged in.)
  // 7. Go to Drive. (The folder from Person A is not longer visible in the left section in Drive.)
  const folder = await I.haveFolder(sharedFolder('C8385', await I.grabDefaultFolder('infostore'), users))

  session('Bob', () => {
    I.login(`app=io.ox/files&folder=${folder}`)
  })

  session('Alice', () => {
    I.login('app=io.ox/files')
    I.waitForElement('.file-list-view.complete')
    I.waitForApp()
    I.selectFolder('My shares')
    I.waitForElement(locate('.breadcrumb-tail').withText('My shares'))
    I.waitForElement('.filename[title="C8385"]')
    I.seeNumberOfElements('.list-view li.list-item', 1)
    drive.selectFile('C8385')
    // Unshare
    I.clickToolbar('~Edit share')
    I.waitForElement('h1.modal-title')
    dialogs.clickButton('Unshare')
    I.waitForText('Remove shares', 5, locate('.modal').at(2))
    I.click('Remove shares', locate('.modal').at(2))
    I.waitForDetached('.modal-dialog', 5)
    I.waitForDetached('.list-view li.list-item', 15)
    I.seeNumberOfElements('.list-view li.list-item', 0)
  })

  session('Bob', () => {
    I.triggerRefresh()
    I.dontSee('Shared files', '.folder-tree')
  })
})

Scenario('[C8386] Uninvite a group', async ({ I, users, drive, dialogs }) => {
  // Testrail description
  // A group has permission in the folder
  // 1. Choose a folder
  // 2. Click the gear button (context menu)
  // 3. Choose Permission (Popup)
  // 4. Delete a group (Group is removed from list)
  // 5. Verify with group member
  const folderName = 'C8386'
  const groupName = 'C8378-group'
  const group = {
    name: groupName,
    display_name: groupName,
    members: [users[1].get('id'), users[2].get('id')]
  }

  await Promise.all([
    I.dontHaveGroup(groupName),
    I.haveGroup(group)
  ])

  const folder = await I.haveFolder({ title: folderName, module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  session('Alice', () => {
    I.login(`app=io.ox/files&folder=${folder}`)
    I.waitForApp()
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.fillField('input.tt-input', groupName)
    I.waitForVisible('.tt-dropdown-menu')
    I.pressKey('Enter')
    I.waitForText('Group', 5)
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')
  })

  session('Bob', () => {
    I.login(`app=io.ox/files&folder=${folder}`, { user: users[1] })
    I.waitForApp()
    I.openFolderMenu(folderName)
    I.clickDropdown('Permissions')
    dialogs.waitForVisible()
    I.waitForElement(locate('.permissions-view .row').at(2))
    I.see('Viewer', '.permissions-view .row .role')
    dialogs.clickButton('Close')
    I.waitForDetached('.modal-dialog')
  })

  session('Alice', () => {
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.waitForElement('.modal-dialog .btn[title="Actions"]')
    I.click('.modal-dialog .btn[title="Actions"]')
    I.clickDropdown('Revoke access')
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')
  })

  session('Bob', () => {
    I.triggerRefresh()
    I.waitForText('You do not have appropriate permissions to view the folder.')
    I.dontSee(folderName, '.folder-tree')
  })
})

Scenario('[C8387] Rename a folder', async ({ I, drive, dialogs }) => {
  // Testrail description:
  // A custom folder in Drive exists.
  // 1. Switch to drive, select a non -default folder
  // 2. Click the context menu button (A context menu shows up)
  // 3. Choose "Rename" (A popup shows up which asks for the folders new name)
  // 4. Enter a new name and save, check the folder tree (The folder is now renamed and re - sorted.)
  // 5. Choose a standard folder(documents, music, pictures or videos) (no context menu available in top bar, only in folder tree)
  // 6. Click the gear button in folder tree (No "Rename" option is available)
  // 7. Rename a folder on the same level as the standard folders with a name of a standard folder.For example: Rename the folder "foo" to "Documents" (Error: "A folder named "Documents" already exists")
  const folderName = 'C8387'
  const folder = await I.haveFolder({ title: folderName, module: 'infostore', parent: await I.grabDefaultFolder('infostore') })

  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()
  I.openFolderMenu(folderName)
  I.clickDropdown('Rename')
  dialogs.waitForVisible()
  I.waitForText('Rename folder')
  // A11y issue here: There is no label for this input present
  I.fillField('.modal-body input[type="text"]', 'C8387-renamed')
  dialogs.clickButton('Rename')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('Documents')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Music')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Pictures')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Videos')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')
})

Scenario('[C8388] Delete a folder', async ({ I, drive, dialogs }) => {
  // Testrail description:
  // A custom folder exists in Drive
  // 1. Choose a custom folder
  // 2. Click the context - menu button (A context menu shows up)
  // 3. Choose "Delete" (A confirmation dialog to delete is shown)
  // 4. Confirm your action (Folder is deleted)
  // 5. Choose a standard folder(documents, music, pictures or videos) and click the context menu (No "Delete" option is available)
  const folderName = 'C8388'
  const folder = await I.haveFolder({ title: folderName, module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()

  I.openFolderMenu(folderName)
  I.clickDropdown('Delete')

  dialogs.waitForVisible()
  I.waitForText('Do you really want to delete folder "' + folderName + '"?')
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForInvisible(folderName)

  I.openFolderMenu('Documents')
  I.see('Add to favorites')
  I.dontSee('Delete')
  I.pressKey('Escape')

  I.openFolderMenu('Music')
  I.see('Add to favorites')
  I.dontSee('Delete')
  I.pressKey('Escape')

  I.openFolderMenu('Pictures')
  I.see('Add to favorites')
  I.dontSee('Delete')
  I.pressKey('Escape')

  I.openFolderMenu('Videos')
  I.see('Add to favorites')
  I.dontSee('Delete')
  I.pressKey('Escape')
})

Scenario('[C8389] Move a folder', async ({ I, drive }) => {
  // Testrail description:
  // A folder hierarchy e.g.: My files Subfolder a SubSubFolder 1 Subfolder b
  // 1. Choose a folder
  // 2. Click the gear button (context menu)
  // 3. Choose "Move" (Move popup)
  // 4. Choose a new folder
  // 5. Confirm (Folder moved)
  // 6. Choose a standard folder (documents, music, pictures or videos) (no context menu available in top bar, only in folder tree)
  // 7. Click the gear button in folder tree (No "Move" option is available)
  const myFiles = await I.grabDefaultFolder('infostore')
  const folder = await I.haveFolder({ title: 'Subfolder a', module: 'infostore', parent: myFiles })
  await Promise.all([
    I.haveFolder({ title: 'Subfolder b', module: 'infostore', parent: myFiles }),
    I.haveFolder({ title: 'SubSubFolder 1', module: 'infostore', parent: folder })
  ])
  I.login(`app=io.ox/files&folder=${folder}`)
  I.waitForApp()

  drive.selectFile('SubSubFolder 1')
  I.clickToolbar('~More actions')
  I.clickDropdown('Move')
  I.waitForElement('.modal-dialog .tree-container [aria-label="Subfolder b"]')
  I.click('.modal-dialog .tree-container [aria-label="Subfolder b"]')
  I.click('Move', '.modal-dialog')
  I.waitForVisible('.io-ox-alert')
  I.waitForDetached('.io-ox-alert')
  I.selectFolder('Subfolder b')
  I.waitForElement('.filename[title="SubSubFolder 1"]')

  I.selectFolder('Documents')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Music')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Pictures')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')

  I.selectFolder('Videos')
  I.waitForNetworkTraffic()
  I.waitForDetached(locate('.io-ox-busy').inside('~List view'))
  I.dontSeeElement('~More actions')
})

Scenario('Folder contextmenu opening and closing', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Documents')
  I.openFolderMenu('Documents')
  I.waitForVisible('.smart-dropdown-container')
  I.pressKey('Escape')
  I.waitForDetached('.smart-dropdown-container')
})

Scenario('[C8390] Folder tree', async ({ I, drive }) => {
  // Testrail description:
  // A folder tree with some items in it
  // 1. Go to My files (Subfolders including virtual folders are displayed in the drive main view)
  // 2. Open every subfolder
  // 3. Close every subfolder
  const folder = await I.haveFolder({ title: 'Folders', module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  await Promise.all([
    I.haveFolder({ title: 'subfolder_1', module: 'infostore', parent: folder }),
    I.haveFolder({ title: 'subfolder_2', module: 'infostore', parent: folder })
  ])
  const subFolder = await I.haveFolder({ title: 'subfolder_3', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFolder({ title: 'subsubfolder_1', module: 'infostore', parent: subFolder }),
    I.haveFolder({ title: 'subsubfolder_2', module: 'infostore', parent: subFolder })
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  const myFiles = locate('.folder-tree .folder-label').withText('My files')
  I.waitForElement(myFiles)
  I.click(myFiles)
  I.pressKey('ArrowRight')
  I.see('Documents', '.folder-tree')
  I.see('Music', '.folder-tree')
  I.see('Pictures', '.folder-tree')
  I.see('Videos', '.folder-tree')
  I.see('Folders', '.folder-tree')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowRight')
  I.waitForText('Templates', 2, '.folder-tree')
  // was a loop before changing the sorting
  // for (let i = 0; i <= 4; i++) {
  I.pressKey('ArrowDown')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowRight')
  I.waitForElement('.file-list-view.complete')
  I.waitForText('subfolder_1', 2, '.folder-tree')
  I.waitForText('subfolder_2', 2, '.folder-tree')
  I.waitForText('subfolder_3', 2, '.folder-tree')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowRight')
  I.waitForText('subsubfolder_1', 2, '.folder-tree')
  I.waitForText('subsubfolder_2', 2, '.folder-tree')
  I.pressKey('ArrowLeft')
  I.dontSee('subsubfolder_1', '.folder-tree')
  I.dontSee('subsubfolder_2', '.folder-tree')
  I.pressKey('ArrowUp')
  I.pressKey('ArrowUp')
  I.pressKey('ArrowUp')
  // on "Folders"
  I.pressKey('ArrowLeft')
  I.dontSee('subfolder_1', '.folder-tree')
  I.dontSee('subfolder_2', '.folder-tree')
  I.dontSee('subfolder_3', '.folder-tree')
  I.pressKey('ArrowUp')
  I.pressKey('ArrowUp')
  // on "Documents"
  I.pressKey('ArrowLeft')
  I.dontSee('Templates', '.folder-tree')
  I.pressKey('ArrowUp')
  // on "My files"
  I.pressKey('ArrowLeft')
  I.dontSee('Documents', '.folder-tree')
  I.dontSee('Music', '.folder-tree')
  I.dontSee('Pictures', '.folder-tree')
  I.dontSee('Videos', '.folder-tree')
  I.dontSee('Folders', '.folder-tree')
})

Scenario('[C114139] Default public folder permissions', async ({ I, drive, dialogs, users }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  // Add / create public folder
  const publicFolderName = 'QA'
  I.waitForText('Public files', 5, '.folder-tree')
  I.selectFolder('Public files')

  drive.clickSecondary('New folder')
  dialogs.waitForVisible()
  I.waitForText('Add new folder', 5, dialogs.header)
  await I.grabDefaultFolder(I.fillField('Folder name', publicFolderName))
  dialogs.clickButton('Add')
  I.waitForDetached('.modal-dialog')

  I.waitForApp()
  I.selectFolder(publicFolderName)
  drive.shareFolder(users[1].get('name'), 'Author')
  I.logout()

  I.login('app=io.ox/files', { user: users[1] })
  I.waitForApp()
  I.waitForText('Public files', 5, '.folder-tree')
  I.selectFolder('Public files')

  I.waitForText(publicFolderName, 5, '.list-item')
  I.selectFolder(publicFolderName)
  I.openFolderMenu(publicFolderName)

  I.clickDropdown('Permissions')
  I.waitForElement(locate('.permissions-view .row').at(2))
  I.see('Author', '.permissions-view .row .role')
  I.see('Owner', '.permissions-view .row .role')
  I.waitForVisible('.detail-dropdown .btn')
  I.click('.detail-dropdown .btn')
  // check if user is able to read, create and delete all folders/objects.
  I.see('Folder', '.dropdown-header')
  I.see('View the folder', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Create objects', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Create objects and subfolders', 'li[role="presentation"] a[aria-checked="true"]')
  // create is true
  I.see('Read permissions', '.dropdown-header')
  I.see('View the folder', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Create objects', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Create objects and subfolders', 'li[role="presentation"] a[aria-checked="true"]')
  // read is true
  I.see('Write permissions', '.dropdown-header')
  I.see('View the folder', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Read own objects', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Read all objects', 'li[role="presentation"] a[aria-checked="true"]')
  // delete is true
  I.see('Delete permissions', '.dropdown-header')
  I.see('None', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Delete own objects', 'li[role="presentation"] a[aria-checked="false"]')
  I.see('Delete all objects', 'li[role="presentation"] a[aria-checked="true"]')
  // user is true
  I.see('Administrative role', '.dropdown-header')
  I.see('User', 'li[role="presentation"] a[aria-checked="true"]')
  I.see('Administrator', 'li[role="presentation"] a[aria-checked="false"]')
})

Scenario('[C319888] Search', async ({ I, drive }) => {
  const folder = await I.haveFolder({ title: 'Folders', module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  await Promise.all([
    I.haveFolder({ title: 'subfolder_1', module: 'infostore', parent: folder }),
    I.haveFolder({ title: 'subfolder_2', module: 'infostore', parent: folder })
  ])
  const subFolder = await I.haveFolder({ title: 'subfolder_3', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFolder({ title: 'subsubfolder_1', module: 'infostore', parent: subFolder }),
    I.haveFolder({ title: 'subsubfolder_2', module: 'infostore', parent: subFolder })
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  const myFiles = locate('.folder-tree .folder-label').withText('My files')
  I.waitForElement(myFiles)
  I.click(myFiles)

  // Search for a folder (fullname)
  I.click('#io-ox-topsearch .search-field')
  // Enter "subfolder_1" in the inputfield, than hit enter.
  I.fillField('#io-ox-topsearch .search-field', 'subfolder_1')
  I.pressKey('Enter')

  // Checking result/Folder matching this name is displayed
  I.waitForText('subfolder_1', 5, '.list-view')
  I.waitForText('subsubfolder_1', 5, '.list-view')

  // Search for a non existing folder
  I.click('#io-ox-topsearch .search-field')
  // Enter "nonexisting" in the inputfield, than hit enter.
  I.fillField('#io-ox-topsearch .search-field', 'nonexisting')
  I.pressKey('Enter')

  // Checking result/No folder displayed
  I.waitForText('No search results', 5, '.file-list-view')
  I.dontSee('subfolder_1', '.list-view')
  I.dontSee('subsubfolder_1', '.list-view')

  // Search for only one letter
  I.click('#io-ox-topsearch .search-field')
  // Enter "3" in the inputfield, than hit enter.
  I.fillField('#io-ox-topsearch .search-field', '3')
  I.pressKey('Enter')

  // Checking result/all folder with th letter displayed
  I.waitForText('subfolder_3', 5, '.list-view')
  I.dontSee('subsubfolder_1', '.list-view')
})

Scenario('[OXUIB-1643] Move files to trigger pagination', async ({ I, users, drive }) => {
  /** This is solved with sessions see mail/move_copy_test.js for tab-variant */

  const [folder1, folder2] = await Promise.all([
    I.haveFolder(sharedFolder('folder1', await I.grabDefaultFolder('infostore'), users)),
    I.haveFolder(sharedFolder('folder2', await I.grabDefaultFolder('infostore'), users)),
    I.haveSetting('io.ox/mail//listview/primaryPageSize', 2),
    I.haveSetting('io.ox/core//refreshInterval', 3000000)
  ])
  await Promise.all([0, 1, 2].map(i => I.haveFile(folder1, { name: `file${i}.txt` })))

  await session('Move files away', async () => {
    I.login(`app=io.ox/files&folder=${folder1}`)
    I.waitForApp()
    I.pressKeyDown('Command')
    drive.selectFile('file1.txt')
    drive.selectFile('file2.txt')
    I.pressKeyUp('Command')
    drive.moveManuallyTo(folder2)
  })
  await session('Move files back', async () => {
    I.login(`app=io.ox/files&folder=${folder2}`)
    I.waitForApp()
    I.pressKeyDown('Command')
    I.waitForText('file1')
    drive.selectFile('file1.txt')
    drive.selectFile('file2.txt')
    I.pressKeyUp('Command')
    drive.moveManuallyTo(folder1)
  })
  await session('Move files away', async () => {
    I.triggerRefresh()
    I.waitForApp()
    I.waitForText('file1')
    I.waitForElement('.filename[title="file1.txt"]')
    I.waitForText('file2')
    I.waitForElement('.filename[title="file2.txt"]')
    I.dontSeeElement('.busy-indicator')
  })
})
