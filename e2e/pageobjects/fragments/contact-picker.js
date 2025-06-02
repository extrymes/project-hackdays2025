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

  results: locate('.addressbook-popup').find('.list-item').as('Results'),

  ready () {
    I.waitForVisible('.addressbook-popup', 5)
  },

  add (name) {
    this.ready()
    this.search(name)
    this.selectFirst()
  },

  search (query) {
    I.waitForFocus('.addressbook-popup .search-field')
    I.fillField('.addressbook-popup .search-field', query)
    I.waitForVisible(this.results)
  },

  selectFirst () {
    I.waitForEnabled(this.results)
    I.waitForEnabled(this.results.first().as('First list item'))
    I.click(this.results.first().as('First list item'))
    I.waitForVisible(locate('.list-item.selected').as('Selected list item'))
  },

  close () {
    I.click('Select')
    I.waitToHide('.addressbook-popup')
  }
}
