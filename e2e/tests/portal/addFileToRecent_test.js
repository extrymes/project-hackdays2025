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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7481] Add a file', async ({ I }) => {
  // Add a file to portal
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.odt')

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  // Add Recently changed files widget to Portal
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Recently changed files', '.io-ox-portal-settings-dropdown')
  I.waitForElement('~Recently changed files')
  I.waitForText('testdocument.odt', 5, '.widget[aria-label="Recently changed files"]')
  I.click('.item .title', '.widget[aria-label="Recently changed files"]')

  // Open file in viewer
  I.waitForElement('.io-ox-viewer')
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .filename-label')
  // for some files the path might be: .io-ox-viewer .viewer-sidebar-pane .filename span
  // during a test run and/or for this file it's without the <span>
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .viewer-sidebar-pane .filename')
  I.click('.io-ox-viewer [data-action="io.ox/core/viewer/actions/toolbar/close"]')
  I.waitForDetached('.io-ox-viewer')
})
