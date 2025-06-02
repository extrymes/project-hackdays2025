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

Feature('Contacts > Misc')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8817] - Send E-Mail to contact', async ({ I, mail, users, search, contacts }) => {
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  const subject = `C8817 - ${Math.round(+new Date() / 1000)}`
  I.login('app=io.ox/contacts')
  I.waitForApp()
  search.doSearch('email:' + users[1].get('primaryEmail'))
  I.waitForElement(`[href="mailto:${users[1].get('primaryEmail')}"]`)
  I.click(`[href="mailto:${users[1].get('primaryEmail')}"]`)
  I.waitForVisible('.io-ox-mail-compose')
  I.waitForElement('.floating-window-content .io-ox-mail-compose .mail-compose-fields')
  I.waitForVisible({ css: 'textarea.plain-text' })
  I.waitForFocus('.io-ox-mail-compose [placeholder="To"]')
  I.fillField('.io-ox-mail-compose [name="subject"]', subject)
  I.fillField({ css: 'textarea.plain-text' }, 'C8817')
  I.seeInField({ css: 'textarea.plain-text' }, 'C8817')
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.waitForElement(`.list-item[aria-label*="${subject}"]`)
  I.doubleClick(`.list-item[aria-label*="${subject}"]`)
  I.see(subject)
})

Scenario('Subscribe and unsubscribe shared address book', async ({ I, users, dialogs }) => {
  await I.haveFolder({ title: 'New address book', module: 'contacts', parent: await I.grabDefaultFolder('contacts') })
  const sharedAddressBookName = `${users[0].get('sur_name')}, ${users[0].get('given_name')}: New address book`

  I.login('app=io.ox/contacts')
  I.waitForText('My address books')
  I.doubleClick('My address books')
  I.waitForText('New address book')
  I.rightClick('[aria-label^="New address book"]')
  I.clickDropdown('Share / Permissions')
  dialogs.waitForVisible()
  I.waitForFocus('.modal-dialog .tt-input')
  I.fillField('.modal-dialog .tt-input', users[1].get('primaryEmail'))
  I.waitForText(`${users[1].get('sur_name')}, ${users[1].get('given_name')}`, undefined, '.tt-dropdown-menu')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')
  I.logout()

  I.login('app=io.ox/contacts', { user: users[1] })
  I.waitForElement('~Shared address books')
  I.doubleClick('~Shared address books')
  I.waitForText(sharedAddressBookName)
  I.waitForElement('~More actions')
  I.click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared address books')
  I.waitForText('Subscribe to shared address books', 5, '.modal')
  I.waitForElement(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find('[name="subscribed"]'))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="subscribed"]' }))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find('.checkbox'))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForInvisible(locate('*').withText(sharedAddressBookName))

  I.click('~More actions', '.primary-action')
  I.clickDropdown('Subscribe to shared address books')
  I.waitForText('Subscribe to shared address books', 5, '.modal')

  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find('.checkbox'))
  I.seeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="subscribed"]' }))
  I.dontSeeCheckboxIsChecked(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'input[name="used_for_sync"]' }))

  I.click(locate('li').withChild(locate('*').withText(sharedAddressBookName)).find({ css: 'label' }).withText('Sync via DAV'))

  I.click('Save')
  I.waitForDetached('.modal-dialog')

  I.waitForText(sharedAddressBookName)
})
