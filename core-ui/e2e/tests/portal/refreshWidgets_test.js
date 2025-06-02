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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7494] Refresh widgets', async ({ I, users, dialogs }) => {
  const infostoreFolderID = await I.grabDefaultFolder('infostore')

  await Promise.all([
    I.haveSetting({
      'io.ox/core': { refreshInterval: 100 },
      'io.ox/portal': { widgets: { user: '{}' } }
    }),
    I.haveMail({ from: users[0], to: users[0], sendtype: 0, subject: 'Mail-1' }),
    I.haveAppointment({
      summary: 'Appointment-1',
      startDate: { value: moment().add(4, 'hours') },
      endDate: { value: moment().add(5, 'hours') }
    }),
    I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.odt')
  ])

  I.login('app=io.ox/portal')
  I.waitForApp()

  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Inbox', '.io-ox-portal-settings-dropdown')
  dialogs.waitForVisible()
  dialogs.clickButton('Save')
  I.waitForElement('~Inbox')

  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Appointments', '.io-ox-portal-settings-dropdown')
  I.waitForElement('~Appointments')

  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Recently changed files', '.io-ox-portal-settings-dropdown')
  I.waitForElement('~Recently changed files')

  I.waitNumberOfVisibleElements('.widget[aria-label="Inbox"] ul li', 1, 40)
  I.waitNumberOfVisibleElements('.widget[aria-label="Appointments"] ul li:not(.bold)', 1, 40)
  I.waitNumberOfVisibleElements('.widget[aria-label="Recently changed files"] ul li', 1, 40)

  await Promise.all([
    I.haveMail({ from: users[0], to: users[0], sendtype: 0, subject: 'Mail-2' }),
    I.haveAppointment({
      summary: 'Appointment-2',
      startDate: { value: moment().add(8, 'hours') },
      endDate: { value: moment().add(9, 'hours') }
    }),
    I.haveFile(infostoreFolderID, 'media/files/generic/testdocument.rtf')
  ])

  I.waitNumberOfVisibleElements('.widget[aria-label="Inbox"] ul li', 2, 40)
  I.waitNumberOfVisibleElements('.widget[aria-label="Appointments"] ul li:not(.bold)', 2, 40)
  I.waitNumberOfVisibleElements('.widget[aria-label="Recently changed files"] ul li', 2, 40)
})
