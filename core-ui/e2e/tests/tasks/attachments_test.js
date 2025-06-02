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

Feature('Tasks > Attachments')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Create task with attachment', async ({ I, tasks }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')

  I.login(['app=io.ox/tasks'])
  I.waitForApp()
  tasks.newTask()

  I.fillField('Subject', 'Create task with attachment')
  I.click('Expand form')
  I.pressKey('Pagedown')
  I.attachFile('[data-app-name="io.ox/tasks/edit"] input[type="file"]', 'media/files/generic/testdocument.odt')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testdocument.odt'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 1)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add', '.add-infostore-file')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('100x100.png'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 2)
  tasks.create()

  // Check detail view
  I.waitForElement('.tasks-detailview')
  I.waitForDetached('.tasks-detailview .attachments-progress-view')
  I.waitForText('Create task with attachment', 10, '.tasks-detailview')
  I.waitForText('Attachments', 10, '.tasks-detailview')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForText('Create task with attachment', 10, '.tasks-detailview')
  I.waitForText('Attachments', 10, '.tasks-detailview')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))
})

Scenario('[C7747] Add attachments', async ({ I, tasks }) => {
  await Promise.all([
    I.haveTask({ title: 'Add attachments', folder_id: await I.grabDefaultFolder('tasks'), note: 'C7747' }),
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  tasks.editTask()

  // Add local file
  I.click('Expand form', '.io-ox-tasks-edit-main')
  I.pressKey('Pagedown')
  I.attachFile('[data-app-name="io.ox/tasks/edit"] input[type="file"]', 'media/files/generic/testdocument.odt')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testdocument.odt'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 1)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add', '.add-infostore-file')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('100x100.png'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 2)
  tasks.save()

  // Check detail view
  I.waitForText('Add attachments', 10, '.tasks-detailview .title')
  I.waitForElement('.tasks-detailview .attachments-progress-view')
  I.waitForDetached('.tasks-detailview .attachments-progress-view')
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForText('Add attachments', 10, '.tasks-detailview .title')
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))
})

Scenario('[C7748] Remove attachment', async ({ I, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  const task = await I.haveTask({ title: 'Remove attachment', folder_id: defaultFolder, note: 'C7748' })
  await Promise.all([
    I.haveAttachment('tasks', { id: task.id, folder: defaultFolder }, 'media/files/generic/testdocument.odt'),
    I.haveAttachment('tasks', { id: task.id, folder: defaultFolder }, 'media/images/100x100.png')
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))

  tasks.editTask()
  I.pressKey('Pagedown')
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 2)
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('100x100.png'))
  // remove
  I.waitForElement({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.retry(5).click({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.waitForDetached({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 1)
  tasks.save()

  I.waitForText('Remove attachment', 10, '.tasks-detailview .title')
  I.waitForDetached('.tasks-detailview .attachments-progress-view')
  I.waitForElement('.tasks-detailview .title')
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png'))
  I.dontSeeElement(locate('.tasks-detailview .filename').withText('testdocument.odt'))
})

Scenario('Update attachments', async ({ I, tasks }) => {
  const defaultFolder = await I.grabDefaultFolder('tasks')
  const task = await I.haveTask({ title: 'Update attachments', folder_id: defaultFolder })
  await Promise.all([
    I.haveAttachment('tasks', { id: task.id, folder: defaultFolder }, 'media/files/generic/testdocument.odt'),
    I.haveAttachment('tasks', { id: task.id, folder: defaultFolder }, 'media/files/generic/testspreadsheed.xlsm'),
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.odt').as('testdocument.odt'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('testspreadsheed.xlsm').as('testspreadsheed.xlsm'))

  // Remove file
  tasks.editTask()
  I.pressKey('Pagedown')
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 2)
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testdocument.odt').as('testdocument.odt'))
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testspreadsheed.xlsm').as('testspreadsheed.xlsm'))
  // remove
  I.waitForElement({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.retry(5).click({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.waitForDetached({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 1)
  // Add local file
  I.attachFile('[data-app-name="io.ox/tasks/edit"] input[type="file"]', 'media/files/generic/testdocument.rtf')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('testdocument.rtf').as('testdocument.rtf'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 2)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add', '.add-infostore-file')
  I.waitForElement(locate('.io-ox-tasks-edit-main .filename').withText('100x100.png').as('100x100.png'))
  I.seeNumberOfElements('.io-ox-tasks-edit-main .attachment', 3)
  tasks.save()

  // Check detail view
  I.waitForText('Update attachments', 10, '.tasks-detailview .title')
  I.waitForText('Attachments', 100, '.tasks-detailview')
  I.waitForElement('.tasks-detailview .attachments-progress-view')
  I.waitForDetached('.tasks-detailview .attachments-progress-view')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testspreadsheed.xlsm').as('testspreadsheed.xlsm'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.rtf').as('testdocument.rtf'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))
  I.dontSeeElement(locate('.tasks-detailview .filename').withText('testdocument.odt').as('testdocument.odt'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForText('Update attachments', 10, '.tasks-detailview .title')
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('testspreadsheed.xlsm').as('testspreadsheed.xlsm'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('testdocument.rtf').as('testdocument.rtf'))
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))
  I.dontSeeElement(locate('.tasks-detailview .filename').withText('testdocument.odt').as('testdocument.odt'))
})

Scenario('Check available attachment actions for tasks', async ({ I, tasks }) => {
  I.handleDownloads()
  const defaultFolder = await I.grabDefaultFolder('tasks')
  const task = await I.haveTask({ title: 'Attachments actions', folder_id: defaultFolder })
  await I.haveAttachment('tasks', { id: task.id, folder: defaultFolder }, 'media/images/100x100.png')

  I.login('app=io.ox/tasks')
  I.waitForApp()
  I.waitForElement('.tasks-detailview', 5)
  I.waitForText('Attachments', 10, '.tasks-detailview .attachment-label')
  I.waitForElement(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))

  // view
  I.click(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))
  I.clickDropdown('View')
  I.waitForElement('img.viewer-displayer-item')
  I.retry(5).click('~Close viewer')
  I.waitForDetached('.io-ox-viewer')

  // download
  I.click(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))
  I.clickDropdown('Download')
  I.amInPath('/output/downloads/')
  await I.waitForFile('100x100.png', 10)
  I.seeFile('100x100.png')
  I.seeFileContentsEqualReferenceFile('media/images/100x100.png')

  // save to drive
  I.click(locate('.tasks-detailview .filename').withText('100x100.png').as('100x100.png'))
  I.clickDropdown('Save to Drive')
  I.waitForText('Attachments have been saved')
  I.openApp('Drive')
  I.waitForElement('.filename[title="100x100.png"]')
})
