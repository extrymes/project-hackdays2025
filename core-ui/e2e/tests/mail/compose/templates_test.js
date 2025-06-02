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

Feature('Mail Compose > Templates')

Before(async ({ users }) => await users.create())

After(async ({ users }) => await users.removeAll())

const templates = [{
  content: '<p>This is very important</p>',
  displayname: 'Very important template',
  misc: {},
  module: 'io.ox/mail',
  type: 'template'
}, {
  content: '<p>Super duper legal stuff</p>',
  displayname: 'Legal information',
  misc: {},
  module: 'io.ox/mail',
  type: 'template'
}, {
  content: '<p>I am not a template</p>',
  displayname: 'Oh no I am a signature',
  misc: { insertion: 'below', 'content-type': 'text/html' },
  module: 'io.ox/mail',
  type: 'signature'
}]

Scenario('Compose new html mail and insert a template', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//messageFormat', 'html'),
    I.haveSetting('io.ox/core//features/templates', true),
    I.haveSnippet(templates[0]),
    I.haveSnippet(templates[1]),
    I.haveSnippet(templates[2])
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  mail.newMail()

  I.waitForVisible('~Templates')
  I.click('~Templates', '.composetoolbar')
  // make sure both templates show up, also check that signatures don't show up
  I.waitForText('Legal information', 5, '.smart-dropdown-container.open')
  I.waitForText('Super duper legal stuff', 5, '.smart-dropdown-container.open')
  I.waitForText('Very important template', 5, '.smart-dropdown-container.open')
  I.waitForText('This is very important', 5, '.smart-dropdown-container.open')
  I.dontSee('Oh no I am a signature')
  I.dontSee('I am not a template')

  I.clickDropdown('Very important template')
  I.waitForDetached('.smart-dropdown-container.open')

  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    I.waitForText('This is very important')
  })

  I.waitForVisible('~Templates')
  I.click('~Templates', '.composetoolbar')
  I.waitForText('Legal information', 5, '.smart-dropdown-container.open')

  I.clickDropdown('Legal information')
  I.waitForDetached('.smart-dropdown-container.open')

  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    // make sure both texts are there, no replacement
    I.waitForText('This is very important')
    I.waitForText('Super duper legal stuff')
  })
})

Scenario('Compose new text mail and insert a template', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting('io.ox/mail//messageFormat', 'text'),
    I.haveSetting('io.ox/core//features/templates', true),
    I.haveSnippet(templates[0]),
    I.haveSnippet(templates[1]),
    I.haveSnippet(templates[2])
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  mail.newMail()

  I.waitForVisible('~Templates')
  I.click('~Templates', '.composetoolbar')
  // make sure both templates show up, also check that signatures don't show up
  I.waitForText('Legal information', 5, '.smart-dropdown-container.open')
  I.waitForText('Super duper legal stuff', 5, '.smart-dropdown-container.open')
  I.waitForText('Very important template', 5, '.smart-dropdown-container.open')
  I.waitForText('This is very important', 5, '.smart-dropdown-container.open')
  I.dontSee('Oh no I am a signature')
  I.dontSee('I am not a template')

  I.clickDropdown('Very important template')
  I.waitForDetached('.smart-dropdown-container.open')

  const result1 = await I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')
  expect(result1).to.equal('This is very important')

  I.waitForVisible('~Templates')
  I.click('~Templates', '.composetoolbar')
  I.waitForText('Legal information', 5, '.smart-dropdown-container.open')

  I.clickDropdown('Legal information')
  I.waitForDetached('.smart-dropdown-container.open')

  const result2 = await I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')
  expect(result2).to.equal('This is very importantSuper duper legal stuff')
})

Scenario('Open template settings page from mail compose', async ({ I, mail, settings }) => {
  await Promise.all([
    I.haveSetting('io.ox/core//features/templates', true),
    I.haveSnippet(templates[0]),
    I.haveSnippet(templates[1]),
    I.haveSnippet(templates[2])
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  mail.newMail()

  I.waitForVisible('~Templates')
  I.click('~Templates', '.composetoolbar')
  I.waitForText('Edit templates...', 5, '.smart-dropdown-container.open')

  I.clickDropdown('Edit templates...')
  I.waitForDetached('.smart-dropdown-container.open')

  I.waitForText('Settings')
  I.waitForText('Add new template')

  // make sure both templates show up, also check that signatures don't show up
  I.waitForText('Legal information')
  I.waitForText('Super duper legal stuff')
  I.waitForText('Very important template')
  I.waitForText('This is very important')
  I.dontSee('Oh no I am a signature')
  I.dontSee('I am not a template')
})
