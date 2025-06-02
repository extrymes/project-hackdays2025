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

Feature('Settings > Mail templates')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => await users.removeAll())

const templates = [{
  content: '<p>ThisIsVeryImportant</p>',
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
Scenario('No templates settings if feature is disabled', async ({ I, dialogs, settings }) => {
  await I.haveSetting('io.ox/core//features/templates', false)

  I.login('settings=virtual/settings/io.ox/mail')
  I.waitForApp()
  I.dontSee('Templates')
})

Scenario('Create new template', async ({ I, dialogs, settings }) => {
  await I.haveSetting('io.ox/core//features/templates', true)

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/templates')
  I.waitForApp()

  I.waitForText('Add new template')
  I.click('Add new template')
  dialogs.waitForVisible()

  I.waitForVisible('.io-ox-snippet-dialog .contenteditable-editor iframe', 10)
  I.fillField('Template name', 'Test template')

  within({ frame: '.io-ox-snippet-dialog .contenteditable-editor iframe' }, () => {
    I.appendField('body', 'Hier könnte ihre Werbung stehen')
  })

  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)', 10)

  I.waitForText('Test template')
  I.waitForText('Hier könnte ihre Werbung stehen')
})

Scenario('Edit template', async ({ I, users, mail, dialogs, settings }) => {
  // order is important, make sure template 0 has the lowest id (is first in the list)
  await I.haveSnippet(templates[0])
  await Promise.all([
    I.haveSetting('io.ox/core//features/templates', true),
    I.haveSnippet(templates[1]),
    I.haveSnippet(templates[2])
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/templates')
  I.waitForApp()
  I.waitForText('Add new template')

  // make sure both templates show up, also check that signatures don't show up
  I.waitForText('Very important template')
  I.waitForText('ThisIsVeryImportant')
  I.waitForText('Legal information')
  I.waitForText('Super duper legal stuff')
  I.dontSee('Oh no I am a signature')
  I.dontSee('I am not a template')

  I.click('~Edit Very important template')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.fillField('Template name', 'Neuer Titel')
  within({ frame: '.contenteditable-editor iframe' }, () => {
    I.doubleClick('body')
    I.fillField('body', 'Neuer Content')
  })

  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.waitForText('Neuer Titel')
  I.waitForText('Neuer Content')
  I.dontSee('Very important template')
  I.dontSee('ThisIsVeryImportant')
})

Scenario('Delete template', async ({ I, settings, dialogs }) => {
  // order is important, make sure template 0 has the lowest id (is first in the list)
  await I.haveSnippet(templates[0])
  await Promise.all([
    I.haveSetting('io.ox/core//features/templates', true),
    I.haveSnippet(templates[1]),
    I.haveSnippet(templates[2])
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/templates')
  I.waitForApp()
  I.waitForText('Add new template')

  // make sure both templates show up, also check that signatures don't show up
  I.waitForText('Very important template')
  I.waitForText('ThisIsVeryImportant')
  I.waitForText('Legal information')
  I.waitForText('Super duper legal stuff')
  I.dontSee('Oh no I am a signature')
  I.dontSee('I am not a template')

  I.click('~Delete Very important template')
  I.waitForText('Do you really want to delete the template "Very important template"?')
  dialogs.clickButton('Delete')

  I.waitNumberOfVisibleElements('.io-ox-template-settings .settings-list-item', 1)

  I.waitForText('Legal information')
  I.waitForText('Super duper legal stuff')
  I.dontSee('Very important template')
  I.dontSee('ThisIsVeryImportant')
})
