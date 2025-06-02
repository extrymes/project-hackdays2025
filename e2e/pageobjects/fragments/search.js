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

const { I } = inject()

module.exports = {

  searchField: locate('#io-ox-topsearch .search-field').as('Search field'),
  dropdownToggle: locate('#io-ox-topsearch .dropdown-toggle').as('Toggle'),
  dropdown: locate('#io-ox-topsearch .dropdown').as('Dropdown'),
  submitButton: locate('#io-ox-topsearch .dropdown [type="submit"]').as('Submit Button'),

  openDropdown () {
    I.waitForVisible(this.dropdownToggle)
    I.click(this.dropdownToggle)
    I.waitForVisible(this.dropdown)
  },

  // introducing methods
  doSearch (query) {
    I.waitForElement('#io-ox-topsearch .search-field')
    I.waitForVisible('#io-ox-topsearch .search-field')
    I.fillField('#io-ox-topsearch .search-field', query)
    I.fillField('#io-ox-topsearch .search-field', query)
    I.pressKey('Enter')
    I.waitForText('Search results')
    I.waitToHide('.list-view .busy-indicator.io-ox-busy')
  },

  cancel () {
    I.click(this.searchField)
    I.clearField(this.searchField)
    I.pressKey('Enter')
    I.waitForInvisible('Search results')
    I.wait(0.5)
  }
}
