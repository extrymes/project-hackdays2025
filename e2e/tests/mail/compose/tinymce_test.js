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

const { expect, assert } = require('chai')

Feature('Mail Compose')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

const iframeLocator = '.io-ox-mail-compose-window .editor iframe'

Scenario('Use default font style for new mails', async ({ I, mail }) => {
  const defaultText = 'This text has a default style.'

  await I.haveSetting('io.ox/mail//defaultFontStyle/family', 'helvetica')

  I.login('app=io.ox/mail')
  mail.newMail()

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', defaultText)
    I.seeCssPropertiesOnElements('.default-style', { 'font-family': 'helvetica' })
  })
})

Scenario('Use default font style in replies', async ({ I, users, mail }) => {
  const mailSubject = 'Use default font style in replies'
  const defaultText = 'This text has a default style.'

  await Promise.all([
    I.haveSetting('io.ox/mail//defaultFontStyle/family', 'helvetica'),
    I.haveMail({
      attachments: [{ content: 'Hello world!', content_type: 'text/html', disp: 'inline' }],
      from: users[0],
      sendtype: 0,
      subject: mailSubject,
      to: users[0]
    }, { sender: users[0] })
  ])

  I.login('app=io.ox/mail')

  mail.selectMail(mailSubject)

  I.click('~Reply')
  I.waitForElement(iframeLocator)
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', defaultText)
    I.seeElementInDOM({ css: 'span[style="font-family: helvetica;"]' })
  })
})

Scenario('[C7392] Send mail with different text highlighting', async ({ I, users, mail }) => {
  const selectInline = (action) => {
    I.click('~Formats')
    I.waitForElement('.tox-selected-menu [title="Inline"]')
    I.click('.tox-selected-menu [title="Inline"]')
    I.click('.tox-collection [title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }

  const [sender, recipient] = users

  const mailSubject = 'C7392 Different text highlighting'

  const defaultText = 'This text has no style.'
  const textBold = 'This is bold text!'
  const textItalic = 'This is italic text?'
  const textUnderline = 'This is underlined text.'
  const textStrikethrough = 'This is strikethrough text.'
  const textSuperscript = 'This text is displayed UP'
  const textSubscript = 'And down...'
  const textCode = 'And code formatting!'
  const textChanged = 'This text was changed and should have no style!'
  const textBoldItalicSuperscript = 'This text combined several styles.'
  const textBoldItalicSuperscriptShortcuts = 'These styles are set with keyboard shortcuts.'

  I.login('app=io.ox/mail', { user: sender })

  // Open the mail composer
  mail.newMail()

  I.click('~Maximize')
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.fillField('body', defaultText)
    I.pressKey('Enter')
  })

  // Write some text in bold
  selectInline('Bold')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textBold)
    I.pressKey('Enter')
  })
  selectInline('Bold')

  // Write some text in italic
  selectInline('Italic')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textItalic)
    I.pressKey('Enter')
  })
  selectInline('Italic')

  // Write some text which is underlined
  selectInline('Underline')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textUnderline)
    I.pressKey('Enter')
  })
  selectInline('Underline')

  // Write some strikethrough text
  selectInline('Strikethrough')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textStrikethrough)
    I.pressKey('Enter')
  })
  selectInline('Strikethrough')

  // Write some sup text
  selectInline('Superscript')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textSuperscript)
    I.pressKey('Enter')
  })
  selectInline('Superscript')

  // Write some sub text
  selectInline('Subscript')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textSubscript)
    I.pressKey('Enter')
  })
  selectInline('Subscript')

  // Write some code
  selectInline('Code')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textCode)
    I.pressKey('Enter')
  })
  selectInline('Code')

  // Write some text, format it and remove the style
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textChanged)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectInline('Bold')
  selectInline('Underline')
  selectInline('Subscript')
  selectInline('Subscript')
  selectInline('Underline')
  selectInline('Bold')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  // Write some text bold + italic + superscript
  selectInline('Bold')
  selectInline('Italic')
  selectInline('Superscript')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Space')
    I.appendField('body', textBoldItalicSuperscript)
    I.pressKey('Enter')
  })

  // Write some text and use keyboard shortcuts for styling
  I.pressKey(['CommandOrControl', 'b'])
  I.pressKey(['CommandOrControl', 'i'])
  I.pressKey(['CommandOrControl', 'u'])
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Space')
    I.appendField('body', textBoldItalicSuperscriptShortcuts)
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  // Open the mail
  mail.selectMail(mailSubject)

  I.waitForElement('.mail-detail-frame')
  await within({ frame: '.mail-detail-frame' }, async () => {
    const div = await I.grabAttributeFrom(locate({ css: 'div' }).withText(defaultText), 'style')
    expect(div).to.be.empty
    I.waitForElement(locate('strong').withText(textBold))
    I.waitForElement(locate('em').withText(textItalic))
    const spans = await I.grabCssPropertyFromAll(locate('span').withText(textUnderline), 'textDecoration')
    expect(spans.join()).to.include('underline')
    expect((await I.grabCssPropertyFromAll(locate('span').withText(textStrikethrough), 'textDecoration')).join()).to.include('line-through')
    I.waitForElement(locate('sup').withText(textSuperscript))
    I.waitForElement(locate('sub').withText(textSubscript))
    I.waitForElement(locate('code').withText(textCode))
    expect(await I.grabAttributeFrom(locate('div').withText(textChanged), 'style')).to.be.empty
    I.waitForElement((locate('strong').withText(textBoldItalicSuperscript)).inside('em').inside('sup'))
    I.waitForElement((locate('strong').withText(textBoldItalicSuperscriptShortcuts)).inside('em'))
    const spans2 = await I.grabCssPropertyFromAll(locate('span').withText(textUnderline), 'textDecoration')
    expect(spans2.join()).to.include('underline')
  })
})

Scenario('[C7393] Send mail with bullet point and numbering - bullet points', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'C7393 Different bullet points'

  const defaultText = 'This text has no alignment.'
  const textBullet1 = 'This is bullet point one.'
  const textBullet2 = 'This is bullet point two.'
  const textBullet21 = 'This bullet point is indented under point two!'
  const textBullet12 = 'And this is again on level one.'

  I.login('app=io.ox/mail', { user: sender })
  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
  })

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textBullet1)
  })

  I.click('~Bullet list')

  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Enter')
    I.appendField('body', textBullet2)
    I.pressKey('Enter')
  })

  I.click('~Increase indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textBullet21)
    I.pressKey('Enter')
  })

  I.click('~Decrease indent')

  within({ frame: iframeLocator }, () => {
    I.appendField('body', textBullet12)
    I.pressKey('Enter')
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  within({ frame: '.mail-detail-frame' }, () => {
    I.seeElement(locate('div').withText(defaultText))
    I.seeElement(locate('.mail-detail-content > ul > li').at(1).withText(textBullet1))
    I.seeElement(locate('.mail-detail-content > ul > li').at(2).withText(textBullet2))
    I.seeElement(locate('.mail-detail-content > ul > li').at(2).find('ul > li').withText(textBullet21))
    I.seeElement(locate('.mail-detail-content > ul > li').at(3).withText(textBullet12))
  })
})

Scenario('[C7393] Send mail with bullet point and numbering - numbering', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'C7393 Different numbering'

  const defaultText = 'This text has no alignment.'
  const textNumber1 = 'This is number one.'
  const textNumber2 = 'This is number two.'
  const textNumber21 = 'This number is indented under number two!'
  const textNumber13 = 'And this is again on level one with number 3.'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
  })

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textNumber1)
  })

  I.click('~Numbered list')

  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Enter')
    I.appendField('body', textNumber2)
    I.pressKey('Enter')
  })

  I.click('~Increase indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textNumber21)
    I.pressKey('Enter')
  })

  I.click('~Decrease indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textNumber13)
    I.pressKey('Enter')
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.seeElement(locate('div').withText(defaultText))
    I.seeElement(locate('.mail-detail-content > ol > li').at(1).withText(textNumber1))
    I.seeElement(locate('.mail-detail-content > ol > li').at(2).withText(textNumber2))
    I.seeElement(locate('.mail-detail-content > ol > li').at(2).find('ol > li').withText(textNumber21))
    I.seeElement(locate('.mail-detail-content > ol > li').at(3).withText(textNumber13))
  })
})

Scenario('[C7394] Send mail with different text alignments', async ({ I, users, mail }) => {
  const selectAlignment = action => {
    I.click('~Formats')
    I.waitForElement('.tox-selected-menu [title="Align"]')
    I.click('.tox-selected-menu [title="Align"]')
    I.click('.tox-collection [title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }
  const [sender, recipient] = users

  const mailSubject = 'C7394 Different text alignments'

  const defaultText = 'This text has no alignment.'
  const textLeftAligned = 'This text is left aligned'
  const textCentered = 'This text is centered'
  const textRightAligned = 'This text is right aligned'
  const textJustify = 'This text should be aligned justified'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.click('~Maximize')

  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
  })

  // Write some right aligned text
  selectAlignment('Right')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textRightAligned)
    I.pressKey('Enter')
  })

  // Write some left aligned text
  selectAlignment('Left')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textLeftAligned)
    I.pressKey('Enter')
  })

  // Write some centered text
  selectAlignment('Right')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textCentered)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectAlignment('Center')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  // Write some justified text
  selectAlignment('Justify')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textJustify)
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForElement(locate('div').withText(defaultText))
    expect(await I.grabCssPropertyFrom(locate('div').withText(defaultText), 'textAlign')).to.include('start')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textRightAligned), 'textAlign')).to.include('right')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textLeftAligned), 'textAlign')).to.include('left')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textCentered), 'textAlign')).to.include('center')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textJustify), 'textAlign')).to.include('justify')
  })
})

Scenario('[C7395] Send mail with text indentations', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'C7395 Different text indentations'
  const defaultText = 'This text has the default text size.'
  const textIndent1 = 'Text with indention 1.'
  const textIndent2 = 'Text with indention level 2.'
  const textIndent3 = 'Text with indention 3.'
  const textIndent11 = 'Text with indention level one, again.'
  const textIndent0 = 'And some not indented text at the end'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textIndent1)
  })

  I.click('~Increase indent')

  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Enter')
  })

  I.click('~Increase indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textIndent2)
    I.pressKey('Enter')
  })

  I.click('~Increase indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textIndent3)
    I.pressKey('Enter')
  })

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textIndent11)
  })
  I.click('~Increase indent')
  I.click('~Decrease indent')
  I.click('~Decrease indent')
  I.click('~Decrease indent')

  await within({ frame: iframeLocator }, async () => {
    I.pressKey('Enter')
  })

  I.click('~Decrease indent')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textIndent0)
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    expect(await I.grabCssPropertyFrom(locate('div').withText(defaultText), 'paddingLeft')).to.include('0px')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textIndent1), 'paddingLeft')).to.include('40px')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textIndent2), 'paddingLeft')).to.include('80px')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textIndent3), 'paddingLeft')).to.include('120px')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textIndent11), 'paddingLeft')).to.include('40px')
    expect(await I.grabCssPropertyFrom(locate('div').withText(textIndent0), 'paddingLeft')).to.include('0px')
  })
})

Scenario('[C7396] Send mail with different text fonts', async ({ I, users, mail }) => {
  const selectFont = (action) => {
    I.click('~Fonts')
    I.waitForElement('.tox-selected-menu [title="' + action + '"]')
    I.click('.tox-selected-menu [title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }
  const [sender, recipient] = users

  const mailSubject = 'C7396 Different text fonts'

  const defaultText = 'This text has no changed font.'
  const textArial = 'This is text written in Arial.'
  const textArialBlack = 'And this one with Arial Black!'
  const textComicSansMS = 'Ohh, ugly Comic Sans MS:'
  const textCourierNew = 'Yeah, Courier New 1337;'
  const textHelvetica = 'And now some text in Helvetica.'
  const textTerminal = 'And how does Terminal looks like?'
  const textVerdana = 'Verdana, oho, Verdana, oho...'
  const textWebdings = 'This one looks ugly with Webdings!'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.click('~Maximize')

  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
  })

  // Write some text with H3
  selectFont('Arial')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textArial)
    I.pressKey('Enter')
  })

  // Write some text with H5
  selectFont('Arial Black')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textArialBlack)
    I.pressKey('Enter')
  })

  // Write some text with H6, but change it to H1
  selectFont('Georgia')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textComicSansMS)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectFont('Comic Sans MS')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  selectFont('Courier New')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textCourierNew)
    I.pressKey('Enter')
  })

  // Write some text with H2
  selectFont('Helvetica')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textHelvetica)
    I.pressKey('Enter')
  })

  selectFont('Terminal')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textTerminal)
    I.pressKey('Enter')
  })

  selectFont('Verdana')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textVerdana)
    I.pressKey('Enter')
  })

  selectFont('Webdings')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textWebdings)
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    const styleDefault = await I.grabAttributeFrom(locate('div').withText(defaultText), 'style')
    const styleArial = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textArial), 'fontFamily')
    const styleArialBlack = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textArialBlack), 'fontFamily')
    const styleComicSansMS = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textComicSansMS), 'fontFamily')
    const styleCourierNew = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textCourierNew), 'fontFamily')
    const styleHelvetica = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textHelvetica), 'fontFamily')
    const styleTerminal = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textTerminal), 'fontFamily')
    const styleVerdana = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textVerdana), 'fontFamily')
    const styleWebdings = await I.grabCssPropertyFrom(locate({ css: 'span' }).withText(textWebdings), 'fontFamily')

    expect(styleDefault).to.be.empty
    expect(styleArial).to.include('arial')
    expect(styleArialBlack).to.include('arial black')
    expect(styleComicSansMS).to.include('comic sans ms')
    expect(styleCourierNew).to.include('courier new')
    expect(styleHelvetica).to.include('helvetica')
    expect(styleTerminal).to.include('terminal')
    expect(styleVerdana).to.include('verdana')
    expect(styleWebdings).to.include('webdings')
  })
})

// combined with [C7383] Compose HTML mail
Scenario('[C7397] Send mail with different text styles', async ({ I, users, mail }) => {
  const selectHeading = (action) => {
    I.click('~Formats')
    I.waitForElement('.tox-selected-menu [title="Headings"]')
    I.click('.tox-selected-menu [title="Headings"]')
    I.waitForElement('.tox-collection [title="' + action + '"]')
    I.click('.tox-collection [title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }
  const [sender, recipient] = users

  const mailSubject = 'C7397 Different text styles'

  const defaultText = 'This text has no style.'
  const textH3 = 'This is H3 text.'
  const textH5 = 'This is H5 text:'
  const textH1 = 'This is H1 text,'
  const textH2 = 'This is H2 text;'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.click('~Maximize')
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
  })

  // Write some text with H3
  selectHeading('Heading 3')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textH3)
    I.pressKey('Enter')
  })

  // Write some text with H5
  selectHeading('Heading 5')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textH5)
    I.pressKey('Enter')
  })

  // Write some text with H6, but change it to H1
  selectHeading('Heading 6')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textH1)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectHeading('Heading 1')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  // Write some text with H2
  selectHeading('Heading 2')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textH2)
    I.pressKey('Enter')
  })

  mail.send()

  // move to to 'sent' folder (First of C7383)
  I.selectFolder('Sent')
  mail.selectMail(mailSubject)

  // open mail source dialog
  I.click('~More actions', '.mail-detail-pane')
  I.waitForElement('.dropdown.open')
  I.click('View source', '.dropdown.open .dropdown-menu')
  I.waitForElement('.mail-source-view')
  // @ts-ignore
  I.waitForFunction(() => document.querySelector('.mail-source-view').value.length > 0)

  // check mail source of recently sent mail (Last of C7383)
  let source = await I.grabValueFrom('.mail-source-view')
  source = Array.isArray(source) ? source[0] : source
  expect(source).to.contain(`>${textH3}</h3>`)
  expect(source).to.contain(`>${textH5}</h5>`)
  expect(source).to.contain(`>${textH1}</h1>`)
  expect(source).to.contain(`>${textH2}</h2>`)
  I.pressKey('Escape')

  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    I.waitForElement(locate('div').withText(defaultText))
    I.waitForElement(locate('h3').withText(textH3))
    I.waitForElement(locate('h5').withText(textH5))
    I.waitForElement(locate('h1').withText(textH1))
    I.waitForElement(locate('h2').withText(textH2))
  })
})

Scenario('[C7398] Send mail with different text sizes', async ({ I, users, mail }) => {
  const selectFontSize = (action) => {
    I.click('~Font sizes')
    I.waitForElement('.tox-selected-menu [title="' + action + '"]')
    I.click('.tox-selected-menu [title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }
  const [sender, recipient] = users

  const mailSubject = 'C7398 Different text sizes'
  const defaultText = 'This text has the default text size.'
  const text13pt = 'We switched to 13pt for this text!'
  const text16pt = 'Text in 16pt should also work, right?'
  const text36pt = 'And a little BIGGER with 36pt...'
  const text8pt = 'And last a small text with 8pt.'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Write some text in 13pt
  selectFontSize('13pt')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', text13pt)
    I.pressKey('Enter')
  })

  // Write some text in 16pt
  selectFontSize('16pt')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', text16pt)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Write some text in 10pt, but change it to 36pt
  selectFontSize('10pt')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', text36pt)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectFontSize('36pt')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  // Write some text in 8pt
  selectFontSize('8pt')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', text8pt)
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    const defaultSize = await I.grabCssPropertyFrom(locate('div').withText(defaultText), 'fontSize')
    const size13 = await I.grabCssPropertyFrom(locate('span').withText(text13pt), 'fontSize')
    const size16 = await I.grabCssPropertyFrom(locate('span').withText(text16pt), 'fontSize')
    const size36 = await I.grabCssPropertyFrom(locate('span').withText(text36pt), 'fontSize')
    const size8 = await I.grabCssPropertyFrom(locate('span').withText(text8pt), 'fontSize')
    const sizes = []

    expect(defaultSize).to.equal('13px')
    sizes.push(defaultSize)
    expect(sizes).not.to.include(size13)
    sizes.push(size13)
    expect(sizes).not.to.include(size16)
    sizes.push(size16)
    expect(sizes).not.to.include(size36)
    sizes.push(size36)
    expect(sizes).not.to.include(size8)
  })
})

function getRGBValue (toConvert) {
  // converts rgba(255, 0, 0, 1) --> 255,0,0,1
  toConvert.forEach(function (element, index) {
    toConvert[index] = element.match(/\d+/g).map(function (a) { return parseInt(a, 10) }).slice(0, 3).join()
  })
  return toConvert
}

Scenario('[C7399] Send mail with different text colours', async ({ I, users, mail }) => {
  const selectColor = (action) => {
    I.click('[title="Text color"] .tox-split-button__chevron')
    I.waitForElement('.tox-selected-menu')
    I.click('.tox-selected-menu div[title="' + action + '"]')
    I.waitForInvisible('.tox-selected-menu')
  }
  const [sender, recipient] = users

  const mailSubject = 'C7399 Different text colors'
  const defaultText = 'This text has no color.'
  const redText = 'This is a text in red.'
  const blueText = 'This text should be display with blue.'
  const greenText = 'And now a green text!'
  const blackText = 'This text is black...'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Write some text in red
  selectColor('Red')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', redText)
    I.pressKey('Enter')
  })

  // Write some text in blue
  selectColor('Blue')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', blueText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  // Write some text in yellow, but change it to green
  selectColor('Yellow')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', greenText)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })
  selectColor('Green')
  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  // Write some text in black
  selectColor('Black')
  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', blackText)
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    const rgbBlack = '0,0,0'
    const rgbRed = '224,62,45'
    const rgbBlue = '53,152,219'
    const rgbGreen = '45,194,107'

    const valueDefault = getRGBValue(await I.grabCssPropertyFromAll(locate('div').withText(defaultText), 'color'))
    const valueRed = getRGBValue(await I.grabCssPropertyFromAll(locate('span').withText(redText), 'color'))
    const valueBlue = getRGBValue(await I.grabCssPropertyFromAll(locate('span').withText(blueText), 'color'))
    const valueGreen = getRGBValue(await I.grabCssPropertyFromAll(locate('span').withText(greenText), 'color'))
    const valueBlack = getRGBValue(await I.grabCssPropertyFromAll(locate('span').withText(blackText), 'color'))

    expect(valueDefault).to.include(rgbBlack)
    expect(valueRed).to.include(rgbRed)
    expect(valueBlue).to.include(rgbBlue)
    expect(valueGreen).to.include(rgbGreen)
    expect(valueBlack).to.include(rgbBlack)
  })
})

const selectHeading = (I, heading) => {
  I.click('~Formats')
  I.waitForElement('.tox-selected-menu [title="Headings"]')
  I.click('.tox-selected-menu [title="Headings"]')
  I.click('.tox-collection [title="' + heading + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectInline = (I, inline) => {
  I.click('~Formats')
  I.waitForElement('.tox-selected-menu [title="Inline"]')
  I.click('.tox-selected-menu [title="Inline"]')
  I.click('.tox-collection [title="' + inline + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectFont = (I, font) => {
  I.click('~Fonts')
  I.waitForElement('.tox-selected-menu [title="' + font + '"]')
  I.click('.tox-selected-menu [title="' + font + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectColor = (I, color) => {
  I.click('[title="Text color"] .tox-split-button__chevron')
  I.waitForElement('.tox-selected-menu')
  I.click('.tox-selected-menu div[title="' + color + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectBackgroundColor = (I, color) => {
  I.click('[title="Background color"] .tox-split-button__chevron')
  I.waitForElement('.tox-selected-menu')
  I.click('.tox-selected-menu div[title="' + color + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectAlignment = (I, align) => {
  I.click('~Formats')
  I.waitForElement('.tox-selected-menu [title="Align"]')
  I.click('.tox-selected-menu [title="Align"]')
  I.click('.tox-collection [title="' + align + '"]')
  I.waitForInvisible('.tox-selected-menu')
}

const selectFontSize = (I, fontSize) => {
  I.click('~Font sizes')
  I.waitForElement('.tox-selected-menu [title="' + fontSize + '"]')
  I.click('.tox-selected-menu [title="' + fontSize + '"]')
  I.waitForInvisible('.tox-selected-menu')
}
Scenario('[C7400] Send mail with multiple different text formatting - set before writting', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'C7400 Different text formatting - set before writting'
  const defaultText = 'This text has no color.'
  const textFormatted = 'This text is formatted!'

  const iframeLocator = '.io-ox-mail-compose-window .editor iframe'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.click('~Maximize')
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  selectHeading(I, 'Heading 1')
  selectInline(I, 'Strikethrough')
  selectFont(I, 'Courier New')
  selectColor(I, 'Red')
  selectBackgroundColor(I, 'Yellow')
  selectAlignment(I, 'Center')
  selectFontSize(I, '10pt')

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textFormatted)
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    expect(await I.grabAttributeFrom(locate('div').withText(defaultText), 'style')).to.be.empty

    const span = locate('span').withText(textFormatted).inside('h1')

    // const rgbBlack = '0,0,0,1';
    const rgbRed = '224,62,45'
    const rgbYellow = '241,196,15'

    expect((await I.grabCssPropertyFromAll(span, 'textDecoration')).join()).to.include('line-through')
    expect((await I.grabCssPropertyFromAll(span, 'fontFamily')).join()).to.include('courier new')
    expect(getRGBValue(await I.grabCssPropertyFromAll(span, 'color'))).to.include(rgbRed)
    expect(getRGBValue(await I.grabCssPropertyFromAll(span, 'backgroundColor'))).to.include(rgbYellow)
    expect(await I.grabCssPropertyFrom(span, 'textAlign')).to.include('center')
    expect((await I.grabCssPropertyFromAll(span, 'fontSize')).join()).to.include('13')
  })
})

Scenario('[C7400] Send mail with multiple different text formatting - set after writting', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'C7400 Different text formatting - set after writting'
  const defaultText = 'This text has no color.'
  const textFormatted = 'This text is formatted!'

  const iframeLocator = '.io-ox-mail-compose-window .editor iframe'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()
  I.click('~Maximize')
  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  // Write some text with the default settings
  await within({ frame: iframeLocator }, async () => {
    I.click('.default-style')
    I.appendField('body', defaultText)
    I.pressKey('Enter')
    I.pressKey('Enter')
  })

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', textFormatted)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })

  selectHeading(I, 'Heading 1')
  selectInline(I, 'Strikethrough')
  selectFont(I, 'Courier New')
  selectColor(I, 'Red')
  selectBackgroundColor(I, 'Yellow')
  selectAlignment(I, 'Center')
  selectFontSize(I, '10pt')

  await within({ frame: iframeLocator }, async () => {
    I.pressKey('End')
    I.pressKey('Enter')
  })

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    expect(await I.grabAttributeFrom(locate('div').withText(defaultText), 'style')).to.be.empty

    const span = locate('span').withText(textFormatted).inside('h1')

    // const rgbBlack = '0,0,0,1';
    const rgbRed = '224,62,45'
    const rgbYellow = '241,196,15'

    expect(await I.grabCssPropertyFrom(span, 'textDecoration')).to.include('line-through')
    expect(await I.grabCssPropertyFrom(span, 'fontFamily')).to.include('courier new')
    expect(getRGBValue(await I.grabCssPropertyFromAll(span, 'color'))).to.include(rgbRed)
    expect(getRGBValue(await I.grabCssPropertyFromAll(span, 'backgroundColor'))).to.include(rgbYellow)
    expect(await I.grabCssPropertyFrom(span, 'textAlign')).to.include('center')
    expect(await I.grabCssPropertyFrom(span, 'fontSize')).to.include('13')
  })
})

Scenario('Add a link to a mail', async ({ I, users, mail }) => {
  const [sender, recipient] = users

  const mailSubject = 'Add a link to a mail'
  const defaultText = 'This text is linked.'
  const linkUrl = 'https://www.open-xchange.com/'

  I.login('app=io.ox/mail', { user: sender })

  mail.newMail()

  I.fillField('To', recipient.get('primaryEmail'))
  I.fillField('Subject', mailSubject)

  await within({ frame: iframeLocator }, async () => {
    I.appendField('body', defaultText)
    I.pressKey(['Shift', 'Home']) // Select the just written text
  })

  I.pressKey(['CommandOrControl', 'k'])
  I.waitForText('URL')
  I.fillField('URL', linkUrl)
  I.click('Save')

  mail.send()
  I.logout()

  // Log in as second user and navigate to mail app
  I.login('app=io.ox/mail', { user: recipient })

  mail.selectMail(mailSubject)

  I.waitForVisible({ css: 'iframe.mail-detail-frame' })
  await within({ frame: '.mail-detail-frame' }, async () => {
    expect(await I.grabAttributeFrom(locate('a').withText(defaultText), 'href')).to.equal(linkUrl)
  })
})

Scenario('[OXUIB-2245] Warn about invalid toolbar configurations', async ({ I, mail }) => {
  await I.haveSetting('io.ox/core//tinyMCE/theme_advanced_buttons1', 'this || is || not || a || valid || toolbar')
  const logs = []

  // TODO: Replace with `I.grabBrowserLogs()` when the function is fixed in puppeteer
  I.usePuppeteerTo('check browser logs ', async ({ page }) => {
    page.on('console', async event => {
      const messages = await Promise.all(event.args().map(argument => argument.jsonValue()))
      logs.push(...messages)
    })
  })

  I.login('app=io.ox/mail')
  mail.newMail()
  await I.executeAsyncScript(done => done())
  assert.isTrue(logs.indexOf('Detected an invalid toolbar configuration for the text editor') > -1)
  I.waitForElement('.tox-toolbar-overlord .tox-tbtn', 5)
})
