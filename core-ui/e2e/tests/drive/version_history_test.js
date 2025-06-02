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

Feature('Drive > General')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8365] Version history', async ({ I, drive }) => {
  const timestamp1 = Math.round(+new Date() / 1000)
  // @ts-ignore
  const filePath = path.join(global.output_dir, 'C8365.txt')

  await fs.promises.writeFile(filePath, `timestamp1: ${timestamp1}`)
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  // @ts-ignore
  await I.haveFile(infostoreFolderID, path.relative(global.codecept_dir, filePath))
  await I.haveSetting('io.ox/files//showDetails', true)

  I.login('app=io.ox/files')
  I.waitForApp()
  drive.selectFile('C8365.txt')

  // Upload new version
  const timestamp2 = Math.round(+new Date() / 1000)
  await fs.promises.writeFile(filePath, `timestamp2: ${timestamp2}`)
  I.waitForElement('.file-input')
  I.attachFile('.file-input', 'output/C8365.txt')
  I.click('Upload', '.modal-dialog')
  I.waitForNetworkTraffic()
  // Verify there's new version of the file
  I.waitForElement(locate('.version-count').withText('2'))
  I.waitForVisible('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForEnabled('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.click('.viewer-fileversions.sidebar-panel .panel-toggle-btn')
  I.waitForElement('.versiontable.table')
  I.waitNumberOfVisibleElements('tr.version', 2, 10)

  // Edit file and save it
  const timestamp3 = String(Math.round(+new Date() / 1000))
  drive.selectFile('C8365.txt')
  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-editor')
  I.waitForVisible('.content.form-control')
  I.waitForEnabled('.content.form-control')
  I.fillField('.content', timestamp3)
  I.seeInField('.content', timestamp3)
  I.click('Save')
  I.waitForNetworkTraffic()
  I.wait(1)
  I.click('Close')
  I.waitForDetached('.io-ox-editor')

  // Verify there's new version of the file
  I.waitForElement(locate('.version-count').withText('3'), 15)
  I.waitForElement('.versiontable.table')
  I.waitNumberOfVisibleElements('tr.version', 3, 10)
})
