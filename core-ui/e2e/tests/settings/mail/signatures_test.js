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

// differrent variants in tinymce
const emptyLine = '(' +
    '<div><br></div>' + '|' +
    '<div><br>&nbsp;</div>' + '|' +
    '<div class="default-style" style=""><br></div>' + '|' +
    '<div class="default-style" style=""><br>&nbsp;</div>' +
')'

Feature('Settings > Mail')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })
// no file input fields in tinymce 5
Scenario('[OXUIB-384] Image signature', async ({ I, dialogs, tinymce, settings }) => {
  await I.haveSnippet({
    content: '<div></div>',
    displayname: 'my-image-signature',
    misc: { insertion: 'below', 'content-type': 'text/plain' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForNetworkTraffic()
  I.waitForText('Add new signature')
  I.waitForText('my-image-signature')

  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)

  await tinymce.attachInlineImage('media/images/ox_logo.png')
  I.wait(2)
  await within({ frame: '.io-ox-snippet-dialog iframe' }, async () => {
    // insert some text
    const postHTML = await I.grabHTMLFrom('body')
    expect(postHTML).to.match(/<img src="[^"]*\/api\/file\?action=get/)
  })

  // save
  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // edit (once again)
  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  await within({ frame: '.io-ox-snippet-dialog iframe' }, async () => {
    // insert some text
    const postHTML = await I.grabHTMLFrom('body')
    expect(postHTML).to.contain('/api/image/snippet/image?')
  })
})

// will probably break once MWB-290 was fixed/deployed
Scenario('[OXUIB-199] Sanitize signature preview', async ({ I, settings }) => {
  await I.haveSnippet({
    content: 'blabla<i\nmg src="foo" oner\nror="document.body.classList.add(\'injected\')" <br>',
    displayname: 'my-signature',
    misc: { insertion: 'below', 'content-type': 'text/plain' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForText('Add new signature')
  I.waitForText('my-signature')
  I.dontSeeElement('.signature-preview img')
  I.dontSeeElement('body.injected')
})

// will probably break once MWB-290 was fixed/deployed
Scenario('[OXUIB-200] Sanitize signature when editing existing', async ({ I, dialogs, settings }) => {
  await I.haveSnippet({
    content: '<font color="<bo<script></script>dy><img alt=< src=foo onerror=document.body.classList.add(\'injected\')></body>">',
    displayname: 'my-signature',
    misc: { insertion: 'below', 'content-type': 'text/plain' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForText('Add new signature')
  I.waitForText('my-signature')
  I.waitForText('Edit', 5, '.io-ox-signature-settings')
  I.click('Edit', '.io-ox-signature-settings')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.dontSeeElement('body.injected')
})

Scenario('Sanitize entered signature source code', async ({ I, settings }) => {
  const dialog = locate('.tox-dialog')

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForText('Add new signature')
  I.click('Add new signature')

  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.fillField('Signature name', 'Sanitize me!')

  await set('A<svg><svg onload="document.body.innerHTML=\'I am a hacker\'>Z', 'AZ')

  async function set (text, clean) {
    I.say('Add: source code')
    I.click('~Source code', '.tox-toolbar')
    I.waitForElement(dialog)
    within(dialog, () => {
      I.appendField('textarea', text)
      I.click('Save')
    })

    I.say('Check: body.innerHTML unchanged')
    I.wait(1)
    I.dontSee('I am a hacker')

    I.say('Check: value')
    I.waitForDetached(dialog)
    I.click('~Source code', '.tox-toolbar')
    I.waitForElement(dialog)
    within(dialog, () => {
      I.seeInField('textarea', clean)
    })
  }
})

Scenario('[C7766] Create new signature @smoketest', async ({ I, users, mail, dialogs, settings }) => {
  const [user] = users
  const userAddressIdentifier = user.get('email1').replace(/[@.]/g, '-')

  // init compose instance
  I.login(['app=io.ox/mail'])
  I.waitForApp()
  mail.newMail()

  // predcondition: check signature menu refresh
  I.click('~Mail compose actions')
  I.waitForText('Signatures', 10, '.dropdown.open .dropdown-menu')
  I.pressKey('Escape')
  I.click('[data-action=minimize]')

  settings.open('Mail', 'Signatures')
  I.waitForText('Add new signature')
  I.click('Add new signature')
  dialogs.waitForVisible()

  I.waitForVisible('.io-ox-snippet-dialog .contenteditable-editor iframe', 10)
  I.fillField('Signature name', 'Testsignaturename')

  within({ frame: '.io-ox-snippet-dialog .contenteditable-editor iframe' }, () => {
    I.appendField('body', 'Testsignaturecontent')
  })

  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)', 10)

  // assert existence of signature
  I.waitForText('Testsignaturename')
  I.see('Testsignaturecontent')

  // disable default siganture
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'My signature')
  I.selectOption(`#defaultReplyForwardSignature-${userAddressIdentifier}`, 'No signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  // use compose instance to check signature menu refresh
  settings.close()
  I.waitForVisible('#io-ox-taskbar-container button')
  I.click('#io-ox-taskbar-container button')
  I.waitForElement('~Mail compose actions')
  I.click('~Mail compose actions')

  I.clickDropdown('Testsignaturename')

  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Testsignaturecontent')
  })
})

Scenario('[C7767] Define signature position', async ({ I, users, mail, dialogs, settings }) => {
  const [user] = users
  const userAddressIdentifier = user.get('email1').replace(/[@.]/g, '-')

  await I.haveMail({
    attachments: [{
      content: '<div>Test content</div>',
      content_type: 'text/html',
      disp: 'inline'
    }],
    from: [[user.get('displayname'), user.get('primaryEmail')]],
    sendtype: 0,
    subject: 'Test subject',
    to: [[user.get('displayname'), user.get('primaryEmail')]]
  })
  await I.haveSnippet({
    content: '<p>Testsignaturecontent</p>',
    displayname: 'Testsignaturename',
    misc: { insertion: 'below', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForApp()

  I.waitForNetworkTraffic()
  I.waitForText('Testsignaturename')
  I.see('Testsignaturecontent')

  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.selectOption('#signature-position', 'Add signature above quoted text')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  const option = await I.grabValueFrom('.io-ox-snippet-dialog select')
  I.see('Add signature above quoted text')
  expect(option).to.equal('above')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // disable default siganture
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'No signature')
  I.selectOption(`#defaultReplyForwardSignature-${userAddressIdentifier}`, 'No signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  settings.close()

  // reply to mail
  mail.selectMail('Test subject')
  I.click('~Reply')

  I.waitForElement('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.waitForText('Test content')
  })
  I.wait(1) // there still might be a focus event somewhere

  I.click('~Mail compose actions')
  I.clickDropdown('Testsignaturename')

  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.seeElement(locate('.io-ox-signature').before({ css: 'blockquote[type="cite"]' }).as('Signature before quoted text'))
  })
})

Scenario('[C7768] Edit signature', async ({ I, users, mail, dialogs, settings }) => {
  const userAddressIdentifier = users[0].get('email1').replace(/[@.]/g, '-')

  await I.haveSnippet({
    content: '<p>Testsignaturecontent</p>',
    displayname: 'Testsignaturename',
    misc: { insertion: 'below', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForNetworkTraffic()
  I.waitForText('Testsignaturename')
  I.see('Testsignaturecontent')

  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.fillField('Signature name', 'Newsignaturename')
  within({ frame: '.contenteditable-editor iframe' }, () => {
    I.clearField('body')
    I.fillField('body', 'Newsignaturecontent')
  })

  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // assert existence of signature
  I.waitForText('Newsignaturename')

  // disable default siganture
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'My signature')
  I.selectOption(`#defaultReplyForwardSignature-${userAddressIdentifier}`, 'No signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  settings.close()

  mail.newMail()

  I.waitForVisible('~Mail compose actions')
  I.click('~Mail compose actions')
  I.clickDropdown('Newsignaturename')

  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Newsignaturecontent')
  })
})

Scenario('[C7769] Delete signature @smoketest', async ({ I, dialogs, settings }) => {
  await I.haveSnippet({
    content: '<p>Testsignaturecontent</p>',
    displayname: 'Testsignaturename',
    misc: { insertion: 'below', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login(['app=io.ox/mail&settings=virtual/settings/io.ox/mail'])
  I.waitForApp()
  settings.expandSection('Signatures')
  I.waitForText('Testsignaturename')
  I.see('Testsignaturecontent')
  I.click('~Delete', '[data-section="io.ox/mail/settings/signatures"]')
  I.waitForText('Do you really want to delete the signature "Testsignaturename"?')
  dialogs.clickButton('Delete')
  I.waitForDetached('.settings-list-item')
  I.dontSee('Testsignaturename')
  I.dontSee('Testsignaturecontent')
})

Scenario('[C7770] Set default signature', async ({ I, users, mail, settings }) => {
  await I.haveMail({
    attachments: [{ content: '<div>Test content</div>', content_type: 'text/html', disp: 'inline' }],
    from: users[0],
    sendtype: 0,
    subject: 'Test subject',
    to: users[0]
  })
  await I.haveSnippet({
    content: '<p>Testsignaturecontent0</p>',
    displayname: 'Testsignaturename0',
    misc: { insertion: 'above', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })
  await I.haveSnippet({
    content: '<p>Testsignaturecontent1</p>',
    displayname: 'Testsignaturename1',
    misc: { insertion: 'above', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })
  await I.haveSnippet({
    content: '<p>Testsignaturecontent2</p>',
    displayname: 'Testsignaturename2',
    misc: { insertion: 'above', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForApp()

  I.waitForText('Testsignaturename0')
  I.see('Testsignaturecontent0')
  I.see('Testsignaturename1')
  I.see('Testsignaturecontent1')
  I.see('Testsignaturename2')
  I.see('Testsignaturecontent2')

  // select default signature
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption('Default signature for new mails', 'Testsignaturename1')
  I.selectOption('Default signature on reply or forward', 'Testsignaturename2')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  I.waitForElement('~For new messages', 5)
  I.waitForElement('~On replies or forwardings', 5)

  settings.close()
  I.openApp('Mail')
  I.waitForApp()

  // compose a mail
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.waitForVisible('body')
    I.wait(0.5)
    I.see('Testsignaturecontent1')
  })
  I.click('~Close', '.io-ox-mail-compose-window')

  I.waitForDetached('.io-ox-mail-compose-window')

  // reply to mail
  I.click('.io-ox-mail-window .leftside ul li.list-item')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')

  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  await within({ frame: '.io-ox-mail-compose-window .editor iframe' }, async () => {
    I.waitForVisible('body')
    I.wait(0.5)
    expect(await I.grabHTMLFrom('body')).to.match(
      new RegExp(`^${emptyLine}<div class="io-ox-signature"><p>Testsignaturecontent2</p></div><blockquote type="cite">.*</blockquote>$`)
    )
  })
})

Scenario('Create very first snippet', async ({ I, users, mail, dialogs, settings }) => {
  I.login(['app=io.ox/mail'])

  mail.newMail()
  I.click('~Mail compose actions')
  I.waitForElement('.checkmark', 5)
  I.pressKey('Escape')
  I.waitForDetached('.dropdown.open')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-mail-compose-window')

  settings.open('Mail', 'Signatures')
  I.waitForText('Add new signature')
  I.click('Add new signature')

  dialogs.waitForVisible()
  I.waitForVisible('.io-ox-snippet-dialog .contenteditable-editor iframe', 10)
  I.fillField('Signature name', 'Testsignaturename')
  within({ frame: '.io-ox-snippet-dialog .contenteditable-editor iframe' }, () => {
    I.appendField('body', 'Testsignaturecontent')
  })
  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForElement('~Default signature', 5)

  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.waitForText('Testsignaturename')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  settings.close()
  I.click('~Mail')
  mail.newMail()
  I.click('~Mail compose actions')
  I.waitForElement('.checkmark', 5)
})

Scenario('Have various signatures for multiple accounts', async ({ I, users, mail, dialogs, settings }) => {
  const [, external] = users
  await I.haveMailAccount({ additionalAccount: external, name: 'External', extension: 'ext' })

  const userAddressIdentifier = users[0].get('email1').replace(/[@.]/g, '-')
  const externalAddressIdentifier = external.get('email1').replace(/@/, '-ext@').replace(/[@.]/g, '-')

  await Promise.all([
    I.haveSnippet({
      content: '<p>First Signature Text</p>',
      displayname: 'First Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Second Signature Text</p>',
      displayname: 'Second Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Third Signature Text</p>',
      displayname: 'Third Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Fourth Signature Text</p>',
      displayname: 'Fourth Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  await I.haveMail({
    attachments: [{ content: '<div>Test content</div>', content_type: 'text/html', disp: 'inline' }],
    from: users[0],
    sendtype: 0,
    subject: 'Test subject',
    to: users[0]
  })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()

  // update labels
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'First Signature')
  I.selectOption(`#defaultSignature-${externalAddressIdentifier}`, 'Third Signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  I.waitForElement('~Default signature E-Mail', 5)
  I.waitForElement('~Default signature External', 5)
  I.seeNumberOfVisibleElements('.settings-list-item .account', 2)

  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.waitForVisible(`#defaultSignature-${userAddressIdentifier}`)
  I.selectOption(`#defaultSignature-${externalAddressIdentifier}`, 'No signature')
  I.selectOption(`#defaultReplyForwardSignature-${externalAddressIdentifier}`, 'First Signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')
  I.waitForElement('~Default signature E-Mail', 5)
  I.waitForElement('~On replies or forwardings External', 5)
  I.seeNumberOfVisibleElements('.settings-list-item .account', 2)

  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'First Signature')
  I.selectOption(`#defaultReplyForwardSignature-${userAddressIdentifier}`, 'Second Signature')
  I.selectOption(`#defaultSignature-${externalAddressIdentifier}`, 'Third Signature')
  I.selectOption(`#defaultReplyForwardSignature-${externalAddressIdentifier}`, 'Fourth Signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  I.waitForElement('~For new messages E-Mail', 5)
  I.waitForElement('~On replies or forwardings E-Mail', 5)
  I.waitForElement('~For new messages External', 5)
  I.waitForElement('~On replies or forwardings External', 5)
  I.seeNumberOfVisibleElements('.settings-list-item .account', 4)

  // check correct use of signatures
  settings.close()
  I.waitForApp()

  // first account - new
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('First Signature Text')
  })
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // first account - reply to mail
  I.click('.io-ox-mail-window .leftside ul li.list-item')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  I.wait(1)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Second Signature Text')
  })
  // select other signature via dropdown
  I.click('~Mail compose actions')
  I.clickDropdown('First Signature')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.dontSee('Second Signature Text')
    I.see('First Signature Text')
  })
  I.click('~Close', '.io-ox-mail-compose-window')
  I.click('Delete draft')
  I.waitForDetached('.io-ox-mail-compose-window')

  I.click('~Move')
  I.waitForElement('~External', 5)
  I.click('~External', '.modal-dialog')
  I.waitForElement('li.selected[aria-label="External"]')
  I.pressKey('ArrowRight')
  I.waitForText('Inbox', 5, 'li.selected[aria-label="External"].open')
  I.pressKey('ArrowDown')
  dialogs.clickButton('Move')

  // external account - new
  I.selectFolder('External')
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  I.wait(1)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Third Signature Text')
  })
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')
  I.waitForFocus(locate('.primary-action .btn-primary').withText('New email'))

  // external account - reply to mail
  I.doubleClick('External')
  I.waitForText('Inbox', 10, '.window-sidepanel .virtual.remote-folders')
  I.click('~Inbox', '.window-sidepanel .virtual.remote-folders')
  I.waitForElement('.io-ox-mail-window .leftside ul li.list-item')
  I.click('.io-ox-mail-window .leftside ul li.list-item')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  I.wait(1)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Fourth Signature Text')
  })
  // select other sender via dropdown
  I.click('.mail-compose-fields .sender .mail-input')
  I.clickDropdown(users[0].get('email1'))
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Second Signature Text')
  })
})

Scenario('Delete signature that has defaults', async ({ I, users, mail, dialogs, settings }) => {
  const snippets = await Promise.all([
    I.haveSnippet({
      content: '<p>First Signature Text</p>',
      displayname: 'First Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Second Signature Text</p>',
      displayname: 'Second Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })])

  await Promise.all([
    I.haveSetting({
      'io.ox/mail': {
        defaultSignature: { [users[0].get('email1')]: snippets[0].data },
        defaultReplyForwardSignature: { [users[0].get('email1')]: snippets[1].data }
      }
    }),
    I.haveMail({
      attachments: [{ content: '<div>Test content</div>', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      sendtype: 0,
      subject: 'Test subject',
      to: users[0]
    })
  ])

  I.login('app=io.ox/mail&section=io.ox/mail/settings/signatures&settings=virtual/settings/io.ox/mail')
  I.waitForApp()

  I.waitForElement('.settings-list-item .account')

  I.seeNumberOfVisibleElements('.settings-list-item .account', 2)
  I.seeElement(`.settings-list-item[data-id="${snippets[0].data}"] button[aria-label="For new messages E-Mail"]`)
  I.seeElement(`.settings-list-item[data-id="${snippets[1].data}"] button[aria-label="On replies or forwardings E-Mail"]`)
  I.click('~Delete', `.settings-list-item[data-id="${snippets[1].data}"]`)

  I.waitForText('Do you really want to delete the signature "Second Signature"?')
  dialogs.clickButton('Delete')

  // TODO: Remove if test does not fail
  // I.click(`.settings-list-item[data-id="${snippets[1].data}"] button.remove`)
  I.waitForDetached(`.settings-list-item[data-id="${snippets[1].data}"]`)
  I.dontSee('Second Signature')
  I.waitForElement('.settings-list-item .account')
  I.seeNumberOfVisibleElements('.settings-list-item .account', 1)

  // check correct use of signatures
  settings.close()

  // first account - new
  mail.newMail()
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('First Signature Text')
  })
  I.click('~Close', '.io-ox-mail-compose-window')
  I.waitForDetached('.io-ox-mail-compose-window')

  // first account - reply to mail
  I.click('.io-ox-mail-window .leftside ul li.list-item')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.click('~Reply')
  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.dontSee('Second Signature Text')
  })
})

Scenario('Signatures mapping from old default signatures can be migrated to mapping by account address', async ({ I, users, mail, dialogs, settings }) => {
  const snippets = await Promise.all([
    I.haveSnippet({
      content: '<p>First Signature Text</p>',
      displayname: 'First Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Second Signature Text</p>',
      displayname: 'Second Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  await Promise.all([
    I.haveSetting('io.ox/mail//defaultSignature', snippets[0].data),
    I.haveSetting('io.ox/mail//defaultReplyForwardSignature', snippets[1].data)
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForElement('.settings-list-item .account')
  I.seeNumberOfVisibleElements('.settings-list-item .account', 2)

  I.seeElement(`.settings-list-item[data-id="${snippets[0].data}"] button[aria-label="For new messages E-Mail"]`)
  I.seeElement(`.settings-list-item[data-id="${snippets[1].data}"] button[aria-label="On replies or forwardings E-Mail"]`)
})

Scenario('Signatures mapping by account id can be mirgrated to mapping by account address', async ({ I, users, mail, dialogs, settings }) => {
  const external = users[1]
  const externalAccount = await I.haveMailAccount({ additionalAccount: external, name: 'External', extension: 'ext' })
  const userId = '0'
  const externalId = externalAccount.data.id

  const snippets = await Promise.all([
    I.haveSnippet({
      content: '<p>First Signature Text</p>',
      displayname: 'First Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Second Signature Text</p>',
      displayname: 'Second Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  await Promise.all([
    I.haveSetting('io.ox/mail//defaultSignature', { [userId]: snippets[0].data, [externalId]: snippets[0].data }),
    I.haveSetting('io.ox/mail//defaultReplyForwardSignature', { [userId]: snippets[0].data, [externalId]: snippets[1].data })
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForElement(locate(`.settings-list-item[data-id="${snippets[0].data}"] .account`).withText('E-Mail'))
  I.waitForElement(locate(`.settings-list-item[data-id="${snippets[0].data}"] .account`).withText('External'))
  I.waitForElement(locate(`.settings-list-item[data-id="${snippets[1].data}"] .account`).withText('External'))
})

Scenario('[C85619] Edit signature with HTML markup', async ({ I, users, mail, dialogs, settings }) => {
  const snippet = await I.haveSnippet({
    content: '<p>Testsignaturecontent</p>',
    displayname: 'Testsignaturename',
    misc: { insertion: 'below', 'content-type': 'text/html' },
    module: 'io.ox/mail',
    type: 'signature'
  })

  await I.haveSetting({ 'io.ox/mail': { defaultSignature: { [users[0].get('email1')]: snippet.data } } })

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForApp()

  I.waitForText('Testsignaturename')
  I.see('Testsignaturecontent')

  I.waitForElement('.action[data-action="edit"]')
  I.click('Edit')
  I.waitForVisible('.contenteditable-editor iframe', 10)
  I.clearField('Signature name')
  I.fillField('Signature name', 'Newsignaturename')
  within({ frame: '.contenteditable-editor iframe' }, () => {
    I.doubleClick('body')
    I.fillField('body', 'Newsignaturecontent')
    I.retry(5).click('body')
    I.pressKey(['CommandOrControl', 'a'])
  })
  I.click('~Bold')
  dialogs.clickButton('Save')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // assert changes
  I.see('Newsignaturename')
  I.see('Newsignaturecontent')
  settings.close()
  I.openApp('Mail')
  I.waitForApp()

  // compose a mail
  mail.newMail()
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.retry(5).seeElement(locate('strong').withText('Newsignaturecontent'))
  })
})

Scenario('I can have signatures for aliases', async ({ I, users, mail, settings }) => {
  const [user, external] = users
  const userAddress = user.get('primaryEmail')
  const aliasAddress = userAddress.replace('@', '-alias@')
  await user.hasAlias(aliasAddress)
  const externalAccount = await I.haveMailAccount({ additionalAccount: external, name: 'External', extension: 'ext' })
  const externalAddress = externalAccount.data.primary_address

  const userAddressIdentifier = userAddress.replace(/[@.]/g, '-')
  const aliasAddressIdentifier = aliasAddress.replace(/[@.]/g, '-')
  const externalAddressIdentifier = externalAddress.replace(/[@.]/g, '-')

  await Promise.all([
    I.haveSnippet({
      content: '<p>First Signature Text</p>',
      displayname: 'First Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Second Signature Text</p>',
      displayname: 'Second Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    }),
    I.haveSnippet({
      content: '<p>Third Signature Text</p>',
      displayname: 'Third Signature',
      misc: { insertion: 'below', 'content-type': 'text/html' },
      module: 'io.ox/mail',
      type: 'signature'
    })
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/signatures')
  I.waitForApp()
  I.waitForApp()

  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForVisible('.io-ox-signature-assign-dialog')
  I.waitForElement(locate('.modal-dialog .account-name').withText(userAddress))
  I.waitForElement(locate('.modal-dialog .account-name').withText(aliasAddress))
  I.waitForElement(locate('.modal-dialog .account-name').withText(externalAccount.data.name))
  I.selectOption(`#defaultSignature-${userAddressIdentifier}`, 'First Signature')
  I.selectOption(`#defaultSignature-${aliasAddressIdentifier}`, 'Second Signature')
  I.selectOption(`#defaultSignature-${externalAddressIdentifier}`, 'Third Signature')
  I.click('Save')
  I.waitForDetached('.io-ox-signature-assign-dialog')

  I.waitForElement(locate('.settings-list-item .account').withText(userAddress))
  I.waitForElement(locate('.settings-list-item .account').withText(aliasAddress))
  I.waitForElement(locate('.settings-list-item .account').withText(externalAccount.data.name))

  settings.close()

  mail.newMail()

  I.waitForVisible('.io-ox-mail-compose-window .editor iframe')
  I.click('.mail-compose-fields .sender .mail-input')
  I.clickDropdown(userAddress)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('First Signature Text')
  })
  I.click('.mail-compose-fields .sender .mail-input')
  I.clickDropdown(aliasAddress)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Second Signature Text')
  })
  I.click('.mail-compose-fields .sender .mail-input')
  I.clickDropdown(externalAddress)
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('Third Signature Text')
  })
})

Scenario('Add new account and check functionality without reload', async ({ I, users, mail, settings, dialogs }) => {
  I.login('app=io.ox/mail')
  I.waitForApp()

  // create new account
  I.click('~More actions', '.primary-action')
  I.clickDropdown('Add mail account')
  I.waitForElement('#add-mail-account-address')
  I.fillField('#add-mail-account-address', 'a@box.ox.io')
  I.fillField('#add-mail-account-password', 'password123')
  dialogs.clickButton('Add')

  I.waitForText('Cannot establish secure connection. Do you want to proceed anyway?')
  dialogs.clickButton('Ignore Warnings')

  I.waitForText('Auto-configuration failed. Do you want to configure your account manually?')
  dialogs.clickButton('Configure manually')

  I.waitForElement('#name')
  I.fillField('#name', 'New Account')
  I.fillField('#mail_server', 'mail-server')
  I.fillField('#password', 'password123')
  I.fillField('#transport_server', 'transport-server')
  dialogs.clickButton('Save')

  I.waitForText('Warnings')
  dialogs.clickButton('Ignore Warnings')

  I.waitForText('Account added successfully')

  // create very first signature
  settings.open('Mail', 'Signatures')
  I.waitForText('Add new signature')
  I.click('Add new signature')

  I.waitForElement('#snippet-name')
  I.fillField('#snippet-name', 'My first Signature')
  I.click('.tox-edit-area')
  I.pressKey('a')
  dialogs.clickButton('Save')
  I.waitForDetached('#snippet-name')
  I.waitForElement('.settings-list-item .account')
  I.seeNumberOfVisibleElements('.settings-list-item .account', 1)

  settings.close()
  I.waitForDetached('.io-ox-settings-main')

  // check mail compose with default signatures
  mail.newMail()
  I.waitForElement('.io-ox-mail-compose-window .editor iframe')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.see('a')
  })
  I.waitForClickable('.mail-compose-fields .sender .mail-input')
  I.click('.mail-compose-fields .sender .mail-input')
  I.clickDropdown('a@box.ox.io')
  within({ frame: '.io-ox-mail-compose-window .editor iframe' }, () => {
    I.dontSee('a')
  })
  I.click('~Close', '.controls')
  I.waitForDetached('.io-ox-mail-compose-window')

  // assign signature for new account
  settings.open('Mail', 'Signatures')
  I.waitForText('Set default signatures')
  I.click('Set default signatures')
  I.waitForText('New Account')

  I.selectOption('#defaultSignature-a-box-ox-io', 'My first Signature')
  dialogs.clickButton('Save')
  I.seeNumberOfVisibleElements('.settings-list-item .account', 2)
  I.see('E-Mail', '.account')
  I.see('New Account', '.account')

  // delete new account
  I.click('~Accounts', '~Settings Folders')
  I.waitForElement('~Delete New Account')
  I.waitForClickable('~Delete New Account')
  I.retry(3).click('~Delete New Account')
  I.waitForText('Do you really want to delete this account?')
  dialogs.clickButton('Delete account')
  I.waitForDetached('~Delete New Account')

  I.say('check updated signature badges')
  I.click('~Mail', '~Settings Folders')
  settings.expandSection('Signatures')
  I.waitForText('Set default signatures')
  I.waitForText('E-Mail', 5, '.account')
  I.seeNumberOfVisibleElements('.settings-list-item .account', 1)
})
