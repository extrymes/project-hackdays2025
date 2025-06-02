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

Feature('Drive > Misc')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C114352] Create folder in copy/move dialog', async ({ I, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')

  // 1. Go to Drive
  I.login('app=io.ox/files')
  I.waitForApp()

  // 2. Select any file
  drive.selectFile('testdocument.odt')
  I.waitForVisible('~Details')

  // 3. Open context menu and select "Move"
  I.clickToolbar('~More actions')
  I.clickDropdown('Move')
  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)

  // 4. Select "My files" and click "Create folder"
  // "My files" is already selected by default.
  dialogs.clickButton('Create folder')
  I.waitForText('Add new folder', 5, dialogs.header)

  // 5. Choose a name and hit "Add"
  I.fillField('[data-point="io.ox/core/folder/add-popup"] input', 'Foobar')
  dialogs.clickButton('Add')
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('.selected[aria-label="Foobar"]')

  // 6. Select the new folder and "Move"
  // Folder is already selected by default.
  dialogs.clickButton('Move')
  I.waitForText('File has been moved')
  I.waitForInvisible('File has been moved')
  I.selectFolder('Foobar')
  I.waitForElement('.filename[title="testdocument.odt"]')
})

Scenario('Moved file should be still visible in search results', async ({ I, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')

  // 1. Go to Drive
  I.login('app=io.ox/files')
  I.waitForApp()

  // 2. Search field
  I.click('.search-field')
  I.waitForFocus('.search-field')
  I.fillField('.search-field', 'testdocument.odt')
  I.pressKey('Enter')
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.waitForElement('.filename[title="testdocument.odt"]')

  // 3. Click move
  I.rightClick('.list-view .filename[title="testdocument.odt"]')
  I.clickDropdown('Move')
  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)

  // 4. Create folder to move file
  dialogs.clickButton('Create folder')
  I.waitForText('Add new folder', 5, dialogs.header)

  // 5. Choose a name and hit "Add"
  I.fillField('[data-point="io.ox/core/folder/add-popup"] input', 'Foobar')
  dialogs.clickButton('Add')
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('.selected[aria-label="Foobar"]')

  // 6. Move file
  dialogs.clickButton('Move')
  I.waitForText('File has been moved')
  I.waitForInvisible('File has been moved')

  // 7. Verify file is still in search results
  I.waitForElement('.filename[title="testdocument.odt"]')
})

Scenario('Moving a file after doing a search should be listed in search results', async ({ I, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')

  I.login('app=io.ox/files')
  I.waitForApp()
  I.waitForElement('.filename[title="testdocument.odt"]')

  const moveFile = async (source, target, fileName) => {
    I.selectFolder(source)
    I.waitForApp()
    I.rightClick(`.list-view .filename[title="${fileName}"]`)
    I.clickDropdown('Move')
    dialogs.waitForVisible()
    I.waitForText('Move', 5, dialogs.header)

    I.click(`.folder-picker-dialog li[aria-label="${target}"]`)
    I.waitForElement(`.folder-picker-dialog .selected[aria-label="${target}"]`)

    dialogs.clickButton('Move')
    I.waitForText('File has been moved')
    I.waitForInvisible('File has been moved')
  }

  const searchValue = 'testdocument.od'
  // Search file
  I.click('.search-field')
  I.waitForFocus('.search-field')
  I.fillField('.search-field', searchValue)
  I.pressKey('Enter')
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.waitForElement('.filename[title="testdocument.odt"]')
  I.click('button[aria-label="Cancel search"]')

  await moveFile('My files', 'Pictures', 'testdocument.odt')

  // Search file again with same value
  I.click('.search-field')
  I.fillField('.search-field', searchValue)
  I.pressKey('Enter')
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.waitForElement('.filename[title="testdocument.odt"]')
})

Scenario('[C265694] Hidden parent folder hierarchy for anonymous guest users', async ({ I, drive, dialogs }) => {
  /*
     * Preconditions:
     *
     * The following folder structure is available in Drive
     *
     * └─ My files
     * ---└─ A
     * ------└─ B
     * ---------└─ C
     *
     */

  const myFiles = await I.grabDefaultFolder('infostore')
  const folderA = await I.haveFolder({ title: 'folderA', module: 'infostore', parent: myFiles })
  const folderB = await I.haveFolder({ title: 'folderB', module: 'infostore', parent: folderA })
  await I.haveFolder({ title: 'folderC', module: 'infostore', parent: folderB })

  I.login('app=io.ox/files')
  I.waitForApp()

  // Doubleclick through folders in listview until we reach the end (folderC)
  I.waitForElement(locate('.list-item').withText('folderA').inside('.list-view'))
  I.doubleClick(locate('.list-item').withText('folderA').inside('.list-view'))
  I.waitForElement(locate('.list-item').withText('folderB').inside('.list-view'))
  I.doubleClick(locate('.list-item').withText('folderB').inside('.list-view'))
  I.waitForElement(locate('.list-item').withText('folderC').inside('.list-view'))
  I.click(locate('.list-item').withText('folderC').inside('.list-view'))

  I.click('~Share')
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

  // Open the sharing link in another browser tab
  I.amOnPage(Array.isArray(url) ? url[0] : url)
  I.waitForApp()

  I.waitForText('folderC', 5, '.breadcrumb-view')
  I.dontSee('folderA', '.breadcrumb-view')
  I.dontSee('folderB', '.breadcrumb-view')

  I.dontSee('folderA', '.folder-tree')
  I.dontSee('folderB', '.folder-tree')
  I.see('folderC', '.folder-tree')
})

Scenario('Logout right before running into error storing data in JSLob', async ({ I }) => {
  await I.haveSetting('io.ox/files//viewOptions',
    [...Array(2500)]
      .map(() => ({ sort: 702, order: 'ASC', layout: 'list' }))
      .reduce(function (acc, val, ix) {
        acc[ix + 50] = val
        return acc
      }, {})
  )
  I.login('app=io.ox/files')
  I.clickToolbar('Sort by')
  I.clickDropdown('Date')
})

Scenario('Send file via mail while exceeding threshold', async ({ I, drive }) => {
  const defaultFolder = await I.grabDefaultFolder('infostore')
  await I.haveFile(defaultFolder, 'media/files/generic/testdocument.odt')

  I.login('app=io.ox/files')

  await I.executeScript(async function () {
    const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
    mailSettings.set('compose/shareAttachments/threshold', 100)
  })

  I.waitForApp()
  I.waitForElement('.filename[title="testdocument.odt"]')
  drive.selectFile('testdocument.odt')
  I.waitForVisible('~Details')
  I.clickToolbar('~More actions')
  I.clickDropdown('Send by email')

  I.waitForText('Mail quota limit reached.')
  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
  I.see('ODT')
})

Scenario('[Bug 61823] Drive shows main folder content instead of content from selected folder', async ({ I, drive, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('infostore')
  const testFolder1 = await I.haveFolder({ title: 'testFolder1', module: 'infostore', parent: defaultFolder })
  const testFolder2 = await I.haveFolder({ title: 'testFolder2', module: 'infostore', parent: defaultFolder })

  await I.haveFile(defaultFolder, 'media/files/generic/testdocument.odt')
  await I.haveFile(testFolder1, 'media/files/generic/contact_picture.png')
  await I.haveFile(testFolder2, 'media/files/generic/testpresentation.ppsm')

  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForElement('.filename[title="testdocument.odt"]')

  // delete folder
  I.click('.list-item[aria-label*="testFolder1"]')
  I.waitForVisible('~Delete')
  I.click('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')

  // need to be faster than delete operation (according to bug)
  // automated testing should be fast enough. Network throttling will not help here since there is no upload or download involved in a delete request
  I.selectFolder('testFolder2')
  I.waitForElement('.filename[title="testpresentation.ppsm"]')
  I.waitForDetached('.filename[title="testdocument.odt"]')
})

Scenario('[OXUIB-1319] Go back to search results after opening a folder', async ({ I, drive, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('infostore')
  const parentFolder = await I.haveFolder({ title: 'testFolder1', module: 'infostore', parent: defaultFolder })
  await I.haveFolder({ title: 'testFolder2', module: 'infostore', parent: parentFolder })

  I.login('app=io.ox/files')
  I.waitForApp()
  I.waitForElement(locate('.list-item').withText('testFolder1').inside('.list-view'))

  const searchValue = 'testFolder2'
  // Search file
  I.click('.search-field')
  I.waitForFocus('.search-field')
  I.fillField('.search-field', searchValue)
  I.pressKey('Enter')
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.waitForElement(locate('.list-item').withText(searchValue).inside('.list-view'))
  I.doubleClick(locate('.list-item').withText(searchValue).inside('.list-view'))
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.retry(5).click({ xpath: '//a[text()="Search: testFolder2"][@role="button"]' })
  I.waitForDetached('.busy-indicator.io-ox-busy')
  I.waitForElement(locate('.list-item').withText(searchValue).inside('.list-view'))
})

Scenario('[OXUIB-1980] Move a folder in FolderTree from ContextMenu', async ({ I, drive, dialogs }) => {
  const defaultFolder = await I.grabDefaultFolder('infostore')
  const parentFolder = await I.haveFolder({ title: 'testFolder1', module: 'infostore', parent: defaultFolder })
  await I.haveFolder({ title: 'testFolder2', module: 'infostore', parent: parentFolder })

  I.login('app=io.ox/files')
  I.waitForApp()
  I.click('.folder-node[title*="My files"] .folder-arrow')
  I.waitForElement(locate('.folder-label').withText('testFolder1').inside('.folder-tree'))

  I.click('.folder-node[title*="testFolder1"]')
  I.waitForVisible('~Actions for testFolder1')
  I.click('~Actions for testFolder1')
  I.clickDropdown('Move')
  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)
  I.click('.folder-picker-dialog li[aria-label="Music"]')
  I.waitForElement('.folder-picker-dialog .selected[aria-label="Music"]')
  dialogs.clickButton('Move')
  I.waitForText('Folder has been moved')
  I.waitForInvisible('Folder has been moved')
})
