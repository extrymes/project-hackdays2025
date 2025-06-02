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

Feature('Contacts > Distribution List > Create')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('External mail address', ({ I, contacts }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newDistributionlist()

  I.fillField('Name', 'Testlist')
  I.fillField('Add contact', 'test@tester.com')
  I.pressKey('Enter')

  I.waitForVisible('a[data-detail-popup="halo"]')
  I.click('Create list', '.io-ox-contacts-distrib-window')
  I.waitForText('Testlist', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 1 entry', 5, '.contact-detail .contact-header h2')
  I.waitForElement('.contact-detail .participant-email [href="mailto:test@tester.com"]')
})

Scenario('[C7372] Create new distribution list', async ({ I, users, contacts }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newDistributionlist()

  I.fillField('Name', 'C7372 Testlist')

  I.fillField('Add contact', users[0].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[0].get('primaryEmail')))

  I.fillField('Add contact', users[1].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[1].get('primaryEmail')))

  I.fillField('Add contact', users[2].get('primaryEmail'))
  I.pressKey('Enter')
  I.waitForElement(locate('.participant-email a').withText(users[2].get('primaryEmail')))

  I.click('Create list')
  I.waitForDetached('.floating-window-content')
  I.waitForText('Distribution list has been saved')
  I.waitForDetached('.io-ox-alert')
  I.waitForElement('~C7372 Testlist')
  I.doubleClick('~C7372 Testlist')
  I.waitForText('C7372 Testlist')
  I.see(`Distribution list with ${users.length} entries`)

  I.see(users[0].get('primaryEmail'), '.contact-detail')
  I.see(users[0].get('name'), '.contact-detail')

  I.see(users[1].get('primaryEmail'), '.contact-detail')
  I.see(users[1].get('name'), '.contact-detail')

  I.see(users[2].get('primaryEmail'), '.contact-detail')
  I.see(users[2].get('name'), '.contact-detail')
})
