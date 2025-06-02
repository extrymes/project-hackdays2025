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

Feature('Mail > AI Integration')

const { I } = inject()

Before(async ({ users }) => {
  await users.create()

  Promise.all([
    users[0].context.hasCapability('openai'),
    users[0].context.hasCapability('switchboard'),
    I.haveSetting({
      'io.ox/core': {
        features: {
          presence: true,
          openai: true
        },
        ai: {
          openai: {
            useAzure: true
          },
          hostname: 'main-ai-service.dev.oxui.de'
        },
        consent: {
          ai: { 'openai-azure': true }
        }
      }
    })
  ])
})

After(async ({ users }) => { await users.removeAll() })

Scenario('User has to provide consent to use AI features', async ({ I, mail, users, dialogs }) => {
  await I.haveSetting('io.ox/core//consent/ai/openai-azure', false)
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.waitForElement('iframe[title*="Rich Text Area"]')
  I.waitForInvisible('.window-blocker.io-ox-busy')

  I.waitForClickable('~Write or rephrase text')
  I.click('~Write or rephrase text')
  dialogs.waitForVisible()

  // don't give consent
  I.waitForText('I agree to submit the relevant data to the AI service when using AI-based features.')
  I.checkOption('I agree to submit the relevant data to the AI service when using AI-based features.')
  dialogs.clickButton('Cancel')
  I.waitForDetached(locate('.modal-dialog').withText('Your consent is required').as('Consent Dialog'))
  I.dontSeeElement('.modal-dialog')

  // try again
  I.click('~Write or rephrase text')
  I.waitForText('I agree to submit the relevant data to the AI service when using AI-based features.')
  I.seeAttributesOnElements('.modal-dialog .btn-primary', { disabled: true })
  I.checkOption('I agree to submit the relevant data to the AI service when using AI-based features.')
  dialogs.clickButton('Save')

  I.waitForText('Generate content')
})

Scenario('Reply to a mail with tone "Thanks"', async ({ I, mail, users, dialogs }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!', content: 'Please AI-ify me!' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Test subject!')
  I.waitForClickable('~AI integration (Davinci-003)')
  I.click('~AI integration (Davinci-003)')
  I.waitForText('Thanks ...', 5, '.dropdown.open .dropdown-menu')
  I.click('Thanks ...', '.dropdown.open .dropdown-menu')

  dialogs.waitForVisible()
  I.waitForText('Generate response', 5, dialogs.header)
  I.waitForText('The price for bubblegum decreased on thursday.', 5, dialogs.body)
  I.waitForValue('.modal-dialog select', 'thanks')
  dialogs.clickButton('Use response')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)

  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('The price for bubblegum decreased on thursday.')
  })
})

Scenario('Reply to a mail with tone "Later"', async ({ I, mail, users, dialogs }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!', content: 'Please AI-ify me!' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Test subject!')
  I.waitForClickable('~AI integration (Davinci-003)')
  I.click('~AI integration (Davinci-003)')
  I.waitForText('Later ...', 5, '.dropdown.open .dropdown-menu')
  I.click('Later ...', '.dropdown.open .dropdown-menu')

  dialogs.waitForVisible()
  I.waitForText('Generate response', 5, dialogs.header)
  I.waitForText('The price for bubblegum decreased on thursday.', 5, dialogs.body)
  I.waitForValue('.modal-dialog select', 'later')
  dialogs.clickButton('Use response')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('The price for bubblegum decreased on thursday.')
  })
})

Scenario('Translate a mail to $current_language', async ({ I, mail, users, dialogs }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!', content: 'Please AI-ify me!' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Test subject!')
  I.waitForClickable('~AI integration (Davinci-003)')
  I.click('~AI integration (Davinci-003)')
  I.waitForText('Translate to English', 5, '.dropdown.open .dropdown-menu')
  I.click('Translate to English', '.dropdown.open .dropdown-menu')

  I.waitForText('Translation', 5, '.gpt-task')
  I.waitForText('The price for bubblegum decreased on thursday.', 5, '.gpt-output')
})

Scenario('Generate content for a new mail', async ({ I, mail, users, dialogs }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.waitForElement('iframe[title*="Rich Text Area"]')
  I.waitForInvisible('.window-blocker.io-ox-busy')

  I.waitForClickable('~Write or rephrase text')
  I.click('~Write or rephrase text')
  dialogs.waitForVisible()
  I.waitForText('Generate content', 5, dialogs.header)
  I.waitForText('Your input', 5, dialogs.body)
  I.dontSee('Generated result', dialogs.body)
  I.waitForValue('.modal-dialog select', 'write')
  I.fillField(locate('textarea').inside('.modal-dialog'), 'Bubblegum')
  dialogs.clickButton('Generate')
  I.waitForText('The price for bubblegum decreased on thursday.', 5, dialogs.body)
  dialogs.clickButton('Use content')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('The price for bubblegum decreased on thursday.')
  })
})

Scenario('Reply to a mail with generated content', async ({ I, mail, users, dialogs }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!', content: 'Please AI-ify me!' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Test subject!')
  I.waitForClickable('~AI integration (Davinci-003)')
  I.click('~AI integration (Davinci-003)')
  I.waitForText('Generate response ...', 5, '.dropdown.open .dropdown-menu')
  I.click('Generate response ...', '.dropdown.open .dropdown-menu')

  dialogs.waitForVisible()
  I.waitForText('Generate response', 5, dialogs.header)
  I.waitForText('Your input', 5, dialogs.body)
  I.dontSee('Generated result', dialogs.body)
  I.waitForValue('.modal-dialog select', 'write')
  I.fillField(locate('textarea').inside('.modal-dialog'), 'Bubblegum')
  dialogs.clickButton('Generate')
  I.waitForText('The price for bubblegum decreased on thursday.', 5, dialogs.body)
  dialogs.clickButton('Use response')
  I.waitForDetached('.modal-dialog')

  I.waitForVisible('.active .io-ox-mail-compose [placeholder="To"]', 30)
  I.waitForInvisible('.active.io-ox-mail-compose-window .window-blocker', 30)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('The price for bubblegum decreased on thursday.')
  })
})

Scenario('Summarize a mail', async ({ I, mail, users, dialogs }) => {
  const sender = [[users[0].get('display_name'), users[0].get('primaryEmail')]]
  await I.haveMail({ from: sender, to: sender, subject: 'Test subject!', content: 'Please AI-ify me!' })
  I.login('app=io.ox/mail')
  I.waitForApp()

  mail.selectMail('Test subject!')
  I.waitForClickable('~AI integration (Davinci-003)')
  I.click('~AI integration (Davinci-003)')
  I.waitForText('Summarize', 5, '.dropdown.open .dropdown-menu')
  I.click('Summarize', '.dropdown.open .dropdown-menu')

  I.waitForText('Summary', 5, '.gpt-task')
  I.waitForText('The price for bubblegum decreased on thursday.', 5, '.gpt-output')
})

Scenario('Usage with plain-text mails', async ({ I, mail, users, dialogs }) => {
  I.login()
  I.waitForApp()

  mail.newMail()
  I.click('~Mail compose actions')
  I.clickDropdown('Plain Text')

  I.fillField('Subject', 'Test subject!')
  I.fillField('To', users[0].get('primaryEmail'))

  I.click('~Write or rephrase text')
  dialogs.waitForVisible()

  I.click('Generate')
  I.waitForText('The price for bubblegum decreased on thursday.', 5, dialogs.body)
  I.click('Use content')
  mail.send()

  I.waitForText('Test subject!')
  mail.selectMail('Test subject!')
  I.waitForText('The price for bubblegum decreased on thursday.')
})
