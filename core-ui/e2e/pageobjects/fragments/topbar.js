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

  // new connect your device wizard, see OXUI-793
  connectDeviceWizard () {
    I.waitForElement('#io-ox-topbar-settings-dropdown-icon button', 30)
    I.wait(1)
    I.click('#io-ox-topbar-settings-dropdown-icon button')
    I.waitForVisible(locate('a').withText('Connect your device').inside('.dropdown.open').as('Connect your device'))
    I.click(locate('a').withText('Connect your device').inside('.dropdown.open').as('Connect your device'))
    I.waitForVisible('.wizard-step')
  },

  help () {
    I.waitForElement('#io-ox-topbar-help-dropdown-icon')
    I.click('#io-ox-topbar-help-dropdown-icon .dropdown-toggle')
    I.waitForElement('#topbar-help-dropdown .io-ox-context-help')
    I.click('#topbar-help-dropdown .io-ox-context-help')
    I.waitForElement('.io-ox-help-window')
    I.waitForVisible('.inline-help-iframe', 10)
  }
}
