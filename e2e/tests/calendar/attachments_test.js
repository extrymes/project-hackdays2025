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
const { expect } = require('chai')
const fs = require('node:fs')
const path = require('node:path')

Feature('Calendar > Attachments')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7413] Create with attachments', async ({ I, calendar }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  // prepare file with xss filename
  // do not upload an actual file with this name because it contains illegal characters on windows
  const filePath = path.join(global.output_dir, '"><img src=x onerror=alert(1)>')

  await fs.promises.writeFile(filePath, 'xss')

  I.login(['app=io.ox/calendar'])
  I.waitForApp()

  await I.executeScript(function () {
    // @ts-ignore
    window.alertCalled = false
    // @ts-ignore
    window.alert = () => (window.alertCalled = true)
  })

  calendar.newAppointment()
  I.fillField('Starts on', moment().format('L'))
  I.fillField('Title', 'The Long Dark Tea-Time of the Soul')
  I.fillField('Location', 'London')

  I.pressKey('Pagedown')
  I.see('Attachments', calendar.editWindow)
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/testdocument.odt')
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/testdocument.rtf')
  // xss check in edit view
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', path.relative(global.codecept_dir, filePath))
  // @ts-ignore
  let alertCalled = await I.executeScript(function () { return window.alertCalled })
  expect(alertCalled).to.be.false
  I.click('.add-from-storage button')
  I.waitForText('100x100.png')
  I.click('Add')
  I.waitForElement(locate('.io-ox-calendar-edit-window .filename').withText('100x100.png').as('100x100.png'))
  I.seeNumberOfElements('.attachment', 4)

  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // Check appointment in all views
  calendar.switchView('Week')
  I.waitForText('The Long Dark Tea-Time of the Soul', 5, '.page.current .appointment')
  I.click('The Long Dark Tea-Time of the Soul', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('The Long Dark Tea-Time of the Soul', undefined, '.detail-popup')
  I.see('testdocument.odt', '.detail-popup')
  I.see('5 kB', '.detail-popup')
  I.see('testdocument.rtf', '.detail-popup')
  I.see('39 kB', '.detail-popup')
  I.see('100x100.png', '.detail-popup')
  I.see('271 B', '.detail-popup')

  // xss check in detail view
  // @ts-ignore
  alertCalled = await I.executeScript(function () { return window.alertCalled })
  expect(alertCalled).to.be.false
  I.pressKey('Escape')

  calendar.switchView('Day')
  I.waitForText('The Long Dark Tea-Time of the Soul', 5, '.page.current .appointment')
  I.click('The Long Dark Tea-Time of the Soul', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('The Long Dark Tea-Time of the Soul', undefined, '.detail-popup')
  I.see('testdocument.odt', '.detail-popup')
  I.see('5 kB', '.detail-popup')
  I.see('testdocument.rtf', '.detail-popup')
  I.see('39 kB', '.detail-popup')
  I.see('100x100.png', '.detail-popup')
  I.see('271 B', '.detail-popup')
  I.pressKey('Escape')

  calendar.switchView('Month')
  I.waitForText('The Long Dark Tea-Time of the Soul', 5, '.page.current .appointment')
  I.click('The Long Dark Tea-Time of the Soul', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('The Long Dark Tea-Time of the Soul', undefined, '.detail-popup')
  I.see('testdocument.odt', '.detail-popup')
  I.see('5 kB', '.detail-popup')
  I.see('testdocument.rtf', '.detail-popup')
  I.see('39 kB', '.detail-popup')
  I.see('100x100.png', '.detail-popup')
  I.see('271 B', '.detail-popup')
  I.pressKey('Escape')

  calendar.switchView('List')
  I.waitForText('The Long Dark Tea-Time of the Soul', 5, '.page.current .appointment')
  I.click('The Long Dark Tea-Time of the Soul', '.page.current .appointment')
  I.waitForElement('.calendar-detail-pane')
  I.waitForText('The Long Dark Tea-Time of the Soul', undefined, '.calendar-detail-pane')
  I.see('testdocument.odt', '.calendar-detail-pane')
  I.see('5 kB', '.calendar-detail-pane')
  I.see('testdocument.rtf', '.calendar-detail-pane')
  I.see('39 kB', '.calendar-detail-pane')
  I.see('100x100.png', '.calendar-detail-pane')
  I.see('271 B', '.calendar-detail-pane')
  I.pressKey('Escape')
})

Scenario('[C7460] Add attachments', async ({ I, calendar }) => {
  const odtTestFile = locate('div.file').withDescendant(locate('div').withText('testdocument.odt')).as('odtTestFile')
  const rtfTestFile = locate('div.file').withDescendant(locate('div').withText('testdocument.rtf')).as('rtfTestFile')
  const pngTestFile = locate('div.file').withDescendant(locate('div').withText('100x100.png')).as('pngTestFile')

  await Promise.all([
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png'),
    I.haveAppointment({
      summary: 'Tiny Tinas Tea Party',
      startDate: { value: calendar.getNextMonday() },
      endDate: { value: calendar.getNextMonday().add(2, 'hour') }
    })
  ])

  I.login(['app=io.ox/calendar'])
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.waitForElement(locate('.appointment').withText('Tiny Tinas Tea Party').as('Tiny Tinas Tea Party'))
  I.click('Tiny Tinas Tea Party', '.appointment')
  I.waitForElement('~Edit')
  I.click('~Edit')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.pressKey('Pagedown')
  I.see('Attachments', calendar.editWindow)
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/testdocument.odt')
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/testdocument.rtf')
  I.click('.add-from-storage button')
  I.waitForText('100x100.png')
  I.click('Add')
  I.waitForElement(locate('.io-ox-calendar-edit-window .filename').withText('100x100.png').as('100x100.png'))

  // Expected Result: Attachments get added to the edit dialog
  I.see('testdocument.odt')
  I.see('testdocument.rtf')
  I.see('100x100.png')

  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  calendar.switchView('Week')
  I.waitForText('Tiny Tinas Tea Party', 5, '.page.current .appointment')
  I.click('Tiny Tinas Tea Party', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Tiny Tinas Tea Party', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)
  I.waitForDetached(pngTestFile)
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  calendar.switchView('Day')
  I.waitForText('Tiny Tinas Tea Party', 5, '.page.current .appointment')
  I.click('Tiny Tinas Tea Party', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Tiny Tinas Tea Party', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)
  I.waitForDetached(pngTestFile)
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  calendar.switchView('Month')
  I.waitForText('Tiny Tinas Tea Party', 5, '.page.current .appointment')
  I.click('Tiny Tinas Tea Party', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Tiny Tinas Tea Party', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)
  I.waitForDetached(pngTestFile)
  I.click('~Close', '.detail-popup')
  I.waitForDetached('.detail-popup')

  calendar.switchView('List')
  I.waitForText('Tiny Tinas Tea Party', 5, '.page.current .appointment')
  I.click('Tiny Tinas Tea Party', '.page.current .appointment')
  I.waitForElement('.calendar-detail-pane')
  I.waitForText('Tiny Tinas Tea Party', 5, '.calendar-detail-pane')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)
  I.waitForDetached(pngTestFile)
})

Scenario('[C7459] Remove attachments', async ({ I, calendar }) => {
  await I.haveSetting({ 'io.ox/calendar': { notifyNewModifiedDeleted: true } })

  let appointment = await I.haveAppointment({
    summary: 'Allhands Meeting',
    startDate: { value: calendar.getNextMonday() },
    endDate: { value: calendar.getNextMonday().add(1, 'hour') }
  })
  appointment = await I.haveAttachment('calendar', appointment, 'media/files/generic/testdocument.odt')
  await I.haveAttachment('calendar', appointment, 'media/files/generic/testdocument.rtf')

  const odtTestFile = locate('div.file').withDescendant(locate('div').withText('testdocument.odt').as('testdocument.odt'))
  const rtfTestFile = locate('div.file').withDescendant(locate('div').withText('testdocument.rtf').as('testdocument.rtf'))

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  calendar.clickAppointment('Allhands Meeting')

  I.waitForVisible('.detail-popup')
  I.waitForElement('~Edit')
  I.click('~Edit')

  I.waitForVisible(calendar.editWindow)
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')

  I.see('Attachments', calendar.editWindow)
  I.waitForElement('.io-ox-calendar-edit-window button.remove-attachment[data-filename="testdocument.odt"]')
  I.waitForElement('.io-ox-calendar-edit-window button.remove-attachment[data-filename="testdocument.rtf"]')
  I.scrollTo(odtTestFile)
  I.click('.io-ox-calendar-edit-window button.remove-attachment[data-filename="testdocument.odt"]')
  I.waitForDetached('testdocument.odt')
  I.see('testdocument.rtf', calendar.editWindow)
  I.click('.io-ox-calendar-edit-window button.remove-attachment[data-filename="testdocument.rtf"]')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)

  I.click('Save', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)

  // Expected Result: The appointment does not contain the attachment anymore
  calendar.switchView('Week')
  I.waitForText('Allhands Meeting', 5, '.page.current .appointment')
  I.click('Allhands Meeting', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Allhands Meeting', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)

  calendar.switchView('Day')
  I.waitForText('Allhands Meeting', 5, '.page.current .appointment')
  I.click('Allhands Meeting', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Allhands Meeting', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)

  calendar.switchView('Month')
  I.waitForText('Allhands Meeting', 5, '.page.current .appointment')
  I.click('Allhands Meeting', '.page.current .appointment')
  I.waitForElement('.detail-popup')
  I.waitForText('Allhands Meeting', 5, '.detail-popup')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)

  calendar.switchView('List')
  I.waitForText('Allhands Meeting', 5, '.page.current .appointment')
  I.click('Allhands Meeting', '.page.current .appointment')
  I.waitForElement('.calendar-detail-pane')
  I.waitForText('Allhands Meeting', 5, '.calendar-detail-pane')
  I.waitForInvisible(odtTestFile)
  I.waitForDetached(rtfTestFile)
})

Scenario('Check available attachment actions for appointments', async ({ I, calendar }) => {
  I.handleDownloads()
  const file = locate('.calendar-detail .filename').withText('100x100.png').as('file')

  const appointment = await I.haveAppointment({
    summary: 'Allhands Meeting',
    startDate: { value: calendar.getNextMonday() },
    endDate: { value: calendar.getNextMonday().add(1, 'hour') }
  })

  await I.haveAttachment('calendar', appointment, 'media/images/100x100.png')

  I.login('app=io.ox/calendar')

  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  calendar.clickAppointment('Allhands Meeting')

  I.waitForVisible('.detail-popup')
  I.waitForElement(file)

  // view
  I.click(file)
  I.clickDropdown('View')
  I.waitForElement('img.viewer-displayer-item')

  I.waitForElement('~Zoom in')
  I.click('~Zoom in')

  I.waitForElement('~Close viewer')
  I.click('~Close viewer')
  I.waitForDetached('.io-ox-viewer')

  // download
  I.click(file)
  I.clickDropdown('Download')
  I.amInPath('/output/downloads/')
  await I.waitForFile('100x100.png', 10)
  I.seeFile('100x100.png')
  I.seeFileContentsEqualReferenceFile('media/images/100x100.png')

  // save to drive
  I.click(file)
  I.clickDropdown('Save to Drive')
  I.waitForText('Attachments have been saved')
  I.pressKey('Escape')
  I.waitForDetached('.detail-popup')
  I.openApp('Drive')
  I.waitForElement('.filename[title="100x100.png"]')
})

Scenario('[C274517] Download all as zip', async ({ I, calendar }) => {
  I.handleDownloads()
  let appointment = await I.haveAppointment({
    summary: 'Meetup XY',
    startDate: { value: calendar.getNextMonday() },
    endDate: { value: calendar.getNextMonday().add(1, 'hour') }
  })
  appointment = await I.haveAttachment('calendar', appointment, 'media/files/generic/testdocument.odt')
  appointment = await I.haveAttachment('calendar', appointment, 'media/files/generic/testdocument.rtf')
  await I.haveAttachment('calendar', appointment, 'media/files/generic/testspreadsheed.xlsm')

  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.moveCalendarViewToNextWeek()
  I.waitForText('Meetup XY')
  I.click('Meetup XY')

  I.waitForText('testdocument.odt')
  I.see('testdocument.rtf')
  I.see('testspreadsheed.xlsm')
  I.see('All attachments')

  I.click('All attachments')
  I.waitForText('Download')
  I.waitForText('Save to Drive')

  I.clickDropdown('Download')

  I.amInPath('/output/downloads/')
  await I.waitForFile('attachments.zip', 5)
})
