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

const SimpleLinkService = (function SimpleLinkServiceClosure () {
  function SimpleLinkService () {}

  SimpleLinkService.prototype = {

    /**
     * @returns {number}
     */
    get pagesCount () {
      return 0
    },

    /**
     * @param  dest The PDF destination object.
     */
    navigateTo (/* dest */) {
    },

    /**
     * @param            dest The PDF destination object.
     * @returns {string}      The hyperlink to the PDF object.
     */
    getDestinationHash (/* dest */) {
      return '#'
    },

    /**
     * @param            hash The PDF parameters/hash.
     * @returns {string}      The hyperlink to the PDF object.
     */
    getAnchorUrl (/* hash */) {
      return '#'
    },

    /**
     * @param {string} hash
     */
    setHash (/* hash */) {
    },

    /**
     * @param {string} action
     */
    executeNamedAction (/* action */) {
    },

    /**
     * @param {number} pageNum page number.
     * @param {object} pageRef reference to the page.
     */
    cachePageRef (/* pageNum, pageRef */) {
    }
  }
  return SimpleLinkService
})()

export default SimpleLinkService
