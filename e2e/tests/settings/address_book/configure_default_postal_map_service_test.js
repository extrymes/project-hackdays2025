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

Feature('Settings > Address Book')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C85624] Configure postal addresses map service', async ({ I, contacts, settings }) => {
  await I.haveContact({
    folder_id: `${await I.grabDefaultFolder('contacts')}`,
    last_name: 'Bar',
    first_name: 'Foo ',
    street_home: 'Some Street 0815',
    city_home: '1337 Örtlichkeit',
    state_home: 'Ist Egal',
    postal_code_home: '4711',
    country_home: 'Amazing'
  })

  I.login('app=io.ox/contacts&settings=virtual/settings/io.ox/contacts')
  I.waitForApp()

  // Google Maps
  I.waitForText('Link postal addresses with map service')
  I.waitForText('Google Maps')
  I.checkOption('.io-ox-contacts-settings input[value="google"]')
  I.seeCheckboxIsChecked('.io-ox-contacts-settings input[value="google"]')
  settings.close()
  contacts.selectContact('Bar, Foo')
  I.waitForText('Open in Google Maps')
  const href = await I.grabAttributeFrom('.maps-service', 'href')
  expect(href).to.include('google.com')

  // Open Street Map
  settings.open()
  I.waitForText('Link postal addresses with map service')
  I.waitForText('Open Street Map')
  I.checkOption('.io-ox-contacts-settings input[value="osm"]')
  I.seeCheckboxIsChecked('.io-ox-contacts-settings input[value="osm"]')
  settings.close()
  contacts.selectContact('Bar, Foo')
  I.waitForText('Open in Open Street Map')
  expect(await I.grabAttributeFrom('.maps-service', 'href')).to.include('openstreetmap.org')

  // No link
  settings.open()
  I.waitForText('Link postal addresses with map service')
  I.waitForText('No link')
  I.checkOption('.io-ox-contacts-settings input[value="none"]')
  I.seeCheckboxIsChecked('.io-ox-contacts-settings input[value="none"]')

  // Verify the displayed style
  settings.close()
  contacts.selectContact('Bar, Foo')

  I.dontSee('Open in')
})
