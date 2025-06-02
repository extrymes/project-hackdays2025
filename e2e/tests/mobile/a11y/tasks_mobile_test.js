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
const moment = require('moment')

Feature('Mobile > Accessibility > Tasks')

Before(async ({ I, users }) => {
  await users.create()
  I.emulateDevice()
})

After(async ({ users }) => { await users.removeAll() })

Scenario('List view w/o tasks @mobile', async ({ I }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('This task list is empty', 30)

  expect(await I.grabAxeReport({ rules: { 'meta-viewport': { enabled: false } } })).to.be.accessible // [CRITICAL] Zooming and scaling must not be disabled
})

Scenario('List view with task @mobile', async ({ I }) => {
  await I.haveTask({
    title: 'Mobile Task',
    folder_id: await I.grabDefaultFolder('tasks'),
    note: 'Open items via portal-tile',
    full_time: true,
    notification: true,
    private_flag: false,
    timezone: 'Europe/Berlin',
    start_time: moment().valueOf(),
    end_time: moment().add(2, 'days').valueOf(),
    days: 2
  })

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForText('Mobile Task')
  expect(await I.grabAxeReport({ rules: { 'meta-viewport': { enabled: false } } })).to.be.accessible // [CRITICAL] Zooming and scaling must not be disabled
})

Scenario('Create task modal @mobile', async ({ I }) => {
  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.wait(0.5) // prevent clicking a detached element caused by the bottom toolbar being re-rendered multiple times
  I.waitForElement('~New task')
  I.click('[data-action="io.ox/tasks/actions/create"]')
  I.waitForText('Expand form', 5)
  I.click('Expand form')
  expect(await I.grabAxeReport({ rules: { 'meta-viewport': { enabled: false } } })).to.be.accessible // [CRITICAL] Zooming and scaling must not be disabled
})
