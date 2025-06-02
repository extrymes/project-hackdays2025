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

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7492] Birthday', async ({ I }) => {
  const contactFolderID = await I.grabDefaultFolder('contacts')

  await Promise.all([
    { first_name: 'First', last_name: 'One', birthday: moment().add(2, 'days').valueOf() },
    { first_name: 'Second', last_name: 'Two', birthday: moment().add(3, 'days').valueOf() },
    { first_name: 'Third', last_name: 'Three', birthday: moment().add(30, 'days').valueOf() }
  ].map(contact => I.haveContact({
    folder_id: contactFolderID,
    first_name: contact.first_name,
    last_name: contact.last_name,
    display_name: `${contact.last_name}, ${contact.first_name}`,
    birthday: contact.birthday
  })))

  // clear the portal settings
  await I.haveSetting('io.ox/portal//widgets/user', '{}')

  // Add Birthday widget to Portal
  I.login('app=io.ox/portal')
  I.waitForVisible('.io-ox-portal')
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Birthdays')

  // verify contacts displays with the most recent birthday date first
  I.waitForElement('~Birthdays')
  I.waitForElement('.widget[aria-label="Birthdays"] ul li')
  I.see('One, First', '.widget[aria-label="Birthdays"] ul li:nth-child(1)')
  I.see('Two, Second', '.widget[aria-label="Birthdays"] ul li:nth-child(2)')
  I.see('Three, Third', '.widget[aria-label="Birthdays"] ul li:nth-child(3)')

  // check contact popup
  I.waitForText('One, First', 5, '.item')
  I.click(locate('.widget[aria-label="Birthdays"] .item').withText('One, First'))

  I.waitForVisible('~Contact Details')
  I.waitForVisible('.picture', 10)
  I.see('One', '.detail-popup .contact-detail')
  I.see('First', '.detail-popup .contact-detail')
  I.see('Date of birth', '.detail-popup .contact-detail')
  I.waitForElement('~Close', 5)
  I.click('~Close', '.popup-header')
  I.waitForDetached('.detail-popup .contact-detail')

  I.click(locate('.widget[aria-label="Birthdays"] .item').withText('Two, Second'))
  I.waitForVisible('~Contact Details')
  I.waitForVisible('.picture', 10)
  I.see('Two', '.detail-popup .contact-detail')
  I.see('Second', '.detail-popup .contact-detail')
  I.see('Date of birth', '.detail-popup .contact-detail')
  I.waitForElement('~Close', 5)
  I.click('~Close', '.popup-header')
  I.waitForDetached('.detail-popup .contact-detail')

  I.click(locate('.widget[aria-label="Birthdays"] .item').withText('Three, Third'))
  I.waitForVisible('~Contact Details')
  I.waitForVisible('.picture', 10)
  I.see('Three', '.detail-popup .contact-detail')
  I.see('Third', '.detail-popup .contact-detail')
  I.see('Date of birth', '.detail-popup .contact-detail')
  I.waitForElement('~Close', 5)
  I.click('~Close', '.popup-header')
  I.waitForDetached('.detail-popup .contact-detail')
})
