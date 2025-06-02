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

Feature('Contacts > Import')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C104269] Import App Suite CSV', async ({ I, contacts, dialogs }) => {
// this scenario also covers:
// [C104268] Import App Suite vCard
// [C104277] Import Outlook vCard
// [C104275] Import emClient vCard
// [C104294] Import Apple Contacts vCard
// [C104291] Import Thunderbird vCard
// [C104300] Import Outlook.com CSV
// [C104298] Import Google vCard
// [C104296] Import Yahoo vCard

  await I.haveSetting({ 'io.ox/contacts': { startInGlobalAddressbook: false } })
  I.login('app=io.ox/contacts')
  I.waitForApp()
  I.doubleClick('My address books')
  I.selectFolder('Contacts')

  I.say('basic_contact:csv')
  contacts.importCSV('basic_contact')
  contacts.selectListItem('Last Basic')

  I.see('Title', { css: 'dd' })
  I.see('Company', { css: 'dd' })
  I.see('Department', { css: 'dd' })
  I.see('Position', { css: 'dd' })
  I.see('im1', { css: 'dd' })
  I.see(`1/1/2016 (Age: ${moment().diff('2016-01-01', 'years')})`, { css: 'dd' })

  I.see('123 phone-home', { css: 'dd a' })
  I.see('123 cell', { css: 'dd a' })
  I.see('mail1@example.com', { css: 'dd a' })
  I.see('mail2@example.com', { css: 'dd a' })

  I.see('Street Home', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Town Home', { css: 'address' })
  I.see('State Home', { css: 'address' })
  I.see('Country Home', { css: 'address' })

  I.see('Comment\nwith\n\nsome\nlines!')

  contacts.deleteSelected()

  I.say('folder_with_two_contacts:csv')
  contacts.importCSV('folder_with_two_contacts')
  contacts.selectListItem('Contact')
  I.click('~More contact options')
  I.clickDropdown('Select all')

  contacts.deleteSelected()

  I.say('folder_with_dlist:csv')
  contacts.importCSV('folder_with_dlist')
  I.waitForElement(locate('.vgrid-cell .fullname').withText('My list').as('My list'))
  I.click(locate('.vgrid-cell .fullname').withText('My list').as('My list'))
  I.waitForElement(locate('.contact-detail h1.fullname').withText('My list').as('My list'))
  I.see('Distribution list with 2 entries')
  I.see('martin.heiland@open-xchange.com')
  I.see('markus.wagner@open-xchange.com')
  I.click('~More contact options')
  I.clickDropdown('Select all')

  contacts.deleteSelected()

  I.say('basic_contact:vcf')
  contacts.importVCF('basic_contact')
  contacts.selectListItem('Last Basic')

  I.see('Title', { css: 'dd' })
  I.see('Company', { css: 'dd' })
  I.see('Department', { css: 'dd' })
  I.see('Position', { css: 'dd' })
  I.see('im1', { css: 'dd' })
  I.see(`1/1/2016 (Age: ${moment().diff('2016-01-01', 'years')})`, { css: 'dd' })

  I.see('123 phone-home', { css: 'dd a' })
  I.see('123 cell', { css: 'dd a' })
  I.see('mail1@example.com', { css: 'dd a' })
  I.see('mail2@example.com', { css: 'dd a' })

  I.see('Street Home', { css: 'address' })
  I.see('12345', { css: 'address' })
  I.see('Town Home', { css: 'address' })
  I.see('State Home', { css: 'address' })
  I.see('Country Home', { css: 'address' })

  I.see('Comment\nwith\n\nsome\nlines!')

  contacts.deleteSelected()

  I.say('folder_with_two_contacts:vcf')
  contacts.importVCF('folder_with_two_contacts')
  contacts.selectListItem('Contact')
  I.click('~More contact options')
  I.clickDropdown('Select all')

  contacts.deleteSelected()

  I.say('folder_with_dlist:vcf')
  contacts.importVCF('folder_with_dlist')
  I.waitForElement(locate('.vgrid-cell .fullname').withText('My list').as('My list'))
  I.click(locate('.vgrid-cell .fullname').withText('My list').as('My list'))
  I.waitForElement(locate('.contact-detail h1.fullname').withText('My list').as('My list'))
  I.see('Distribution list with 2 entries')
  I.see('martin.heiland@open-xchange.com')
  I.see('markus.wagner@open-xchange.com')
  I.click('~More contact options')
  I.clickDropdown('Select all')

  contacts.deleteSelected()

  I.say('[C104277] Import Outlook vCard')
  contacts.importVCF('outlook_2013_en')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  await contacts.hasImage()
  I.see('Boss', { css: 'dd' })
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('+49 1111 111111', { css: 'dd a' })
  I.see('+49 2222 222222', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })

  contacts.deleteSelected()

  I.say('[C104275] Import emClient vCard')
  contacts.importVCF('emclient_7')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  await contacts.hasImage()
  I.see('Cheffe', { css: 'dd' }) // cSpell:disable-line
  I.see('Meine Notizen\n\nÜberall umbrüche', '.note') // cSpell:disable-line
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('+49 1111 111111', { css: 'dd a' })
  I.see('ox@example.com', { css: 'dd a' })
  I.see('Bei Der Arbeit 14\n1337 Berlin\nÄgypten', { css: 'address' })

  contacts.deleteSelected()

  I.say('[C104278] Import Outlook CSV')
  contacts.importCSV('outlook_2013_en')
  contacts.selectListItem('Wurst')
  I.see('Mr.', { css: 'dd' })
  I.see('12/14/2016', { css: 'dd' })
  I.see('Boss', { css: 'dd' })
  I.see('IT', { css: 'dd' })
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('Tester', { css: 'dd' })
  I.see('+49 1111 111111', { css: 'dd a' })
  I.see('+49 2222 222222', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  contacts.deleteSelected()

  contacts.importCSV('outlook_2013_de')
  contacts.selectListItem('Wurst')
  I.see('Mr.', { css: 'dd' })
  I.see('12/14/2016', { css: 'dd' })
  I.see('Boss', { css: 'dd' })
  I.see('IT', { css: 'dd' })
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('Tester', { css: 'dd' })
  I.see('+49 1111 111111', { css: 'dd a' })
  I.see('+49 2222 222222', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  contacts.deleteSelected()

  I.say('[C104294] Import Apple Contacts vCard')
  contacts.importVCF('macos_1011_contact')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  await contacts.hasImage()
  I.see('1/1/2016', { css: 'dd' })
  I.see('+49 111 11111', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  I.see('work@example.com', { css: 'dd a' })
  I.see('Home Street 23\nCity Home 12345\nCountry Home', { css: 'address' })
  I.see('Workstreet 43\nSomewhere 424242\nWorkcountry', { css: 'address' })
  I.see('Some notes\n\nwith linebreakös\n!!!', '.note') // cSpell:disable-line
  contacts.deleteSelected()

  contacts.importVCF('macos_1011_contacts')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  await contacts.hasImage()
  I.see('1/1/2016', { css: 'dd' })
  I.see('+49 111 11111', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  I.see('work@example.com', { css: 'dd a' })
  I.see('Home Street 23\nCity Home 12345\nCountry Home', { css: 'address' })
  I.see('Workstreet 43\nSomewhere 424242\nWorkcountry', { css: 'address' })
  I.see('Some notes\n\nwith linebreakös\n!!!', '.note') // cSpell:disable-line

  contacts.selectListItem('Person')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Person').as('Person'))
  I.see('+23 232323', { css: 'dd a' })
  I.click('~More contact options')
  I.clickDropdown('Select all')
  contacts.deleteSelected()

  I.say('[C104291] Import Thunderbird vCard')
  contacts.importVCF('thunderbird_45_contact')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Boss', { css: 'dd' })
  I.see('IT', { css: 'dd' })
  I.see('Orga', { css: 'dd' })
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+49 111 1111', { css: 'dd a' })
  I.see('+49 222 2222', { css: 'dd a' })
  contacts.deleteSelected()

  contacts.importVCF('thunderbird_45_contacts')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Boss', { css: 'dd' })
  I.see('IT', { css: 'dd' })
  I.see('Orga', { css: 'dd' })
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+49 111 1111', { css: 'dd a' })
  I.see('+49 222 2222', { css: 'dd a' })

  contacts.selectListItem('Some Guy', '.first_name')
  I.waitForElement(locate('.contact-detail h1 .first_name').withText('Some Guy').as('Some Guy'))

  contacts.selectListItem('foo@example.com', '.display_name')
  I.waitForElement(locate('.contact-detail h1 .display_name').withText('foo@example.com').as('foo@example.com'))

  contacts.selectListItem('bar@example.com', '.display_name')
  I.waitForElement(locate('.contact-detail h1 .display_name').withText('bar@example.com').as('bar@example.com'))
  I.click('~More contact options')
  I.clickDropdown('Select all')
  contacts.deleteSelected()

  I.say('[C104300] Import Outlook.com CSV')
  // cities are not imported properly therefore US fallback (mw bug 67638)
  contacts.importCSV('outlookcom_2016_contact')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes\n\nFor Hans', '.note')
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+11 111 1111', { css: 'dd a' })
  I.see('Business St. 23\n13370 Berlin', { css: 'address' })
  I.see('Homestreet 23\nHometown NRW 44135', { css: 'address' })
  contacts.deleteSelected()

  contacts.importCSV('outlookcom_2016_contacts')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes\n\nFor Hans', '.note')
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+11 111 1111', { css: 'dd a' })
  I.see('Business St. 23\n13370 Berlin', { css: 'address' })
  I.see('Homestreet 23\nHometown NRW 44135', { css: 'address' })

  contacts.selectListItem('Person')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Person').as('Person'))
  I.see('foo@bar.example.com', { css: 'dd a' })
  I.click('~More contact options')
  I.clickDropdown('Select all')
  contacts.deleteSelected()

  I.say('[C104298] Import Google vCard')
  contacts.importVCF('google_2016_contact')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes for\n\nHans Würst!', '.note') // cSpell:disable-line
  I.see('Boss', { css: 'dd' })
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('bar@example.com', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  I.see('Work 52, Workabily 23', { css: 'address' }) // cSpell:disable-line
  I.see('Homeaddress 23, 12345 Sometown', { css: 'address' })
  contacts.deleteSelected()

  contacts.importVCF('google_2016_contacts')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes for\n\nHans Würst!', '.note') // cSpell:disable-line
  I.see('Boss', { css: 'dd' })
  I.see('Open-Xchange GmbH', { css: 'dd' })
  I.see('bar@example.com', { css: 'dd a' })
  I.see('foo@example.com', { css: 'dd a' })
  I.see('Work 52, Workabily 23', { css: 'address' }) // cSpell:disable-line
  I.see('Homeaddress 23, 12345 Sometown', { css: 'address' })

  contacts.selectListItem('Other')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Other').as('Other'))
  I.see('some@body.example.com', { css: 'dd a' })
  I.click('~More contact options')
  I.clickDropdown('Select all')
  contacts.deleteSelected()

  I.say('[C104296] Import Yahoo vCard')
  contacts.importVCF('yahoo_2016_contact')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes\n\nfor this contäct!', '.note') // cSpell:disable-line
  I.see('Cheffe', { css: 'dd' }) // cSpell:disable-line
  I.see('Open-Xchange', { css: 'dd' })
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+49 111 1111', { css: 'dd a' })
  contacts.deleteSelected()

  contacts.importVCF('yahoo_2016_contacts')
  contacts.selectListItem('Wurst')
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Wurst').as('Wurst'))
  I.see('Some notes\n\nfor this contäct!', '.note') // cSpell:disable-line
  I.see('Cheffe', { css: 'dd' }) // cSpell:disable-line
  I.see('Open-Xchange', { css: 'dd' })
  I.see('hans@example.com', { css: 'dd a' })
  I.see('+49 111 1111', { css: 'dd a' })

  contacts.selectListItem('Karlo') // cSpell:disable-line
  I.waitForElement(locate('.contact-detail h1 .last_name').withText('Karlo').as('Karlo')) // cSpell:disable-line
  I.click('~More contact options')
  I.clickDropdown('Select all')
  contacts.deleteSelected()
})
