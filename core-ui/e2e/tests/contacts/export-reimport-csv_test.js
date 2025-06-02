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

Feature('Import/Export > Contacts')

Before(async function ({ users }) {
  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C104271] Export and re-import vCard', async ({ I, users, contacts }) => {
  // This test also covers '[C104272] Export and re-import CSV'
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.handleDownloads()

  // add full new contact with dummy data
  contacts.newContact()
  // personal info
  I.fillField('First name', 'Eugen')
  I.fillField('Last name', 'Freud')
  contacts.addField('personal', 'Title')
  I.fillField('Title', 'Mister')
  contacts.addField('personal', 'Middle name')
  I.fillField('Middle name', 'Freudiger')
  contacts.addField('personal', 'Suffix')
  I.fillField('Suffix', 'Pro')
  contacts.addField('personal', 'Date of birth')
  I.selectOption('month', 'May')
  I.selectOption('date', '4')
  I.selectOption('year', '1957')
  contacts.addField('personal', 'URL')
  I.fillField('URL', 'my.homepage.com')
  // job description
  I.fillField('Department', 'Frontend')
  I.fillField('Company', 'Open-Xchange')
  contacts.addField('business', 'Profession')
  I.fillField('Profession', 'Developer')
  contacts.addField('business', 'Position')
  I.fillField('Position', 'Senior Developer')
  contacts.addField('business', 'Room number')
  I.fillField('Room number', '101')
  // communication
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
  // phone and fax
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
  I.fillField('Phone (other)', 'phone other')
  contacts.addField('communication', 'Fax')
  I.fillField('Fax', 'fax')
  contacts.addField('communication', 'Fax (Home)')
  I.fillField('Fax (Home)', 'fax home')
  // home address
  contacts.addField('addresses', 'Home address')
  I.fillField('street_home', 'Home Street')
  I.fillField('postal_code_home', '12345')
  I.fillField('city_home', 'Home City')
  I.fillField('state_home', 'Home State')
  I.fillField('country_home', 'Home County')
  // business address
  contacts.addField('addresses', 'Business address')
  I.fillField('street_business', 'Business Street')
  I.fillField('postal_code_business', '23456')
  I.fillField('city_business', 'Business City')
  I.fillField('state_business', 'Business State')
  I.fillField('country_business', 'Business County')
  // other address
  contacts.addField('addresses', 'Other address')
  I.fillField('street_other', 'Other Street')
  I.fillField('postal_code_other', '34567')
  I.fillField('city_other', 'Other City')
  I.fillField('state_other', 'Other State')
  I.fillField('country_other', 'Other County')
  // comment
  I.fillField('note', 'a comment in the comment field')
  // saving
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  // create distribution list
  contacts.newDistributionlist()
  I.fillField('Name', 'C104271')

  I.fillField('Add contact', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[0].get('primaryEmail')).as('participant email 1'))

  I.fillField('Add contact', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[1].get('primaryEmail')).as('participant email 2'))

  I.fillField('Add contact', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[2].get('primaryEmail')).as('participant email 3'))

  I.click('Create list')
  I.waitForDetached('.floating-window-content')
  I.waitForText('Distribution list has been saved')
  I.waitForDetached('.io-ox-alert')

  // open contact and check
  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  // export individual contacts
  await contacts.exportVCF('Eugen Freud')
  await contacts.exportCSV('Eugen Freud')

  // export address book
  await contacts.exportAddressBookCSV('Contacts')
  await contacts.exportAddressBookVCF('Contacts')

  // open list and check
  contacts.selectContact('C104271')

  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  // export files
  await contacts.exportVCF('C104271')
  await contacts.exportCSV('C104271')

  // add new address book
  contacts.newAddressbook('Important Contacts')
  I.selectFolder('Important Contacts')

  // import contact vCard and check
  contacts.importVCF('Eugen Freud', 'output/downloads')
  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  contacts.deleteSelected()

  // import contact CSV and check
  contacts.importCSV('Eugen Freud', 'output/downloads')
  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  // import contact vCard and check
  contacts.importVCF('C104271', 'output/downloads')
  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  contacts.deleteSelected()

  // import contact CSV and check
  contacts.importCSV('C104271', 'output/downloads')
  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  contacts.newAddressbook('reimportCSV')
  I.selectFolder('reimportCSV')
  contacts.importCSV('Contacts', 'output/downloads', 'reimportCSV')

  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  contacts.newAddressbook('reimportVCard')
  I.selectFolder('reimportVCard')
  contacts.importVCF('Contacts', 'output/downloads', 'reimportVCard')

  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  // export selected contacts
  I.pressKeyDown('CommandOrControl')
  I.click('.vgrid [aria-label="Freud, Eugen"]')
  I.waitForText('2 items selected')
  I.pressKeyUp('CommandOrControl')

  await contacts.exportVCF('reimportVCard')
  await contacts.exportCSV('reimportVCard')

  contacts.newAddressbook('reimportSelectedCSV')
  I.selectFolder('reimportSelectedCSV')
  contacts.importCSV('reimportVCard', 'output/downloads', 'reimportSelectedCSV')

  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))

  contacts.newAddressbook('reimportSelectedVcard')
  I.selectFolder('reimportSelectedVcard')
  contacts.importVCF('reimportVCard', 'output/downloads', 'reimportSelectedVcard')
  contacts.selectContact('Freud, Eugen')
  // personal information
  I.see('Mister', { css: 'dd' })
  I.see('Eugen', { css: 'dd' })
  I.see('Freudiger', { css: 'dd' })
  I.see('Freud', { css: 'dd' })
  I.see('Pro', { css: 'dd' })
  I.see('5/4/1957', { css: 'dd' })
  I.see('http://my.homepage.com', { css: 'dd' })
  // job description
  I.see('Developer', { css: 'dd' })
  I.see('Senior Developer', { css: 'dd' })
  I.see('Frontend', { css: 'dd' })
  I.see('Open-Xchange', { css: 'dd' })
  I.see('101', { css: 'dd' })
  // mail and messaging
  I.see('email1@example.org', { css: 'dd a' })
  I.see('email2@example.org', { css: 'dd a' })
  I.see('email3@example.org', { css: 'dd a' })
  I.see('instantmessenger1', { css: 'dd' })
  I.see('instantmessenger2', { css: 'dd' })
  // phone numbers
  I.see('cell phone', { css: 'dd a' })
  I.see('cell phone alt', { css: 'dd a' })
  I.see('phone business', { css: 'dd a' })
  I.see('phone business alt', { css: 'dd a' })
  I.see('phone home', { css: 'dd a' })
  I.see('phone home alt', { css: 'dd a' })
  I.see('phone other', { css: 'dd a' })
  I.see('fax', { css: 'dd' })
  I.see('fax home', { css: 'dd' })
  // business address
  I.see('Business Street', { css: 'address' })
  I.see('Business City', { css: 'address' })
  I.see('Business State', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Business County', { css: 'address' })
  // home address
  I.see('Home Street', { css: 'address' })
  I.see('Home City', { css: 'address' })
  I.see('Home State', { css: 'address' })
  I.see('23456', { css: 'address' })
  I.see('Home County', { css: 'address' })
  // other address
  I.see('Other Street', { css: 'address' })
  I.see('Other City', { css: 'address' })
  I.see('Other State', { css: 'address' })
  I.see('34567', { css: 'address' })
  I.see('Other County', { css: 'address' })
  // comment
  I.see('a comment in the comment field', { css: 'dd' })

  contacts.selectContact('C104271')
  I.waitForText(users[0].get('sur_name'))
  I.waitForText(users[0].get('primaryEmail'))
  I.waitForText(users[1].get('sur_name'))
  I.waitForText(users[1].get('primaryEmail'))
  I.waitForText(users[2].get('sur_name'))
  I.waitForText(users[2].get('primaryEmail'))
})
