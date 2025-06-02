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

Feature('Settings > Basic')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[OXUIB-1808] Disable Settings Pane', async ({ I, mail, settings }) => {
  I.login('app=io.ox/mail&settings=virtual/settings/personaldata')
  I.waitForApp()

  I.waitForText('Download your personal data')

  settings.close()
  I.logout()

  I.login(['app=io.ox/mail'])
  I.waitForApp()
  await I.executeScript(async function () {
    const { settings: coreSettings } = await import(String(new URL('io.ox/core/settings.js', location.href)))
    return coreSettings.set('disabledSettingsPanes', 'personaldata')
  })

  settings.open()

  I.dontSee('Download personal data')
})
