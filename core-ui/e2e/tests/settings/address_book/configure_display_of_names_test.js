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

Feature('Settings > Address Book')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7862] Configure display name representation', async ({ I, contacts, settings }) => {
  const folder = await I.grabDefaultFolder('contacts')
  const firstName = 'Foo'
  const lastName = 'Bar'

  await I.haveContact({ folder_id: folder, first_name: firstName, last_name: lastName })

  I.login('app=io.ox/contacts&settings=virtual/settings/io.ox/contacts')
  I.waitForApp()

  // go into settings and change display style of contacts
  I.waitForText('Address Book')
  I.waitForText('Names', undefined, '.io-ox-contacts-settings')
  I.click('First name Last name', '.io-ox-contacts-settings')

  // Verify the displayed style
  settings.close()
  I.waitForElement('.contact-grid-container')
  I.wait(1) // wait for listeners to be attached
  I.click('.selectable.contact')
  I.waitForElement(locate('.fullname .last_name').withText('Bar'), 5)
  I.waitForElement(locate('.fullname .first_name').withText(firstName), 5)

  // Go back to settings and switch to other display style
  settings.open()
  I.waitForText('Names')
  I.click('Last name, First name', '.io-ox-contacts-settings')

  // Go back to contacts app and verify it
  settings.close()
  I.waitForApp()
  I.wait(1) // wait for listeners to be attached
  I.click('.selectable.contact')
  I.waitForElement(locate('.fullname .last_name').withText(lastName), 5)
  I.waitForElement(locate('.fullname .first_name').withText(firstName), 5)
})
