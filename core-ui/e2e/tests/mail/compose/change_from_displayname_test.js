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

Feature('Mail Compose')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

function checkSenderDropdown (name, address) {
  // TODO: This function should be gone when rewriting this test
  const { I } = inject()
  const node = locate('.active .io-ox-mail-compose').as('compose window')
  const toggle = node.find('[data-dropdown="from"]>a').as('sender dropdown toggle')
  const dropdown = locate('.smart-dropdown-container').as('sender dropdown')
  I.waitForVisible(node.find('.mail-input').withText(name || '').as('sender'))
  I.wait(0.5)
  I.waitForVisible(toggle)
  I.click(toggle)
  I.waitForVisible(dropdown)
  I.waitForVisible(dropdown.find(`a[data-name="from"][data-value*="${name || 'null'}"]`).as('node with name value'))
  I.waitForVisible(dropdown.find(`a[data-name="from"][data-value*="${address}"]`).as('node with mail value'))
  I.waitForElement(dropdown.find('.name').withText(name || ''))
  I.waitForElement(dropdown.find('.address').withText(name ? `<${address}>` : address))
  I.pressKey('Escape')
  I.waitForDetached(dropdown)
}

Scenario('[OXUIB-142] Compose windows uses latest mail account name', async ({ I, users, mail, settings }) => {
  // TODO: Rewrite this test
  const [user] = users
  const address = users[0].get('primaryEmail')
  const customDisplayNames = {}
  customDisplayNames[`${user.get('primaryEmail')}`] = {
    name: `${user.get('given_name')} ${user.get('sur_name')}`,
    overwrite: false,
    defaultName: `${user.get('given_name')} ${user.get('sur_name')}`
  }
  await I.haveSetting({
    'io.ox/mail': {
      customDisplayNames,
      sendDisplayName: true,
      didYouKnow: { saveOnCloseDontShowAgain: true } // cSpell:disable-line
    }
  })

  I.login('app=io.ox/mail')
  I.openApp('Mail')
  mail.newMail()
  I.fillField('Subject', 'to be edited')
  I.click('~Mail compose actions')
  I.clickDropdown('Save draft and close')

  let name = 'Cameron Tucker'
  I.refreshPage()
  I.waitForApp()
  settings.open('Accounts')
  I.waitForVisible('.settings-list-item button.action')
  I.waitForText('Edit', 5, '.settings-list-item')
  I.retry(5).click('Edit')
  I.fillField('Your name', name)
  I.click('Save')
  I.waitForVisible('.io-ox-alert')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-alert')

  // new mail
  I.openApp('Mail')
  mail.newMail()
  checkSenderDropdown(name, address)
  I.fillField('Subject', 'new mail')
  I.click('~Minimize', '.io-ox-mail-compose-window.active')
  I.waitForInvisible('.io-ox-mail-compose')

  // edited draft
  I.selectFolder('Drafts')
  I.waitForElement('.list-item.selectable [title="to be edited"]')
  I.click('.list-item.selectable [title="to be edited"]')
  I.click('~Edit copy')
  checkSenderDropdown(name, address)
  I.click('~Minimize', '.io-ox-mail-compose-window.active')
  I.waitForInvisible('.io-ox-mail-compose')

  I.click('#io-ox-refresh-icon')
  mail.selectMail('[Copy] to be edited')
  I.see(name, '.person-from')
  mail.selectMail('new mail')
  I.see(name, '.person-from')

  // check loaded compose instances
  name = 'Example'
  settings.open('Accounts')
  I.waitForVisible('.settings-list-item button.action')
  I.waitForText('Edit', 5, '.settings-list-item')
  I.retry(5).click('Edit', '.settings-list-item')
  I.fillField('Your name', name)
  I.click('Save')
  I.waitForVisible('.io-ox-alert')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-alert')

  I.say(`${name}: new mail`)
  I.waitForVisible('.taskbar-button[aria-label="new mail"]')
  I.click('.taskbar-button[aria-label="new mail"]')
  checkSenderDropdown(name, address)
  I.fillField('Subject', 'Edit #1')
  I.click('~Minimize', '.io-ox-mail-compose-window.active')
  I.waitForInvisible('.io-ox-mail-compose')

  I.say(`${name}: edited mail`)
  I.waitForVisible('.taskbar-button[aria-label="[Copy] to be edited"]')
  I.click('.taskbar-button[aria-label="[Copy] to be edited"]')
  checkSenderDropdown(name, address)
  I.fillField('Subject', 'Edit #2')
  I.click('~Minimize', '.io-ox-mail-compose-window.active')
  I.waitForInvisible('.io-ox-mail-compose')

  I.say(`${name}: check detail views`)
  I.click('#io-ox-refresh-icon')
  mail.selectMail('Edit #1')
  I.waitForText(name, 60, '.person-from')
  I.see(name, '.person-from')
  mail.selectMail('Edit #2')
  I.see(name, '.person-from')
})

Scenario('[C163026] Change from display name when sending a mail', async ({ I, users, mail, dialogs }) => {
  const address = users[0].get('primaryEmail')
  let name = `${users[0].get('given_name')} ${users[0].get('sur_name')}`

  await I.haveSetting('io.ox/mail//messageFormat', 'text')

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  checkSenderDropdown(name, address)

  // change custom name
  name = 'Gloria Example'
  I.click('.io-ox-mail-compose [data-dropdown="from"]>a')
  I.waitForVisible('.dropdown.open [data-name="edit-real-names"]', 5)
  I.clickDropdown('Edit names')
  dialogs.waitForVisible()
  I.waitForVisible('.name-overwrite-view .checkbox input[type="checkbox"]', 5)
  I.click('.name-overwrite-view .checkbox input[type="checkbox"]', dialogs.body)
  I.fillField('.modal-body input[title="Custom name"]', name)
  dialogs.clickButton('Save')
  I.waitForDetached('.modal-dialog')

  // check custom name
  I.waitForText(name, 5, '.io-ox-mail-compose .mail-compose-fields [aria-label="From"] .name')
  I.waitForText(`<${users[0].get('primaryEmail')}>`, 5, '.io-ox-mail-compose .mail-compose-fields [aria-label="From"] .address')
  checkSenderDropdown(name, address)

  // disable "send names"
  name = null
  I.click('.io-ox-mail-compose [data-dropdown="from"]>a')
  I.waitForVisible('.dropdown.open [data-name="edit-real-names"]', 5)
  I.click('.dropdown [data-name="sendDisplayName"]')
  I.waitForElement('.dropdown.open [data-value^="[null,"]')
  I.click('.dropdown [data-name="from"]')
  I.waitForText(users[0].get('primaryEmail'), 5, '.io-ox-mail-compose .mail-compose-fields [aria-label="From"] .address')
  if (name) I.dontSee(name, '.io-ox-mail-compose .mail-compose-fields [aria-label="From"] .name')
  I.waitForText('This email just contains your email address as sender. Your real name is not used.', 5, '.io-ox-mail-compose .sender-realname .mail-input')
  checkSenderDropdown(name, address)
})
