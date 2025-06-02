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

Feature('Settings > Mail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7775] Append vCard when sending mail', async ({ I, users, mail, settings }) => {
  const user = users[0]
  const vcard = 'Always attach my detailed contact data as vCard'

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText(vcard)
  I.click(vcard)
  await settings.close()

  I.openApp('Mail')
  I.waitForApp()
  mail.newMail()
  I.fillField('To', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Richtig gutes Zeug')
  mail.send()
  I.waitForDetached('.io-ox-mail-compose-window')

  I.waitForText('Richtig gutes Zeug', 10, '.list-item.selectable')
  I.click('Richtig gutes Zeug', '.list-item.selectable')
  // wait for everything being loaded
  I.waitForNetworkTraffic()

  I.waitForText('1 attachment')
  I.click('Add to address book')
  I.waitForVisible('.io-ox-contacts-edit-window')
  I.waitForText('Save')
  I.click('Save')
  I.waitForDetached('.io-ox-contacts-edit-window')
  I.logout()

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/advanced')
  I.waitForApp()
  I.waitForText(vcard)
  I.click(vcard)
  await settings.close()

  I.openApp('Mail')
  I.waitForApp()
  mail.newMail()
  I.fillField('To', user.get('primaryEmail'))
  I.fillField('.io-ox-mail-compose [name="subject"]', 'Katalog von Pearl')
  mail.send()
  I.waitForDetached('.io-ox-mail-compose-window')

  I.waitForVisible('~Refresh')
  I.triggerRefresh()
  I.waitForText('Katalog von Pearl', 10, '.list-item.selectable')
  I.click('Katalog von Pearl', '.list-item.selectable')
  // wait for everything being loaded
  I.waitForNetworkTraffic()
  I.dontSee('1 attachment')
})
