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

Feature('Contacts > Edit')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7361] Edit partial data of a contact', async ({ I, contacts }) => {
  await I.haveContact({
    display_name: 'C7361, C7361',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7361',
    last_name: 'C7361',
    cellular_telephone1: '+4917113371337',
    street_home: '+4917113371337',
    post_code_home: '+4917113371337',
    city_home: '+4917113371337',
    state_home: '+4917113371337',
    country_home: '+4917113371337'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7361, C7361')

  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.fillField('cellular_telephone1', '+3913371337')
  I.fillField('street_home', '+3913371337')
  I.fillField('postal_code_home', '+3913371337')
  I.fillField('city_home', '+3913371337')
  I.fillField('state_home', '+3913371337')
  I.fillField('country_home', '+3913371337')
  I.click('Save')

  I.waitForText('+3913371337', 5, '.contact-detail')
})

Scenario('[C7362] Edit full data of a contact', async ({ I, contacts }) => {
  await I.haveContact({
    display_name: 'C7362, C7362',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7362',
    last_name: 'C7362',
    cellular_telephone1: 'C7362',
    street_home: 'C7362',
    post_code_home: 'C7362',
    city_home: 'C7362',
    state_home: 'C7362',
    country_home: 'C7362'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7362, C7362')

  I.click(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.waitForText('C7362', undefined, '.contact-detail')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')

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
  I.fillField('Phone (other)', 'phone other')
  contacts.addField('communication', 'Fax')
  I.fillField('Fax', 'fax')
  contacts.addField('communication', 'Fax (Home)')
  I.fillField('Fax (Home)', 'fax home')

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
  I.waitForElement('~Refresh')

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

Scenario('Client-side validation returns visual feedback', async ({ I, contacts }) => {
  await I.haveContact({
    display_name: 'Dunphy, Phil',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'Phil',
    last_name: 'Dunphy'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')

  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.dontSee('This is an invalid email address')

  I.fillField('Email 1', 'email1@valid.com')
  I.fillField('Company', 'Dovecot')
  I.dontSee('This is an invalid email address')

  I.fillField('Email 1', 'email2-invalid')
  I.fillField('Company', 'Open-Xchange')
  I.see('This is an invalid email address')

  I.fillField('Email 1', 'email3@valid.com')
  I.fillField('Company', 'Dovecot')
  I.dontSee('This is an invalid email address')

  I.fillField('Email 1', 'email4-invalid')
  I.click('Save')

  I.waitForElement('.io-ox-contacts-edit-window')
})

Scenario('[C7360] Discard modification', async ({ I, contacts }) => {
  await I.haveContact({
    display_name: 'C7360, C7360',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7360',
    last_name: 'C7360',
    cellular_telephone1: '+4917113371337'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7360, C7360')

  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')

  // confirm dirtycheck is working properly
  I.click('Discard')
  I.dontSeeElement('.modal-dialog')
  I.waitForDetached('.io-ox-contacts-edit-window')

  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.fillField('department', 'Holger')
  I.click('Discard')
  I.click('Discard changes')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.dontSee('Holger')
})

Scenario('[C7358] Remove contact picture', async ({ I, search, contacts, dialogs }) => {
  const expect = require('chai').expect

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newContact()

  I.fillField('First name', 'Maximilian')
  I.fillField('Last name', 'Mustermann')
  I.fillField('Cell phone', '+4917113371337')

  I.waitForVisible('.contact-photo-upload .contact-photo.empty')
  I.click('.contact-photo', '.io-ox-contacts-edit-window')

  dialogs.waitForVisible()
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600.png')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  const imageContact = await I.grabCssPropertyFrom('.contact-photo-upload .contact-photo', 'backgroundImage')
  expect(Array.isArray(imageContact) ? imageContact[0] : imageContact).to.not.be.empty
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')

  // remove contact photo
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')

  I.click('.contact-photo', '.io-ox-contacts-edit-window')

  dialogs.waitForVisible()
  I.waitForVisible('.edit-picture')
  dialogs.clickButton('Remove photo')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  I.waitForElement('.contact-photo.empty')
  I.click('Save')

  I.waitForDetached('.io-ox-contacts-edit-window')

  search.doSearch('Maximilian Mustermann')
  I.click('[aria-label="Mustermann, Maximilian"]')
  I.waitForElement('.contact-header')
  I.waitForText('Mustermann, Maximilian', 5, '.contact-header .fullname')

  I.waitForVisible('.leftside .avatar.empty')
  I.waitForVisible('.rightside .contact-photo.empty')
})

Scenario('Remove contact picture, no saving in between', async ({ I, search, contacts, dialogs }) => {
  const expect = require('chai').expect

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newContact()

  I.fillField('First name', 'C7358')
  I.fillField('Last name', 'C7358')
  I.fillField('Cell phone', '+4917113371337')

  I.waitForVisible('.contact-photo-upload .contact-photo.empty')
  I.click('.contact-photo', '.io-ox-contacts-edit-window')

  dialogs.waitForVisible()
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/placeholder/800x600.png')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal-dialog')

  const imageContact = await I.grabCssPropertyFrom('.contact-photo-upload .contact-photo', 'backgroundImage')
  expect(Array.isArray(imageContact) ? imageContact[0] : imageContact).to.not.be.empty

  I.click('.contact-photo', '.io-ox-contacts-edit-window')

  dialogs.waitForVisible()
  I.waitForVisible('.edit-picture')
  dialogs.clickButton('Remove photo')
  I.waitForVisible('.modal.edit-picture.empty')
  I.waitForEnabled('.modal.edit-picture button[data-action="apply"]', 5)
  I.click('Apply', '.modal.edit-picture')
  I.waitForDetached('.modal.edit-picture')

  const emptyImage = await I.grabCssPropertyFrom('.contact-photo-upload .contact-photo', 'backgroundImage')
  expect(Array.isArray(emptyImage) ? emptyImage[0] : emptyImage).to.equal('none')

  I.waitForElement('.contact-photo.empty')

  I.click('Save', '.io-ox-contacts-edit-window')

  I.waitForDetached('.io-ox-contacts-edit-window')

  search.doSearch('C7358 C7358')
  I.click('~C7358, C7358')
  I.waitForElement('.contact-header')
  I.waitForText('C7358, C7358', 5, '.contact-header .fullname')

  I.waitForVisible('.leftside .avatar.empty')
  I.waitForVisible('.rightside .contact-photo.empty')
})

Scenario('[C7363] Add files to a contact', async ({ I, contacts }) => {
  await I.haveContact({
    display_name: 'C7363, C7363',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'C7363',
    last_name: 'C7363'
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7363, C7363')
  I.clickToolbar('~Edit')
  I.waitForVisible('[data-app-name="io.ox/contacts/edit"]')
  I.waitForEnabled({ css: 'input.file-input[type="file"]' })
  I.attachFile({ css: 'input.file-input[type="file"]' }, 'media/files/generic/contact_picture.png')
  I.waitForElement(locate('div').withText('contact_picture.png').inside('.attachment'))
  I.click('Save')
  I.waitForInvisible('[data-app-name="io.ox/contacts/edit"]')
  I.waitForNetworkTraffic()
  I.waitForText('contact_picture.png')
})

Scenario('Edit a simple contact @smoketest', async ({ I, contacts }) => {
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
  contacts.selectContact('C7362, C7362')

  I.click(locate('.contact').withText('C7362, C7362').inside('.vgrid-scrollpane-container'))
  I.waitForText('C7362', undefined, '.contact-detail')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')

  I.fillField('First name', 'John')
  I.fillField('Last name', 'Doe')

  I.fillField('Department', 'Test-department')
  I.fillField('Company', 'Open-Xchange')

  I.fillField('Email 1', 'email1@example.com')
  I.fillField('Cell phone', '0987654321')

  I.fillField('Note', 'a comment in the comment field')

  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForElement('~Refresh')

  I.click('.io-ox-contacts-window .leftside')
  I.pressKey('End')
  I.pressKey('Enter')
  I.waitForVisible('.io-ox-contacts-window .leftside .vgrid-cell.selected')

  I.see('John')
  I.see('Doe')

  I.see('Test-department')
  I.see('Open-Xchange')

  I.see('email1@example.com')

  I.see('0987654321')

  I.see('a comment in the comment field')
})
