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

Feature('Calendar > Organizer')

let email2

Before(async ({ I, users }) => {
  const id1 = Math.random()
  const id2 = Math.random()
  email2 = `just.pavel.${id1}@box.ox.io`
  // we need the two users in exact order
  await users.create({
    aliases: [`pavel.pipovic.${id1}@box.ox.io`, email2],
    display_name: 'Pavel Pipovic',
    name: 'pavel',
    imapLogin: 'pavel',
    sur_name: 'Pipovic',
    given_name: 'Pavel',
    password: 'secret',
    primaryEmail: `pavel.pipovic.${id1}@box.ox.io`,
    email1: `pavel.pipovic.${id1}@box.ox.io`
  })
  await users.create({
    display_name: 'Bronko Kulitschka',
    name: 'bronko',
    imapLogin: 'bronko',
    sur_name: 'Kulitschka',
    given_name: 'Bronko',
    password: 'secret',
    primaryEmail: `bronko.kulitschka.${id2}@box.ox.io`,
    email1: `bronko.kulitschka.${id2}@box.ox.io`
  })
  await I.haveSetting({
    'io.ox/calendar': { showCheckboxes: true }
  })
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-2219]: Attendee is not recognized as organizer if URI differs but entity is identical', async ({ I, users, calendar }) => {
  const startTime = calendar.getNextMonday()
  const summary = 'OXUIB-2219: Attendee is not recognized as organizer if URI differs but entity is identical'
  await I.haveAppointment({
    summary,
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: 'Pavel Pipovic',
      email: users[0].get('email1'),
      entity: users[0].get('id'),
      uri: `mailto:${users[0].get('email1')}`
    },
    attendees: [
      { partStat: 'ACCEPTED', entity: users[0].get('id'), cn: 'Pavel Pipovic', uri: `mailto:${email2}` },
      { partStat: 'TENTATIVE', entity: users[1].get('id'), cn: 'Bronko Kulitschka', uri: `mailto:${users[1].get('email1')}` }
    ]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.waitForText(summary, undefined, '.appointment')
  I.click(summary, '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForText(summary, undefined, '.detail-popup')
  // descpite different URIs the organizer should be recognized based on the same entity
  I.seeNumberOfElements(locate('.detail-popup .participant').withText('Pipovic, Pavel'), 1)
  I.dontSee('Organizer', '.detail-popup h2')
})

Scenario('[OXUIB-2219-false-positive]: Attendee is not recognized as organizer if URI differs but entity is identical', async ({ I, users, calendar }) => {
  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: 'OXUIB-2219: Attendee is not recognized as organizer if URI differs but entity is identical',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    organizer: {
      cn: 'Pavel Pipovic',
      email: 'pavel@example.org',
      uri: 'mailto:pavel@example.org'
    },
    attendees: [
      { partStat: 'ACCEPTED', cn: 'Some other pavel', uri: 'mailto:some.other.pavel@example.org' },
      { partStat: 'ACCEPTED', entity: users[0].get('id'), cn: 'Pavel Pipovic', uri: `mailto:${users[0].get('email1')}` }
    ]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('OXUIB-2219: Attendee is not recognized as organizer if URI differs but entity is identical', undefined, '.appointment')
  I.click('OXUIB-2219: Attendee is not recognized as organizer if URI differs but entity is identical', '.appointment')
  I.waitForVisible('.detail-popup')
  I.waitForText('OXUIB-2219: Attendee is not recognized as organizer if URI differs but entity is identical', undefined, '.detail-popup')
  // Detail view should show four different entities
  I.seeNumberOfElements(locate('.detail-popup .participant').withText('Pipovic'), 2)
  I.see('Organizer', '.detail-popup h2')
  I.see('Pipovic, Pavel', '.detail-popup .participant')
  I.see('<pavel@example.org>', '.detail-popup .participant')
  I.see('pavel, Some other', '.detail-popup .participant')
  I.see('<some.other.pavel@example.org>', '.detail-popup .participant')
})
