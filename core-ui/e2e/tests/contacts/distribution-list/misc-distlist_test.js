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

Feature('Contacts > Distribution List > Misc')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Add external participant as contact', async ({ I, contacts, dialogs }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newDistributionlist()

  I.say('New distribution list')
  I.fillField('Name', 'Testlist')
  I.fillField('Add contact', 'test@tester.com')
  I.pressKey('Enter')

  I.say('Open halo view')
  I.waitForVisible('a[data-detail-popup="halo"]')
  I.click('a[data-detail-popup="halo"]')
  I.waitForVisible(locate('.detail-popup').as('Halo View'))
  await within(locate('.detail-popup').as('Halo View'), async () => {
    I.waitForVisible('[data-action="io.ox/contacts/actions/add-to-contactlist"]')
    I.waitForElement('~Add to address book')
    I.click('~Add to address book')
  })

  I.say('New contact')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.waitForVisible('[name="last_name"]')

  I.say('Check prefilled mail address')
  I.seeInField('Email 1', 'test@tester.com')

  I.say('Confirm dirtycheck is working properly')
  I.click('Discard', '.io-ox-contacts-edit-window')
  dialogs.waitForVisible()
  I.waitForText('Do you really want to discard your changes?', 5, dialogs.body)
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal-dialog')

  I.say('Save contact as `Lastname`')
  I.fillField('Last name', 'Lastname')
  I.click('Save', '.io-ox-contacts-edit-window')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.waitForText('Lastname', 5, locate('.detail-popup').as('Halo View'))

  I.say('Save to addressbook')
  I.waitForVisible('.io-ox-contacts-distrib-window')
  I.click('Create list', '.io-ox-contacts-distrib-window')

  I.waitForDetached('.io-ox-contacts-distrib-window')
})

Scenario('[C7376] Send a mail to list', async ({ I, users, contacts, mail }) => {
  await users.create()
  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  const defaultFolder = await I.grabDefaultFolder('contacts')
  const contact1 = await I.haveContact({
    display_name: users[0].get('fullname'),
    last_name: users[0].get('sur_name'),
    first_name: users[0].get('given_name'),
    email1: users[0].get('primaryEmail'),
    folder_id: defaultFolder
  })
  const contact2 = await I.haveContact({
    display_name: users[1].get('fullname'),
    last_name: users[1].get('sur_name'),
    first_name: users[1].get('given_name'),
    email1: users[1].get('primaryEmail'),
    folder_id: defaultFolder
  })
  await I.haveContact({
    display_name: 'C7376 Test Distribution List',
    folder_id: defaultFolder,
    mark_as_distributionlist: true,
    distribution_list: [
      { id: contact1.id, display_name: users[0].get('fullname'), mail: users[0].get('primaryEmail'), mail_field: 1 },
      { id: contact2.id, display_name: users[1].get('fullname'), mail: users[1].get('primaryEmail'), mail_field: 1 }
    ]
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('C7376 Test Distribution List')

  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')

  I.see(users[0].get('primaryEmail'), '.contact-detail')
  I.see(users[1].get('primaryEmail'), '.contact-detail')

  I.clickToolbar('~Send email')
  I.waitForFocus('.io-ox-mail-compose [placeholder="To"]')
  I.fillField('.io-ox-mail-compose [name="subject"]', 'C7376 Test Distribution List')
  I.fillField({ css: 'textarea.plain-text' }, 'C7376 Test Distribution List')
  I.click('Send')
  I.waitForDetached('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor')
  I.logout()

  I.login('app=io.ox/mail')
  I.selectFolder('Inbox')

  mail.selectMail('C7376 Test Distribution List')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('C7376 Test Distribution List', '.io-ox-mail-window .mail-detail-pane .subject')
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.selectFolder('Inbox')

  mail.selectMail('C7376 Test Distribution List')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('C7376 Test Distribution List', '.io-ox-mail-window .mail-detail-pane .subject')
})
