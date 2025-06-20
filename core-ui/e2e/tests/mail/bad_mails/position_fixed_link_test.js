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

Feature('Mail > Detail')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C101618] Link with position: fixed; should not cover the whole UI', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//allowHtmlImages', true),
    I.haveMail({
      path: 'media/mails/c101618.eml'
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('Link with position: fixed; should not cover the whole UI')

  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForElement('.mail-detail-content a')
    // click-jacking-element overlaps this one
    I.see('Click will be highjacked')
    // I.click('Click will be highjacked');
  })

  // we use a workaround here by trying to click an element outside of mail-detail-content
  // in case the click-jacking-element would receive the click an error would be thrown:
  // 'Other element would receive the click...'
  I.seeElement('.mail-header-actions')
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Reply')
})
