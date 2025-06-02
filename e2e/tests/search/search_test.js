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

Feature('General > Search')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

// Hint: not reliably failing when broken (race condition)
Scenario('[OXUIB-2110] Solely visible app search field on app hopping', async ({ I, mail }) => {
  await I.haveSetting({
    'io.ox/core': {
      apps: {
        quickLaunchCount: 5,
        quickLaunch: 'io.ox/mail,io.ox/calendar,io.ox/contacts,io.ox/files,io.ox/tasks'
      }
    }
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // contacts
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/contacts"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/contacts"]')
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForVisible('.search-field[placeholder="Search mail"]')
  I.seeNumberOfVisibleElements('.search-view', 1)

  // drive
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/files"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/files"]')
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForVisible('.search-field[placeholder="Search mail"]')
  I.seeNumberOfVisibleElements('.search-view', 1)

  // tasks
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/tasks"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/tasks"]')
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForVisible('.search-field[placeholder="Search mail"]')
  I.seeNumberOfVisibleElements('.search-view', 1)

  // calendar
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/calendar"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/calendar"]')
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForVisible('.search-field[placeholder="Search mail"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
})

Scenario('[OXUIB-2110] Solely visible app search field on app cascading', async ({ I, mail, calendar, contacts, drive, tasks }) => {
  await I.haveSetting({
    'io.ox/core': {
      apps: {
        quickLaunchCount: 5,
        quickLaunch: 'io.ox/mail,io.ox/calendar,io.ox/contacts,io.ox/files,io.ox/tasks'
      }
    }
  })

  I.login('app=io.ox/mail')

  // calendar
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/calendar"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/calendar"]')
  I.waitForVisible('.search-field[placeholder="Search appointments"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
  // contacts
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/contacts"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/contacts"]')
  I.waitForVisible('.search-field[placeholder="Search contacts"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
  // drive
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/files"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/files"]')
  I.waitForVisible('.search-field[placeholder="Search files"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
  // tasks
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/tasks"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/tasks"]')
  I.waitForVisible('.search-field[placeholder="Search tasks"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
  // back to mail
  I.waitForClickable('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.click('#io-ox-quicklaunch [data-app-name="io.ox/mail"]')
  I.waitForVisible('.search-field[placeholder="Search mail"]')
  I.seeNumberOfVisibleElements('.search-view', 1)
})

Scenario('Mail address parsing in different apps', ({ I, mail, contacts, calendar, users }) => {
  const [user] = users
  const userName = user.get('given_name')

  I.login()
  I.waitForApp()

  I.fillField('Search mail', user.get('primaryEmail'))

  I.pressKey('Enter')
  I.waitForText('Search results')
  I.seeInField('Search mail', user.get('primaryEmail'))
  I.dontSeeElement('.filters .filter')

  I.click('~Cancel search')
  I.fillField('Search mail', userName)
  I.waitForVisible('.auto-suggestion')
  I.pressKey('Tab')
  I.dontSeeInField('Search mail', 'address:')

  I.pressKey('Enter')
  I.dontSeeElement('.filters .filter')

  I.openApp('Calendar')
  I.waitForApp()

  I.fillField('Search appointments', user.get('primaryEmail'))

  I.pressKey('Enter')
  I.waitForText('Search results')
  I.dontSeeInField('Search appointments', user.get('primaryEmail'))
  I.waitForVisible('.filters .filter')
  I.waitForText('Participant', 5, '.filters .filter')
  I.waitForText(user.get('primaryEmail'), 5, '.filters .filter')

  I.click('~Cancel search', '.search-view[data-point="io.ox/calendar/search/dropdown"]')
  I.fillField('Search appointments', userName)
  I.waitForVisible('.auto-suggestion')
  I.pressKey('Tab')
  I.dontSeeInField('Search appointments', 'participant:')

  I.pressKey('Enter')
  I.waitForText('Participant', 5, '.filters .filter')
  I.waitForText(user.get('primaryEmail'), 5, '.filters .filter')

  I.openApp('Address Book')
  I.waitForApp()

  I.fillField('Search contacts', user.get('primaryEmail'))

  I.pressKey('Enter')
  I.waitForText('Search results')
  I.seeInField('Search contacts', user.get('primaryEmail'))
  I.dontSee('Email', '.filters .filter')

  I.click('~Cancel search', '.search-view[data-point="io.ox/contacts/search/dropdown"]')
  I.fillField('Search contacts', userName)
  I.waitForVisible('.auto-suggestion')
  I.pressKey('Tab')
  I.dontSeeInField('Search contacts', 'email:')

  I.pressKey('Enter')
  I.dontSee('Email', '.filters .filter')
})

Scenario('Search field is focused on keyboard shortcut', ({ I, mail, contacts, calendar, users }) => {
  I.haveSetting({
    'io.ox/core': { features: { shortcuts: true } }
  })
  I.login()
  I.openApp('Mail')
  I.waitForApp()
  I.pressKey(['/'])
  I.waitForFocus('[placeholder="Search mail"]')

  I.openApp('Calendar')
  I.waitForApp()
  I.pressKey(['/'])
  I.waitForFocus('[placeholder="Search appointments"]')

  I.openApp('Address Book')
  I.waitForApp()
  I.pressKey(['/'])
  I.waitForFocus('[placeholder="Search contacts"]')

  I.openApp('Tasks')
  I.waitForApp()
  I.pressKey(['/'])
  I.waitForFocus('[placeholder="Search tasks"]')
})
