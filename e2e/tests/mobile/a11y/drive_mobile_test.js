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

Feature('Mobile > Accessibility > Drive')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('List view w/o files @mobile', async ({ I }) => {
  I.login('app=io.ox/files')
  I.waitForElement('.file-list-view.complete')
  expect(await I.grabAxeReport({ rules: { 'meta-viewport': { enabled: false } } })).to.be.accessible // [CRITICAL] Zooming and scaling must not be disabled
})
