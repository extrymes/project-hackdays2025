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

Feature('Settings > Data export (GDPR)')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('request a new download and cancel it', async ({ I, dialogs }) => {
  I.login('settings=virtual/settings/personaldata')
  I.waitForApp()

  // click some options
  I.uncheckOption('Drive', '.io-ox-personal-data-settings')
  I.uncheckOption('Tasks', '.io-ox-personal-data-settings')
  I.uncheckOption('Calendar', '.io-ox-personal-data-settings')

  // click suboption
  const optionsLocator = locate('.io-ox-personal-data-settings [data-toggle="dropdown"]').first()
  I.click(optionsLocator)
  I.click('.dropdown.open a[data-name="includeTrash"]')

  // check if suboption is enabled
  I.click(optionsLocator)
  I.seeElement('.dropdown.open a[data-name="includeTrash"][aria-checked="true"]')
  I.pressKey('Escape')

  // select a filesize
  I.selectOption('.io-ox-personal-data-settings select', '512 MB')

  I.click('Request download', '.io-ox-personal-data-settings')

  // check if view switches correctly and buttons are disabled
  I.waitForText(
    'Your requested archive is currently being created. Depending on the size of the requested data this may take hours or days. You will be informed via email when your download is ready.',
    1,
    '.personal-data-download-view'
  )

  I.seeElement('.io-ox-personal-data-settings input:disabled')

  // cancel again, we don't want to clutter the filesystem
  I.click('Cancel download request', '.io-ox-personal-data-settings')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to cancel the current download request?', 5, dialogs.body)
  dialogs.clickButton('Cancel download request')

  // check if view switches correctly and buttons are enabled again
  I.waitForInvisible('.io-ox-personal-data-settings .personal-data-download-view', 1)

  I.dontSeeElement('.io-ox-personal-data-settings input:disabled')
})

Scenario('open direct link to data export settings page', async ({ I }) => {
  I.login('app=io.ox/settings&folder=virtual/settings/personaldata')

  // list view
  I.waitForText('Download personal data', 5)

  // no click here, direct link should do the work
  // detail view
  I.waitForText('Download your personal data', 5)
})

Scenario('show only available options', async ({ I, users }) => {
  await users[0].hasModuleAccess({ tasks: false })
  I.login('settings=virtual/settings/personaldata')
  I.waitForApp()

  I.waitForText('Download your personal data')
  I.waitForElement('.io-ox-personal-data-settings label')
  // check if tasks module is correctly missing
  I.dontSee('Tasks', '.io-ox-personal-data-settings label')
})
