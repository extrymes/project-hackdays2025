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

const fs = require('node:fs')
const path = require('node:path')

Feature('Drive')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7886] Enable hidden folders and files', async ({ I, drive, settings }) => {
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await Promise.all([
    I.haveSetting({ 'io.ox/files': { showHidden: true } }),
    I.haveFile(infostoreFolderID, 'media/files/generic/.hiddenfile.dat'),
    I.haveFolder({ title: '.hiddenfolder', module: 'infostore', parent: infostoreFolderID })
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  // check for hidden file and folder
  I.waitForElement('.filename[title=".hiddenfolder"]')
  I.waitForElement('.filename[title=".hiddenfile.dat"]')

  settings.open('Drive', 'Advanced settings')
  I.waitForText('Show hidden files and folders')
  I.click('Show hidden files and folders')
  await I.waitForSetting({ 'io.ox/files': { showHidden: false } })
  settings.close()

  I.waitForDetached('.filename[title=".hiddenfolder"]')
  I.waitForDetached('.filename[title=".hiddenfile.dat"]')
})

Scenario('[C7887] Disable hidden folders and files', async ({ I, drive, settings }) => {
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await Promise.all([
    I.haveSetting('io.ox/files//showHidden', false),
    I.haveFile(infostoreFolderID, 'media/files/generic/.hiddenfile.dat'),
    I.haveFolder({ title: '.hiddenfolder', module: 'infostore', parent: infostoreFolderID })
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  // check for hidden file and folder
  I.waitForDetached('.filename[title=".hiddenfolder"]')
  I.waitForDetached('.filename[title=".hiddenfile.dat"]')

  settings.open('Drive', 'Advanced settings')
  I.click('Show hidden files and folders')
  settings.close()

  I.triggerRefresh()
  I.waitForElement('.filename[title=".hiddenfolder"]')
  I.waitForElement('.filename[title=".hiddenfile.dat"]')
})

Scenario('[C45046] Upload new version', async ({ I, drive }) => {
  // Generate TXT file for upload
  const timestamp1 = Math.round(+new Date() / 1000).toString()
  // @ts-ignore
  const filePath = path.join(global.output_dir, 'C45046.txt')

  await fs.promises.writeFile(filePath, timestamp1)
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  // @ts-ignore
  await I.haveFile(infostoreFolderID, path.relative(global.codecept_dir, filePath))

  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('C45046.txt')
  I.clickToolbar('~View')
  I.waitForElement('.io-ox-viewer')

  I.waitForText(timestamp1)
  const timestamp2 = Math.round(+new Date() / 1000).toString()
  await fs.promises.writeFile('output/C45046.txt', timestamp2)
  // @ts-ignore
  I.attachFile('.io-ox-viewer input.file-input', path.relative(global.codecept_dir, filePath))
  I.click('Upload', '.modal-dialog')

  I.waitForText(timestamp2, 30)
  I.waitForElement(locate('.version-count').withText('2'))
  I.waitForVisible('~Close viewer', 10)

  I.clickToolbar('~Close viewer')
  I.waitForDetached('.io-ox-viewer', 30)
})

Scenario('[C45048] Edit description', async ({ I, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), { content: 'file', name: 'C45048.txt' })

  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('C45048.txt')
  I.clickToolbar('~View')
  I.waitForText('Details', 10, '.io-ox-viewer .detail-pane h1')
  I.waitForText('file', 5, '.plain-text')

  I.waitForElement(locate('.io-ox-viewer .sidebar-panel-title').withText('Description'))
  I.click(locate('.io-ox-viewer .sidebar-panel-title').withText('Description'))
  I.waitForElement('~Edit description', 5)
  I.click('~Edit description', '.io-ox-viewer')
  dialogs.waitForVisible()
  I.waitForVisible('textarea', 5)
  I.fillField('.modal-body textarea', 'C45048')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.see('C45048', '.io-ox-viewer .description')
})

Scenario('[C45052] Delete file', async ({ I, users, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.odt')
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/generic/testdocument.rtf')
  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('testdocument.odt')
  I.clickToolbar('~Delete')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="testdocument.odt"]')
  I.waitForElement('.list-item.selected .filename[title="testdocument.rtf"]')
})

Scenario('[DOCS-4816] Delete items in list via keyboard', async ({ I, users, drive, dialogs }) => {
  const myFiles = await I.grabDefaultFolder('infostore')
  const testfolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: myFiles })
  await I.haveFolder({ title: 'abc_folder1', module: 'infostore', parent: testfolder })
  await I.haveFolder({ title: 'abc_folder2', module: 'infostore', parent: testfolder })
  await I.haveFolder({ title: 'multi_select_folder1', module: 'infostore', parent: testfolder })
  await I.haveFolder({ title: 'multi_select_folder2', module: 'infostore', parent: testfolder })
  await I.haveFolder({ title: 'xyz_folder1', module: 'infostore', parent: testfolder })
  await I.haveFolder({ title: 'xyz_folder2', module: 'infostore', parent: testfolder })
  await I.haveFile(testfolder, { content: 'abc', name: 'abc_file1.txt' })
  await I.haveFile(testfolder, { content: 'abc', name: 'abc_file2.txt' })
  await I.haveFile(testfolder, { content: 'abc', name: 'xyz_file1.txt' })
  await I.haveFile(testfolder, { content: 'abc', name: 'xyz_file2.txt' })

  I.login('app=io.ox/files', { user: users[0] })
  I.waitForApp()
  I.selectFolder('Testfolder')

  // 1) folders and files consecutively
  drive.selectFile('xyz_folder1')
  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="xyz_folder1"]')
  I.waitForFocus(locate('~xyz_folder2').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="xyz_folder2"]')

  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="xyz_folder2"]')
  I.waitForFocus(locate('~abc_file1.txt').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="abc_file1.txt"]')

  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="abc_file1.txt"]')
  I.waitForFocus(locate('~abc_file2.txt').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="abc_file2.txt"]')

  // there was an ancient bug 65291 where deleting two folders fast, consecutively did not appear in trash, verify that too
  I.selectFolder('Trash')
  I.waitForElement('.filename[title="xyz_folder1"]')
  I.waitForElement('.filename[title="xyz_folder2"]')
  I.waitForElement('.filename[title="abc_file1.txt"]')
  I.selectFolder('Testfolder')

  // 2) last item in list
  drive.selectFile('xyz_file2.txt')
  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="xyz_file2.txt"]')
  I.waitForFocus(locate('~xyz_file1.txt').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="xyz_file1.txt"]')

  // 3) first item in list
  drive.selectFile('abc_folder1')
  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="abc_folder1"]')
  I.waitForFocus(locate('~abc_folder2').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="abc_folder2"]')

  // 4) multi selection of files and folders
  drive.selectFile('multi_select_folder1')
  I.pressKey(['Shift', 'ArrowDown'])
  I.pressKey(['Shift', 'ArrowDown'])
  I.pressKey('Backspace')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.filename[title="multi_select_folder1"]')
  I.waitForDetached('.filename[title="multi_select_folder2"]')
  I.waitForDetached('.filename[title="abc_file2"]')
  I.waitForFocus(locate('~xyz_file1.txt').inside('.list-view'))
  I.waitForElement('.list-item.selected .filename[title="xyz_file1.txt"]')
})

Scenario('[C45061] Delete file versions', async ({ I, drive, dialogs }) => {
  // Generate TXT file for upload
  const infostoreFolderID = await I.grabDefaultFolder('infostore')

  await Promise.all([...Array(5).keys()].map(i => I.haveFile(infostoreFolderID, { content: `file ${i + 1}`, name: 'C45061.txt' })))

  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('C45061.txt')
  I.clickToolbar('~View')
  I.waitForText('Details', 10, '.io-ox-viewer .detail-pane h1')

  I.waitForElement(locate('.io-ox-viewer .version-count').withText('5'))
  I.click(locate('.io-ox-viewer .version-count').withText('5'))
  I.waitForElement('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle')
  I.click('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle')

  I.clickDropdown('View this version')
  I.waitForText('file 4', 5, '.plain-text')

  I.waitForElement('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle')
  I.click('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle')
  I.clickDropdown('Delete version')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete version')
  I.waitForDetached('.modal-dialog')

  I.waitForDetached(locate('.io-ox-viewer .version-count').withText('5'))
  I.waitForElement(locate('.io-ox-viewer .version-count').withText('4'))
})

Scenario('[C45062] Change current file version', async ({ I, drive }) => {
  // Generate TXT file for upload
  const infostoreFolderID = await I.grabDefaultFolder('infostore')

  await Promise.all([...Array(5).keys()].map(i => I.haveFile(infostoreFolderID, { content: `file ${i + 1}`, name: 'C45062.txt' })))

  I.login('app=io.ox/files')
  I.waitForApp()
  drive.selectFile('C45062.txt')
  I.clickToolbar('~View')
  I.waitForElement(locate('.io-ox-viewer .version-count').withText('5'))
  I.click(locate('.io-ox-viewer .version-count').withText('5'))
  I.waitForElement(locate('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle'))
  I.click(locate('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle'))
  I.clickDropdown('View this version')
  I.waitForText('file 4', 5, '.plain-text')
  I.click(locate('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle'))
  I.clickDropdown('Make this the current version')
  // wait for version 4 to be sorted to the top (current version is always at the top)
  I.waitForElement('.io-ox-viewer table.versiontable tr.version:nth-child(3)[data-version-number="4"]')
  I.wait(1)
  I.waitForElement('.io-ox-viewer .version.current .dropdown-toggle')
  I.click('.io-ox-viewer .version.current .dropdown-toggle')
  I.clickDropdown('View this version')
  I.waitForText('file 4', 5, '.plain-text')
})

Scenario('[C45063] Delete current file version', async ({ I, drive, dialogs }) => {
  // Generate TXT file for upload
  const infostoreFolderID = await I.grabDefaultFolder('infostore')

  await Promise.all([...Array(5).keys()].map(i => I.haveFile(infostoreFolderID, { content: `file ${i + 1}`, name: 'C45063.txt' })))

  I.login('app=io.ox/files')
  I.waitForApp()

  drive.selectFile('C45063.txt')
  I.clickToolbar('~View')

  I.waitForElement('.io-ox-viewer')
  I.waitForElement(locate('.io-ox-viewer .version-count').withText('5'))
  I.click(locate('.io-ox-viewer .version-count').withText('5'))

  const dropdownToggle = locate('.io-ox-viewer table.versiontable tr.version:nth-child(4) .dropdown-toggle')
  I.waitForElement(dropdownToggle)
  I.click(dropdownToggle)
  I.clickDropdown('View this version')
  I.waitForText('file 4', 5, '.plain-text')

  I.click(dropdownToggle)
  I.clickDropdown('Delete version')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete version')
  I.waitForDetached('.modal-dialog')

  I.waitForDetached(locate('.io-ox-viewer .version-count').withText('5'))
  I.waitForElement(locate('.io-ox-viewer .version-count').withText('4'))
})
