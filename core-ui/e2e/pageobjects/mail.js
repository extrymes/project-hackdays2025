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

  selectMail (text, selector) {
    const titleSelector = locate(`.list-view .subject span[title*="${text}"]`).as('Mail title')
    const senderSelector = locate('.list-view .person').withText(text).as('Mail sender')
    const item = selector === 'Sender' ? senderSelector : titleSelector
    I.waitForElement(item, 60)
    I.wait(0.5)
    I.click(item)
    I.waitForFocus('.list-view li.list-item.selected')
  },
  selectMailByIndex (index) {
    const item = locate('.list-view li.list-item').withAttr({ 'data-index': index.toString() }).as('Mail item')
    I.waitForElement(item)
    I.wait(0.5)
    I.click(item)
    I.waitForFocus('.list-view li.list-item.selected')
  },
  newMail () {
    I.clickPrimary('New email')
    I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
    I.waitForFocus('.active .io-ox-mail-compose [placeholder="To"]')
    I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)
  },
  addAttachment (path) {
    I.click('~Attachments')
    const ext = path.match(/\.(.{3,4})$/)[1]
    I.attachFile({ css: 'input[type=file]' }, path)
    I.waitForText(ext.toUpperCase(), 5, '.attachment-list.preview')
    I.pressKey('Escape')
  },
  send () {
    I.waitForClickable('.btn[data-action="send"]')
    I.click('Send')
    I.wait(0.5)
    I.waitToHide('.io-ox-mail-compose-window')
    I.waitToHide('.mail-send-progress', 45)
  }
}
