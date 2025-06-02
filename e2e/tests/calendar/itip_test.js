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

const actions = new DataTable(['action', 'className', 'emailTitle', 'itipStatus'])
// itipStatus needs to be adjusted as soon as OXUIB-206 is fixed
actions.add(['Accept', 'accepted', 'accepted', 'You have accepted this appointment'])
actions.add(['Maybe', 'tentative', 'tentatively accepted', 'You tentatively accepted this appointment'])
actions.add(['Decline', 'declined', 'declined', 'You declined this appointment'])

Feature('Calendar > iTIP')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

Data(actions).Scenario('[C241073] OX - OX', async ({ I, calendar, mail, users, current, contexts }) => {
  const ctx = await contexts.create()
  const externalUser = await users.create(users.getRandom(), ctx)
  await Promise.all([
    I.haveSetting({ 'io.ox/calendar': { layout: 'week:week' } }),
    I.haveSetting({ 'io.ox/calendar': { layout: 'week:week' } }, { user: externalUser })
  ])

  // 1.) User#A: Create an appointment with User#B
  const startDate = moment().add(1, 'week').startOf('day').add(8, 'hour')
  const endDate = moment().add(1, 'week').startOf('day').add(11, 'hour')
  await session('Alice', async () => {
    I.login('app=io.ox/calendar')
    I.waitForApp()
    calendar.newAppointment()
    I.fillField('Title', 'MySubject')
    I.fillField('~Start time', startDate.format('h:mm A'))
    I.clearField('~End time')
    I.fillField('~End time', endDate.format('h:mm A'))
    await calendar.setDate('startDate', startDate)
    await calendar.setDate('endDate', endDate)
    await calendar.addParticipant(users[1].get('primaryEmail'), false)
    I.click('Create')
    I.waitForDetached(calendar.editWindow)
  })
  // 2.) User#B: Read the iTIP mail
  await session('Bob', async () => {
    I.login('app=io.ox/mail', { user: users[1] })
    I.waitForText('New appointment: MySubject', 30)
    mail.selectMail('New appointment: MySubject')
    I.waitForElement('.mail-detail-frame')
    I.waitForText('Accept', 5, '.itip-actions')
    I.see('Maybe', '.itip-actions')
    I.see('Decline', '.itip-actions')
    I.see(`${startDate.format('ddd, M/D/YYYY')}`, '.itip-details')
    // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
    I.see(`${startDate.format('h:mm')}\u2009–\u2009${endDate.format('h:mm')}\u202FA`, '.itip-details')
    // 3.) User#B: Accept the appointment
    I.click(current.action)
    I.waitForText(`You have ${current.emailTitle} the appointment`)
    // 4.) User#B: Go to calendar and verify the updated appointment information
    I.openApp('Calendar')
    I.waitForApp()
    I.waitForVisible('~Next week')
    I.click('~Next week')

    I.waitForText('MySubject', 5, '.page.current .appointment')
    I.click('.page.current .appointment')
    I.waitForElement('.detail-popup')
    I.waitForElement(`.detail-popup .participant.accepted a[title="${users[0].get('primaryEmail')}"]`)
    I.waitForElement(`.detail-popup .participant.${current.className} a[title="${users[1].get('primaryEmail')}"]`)
  })
  // 5.) User#A: Read the iTIP mail
  await session('Alice', async () => {
    I.openApp('Mail')
    I.waitForText(`${users[1].get('display_name')} ${current.emailTitle} the invitation: MySubject`)
    // 6.) User#A: Accept changes
    mail.selectMail(`${users[1].get('display_name')} ${current.emailTitle} the invitation: MySubject`)
    I.waitForElement('.mail-detail-frame')
    I.waitForText('MySubject', 30)
    I.dontSeeElement(locate('button').withText('Accept'))
    I.dontSee('Decline')
    I.dontSee('Maybe')
    I.dontSee('Accept changes')
    // 7.) User#A: Go to calendar and verify the updated appointment information
    I.openApp('Calendar')
    I.waitForApp()
    I.click('~Next week')
    I.waitForText('MySubject', 5, '.page.current .appointment')
    I.click('.page.current .appointment')
    I.waitForElement('.detail-popup')
    I.waitForElement(`.detail-popup .participant.accepted a[title="${users[0].get('primaryEmail')}"]`)
    I.waitForElement(`.detail-popup .participant.${current.className} a[title="${users[1].get('primaryEmail')}"]`)
    // 9.) User#A: Decline the appointment
    I.click('Decline')
    I.waitForElement(`.detail-popup .participant.declined a[title="${users[0].get('primaryEmail')}"]`)
    I.waitForElement(`.detail-popup .participant.${current.className} a[title="${users[1].get('primaryEmail')}"]`)
  })
  await session('Bob', () => {
    // NO iTIP mail is sent to User#B.
    I.openApp('Mail')
    I.refreshPage()
    I.waitForApp()
    I.dontSee(`${users[0].get('display_name')} declined the invitation: MySubject`)
  })
  // 10.) User#A: Delete the appointment
  await session('Alice', () => {
    I.click('~Delete', '.detail-popup')
    I.waitForText('Add a message to the notification email for the other participants')
    I.fillField('comment', 'MyComment')
    I.click('Delete appointment')
    I.waitForDetached('.modal-dialog')
    I.waitForDetached('.appointment [aria-label^="MySubject"]')
  })
  // 11.) User#B: Read the iTIP mail
  await session('Bob', () => {
    I.refreshPage() // maybe create reload function in page object
    I.waitForText('Appointment canceled: MySubject', 15)
    mail.selectMail('Appointment canceled: MySubject')
    I.waitForElement('.mail-detail-frame')
    I.waitForText('MySubject')
    I.waitForText(`${startDate.format('ddd, M/D/YYYY')}`)
    // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
    I.waitForText(`${startDate.format('h:mm')}\u2009–\u2009${endDate.format('h:mm')}\u202FA`)
    // TODO: clarify whether this should show up or not
    // I.waitForText(current.itipStatus)
    I.waitForText('MyComment')
    // 12.) User#B: Delete
    I.click('~Delete')
    I.waitForInvisible(
      locate('.list-view li.list-item')
        .withText('Appointment canceled: MySubject')
    )
    // 13.) User#B: Go to calendar and verify the appointment has been deleted
    I.openApp('Calendar')
    I.dontSee('MySubject')
  })
})

Scenario('[C241128] Attachments in iTIP mails', async ({ I, users, mail, calendar, contexts }) => {
  const ctx = await contexts.create()
  await users.create(users.getRandom(), ctx)
  // 1.) User#A: Create an appointment with attachment with User#B
  // make sure it's always next week
  // just adding 1 day (as before) always failed on saturdays (if Sunday is start of week)
  const startDate = moment().startOf('week').add(8, 'day').add(8, 'hours')
  const endDate = startDate.clone().add(2, 'hours')
  I.login('app=io.ox/calendar')
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'MySubject')
  I.fillField('~Start time', startDate.format('h:mm A'))
  I.clearField('~End time')
  I.fillField('~End time', endDate.format('h:mm A'))
  await calendar.setDate('startDate', startDate)
  await calendar.setDate('endDate', endDate)
  await calendar.addParticipant(users[1].get('primaryEmail'), false)
  I.pressKey('Pagedown')
  I.see('Attachments', calendar.editWindow)
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/testdocument.odt')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
  I.logout()

  // 3.) User#B: Accept the appointment
  I.login('app=io.ox/mail', { user: users[1] })
  I.waitForApp()
  I.waitForText('New appointment: MySubject', 30)
  mail.selectMail('New appointment: MySubject')
  I.waitForElement('.mail-detail-frame')
  I.waitForText('Accept')
  I.waitForText('Maybe')
  I.waitForText('Decline')
  I.waitForText('MySubject')
  I.waitForText(`${startDate.format('ddd, M/D/YYYY')}`)
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.waitForText(`${startDate.format('h:mm')}\u2009–\u2009${endDate.format('h:mm')}\u202FA`)
  I.click('Accept')
  I.waitForText('You have accepted the appointment')

  // 4.) User#B: Download and verify the appointment
  I.openApp('Calendar', { perspective: 'week:week' })
  I.waitForApp()
  I.waitForElement('~Next week')
  I.click('~Next week')
  I.waitForElement('.page.current .appointment')
  I.scrollTo('.page.current .appointment')
  I.waitForVisible('.page.current .appointment')
  I.click('MySubject', '.page.current .appointment')
  I.waitForText('testdocument.odt', 5, '.detail-popup .attachment-list')
  I.handleDownloads()
  I.click('testdocument.odt', '.detail-popup .attachment-list')
  // I.waitForText('Download')
  I.clickDropdown('Download')
  // I.click('Download')
  I.amInPath('/output/downloads/')
  await I.waitForFile('testdocument.odt', 10)
  I.seeFile('testdocument.odt')
  I.seeFileContentsEqualReferenceFile('media/files/generic/testdocument.odt')
  I.logout()

  // 5.) User#A: Read the iTIP mail
  I.login('app=io.ox/mail')
  I.waitForApp()
  I.waitForText(`${users[1].get('display_name')} accepted the invitation: MySubject`, 30)

  // 6.) User#A: verify mail
  mail.selectMail(`${users[1].get('display_name')} accepted the invitation: MySubject`)
  I.waitForElement('.mail-detail-frame')
  I.waitForText('MySubject')

  // 7.) User#A: Download and verify the appointment
  I.openApp('Calendar', { perspective: 'week:week' })
  I.waitForApp()
  I.waitForElement('~Next week')
  I.click('~Next week')
  I.waitForElement('.page.current .appointment')
  I.scrollTo('.page.current .appointment')
  I.waitForVisible('.page.current .appointment')
  I.click('MySubject', '.page.current .appointment')

  I.waitForText('testdocument.odt', undefined, '.detail-popup .attachment-list')

  I.click('testdocument.odt', '.detail-popup .attachment-list')
  I.waitForText('Download')
  I.handleDownloads()
  I.click('Download', '.dropdown.open')
  I.amInPath('/output/downloads/')
  await I.waitForFile('testdocument.odt', 10)
  I.seeFile('testdocument.odt')
  I.seeFileContentsEqualReferenceFile('media/files/generic/testdocument.odt')
})

Scenario('[C241126] iTIP mails without appointment reference', async ({ I, mail, calendar }) => {
  // 1.) Import the attached mail 'mail3.eml'
  await I.haveMail({ path: 'media/mails/c241126_3.eml' })
  // 2.) Read the mail3
  I.login('app=io.ox/mail')
  I.waitForText('Appointment canceled: #1')
  mail.selectMail('Appointment canceled: #1')
  I.waitForText('The appointment "#1" has been canceled by')
  I.waitForText('The appointment could not be found in your calendar.')
  // 3.) Import the attached mail 'mail2.eml'
  await I.haveMail({ path: 'media/mails/c241126_2.eml' })
  // 4.) Read the mail2
  I.waitForText('tthamm accepted the invitation: #1') // cSpell:disable-line
  mail.selectMail('tthamm accepted the invitation: #1') // cSpell:disable-line
  I.waitForText('has accepted the invitation to the appointment "#1"')
  I.waitForText('The appointment could not be found in your calendar.')
  // 5.) Import the attached mail 'mail1.eml'
  await I.haveMail({ path: 'media/mails/c241126_1.eml' })
  // 6.) Read the mail1
  I.waitForText('New appointment: #1')
  mail.selectMail('New appointment: #1')
  I.waitForText('Accept')
  I.waitForText('Maybe')
  I.waitForText('Decline')
  // 7.) 'Accept' the appointment
  I.click('Accept')
  I.waitForText('You have accepted the appointment')
  I.openApp('Calendar')
  I.executeScript(async function () {
    // go to 2018-03-22
    const { default: ox } = await import(String(new URL('ox.js', location.href)))
    ox.ui.App.getCurrentApp().setDate(1521720000000)
  })
  I.click('3/22/2018, Thursday, CW 12', calendar.miniCalendar)
  I.waitForText('#1')
  I.openApp('Mail')
  // 8.) Read the mail2
  mail.selectMail('tthamm accepted the invitation: #1') // cSpell:disable-line
  I.waitForText('The response needs to be applied manually to your calendar.')
  // 9.) Read the mail3
  mail.selectMail('Appointment canceled: #1')
  I.waitForElement('~Delete')
  // 10.) 'Delete'
  I.click('~Delete')
  I.retry(5).dontSee('Appointment canceled: #1')
})

Scenario('[Bug 63767] Error when creating appointment from email', async ({ I, users, mail, calendar }) => {
  await I.haveMail({
    attachments: [{ content: 'Blubber', content_type: 'text/plain', disp: 'inline' }],
    from: users[0],
    subject: 'Testmail for Bug 63767',
    to: users[0]
  })

  I.login('app=io.ox/mail')
  I.waitForApp()

  // select mail and invite to appointment
  mail.selectMail('Testmail for Bug 63767')
  I.waitForVisible('.detail-view-header [aria-label="More actions"]')
  I.click('~More actions', '.mail-header-actions')
  I.waitForText('Invite to appointment', undefined, '.dropdown.open .dropdown-menu')
  I.click('Invite to appointment', '.dropdown.open .dropdown-menu')

  // same as in calendar helper
  I.waitForVisible(locate(calendar.editWindow).as('Edit Dialog'))
  I.waitForFocus('.io-ox-calendar-edit-window input[type="text"][name="summary"]')
  I.fillField('Title', 'Going to the pub')
  I.pressKey('Pagedown')
  I.attachFile('.io-ox-calendar-edit-window input[type="file"]', 'media/files/generic/contact_picture.png')
  I.click('Create', calendar.editWindow)
  // there should be no backend error
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
})
