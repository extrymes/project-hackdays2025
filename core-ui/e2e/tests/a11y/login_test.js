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

const { expect } = require('chai')

Feature('Accessibility')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// Exceptions:
// Login form does not have a visible label
const context = {
  exclude: [['#io-ox-login-username'], ['#io-ox-login-password']]
}

Scenario('Login page (with exceptions)', async ({ I }) => {
  I.amOnPage('')
  I.waitForInvisible('#background-loader')

  expect(await I.grabAxeReport(context)).to.be.accessible
})
