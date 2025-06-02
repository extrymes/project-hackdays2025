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

const { I, dialogs } = inject()

module.exports = {

  openSecondary () {
    I.waitForText('New', 5, '.primary-action')
    I.click('.primary-action > .dropdown > button')
    I.waitForElement('.dropdown.open .dropdown-menu')
  },
  clickSecondary (name) {
    this.openSecondary()
    I.waitForClickable(locate('.dropdown.open .dropdown-menu a').withText(name).as(name), 5)
    I.click(name, '.dropdown.open .dropdown-menu')
  },
  selectFile (title, { timeout = undefined } = {}) {
    I.waitForElement(`.filename[title="${title}"]`, timeout)
    I.click(`.filename[title="${title}"]`)
  },
  shareFolder (name, role) {
    I.clickToolbar('~Share')
    dialogs.waitForVisible()
    I.waitForText('Share folder')

    if (role !== 'Viewer') {
      I.waitForVisible('.permission-pre-selection .btn')
      I.click('.permission-pre-selection .btn')
      I.clickDropdown(role)
    }

    I.waitForText(role, 5, '.permission-pre-selection')
    I.click('~Select contacts')

    // dialog is open
    dialogs.waitForVisible()
    I.waitForElement('.modal-body .list-view.address-picker li.list-item') // check if list items are loaded
    I.fillField('Search', name)
    I.waitForText(name, 5, '.modal-dialog .address-picker')
    I.waitForElement('.address-picker .list-item')
    I.click('.address-picker .list-item')
    dialogs.clickButton('Select')

    I.waitForText('Share folder', 5, dialogs.header)
    I.waitForText('ADDED', 5, '.permissions-view .permission.row:first-child .added')
    I.see('Owner', '.permissions-view .permission.row:last-child')
    I.see(role, '.permissions-view .permission.row:first-child')
    I.see('Internal user (' + name + ')', '.permissions-view .permission.row:first-child .description')
    dialogs.clickButton('Share')
    I.waitForDetached('.modal-dialog')
  },
  moveManuallyTo (destination) {
    I.clickToolbar('~More actions')
    I.clickDropdown('Move')

    I.waitForElement('.folder-picker-dialog')
    I.waitForElement(`.folder-picker-dialog [data-id="${destination}"]`)
    I.click(`.folder-picker-dialog [data-id="${destination}"]`)
    I.waitForElement(`.folder-picker-dialog [data-id="${destination}"].selected`)
    I.click('Move', '.folder-picker-dialog')
    I.waitForDetached('.folder-picker-dialog')
  },
  seeListViewIcon (itemName, icon, title) {
    I.seeElement(`.list-item .filename[title="${itemName}"] ~ .icons span[title="${title}"] .${icon}`)
  },
  seeNumberOfListViewIcons (itemName, count) {
    I.seeNumberOfElements(`.list-item .filename[title="${itemName}"] ~ .icons span`, count)
  },
  seeInternalUserInShareSection (userName, email) {
    I.waitForText(`${userName}\n${email}`, 5, '.viewer-shares-info')
  },
  seeGuestInShareSection (email) {
    I.waitForText(`${email}\nGuest`, 5, '.viewer-shares-info')
  },
  seePublicLinkInShareSection () {
    I.waitForText('Public link', 5, '.viewer-shares-info')
  }
}
