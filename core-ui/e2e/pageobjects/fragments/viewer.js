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

  async scrollTo (x = null, y = null) {
    await I.executeScript((x, y) => {
      document.querySelector('.swiper-slide-document').scrollTo(x, y)
    }, x, y)
  },

  async grabTextAtPoint (x = null, y = null) {
    return await I.executeScript((x, y) => {
      return document.elementFromPoint(x, y).textContent
    }, x, y)
  },

  async grabScrollPosition () {
    return await I.executeScript(() => { return document.querySelector('.swiper-slide-document').scrollTop })
  },

  async clickAtPosition (x = null, y = null) {
    return await I.executeScript((x, y) => {
      return document.elementFromPoint(x, y).click()
    }, x, y)
  },

  /**
 * Set a browser selection.
 * @param {string} startText - The 'innerText' of the node that starts the selection.
 * @param {string} endText - The 'innerText' of the node that ends the selection.
 * @param {string} wrapperClass - The selection is searched inside the wrapper. Provide a class name ('.className') for it.
 * *
 * Using the recommended workaround by pupeteer(v20.30) to select text.
 * "dragging and selecting text is not possible using page.mouse"
 * https://pptr.dev/api/puppeteer.mouse#example-1
 */
  async setBrowserSelection (startText, endText, wrapperClass) {
    await I.executeScript((startText, endText, wrapperClass) => {
      const selection = window.getSelection()
      const range = document.createRange()
      range.setStartBefore([...document.querySelectorAll(`${wrapperClass} *`)].filter(node => node.innerText.includes(startText))[0])
      range.setEndAfter([...document.querySelectorAll(`${wrapperClass} *`)].filter(node => node.innerText.includes(endText))[0])
      selection.removeAllRanges()
      selection.addRange(range)
    }, startText, endText, wrapperClass)
  }
}
