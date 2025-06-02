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

const fs = require('node:fs')
const path = require('node:path')
const { I, dialogs } = inject()

Feature('Middleware > Mail authenticity')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

const testMails = new DataTable(['testMails'])
// @ts-ignore
const files = fs.readdirSync(path.join(global.codecept_dir, 'media/mails/authenticity'))
/*
  files should contain 81 files which are split into chunks of 9 mails.
  this reduces the overhead of running one test per mail while keeping the
  possibility to speed up testrun using parallelisation
*/
while (files.length) {
  testMails.add([files.splice(0, 9)])
}

Data(testMails).Scenario('[C244757] SPF, DKIM, DMARC, DMARC Policy matrix', async ({ I, users, mail, current }) => {
  const mails = current.testMails.map(m => {
    return I.haveMail({ path: path.join('media/mails/authenticity', m) })
  })
  await Promise.all([
    users[0].hasConfig('com.openexchange.mail.authenticity.enabled', true),
    users[0].hasConfig('com.openexchange.mail.authenticity.authServId', 'mx.recipient.ox'),
    ...mails
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()
  for (let index = 0; index < mails.length; index++) {
    mail.selectMailByIndex(index)
    I.waitForElement('.mail-detail-frame')
    I.switchTo('.mail-detail-frame')
    const mailContent = await I.grabTextFrom('.mail-detail-content')
    const result = mailContent.replace(/Result: /, '')
    I.switchTo()
    // I.waitForElement('.address.authenticity-sender');
    I.waitForElement('.address')
    switch (result) {
      case 'pass':
      case 'neutral':
        I.seeCssPropertiesOnElements('.address', { color: 'rgb(112, 105, 92)' })
        I.dontSee('Warning: Be careful with this message. It might be spam or a phishing mail.')
        I.dontSee('Warning: This is a dangerous email containing spam or malware.')
        break
      case 'suspicious':
        I.seeCssPropertiesOnElements('.address', { color: 'rgb(197, 0, 0)' })
        I.waitForElement('.authenticity .suspicious')
        I.seeCssPropertiesOnElements('.notifications .authenticity .suspicious', { 'background-color': 'rgb(197, 0, 0)' })
        I.waitForElement('.mail-detail .authenticity-icon-suspicious')
        I.see('Warning: Be careful with this message. It might be spam or a phishing mail.')
        break
      case 'fail':
        I.seeCssPropertiesOnElements('.address', { color: 'rgb(197, 0, 0)' })
        I.waitForElement('.authenticity .fail')
        I.seeCssPropertiesOnElements('.authenticity .fail', { 'background-color': 'rgb(197, 0, 0)' })
        I.waitForElement('.authenticity-icon-fail')
        I.see('Warning: This is a dangerous email containing spam or malware.')
        break
      default:
        throw new Error(`Unknown result: ${result}`)
    }
  }
  I.seeNumberOfVisibleElements('.list-view li.list-item', mails.length)
})

function openMoveDialog () {
  I.waitForVisible('~More actions', 5)
  I.waitForClickable('~More actions', 5)
  I.click('~More actions', '.mail-header-actions')
  I.clickDropdown('Move')
  I.waitForElement('.folder-picker-dialog')
}
function selectFolderInMoveDialog (folderName) {
  I.click(`.folder-picker-dialog .folder[aria-label="${folderName}"]`)
  I.waitForElement(`.folder-picker-dialog .folder[aria-label="${folderName}"].selected`)
}
function clickMoveAndChangeFolder (folderName) {
  dialogs.clickButton('Move')
  I.waitForDetached('.modal-dialog')
  I.waitForText(folderName, 5, '.folder-tree')
  I.selectFolder(folderName, 'mail')
  I.waitForElement(`.folder.selected[aria-label*="${folderName}"]`, 5)
  I.waitForDetached('.busy-indicator.io-ox-busy', 5)
}

Scenario('[C241140] Availability within folders', async ({ I, users, mail, dialogs }) => {
  await Promise.all([
    users[0].hasConfig('com.openexchange.mail.authenticity.enabled', true),
    users[0].hasConfig('com.openexchange.mail.authenticity.authServId', 'mx.recipient.ox'),
    // 1.) Receive a mail with authentication headers, stored to INBOX.
    I.haveMail({ path: 'media/mails/authenticity/12-C-SPFpass-DKIMfail-DMARCfail-reject.eml' })
  ])
  I.login('app=io.ox/mail')
  I.waitForApp()
  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.authenticity .fail')
  I.see('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 2.) Create a new mail folder and move that mail there.
  openMoveDialog()
  I.click('Create folder')
  I.waitForText('Add new folder', 5, dialogs.header)
  I.fillField('Folder name', 'Testfolder')
  dialogs.clickButton('Add')
  I.waitForText('Move', 5, dialogs.header)
  I.waitForElement('~Testfolder')
  clickMoveAndChangeFolder('Testfolder')
  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.authenticity .fail')
  I.see('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 3.) Move the mail to "Spam"
  openMoveDialog()
  selectFolderInMoveDialog('Spam')
  clickMoveAndChangeFolder('Spam')
  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.authenticity .fail')
  I.see('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 4.) Move the mail to "Trash"
  openMoveDialog()
  selectFolderInMoveDialog('Trash')
  clickMoveAndChangeFolder('Trash')
  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.authenticity .fail')
  I.see('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 5.) Archive the mail
  I.waitForVisible('~Archive')
  I.click('~Archive', '.classic-toolbar-container')
  I.waitForText('Archive', 10, '.folder-tree')
  I.waitForElement(locate('[aria-label="Archive"] .folder-arrow').inside('.folder-tree'))
  I.click(locate('[aria-label="Archive"] .folder-arrow').inside('.folder-tree'))
  I.waitForText('2018', 10, '.folder-tree')
  I.selectFolder('2018')
  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.authenticity .fail')
  I.see('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 6.) Move the mail to "Sent objects"
  openMoveDialog()
  selectFolderInMoveDialog('Sent')
  clickMoveAndChangeFolder('Sent')

  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.mail-detail .notifications')
  I.dontSee('Warning: This is a dangerous email containing spam or malware.')
  I.waitForNetworkTraffic()
  // 7.) Move the mail to "Drafts"
  openMoveDialog()
  selectFolderInMoveDialog('Drafts')
  clickMoveAndChangeFolder('Drafts')

  mail.selectMail('12-C-SPFpass-DKIMfail-DMARCfail-reject')
  I.waitForElement('.mail-detail-frame')
  I.waitForElement('.mail-detail .notifications')
  I.dontSee('Warning: This is a dangerous email containing spam or malware.')
})
