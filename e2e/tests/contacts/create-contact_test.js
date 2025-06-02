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

Feature('Contacts > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7354] With all available fields filled', ({ I, contacts }) => {
  I.login('app=io.ox/contacts')

  I.waitForApp()
  contacts.newContact()

  I.fillField('First name', 'Richard')
  I.fillField('Last name', 'Petersen')
  contacts.addField('personal', 'Title')
  I.fillField('Title', 'Sir')
  contacts.addField('personal', 'Middle name')
  I.fillField('Middle name', 'Holger')
  contacts.addField('personal', 'Suffix')
  I.fillField('Suffix', 'Pro')
  contacts.addField('personal', 'Date of birth')
  I.selectOption('month', 'May')
  I.selectOption('date', '4')
  I.selectOption('year', '1957')
  contacts.addField('personal', 'URL')
  I.fillField('URL', 'my.homepage.com')

  I.fillField('Department', 'Frontend')
  I.fillField('Company', 'Open-Xchange')
  contacts.addField('business', 'Profession')
  I.fillField('Profession', 'Developer')
  contacts.addField('business', 'Position')
  I.fillField('Position', 'Senior Developer')
  contacts.addField('business', 'Room number')
  I.fillField('Room number', '101')

  I.fillField('Email 1', 'email1@example.org')
  I.fillField('Cell phone', 'cell phone')
  contacts.addField('communication', 'Email 2')
  I.fillField('Email 2', 'email2@example.org')
  contacts.addField('communication', 'Email 3')
  I.fillField('Email 3', 'email3@example.org')
  contacts.addField('communication', 'Instant Messenger 1')
  I.fillField('Instant Messenger 1', 'instantmessenger1')
  contacts.addField('communication', 'Instant Messenger 2')
  I.fillField('Instant Messenger 2', 'instantmessenger2')

  contacts.addField('communication', 'Cell phone (alt)')
  I.fillField('Cell phone (alt)', 'cell phone alt')
  contacts.addField('communication', 'Phone (business)')
  I.fillField('Phone (business)', 'phone business')
  contacts.addField('communication', 'Phone (business alt)')
  I.fillField('Phone (business alt)', 'phone business alt')
  contacts.addField('communication', 'Phone (home)')
  I.fillField('Phone (home)', 'phone home')
  contacts.addField('communication', 'Phone (home alt)')
  I.fillField('Phone (home alt)', 'phone home alt')
  contacts.addField('communication', 'Phone (other)')
  I.fillField('Instant Messenger 2', 'instantmessenger2')
  contacts.addField('communication', 'Fax')
  I.fillField('Phone (other)', 'phone other')
  contacts.addField('communication', 'Fax (Home)')
  I.fillField('Fax (Home)', 'fax home')

  contacts.addField('addresses', 'Home address')
  I.fillField('street_home', 'Home Street')
  I.fillField('postal_code_home', '12345')
  I.fillField('city_home', 'Home City')
  I.fillField('state_home', 'Home State')
  I.fillField('country_home', 'Home County')

  contacts.addField('addresses', 'Business address')
  I.fillField('street_business', 'Business Street')
  I.fillField('postal_code_business', '23456')
  I.fillField('city_business', 'Business City')
  I.fillField('state_business', 'Business State')
  I.fillField('country_business', 'Business County')

  contacts.addField('addresses', 'Other address')
  I.fillField('street_other', 'Other Street')
  I.fillField('postal_code_other', '34567')
  I.fillField('city_other', 'Other City')
  I.fillField('state_other', 'Other State')
  I.fillField('country_other', 'Other County')

  I.fillField('note', 'a comment in the comment field')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.click('.io-ox-contacts-window .leftside')
  I.pressKey('End')
  I.pressKey('Enter')
  I.waitForVisible('.io-ox-contacts-window .leftside .vgrid-cell.selected')

  I.see('Sir')
  I.see('Richard')
  I.see('Petersen')
  I.see('Holger')
  I.see('Pro')
  I.see('5/4/1957')
  I.see('http://my.homepage.com')

  I.see('Developer')
  I.see('Senior Developer')
  I.see('Frontend')
  I.see('Open-Xchange')
  I.see('101')

  I.see('email1@example.org')
  I.see('email2@example.org')
  I.see('email3@example.org')
  I.see('instantmessenger1')
  I.see('instantmessenger2')

  I.see('cell phone')
  I.see('cell phone alt')
  I.see('phone business')
  I.see('phone business alt')
  I.see('phone home')
  I.see('phone home alt')
  I.see('phone other')
  I.see('fax')
  I.see('fax home')

  I.see('Business Street')
  I.see('Business City')
  I.see('Business State')
  I.see('12345')
  I.see('Business County')

  I.see('Home Street')
  I.see('Home City')
  I.see('Home State')
  I.see('23456')
  I.see('Home County')

  I.see('Other Street')
  I.see('Other City')
  I.see('Other State')
  I.see('34567')
  I.see('Other County')

  I.see('a comment in the comment field')
})

Scenario('Dirtycheck on creating contact', async ({ I, contacts }) => {
  I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Rhabarbar', last_name: 'Barbara' })
  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newContact()
  I.click('Discard')
  I.dontSeeElement('.modal-dialog')

  contacts.newContact()
  I.fillField('First name', 'Hallo')
  I.fillField('Last name', 'Helmut')
  I.fillField('First name', '')
  I.fillField('Last name', '')
  I.click('Discard')
  I.dontSeeElement('.modal-dialog')

  contacts.selectContact('Barbara, Rhabarbar')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.fillField('First name', 'Gemüse')
  I.click('Discard')
  I.seeElement('.modal-dialog')
})

Scenario('Save contact with keyboard shortcut', async ({ I, contacts }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Rhabarbar', last_name: 'Barbara' })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.pressKey('c')
  I.waitForText('Add personal info')
  I.fillField('First name', 'Hallo')
  I.fillField('Last name', 'Helmut')

  I.pressKey(['CommandOrControl', 'Enter'])

  contacts.selectContact('Helmut, Hallo')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()
})

Scenario('Create contact in shared folder', async ({ I, contacts, users, dialogs }) => {
  await users.create()
  const sharedUserName = `${users[1].get('sur_name')}, ${users[1].get('given_name')}`
  const parent = await I.grabDefaultFolder('contacts', { user: users[1] })

  await I.haveFolder({
    module: 'contacts',
    title: 'Shared address book',
    parent,
    permissions: [
      // other user has owner access
      { bits: 403710016, entity: users[1].get('id'), group: false },
      // read-only access to default user
      { bits: 257, entity: users[0].get('id'), group: false }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.selectFolder(`${sharedUserName}: Shared address book`)
  I.clickPrimary('New contact')
  I.waitForText(`You cannot add contacts in "${sharedUserName}: Shared address book". Do you want to add a new contact to your default address book instead?`)
  dialogs.clickButton('Use default')

  I.waitForText('Add personal info')
  I.fillField('First name', 'Contact from shared')
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.click('.io-ox-contacts-window .leftside')
  I.pressKey('End')
  I.pressKey('Enter')
  I.waitForVisible('.io-ox-contacts-window .leftside .vgrid-cell.selected')
  I.see('Contact from shared')
})

Scenario('Create contact in public folder', async ({ I, contacts, users, dialogs }) => {
  await users.create()

  await I.haveFolder({
    module: 'contacts',
    title: 'Public address book',
    // set '2' as parent makes it a public address book
    parent: '2',
    permissions: [
      // other user has owner access
      { bits: 403710016, entity: users[1].get('id'), group: false },
      // read-only access to default user
      { bits: 257, entity: users[0].get('id'), group: false }
    ]
  }, { user: users[1] })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.selectFolder('Public address book')
  I.clickPrimary('New contact')
  I.waitForText('You cannot add contacts in "Public address book". Do you want to add a new contact to your default address book instead?')
  dialogs.clickButton('Use default')

  I.waitForText('Add personal info')
  I.fillField('First name', 'Contact from public')
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.click('.io-ox-contacts-window .leftside')
  I.pressKey('End')
  I.pressKey('Enter')
  I.waitForVisible('.io-ox-contacts-window .leftside .vgrid-cell.selected')
  I.see('Contact from public')
})

Scenario('with categories', async ({ I, contacts }) => {
  await I.haveSetting('io.ox/core//features/categories', true)
  I.login('app=io.ox/contacts&folder=con://0/32')
  I.waitForApp()
  contacts.newContact()

  I.waitForText('Categories')
  I.click('Add category')
  I.clickDropdown('Important')
  I.waitForText('Important', 1, '.categories-badges')
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')

  I.waitForText('Empty name and description')
  I.waitForText('Important', 5, '.category-view')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.waitForText('Important', 5, '.categories-badges')
  I.scrollTo('.category-dropdown-wrapper')
  I.click('~Remove category')
  I.dontSeeElement('~Remove category')
  I.dontSee('Important', '.io-ox-contacts-edit-window')
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.dontSee('Important')
})

Scenario('Create a simple contact @smoketest', ({ I, contacts }) => {
  I.login('app=io.ox/contacts')

  I.waitForApp()
  contacts.newContact()

  I.fillField('First name', 'John')
  I.fillField('Last name', 'Doe')

  I.fillField('Company', 'Open-Xchange')
  I.fillField('Department', 'Test-department')

  I.fillField('Email 1', 'email1@example.com')
  I.fillField('Cell phone', '0123456789')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.click('.io-ox-contacts-window .leftside')
  I.pressKey('End')
  I.pressKey('Enter')
  I.waitForVisible('.io-ox-contacts-window .leftside .vgrid-cell.selected')

  I.see('John')
  I.see('Doe')

  I.see('Test-department')
  I.see('Open-Xchange')

  I.see('email1@example.com')

  I.see('0123456789')
})
