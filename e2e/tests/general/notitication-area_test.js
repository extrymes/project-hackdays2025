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
const { expect } = require('chai')

Feature('General > Notifications')

Before(async ({ users }) => { await Promise.all([users.create(), users.create()]) })

After(async ({ users }) => { await users.removeAll() })

Scenario('[C244785] Open event from invite notification in calendar', async ({ I, users, calendar }) => {
  const [userA, userB] = users
  const startTime = moment().startOf('week').add(8, 'days').add(3, 'months').add(8, 'hours')
  const endTime = moment().startOf('week').add(8, 'days').add(3, 'months').add(9, 'hours')

  // UserA: Create an appointment and invite
  I.login(['app=io.ox/calendar'], { user: userA })
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Totally nerdy event')
  I.fillField('Starts on', startTime.format('M/D/YYYY'))
  // clearField should be unnecessary but it's not; for whatever reason (2021-07-07)
  I.clearField('~Start time')
  I.fillField('~Start time', startTime.format('h:mm A'))
  I.fillField('Participants and resources', userB.get('primaryEmail'))
  I.wait(0.2)
  I.pressKey('Enter')
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
  I.logout()

  // userB: start in calendar and check workweek layout
  await I.haveSetting({ 'io.ox/calendar': { layout: 'week:workweek' } }, { user: userB })
  I.login(['app=io.ox/mail'], { user: userB })
  I.waitForVisible('.io-ox-mail-window')
  I.waitForElement('#io-ox-notifications-toggle')
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForText('Invitations', 10)
  I.see('1', '.counter')
  expect(await I.grabAxeReport()).to.be.accessible
  I.click('.item [title="Open in calendar"]')

  I.waitForApp()
  I.waitForElement('.detail-popup', 10)
  I.seeNumberOfElements('.calendar-detail.view', 1)
  I.see('Totally nerdy event', '.detail-popup')
  I.see(`${startTime.format('ddd, M/D/YYYY')}`, '.detail-popup .date')
  // \u2009: THIN SPACE; \u202F: NARROW NO-BREAK SPACE
  I.see(`${startTime.format('h:mm')}\u2009–\u2009${endTime.format('h:mm')}\u202F${endTime.format('A')}`, '.detail-popup .time')
  I.see(`${userA.get('sur_name')}, ${userA.get('given_name')}`, '.detail-popup')
  I.see(`${userB.get('sur_name')}, ${userB.get('given_name')}`, '.detail-popup')
  I.pressKey('Escape')
  I.logout()

  // userB: start in mail and check list layout
  await I.haveSetting({ 'io.ox/calendar': { layout: 'list' } }, { user: userB })
  I.login(['app=io.ox/mail'], { user: userB })
  I.waitForVisible('.io-ox-mail-window')
  I.waitForElement('#io-ox-notifications-toggle')
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForText('Invitations', 10)
  I.click('.item [title="Open in calendar"]')
  I.waitForApp()
  I.waitForText('Totally nerdy event', 10, '.calendar-detail')
  I.waitForText('Totally nerdy event', 10, '.list-item')
  I.pressKey('Escape')
  I.logout()

  // userB: start in calendar and check list layout
  I.login(['app=io.ox/calendar'], { user: userB })
  I.waitForApp()
  I.waitForElement('#io-ox-notifications-toggle')
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForText('Invitations', 10)
  I.click('.item [title="Open in calendar"]')

  I.waitForText('Totally nerdy event', 10, '.list-view')
  I.waitForText('Totally nerdy event', 10, '.calendar-detail')
})

Scenario('List birthdays', async ({ I, mail }) => {
  /* eslint-disable camelcase */
  const folder_id = await I.grabDefaultFolder('contacts')

  await Promise.all([
    I.haveContact({ display_name: 'two days ago', folder_id, birthday: moment().subtract(2, 'days').hour(12).valueOf() }),
    I.haveContact({ display_name: 'one day ago', folder_id, birthday: moment().subtract(1, 'days').hour(12).valueOf() }),
    I.haveContact({ display_name: 'this day', folder_id, birthday: moment().valueOf() }),
    I.haveContact({ display_name: 'in two days', folder_id, birthday: moment().add(2, 'days').hour(12).valueOf() }),
    I.haveContact({ display_name: 'in three days', folder_id, birthday: moment().hour(12).add(3, 'days').valueOf() })
  ])

  I.login()
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle.show-indicator', 20)
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForDetached('#io-ox-notifications-toggle.show-indicator')

  // check
  I.waitForText('Birthdays', 10)
  I.see('4', '.counter')
  I.dontSee('two days ago')
  I.see('one day ago')
  I.see('this day')
  I.see('in two days')
  I.see('in three days')

  expect(await I.grabAxeReport()).to.be.accessible

  I.click('Birthdays')
  I.waitForDetached('#birthdays.category.expanded', 20)
  I.dontSee('two days ago')
  I.dontSee('one day ago')
  I.dontSee('this day')
  I.dontSee('in two days')
  I.dontSee('in three days')

  // check persistence of seen state
  I.refreshPage()

  I.waitForElement('#io-ox-notifications-toggle', 20)
  // trigger via api call to bypass common delay of 5 seconds in notification area
  await I.executeScript(async function () {
    const { default: contactsAPI } = await import(String(new URL('io.ox/contacts/api.js', location.href)))
    return contactsAPI.currentBirthdays()
  })
  I.wait(1)
  I.dontSeeElement('#io-ox-notifications-toggle.show-indicator')
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForText('Birthdays', 10)
  I.see('4', '.counter')
})

Scenario('List overdue tasks', async ({ I, tasks }) => {
  const folder_id = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'Some task #1', folder_id, end_time: moment().subtract(2, 'days').valueOf() }),
    I.haveTask({ title: 'Some task #2', folder_id, end_time: moment().subtract(2, 'days').valueOf() }),
    I.haveTask({ title: 'Some task #3', folder_id, end_time: moment().subtract(2, 'days').valueOf() })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle.show-indicator', 20)
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey('Enter')

  I.waitForText('Overdue Tasks', 10)
  I.waitForFocus('[data-category="overdueTasks"]')
  I.see('3', '.counter')
  I.see('Some task #1', '.io-ox-notifications')
  I.see('Some task #2', '.io-ox-notifications')
  I.see('Some task #3', '.io-ox-notifications')
  I.see('OVERDUE')

  expect(await I.grabAxeReport()).to.be.accessible

  // check toggle
  I.pressKey('Enter')
  I.waitForDetached('#overdueTasks.category.expanded', 20)
  I.dontSee('Some task #1', '.io-ox-notifications')
  I.dontSee('Some task #2', '.io-ox-notifications')
  I.dontSee('Some task #3', '.io-ox-notifications')

  I.pressKey('Space')
  I.waitForElement('#overdueTasks.category.expanded', 20)
  I.see('Some task #1', '.io-ox-notifications')
  I.see('Some task #2', '.io-ox-notifications')
  I.see('Some task #3', '.io-ox-notifications')

  I.click('Overdue Tasks')
  I.waitForDetached('#overdueTasks.category.expanded', 20)
  I.dontSee('Some task #1', '.io-ox-notifications')
  I.dontSee('Some task #2', '.io-ox-notifications')
  I.dontSee('Some task #3', '.io-ox-notifications')

  I.click('Overdue Tasks')
  I.waitForElement('#overdueTasks.category.expanded', 20)

  // remove notification
  I.pressKey('Tab')
  I.pressKey('Tab')
  I.pressKey('Enter')

  I.click('#io-ox-notifications-toggle')
  I.waitForInvisible('.io-ox-notifications')

  tasks.selectTask('Some task #2')
  tasks.editTask()
  I.fillField('Subject', 'Some (edited) task #4')
  I.fillField('Due date', moment().subtract(1, 'days').format('L'))
  I.pressKey('Enter')
  I.click('Save')

  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForText('Some (edited) task #4', 10, '.io-ox-notifications')
  I.see('2', '.counter')
  I.see('Some task #3', '.io-ox-notifications')
  I.dontSee('Some task #2', '.io-ox-notifications')
  I.see('OVERDUE')

  // close
  I.click('Close', '.io-ox-notifications .item-container:nth-child(1)')
  I.waitForDetached('.io-ox-notifications .item-container:nth-child(2)', 20)
  I.dontSee('Some (edited) task #4', '.io-ox-notifications')
  I.see('Some task #3', '.io-ox-notifications')

  I.pressKey('Escape')
  I.waitForDetached('.io-ox-notifications.visible')
})

Scenario('Remove overdue task', async ({ I, tasks }) => {
  const folder_id = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'Some task #1', folder_id, end_time: moment().subtract(2, 'days').valueOf() })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle.show-indicator', 20)
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForDetached('#io-ox-notifications-toggle.show-indicator')
  I.waitForFocus('[data-category="overdueTasks"]')
  I.pressKey('Tab')
  I.pressKey('Enter') // open task popup

  I.waitForElement('.detail-popup')
  I.pressKey('Tab')
  I.pressKey('ArrowRight')
  I.pressKey('ArrowRight')
  I.pressKey('Enter') // mark as done
  I.pressKey('Escape') // close popup
  I.waitForDetached('.detail-popup')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-notifications.visible')
})

Scenario.skip('Remove overdue task from task modal', async ({ I, tasks }) => {
  // This cannot be solved atm, because 'io.ox/tasks/detail-inline' rerenders
  // on change by replacing the dom entirely

  const folder_id = await I.grabDefaultFolder('tasks')
  await Promise.all([
    I.haveTask({ title: 'Some task #1', folder_id, end_time: moment().subtract(2, 'days').valueOf() })
  ])

  I.login('app=io.ox/tasks')
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle.show-indicator', 20)
  I.click('#io-ox-notifications-toggle')
  I.waitForElement('.io-ox-notifications.visible')
  I.waitForDetached('#io-ox-notifications-toggle.show-indicator')
  I.waitForFocus('[data-category="overdueTasks"]')
  I.pressKey('Tab')
  I.pressKey('Enter') // open task popup

  I.waitForElement('.detail-popup')
  I.pressKey('Tab')
  I.pressKey('Enter') // open task modal
  I.selectOption('status', 'Done')
  I.click('Save')
  I.waitForDetached('.floating-window-content')
  I.pressKey('Escape') // close popup
  I.waitForDetached('.detail-popup')
  I.pressKey('Escape')
  I.waitForDetached('.io-ox-notifications.visible')
})

Scenario('Keeps focus during refresh', async ({ I, mail, calendar, users }) => {
  const [userA, userB] = users
  const startTime = moment().startOf('week').add(8, 'days').add(8, 'hours')

  // 1. User#A: Create an appointment which starts in less than 15 minutes and invite User#B
  I.login(['app=io.ox/calendar'], { user: userA })
  I.waitForApp()
  calendar.newAppointment()
  I.fillField('Title', 'Totally nerdy event')

  I.fillField('Starts on', startTime.format('M/D/YYYY'))
  // clearField should be unnecessary but it's not; for whatever reason (2021-07-07)
  I.clearField('~Start time')
  I.fillField('~Start time', startTime.format('h:mm A'))
  I.fillField('Participants and resources', userB.get('primaryEmail'))
  I.wait(0.2)
  I.pressKey('Enter')

  // save
  I.click('Create', calendar.editWindow)
  I.waitForDetached('.io-ox-calendar-edit-window', 5)
  I.logout()

  // 2. User#B: Login and go to any app except Calendar
  const folder_id = await I.grabDefaultFolder('tasks')
  await I.haveTask({
    title: 'Some task', folder_id, end_time: moment().subtract(2, 'days').valueOf()
  })
  await I.haveTask({
    title: 'Some task 2', folder_id, end_time: moment().subtract(2, 'days').valueOf()
  })

  await I.haveSetting({ 'io.ox/calendar': { layout: 'week:workweek' } }, { user: userB })
  I.login(['app=io.ox/mail'], { user: userB })
  I.waitForApp()

  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey(['Shift', 'Tab'])
  I.pressKey('Enter')

  I.waitForFocus('.empty-message', 20)
  I.waitForFocus('[data-category="invitation"]')

  I.pressKey('Tab') // on item
  I.executeScript(async function () {
    const { default: refresh } = await import(String(new URL('io.ox/core/main/refresh.js', location.href)))
    refresh()
  })
  I.waitForElement('~Currently refreshing', 45)
  I.waitForDetached('~Currently refreshing', 45)
  I.waitForFocus('.item')
  I.wait(10)

  I.pressKey('Enter') // open halo
  I.waitForFocus('.detail-popup')

  I.executeScript(async function () {
    const { default: refresh } = await import(String(new URL('io.ox/core/main/refresh.js', location.href)))
    refresh()
  })

  I.waitForElement('~Currently refreshing', 45)
  I.waitForDetached('~Currently refreshing', 45)
  I.waitForFocus('.detail-popup')
  I.pressKey('Escape')
  I.waitForFocus('.item')
})

Scenario('OXUIB-2365 XSS in calendar invitations in notification area', async ({ I, calendar, users }) => {
  const startTime = calendar.getNextMonday()
  await I.haveAppointment({
    summary: '"><img src=x onerror=alert(1)>',
    location: '"><img src=x onerror=alert(1)>',
    startDate: { value: startTime },
    endDate: { value: startTime.add(1, 'hour') },
    attendees: [
      { partStat: 'NEEDS-ACTION', cuType: 'INDIVIDUAL', entity: users[0].get('id'), cn: users[0].get('display_name'), uri: `mailto:${users[0].get('email1')}` }
    ]
  })

  I.login('app=io.ox/calendar')
  I.waitForApp()

  await I.executeScript(function () {
    // @ts-ignore
    window.alertCalled = false
    // @ts-ignore
    window.alert = () => (window.alertCalled = true)
  })

  I.waitForElement('#io-ox-notifications-toggle')
  I.click('#io-ox-notifications-toggle')
  // notifications have a delay, so wait a bit longer here
  I.waitForElement('.io-ox-notifications.visible .item.focusable', 10)

  // @ts-ignore
  const alertCalled = await I.executeScript(function () { return window.alertCalled })
  expect(alertCalled).to.be.false
})

Scenario('Check notification area toggle', async ({ I }) => {
  I.login()
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle')
  I.dontSeeElement('.io-ox-notifications')

  I.click('#io-ox-notifications-toggle')
  I.waitForVisible('.io-ox-notifications')

  // make sure we don't get issues with the animation
  I.wait(0.5)

  I.click('#io-ox-notifications-toggle')
  I.waitForInvisible('.io-ox-notifications', 10)
})

Scenario('Check notification area toggle on smartphone', async ({ I }) => {
  I.emulateSmartphone()
  I.login()
  I.waitForApp()

  I.waitForElement('#io-ox-notifications-toggle')
  I.dontSeeElement('.io-ox-notifications')

  I.click('#io-ox-notifications-toggle')
  I.waitForVisible('.io-ox-notifications')

  I.click('#io-ox-notifications-toggle')
  I.waitForInvisible('.io-ox-notifications', 5)
})
