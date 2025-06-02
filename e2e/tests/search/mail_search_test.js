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

Feature('Mail > Search')

Before(async ({ users }) => {
  const { I } = inject()

  await Promise.all([
    users.create(),
    users.create(),
    users.create()
  ])

  await Promise.all([
    I.haveMail({ from: [['Jim Bob', users[1].get('primaryEmail')]], to: users[0], content: 'some content', subject: 'Received One' }, { user: users[1] }),
    I.haveMail({ from: users[2], to: users[0], content: 'some other content', subject: 'Received Two' }, { user: users[2] }),
    I.haveMail({ from: users[0], to: users[1], content: 'some more content', subject: 'Sent One' }),
    I.haveMail({ from: users[0], to: users[2], content: 'some new content', subject: 'Sent Two' })
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('Can cancel a search and all fields get cleared', async ({ I, users, mail }) => {
  const user1Address = users[1].get('primaryEmail')
  const user2Address = users[2].get('primaryEmail')

  I.login()
  I.waitForApp()

  I.fillField('.search-field', `folder:inbox from:${user1Address} to:${user2Address} subject:hallo custom strings file:test.txt after:1/1/2022 before:5/1/2022`)

  I.click('~More search options')
  I.waitForElement('.form-control[name="folder"]')
  I.seeInField('folder', 'inbox')
  I.seeInField('from', user1Address)
  I.seeInField('to', user2Address)
  I.seeInField('subject', 'hallo')
  I.seeInField('words', 'custom strings')
  I.seeInField('file', 'test.txt')
  I.seeInField('after', '1/1/2022')
  I.seeInField('before', '5/1/2022')
  I.checkOption('attachment')
  I.checkOption('flagged')
  I.click('~More search options')

  I.seeInField('.search-field', 'custom strings')

  I.click('~Cancel search')
  I.waitForDetached('.filters.flex-row .filter.flex-row')
  I.seeInField('.search-field', '')
  I.click('~More search options')
  I.waitForElement('.form-control[name="folder"]')
  I.seeInField('folder', 'all')
  I.seeInField('from', '')
  I.seeInField('to', '')
  I.seeInField('subject', '')
  I.seeInField('words', '')
  I.seeInField('file', '')
  I.seeInField('after', '')
  I.seeInField('before', '')
  I.dontSeeCheckboxIsChecked('.checkbox input[name="attachment"]')
  I.dontSeeCheckboxIsChecked('.checkbox input[name="flagged"]')
})

Scenario('Can search for multiple "to" addresses', async ({ I, users, mail }) => {
  const user1Address = users[1].get('primaryEmail')
  const user2Address = users[2].get('primaryEmail')

  I.login()
  I.waitForApp()

  // Search for "to:user1"
  I.fillField('.search-field', `to:${user1Address}`)
  I.pressKey('Enter')

  I.waitForText(user1Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')
  I.dontSee('Received Two')

  // Search for "to:user2"
  I.fillField('.search-field', `to:${user2Address}`)
  I.pressKey('Enter')

  I.waitForText(user1Address, 5, '.filters.flex-row')
  I.waitForText(user2Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 2)
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')
  I.dontSee('Received Two')

  // Clear one by one
  I.click(`.btn[aria-label*="${user1Address}"]`)
  I.waitForDetached(locate('.text-bold').withText(user1Address))
  I.click(`.btn[aria-label*="${user2Address}"]`)
  I.waitForDetached(locate('.text-bold').withText(user2Address))

  I.dontSeeElement('.filter.flex-row')
  I.waitForText('Received One')
  I.waitForText('Received Two')

  // Search for "to:user1" and complete in Dropdown
  I.fillField('.search-field', `to:${user1Address}`)
  I.click('~More search options')

  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', user1Address)

  I.clearField('to')
  I.fillField('to', `${user1Address} ${user2Address}`)
  I.pressKey('Enter')

  I.waitForText(user1Address, 5, '.filters.flex-row')
  I.waitForText(user2Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 2)
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')
  I.dontSee('Received Two')

  // Cancel complete search
  I.click('~Cancel search')
  I.waitForDetached('.filters.flex-row .filter.flex-row')
  I.waitForText('Received One')
  I.waitForText('Received Two')
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  // Search for "to:user1" and overwrite in dropdown
  I.fillField('.search-field', `to:${user1Address}`)
  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.clearField('to')
  I.fillField('to', `${user2Address}`)
  I.pressKey('Enter')

  I.waitForText(user2Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Sent Two')
  I.dontSee('Sent One')
  I.dontSee('Received One')
  I.dontSee('Received Two')

  I.click('~Cancel search')
  I.waitForDetached('.filters.flex-row .filter.flex-row')

  // Search for "to:user1", overwrite in dropdown but submit via input search field
  I.fillField('.search-field', `to:${user1Address}`)
  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.clearField('to')
  I.fillField('to', `${user2Address}`)
  I.click('~More search options')
  I.click('.search-field')
  I.pressKey('Enter')

  I.waitForText(user1Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')
  I.dontSee('Received Two')
})

Scenario('Can only search for one "from" address', async ({ I, users, mail }) => {
  const user1Address = users[1].get('primaryEmail')
  const user2Address = users[2].get('primaryEmail')

  I.login()
  I.waitForApp()

  // Search for "from:user1"
  I.fillField('.search-field', `from: ${user1Address}`)
  I.click('~More search options')
  I.waitForElement('.form-control[name="from"]')
  I.seeInField('from', user1Address)
  I.click('~More search options')
  I.click('.search-field')
  I.pressKey('Enter')

  I.waitForText(user1Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Received One')
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received Two')

  // Search for "from:user1"
  I.fillField('.search-field', `from:${user2Address}`)
  I.click('~More search options')
  I.waitForElement('.form-control[name="from"]')
  I.seeInField('from', user2Address)
  I.click('~More search options')
  I.click('.search-field')
  I.pressKey('Enter')

  I.waitForText(user2Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Received Two')
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')

  I.click(`.btn[aria-label*="${user2Address}"]`)
  I.waitForDetached(locate('.text-bold').withText(user2Address))
  I.dontSeeElement('.filter.flex-row')
  I.waitForText('Received One')
  I.waitForText('Received Two')
})

Scenario('Can use quotes and select contacts from autocomplete', async ({ I, users, mail }) => {
  const user1Address = users[1].get('primaryEmail')
  const user1Name = users[1].get('sur_name')

  I.login()
  I.waitForApp()

  // Search for "foo" and start of an email address
  I.fillField('.search-field', `"foo" ${user1Name}`)
  I.waitForText(user1Address, 10, '.autocomplete .email')
  I.click(user1Address, '.autocomplete .email')

  // check if the search term is filled correctly
  I.seeInField('.search-field', `"foo" ${user1Address}`)
})

Scenario('Can use quotes in search field', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  // Search for ""other content""
  I.fillField('.search-field', '"other content"')
  I.pressKey('Enter')
  I.waitForText('Received Two')
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received One')

  // Search for "from:"given_name sur_name""
  I.fillField('.search-field', '"Jim Bob"')
  I.waitForVisible('.autocomplete [data-prefix="from"][data-value="Jim Bob"]')
  I.click('.autocomplete [data-prefix="from"]')

  I.waitForText('From Jim Bob', 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitForText('Received One')
  I.dontSee('Sent One')
  I.dontSee('Sent Two')
  I.dontSee('Received Two')
})

Scenario('Can use quotes in search dropdown', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()

  // Check pre filled to field when switching to dropdown
  I.fillField('.search-field', 'to:"Jim Bob"')
  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', '"Jim Bob"')

  // add Jane to to field
  I.appendField('to', ' Jane')
  I.click('Search', '#io-ox-topsearch')

  // check that there are 2 Filters. One for Jim Bob and one for Jane
  I.seeNumberOfVisibleElements('.filter.flex-row', 2)
  I.waitForText('To Jim Bob', 5, '.filters.flex-row')
  I.waitForText('To Jane', 5, '.filters.flex-row')
})

Scenario('Search in different folders', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()

  // Switch so Sent folder
  I.selectFolder('Sent')
  I.waitForText('Sent One')
  I.waitForText('Sent Two')

  // Search for a string that all mails contain
  I.fillField('.search-field', 'content')
  I.pressKey('Enter')

  I.waitForText('Sent One')
  I.waitForText('Sent Two')
  I.waitForText('Received One')
  I.waitForText('Received Two')

  // Open dropdown and change folder to "current"
  I.click('~More search options')
  I.waitForElement('.form-control[name="folder"]')
  I.seeInField('folder', 'all')
  I.selectOption('folder', 'current')
  I.click('Search', '#io-ox-topsearch')

  I.waitForText('Sent One')
  I.waitForText('Sent Two')
  I.dontSee('Received One')
  I.dontSee('Received Two')

  // Open dropdown and change folder back to its default "all"
  I.click('~More search options')
  I.selectOption('folder', 'all')
  I.seeInField('folder', 'all')
  I.clearField('words')
  I.fillField('words', 'some')
  I.click('Search', '#io-ox-topsearch')

  I.waitForText('Sent One')
  I.waitForText('Sent Two')
  I.waitForText('Received One')
  I.waitForText('Received Two')
})

Scenario('Overwrite filters in dropdown', async ({ I, users, mail }) => {
  const user1Address = users[1].get('primaryEmail')
  const user2Address = users[2].get('primaryEmail')

  I.login()
  I.waitForApp()

  I.fillField('.search-field', `content to:${user1Address} to: test from:${user2Address}`)
  I.pressKey('Enter')
  I.waitForText('Search results')

  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', `${user1Address} test`)

  I.fillField('to', `${user2Address}`)
  I.pressKey('Enter')

  I.waitForText(user2Address, 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 2)
})

Scenario('Do not set filters from closed dropdown', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', 'content to:test')
  I.pressKey('Enter')
  I.waitForText('test', 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.waitNumberOfVisibleElements('.subject', 4)

  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', 'test')
  I.fillField('from', 'test-from')
  I.click('~More search options')
  I.fillField('.search-field', 'no-content')
  I.pressKey('Enter')
  I.waitForText('test', 5, '.filters.flex-row')
  I.seeNumberOfVisibleElements('.filter.flex-row', 1)
  I.dontSee('test-from')
  I.dontSeeElement('.subject')
})

Scenario('Search input as single source of truth', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', 'ContenT to:test to: test to: foo from: bar')

  // Check for whitespaces and upper/lower case
  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', 'test foo')
  I.seeInField('from', 'bar')
  I.seeInField('words', 'ContenT')

  // Input field should not change
  I.click('~More search options')
  I.waitForInvisible('#io-ox-topsearch .dropdown')
  I.seeInField('.search-field', 'ContenT to:test to: test to: foo from: bar')

  // Content should not be duplicated after reopening of dropdown
  I.click('~More search options')
  I.waitForElement('.form-control[name="to"]')
  I.seeInField('to', 'test foo')
  I.seeInField('from', 'bar')
  I.seeInField('words', 'ContenT')

  I.fillField('words', 'other content')
  I.click('~More search options')
  I.waitForInvisible('#io-ox-topsearch .dropdown')
  I.dontSeeInField('Search mail', 'other content')
})

Scenario('Search autocomplete shows suggestions', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', 'Foobar')
  I.waitForText('Contains')
  I.see('Foobar', '.autocomplete [data-prefix="from"]')
  I.see('Foobar', '.autocomplete [data-prefix="to"]')
  I.see('Foobar', '.autocomplete [data-prefix="subject"]')
  I.see('Foobar', '.autocomplete [data-prefix-x="contains"]')
  I.see('Press ENTER', '.autocomplete [data-prefix-x="contains"]')
})

Scenario('Search autocomplete hides "Press Enter" on cursor move', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', 'Foobar')
  I.waitForText('Contains')
  I.see('Press ENTER', '.autocomplete [data-prefix-x="contains"]')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowDown')
  I.dontSee('Press Enter', '.autocomplete [data-prefix-x="contains"]')
})

Scenario('Search autocomplete supports keyboard', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', 'Sent two')
  I.waitForText('Contains')
  I.see('Press ENTER', '.autocomplete [data-prefix-x="contains"]')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.waitForText('Sent Two', 5, '.list-view')
})

Scenario('Search autocomplete supports keyboard w/ from suggestion', async ({ I, users, mail }) => {
  I.login()
  I.waitForApp()
  I.fillField('.search-field', users[2].get('email1'))
  I.waitForText('From')
  I.pressKey('ArrowDown')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.waitForText('Received Two', 5, '.list-view')
})
