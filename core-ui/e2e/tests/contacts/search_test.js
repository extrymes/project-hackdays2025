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

Feature('Contacts > Search')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7369] by Name', async ({ I, search, contacts }) => {
  await I.haveContact({
    display_name: 'last_name, first_name',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'first_name',
    last_name: 'last_name'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  search.doSearch('first_name last_name')
  I.waitForText('first_name', 5, '.vgrid-cell')
  I.waitForText('last_name', 5, '.vgrid-cell')
})

Scenario('[C7370] by Phone numbers', async ({ I, search, contacts }) => {
  await I.haveContact({
    display_name: 'last_name, first_name',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'first_name',
    last_name: 'last_name',
    cellular_telephone1: '+4917113371337'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  search.doSearch('phone:+4917113371337')

  I.waitForText('first_name', 5, '.vgrid-cell')
  I.waitForText('last_name', 5, '.vgrid-cell')
})

Scenario('[C7371] by Addresses', async ({ I, search, contacts }) => {
  await I.haveContact({
    display_name: 'C7371, C7371',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'first_name',
    last_name: 'last_name',
    cellular_telephone1: '+4917113371337',
    street_home: 'street_home',
    postal_code_home: '1337',
    city_home: 'city_home',
    state_home: 'state_home',
    country_home: 'country_home'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  search.doSearch('address:1337')
  I.waitForText('first_name', 5, '.vgrid-cell')
  I.waitForText('last_name', 5, '.vgrid-cell')
  search.doSearch('address:city_home')
  I.waitForText('first_name', 5, '.vgrid-cell')
  I.waitForText('last_name', 5, '.vgrid-cell')
})

Scenario('click email in translated autocomplete', async ({ I, search, contacts }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveContact({
      folder_id: await I.grabDefaultFolder('contacts'),
      first_name: 'firstname',
      last_name: 'lastname',
      display_name: 'lastname, firstname',
      email1: 'test@example.net'
    })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'correo:firstname')
  I.waitForText('lastname')
  I.see('test@example.net')
  I.click('.email')
  I.waitForVisible('.filter')
  I.see('Correo electrónico test@example.net') // cSpell:disable-line
  I.waitForText('lastname, firstname')
})

Scenario('search for email by translated keyword', async ({ I, search, contacts }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveContact({
      folder_id: await I.grabDefaultFolder('contacts'),
      first_name: 'firstname',
      last_name: 'lastname',
      display_name: 'lastname, firstname',
      email1: 'test@example.net'
    })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'correo:test@example.net')
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  I.see('Correo electrónico test@example.net') // cSpell:disable-line
  I.waitForText('lastname, firstname')
})

Scenario('search for email by english keyword for non-english users', async ({ I, search, contacts }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveContact({
      folder_id: await I.grabDefaultFolder('contacts'),
      first_name: 'firstname',
      last_name: 'lastname',
      display_name: 'lastname, firstname',
      email1: 'test@example.net'
    })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'email:test@example.net')
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  I.see('Correo electrónico test@example.net') // cSpell:disable-line
  I.waitForText('lastname, firstname')
})

const searchSubstring = async (searchstring) => {
  const { I, search } = inject()
  await I.haveContact({
    first_name: 'John-George',
    position: 'Senior Developer',
    folder_id: await I.grabDefaultFolder('contacts'),
    country_home: 'Germany',
    sort_name: 'Doe-Smith_John-George',
    postal_code_home: '20000',
    instant_messenger1: 'skype: johnxchange', // cSpell:disable-line
    state_home: 'SH',
    second_name: 'Peter',
    title: 'Dr',
    city_home: 'Neumünster',
    city_business: 'Hamburg',
    display_name: 'Doe-Smith, John-George',
    street_business: 'Fuhlsbüttler Str. 389', // cSpell:disable-line
    cellular_telephone1: '+49 00 000 0000 000',
    telephone_home1: '+49 000 000 000 000',
    email2: 'john@example.net',
    last_name: 'Doe-Smith',
    email1: 'john-doe@open-xchange.com',
    company: 'Open-Xchange GmbH',
    department: 'Documents/Development',
    telephone_business1: '+49 00 00 0000 000',
    manager_name: 'Man Manager',
    file_as: 'Doe, John',
    state_business: 'Hamburg',
    country_business: 'Germany',
    street_home: 'Maim Street 123',
    postal_code_business: '20001'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  search.doSearch(searchstring)

  I.waitForText('John-George', 5, '.vgrid-cell')
  I.waitForText('Doe-Smith', 5, '.vgrid-cell')
}

Scenario('by substring in address', async () => {
  await searchSubstring('Hamburg')
})

Scenario('by substring in last name', async () => {
  await searchSubstring('Smith')
})

Scenario('by substring in Name', async () => {
  await searchSubstring('George')
})

Scenario('by substring in department', async () => {
  await searchSubstring('Development')
})

Scenario('by substring in position', async () => {
  await searchSubstring('Senior')
})

Scenario('by substring in email', async () => {
  await searchSubstring('xchange') // cSpell:disable-line
})

Scenario('by category', async ({ I, contacts }) => {
  await Promise.all([
    I.haveContact({
      display_name: 'Doe, John',
      folder_id: await I.grabDefaultFolder('contacts'),
      first_name: 'John',
      last_name: 'Doe',
      categories: ['Improvement']
    }),
    I.haveSetting({ 'io.ox/core': { features: { categories: true }, categories: { userCategories: [{ name: 'Improvement' }] } } })
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.waitForVisible('~More search options')
  I.click('~More search options')
  I.waitForVisible('.dropdown input[name="categories"]')

  // autocomplete: predefined, default, pim
  I.fillField('Categories', 'Imp')
  I.waitForVisible('.autocomplete .category-view')
  I.seeNumberOfElements('.autocomplete .category-view', 1)
  I.see('Improvement', '.autocomplete .category-view')

  // via enter
  I.fillField('Categories', 'Improvement')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.waitForText('Doe', 5, '.vgrid-cell')
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
  I.waitForText('Doe', 5, '.vgrid-cell')
})

Scenario('by category via detail view', async ({ I, contacts }) => {
  const defaultFolder = await I.grabDefaultFolder('contacts')
  await Promise.all([
    I.haveSetting('io.ox/core//features/categories', true),
    I.haveContact({ folder_id: defaultFolder, first_name: 'Claire', last_name: 'Dunphy', categories: 'withoutwhitespace,with whitespace,with more whitespace' }),
    I.haveContact({ folder_id: defaultFolder, first_name: 'Haley', last_name: 'Dunphy', categories: 'withoutwhitespace,with whitespace' }),
    I.haveContact({ folder_id: defaultFolder, first_name: 'Phil', last_name: 'Dunphy', categories: 'withoutwhitespace' })

  ])
  I.login('app=io.ox/contacts')
  I.waitForApp()

  // category: withoutwhitespace
  contacts.selectContact('Dunphy, Claire')
  I.waitForText('withoutwhitespace', 5, '.categories-badges')
  I.click('withoutwhitespace')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.waitForText('Search results', 5, '.contact-grid-container')
  I.seeNumberOfElements('.vgrid-scrollpane-container .contact', 3)

  // category: with whitespace
  contacts.selectContact('Dunphy, Claire')
  I.click('with whitespace')
  I.waitForText('with whitespace', 5, '.filters')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.seeNumberOfElements('.filters .filter', 2)
  I.waitForText('Search results', 5, '.contact-grid-container')
  I.waitForDetached('.contact:nth-of-type(3)')
  I.seeNumberOfElements('.vgrid-scrollpane-container .contact', 2)

  // category: with more whitespace
  contacts.selectContact('Dunphy, Claire')
  I.click('with more whitespace')
  I.waitForText('with whitespace', 5, '.filters')
  I.waitForText('withoutwhitespace', 5, '.filters')
  I.waitForText('with more whitespace', 5, '.filters')
  I.seeNumberOfElements('.filters .filter', 3)
  I.waitForText('Search results', 5, '.contact-grid-container')
  I.waitForDetached('.contact:nth-of-type(2)')
  I.seeNumberOfElements('.vgrid-scrollpane-container .contact', 1)
})

Scenario('No autosuggest when searching with categories disabled', async ({ I, calendar, contacts }) => {
  await I.haveSetting({ 'io.ox/core': { features: { categories: false } } })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'aaa')

  I.dontSee('Categories', '.autocomplete')
})
