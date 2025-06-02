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

/// <reference path="../../steps.d.ts" />

Feature('Mail > SaveAsPDF')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Check feature toggle', async function ({ I, users }) {
  await Promise.all([
    users[0].doesntHaveCapability('mail_export_pdf'),
    I.haveMail({
      from: users[0],
      to: users[0],
      attachments: [{ content: '<p>PDFTestMail</p>', content_type: 'text/html', disp: 'inline' }],
      subject: 'PDFTestMail'
    })
  ])

  await I.waitForCapability('mail_export_pdf', 30, { shouldBe: false })

  I.login()
  I.waitForApp()
  I.click('.list-view .selectable:not(.selected)')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.dontSee('Save as PDF')

  I.pressKey('Escape')
  I.waitForInvisible('.dropdown.open')

  I.click('~More actions', '.mail-detail-pane .classic-toolbar')
  I.waitForElement('.dropdown.open')
  I.dontSee('Save as PDF')
  I.pressKey('Escape')

  I.logout()
  // Break promise chain
  await I.executeScript('')
  await users[0].hasCapability('mail_export_pdf')
  await I.waitForCapability('mail_export_pdf')

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.click('.list-view .selectable')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.waitForText('Save as PDF')

  I.pressKey('Escape')
  I.waitForInvisible('.dropdown.open')

  I.click('~More actions', '.mail-detail-pane .classic-toolbar')
  I.waitForElement('.dropdown.open')
  I.waitForText('Save as PDF')
})

Scenario('Check dialog', async function ({ I, users }) {
  await Promise.all([
    I.haveMail({
      from: users[0],
      to: users[0],
      attachments: [{ content: '<p>PDFTestMail</p>', content_type: 'text/html', disp: 'inline' }],
      subject: 'PDFTestMail'
    }),
    users[0].hasCapability('mail_export_pdf')
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.click('.list-view .selectable:not(.selected)')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.waitForVisible('.detail-view-header')
  I.waitForVisible('~More actions', 5)
  I.click('~More actions', '.detail-view-header')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/save-as-pdf"]')

  I.waitForElement('.folder-picker-dialog')
  // We cannot check the actual pdf creation because this might be a long running job. We cannot wait for this in an e2e test.

  I.pressKey('Escape')
  I.waitForInvisible('.dropdown.open')

  I.click('~More actions', '.mail-detail-pane .classic-toolbar')
  I.waitForElement('.dropdown.open')
  I.click('.dropdown.open .dropdown-menu [data-action="io.ox/mail/actions/save-as-pdf"]')
  I.waitForElement('.folder-picker-dialog')
  // We cannot check the actual pdf creation because this might be a long running job. We cannot wait for this in an e2e test.
})
