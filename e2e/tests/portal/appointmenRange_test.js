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

Scenario('[C7490] Appointment range', async ({ I, users }) => {
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  // Create appointments
  const moment = require('moment')

  await I.haveAppointment({
    summary: 'C7490 + 2 hours',
    location: 'C7490',
    description: 'C7490',
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().add(6, 'hours') },
    startDate: { value: moment().add(4, 'hours') }
  })

  // Appointment in 2 weeks
  await I.haveAppointment({
    summary: 'C7490 + 2 weeks',
    location: 'C7490',
    description: 'C7490',
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().add(340, 'hours') },
    startDate: { value: moment().add(338, 'hours') }
  })

  // Appointment in 3 weeks and 5 days
  await I.haveAppointment({
    summary: 'C7490 + 3 weeks, 5 days',
    location: 'C7490',
    description: 'C7490',
    attendeePrivileges: 'DEFAULT',
    endDate: { value: moment().add(628, 'hours') },
    startDate: { value: moment().add(626, 'hours') }
  })

  // Appointment in 31 days
  await I.haveAppointment({
    summary: 'C7490 + 31 days',
    location: 'C7490',
    description: 'C7490',
    attendeePrivileges: 'DEFAULT',
    endDate: {

      value: moment().add(748, 'hours')
    },
    startDate: {

      value: moment().add(746, 'hours')
    }
  })

  // Add Appointments widget to Portal
  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal')
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Appointments')

  // Verify appointments displays within one month range
  I.waitForElement('~Appointments')
  I.waitForElement('.widget[aria-label="Appointments"] ul li', 5)
  I.waitForElement('.widget[aria-label="Appointments"] ul li:nth-child(3)', 5)
  I.see('C7490 + 2 hours', '.widget[aria-label="Appointments"] ul li:nth-child(2)')
  I.see('C7490 + 2 weeks', '.widget[aria-label="Appointments"] ul li:nth-child(4)')
  I.see('C7490 + 3 weeks, 5 days', '.widget[aria-label="Appointments"] ul li:nth-child(6)')
  I.dontSeeElement('.widget[aria-label="Appointments"] ul li:nth-child(7)')
})
