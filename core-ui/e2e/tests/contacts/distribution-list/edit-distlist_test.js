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

Feature('Contacts > Distribution List > Edit')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Add an existing distribution list', async ({ I, contacts, dialogs }) => {
  I.login('app=io.ox/contacts')
  I.waitForApp()

  // create new address book
  contacts.newAddressbook('test address book')

  // create distribution list
  const listenerID = I.registerNodeRemovalListener('.classic-toolbar')
  I.selectFolder('test address book')
  I.waitForNodeRemoval(listenerID)

  I.waitForText('This address book is empty') // Empty in list view
  contacts.newDistributionlist()

  I.fillField('Name', 'test distribution list one')
  I.fillField('Add contact', 'testdude1@test.case')
  I.pressKey('Enter')
  I.fillField('Add contact', 'testdude2@test.case')
  I.pressKey('Enter')
  I.fillField('Add contact', 'testdude3@test.case')
  I.pressKey('Enter')
  I.fillField('Add contact', 'testdude4@test.case')
  I.pressKey('Enter')
  I.click('Create list')
  I.waitForDetached('.io-ox-contacts-distrib-window')
  I.waitForText('test distribution list one', undefined, '.contact-detail')
  I.waitForVisible('.io-ox-alert')
  I.click('[data-action="close"]', '.io-ox-alert')

  // create second list
  contacts.newDistributionlist()
  I.fillField('Name', 'test distribution list two')

  // search in address book for distribution list one
  I.click('~Select contacts')
  dialogs.waitForVisible()
  I.waitForVisible('.modal-dialog .modal-header input.search-field', 5)
  I.waitForEnabled('.modal-dialog .modal-header input.search-field', 5) // search field disabled until list is loaded
  I.waitForFocus('.modal-header input.search-field') // search field must be focused, otherwise marked string might be deleted
  I.fillField('.modal-dialog .modal-header input.search-field', 'test distribution list one')
  I.waitForText('test distribution list one', 5, '.modal li.list-item')
  I.click('test distribution list one', '.modal li.list-item')
  I.waitForText('4 addresses selected', 5)
  I.see('test distribution list one', 'li.token')

  dialogs.clickButton('Select')
  I.waitForDetached('.modal-dialog')

  // add another address just for good measure
  I.fillField('Add contact', 'testdude5@test.case')
  I.pressKey('Enter')
  I.waitNumberOfVisibleElements('li.participant-wrapper.removable', 5)

  I.see('testdude1@test.case')
  I.see('testdude2@test.case')
  I.see('testdude3@test.case')
  I.see('testdude4@test.case')
  I.see('testdude5@test.case')

  I.click('Create list')
  I.waitForDetached('.io-ox-contacts-distrib-window', 5)

  I.see('test distribution list two')
})

Scenario('[C7373] Update members', async ({ I, users, contacts }) => {
  await Promise.all([
    users.create(),
    users.create()
  ])

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
  const contact3 = await I.haveContact({
    display_name: users[2].get('fullname'),
    last_name: users[2].get('sur_name'),
    first_name: users[2].get('given_name'),
    email1: users[2].get('primaryEmail'),
    folder_id: defaultFolder
  })
  await I.haveContact({
    display_name: 'C7373 Test Distribution List',
    folder_id: defaultFolder,
    mark_as_distributionlist: true,
    distribution_list: [
      { id: contact1.id, display_name: users[0].get('fullname'), mail: users[0].get('primaryEmail'), mail_field: 1 },
      { id: contact2.id, display_name: users[1].get('fullname'), mail: users[1].get('primaryEmail'), mail_field: 1 },
      { id: contact3.id, display_name: users[2].get('fullname'), mail: users[2].get('primaryEmail'), mail_field: 1 }
    ]
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  // check precondition
  contacts.selectContact('C7373 Test Distribution List')

  I.waitForText('C7373 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 3 entries', 5, '.contact-detail .contact-header h2')
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[2].get('primaryEmail')}"]`)

  // add 4th contact
  I.clickToolbar('~Edit')
  I.waitForElement('.form-control.add-participant.tt-input')
  I.fillField('.form-control.add-participant.tt-input', 'john.doe@open-xchange.com')
  I.pressKey('Enter')
  I.click('Save')
  I.waitForDetached('.floating-window')
  I.waitForText('Distribution list has been saved')
  I.waitForDetached('.io-ox-alert')

  // check
  I.waitForText('C7373 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 4 entries', 5, '.contact-detail .contact-header h2')
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[2].get('primaryEmail')}"]`)
  I.waitForElement('.contact-detail .participant-email [href="mailto:john.doe@open-xchange.com"]')

  // remove 1st contact
  I.clickToolbar('~Edit')
  const removeButton = locate('.remove').after(locate('.participant-email a').withText(users[0].get('primaryEmail')).inside('.removable')).as('remove button')
  I.waitForElement(removeButton)
  I.click(removeButton)
  I.click('Save')
  I.waitForDetached('.floating-window')
  I.waitForText('Distribution list has been saved')
  I.waitForDetached('.io-ox-alert')

  // check
  I.waitForText('C7373 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 3 entries', 5, '.contact-detail .contact-header h2')
  I.dontSeeElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.dontSee(users[0].get('primaryEmail'))
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)
  I.see(users[1].get('primaryEmail'))
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[2].get('primaryEmail')}"]`)
  I.see(users[2].get('primaryEmail'))
  I.waitForElement('.contact-detail .participant-email [href="mailto:john.doe@open-xchange.com"]')
  I.see('john.doe@open-xchange.com')
})

Scenario('[C7374] Change name', async ({ I, users, contacts }) => {
  await users.create()

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
    display_name: 'C7374 Test Distribution List',
    folder_id: defaultFolder,
    mark_as_distributionlist: true,
    distribution_list: [
      { id: contact1.id, display_name: users[0].get('fullname'), mail: users[0].get('primaryEmail'), mail_field: 1 },
      { id: contact2.id, display_name: users[1].get('fullname'), mail: users[1].get('primaryEmail'), mail_field: 1 }
    ]
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()

  // check precondition
  contacts.selectContact('C7374 Test Distribution List')
  I.waitForText('C7374 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')
  I.see(users[0].get('primaryEmail'))
  I.see(users[1].get('primaryEmail'))
  // edit name
  I.clickToolbar('~Edit')
  I.waitForElement('[name="display_name"]')
  I.fillField('[name="display_name"]', 'C7374 Renamed Test Distribution List')
  I.click('Save')
  I.waitForDetached('.floating-window')
  I.waitForText('Distribution list has been saved')
  I.waitForDetached('.io-ox-alert')
  // select and check
  contacts.selectContact('C7374 Renamed Test Distribution List')
  I.waitForText('C7374 Renamed Test Distribution List', 5, '.contact-detail .fullname')
  I.see('Distribution list with 2 entries', '.contact-detail .contact-header h2')
  I.see(users[0].get('primaryEmail'))
  I.see(users[1].get('primaryEmail'))
})

Scenario('[C7375] Move list', async ({ I, users, contacts, dialogs }) => {
  await users.create()

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
    display_name: 'C7375 Test Distribution List',
    folder_id: defaultFolder,
    mark_as_distributionlist: true,
    distribution_list: [
      { id: contact1.id, display_name: users[0].get('fullname'), mail: users[0].get('primaryEmail'), mail_field: 1 },
      { id: contact2.id, display_name: users[1].get('fullname'), mail: users[1].get('primaryEmail'), mail_field: 1 }
    ]
  })

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.newAddressbook('C7375')
  contacts.selectContact('C7375 Test Distribution List')
  I.click('~More actions', '~Contact Details')
  I.click('Move')

  dialogs.waitForVisible()
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('.modal .section:not(.empty) .folder-arrow:not(.invisible)')
  I.click('.modal .section:not(.empty) .folder-arrow:not(.invisible)')
  I.waitForElement('.modal .section.open [aria-label="C7375"]', 5)
  I.click('.modal [aria-label="C7375"]')
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('Contacts')
  I.waitForDetached('~C7375 Test Distribution List')
  I.selectFolder('C7375')
  contacts.selectContact('C7375 Test Distribution List')
  I.waitForText('C7375 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')

  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)
})

Scenario('[C7377] Copy list', async ({ I, users, contacts, dialogs }) => {
  await users.create()

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
    display_name: 'C7377 Test Distribution List',
    folder_id: defaultFolder,
    mark_as_distributionlist: true,
    distribution_list: [
      { id: contact1.id, display_name: users[0].get('fullname'), mail: users[0].get('primaryEmail'), mail_field: 1 },
      { id: contact2.id, display_name: users[1].get('fullname'), mail: users[1].get('primaryEmail'), mail_field: 1 }
    ]
  })

  I.login('app=io.ox/contacts')

  I.waitForApp()
  contacts.newAddressbook('C7377')
  contacts.selectContact('C7377 Test Distribution List')

  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')

  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)

  I.click('~More actions', '~Contact Details')
  I.clickDropdown('Copy')
  dialogs.waitForVisible()
  I.waitForText('Copy', 5, dialogs.header)
  I.waitForElement('.modal .section:not(.empty) .folder-arrow:not(.invisible)')
  I.click('.modal .section:not(.empty) .folder-arrow:not(.invisible)')
  I.waitForElement('.modal .section.open [aria-label="C7377"]', 5)
  I.click('.modal [aria-label="C7377"]')
  dialogs.clickButton('Copy')
  I.waitForDetached('.modal-dialog')

  I.selectFolder('Contacts')
  I.waitForElement('~C7377 Test Distribution List')
  I.retry(3).click('~C7377 Test Distribution List')
  I.waitForText('C7377 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)

  I.selectFolder('C7377')
  I.waitForElement('~C7377 Test Distribution List')
  I.retry(3).click('~C7377 Test Distribution List')
  I.waitForText('C7377 Test Distribution List', 5, '.contact-detail .fullname')
  I.waitForText('Distribution list with 2 entries', 5, '.contact-detail .contact-header h2')
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[0].get('primaryEmail')}"]`)
  I.waitForElement(`.contact-detail .participant-email [href="mailto:${users[1].get('primaryEmail')}"]`)
})
