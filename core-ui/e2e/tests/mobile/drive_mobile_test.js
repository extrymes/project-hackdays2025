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

Feature('Mobile > Drive')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Generate simple link for sharing @mobile', async ({ I, dialogs }) => {
  const checkmarkSelector = locate('.list-item-checkmark').inside(locate('.list-item').withText('Music')).as('Checkmark with text "Music"')
  I.login('app=io.ox/files')
  I.waitForApp()

  I.click(checkmarkSelector)
  I.waitForVisible('.more-dropdown')
  I.click('.more-dropdown')

  I.waitForText('Share / Permissions')
  I.click('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForText('Who can access this folder?', 5)
  I.waitForText('Invited people only')
  I.selectOption('Who can access this folder?', 'Anyone with the link and invited people')
  I.waitForText('Copy link', 5)
  I.click('Copy link')
  let url = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
  url = Array.isArray(url) ? url[0] : url
  dialogs.clickButton('Share')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.amOnPage(url)
  I.waitForApp()
  I.dontSee('Documents', '.list-view')
  I.see('Music', '.navbar-title')
})

Scenario('Upload and view an image @mobile', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForVisible('~Upload', 5)
  I.click('~Upload')
  I.waitForText('Upload file', 1, '.dropdown-menu.custom-dropdown')
  I.click('Upload file', '.dropdown-menu.custom-dropdown')
  // the input field is created on demand when Upload files is clicked. This click also closes the dropdown
  I.attachFile('input[name=file]', 'media/images/ox_logo.png')
  I.waitForElement('.filename[title="ox_logo.png"]')
  I.waitForElement('.list-item.selected .filename[title="ox_logo.png"]')
  // view the image
  I.wait(0.5) // prevent clicking a detached element caused by the toolbar being re-rendered multiple times
  I.waitForElement('~View', 1, '.mobile-toolbar')
  I.click('~View')
  I.waitForVisible('.io-ox-viewer')
  I.waitForVisible('.viewer-displayer-image')
  I.see('ox_logo.png')

  // view details
  I.click(locate('.viewer-toolbar [aria-label="View details"]').as('"View details"'))
  I.waitForElement('.viewer-sidebar.smartphone.open')
  I.click('~Close viewer')
  I.waitForDetached('.io-ox-viewer')
})

Scenario('Create and view a new note @mobile', ({ I, drive }) => {
  I.login('app=io.ox/files')
  I.waitForApp()

  I.waitForElement('~New', 5)
  I.click('~New', '.mobile-toolbar')
  I.waitForVisible('.dropdown-menu.custom-dropdown')
  I.click('New note', '.dropdown-menu.custom-dropdown')

  I.waitForVisible('.io-ox-editor')
  I.fillField('Title', 'File name')
  I.fillField('Note', 'File description')
  I.click('Save')
  I.waitForResponse(response => response.url().includes('api/files?action=new') && response.request().method() === 'POST', 10)
  I.click('Close')
  I.waitForDetached('textarea.content')
  I.waitForElement('.filename[title="File name.txt"]', 10)
}).config('Puppeteer', { waitForAction: 0 }) // necessary to catch the request
