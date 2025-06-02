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

const moment = require('moment')

Feature('Sharing')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C104305] Calendar folders using “Permissions” dialog and sharing link', async ({ I, users, calendar, dialogs }) => {
  let url
  // Alice shares a folder with 2 appointments
  await Promise.all([
    I.haveSetting('io.ox/calendar//layout', 'week:week'),
    I.haveSetting('io.ox/calendar//layout', 'week:week', { user: users[1] })
  ])
  await session('Alice', async () => {
    I.login('app=io.ox/calendar')
    calendar.newAppointment()
    I.fillField('Title', 'simple appointment 1')
    await calendar.setDate('startDate', moment().startOf('week').add(1, 'day'))
    I.click('Create')
    I.waitToHide('.io-ox-calendar-edit')
    calendar.newAppointment()
    I.fillField('Title', 'simple appointment 2')
    // select tomorrow
    await calendar.setDate('startDate', moment().startOf('week').add(3, 'day'))
    I.click('Create')
    I.waitToHide('.io-ox-calendar-edit')

    I.openFolderMenu(calendar.getFullname(users[0]))
    I.clickDropdown('Share / Permissions')
    dialogs.waitForVisible()
    I.waitForText('Viewer', 5, '.permission-pre-selection')
    I.click('~Select contacts')
    I.waitForElement('.modal .list-view.address-picker li.list-item')
    I.fillField('Search', users[1].get('name'))
    I.waitNumberOfVisibleElements('.modal .list-view .list-item', 1, 5)
    I.waitForText(users[1].get('name'), 5, '.modal-dialog .address-picker')
    I.click('.address-picker .list-item')
    I.click({ css: 'button[data-action="select"]' })
    I.waitForDetached('.modal-dialog .address-picker')
    I.waitForElement(locate('.permissions-view .row').at(2))
    I.waitForText('Viewer', 10, '.permissions-view')
    I.waitForText('Invited people only')
    I.selectOption('Who can access this calendar?', 'Anyone with the link and invited people')
    I.waitForText('Copy link', 5)
    I.click('Copy link')
    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    url = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
    url = Array.isArray(url) ? url[0] : url
    I.fillField('.message-text', 'Some text to trigger a mail')
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
    I.say(url)
  })

  const checkSharedCalendarFolder = () => {
    I.waitForText('simple appointment 1', 5, '.page.current .weekview-container.week')
    I.waitForText(calendar.getFullname(users[0]), 5, '.io-ox-calendar-window .tree-container')
    I.seeNumberOfVisibleElements('.page.current .appointment', 2)
    I.see('simple appointment 2', '.appointment-container')
    // check for missing edit rights
    calendar.clickAppointment('simple appointment 1')
    I.waitForElement('.detail-popup')
    I.dontSee('~Edit', '.detail-popup')
    I.click('~Close', '.detail-popup')
  }

  // Bob receives the share
  await session('Bob', async () => {
    I.login('app=io.ox/mail', { user: users[1] })
    I.waitForText('has shared the calendar', undefined, '.list-view')
    I.click(locate('li.list-item'))
    I.waitForElement('.mail-detail-frame')
    within({ frame: '.mail-detail-frame' }, () => {
      I.waitForText('View calendar')
      I.click('View calendar')
    })
    I.waitForElement('.io-ox-calendar-main')
    I.waitForApp()
    checkSharedCalendarFolder()
  })

  // Eve uses external link to shared folder
  await session('Eve', () => {
    I.haveSetting('io.ox/calendar//layout', 'week:week')
    I.amOnPage(url)
    I.waitForElement('.io-ox-calendar-main', 30)
    calendar.switchView('Week')
    I.waitForVisible('[data-page-id="io.ox/calendar/week:week"]')
    I.waitForApp()
    checkSharedCalendarFolder()
    I.logout()
  })

  // Alice revokes access
  await session('Alice', () => {
    I.openFolderMenu(`${users[0].get('sur_name')}, ${users[0].get('given_name')}`)
    I.clickDropdown('Share / Permissions')
    dialogs.waitForVisible()
    I.waitForVisible({ css: `[aria-label="${calendar.getFullname(users[1])}, Internal user."]` })
    I.click(locate({ css: 'button[title="Actions"]' }).inside('.modal'))
    I.waitForText('Revoke access')
    I.click('Revoke access')
    I.waitForInvisible({ css: `[aria-label="${calendar.getFullname(users[1])}, Internal user."]` })
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')

    I.openFolderMenu(calendar.getFullname(users[0]))
    I.clickDropdown('Share / Permissions')
    dialogs.waitForVisible()
    dialogs.clickButton('Unshare')
    dialogs.waitForVisible()
    dialogs.clickButton('Remove shares')
  })

  // Bob has no access
  await session('Bob', () => {
    I.refreshPage()
    I.waitForApp()
    I.retry(5).seeNumberOfElements(locate('.appointment').inside('.io-ox-calendar-main'), 0)
    I.dontSee('simple appointment 1', '.io-ox-calendar-main')
    I.dontSee('simple appointment 2', '.io-ox-calendar-main')
  })
  // Eve has no access
  await session('Eve', () => {
    I.amOnPage(url)
    I.waitForText('The share you are looking for does not exist.')
  })
})

Scenario('[OXUIB-2453] Refreshing a calendar imported as ical feed should ask for password if access is restricted.', { timeout: 120 }, async ({ I, users, calendar, dialogs }) => {
  let url
  await session('Alice', async () => {
    I.login('app=io.ox/calendar')

    I.openFolderMenu(calendar.getFullname(users[0]))
    I.clickDropdown('Share / Permissions')
    dialogs.waitForVisible()
    I.waitForText('Viewer', 5, '.permission-pre-selection')
    I.selectOption('Who can access this calendar?', 'Anyone with the link and invited people')
    I.waitForText('Copy link', 5)
    I.click('Copy link')
    I.waitForElement('button[aria-label="Copy to clipboard"]:not([data-clipboard-text=""])')
    url = await I.grabAttributeFrom('button[aria-label="Copy to clipboard"]', 'data-clipboard-text')
    url = Array.isArray(url) ? url[0] : url
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
  })

  // Bob subscribes to shared url
  await session('Bob', () => {
    I.login('app=io.ox/calendar', { user: users[1] })
    I.waitForElement('.io-ox-calendar-main', 30)
    I.retry(5).click('~More actions', '.primary-action')
    I.clickDropdown('Import from URL')
    I.fillField('uri', url)
    I.click('Subscribe')
    I.waitForDetached('.modal-dialog')
    I.waitForElement(`.folder-tree [title*="Calendar (${users[0].get('display_name')})"]`, 10)
  })

  // Alice sets a password
  await session('Alice', () => {
    I.openFolderMenu(`${calendar.getFullname(users[0])}`)
    I.clickDropdown('Share / Permissions')
    I.waitForText('Viewer', 5, '.permission-pre-selection')
    I.click('~Sharing options')
    dialogs.waitForVisible()
    I.waitForElement('input[type="password"]', 10)
    I.fillField('input[type="password"]', 'test123')
    dialogs.clickButton('Save')
    dialogs.clickButton('Save')
  })

  // Bob gets prompt to update password
  await session('Bob', () => {
    I.openFolderMenu(`Calendar (${users[0].get('display_name')})`)
    // Wait for rate limit
    I.wait(60)
    I.clickDropdown('Refresh')
    I.waitForElement('a.account-link[title="Access to this calendar is restricted. Please enter your password and try again."]')
    I.click('a.account-link[title="Access to this calendar is restricted. Please enter your password and try again."]')
    dialogs.waitForVisible()
    I.waitForElement('input[type="password"]', 10)
    I.fillField('input[type="password"]', 'test123')
    dialogs.clickButton('Save')
    I.waitForDetached('.modal-dialog')
    I.openFolderMenu(`Calendar (${users[0].get('display_name')})`)
    I.clickDropdown('Refresh')
    I.waitForInvisible('a.account-link[title="Access to this calendar is restricted. Please enter your password and try again."]')
  })
})
