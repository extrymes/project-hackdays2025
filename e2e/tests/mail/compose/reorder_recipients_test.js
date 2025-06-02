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

Before(async ({ users }) => {
  await users.create() // Sender
  await users.create() // users[1]
  await users.create() // users[2]
  await users.create() // users[3]
  await users.create() // users[4]
})

After(async ({ users }) => { await users.removeAll() })

Scenario('[C8832] Re-order recipients', async ({ I, users, mail }) => {
  const mailSubject = 'C8832 Move recipients between between field'

  I.login('app=io.ox/mail')
  mail.newMail()
  I.click('~Maximize')
  I.click('CC')
  I.click('BCC')
  I.fillField('Subject', mailSubject)
  // add a recipient for all fields
  I.fillField('To', users[1].get('primaryEmail'))
  I.waitForVisible('.focus .tt-dropdown-menu')
  I.pressKey('Enter')
  I.see(`${users[1].get('given_name')} ${users[1].get('sur_name')}`, '.tokenfield.to')
  I.fillField('CC', users[2].get('primaryEmail'))
  I.waitForVisible('.focus .tt-dropdown-menu')
  I.pressKey('Enter')
  I.see(`${users[2].get('given_name')} ${users[2].get('sur_name')}`, '.tokenfield.cc')
  I.fillField('BCC', users[3].get('primaryEmail'))
  I.waitForVisible('.focus .tt-dropdown-menu')
  I.pressKey('Enter')
  I.see(`${users[3].get('given_name')} ${users[3].get('sur_name')}`, '.tokenfield.bcc')
  I.fillField('BCC', users[4].get('primaryEmail'))
  I.waitForVisible('.focus .tt-dropdown-menu')
  I.pressKey('Enter')
  I.see(`${users[4].get('given_name')} ${users[4].get('sur_name')}`, '.tokenfield.bcc')
  // move around: from bcc to cc

  I.dragAndDrop(`~${users[4].get('given_name')} ${users[4].get('sur_name')} ${users[4].get('primaryEmail')}`, '.tokenfield.cc .token-input.tt-input')
  I.waitForText(
    `${users[2].get('given_name')} ${users[2].get('sur_name')}${users[4].get('given_name')} ${users[4].get('sur_name')}`,
    5, '.tokenfield.cc'
  )
  I.dontSee(`${users[4].get('given_name')} ${users[4].get('sur_name')}`, '.tokenfield.bcc')
  I.waitForFocus(`~${users[4].get('given_name')} ${users[4].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)

  // move around: from cc to bcc

  I.dragAndDrop(`~${users[4].get('given_name')} ${users[4].get('sur_name')} ${users[4].get('primaryEmail')}`, '.tokenfield.bcc .token-input.tt-input')
  I.waitForText(
    `${users[3].get('given_name')} ${users[3].get('sur_name')}${users[4].get('given_name')} ${users[4].get('sur_name')}`,
    5, '.tokenfield.bcc'
  )
  I.dontSee(`${users[4].get('given_name')} ${users[4].get('sur_name')}`, '.tokenfield.cc')
  I.waitForFocus(`~${users[4].get('given_name')} ${users[4].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)
  // move around: from cc to to

  I.dragAndDrop(`~${users[4].get('given_name')} ${users[4].get('sur_name')} ${users[4].get('primaryEmail')}`, '.tokenfield.to .token-input.tt-input')
  I.waitForText(
    `${users[1].get('given_name')} ${users[1].get('sur_name')}${users[4].get('given_name')} ${users[4].get('sur_name')}`,
    5, '.tokenfield.to'
  )
  I.waitForFocus(`~${users[4].get('given_name')} ${users[4].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)
  // drag to first position in field

  I.dragAndDrop('.tokenfield.to .token:nth-of-type(4)', '.tokenfield.to .token:nth-of-type(3)')
  I.waitForText(
    `${users[4].get('given_name')} ${users[4].get('sur_name')}${users[1].get('given_name')} ${users[1].get('sur_name')}`,
    5, '.tokenfield.to'
  )
  I.waitForFocus(`~${users[4].get('given_name')} ${users[4].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)

  I.click('.tokenfield.to .token-input.tt-hint')
  I.seeNumberOfElements('.token.active', 0)

  // check if all tokens get deselected upon clicking different tokenfield
  I.click(`~${users[1].get('given_name')} ${users[1].get('sur_name')}`)
  I.click('.tokenfield.cc .token-input.tt-input')
  I.seeNumberOfVisibleElements('.token.active', 0)

  // check clicking tokens in different fields
  I.click(`~${users[1].get('given_name')} ${users[1].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)
  I.click(`~${users[2].get('given_name')} ${users[2].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)
  I.click(`~${users[3].get('given_name')} ${users[3].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)
  I.click(`~${users[4].get('given_name')} ${users[4].get('sur_name')}`)
  I.seeNumberOfVisibleElements('.token.active', 1)

  // send the mail
  mail.send()

  // open detail view of sent mail
  I.selectFolder('Sent')
  mail.selectMail(mailSubject)

  // check recipients
  I.click('.show-all-recipients')
  I.see(`${users[1].get('given_name')} ${users[1].get('sur_name')}`, '.person-to')
  I.see(`${users[4].get('given_name')} ${users[4].get('sur_name')}`, '.person-to')
  I.see(`${users[2].get('given_name')} ${users[2].get('sur_name')}`, '.person-cc')
  I.see(`${users[3].get('given_name')} ${users[3].get('sur_name')}`, '.person-bcc')
})
