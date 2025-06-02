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

Feature('Settings > Drive')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C283261] Adding files with identical names - Add separate file', async ({ I, settings, drive }) => {
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.rtf')
  await I.haveSetting('io.ox/files//showDetails', true)

  I.login(['app=io.ox/files', 'settings=virtual/settings/io.ox/files'])
  I.waitForApp()
  I.waitForElement('.io-ox-drive-settings')
  I.checkOption('Rename automatically and keep both files separately')
  settings.close()

  // Add file with existing name
  drive.clickSecondary('Upload files')
  I.attachFile('.primary-action .dropdown input[name=file]', 'media/files/generic/testdocument.rtf')

  // Verify there's no new version of the file
  I.waitForElement('.filename[title="testdocument.rtf"]')
  I.waitForElement('.filename[title="testdocument (1).rtf"]')
  drive.selectFile('testdocument.rtf')
  I.waitForElement('.viewer-fileversions')
  I.dontSeeElement('.viewer-fileversions')

  // Check that Versions doesn't display in Details
  drive.selectFile('testdocument (1).rtf')
  I.waitForElement('.viewer-fileversions')
  I.dontSeeElement('.viewer-fileversions') // Check that Versions doesn't display in Details
})
