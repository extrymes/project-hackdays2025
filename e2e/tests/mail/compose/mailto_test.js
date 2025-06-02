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

Feature('Mail > Mailto Links')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Open mailto link', async ({ I }) => {
  I.login('app=io.ox/mail&mailto=alice@open-xchange.com')
  I.waitForApp()
  I.waitForElement('.token-label[title="alice@open-xchange.com"]')
})

Scenario('Open mailto link with addresses separated by comma', async ({ I }) => {
  I.login('app=io.ox/mail&mailto=alice@open-xchange.com,bob@open-xchange.com,tina@open-xchange.com')
  I.waitForApp()
  I.waitForElement('.token-label[title="alice@open-xchange.com"]')
  I.waitForElement('.token-label[title="bob@open-xchange.com"]')
  I.waitForElement('.token-label[title="tina@open-xchange.com"]')
})

Scenario('Open mailto link with addresses separated by semicolon', async ({ I }) => {
  I.login('app=io.ox/mail&mailto=alice@open-xchange.com;bob@open-xchange.com;tina@open-xchange.com;')
  I.waitForApp()
  I.waitForElement('.token-label[title="alice@open-xchange.com"]')
  I.waitForElement('.token-label[title="bob@open-xchange.com"]')
  I.waitForElement('.token-label[title="tina@open-xchange.com"]')
})
