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

const { I, dialogs } = inject()

module.exports = {

  selectContact (text) {
    I.waitForElement(`.vgrid [aria-label="${text}"]`)
    I.click(`.vgrid [aria-label="${text}"]`)
    I.waitForElement('.contact-header')
    I.waitForText(text, 5, '.contact-header .fullname')
  },

  selectListItem (text, selector = '.last_name') {
    I.waitForElement(locate(`.vgrid-cell ${selector}`).withText(text).as(text))
    I.click(locate(`.vgrid-cell ${selector}`).withText(text).as(text))
    I.waitForElement(locate(`.contact-detail h1 ${selector}`).withText(text).as(text))
  },

  newAddressbook (name) {
    I.click('button.contextmenu-control', '~My address books')
    I.clickDropdown('Add new address book')
    dialogs.waitForVisible()
    I.fillField('[placeholder="New address book"][type="text"]', name)
    dialogs.clickButton('Add')
    I.waitForDetached('.modal-dialog')
  },

  newContact () {
    I.waitForDetached('.dropdown-toggle.disabled')
    I.clickPrimary('New contact')
    I.waitForText('Add personal info')
  },

  newDistributionlist () {
    I.waitForDetached('.dropdown-toggle.disabled')
    I.clickPrimaryDropdown('New contact')
    I.click('New distribution list', '.primary-action .btn-group > .dropdown-menu')
    I.waitForText('Participants')
  },

  addField (fieldType, field) {
    I.click(`.dropdown[data-add="${fieldType}"] button`, '.contact-edit')
    I.waitForVisible('.dropdown.open .dropdown-menu')
    I.click(field)
    I.waitForText(field, 30, '.contact-edit')
  },

  editMyAccount () {
    I.waitForVisible('.dropdown-toggle[aria-label="My account"]')
    I.waitForVisible('.contact-picture')
    I.click('.contact-picture')
    I.waitForText('Edit personal data', 30, '.dropdown.open .dropdown-menu')
    I.click('Edit personal data', '.dropdown.open .dropdown-menu')
    I.waitForVisible('.io-ox-contacts-edit-window')
  },

  deleteSelected () {
    I.clickToolbar('~Delete contact')
    dialogs.waitForVisible()
    dialogs.clickButton('Delete')
    I.waitForDetached('.modal-dialog')
  },

  async hasImage () {
    const rule = await I.grabCssPropertyFrom('.contact-header .contact-photo', 'backgroundImage')
    expect(rule).not.to.match(/fallback/)
    expect(rule).to.match(/^url\(/)
  },

  importCSV (file, path = 'media/imports/contacts', folder = 'Contacts') {
    I.rightClick(`~${folder}`)
    I.clickDropdown('Import')
    dialogs.waitForVisible()
    I.selectOption('Format', 'CSV')
    I.attachFile('.file-input', `${path}/${file}.csv`)
    dialogs.clickButton('Import')
    I.waitForDetached('.modal-dialog')
    I.waitForText('Data imported successfully')
  },

  importVCF (file, path = 'media/imports/contacts', folder = 'Contacts') {
    I.rightClick(`~${folder}`)
    I.clickDropdown('Import')
    dialogs.waitForVisible()
    I.selectOption('Format', 'VCARD')
    I.attachFile('.file-input', `${path}/${file}.vcf`)
    dialogs.clickButton('Import')
    I.waitForDetached('.modal-dialog')
    I.waitForText('Data imported successfully')
  },

  async exportCSV (file) {
    I.clickToolbar('~More actions')
    I.clickDropdown('Export')
    dialogs.waitForVisible()
    I.checkOption('CSV')
    dialogs.clickButton('Export')
    I.waitForDetached('.modal-dialog')
    I.amInPath('/output/downloads/')
    await I.waitForFile(`${file}.csv`, 5)
  },
  async exportVCF (file) {
    I.clickToolbar('~More actions')
    I.clickDropdown('Export')
    dialogs.waitForVisible()
    I.checkOption('vCard')
    dialogs.clickButton('Export')
    I.waitForDetached('.modal-dialog')
    I.amInPath('/output/downloads/')
    await I.waitForFile(`${file}.vcf`, 5)
  },
  async exportAddressBookCSV (file) {
    I.rightClick('~Contacts')
    I.clickDropdown('Export')
    dialogs.waitForVisible()
    I.checkOption('CSV')
    dialogs.clickButton('Export')
    I.waitForDetached('.modal-dialog')
    I.amInPath('/output/downloads/')
    await I.waitForFile(`${file}.csv`, 5)
  },
  async exportAddressBookVCF (file) {
    I.rightClick('~Contacts')
    I.clickDropdown('Export')
    dialogs.waitForVisible()
    I.checkOption('vCard')
    dialogs.clickButton('Export')
    I.waitForDetached('.modal-dialog')
    I.amInPath('/output/downloads/')
    await I.waitForFile(`${file}.vcf`, 5)
  }
}
