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

Feature('Settings > Drive')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C265095] File version history: Keep 5 recent versions', async ({ I, drive, users, settings }) => {
  await users[0].context.hasCapability('autodelete_file_versions')

  // Generate file
  // @ts-ignore
  const filePath = path.join(global.output_dir, 'C265095.txt')
  await fs.promises.writeFile(filePath, 'file')
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, path.relative(global.codecept_dir, filePath))

  await I.haveSetting('io.ox/files//showDetails', true)

  I.login('app=io.ox/files&section=io.ox/files/settings/advanced&settings=virtual/settings/io.ox/files')
  I.waitForApp()

  I.waitForText('Maximum version count')
  I.selectOption('Maximum version count', '5 versions')
  I.waitForText('5 versions')
  await I.waitForSetting({ 'io.ox/files': { features: { autodelete: { maxVersions: 6 } } } }, 10)
  settings.close()

  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 2')
  I.seeInField('.content', 'version 2')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('2', '.version-count')

  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 3')
  I.seeInField('.content', 'version 3')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('3', '.version-count')

  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 4')
  I.seeInField('.content', 'version 4')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('4', '.version-count')

  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 5')
  I.seeInField('.content', 'version 5')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('5', '.version-count')

  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 6')
  I.seeInField('.content', 'version 6')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('6', '.version-count')

  // Version count must be limited from here on (5 versions + current version)
  drive.selectFile('C265095.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 7')
  I.seeInField('.content', 'version 7')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('6', '.version-count')

  // Verify that the last visible version is correct
  I.waitForVisible('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForEnabled('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.click('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForElement('.versiontable.table')
  I.click('[data-version-number]:last-child [data-dropdown="io.ox/files/versions/links/inline/older"]')
  I.clickDropdown('View')
  I.waitForElement('.io-ox-viewer')
  I.waitForText('version 2', 5, '.plain-text')
})

Scenario('[C287406] File version history: Keep 1 recent versions', async ({ I, drive, users, settings }) => {
  await users[0].context.hasCapability('autodelete_file_versions')

  // Generate file
  // @ts-ignore
  const filePath = path.join(global.output_dir, 'C287406.txt')
  await fs.promises.writeFile(filePath, 'file')
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, path.relative(global.codecept_dir, filePath))

  await I.haveSetting('io.ox/files//showDetails', true)

  I.login('app=io.ox/files&section=io.ox/files/settings/advanced&settings=virtual/settings/io.ox/files')
  I.waitForApp()

  I.waitForText('Maximum version count')
  I.selectOption('Maximum version count', '1 version')
  await I.waitForSetting({ 'io.ox/files': { features: { autodelete: { maxVersions: 2 } } } }, 10)
  settings.close()

  drive.selectFile('C287406.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 2')
  I.seeInField('.content', 'version 2')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('2', '.version-count')

  // Version count must be limited from here on (1 versions + current version)
  drive.selectFile('C287406.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', 'version 3')
  I.seeInField('.content', 'version 3')
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')
  I.see('2', '.version-count')

  // Verify that the last visible version is correct
  I.waitForVisible('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForEnabled('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.click('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForElement('.versiontable.table')
  I.click('[data-version-number]:last-child [data-dropdown="io.ox/files/versions/links/inline/older"]')
  I.clickDropdown('View')
  I.waitForElement('.io-ox-viewer')
  I.waitForText('version 2', 5, '.plain-text')
})
