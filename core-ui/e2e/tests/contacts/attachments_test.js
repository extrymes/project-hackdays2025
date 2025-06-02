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

Feature('Contacts > Attachments')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Handle malicious attachment', async ({ I, contacts }) => {
  const folder = await I.grabDefaultFolder('contacts')
  const { id } = await I.haveContact({ folder_id: folder, first_name: 'Phil', last_name: 'Dunphy' })
  await I.haveAttachment(
    'contacts',
    { id, folder },
    { name: 'media/files/><img src=x onerror=alert(123)>', content: '<img src=x onerror=alert(123)>' }
  )

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')
  I.waitForVisible({ css: 'section[data-block="attachments"]' })
  I.see('><img src=x onerror=alert(123)>')
})

Scenario('Create contact with attachment', async ({ I, contacts }) => {
  await I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  const folder = await I.grabDefaultFolder('contacts')
  I.login(`app=io.ox/contacts&folder=con://0/${folder}`)
  contacts.newContact()

  I.fillField('First name', 'Phil')
  I.fillField('Last name', 'Dunphy')
  I.pressKey('Pagedown')
  I.attachFile('.attachment-list-actions input[type="file"]', 'media/files/generic/testdocument.odt')
  I.waitForElement(locate('.contact-edit .filename').withText('testdocument.odt'))
  I.seeNumberOfElements('.contact-edit .attachment', 1)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add')
  I.waitForElement(locate('.contact-edit .filename').withText('100x100.png'))
  I.seeNumberOfElements('.contact-edit .attachment', 2)
  I.click('Save')

  // Check detail view
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 10)
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))
})

Scenario('Add attachments', async ({ I, contacts }) => {
  await Promise.all([
    I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Phil', last_name: 'Dunphy' }),
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')
  I.clickToolbar('~Edit')
  I.waitForVisible('.io-ox-contacts-edit-window')

  // Add local file
  I.pressKey('Pagedown')
  I.attachFile('.io-ox-contacts-edit-window .attachment-list-actions input[type="file"]', 'media/files/generic/testdocument.odt')
  I.waitForElement(locate('.io-ox-contacts-edit-window .filename').withText('testdocument.odt'))
  I.seeNumberOfElements('.io-ox-contacts-edit-window .attachment', 1)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add')
  I.waitForElement(locate('.io-ox-contacts-edit-window .filename').withText('100x100.png'))
  I.seeNumberOfElements('.io-ox-contacts-edit-window .attachment', 2)
  I.click('Save')

  // Check detail view
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))
})

Scenario('Remove attachment', async ({ I, contacts }) => {
  const defaultFolder = await I.grabDefaultFolder('contacts')
  const contact = await I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Phil', last_name: 'Dunphy' })
  await Promise.all([
    I.haveAttachment('contacts', { id: contact.id, folder: defaultFolder }, 'media/files/generic/testdocument.odt'),
    I.haveAttachment('contacts', { id: contact.id, folder: defaultFolder }, 'media/images/100x100.png')
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')
  I.waitForElement('.contact-detail', 5)
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))

  I.clickToolbar('~Edit')
  I.waitForElement('.contact-edit')
  I.pressKey('Pagedown')
  I.waitForElement(locate('.contact-edit .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-edit .filename').withText('100x100.png'))
  I.seeNumberOfElements('.contact-edit .attachment', 2)
  // remove
  I.waitForElement('.contact-edit button.remove-attachment[data-filename="testdocument.odt"]')
  I.retry(5).click('.contact-edit button.remove-attachment[data-filename="testdocument.odt"]')
  I.waitForDetached('.contact-edit button.remove-attachment[data-filename="testdocument.odt"]')
  I.seeNumberOfElements('.contact-edit .attachment', 1)
  I.click('Save')

  I.waitForText('Dunphy', 10, '.contact-detail .last_name')
  I.waitForDetached('.contact-detail .attachments-progress-view')
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))
})

Scenario('Update attachments', async ({ I, contacts }) => {
  const defaultFolder = await I.grabDefaultFolder('contacts')
  const contact = await I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Phil', last_name: 'Dunphy' })
  await Promise.all([
    I.haveAttachment('contacts', { id: contact.id, folder: defaultFolder }, 'media/files/generic/testdocument.odt'),
    I.haveAttachment('contacts', { id: contact.id, folder: defaultFolder }, 'media/files/generic/testspreadsheed.xlsm'),
    I.haveFile(await I.grabDefaultFolder('infostore'), 'media/images/100x100.png')
  ])

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')
  I.waitForElement('.contact-detail', 5)
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-detail .filename').withText('testspreadsheed.xlsm'))

  I.clickToolbar('~Edit')
  I.waitForElement('.io-ox-contacts-edit-window')

  // Remove file')
  I.pressKey('Pagedown')
  I.waitForElement(locate('.contact-edit .filename').withText('testdocument.odt'))
  I.waitForElement(locate('.contact-edit .filename').withText('testspreadsheed.xlsm'))
  I.seeNumberOfElements('.contact-edit .attachment', 2)
  // remove
  I.waitForElement({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.retry(5).click({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.waitForDetached({ css: 'button.remove-attachment[data-filename="testdocument.odt"]' })
  I.seeNumberOfElements('.contact-edit .attachment', 1)

  // Add local file
  I.pressKey('Pagedown')
  I.attachFile('.contact-edit .attachment-list-actions input[type="file"]', 'media/files/generic/testdocument.rtf')
  I.waitForElement(locate('.contact-edit .filename').withText('testdocument.rtf'))
  I.seeNumberOfElements('.contact-edit .attachment', 2)

  // Add from drive
  I.click('Add from Drive')
  I.waitForText('100x100.png')
  I.click('Add')
  I.waitForElement(locate('.contact-edit .filename').withText('100x100.png'))
  I.seeNumberOfElements('.contact-edit .attachment', 3)
  I.click('Save')

  // Check detail view
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 100, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testspreadsheed.xlsm'))
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.rtf'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))
  I.waitForDetached(locate('.contact-detail .filename').withText('testdocument.odt'))

  // Check detail view after refresh
  I.refreshPage()
  I.waitForElement('.contact-detail')
  I.waitForText('Attachments', 100, '.contact-detail')
  I.waitForElement(locate('.contact-detail .filename').withText('testspreadsheed.xlsm'))
  I.waitForElement(locate('.contact-detail .filename').withText('testdocument.rtf'))
  I.waitForElement(locate('.contact-detail .filename').withText('100x100.png'))
  I.waitForDetached(locate('.contact-detail .filename').withText('testdocument.odt'))
})

Scenario('Check available attachment actions for contacts', async ({ I, contacts, drive }) => {
  I.handleDownloads()
  const file = locate('.contact-detail .filename').withText('100x100.png').as('file 100x100.png')
  const defaultFolder = await I.grabDefaultFolder('contacts')
  const contact = await I.haveContact({ folder_id: await I.grabDefaultFolder('contacts'), first_name: 'Phil', last_name: 'Dunphy' })
  await I.haveAttachment('contacts', { id: contact.id, folder: defaultFolder }, 'media/images/100x100.png')

  I.login('app=io.ox/contacts')
  I.waitForApp()
  contacts.selectContact('Dunphy, Phil')
  I.waitForElement('.contact-detail', 5)
  I.waitForText('Attachments', 10, '.contact-detail')
  I.waitForElement(file)

  // view
  I.click(file)
  I.clickDropdown('View')
  I.waitForElement('img.viewer-displayer-item')
  I.retry(5).click('~Close viewer')
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
  I.openApp('Drive')
  I.waitForElement('.filename[title="100x100.png"]')
})
