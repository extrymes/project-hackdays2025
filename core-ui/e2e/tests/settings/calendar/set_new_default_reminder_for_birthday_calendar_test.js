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

Feature('Settings > Calendar')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C244800] Set new default reminder for appointments in birthday calendar', async ({ I, dialogs, settings }) => {
  const alaramNotification = 'Notification'
  const alaramTime = '45 minutes'
  const alaramRelated = 'before start'

  I.login('app=io.ox/calendar&section=io.ox/calendar/settings/reminders&settings=virtual/settings/io.ox/calendar')
  I.waitForApp()
  // Default reminder
  I.waitForElement('.alarms-link-view .btn-link')
  I.click(
    locate('.form-group')
      .withChild(locate('label').withText('Default reminder for birthdays'))
      .find('button')
  )

  dialogs.waitForVisible()
  I.waitForText('Edit reminders')
  I.click('Add reminder', dialogs.body)
  I.selectOption('.alarm-action', alaramNotification)
  I.selectOption('.alarm-time', alaramTime)
  I.selectOption('.alarm-related', alaramRelated)
  dialogs.clickButton('Apply')
  I.waitForDetached('.alarms-view-dialog')
  I.waitForText('Notify 45 minutes before start')
  await I.waitForSetting({
    'io.ox/calendar': {
      birthdays: { defaultAlarmDate: [{ action: 'DISPLAY', trigger: { duration: '-PT45M', related: 'START' }, description: 'reminder' }] }
    }
  })
  settings.close()
  I.waitForDetached('.settings-detail-pane')
  I.waitForNetworkTraffic()

  I.waitForApp()

  // Check whether Notify 45 minutes before start is shown on appointment creation window
  I.waitForElement('~Actions for Birthdays')
  I.rightClick('~Birthdays')
  I.clickDropdown('Change reminders')
  I.waitForText('Notify 45 minutes before start.')
})
