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

const expect = require('chai').expect

Feature('Settings > Basic > User')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C208269] Edit users contact information', async ({ I, dialogs, contacts }) => {
  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: true } })
  I.login('app=io.ox/mail')
  I.waitForVisible('.contact-picture')
  I.click('.contact-picture')
  I.waitForVisible('.dropdown.open .action[data-name="user-picture"]')

  I.click('Edit personal data')

  // floating window opens
  I.waitForElement('.contact-edit')

  // expand field
  I.dontSee('Middle name')
  contacts.addField('personal', 'Middle name')
  I.fillField('Middle name', 'Holger')
  I.see('Middle name')

  // personal info
  I.fillField('First name', 'Richard')
  I.fillField('Last name', 'C208269')
  contacts.addField('personal', 'Title')
  I.fillField('Title', 'Sir')
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
  I.fillField('Cell phone', 'cell phone')
  let prop = await I.grabAttributeFrom({ css: 'input[name="email1"]' }, 'readonly')
  if (prop === 'readonly') prop = 'true'
  expect(prop.toString()).to.contain('true')
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

  // add picture
  I.click('.contact-photo', '.io-ox-contacts-edit-window')
  dialogs.waitForVisible()
  I.waitForVisible('.edit-picture')
  I.attachFile('.contact-photo-upload form input[type="file"][name="file"]', 'media/images/ox_logo.png')
  dialogs.clickButton('Apply')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  // takes an unknown moment until the image appears
  I.waitForVisible('.contact-photo-upload .contact-photo', 1)
  let image = await I.grabBackgroundImageFrom('.contact-photo-upload .contact-photo')
  expect(image).to.match(/^url\("data:image\/jpeg;base64/)

  I.click('Save', '.io-ox-contacts-edit-window')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForNetworkTraffic()

  // switch to address book
  I.openApp('Address Book')
  // wait for first element in the list
  // the list itself is not reliable, instead we wait for the detail view
  I.waitForElement('.contact-detail.view')
  // click on "L"
  const thumbIndex = locate('.thumb-index').withText('P').as('Thumb index')

  I.waitForElement(thumbIndex)
  I.click(thumbIndex)

  // click on item
  const listItem = locate('.vgrid-cell .last_name').withText('C208269').as('List item')
  I.waitForElement(listItem)
  I.click(listItem)

  // check picture
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('C208269').as('Detail view heading'))
  I.waitForVisible('.contact-photo', 1)
  image = await I.grabBackgroundImageFrom('.contact-detail .contact-photo')
  expect(image).not.to.match(/fallback/)
  expect(image).to.match(/^url\(/)
  // also check picture in topbar
  image = await I.grabBackgroundImageFrom('#io-ox-topbar-account-dropdown-icon .contact-picture')
  expect(image).to.match(/^url\(/)

  // personal information
  I.see('Sir', '.contact-detail.view')
  I.see('Richard', '.contact-detail.view')
  I.see('C208269', '.contact-detail.view')
  I.see('Holger', '.contact-detail.view')
  I.see('Pro', '.contact-detail.view')
  I.see('5/4/1957', '.contact-detail.view')
  I.see('http://my.homepage.com', '.contact-detail.view')
  // job description
  I.see('Developer', '.contact-detail.view')
  I.see('Senior Developer', '.contact-detail.view')
  I.see('Frontend', '.contact-detail.view')
  I.see('Open-Xchange', '.contact-detail.view')
  I.see('101', '.contact-detail.view')
  // mail and messaging
  I.see('email2@example.org', '.contact-detail.view')
  I.see('email3@example.org', '.contact-detail.view')
  I.see('instantmessenger1', '.contact-detail.view')
  I.see('instantmessenger2', '.contact-detail.view')
  // phone numbers
  I.see('cell phone', '.contact-detail.view')
  I.see('cell phone alt', '.contact-detail.view')
  I.see('phone business', '.contact-detail.view')
  I.see('phone business alt', '.contact-detail.view')
  I.see('phone home', '.contact-detail.view')
  I.see('phone home alt', '.contact-detail.view')
  I.see('phone other', '.contact-detail.view')
  I.see('fax', '.contact-detail.view')
  I.see('fax home', '.contact-detail.view')
  // business address
  I.see('Business Street', '.contact-detail.view')
  I.see('Business City', '.contact-detail.view')
  I.see('Business State', '.contact-detail.view')
  I.see('12345', '.contact-detail.view')
  I.see('Business County', '.contact-detail.view')
  // home address
  I.see('Home Street', '.contact-detail.view')
  I.see('Home City', '.contact-detail.view')
  I.see('Home State', '.contact-detail.view')
  I.see('23456', '.contact-detail.view')
  I.see('Home County', '.contact-detail.view')
  // other address
  I.see('Other Street', '.contact-detail.view')
  I.see('Other City', '.contact-detail.view')
  I.see('Other State', '.contact-detail.view')
  I.see('34567', '.contact-detail.view')
  I.see('Other County', '.contact-detail.view')
  // comment
  I.see('a comment in the comment field', '.contact-detail.view')
})
