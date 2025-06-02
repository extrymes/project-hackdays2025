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

Scenario('[C7778] Forwarding mail as .eml inline/attachment', async ({ I, users, mail, settings }) => {
  await I.haveMail({ path: 'tests/settings/mail/test.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Richtig gutes Zeug')
  I.waitForVisible('.detail-view-header .subject')
  I.click('~Forward')
  I.waitForText('Fwd: Richtig gutes Zeug')
  I.waitForElement('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.waitForText('---------- Original Message ----------')
  })
  I.waitForText('Saving', 5)
  I.waitToHide('Saving', 5)
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  settings.open('Mail', 'Advanced settings')
  I.waitForText('Forward emails as')
  I.click('Attachment', '.modal')
  await I.waitForSetting({ 'io.ox/mail': { forwardMessageAs: 'Attachment' } }, 30)
  settings.close()

  mail.selectMail('Richtig gutes Zeug')
  I.waitForVisible('.detail-view-header .subject')
  I.click('~Forward')
  I.waitForText('Fwd: Richtig gutes Zeug')
  I.waitForFocus('[placeholder="To"]')
  I.fillField('To', users[0].get('primaryEmail'))
  mail.send()
  I.triggerRefresh()
  mail.selectMail('Fwd: Richtig gutes Zeug')
  I.click('1 attachment')
  I.waitForText('Richtig_gutes_Zeug', 5, '.attachments.mail-attachment-list')
})
