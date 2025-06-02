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

Feature('Settings > Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7821] Add inbox widget', async ({ I, users, settings }) => {
  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  await I.haveMail({
    subject: 'Mail7821',
    from: users[0],
    to: users[0],
    sendtype: 0
  })

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.click('Inbox', '.io-ox-portal-settings-dropdown')

  // Verify that the widget is shown in the list
  I.waitForText('Inbox', 5, '.list-item-title')

  // Fill out the inbox widget popup
  I.fillField('input[class="form-control"]', 'Inbox Widget 7821')
  I.click('Save')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')
  I.waitForText('Inbox Widget 7821')
  I.waitForText('Mail7821')
})

Scenario('[C7822] Add Birthday widget', async ({ I, settings }) => {
  // create a contact with birthday
  await I.haveContact({
    folder_id: `${await I.grabDefaultFolder('contacts')}`,
    title: 'Dr.',
    first_name: 'Little',
    last_name: 'Do',
    display_name: 'Dr. Do, Little',
    birthday: moment().add(2, 'days').valueOf()
  })

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  // Important: We cannot be on the Portal app, because this would trigger
  //            the underlying Add Widget button on the app instead of in the settings modal
  I.click('Add widget', '.io-ox-portal-settings')
  I.click('Birthdays')

  // Verify that the widget is shown in the list
  I.waitForText('Birthdays', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')
  I.waitForText('Birthdays')
  I.waitForText('Dr. Do, Little')

  // open the side popup
  I.click('.item', '~Birthdays')
  I.waitForElement('.detail-popup')
  I.waitForText('Little', 10, '.detail-popup')
})

Scenario('[C7823] Add calendar widget', async ({ I, settings }) => {
  // create an appointment which is shown in the portal widget
  await I.haveAppointment({
    summary: 'Summary7823',
    location: 'Location7823',
    description: 'Description7823',
    startDate: { value: moment().add(6, 'hours') },
    endDate: { value: moment().add(7, 'hours') }
  })

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.click('Appointments', '.io-ox-portal-settings-dropdown')

  // Verify that the widget is shown in the list
  I.waitForText('Appointments', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')
  I.waitForText('Appointments')
  I.waitForText('Summary7823')

  // open the side popup
  I.click('.item', '~Appointments')
  I.waitForElement('.detail-popup')
  I.waitForText('Summary7823', 5, '.detail-popup')
  I.waitForText('Location7823', 5, '.detail-popup')
})

Scenario('[C7825] Add quota widget', async ({ I, settings }) => {
  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.waitForText('Storage', 5, '.io-ox-portal-settings-dropdown')
  I.click('Storage', '.io-ox-portal-settings-dropdown')

  // Verify that the widget is shown in the list
  I.waitForText('Storage', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')

  I.waitForText('File storage')
  I.waitForText('Mail storage')
})

Scenario('[C7826] Add RSS Feed widget', async ({ I, settings }) => {
  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.click('RSS Feed', '.io-ox-portal-settings-dropdown')

  // Fill out the RSS feed popup
  I.fillField('#rss_url', 'http://rss.kicker.de/team/borussiadortmund')
  I.fillField('#rss_desc', 'Kicker RSS Feed')
  I.click('Save')

  // Verify that the widget is shown in the list
  I.waitForText('Kicker RSS Feed', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')

  I.waitForText('Kicker RSS Feed')
})

Scenario('[C7827] Add task widget', async ({ I, settings }) => {
  // create a task which is shown in the portal widget
  await I.haveTask({
    folder_id: `${await I.grabDefaultFolder('tasks')}`,
    title: 'Summary7823',
    note: 'Description7823',
    end_time: moment().add(2, 'days').valueOf()
  })

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.click('My tasks', '.io-ox-portal-settings-dropdown')

  // Verify that the widget is shown in the list
  I.waitForText('My tasks', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')

  I.waitForText('My tasks')
  I.waitForText('Summary7823')

  // open the side popup
  I.click('.item', '~My tasks')
  I.waitForElement('.detail-popup')
  I.waitForText('Summary7823', 10, '.detail-popup')
  I.waitForText('Description7823', 10, '.detail-popup')
})

Scenario('[C7830] Add User data widget', async ({ I, users, settings }) => {
  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  // ensure the user has the capability to edit his password
  await users[0].hasConfig('com.openexchange.capabilities.edit_password', false)

  I.login('settings=virtual/settings/io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Add the portal widget
  I.click('Add widget')
  I.click('User data', '.io-ox-portal-settings-dropdown')

  // Verify that the widget is shown in the list
  I.waitForText('User data', 5, '.list-item-title')

  // Switch to portal an check the widget
  settings.close()
  I.openApp('Portal')

  I.waitForText('User data')
  I.waitForText('My contact data')
})

Scenario('[C7833] Disable widgets', async ({ I, users, settings }) => {
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Verify the portal widgets are shown
  I.waitForText('Inbox', 10, '.widgets')
  I.waitForText('Appointments', 10, '.widgets')
  I.waitForText('My tasks', 10, '.widgets')

  // Switch to settings
  settings.open('Portal')
  I.waitForText('Widgets')

  // Disable the first widget
  I.click('~Disable Inbox')

  // Disable the second widget
  I.click('~Disable Appointments')

  // Disable the third widget
  I.click('~Disable My tasks')

  // Switch to portal and check that the widgets are removed
  settings.close()
  I.waitForText(`Signed in as ${users[0].get('primaryEmail')}`)
  I.dontSee('Inbox', '.widgets')
  I.dontSee('Appointments', '.widgets')
  I.dontSee('My tasks', '.widgets')
})

Scenario('[C7832] Remove widgets', async ({ I, dialogs, users, settings }) => {
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.waitForText('Add widget')

  // Verify the portal widgets are shown
  I.waitForText('Inbox', 10, '.widgets')
  I.waitForText('Appointments', 10, '.widgets')
  I.waitForText('My latest files', 10, '.widgets')

  // Switch to settings
  settings.open('Portal')
  I.waitForText('Widgets')

  I.waitForText('Inbox')
  I.click('~Delete Inbox')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // Remove the second widget
  I.click('~Delete Appointments')

  // Remove the third widget
  I.click('~Delete My latest files')

  // Switch to portal an check that the widgets are removed
  settings.close()
  I.waitForText(`Signed in as ${users[0].get('primaryEmail')}`)
  I.dontSee('Inbox', '.widgets')
  I.dontSee('Appointments', '.widgets')
  I.dontSee('My latest files', '.widgets')
})
