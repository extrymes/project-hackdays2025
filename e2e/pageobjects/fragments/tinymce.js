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
  async attachInlineImage (path) {
    const inputId = 'temp_input_for_tinymce'
    await I.executeAsyncScript(async function (id, done) {
      const el = document.createElement('input')
      el.setAttribute('type', 'file')
      el.setAttribute('id', id)
      document.getElementsByTagName('body')[0].appendChild(el)
      el.onchange = async function () {
        // @ts-ignore
        window.tinyMCE.editors[0].plugins.oximage.uploadBlob(el.files[0])
        el.remove()
      }
      done()
    }, inputId)
    // not sure why, but it takes a little to be able to attach files here.
    I.wait(0.5)
    I.attachFile(`#${inputId}`, path)
  }
}
