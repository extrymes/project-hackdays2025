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

const moment = require('moment')

Feature('Mailfilter > Vacation notice')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C163027] Indicator initially shown', async ({ I, users, mail }) => {
  const [user] = users
  await I.haveMailFilterRule({ rulename: 'vacation notice', active: true, flags: ['vacation'], test: { id: 'true' }, actioncmds: [{ days: '7', subject: 'Test Subject', text: 'Test Text', id: 'vacation', addresses: [user.get('primaryEmail')] }] })
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Your vacation notice is active', 5, '.list-view-control .indicator')
  I.click('Close', '.list-view-control .indicator')
  I.waitForInvisible('.list-view-control .indicator')
})

Scenario('List vacation notice first', async ({ I, users, mail, dialogs, settings }) => {
  await Promise.all([
    I.haveMailFilterRule({ rulename: 'autoforward', active: true, flags: ['autoforward'], test: { id: 'true' }, actioncmds: [{ id: 'redirect', to: 'test@localhost' }] }),
    I.haveMailFilterRule({ rulename: 'vacation notice', active: true, flags: ['vacation'], test: { id: 'true' }, actioncmds: [{ days: '7', subject: 'Test Subject', text: 'Test Text', id: 'vacation', addresses: [users[0].get('primaryEmail')] }] })
  ])

  I.login('app=io.ox/mail')
  I.waitForApp()

  // check order
  I.waitForText('Your vacation notice is active')
  I.waitForText('Auto forwarding is active')
  I.waitForText('Your vacation notice is active', 5, '.slot.header .indicator:nth-child(1)')
  I.waitForText('Auto forwarding is active', 5, '.slot.header .indicator:nth-child(2)')

  // check link to settings
  I.click('Auto forwarding is active')
  I.waitForText('Auto forward', 5, '.modal-dialog')
  I.click('Cancel', '.modal-dialog')
  I.waitForDetached('.modal-dialog')

  // disable vacation notice
  I.click('Your vacation notice is active')
  dialogs.waitForVisible()
  I.click('.toggle')
  I.dontSeeCheckboxIsChecked('active')
  I.click('Apply changes', dialogs.footer)
  I.waitForDetached('.modal-dialog')
  I.dontSee('Your vacation notice is active')

  // enable vacation notice again to check order
  settings.open('Mail', 'Rules')
  // we need .settings-detail-pane as context here since
  // neither [data-action="edit-vacation-notice"] nor 'Vacation notice ...' are unique in the DOM
  I.waitForElement('.settings-detail-pane [data-action="edit-vacation-notice"]')
  I.click('Vacation notice ...', '.settings-detail-pane')
  dialogs.waitForVisible()
  I.waitForText('Vacation notice', 5, '.modal-dialog')
  I.waitForElement('.modal-dialog .checkbox.switch.large')
  I.click('.toggle')
  I.seeCheckboxIsChecked('active')
  I.click('Apply changes', dialogs.footer)

  // check order
  I.see('Your vacation notice is active', '.slot.header .indicator:nth-child(1)')
  I.see('Auto forwarding is active', '.slot.header .indicator:nth-child(2)')
})

Scenario('Single user roundtrip with add and remove', ({ I, mail, dialogs, settings }) => {
  // for indicator check
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForVisible('.io-ox-mail-settings [data-action="edit-vacation-notice"]')
  I.dontSeeElement('[data-action="edit-vacation-notice"] svg.mini-toggle')
  I.click('Vacation notice ...')
  dialogs.waitForVisible()

  // check for all expected elements and their states
  I.waitForElement('.modal-header input[name="active"]', 5)
  I.dontSeeCheckboxIsChecked('active')
  I.seeElement('.modal input[name="activateTimeFrame"][disabled]')
  I.seeElement('.modal input[name="dateFrom"][disabled]')
  I.seeElement('.modal input[name="dateUntil"][disabled]')
  I.seeElement('.modal input[name="subject"][disabled]')
  I.seeElement('.modal textarea[name="text"][disabled]')
  I.see('Show advanced options')
  I.see('Cancel', dialogs.footer)
  I.see('Apply changes', dialogs.footer)

  // enable, fill some fields and apply
  I.click('.toggle')
  I.seeCheckboxIsChecked('active')
  I.seeElement('.modal input[name="activateTimeFrame"]:not([disabled])')
  I.seeElement('.modal input[name="subject"]:not([disabled])')
  I.seeElement('.modal textarea[name="text"]:not([disabled])')
  I.fillField('Subject', 'Vacation subject')
  I.fillField('Message', 'Vacation text')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('modal[data-point="io.ox/mail/vacation-notice/edit"]')
  I.waitForElement('[data-action="edit-vacation-notice"] svg.mini-toggle')
  I.see('Vacation notice ...', '.settings-detail-pane [data-action="edit-vacation-notice"]')
  settings.close()

  // mail list view control
  I.openApp('Mail')
  I.waitForApp()
  I.waitForText('Your vacation notice is active', 5, '.list-view-control')
  I.click('Your vacation notice is active', '.list-view-control')
  dialogs.waitForVisible()

  // edit dialog again
  I.seeInField('.modal input[name="subject"]', 'Vacation subject')
  I.seeInField('.modal textarea[name="text"]', 'Vacation text')
  I.seeElement('.modal input[name="dateFrom"][disabled]')
  I.seeElement('.modal input[name="dateUntil"][disabled]')

  // check option "during this time only" and cancel
  I.checkOption('Send vacation notice during this time only')
  I.waitForElement('.modal input[name="dateFrom"]:not([disabled])')
  I.waitForElement('.modal input[name="dateUntil"]:not([disabled])')
  dialogs.clickButton('Cancel')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')

  // once again
  settings.open('Mail', 'Rules')
  I.waitForVisible('.settings-detail-pane [data-action="edit-vacation-notice"]')
  I.waitForVisible('[data-action="edit-vacation-notice"] svg.mini-toggle')
  I.see('Vacation notice ...', '.settings-detail-pane [data-action="edit-vacation-notice"]')
  I.click('Vacation notice ...', '.settings-detail-pane [data-action="edit-vacation-notice"]')
  dialogs.waitForVisible()

  I.waitForElement('.modal input[name="subject"]', 5)
  I.seeInField('.modal input[name="subject"]', 'Vacation subject')
  I.seeInField('.modal textarea[name="text"]', 'Vacation text')
  I.fillField('Subject', 'Update vacation subject')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('modal[data-point="io.ox/mail/vacation-notice/edit"]')
  I.waitForElement('[data-action="edit-vacation-notice"] svg.mini-toggle')
  I.see('Vacation notice ...', '.settings-detail-pane [data-action="edit-vacation-notice"]')
  settings.close()

  // check for updated text
  I.waitForText('Your vacation notice is active', 5, '.list-view-control')
  I.click('Your vacation notice is active', '.list-view-control')
  dialogs.waitForVisible()
  I.waitForElement('.modal input[name="subject"]', 5)
  I.seeInField('.modal input[name="subject"]', 'Update vacation subject')
  I.seeInField('.modal textarea[name="text"]', 'Vacation text')

  // disable
  I.click('.toggle')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('modal[data-point="io.ox/mail/vacation-notice/edit"]')
  I.waitForInvisible('.alert [data-action="edit-vacation-notice"]')
  I.dontSee('Your vacation notice is active', '.list-view-control')
})

Scenario('[C7785] Multi user roundtrip', async ({ I, users, mail, dialogs, settings }) => {
  await I.haveSetting({ 'io.ox/mail': { messageFormat: 'text' } }, { user: users[1] })

  // User that will be absent
  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules')
  I.waitForApp()
  I.waitForVisible('.io-ox-mail-settings [data-action="edit-vacation-notice"]')
  I.click('Vacation notice ...')
  dialogs.waitForVisible()

  // enable, fill some fields and apply
  I.waitForText('Send vacation notice during this time only')
  I.waitForElement('.toggle', 5)
  I.click('.toggle')
  I.fillField('Subject', 'Vacation subject')
  I.fillField('Message', 'Vacation text')
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal[data-point="io.ox/mail/vacation-notice/edit"]')

  I.waitForElement('[data-action="edit-vacation-notice"] svg.mini-toggle', 5)
  settings.close()

  // check indicator
  I.waitForText('Your vacation notice is active', 5, '.list-view-control .indicator')
  I.logout()

  // compose mail for user 0
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  mail.newMail()
  I.fillField('To', users[0].get('primaryEmail'))
  I.fillField('Subject', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')
  mail.send()
  I.waitForElement('~Sent, 1 total.', 30)
  I.logout()

  // check mailbox of user 0
  I.login('app=io.ox/mail')
  I.waitForApp()

  // check for mail
  mail.selectMail('Test subject')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Test subject', '.mail-detail-pane')
  I.logout()

  // check mailbox of user 1
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  // check for vacation notice
  mail.selectMail('Vacation subject')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Vacation subject', '.mail-detail-pane')
})

Scenario('[C110281] Is capable of time zones', async ({ I, users, mail, dialogs, settings }) => {
  await Promise.all([
    I.haveSetting({ 'io.ox/core': { timezone: 'Europe/London' }, 'io.ox/mail': { messageFormat: 'text' } }),
    I.haveSetting({ 'io.ox/core': { timezone: 'Pacific/Kiritimati' } }, { user: users[1] })
  ])

  I.login('settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules', { user: users[1] })
  I.waitForApp()
  I.waitForText('Vacation notice ...', 5, '.settings-detail-pane')
  I.click('Vacation notice ...')
  dialogs.waitForVisible()

  // enable
  I.click('.modal-header .checkbox.switch.large', dialogs.header)

  I.fillField('.modal input[name="subject"]', 'Vacation subject')
  I.fillField('.modal textarea[name="text"]', 'Vacation text')

  I.checkOption('Send vacation notice during this time only')
  dialogs.clickButton('Apply changes')

  I.see('Vacation notice ...', '[data-action="edit-vacation-notice"]')

  I.waitForElement('[data-action="edit-vacation-notice"] > svg')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  settings.close()
  I.logout()

  I.login('app=io.ox/mail')
  I.waitForApp()

  // compose mail for user 1
  mail.newMail()
  I.fillField('To', users[1].get('primaryEmail'))
  I.fillField('Subject', 'Test subject')
  I.fillField({ css: 'textarea.plain-text' }, 'Test text')
  I.seeInField({ css: 'textarea.plain-text' }, 'Test text')
  mail.send()

  // check for mail
  I.waitForElement('~Sent, 1 total.', 30)
  I.waitForElement('~Inbox, 1 unread, 1 total.', 30)

  mail.selectMail('Vacation subject')
  I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject')
  I.see('Vacation subject', '.mail-detail-pane')
})

Scenario('Vacation notice is correctly listed after a status update', async ({ I, users, dialogs, mail, settings, calendar }) => {
  const [user] = users

  await I.haveMailFilterRule({
    active: true,
    actioncmds: [
      { days: '7', subject: 'test', text: 'test', id: 'vacation', addresses: [user.get('primaryEmail')] }
    ],
    test: { id: true },
    flags: ['vacation'],
    rulename: 'vacation notice'
  })

  I.login('app=io.ox/calendar&settings=virtual/settings/io.ox/mail&section=io.ox/mail/settings/rules') // open calendar instead of mail, otherwise "Vacation notice" is not unique
  I.waitForApp()

  I.waitForElement('[data-action="edit-vacation-notice"]')
  I.click('Vacation notice ...')
  dialogs.waitForVisible()
  I.click('.checkbox.switch.large', dialogs.header)
  dialogs.clickButton('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  I.waitForElement('.io-ox-settings-main .io-ox-mailfilter-settings')
  I.waitForElement('.io-ox-mailfilter-settings .settings-list-item.disabled')
})

Scenario('[OXUIB-2065] Vacation notice button with vacationDomains setting', async ({ I, mail, users, settings }) => {
  const mxDomain = users[0].get('primaryEmail').split('@')[1]
  await users[0].hasConfig('com.openexchange.mail.filter.vacationDomains', `${mxDomain},example.org`)

  // seems the setting doesn't really have an effect,
  // so we just create a filter rule using API
  // otherwise, it can be created via UI at this point
  await I.haveMailFilterRule({
    rulename: 'Abwesenheitsbenachrichtigung',
    active: true,
    flags: ['vacation'],
    test: {
      id: 'allof',
      tests: [{
        id: 'address',
        comparison: 'is',
        addresspart: 'domain',
        headers: ['from'],
        values: [mxDomain, 'example.com']
      }]
    },
    actioncmds: [{
      id: 'vacation',
      days: '7',
      addresses: [users[0].get('primaryEmail')],
      subject: 'I am on vacation',
      text: 'Please contact me later'
    }]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText('Your vacation notice is active')

  await users[0].hasConfig('com.openexchange.mail.filter.vacationDomains', '')

  I.refreshPage()
  I.waitForApp()

  settings.open('Mail', 'Rules')
  I.waitForText('Vacation notice ...')
  I.click('Vacation notice ...', '.io-ox-mail-settings')

  const nextWeekStart = moment().utc().add(7, 'days').startOf('week')
  const yesterday = moment().utc().subtract(1, 'day').startOf('day')

  I.waitForText('Send vacation notice during this time only')
  I.checkOption('Send vacation notice during this time only')
  I.dontSee('3 days')
  I.fillField('Start', yesterday.format('l'))
  I.pressKey('Enter')
  I.fillField('End', yesterday.clone().add(3, 'days').startOf('day').format('l'))
  I.pressKey('Enter')
  const diffDays = Math.round(yesterday.clone().add(3, 'days').endOf('day').diff(yesterday) / 1000 / 60 / 60 / 24)
  I.see(`${diffDays} days`)
  I.click('Apply changes')
  I.waitForDetached('.modal:not(.io-ox-settings-main)')
  settings.close()

  I.click('Your vacation notice is active')
  I.waitForText(`${diffDays} days`)

  I.fillField('Start', nextWeekStart.format('l'))
  I.pressKey('Enter')
  I.fillField('End', nextWeekStart.clone().add(2, 'days').format('l'))
  I.pressKey('Enter')
  I.see('3 days')
  I.click('Apply changes')

  I.dontSee('You vacation notice is active')
})
