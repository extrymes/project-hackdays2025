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

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8405] Find mails based on a date range', async ({ I, users }) => {
  // Precondition: Have some emails in the Inbox with timestamps from 2016 and 2017

  await Promise.all([
    I.haveMail({ path: 'media/mails/c8405_2016.eml' }),
    I.haveMail({ path: 'media/mails/c8405_2017.eml' })
  ])
  // Switch to Mail
  I.login('app=io.ox/mail')
  I.waitForVisible('#io-ox-topsearch .search-field')
  I.click('#io-ox-topsearch .search-field')

  // Start typing a date rage (e.g. "01.01.2016 - 31.12.2016") into the search field
  I.fillField('#io-ox-topsearch .search-field', 'after:01.01.2016 before:31.12.2016')
  I.pressKey('Enter')
  // results
  I.waitForText('2016', 5, '.list-view')
  I.dontSee('2017', '.list-view')

  // cancel search
  I.click('~Cancel search')
  I.pressKey('Enter')
  // results
  I.waitForText('2016', 5, '.list-view')
  I.waitForText('2017', 5, '.list-view')

  // second round
  I.fillField('#io-ox-topsearch .search-field', 'after:01.01.2017 before:31.12.2017')
  I.pressKey('Enter')
  I.waitForText('2017', 5, '.list-view')
  I.dontSee('2016', '.list-view')
})

Scenario('[C8402] Search in different folders', async ({ I, users, mail }) => {
  // Precondition: Some emails are in the inbox- and in a subfolder and have the subject "test".
  const subFolder = await I.haveFolder({ title: 'Subfolder', module: 'mail', parent: 'default0/INBOX' })

  await Promise.all([
    I.haveMail({ path: 'media/mails/c8402_1.eml' }),
    I.haveMail({ folder: subFolder, path: 'media/mails/c8402_2.eml' })
  ])

  // Login
  // Go to Mail and select the inbox
  I.login('app=io.ox/mail')
  I.waitForApp()

  // Enter "test" in the inputfield, than hit enter.
  I.waitForVisible('#io-ox-topsearch .search-field')
  I.fillField('#io-ox-topsearch .search-field', 'test')
  // UI will perform a reload if we do not wait here ...
  I.pressKey('Enter')
  I.waitForText('First', 5, '.list-view')
  I.waitForText('Inbox', 5, '.list-view')
  I.waitForText('Second', 5, '.list-view')
  I.waitForText('Subfolder', 5, '.list-view')

  // Change the search folder to the subfolder
  I.click('#io-ox-topsearch .dropdown-toggle')
  I.waitForVisible('.search-view .dropdown')
  I.selectOption('Search in', 'Current folder')

  I.click('Search')
  // Checking result
  I.waitForText('First', 5, '.list-view')
  I.waitForText('Inbox', 5, '.list-view')
  I.dontSee('Second', '.list-view')
  I.dontSee('Subfolder', '.list-view')
})

Scenario('[C8404] Find mails based on from/to', async ({ I, users }) => {
  await Promise.all([
    I.haveMail({ path: 'media/mails/c8404_1.eml' }),
    I.haveMail({ path: 'media/mails/c8404_2.eml' })
  ])

  // Start a new search in mail
  I.login('app=io.ox/mail')
  I.waitForVisible('#io-ox-topsearch .search-field')
  // Click into the input field.
  I.click('.search-field')

  // Start typing some user name
  I.fillField('#io-ox-topsearch .search-field', 'from:john@doe.com')
  I.pressKey('Enter')
  // result
  I.waitForText('John Doe', 5, '.list-view')
  I.waitForText('Mail#2', 5, '.list-view')
  I.waitForText('Duis autem vel eum', 5, '.list-view')
  I.dontSee('Jane Doe', '.list-view')
  I.dontSee('Mail#1', '.list-view')
  I.dontSee('Lorem ipsum', '.list-view')

  // second round
  I.click('~Cancel search')
  I.fillField('#io-ox-topsearch .search-field', 'to:john@doe.com')
  I.pressKey('Enter')
  // result
  I.waitForText('Jane Doe', 5, '.list-view')
  I.waitForText('Mail#1', 5, '.list-view')
  I.waitForText('Lorem ipsum', 5, '.list-view')
  I.dontSee('John Doe', '.list-view')
  I.dontSee('Mail#2', '.list-view')
  I.dontSee('Duis autem vel eum', '.list-view')

  // third round
  I.click('~Cancel search')
  I.fillField('#io-ox-topsearch .search-field', 'john@doe.com')
  I.pressKey('Enter')
  // result
  I.waitForText('John Doe', 5, '.list-view')
  I.waitForText('Mail#2', 5, '.list-view')
  I.waitForText('Duis autem vel eum', 5, '.list-view')
  I.waitForText('Jane Doe', 5, '.list-view')
  I.waitForText('Mail#1', 5, '.list-view')
  I.waitForText('Lorem ipsum', 5, '.list-view')
})

Scenario('[OXUIB-1800] Find mails via autocomplete in search', async ({ I }) => {
  await Promise.all([
    I.haveMail({ path: 'media/mails/c8404_1.eml' }),
    I.haveContact({
      email1: 'john@doe.com',
      folder_id: await I.grabDefaultFolder('contacts'),
      first_name: 'John',
      last_name: 'Doe'
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('#io-ox-topsearch .search-field')
  I.click('.search-field')

  // Click
  I.fillField('#io-ox-topsearch .search-field', 'from:john')
  I.waitForText('john@doe.com', 5, '.email')
  I.click('.list-item[data-cid]')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
  I.click('~Cancel search')

  // Click: arrow down
  I.fillField('#io-ox-topsearch .search-field', 'from:john')
  I.waitForText('john@doe.com', 5, '.email')
  I.pressKey('ArrowDown')
  I.click('.list-item[data-cid]')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
  I.click('~Cancel search')

  // Enter: arrow down
  I.fillField('#io-ox-topsearch .search-field', 'from:john')
  I.waitForText('john@doe.com', 5, '.email')
  I.pressKey('ArrowDown')
  I.pressKey('Enter')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
  I.click('~Cancel search')

  // Enter: tab
  I.fillField('#io-ox-topsearch .search-field', 'from:john')
  I.waitForText('john@doe.com', 5, '.email')
  I.pressKey('Tab')
  I.pressKey('Enter')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
  I.click('~Cancel search')

  // Enter: arrow down, tab
  I.fillField('#io-ox-topsearch .search-field', 'from:john')
  I.waitForText('john@doe.com', 5, '.email')
  I.pressKey('ArrowDown')
  I.pressKey('Tab')
  I.pressKey('Enter')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
  I.click('~Cancel search')

  I.waitForVisible('~More search options')
  I.click('~More search options')
  I.waitForVisible('.dropdown input[name="from"]')
  I.fillField('.dropdown input[name="from"]', 'john')
  I.waitForText('john@doe.com', 5, '.email')
  I.click('.list-item[data-cid]')
  I.pressKey('Enter')
  I.waitForInvisible('.dropdown input[name="from"]')
  I.seeNumberOfElements('.filter', 1)
  I.dontSee('From/To john@doe.com', '.filter')
  I.seeTextEquals('From john@doe.com', '.filter')
})

Scenario('[C8408] Try to run a script in search', async ({ I, mail, search }) => {
  I.login()
  I.waitForApp()
  search.doSearch('<script>document.body.innerHTML=\'I am a hacker\'</script>')
  I.dontSee('I am a hacker')
})

Scenario('Mail search has no further options except "Select All"', async ({ I, search, mail }) => {
  // Precondition: Some emails are in the inbox- and in a subfolder and have the subject "test".
  await I.haveMail({ path: 'media/mails/c8402_1.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForElement('~More message options')
  I.click('~More message options')
  I.see('Select all messages')
  I.see('Delete all messages')
  I.see('Sort by')
  I.click('.smart-dropdown-container')
  search.doSearch('test')
  mail.selectMail('test')
  I.click('~More message options')
  I.see('Select all messages')
  I.dontSee('Delete all messages')
  I.dontSee('Sort by')
  I.click('.smart-dropdown-container')
  search.cancel()
  I.click('~More message options')
  I.see('Select all messages')
  I.see('Select all messages')
  I.see('Delete all messages')
  I.see('Sort by')
})

Scenario('[OXUIB-1990] search with quotes that should give results', async ({ I, search, mail }) => {
  await I.haveMail({ path: 'media/mails/OXUIB-1990.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.fillField('#io-ox-topsearch .search-field', '"the hecklers pelted the discombobulated speaker with anything that came to hand"')
  I.pressKey('Enter')
  I.waitForText('Gedoehns')

  I.fillField('#io-ox-topsearch .search-field', '"the hecklers pelted"')
  I.pressKey('Enter')
  I.waitForText('Gedoehns')

  I.fillField('#io-ox-topsearch .search-field', '"the hecklers"')
  I.pressKey('Enter')
  I.waitForText('Gedoehns')

  I.fillField('#io-ox-topsearch .search-field', '"hecklers pelted"')
  I.pressKey('Enter')
  I.waitForText('Gedoehns')
})

Scenario('[OXUIB-1990] search with quotes that should not give results', async ({ I, search, mail }) => {
  await I.haveMail({ path: 'media/mails/OXUIB-1990.eml' })

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.fillField('#io-ox-topsearch .search-field', '"hecklers pelted discombobulated speaker anything came hand"')
  I.pressKey('Enter')
  I.waitForText('Search results')
  I.dontSee('Gedoehns')
})

Scenario('Search by translated "to:" keyword', async ({ I, search, mail }) => {
  const contact = {
    display_name: 'John Doe',
    email1: 'john@doe.com',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'John',
    last_name: 'Doe'
  }

  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveMail({ path: 'media/mails/c8404_1.eml' }),
    I.haveContact(contact)
  ])
  I.login('app=io.ox/mail')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'para:' + contact.email1)
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  I.see('Para ' + contact.email1)
  I.waitForText('Jane Doe')
})

Scenario('Search by "to:" keyword for non-english users', async ({ I, search, mail }) => {
  const contact = {
    display_name: 'John Doe',
    email1: 'john@doe.com',
    folder_id: await I.grabDefaultFolder('contacts'),
    first_name: 'John',
    last_name: 'Doe'
  }

  await Promise.all([
    I.haveSetting('io.ox/core//language', 'es_ES'),
    I.haveMail({ path: 'media/mails/c8404_1.eml' }),
    I.haveContact(contact)
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  I.waitForVisible('.search-field')
  I.fillField('.search-field', 'to:' + contact.email1)
  I.pressKey('Enter')
  I.waitForVisible('.filter')
  I.see('Para ' + contact.email1)
  I.waitForText('Jane Doe')
})

Scenario('[OXUIB-1991] search for mail address in mail body', async ({ I, mail, users }) => {
  await I.haveMail({ from: users[0], to: users[0], subject: 'testmail', content: 'test@test.io' })

  I.login()
  I.waitForApp()

  I.fillField('#io-ox-topsearch .search-field', 'test@test.io')
  I.pressKey('Enter')

  I.waitForText('Search results')
  I.waitForText('testmail', 5, '.list-view.mail-item')
  I.seeNumberOfVisibleElements('.list-view.mail-item .list-item', 2)
})
