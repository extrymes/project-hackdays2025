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

Feature('Mail Compose > HTML signatures')

Before(async ({ users }) => { await users.create() })

After(async function ({ users }) {
  await users.removeAll()
  signatures.forEach(signature => delete signature.id)
})

// differrent variants in tinymce
const emptyLine = '(' +
  '<div><br></div>' + '|' +
  '<div><br>&nbsp;</div>' + '|' +
  '<div class="default-style"><br></div>' + '|' +
  '<div class="default-style"><br>&nbsp;</div>' + '|' +
  '<div class="default-style" style=""><br></div>' + '|' +
  '<div class="default-style" style=""><br>&nbsp;</div>' +
')'
const someUserInput = '(' +
  '<div>some user input</div>' + '|' +
  '<div class="default-style">some user input</div>' + '|' +
  '<div class="default-style" style="">some user input</div>' +
')'

const signatures = [{
  content: '<p>The content of the first signature</p>',
  displayname: 'First signature above',
  misc: { insertion: 'above', 'content-type': 'text/html' },
  module: 'io.ox/mail',
  type: 'signature'
}, {
  content: '<p>The content of the second signature</p>',
  displayname: 'Second signature above',
  misc: { insertion: 'above', 'content-type': 'text/html' },
  module: 'io.ox/mail',
  type: 'signature'
}, {
  content: '<p>The content of the third signature</p>',
  displayname: 'First signature below',
  misc: { insertion: 'below', 'content-type': 'text/html' },
  module: 'io.ox/mail',
  type: 'signature'
}, {
  content: '<p>The content of the fourth signature</p>',
  displayname: 'Second signature below',
  misc: { insertion: 'below', 'content-type': 'text/html' },
  module: 'io.ox/mail',
  type: 'signature'
}]

async function selectAndAssertSignature (name, content = 'signature', compare) {
  const { I } = inject()
  I.waitForVisible('~Mail compose actions')
  I.click('~Mail compose actions', '.composetoolbar')
  I.waitForText(name, 5, '.smart-dropdown-container.open')
  I.clickDropdown(name)
  I.waitForDetached('.smart-dropdown-container.open')
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    I.waitForText(content)
    const result = await I.grabHTMLFrom('body')
    if (compare instanceof RegExp) expect(result).to.match(compare)
    else expect(result).to.equal(compare)
  })
}

Scenario('Compose new mail with signature above correctly placed and changed', async ({ I, mail }) => {
  for (const signature of signatures) {
    const response = await I.haveSnippet(signature)
    signature.id = response.data
  }
  await Promise.all([
    I.haveSetting('io.ox/mail//defaultSignature', signatures[0].id),
    I.haveSetting('io.ox/mail//messageFormat', 'html'),
    I.haveSetting('io.ox/mail//compose/signatureLimit', 5)
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  mail.newMail()

  // blockquote only
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[0].content}</div>`)
    )
  })
  await selectAndAssertSignature('Second signature above', 'The content of the second signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[1].content}</div>$`))
  await selectAndAssertSignature('First signature below', 'The content of the third signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[2].content}</div>$`))
  await selectAndAssertSignature('Second signature below', 'The content of the fourth signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[3].content}</div>$`))
  await selectAndAssertSignature('No signature', '', new RegExp('^' + emptyLine + '$'))
  await selectAndAssertSignature('First signature above', 'The content of the first signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[0].content}</div>$`))

  // blockquote and user input
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    // insert some text
    I.appendField('body', 'some user input')
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[0].content}</div>`)
    )
  })
  await selectAndAssertSignature('Second signature above', 'The content of the second signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[1].content}</div>$`))
  await selectAndAssertSignature('First signature below', 'The content of the third signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[2].content}</div>$`))
  await selectAndAssertSignature('Second signature below', 'The content of the fourth signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[3].content}</div>$`))
  await selectAndAssertSignature('No signature', '', new RegExp(`^${someUserInput}$`))
  await selectAndAssertSignature('First signature above', 'The content of the first signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[0].content}</div>$`))

  // // discard mail
  I.click('~Close', '.io-ox-mail-compose-window')
  I.click('Delete draft')
  I.waitForVisible('.io-ox-mail-window')
})

Scenario('Compose new mail with signature below correctly placed initially', async ({ I, mail }) => {
  for (const signature of signatures) {
    const response = await I.haveSnippet(signature)
    signature.id = response.data
  }
  await Promise.all([
    I.haveSetting('io.ox/mail//defaultSignature', signatures[2].id),
    I.haveSetting('io.ox/mail//messageFormat', 'html'),
    I.haveSetting('io.ox/mail//compose/signatureLimit', 5)
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')

  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[2].content}</div>`)
    )
  })

  // discard mail
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForVisible('.io-ox-mail-window')
})

Scenario('Reply to mail with signature above correctly placed and changed', async ({ I, users, mail }) => {
  for (const signature of signatures) {
    const response = await I.haveSnippet(signature)
    signature.id = response.data
  }
  await Promise.all([
    I.haveSetting('io.ox/mail//defaultReplyForwardSignature', signatures[0].id),
    I.haveSetting('io.ox/mail//messageFormat', 'html'),
    I.haveSetting('io.ox/mail//compose/signatureLimit', 5),
    I.haveMail({
      attachments: [{
        content: '<div>Test content</div>',
        content_type: 'text/html',
        disp: 'inline'
      }],
      from: users[0],
      sendtype: 0,
      subject: 'Test subject',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window')
  I.waitForApp()

  // click on first email
  mail.selectMail('Test subject')

  // reply to that mail
  I.waitForVisible('~Reply')
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForFocus('.io-ox-mail-compose iframe')

  // blockquote only
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[0].content}</div><blockquote type="cite">.*</blockquote>$`)
    )
  })
  await selectAndAssertSignature('Second signature above', 'The content of the second signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[1].content}</div><blockquote type="cite">.*</blockquote>$`))
  await selectAndAssertSignature('First signature below', 'The content of the third signature', new RegExp(`^${emptyLine}<blockquote type="cite">.*</blockquote>${emptyLine}<div class="io-ox-signature">${signatures[2].content}</div>$`))
  await selectAndAssertSignature('Second signature below', 'The content of the fourth signature', new RegExp(`^${emptyLine}<blockquote type="cite">.*</blockquote>${emptyLine}<div class="io-ox-signature">${signatures[3].content}</div>$`))
  await selectAndAssertSignature('No signature', '', new RegExp(`^${emptyLine}<blockquote type="cite">.*</blockquote>$`))
  await selectAndAssertSignature('First signature above', 'The content of the first signature', new RegExp(`^${emptyLine}<div class="io-ox-signature">${signatures[0].content}</div><blockquote type="cite">.*</blockquote>$`))

  // blockquote and user input
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    // insert some text
    I.appendField('body', 'some user input')
    expect(await I.grabHTMLFrom('body')).to.match(
      /^<div( class="default-style" style="")?>some user input<\/div><div class="io-ox-signature">.*<\/div><blockquote type="cite">.*<\/blockquote>$/
    )
  })
  await selectAndAssertSignature('Second signature above', 'The content of the second signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[1].content}</div><blockquote type="cite">.*</blockquote>$`))
  await selectAndAssertSignature('First signature below', 'The content of the third signature', new RegExp(`^${someUserInput}<blockquote type="cite">.*</blockquote>${emptyLine}<div class="io-ox-signature">${signatures[2].content}</div>$`))
  await selectAndAssertSignature('Second signature below', 'The content of the fourth signature', new RegExp(`^${someUserInput}<blockquote type="cite">.*</blockquote>${emptyLine}<div class="io-ox-signature">${signatures[3].content}</div>$`))
  await selectAndAssertSignature('No signature', '', new RegExp(`^${someUserInput}<blockquote type="cite">.*</blockquote>$`))
  await selectAndAssertSignature('First signature above', 'The content of the first signature', new RegExp(`^${someUserInput}<div class="io-ox-signature">${signatures[0].content}</div><blockquote type="cite">.*</blockquote>$`))

  // discard mail
  I.click('~Close', '.io-ox-mail-compose-window')
  I.click('Delete draft')
  I.waitForVisible('.io-ox-mail-window')
})

Scenario('Reply to mail with signature below correctly placed initially', async ({ I, users, mail }) => {
  for (const signature of signatures) {
    const response = await I.haveSnippet(signature)
    signature.id = response.data
  }

  await Promise.all([
    I.haveSetting('io.ox/mail//defaultReplyForwardSignature', signatures[2].id),
    I.haveSetting('io.ox/mail//messageFormat', 'html'),
    I.haveSetting('io.ox/mail//compose/signatureLimit', 5),
    I.haveMail({
      attachments: [{
        content: '<div>Test content</div>',
        content_type: 'text/html',
        disp: 'inline'
      }],
      from: users[0],
      sendtype: 0,
      subject: 'Test subject',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // click on first email
  mail.selectMail('Test subject')
  I.waitForText('Test subject', 5, '.io-ox-mail-window .mail-detail-pane .subject')

  // reply to that mail
  I.waitForVisible('~Reply')
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe', 20)
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForFocus('.io-ox-mail-compose iframe')

  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${emptyLine}<blockquote type="cite">.*</blockquote>${emptyLine}<div class="io-ox-signature">${signatures[2].content}</div>$`)
    )
  })

  // discard mail
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForVisible('.io-ox-mail-window')
})

Scenario('[C8825] Add and replace signatures', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/mail': { messageFormat: 'html' } }),
    I.haveSnippet({
      content: '<p>Very original? A clever signature?</p>',
      displayname: 'My signature',
      misc: { insertion: 'above', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Super original and fabulous signature</p',
      displayname: 'Super signature',
      misc: { insertion: 'above', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()

  I.click('~Mail compose actions')
  I.clickDropdown('My signature')
  within({ frame: '#mce_0_ifr' }, () => {
    I.waitForText('Very original? A clever signature?')
  })

  I.click('~Mail compose actions')
  I.clickDropdown('Super signature')
  within({ frame: '#mce_0_ifr' }, () => {
    I.waitForText('Super original and fabulous signature')
    I.dontSee('Very original? A clever signature?')
  })
})

Scenario('[C265555] Change the Signature', async ({ I, mail, dialogs }) => {
  const [firstSignature] = await Promise.all([
    I.haveSnippet({
      content: '<p>Very original? A clever signature?</p>',
      displayname: 'My signature',
      misc: { insertion: 'above', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Super original and fabulous signature</p>',
      displayname: 'Super signature',
      misc: { insertion: 'above', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSetting({ 'io.ox/mail': { messageFormat: 'html' } })
  ])

  await I.haveSetting({ 'io.ox/mail': { defaultSignature: firstSignature.data } })

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  within({ frame: '#mce_0_ifr' }, () => {
    I.waitForText('Very original? A clever signature?')
  })
  I.fillField('To', 'foo@bar')
  I.fillField('Subject', 'test subject')

  I.click('~Close', '.io-ox-mail-compose-window')
  dialogs.waitForVisible()
  dialogs.clickButton('Save draft')
  I.waitForDetached('.modal-dialog')
  I.waitForDetached('.io-ox-mail-compose')

  I.selectFolder('Drafts')
  mail.selectMail('test subject')

  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Move')

  dialogs.waitForVisible()
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')

  I.dontSee('test subject')
  I.selectFolder('Inbox')
  I.waitForText('test subject', 5, '.list-view li[data-index="0"]')
  mail.selectMail('test subject')
  I.clickToolbar('~Reply to sender')
  I.waitForVisible('.io-ox-mail-compose-window #mce_1_ifr')
  I.waitForFocus('.io-ox-mail-compose-window #mce_1_ifr')
  within({ frame: '#mce_1_ifr' }, () => {
    I.waitForText('Very original? A clever signature?', 5, 'blockquote')
    I.waitForText('Very original? A clever signature?', 5, '.io-ox-signature')
  })

  // some focus event still needs to happen
  I.waitForVisible('~Mail compose actions')
  I.click('~Mail compose actions')
  I.clickDropdown('Super signature')
  within({ frame: '#mce_1_ifr' }, () => {
    I.waitForText('Super original and fabulous signature', 5, '.io-ox-signature')
    I.waitForText('Very original? A clever signature?', 5, 'blockquote')
  })
})

Scenario('Use image-only signature', async ({ I, mail }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/mail': { messageFormat: 'html' } }),
    await I.haveSnippet({
      content: '<p><img src="data:image/png;base64,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"></p>',
      displayname: 'My image signature',
      misc: { insertion: 'above', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()
  I.click('~Mail compose actions')
  I.waitForVisible('~Mail compose actions')

  I.waitForText('My image signature')
  I.click('My image signature')
  within({ frame: '#mce_0_ifr' }, () => {
    I.waitForElement('img')
  })
})

Scenario('[OXUIB-370] Default font style is used after appending signature', async ({ I, mail }) => {
  // we append linebreaks, when adding a signature into an empty compose window
  // need to check if default font style is acknowledged above the added signature
  await Promise.all([
    I.haveSnippet(signatures[2]),
    I.haveSetting('io.ox/mail//defaultFontStyle', { color: '#0000FF', family: 'arial black,avant garde', size: '10pt' })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.newMail()

  await selectAndAssertSignature('First signature below', 'The content of the third signature',
    new RegExp('^<div class="default-style" style="font-size: 10pt; font-family: arial black,avant garde; color: #0000ff;"(.*)><br(.*)></div>' +
        `<div class="io-ox-signature">${signatures[2].content}</div>`))
})

Scenario('[OXUIB-370] Default font style is used when appending signature below quoted text', async ({ I, users, mail }) => {
  // another case where we append line breaks
  await Promise.all([
    I.haveSnippet(signatures[2]),
    I.haveSetting('io.ox/mail//defaultFontStyle', { color: '#0000FF', family: 'arial black,avant garde', size: '10pt' }),
    I.haveMail({
      subject: 'OXUIB-370',
      attachments: [{ content: 'Test signatures and default font style', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      to: users[0],
      sendtype: 0
    })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('OXUIB-370')
  I.waitForElement('~Reply', 10)
  I.click('~Reply')

  I.waitForVisible('.io-ox-mail-compose iframe')
  I.waitForDetached('.io-ox-mail-compose .io-ox-busy')
  I.waitForFocus('.io-ox-mail-compose iframe')
  I.waitForVisible('~Mail compose actions')
  I.waitForClickable('~Mail compose actions')
  I.waitForText('Test signatures and default font style')

  await selectAndAssertSignature('First signature below', 'The content of the third signature',
    new RegExp('^<div(?: (?:data-mce-)?style="font-size: 10pt; font-family: arial black,avant garde; color: #0000ff;"){2}>(.*)</div>' + '<blockquote type="cite">(.*)</blockquote>(.*)' +
        '<div class="default-style" style="font-size: 10pt; font-family: arial black,avant garde; color: #0000ff;" (.*)><br(.*)></div>' +
        `<div class="io-ox-signature">${signatures[2].content}</div>$`
    ))
})
