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

Feature('Mailfilter')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7799] Filter mail on mailing list', async ({ I, users, mailfilter, settings }) => {
  await I.haveMail({ path: 'media/mails/c7799.eml' })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForText('Add new rule')
  mailfilter.newRule('TestCase0383')
  mailfilter.addCondition('Mailing list', 'open-xchange')
  mailfilter.setFlag('Red')

  // save the form
  I.click('Save and apply rule now')

  I.waitForText('Please select the folder to apply the rule to')
  I.waitForVisible('li.selected[data-id="default0/INBOX"]')
  I.click('Apply filter rule')

  I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]')

  settings.close()

  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)
  I.waitForElement('.vsplit .flag_1', 30)
})
