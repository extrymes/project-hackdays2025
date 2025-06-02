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

Feature('Mobile > Contacts')

Before(async ({ I, users }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Create new contact with all fields @mobile', ({ I, mobileContacts }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  mobileContacts.newContact()

  I.fillField('First name', 'Peter')
  I.fillField('Last name', 'Müller')
  mobileContacts.addField('personal', 'Title')
  I.fillField('Title', 'Sir')
  mobileContacts.addField('personal', 'Middle name')
  I.fillField('Middle name', 'Holger')
  mobileContacts.addField('personal', 'Suffix')
  I.fillField('Suffix', 'Pro')
  mobileContacts.addField('personal', 'Date of birth')
  I.selectOption('month', 'May')
  I.selectOption('date', '4')
  I.selectOption('year', '1957')
  mobileContacts.addField('personal', 'URL')
  I.fillField('URL', 'my.homepage.com')

  I.fillField('Department', 'Frontend')
  I.fillField('Company', 'Open-Xchange')
  mobileContacts.addField('business', 'Profession')
  I.fillField('Profession', 'Full Stack Developer')
  mobileContacts.addField('business', 'Position')
  I.fillField('Position', 'Senior Developer')
  mobileContacts.addField('business', 'Room number')
  I.fillField('Room number', '101')

  I.fillField('Email 1', 'email1@example.org')
  I.fillField('Cell phone', 'cell phone main')
  mobileContacts.addField('communication', 'Email 2')
  I.fillField('Email 2', 'email2@example.org')
  mobileContacts.addField('communication', 'Email 3')
  I.fillField('Email 3', 'email3@example.org')
  mobileContacts.addField('communication', 'Instant Messenger 1')
  I.fillField('Instant Messenger 1', 'instantmessenger1')
  mobileContacts.addField('communication', 'Instant Messenger 2')
  I.fillField('Instant Messenger 2', 'instantmessenger2')

  mobileContacts.addField('communication', 'Cell phone (alt)')
  I.fillField('Cell phone (alt)', 'cell phone alt')
  mobileContacts.addField('communication', 'Phone (business)')
  I.fillField('Phone (business)', 'phone business main')
  mobileContacts.addField('communication', 'Phone (business alt)')
  I.fillField('Phone (business alt)', 'phone business alt')
  mobileContacts.addField('communication', 'Phone (home)')
  I.fillField('Phone (home)', 'phone home main')
  mobileContacts.addField('communication', 'Phone (home alt)')
  I.fillField('Phone (home alt)', 'phone home alt')
  mobileContacts.addField('communication', 'Phone (other)')
  I.fillField('Phone (other)', 'phone other')
  mobileContacts.addField('communication', 'Fax')
  I.fillField('Fax', 'fax main')
  mobileContacts.addField('communication', 'Fax (Home)')
  I.fillField('Fax (Home)', 'fax home')

  mobileContacts.addField('addresses', 'Home address')
  I.fillField('street_home', 'Home Street')
  I.fillField('postal_code_home', '12345')
  I.fillField('city_home', 'Home City')
  I.fillField('state_home', 'Home State')
  I.fillField('country_home', 'Home County')

  mobileContacts.addField('addresses', 'Business address')
  I.fillField('street_business', 'Business Street')
  I.fillField('postal_code_business', '23456')
  I.fillField('city_business', 'Business City')
  I.fillField('state_business', 'Business State')
  I.fillField('country_business', 'Business County')

  mobileContacts.addField('addresses', 'Other address')
  I.fillField('street_other', 'Other Street')
  I.fillField('postal_code_other', '34567')
  I.fillField('city_other', 'Other City')
  I.fillField('state_other', 'Other State')
  I.fillField('country_other', 'Other County')

  I.fillField('note', 'a comment in the comment field')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.waitForVisible('.fullname')
  I.click('.fullname')
  I.waitForVisible('~Contact Details')

  I.see('Sir')
  I.see('Peter')
  I.see('Müller')
  I.see('Holger')
  I.see('Pro')
  I.see('5/4/1957')
  I.see('http://my.homepage.com')

  I.see('Full Stack Developer')
  I.see('Senior Developer')
  I.see('Frontend')
  I.see('Open-Xchange')
  I.see('101')

  I.see('email1@example.org')
  I.see('email2@example.org')
  I.see('email3@example.org')
  I.see('instantmessenger1')
  I.see('instantmessenger2')

  I.see('cell phone main')
  I.see('cell phone alt')
  I.see('phone business main')
  I.see('phone business alt')
  I.see('phone home main')
  I.see('phone home alt')
  I.see('phone other')
  I.see('fax main')
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

Scenario('Edit a simple contact @mobile', async ({ I }) => {
  await I.haveContact({
    display_name: 'C7362, C7362',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7362',
    last_name: 'C7362',
    company: 'C7362',
    department: 'C7362',
    email1: 'C7362@C7362.io',
    cellular_telephone1: 'C7362'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  I.waitForElement(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.click(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.waitForText('C7362', 5, '.contact-detail')
  I.waitForClickable('~Edit', 5)
  I.click('~Edit')
  I.waitForText('Add personal info', 5, '.io-ox-contacts-edit-window')

  I.fillField('First name', 'John')
  I.fillField('Last name', 'Doe')

  I.fillField('Department', 'Test-department')
  I.fillField('Company', 'Open-Xchange')

  I.fillField('Email 1', 'email1@example.com')
  I.fillField('Cell phone', '0987654321')

  I.fillField('Note', 'a comment in the comment field')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  I.waitForText('John')
  I.see('Doe')

  I.see('Test-department')
  I.see('Open-Xchange')

  I.see('email1@example.com')

  I.see('0987654321')

  I.see('a comment in the comment field')

  I.click('Back')
  I.waitForElement(locate('.contact').withText('Doe, John').inside('.vgrid-scrollpane-container'))
  I.see('Open-Xchange, Test-department')
})

// SKIP: currently fails due to naive dirty check, discuss if this behavior stays
Scenario.skip('Create new contact and discard @mobile', ({ I, dialogs, mobileContacts }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  mobileContacts.newContact()

  I.fillField('First name', 'Peter')
  I.click('Discard')
  dialogs.waitForVisible()
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')
  I.clearField('First name')
  I.click('Discard')

  I.waitForDetached('.io-ox-contacts-edit-window')
})
