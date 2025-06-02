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
const util = require('node:util')
const readdir = util.promisify(fs.readdir)

Feature('Drive > General')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8362] Add note', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.clickSecondary('New note')
  I.waitForElement({ css: 'input[type="text"].title' })
  I.fillField('Title', 'Test title')
  I.fillField('Note', 'Test body')
  I.click('Save')
  I.wait(2) // Wait two seconds to let the node be saved
  I.click('Close')
  I.waitForDetached('textarea.content')
  I.waitForElement('.filename[title="Test title.txt"]')
})

// Bug: File input is not selectable (display: none), which is also a pot. a11y bug
Scenario('[C8364] Upload new file @smoketest', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.clickSecondary('Upload files')
  // the input field is created on demand when Upload files is clicked. This click also closes the dropdown
  I.attachFile('.primary-action .dropdown input[name=file]', 'media/files/0kb/document.txt')
  I.waitForElement('.filename[title="document.txt"]')
  I.waitForElement('.list-item.selected .filename[title="document.txt"]')
})

// Note: This is not accessible H4 and textarea does not have a label
Scenario('[C8366] Edit description', async ({ I, drive, dialogs }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()

  const sidebarDescription = locate('.viewer-sidebar-pane .sidebar-panel-body .description').as('Sidebar')
  const descriptionTextarea = dialogs.main.find('textarea.form-control')

  drive.selectFile('document.txt')

  I.say('Add description')
  I.waitForText('Description')
  I.click(locate('.sidebar-panel-title').withText('Description'))
  I.waitForElement('~Edit description')
  I.click('~Edit description')
  dialogs.waitForVisible()
  I.waitForElement(descriptionTextarea)
  I.fillField(descriptionTextarea, 'Test description')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.say('Check description #1')
  I.waitForElement({ xpath: '//div[contains(@class, "viewer-sidebar-pane")]//*[text()="Test description"]' })

  I.say('Edit description')
  drive.selectFile('document.txt')
  I.waitForElement('~Edit description')
  I.click('button[data-action="edit-description"]')
  dialogs.waitForVisible()
  I.fillField(descriptionTextarea, 'Test description changed')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.say('Check description #2')
  I.waitForVisible(sidebarDescription)
  I.waitForText('Test description changed', 5, sidebarDescription)
})

Scenario('[C8368] View change @bug', async ({ I, drive }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()
  I.see('Documents')
  I.see('Music')
  I.see('Pictures')
  I.see('Videos')
  I.waitForElement('.filename[title="document.txt"]')

  I.click('~Settings')
  I.waitForElement('.dropdown.open')
  I.clickDropdown('Icons')
  I.waitForElement('.file-list-view.complete.grid-layout')
  I.see('Documents', '.grid-layout')
  I.see('Music', '.grid-layout')
  I.see('Pictures', '.grid-layout')
  I.see('Videos', '.grid-layout')
  I.waitForElement('.filename[title="document.txt"]')

  I.click('~Settings')
  I.waitForElement('.dropdown.open')
  I.clickDropdown('Tiles')
  I.waitForElement('.file-list-view.complete.tile-layout')
  I.see('Documents', '.tile-layout')
  I.see('Music', '.tile-layout')
  I.see('Pictures', '.tile-layout')
  I.see('Videos', '.tile-layout')

  I.click('~Settings')
  I.waitForElement('.dropdown.open')
  I.clickDropdown('List')
  I.waitForElement('.file-list-view.complete')
  I.see('Documents')
  I.see('Music')
  I.see('Pictures')
  I.see('Videos')
  I.waitForElement('.filename[title="document.txt"]')
})

Scenario('[C8369] Search', async ({ I, drive }) => {
  const searchFor = (query) => {
    I.click('.search-field')
    I.waitForFocus('.search-field')
    I.fillField('.search-field', query)
    I.pressKey('Enter')
    I.waitForDetached('.busy-indicator.io-ox-busy')
  }

  const folder = await I.grabDefaultFolder('infostore')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFile(testFolder, 'media/files/0kb/document.txt'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.rtf'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.odt'),
    I.haveFile(testFolder, 'media/files/generic/testpresentation.ppsm')
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Testfolder')
  // search with file name
  searchFor('document.txt')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 1)
  // search with noneexisting
  I.clearField('.search-field')
  searchFor('noneexisting')
  I.dontSee('.file-list-view .list-item')
  I.waitForText('No search results', 5, '.file-list-view')
  // search with d
  I.clearField('.search-field')
  searchFor('d')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 7)
  // search with do
  I.clearField('.search-field')
  searchFor('do')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 4)
})

Scenario('[C8371] Delete file', async ({ I, drive }) => {
  const folder = await I.grabDefaultFolder('infostore')
  await I.haveFile(folder, 'media/files/0kb/document.txt')
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.selectFile('document.txt')
  I.clickToolbar('~Delete')
  I.waitForText('Do you really want to delete this item?')
  I.click('Delete')
  I.selectFolder('Trash')
  drive.selectFile('document.txt')
  I.clickToolbar('~Delete forever')
  I.waitForText('Do you really want to delete this item?')
  I.click('Delete')
  I.waitForDetached('.filename[title="document.txt"]')
})

Scenario('[C45039] Breadcrumb navigation', async ({ I, drive }) => {
  const parent = await I.haveFolder({ title: 'Folders', module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  await Promise.all([
    I.haveFolder({ title: 'subfolder1', module: 'infostore', parent }),
    I.haveFolder({ title: 'subfolder2', module: 'infostore', parent })
  ])
  const subFolder = await I.haveFolder({ title: 'subfolder3', module: 'infostore', parent })
  const subsubFolder = await I.haveFolder({ title: 'subsubfolder1', module: 'infostore', parent: subFolder })
  await I.haveFolder({ title: 'subsubfolder2', module: 'infostore', parent: subFolder })
  I.login('app=io.ox/files&folder=' + subsubFolder)
  I.waitForApp()
  I.waitForText('subfolder3', 5, '.breadcrumb-view')
  I.click({ xpath: '//a[text()="subfolder3"][@role="button"]' })
  I.waitForApp()
  I.waitForText('subsubfolder1', 5, '.list-view')
  I.waitForText('subsubfolder2', 5, '.list-view')
  I.click({ xpath: '//div[text()="subsubfolder2"]' })
  I.click('Drive', '.breadcrumb-view')
  I.waitForApp()
  I.waitForElement({ xpath: '//div[text()="Public files"]' })
  I.doubleClick({ xpath: '//div[text()="Public files"]' })
})

Scenario('[C45040] Sort files', async ({ I, drive }) => {
  const checkFileOrder = files => {
    files.forEach((name, index) => {
      I.see(name, '.list-item:nth-child(' + (index + 2) + ')')
    })
  }
  const folder = await I.grabDefaultFolder('infostore')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFile(testFolder, 'media/files/0kb/document.txt'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.rtf'),
    I.haveFile(testFolder, 'media/files/generic/testdocument.odt'),
    I.haveFile(testFolder, 'media/files/generic/testpresentation.ppsm')
  ])
  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Testfolder')
  I.waitForDetached('.io-ox-busy')
  I.waitForElement('.filename[title="document.txt"]')

  // Begins with Name ascending order
  I.say('Name > Ascending')
  checkFileOrder(['document', 'testdocument', 'testdocument', 'testpresentation'])
  I.clickToolbar('Sort by')
  I.click('Descending')
  I.waitForDetached('.io-ox-busy')
  I.say('Name > Descending')
  checkFileOrder(['testpresentation', 'testdocument', 'testdocument', 'document'])

  I.clickToolbar('Sort by')
  I.click('Date')
  I.waitForDetached('.io-ox-busy')
  I.say('Date > Descending')
  checkFileOrder(['testpresentation', 'testdocument', 'testdocument', 'document'])
  I.clickToolbar('Sort by')
  I.click('Ascending')
  I.waitForDetached('.io-ox-busy')
  I.say('Date > Ascending')
  checkFileOrder(['document', 'testdocument', 'testdocument', 'testpresentation'])

  I.clickToolbar('Sort by')
  I.click('Size')
  I.waitForDetached('.io-ox-busy')
  I.say('Size > Ascending')
  checkFileOrder(['document', 'testdocument', 'testpresentation', 'testdocument'])
  I.clickToolbar('Sort by')
  I.click('Descending')
  I.waitForDetached('.io-ox-busy')
  I.say('Size > Descending')
  checkFileOrder(['testdocument', 'testpresentation', 'testdocument', 'document'])
})

Scenario('[C45041] Select files', async ({ I, drive }) => {
  const testFolder = await I.haveFolder({ title: 'Selecttest', module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  const filePath = 'media/files/0kb/'
  const files = await readdir(filePath)

  await I.haveFolder({ title: 'Subfolder', module: 'infostore', parent: testFolder })

  await Promise.all(files.filter(name => name !== '.DS_Store').map(name => I.haveFile(testFolder, filePath + name)))

  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Selecttest')

  I.clickToolbar('Select')
  I.clickDropdown('All')
  I.waitNumberOfVisibleElements('.file-list-view .list-item.selected', 23)

  I.clickToolbar('Select')
  I.clickDropdown('All files')
  I.waitNumberOfVisibleElements('.file-list-view .list-item.selected', 22)

  I.clickToolbar('Select')
  I.clickDropdown('None')
  I.dontSeeElementInDOM('.file-list-view .list-item.selected')
})

Scenario('[C45042] Filter files', async ({ I, drive }) => {
  const testFolder = await I.haveFolder({ title: 'Filtertest', module: 'infostore', parent: await I.grabDefaultFolder('infostore') })
  const filePath = 'media/files/0kb/'
  const files = await readdir(filePath)

  await Promise.all(files.filter(name => name !== '.DS_Store').map(name => I.haveFile(testFolder, filePath + name)))

  I.login('app=io.ox/files')
  I.waitForApp()
  I.selectFolder('Filtertest')
  I.clickToolbar('Select')
  I.click('PDFs')
  I.waitForElement('.filename[title="document.pdf"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 1)
  I.clickToolbar('Select')
  I.click('Text documents')
  I.waitForElement('.filename[title="document.doc"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 5)
  I.clickToolbar('Select')
  I.click('Spreadsheets')
  I.waitForElement('.filename[title="spreadsheet.xls"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 2)
  I.clickToolbar('Select')
  I.click('Presentations')
  I.waitForElement('.filename[title="presentation.ppsm"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 2)
  I.clickToolbar('Select')
  I.click('Images')
  I.waitForElement('.filename[title="image.gif"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 3)
  I.clickToolbar('Select')
  I.click('Music')
  I.waitForElement('.filename[title="music.mp3"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 5)
  I.clickToolbar('Select')
  I.click('Videos')
  I.waitForElement('.filename[title="video.avi"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 4)
  I.clickToolbar('Select')
  // Read comment at the beginning of the scenario to find out why
  // the following selector is so clunky
  I.click({ css: 'a[data-name="filter"][data-value="all"]' })
  I.waitForElement('.filename[title="document.doc"]')
  I.waitNumberOfVisibleElements('.file-list-view .list-item', 22)
})

// Bug: File input is not selectable (display: none), which is also a pot. a11y bug
Scenario('[Bug 63288] Cancel upload does not work in drive', async ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.clickSecondary('Upload files')
  // slow down network so we can click the cancel upload button
  await I.throttleNetwork('2G')
  // the input field is created on demand when Upload files is clicked. This click also closes the dropdown
  I.attachFile('.primary-action .dropdown input[name=file]', 'media/files/generic/2MB.dat')
  I.waitForText('Cancel')
  I.click('Cancel')
  // reset network speed
  await I.throttleNetwork('ONLINE')
  I.waitForDetached('.upload-wrapper')
  I.dontSee('2MB.dat')
})

Scenario('Upload and view an image @smoketest', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()
  drive.clickSecondary('Upload files')
  // the input field is created on demand when Upload files is clicked. This click also closes the dropdown
  I.attachFile('.primary-action .dropdown input[name=file]', 'media/images/ox_logo.png')
  I.waitForElement('.filename[title="ox_logo.png"]')
  I.waitForElement('.list-item.selected .filename[title="ox_logo.png"]')

  // view the image
  I.clickToolbar('~View')
  I.waitForVisible('.io-ox-viewer')
  I.see('ox_logo.png')
  I.waitForElement('.viewer-sidebar.open')
  I.waitForElement('.viewer-toolbar')
  I.waitForElement('.viewer-displayer-image')
  I.clickToolbar('~Close viewer')
  I.waitForDetached('.io-ox-viewer')
})
