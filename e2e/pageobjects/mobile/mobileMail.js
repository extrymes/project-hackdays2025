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
  newMail () {
    I.waitForVisible('[data-action="io.ox/mail/actions/compose"]')
    I.wait(0.5)
    I.click('[data-action="io.ox/mail/actions/compose"]')
    I.waitForVisible('.io-ox-mail-compose [placeholder="To"]', 30)
    I.waitForInvisible('.io-ox-mail-compose-window .window-blocker', 30)
    I.waitForElement('.io-ox-mail-compose-window.complete')
    I.waitForFocus('.token-input.tt-input[placeholder="To"]')
  },

  send () {
    I.waitForClickable('.btn[data-action="send"]')
    I.wait(0.5)
    I.click('Send')
    I.waitForDetached('.io-ox-mail-compose-window')
    I.waitToHide('.mail-send-progress', 45)
  },

  selectMail (text, selector) {
    const titleSelector = locate(`.list-view .subject span[title*="${text}"]`).as('Mail title')
    const senderSelector = locate('.list-view .person').withText(text).as('Mail sender')
    const item = selector === 'Sender' ? senderSelector : titleSelector
    I.waitForElement(item, 60)
    I.wait(0.5)
    I.click(item)
    I.waitForVisible('.mail-detail-pane')
    I.waitForInvisible('.mail-detail-pane .mail-detail .io-ox-busy')
  }

}
