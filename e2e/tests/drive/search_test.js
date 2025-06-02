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

Feature('Drive > Search')

Before(async ({ I, users }) => {
  await users.create()

  const folder = await I.grabDefaultFolder('infostore')
  const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder })
  await Promise.all([
    I.haveFile(folder, 'media/files/0kb/document.doc'),
    I.haveFile(testFolder, 'media/files/0kb/spreadsheet.xls')
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Search for documents', async ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  // Search for "document.doc"
  I.fillField('.search-field', 'document.doc')
  I.pressKey('Enter')
  I.dontSeeElement('.filter.flex-row')
  I.waitForElement('.file-list-view .list-item.selectable')
  I.seeNumberOfVisibleElements('.file-list-view .list-item.selectable', 1)
  I.seeElement(locate('.file-list-view .filename').withText('document'))

  // Check dropdown
  I.click('~More search options')
  I.waitForDetached('.filters.flex-row .filter.flex-row')
  I.seeInField('Search files', '')
  I.seeInField('folder', 'all')
  I.seeInField('type', 'all')
  I.seeInField('words', 'document.doc')
  I.seeInField('after', '')

  // Change folder
  I.selectOption('folder', 'Current folder')
  I.click('Search', '#io-ox-topsearch')

  I.waitForText('Search in Current folder', 5, '.filter.flex-row')

  I.click('~Cancel search')

  // Search for type 'Spreadsheets'
  I.click('~More search options')
  I.waitForElement('.form-control[name="type"]')
  I.selectOption('type', 'Spreadsheets')
  I.waitForText('Spreadsheets', 5, '.form-control[name="type"]')
  I.click('Search', '.search-view.open .dropdown')

  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForElement('.file-list-view .list-item.selectable')
  I.seeNumberOfVisibleElements('.file-list-view .list-item.selectable', 1)
  I.see('spreadsheet', '.filename')

  // Change back to "all" types
  I.click('~More search options')
  I.waitForElement('.form-control[name="type"]')
  I.selectOption('type', 'all')
  I.click('Search', '#io-ox-topsearch')

  I.dontSeeElement('.filter.flex-row')
  I.waitForElement('.file-list-view .list-item.selectable')
  I.seeNumberOfVisibleElements('.file-list-view .list-item.selectable', 6)
})
