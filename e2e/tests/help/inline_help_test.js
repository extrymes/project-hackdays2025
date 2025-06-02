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

Feature('General > Inline help')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Scenario('Open the help app in a floating window', async ({ I, mail, topbar }) => {
  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window', 5)

  I.say('case: same app')
  // mail app
  topbar.help()
  I.waitForVisible('.io-ox-help-window', 5)
  within({ frame: '.inline-help-iframe' }, () => {
    I.see('The Email Components')
  })
  // mail app

  // ensure that if you click help for the same active app only one window will open for that
  topbar.help()
  I.seeNumberOfElements('.io-ox-help-window', 1)

  I.click('~Close', '.io-ox-help-window')
  I.waitForDetached('.io-io-help-window', 5)

  I.say('case: different apps')
  // mail app
  topbar.help()
  I.waitForVisible('.io-ox-help-window', 5)
  within({ frame: '.inline-help-iframe' }, () => {
    I.see('The Email Components')
  })
  // mail compose app
  mail.newMail()
  topbar.help()
  I.seeNumberOfElements('.io-ox-help-window', 2)
})

Scenario('Open the help app in a modal', async ({ I, mail, dialogs }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()

  I.waitForElement('~Select contacts')
  I.click('~Select contacts')
  dialogs.waitForVisible()

  I.waitForElement('~Online help')
  I.click('~Online help', dialogs.header)
  I.waitForVisible('.modal.inline-help', 5)
  within({ frame: '.inline-help-iframe' }, () => {
    I.waitForVisible('.title')
    I.waitForText('Automatically Adding Contacts or Resources from an Address Book')
  })
})
