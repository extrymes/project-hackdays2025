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

  main: locate('.modal:not(.hidden):not(.modal-paused) .modal-dialog').as('Modal Main'),
  header: locate('.modal:not(.hidden):not(.modal-paused) .modal-header').as('Modal Header'),
  body: locate('.modal:not(.hidden):not(.modal-paused) .modal-body').as('Modal Body'),
  footer: locate('.modal:not(.hidden):not(.modal-paused) .modal-footer').as('Modal Footer'),

  clickButton (label) {
    const buttonLocator = locate('.modal:not(.hidden):not(.modal-paused) .modal-footer button').withText(label).as(label)
    // wait for button to be clickable
    I.waitForVisible(buttonLocator)
    I.waitForEnabled(buttonLocator, 10)
    I.click(label, this.footer)
  },

  waitForVisible () {
    // wait for modal dialog to be visible and ready
    I.waitForVisible(this.main)
    I.waitForInvisible(locate('.modal:not(.hidden):not(.modal-paused)').find('.io-ox-busy').as('Modal Busy'), 30)
  }
}
