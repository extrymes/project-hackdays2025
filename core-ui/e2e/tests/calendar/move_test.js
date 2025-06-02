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

const moment = require('moment')

Feature('Calendar > Actions')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Move appointment to different folder', async ({ I, dialogs, calendar }) => {
  const folder = `cal://0/${await I.grabDefaultFolder('calendar')}`
  await Promise.all([
    I.haveSetting({
      'io.ox/calendar': { showCheckboxes: true, layout: 'week:week' }
    }),
    I.haveAppointment({
      summary: 'test event',
      startDate: { value: moment().startOf('day').add(10, 'hours') },
      endDate: { value: moment().startOf('day').add(11, 'hours') },
      attendees: []
    }),
    I.haveFolder({ title: 'New calendar', module: 'event', parent: folder })
  ])

  const defaultFolderNode = locate(`.folder[data-id="${folder}"]`).as('Default folder')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible(defaultFolderNode)

  // Open Detail popup
  I.waitForVisible('.weekview-container.week .appointment')
  I.click('.weekview-container.week .appointment')
  I.waitForVisible('.detail-popup .inline-toolbar .more-dropdown')

  // Move Action
  I.click('.detail-popup .inline-toolbar .more-dropdown')
  I.waitForElement('.smart-dropdown-container.dropdown.open')
  I.click('Move', '.smart-dropdown-container.dropdown.open')

  // Move to new folder
  dialogs.waitForVisible()
  I.waitForElement('.modal-dialog [data-id="virtual/flat/event/private"] .folder-arrow')
  I.click('.modal-dialog [data-id="virtual/flat/event/private"] .folder-arrow')
  I.waitForText('New calendar', 5, '.modal-dialog')
  I.click('~New calendar', '.modal-dialog')
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  // Deselect default folder
  I.click(defaultFolderNode.find('.color-label.selected').as('Selected checkbox'))
  I.waitForElement(defaultFolderNode.find('.color-label:not(.selected)').as('Deselected checkbox'))

  // Check
  I.waitForApp()
  I.waitForVisible('.weekview-container.week .appointment')
  I.waitForElement('.weekview-container.week .appointment')
  I.waitForElement('[aria-label^="New calendar"][aria-checked="true"]')
})

Scenario('Moving appointment updates sidepopup', async ({ I, dialogs, calendar, users }) => {
  const folder = `cal://0/${await I.grabDefaultFolder('calendar')}`
  const defaultFolderName = `${users[0].get('sur_name')}, ${users[0].get('given_name')}`
  await Promise.all([
    I.haveSetting({
      'io.ox/calendar': { showCheckboxes: true, layout: 'week:week' }
    }),
    I.haveAppointment({
      summary: 'test event',
      startDate: { value: moment().startOf('day').add(10, 'hours') },
      endDate: { value: moment().startOf('day').add(11, 'hours') },
      attendees: []
    }),
    I.haveFolder({ title: 'New calendar', module: 'event', parent: folder })
  ])

  const defaultFolderNode = locate(`.folder[data-id="${folder}"]`).as('Default folder')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  I.waitForVisible(defaultFolderNode)

  I.say('Open Sideboard')
  I.waitForVisible('.weekview-container.week .appointment')
  I.click('.weekview-container.week .appointment')
  I.waitForVisible('.detail-popup-appointment .inline-toolbar .more-dropdown')

  // check original details
  I.waitForText(defaultFolderName, 5, '.details-table')

  I.say('Move Action')
  I.click('.detail-popup-appointment .inline-toolbar .more-dropdown')
  I.waitForElement('.smart-dropdown-container.dropdown.open')
  I.click('Move', '.smart-dropdown-container.dropdown.open')

  I.say('Move to new folder')
  dialogs.waitForVisible()
  I.waitForElement('.modal-dialog [data-id="virtual/flat/event/private"] .folder-arrow')
  I.click('.modal-dialog [data-id="virtual/flat/event/private"] .folder-arrow')
  I.waitForText('New calendar', 5, '.modal-dialog')
  I.click('~New calendar', '.modal-dialog')
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')

  // check updated details
  I.waitForText('New calendar', 5, '.details-table')

  // see OXUIB-1144: after moving an appointment, it should be possible to move the appointment again
  I.say('Move back to original folder')
  I.click('.detail-popup-appointment .inline-toolbar .more-dropdown')
  I.waitForElement('.smart-dropdown-container.dropdown.open')
  I.click('Move', '.smart-dropdown-container.dropdown.open')
  dialogs.waitForVisible()
  I.waitForText(defaultFolderName, 5, '.modal-dialog')
  I.click(`~${defaultFolderName}`, '.modal-dialog')
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')
  I.waitForText(defaultFolderName, 5, '.details-table')
})
