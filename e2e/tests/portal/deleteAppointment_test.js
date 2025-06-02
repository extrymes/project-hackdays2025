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

const moment = require('moment')

Scenario('[C7491] Delete an appointment', async ({ I, dialogs }) => {
  await Promise.all([
    I.haveSetting('io.ox/portal//widgets/user', '{}'),
    I.haveAppointment({
      summary: 'C7491-1',
      location: 'C7491',
      description: 'C7491-1',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('day').add(32, 'hours') },
      endDate: { value: moment().startOf('day').add(33, 'hours') }
    }),
    I.haveAppointment({
      summary: 'C7491-2',
      location: 'C7491',
      description: 'C7491-2',
      attendeePrivileges: 'DEFAULT',
      startDate: { value: moment().startOf('day').add(33, 'hours') },
      endDate: { value: moment().startOf('day').add(34, 'hours') }
    })
  ])

  // Add Appointments widget to Portal
  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal')
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Appointments')

  // Delete first appointment
  I.waitForElement('~Appointments')
  I.waitForElement('.widget[aria-label="Appointments"] ul li:nth-child(2)')
  I.see('C7491-1', '.widget[aria-label="Appointments"] ul li:nth-child(2)')
  I.see('C7491-2', '.widget[aria-label="Appointments"] ul li:nth-child(3)')
  I.click('.widget[aria-label="Appointments"] ul li:nth-child(2)')
  I.waitForElement('~Delete')

  I.click('~Delete', '.detail-popup')
  dialogs.waitForVisible()
  dialogs.clickButton('Delete')

  // Verify the popup closes itself and the widget updates its list of appointments
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.detail-popup')
  within('.widgets', () => {
    I.waitNumberOfVisibleElements('.widget', 1, 10)
    I.dontSee('C7491-1')
    I.see('C7491-2')
  })
})
