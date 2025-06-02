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

const assert = require('assert')
const moment = require('moment')

Feature('Portal')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7471] Open items via portal-tile', async ({ I, users }) => {
  const utcDiff = (moment().utcOffset()) / 60 // offset by X hours for api calls
  await I.haveMail({
    from: users[0],
    sendtype: 0,
    subject: 'C7471 - Open items via portal-tile',
    to: users[0]
  })
  const taskDefaultFolder = await I.grabDefaultFolder('tasks')
  await I.haveTask({
    title: 'C7471',
    folder_id: taskDefaultFolder,
    note: 'Open items via portal-tile',
    full_time: true,
    notification: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    start_time: moment().valueOf(),
    end_time: moment().add(2, 'days').valueOf(),
    days: 2
  })
  await I.haveContact({
    display_name: 'C7471, C7471',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7471',
    last_name: 'C7471',
    birthday: moment().add(2, 'days').add(utcDiff, 'hours').valueOf()
  })
  // Upload File to Infostore
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.odt')

  await I.haveAppointment({
    summary: 'C7471',
    location: 'C7471',
    description: 'C7471',
    endDate: { value: moment().add(4 + utcDiff, 'hours') },
    startDate: { value: moment().add(2 + utcDiff, 'hours') }
  })

  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal-window')

  // Verify Inbox Widget
  I.waitForElement('.widget[aria-label="Inbox"] .item', 5)
  I.click('.item', '.widget[aria-label="Inbox"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7471 - Open items via portal-tile', 5, '.detail-popup .subject')
  I.waitForText(users[0].get('display_name'), 5, '.detail-popup')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-popup')
  I.click('.item', '.widget[aria-label="Inbox"]')
  I.waitForDetached('.detail-popup', 5)

  // Verify Tasks Widget
  I.waitForElement('.widget[aria-label="My tasks"] .item', 5)
  I.click('.item', '.widget[aria-label="My tasks"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7471', 5, '.detail-popup .tasks-detailview .title')
  I.waitForText('Open items via portal-tile', 5, '.detail-popup .tasks-detailview .details')
  I.click('.item', '.widget[aria-label="My tasks"]')
  I.waitForDetached('.detail-popup', 5)

  // Verify Birthday
  I.waitForElement('.widget[aria-label="Birthdays"] .item', 5)
  I.click('.item', '.widget[aria-label="Birthdays"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7471, C7471', 5, '.detail-popup')
  I.waitForText(moment().add(2, 'days').format('M/D/YYYY'), 5, '.detail-popup')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup', 5)

  // Verify latest files
  I.waitForElement('.widget[aria-label="My latest files"] .item', 5)
  I.click('.item', '.widget[aria-label="My latest files"]')
  I.waitForElement('.io-ox-viewer')
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .filename-label')
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .viewer-sidebar-pane .filename')
  I.click('.io-ox-viewer [data-action="io.ox/core/viewer/actions/toolbar/close"]')
  I.waitForDetached('.io-ox-viewer')

  I.waitForElement('.widget[aria-label="Appointments"] .item', 5)
  I.click('.item', '.widget[aria-label="Appointments"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7471', 5, '.detail-popup .subject')
  I.waitForText('C7471', 5, '.detail-popup div.location')
  I.click('.item', '.widget[aria-label="Appointments"]')
  I.waitForDetached('.detail-popup', 5)
})

Scenario('[C7472] Check if the portalpage is up to date', async ({ I, users }) => {
  let retries = 5

  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal-window')
  await I.haveMail({
    from: users[0],
    sendtype: 0,
    subject: 'C7472 - Check if the portalpage is up to date',
    to: users[0]
  })
  let element = await I.grabNumberOfVisibleElements('[aria-label="Inbox"] .item .person')
  while (element === 0 && retries) {
    retries--
    I.triggerRefresh()
    I.wait(0.5)
    element = await I.grabNumberOfVisibleElements('[aria-label="Inbox"] .item .person')
    if (!retries) assert.fail('Timeout waiting for element')
  }
  // Verify Inbox Widget
  I.waitForElement('.widget[aria-label="Inbox"] .item', 5)
  I.click('.item', '.widget[aria-label="Inbox"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7472 - Check if the portalpage is up to date', 5, '.detail-popup .subject')
  I.waitForText(users[0].get('display_name'), 5, '.detail-popup')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-popup')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup', 5)
})

Scenario('[C7482] Add a mail to portal', async ({ I, users, mail }) => {
  await I.haveMail({
    subject: 'C7482 - Add a mail to portal',
    from: users[0],
    to: users[0],
    sendtype: 0
  })
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('C7482 - Add a mail to portal')
  I.waitForElement('.mail-detail')
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Add to portal')
  I.openApp('Portal')
  I.waitForVisible('.io-ox-portal-window')
  I.waitForElement('.io-ox-portal [aria-label="C7482 - Add a mail to portal"] .item', 5)
  I.waitForText('C7482 - Add a mail to portal', 5, '.io-ox-portal [aria-label="C7482 - Add a mail to portal"] .title')
  I.click('.item', '.io-ox-portal [aria-label="C7482 - Add a mail to portal"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7482 - Add a mail to portal', 5, '.detail-popup .subject')
  I.waitForText(users[0].get('display_name'), 5, '.detail-popup')
  I.waitForText(users[0].get('primaryEmail'), 5, '.detail-popup')
  I.click('.item', '.io-ox-portal [aria-label="C7482 - Add a mail to portal"]')
  I.waitForDetached('.detail-popup', 5)
})

Scenario('[C7475] Add inbox widget @smoketest', async ({ I, users, dialogs }) => {
  await I.haveMail({
    subject: 'C7475 - Add inbox widget',
    from: users[0],
    to: users[0],
    sendtype: 0
  })
  await I.haveSetting('io.ox/portal//widgets/user', '{}')
  I.login('app=io.ox/portal')
  I.waitForApp()

  I.waitForElement('.io-ox-portal .header .add-widget')
  I.click('Add widget')
  I.clickDropdown('Inbox')

  dialogs.waitForVisible()
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForElement(locate('.widget .item').withText('C7475 - Add inbox widget'))
  I.click('C7475 - Add inbox widget', '.widget .item')
  I.waitForElement('.detail-popup')
  I.waitForText('C7475 - Add inbox widget', undefined, '.detail-popup')
  I.waitForText(users[0].get('display_name'), undefined, '.detail-popup')
  I.waitForText(users[0].get('primaryEmail'), undefined, '.detail-popup')
  I.click('Inbox', '.widget')
  I.waitForDetached('.detail-popup')
})

Scenario('[C7476] Add task widget', async ({ I }) => {
  const taskDefaultFolder = await I.grabDefaultFolder('tasks')
  await I.haveTask({
    title: 'C7476',
    folder_id: taskDefaultFolder,
    note: 'Add task widget',
    full_time: true,
    notification: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    start_time: moment().valueOf(),
    end_time: moment().add(2, 'days').valueOf(),
    days: 2
  })
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('app=io.ox/portal')
  I.waitForElement('.io-ox-portal .header .add-widget', 5)
  I.click('.add-widget', '.io-ox-portal .header')
  I.waitForElement('.dropdown.open [data-type="tasks"]', 5)
  I.click('[data-type="tasks"]', '.dropdown.open')

  I.waitForElement('.widget[aria-label="My tasks"] .item', 5)
  I.click('.item', '.widget[aria-label="My tasks"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7476', 5, '.detail-popup .tasks-detailview .title')
  I.waitForText('Add task widget', 5, '.detail-popup .tasks-detailview .details')
  I.click('.item', '.widget[aria-label="My tasks"]')
  I.waitForDetached('.detail-popup', 5)
})

Scenario('[C7477] Add appointment widget', async ({ I }) => {
  await I.haveAppointment({
    summary: 'C7477',
    location: 'C7477',
    description: 'C7477',
    endDate: { value: moment().add(4, 'hours') },
    startDate: { value: moment().add(2, 'hours') }
  })
  await I.haveSetting('io.ox/portal//widgets/user', '{}')
  I.login('app=io.ox/portal')
  I.waitForElement('.io-ox-portal .header .add-widget', 5)
  I.click('.add-widget', '.io-ox-portal .header')
  I.waitForElement('.dropdown.open [data-type="calendar"]', 5)
  I.click('[data-type="calendar"]', '.dropdown.open')
  I.waitForElement('.widget[aria-label="Appointments"] .item', 5)
  I.click('.item', '.widget[aria-label="Appointments"]')
  I.waitForElement('.detail-popup', 5)
  I.waitForText('C7477', 5, '.detail-popup .subject')
  I.waitForText('C7477', 5, '.detail-popup div.location')
  I.click('.item', '.widget[aria-label="Appointments"]')
  I.waitForDetached('.detail-popup', 5)
})

Scenario('[C7478] Add user data widget', async ({ I, users, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/portal//widgets/user', '{}'),
    users[0].hasConfig('com.openexchange.passwordchange.showStrength', true)
  ])
  // We need to set the cap via url since we can't set it on the mw
  I.login('app=io.ox/portal&cap=edit_password')
  I.waitForApp()
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('User data', '.io-ox-portal-settings-dropdown')
  I.waitForElement('~User data')
  I.click('My contact data', '.widget')
  I.waitForElement('.io-ox-contacts-edit-window')
  I.waitForText(users[0].get('sur_name') + ', ' + users[0].get('given_name'), undefined, '.io-ox-contacts-edit-window .contact-summary')
  I.click('Discard', '.io-ox-contacts-edit-window')
  I.waitForDetached('.io-ox-contacts-edit-window')

  I.click('My password', '.widget')

  dialogs.waitForVisible()
  I.waitForText('Change password', 5, dialogs.header)
  I.see('Your current password')
  I.see('New password')
  I.see('Repeat new password')
  I.fillField('New password', 'test1234$%GROẞ')
  I.seeElement('.password-strength-bar.bar-strong')
  I.see('Password strength: Very strong')
})

Scenario('[C7480] Add recently changed files widget', async ({ I }) => {
  const infostoreFolderID = await I.grabDefaultFolder('infostore')
  await I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.odt')
  await I.haveSetting('io.ox/portal//widgets/user', '{}')
  I.login('app=io.ox/portal')
  I.waitForElement('.io-ox-portal .header .add-widget', 5)
  I.click('.add-widget', '.io-ox-portal .header')
  I.waitForElement('.dropdown.open [data-type="myfiles"]', 5)
  I.click('[data-type="myfiles"]', '.dropdown.open')
  I.waitForElement('.widget[aria-label="My latest files"] .item', 5)
  I.click('.item', '.widget[aria-label="My latest files"]')
  I.waitForElement('.io-ox-viewer')
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .filename-label')
  I.waitForText('testdocument.odt', 5, '.io-ox-viewer .viewer-sidebar-pane .filename')
  I.click('.io-ox-viewer [data-action="io.ox/core/viewer/actions/toolbar/close"]')
  I.waitForDetached('.io-ox-viewer')
})
