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

const expect = require('chai').expect

Feature('Portal')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('add and remove Inbox widget', async ({ I, dialogs }) => {
  I.login('app=io.ox/portal')
  I.waitForApp()
  I.waitForNetworkTraffic()

  const oldWidgetId = await I.grabAttributeFrom('.io-ox-portal-window .widgets li:first-child', 'data-widget-id')
  I.click('Add widget')
  I.waitForVisible('.io-ox-portal-settings-dropdown')
  I.click('Inbox', '.io-ox-portal-settings-dropdown')
  dialogs.waitForVisible()
  dialogs.clickButton('Save')
  I.waitForElement('~Inbox')
  const widgetId = await I.grabAttributeFrom('.io-ox-portal-window .widgets li:first-child', 'data-widget-id')

  expect(oldWidgetId).not.equal(widgetId)
  const title = await I.grabTextFrom(`.io-ox-portal-window .widgets li[data-widget-id="${widgetId}"] .title`)
  expect(title).to.contain('Inbox')
  I.click(`.io-ox-portal-window .widgets li[data-widget-id="${widgetId}"] .disable-widget`)

  dialogs.waitForVisible()
  dialogs.clickButton('Delete')
  I.waitForDetached('.modal-dialog')

  I.waitForDetached(`.io-ox-portal-window .widgets li[data-widget-id="${widgetId}"]`)
})
