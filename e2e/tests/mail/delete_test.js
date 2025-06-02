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

const expect = require('chai').expect

Feature('Mail > Delete')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C7405] - Delete E-Mail', async ({ I, users, mail }) => {
  const [alice, bob] = users
  const mailText = `C7405 - ${Math.round(+new Date() / 1000)}`
  await I.haveSetting('io.ox/mail//messageFormat', 'text')
  I.login('app=io.ox/mail', { user: alice })
  I.waitForApp()
  mail.newMail()
  I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', bob.get('primaryEmail'))
  I.pressKey('Enter')
  I.fillField('.io-ox-mail-compose [name="subject"]', mailText)
  I.fillField({ css: 'textarea.plain-text' }, mailText)
  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: bob })
  I.selectFolder('Inbox')
  I.waitForText(mailText, 5, '.subject')
  I.click(`.list-item[aria-label*="${mailText}"]`)
  I.waitForEnabled('~Delete')
  I.click('~Delete')
  I.waitForDetached(`.list-item[aria-label*="${mailText}"]`)
  I.dontSee(mailText)
  I.selectFolder('Trash')
  I.waitForText(mailText, 2, '.list-item')
  I.see(mailText)
})

const getCheckboxBackgroundImage = async () => {
  const { I } = inject()
  return await I.executeScript(() => {
    const node = document.querySelector('.list-item.selected .list-item-checkmark')
    return window.getComputedStyle(node, ':before').getPropertyValue('background-image')
  })
}

// TODO: Adjust scenario title to include selection mode aspect
Scenario('[C7406] - Delete several E-Mails', async ({ I, mail, users }) => {
  await Promise.all([
    I.haveSetting({
      'io.ox/mail': { messageFormat: 'text', listViewLayout: 'checkboxes' },
      'io.ox/core': { selectionMode: 'alternative' }
    }),
    I.haveMail({ path: 'media/mails/generic-monday.eml' }),
    I.haveMail({ path: 'media/mails/generic-tuesday.eml' }),
    I.haveMail({ path: 'media/mails/generic-wednesday.eml' }),
    I.haveMail({ path: 'media/mails/generic-thursday.eml' })
  ])

  I.login('app=io.ox/mail')
  I.selectFolder('Inbox')
  I.waitForApp()
  I.waitForElement('.list-item', 5)

  // select, check 'alternative' selection, delete
  mail.selectMail('Monday')
  I.waitForElement('.list-item.selected.no-checkbox .list-item-checkmark')
  expect(await getCheckboxBackgroundImage()).to.match(/^none/)
  I.click('~Delete')
  I.waitForDetached('[title="Monday"]')

  // check 'alternative' selection (autoselect after delete)
  I.waitForElement('.list-item.selected.no-checkbox .list-item-checkmark')
  expect(await getCheckboxBackgroundImage()).to.match(/^none/)

  // delete second mail
  mail.selectMail('Tuesday')
  I.click('~Delete')
  I.waitForDetached('[title="Tuesday"]')

  // check trash
  I.selectFolder('Trash')
  I.waitForText('Trash', 5, '.folder-name')
  let loopcounter = 0
  while (await I.grabNumberOfVisibleElements('.mail-item .list-item') !== 2) {
    I.waitForNetworkTraffic()
    I.triggerRefresh()
    I.wait(1)
    loopcounter++
    if (loopcounter === 15) break
  }
  I.waitForElement('[title="Monday"]')
  I.waitForElement('[title="Tuesday"]')

  await I.haveSetting({ 'io.ox/core': { selectionMode: 'normal' } })
  I.refreshPage()
  I.selectFolder('Inbox')

  // select, check 'normal' selection, delete
  mail.selectMail('Wednesday')
  I.waitForElement('.list-item.selected .list-item-checkmark')
  expect(await getCheckboxBackgroundImage()).to.include('data:image/svg+xml')
  I.click('~Delete')
  I.waitForDetached('[title="Wednesday"]')

  // check 'normal' selection (autoselect after delete)
  I.waitForElement('.list-item.selected .list-item-checkmark')
  expect(await getCheckboxBackgroundImage()).to.include('data:image/svg+xml')
})

Scenario('[C265146] Delete with setting selectBeforeDelete=false', async ({ I, mail, users }) => {
  await Promise.all([
    I.haveMail({
      subject: 'Test E-Mail 1',
      attachments: [{ content: 'C265146\r\n', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      to: users[0],
      sendtype: 0
    }),
    I.haveMail({
      subject: 'Test E-Mail 2',
      attachments: [{ content: 'C265146\r\n', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      to: users[0],
      sendtype: 0
    })
  ])

  await I.haveSetting('io.ox/mail//features/selectBeforeDelete', false)

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Test E-Mail 1')
  mail.selectMail('Test E-Mail 1')
  I.click('~Delete')
  I.wait(1)
  I.waitForText('No message selected')
})
