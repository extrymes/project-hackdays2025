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

Feature('Calendar > Search')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-1556] Use contact picker to search for participants', async ({ I, calendar, users }) => {
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Test appointment')
  await calendar.addParticipant(users[1].get('name'))
  I.click('Create')
  I.waitForDetached(calendar.editWindow)
  I.click('~More search options')

  I.fillField('Participant', users[1].get('sur_name'))

  I.waitForText(users[1].get('sur_name'), 5, '.autocomplete')
  I.click(users[1].get('sur_name'), '.autocomplete')

  I.click('Search')
  I.see(`${users[1].get('primaryEmail')}`, '.filters')

  I.see('Test appointment', '.appointment .title')
})

Scenario('[OXUIB-1555] Use only date ranges when searching appointments', async ({ I, calendar }) => {
  await I.haveAppointment({
    summary: 'Testappointment',
    startDate: { value: moment().startOf('day').add(8, 'hour') },
    endDate: { value: moment().startOf('day').add(9, 'hour') },
    rrule: 'FREQ=DAILY;COUNT=3'
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('~More search options')
  I.click('~More search options')
  I.waitForVisible('.dropdown input[name="after"]')
  I.fillField('after', moment().startOf('day').add(8, 'hour').subtract(1, 'day').format('MM/DD/YYYY'))
  I.fillField('before', moment().startOf('day').add(8, 'hour').add(4, 'day').format('MM/DD/YYYY'))
  I.click('.dropdown input[name="attendees"]')
  I.click(locate('.dropdown .btn-primary').withText('Search'))
  I.waitForText('Search results')
  I.waitNumberOfVisibleElements('.appointment', 3)
})

Scenario('search by translated "summary:" keyword', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveAppointment({
      summary: 'testappointment',
      startDate: { value: moment().startOf('day').add(1, 'day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(1, 'day').add(9, 'hour') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'tratamiento:testappointment')
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  calendar.clickAppointment('testappointment')
  I.waitForText('Tratamiento testappointment')
  I.waitForText('testappointment', 5, '.calendar-detail-pane h1.subject')
})

Scenario('search by "summary:" keyword for non-english users', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveAppointment({
      summary: 'testappointment',
      startDate: { value: moment().startOf('day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(9, 'hour') }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'summary:testappointment')
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  calendar.clickAppointment('testappointment')
  I.waitForText('Tratamiento testappointment')
  I.waitForText('testappointment', 5, '.calendar-detail-pane h1.subject')
})

Scenario('by category', async ({ I, calendar }) => {
  await Promise.all([
    I.haveAppointment({
      summary: 'Testappointment w/ category',
      startDate: { value: moment().startOf('day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(9, 'hour') },
      categories: ['Improvement']
    }),
    I.haveSetting({
      'io.ox/calendar': { layout: 'week:week' },
      'io.ox/core': {
        features: { categories: true },
        categories: { predefined: [{ name: 'Imported' }] }
      }
    })
  ])
  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible('~More search options')
  I.click('~More search options')
  I.waitForVisible('.dropdown input[name="categories"]')

  // autocomplete: predefined, default, pim
  I.fillField('Categories', 'Imp')
  I.waitForVisible('.autocomplete .category-view')
  I.seeNumberOfElements('.autocomplete .category-view', 3)
  I.see('Imported', '.autocomplete .category-view')
  I.see('Important', '.autocomplete .category-view')
  I.see('Improvement', '.autocomplete .category-view')

  // via enter
  I.fillField('Categories', 'Improvement')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('Testappointment w/ category')
  I.click('~Cancel search')

  // via autocomplete click
  I.click('~More search options')
  I.waitForVisible('.dropdown input[name="categories"]')
  I.fillField('Categories', 'Improvement')
  I.seeNumberOfElements('.autocomplete .category-view', 1)
  I.see('Improvement', '.autocomplete .category-view')
  I.click('Improvement')
  I.click('Search', '.btn-primary')
  I.waitForText('Search results')
  I.waitForText('Testappointment w/ category')
})

Scenario('by category via detail view', async ({ I, calendar }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/categories', true),
    I.haveAppointment({
      summary: '3 categories',
      startDate: { value: moment().startOf('day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(9, 'hour') },
      categories: ['withoutwhitespace', 'with whitespace', 'with more whitespace']
    }),
    I.haveAppointment({
      summary: '2 categories',
      startDate: { value: moment().startOf('day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(11, 'hour') },
      categories: ['withoutwhitespace', 'with whitespace']
    }),
    I.haveAppointment({
      summary: '1 category',
      startDate: { value: moment().startOf('day').add(8, 'hour') },
      endDate: { value: moment().startOf('day').add(11, 'hour') },
      categories: ['withoutwhitespace']
    })
  ])

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.switchView('List')

  // category: withoutwhitespace
  I.waitForText('withoutwhitespace', 5, '.calendar-detail')
  I.click('withoutwhitespace', '.calendar-detail')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.waitForText('Search results', 5, '.list-view-control')
  calendar.clickAppointment('3 categories')
  I.seeNumberOfElements('.list-view .list-item.selectable', 3)

  // category: with whitespace
  calendar.clickAppointment('3 categories')
  I.waitForText('withoutwhitespace', 5, '.calendar-detail')
  I.click('with whitespace', '.calendar-detail')
  I.waitForText('with whitespace', 5, '.filters')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.seeNumberOfElements('.filters .filter', 2)
  I.waitForText('Search results', 5, '.list-view-control')
  calendar.clickAppointment('3 categories')
  I.seeNumberOfElements('.list-view .list-item.selectable', 2)

  // category: with more whitespace
  calendar.clickAppointment('3 categories')
  I.waitForText('withoutwhitespace', 5, '.calendar-detail')
  I.click('with more whitespace', '.calendar-detail')
  I.waitForText('with whitespace', 5, '.filters')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.waitForText('with more whitespace', 5, '.filters')
  I.seeNumberOfElements('.filters .filter', 3)
  I.waitForText('Search results', 5, '.list-view-control')
  calendar.clickAppointment('3 categories')
  I.seeNumberOfElements('.list-view .list-item.selectable', 1)
})

Scenario('No autosuggest when searching with categories disabled', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/core': { features: { categories: false } } })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'aaa')

  I.dontSee('Categories', '.autocomplete')
})
