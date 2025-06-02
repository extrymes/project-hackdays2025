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

Feature('Mail > Flags')

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

const flagged = '.mail-item .list-item .flag [title="Flagged"]'
const colorFlag = '.list-item .color-flag.flag_10'
const defaultColorFlag = '.list-item .color-flag.flag_1'

// --------------------------------------------------------------------------

Scenario('[C114336] Flag an E-Mail with a color flag', async ({ I, mail }) => {
  const me = getUtils()
  await me.login({ mode: 'color' })
  mail.selectMail('Flag mails')
  // set
  I.click('~Set color')
  I.wait(0.5)
  I.waitForText('Yellow')
  I.retry(10).click('[data-action="color-yellow"]', '.smart-dropdown-container.flag-picker')
  I.waitForVisible(colorFlag)
  // unset
  I.click('~Set color')
  I.wait(0.5)
  I.waitForText('Yellow')
  I.retry(10).click('[data-action="color-none"]', '.smart-dropdown-container.flag-picker')
  I.waitForInvisible('.list-item .color-flag')
})

Scenario('[C114337] Flag an E-Mail with a star', async ({ I, mail }) => {
  const me = getUtils()
  await me.login({ mode: 'star' })
  mail.selectMail('Flag mails')
  I.clickToolbar('[data-action="io.ox/mail/actions/flag"]:not(.disabled)')
  // me.clickToolbarAction('flag');
  I.dontSeeElement('[data-action="io.ox/mail/actions/color"]')
  I.waitForElement(flagged)
})

Scenario('[C114339a] Flag an E-Mail on an alternative client (mode "color")', async ({ I }) => {
  const me = getUtils()
  await me.login({ mode: 'color' }, 8)
  me.setFlags(0, true)
  me.selectMail()
  I.waitForElement(defaultColorFlag)
  I.dontSee(flagged)
})

Scenario('[C114339b] Flag an E-Mail on an alternative client (mode "star")', async ({ I }) => {
  const me = getUtils()
  await me.login({ mode: 'star' }, 8)
  me.setFlags(0, true)
  me.selectMail()
  I.waitForElement(flagged)
  I.dontSee(defaultColorFlag)
})

// --------------------------------------------------------------------------

function getUtils () {
  const { I, users } = inject()
  return {

    login: async function (options, flags) {
      await I.haveSetting('io.ox/core//autoStart', 'none')
      const icke = users[0].get('email1')
      await I.haveMail({
        attachments: [{
          content: 'Lorem ipsum',
          content_type: 'text/plain',
          disp: 'inline'
        }],
        flags: flags || 0,
        from: [['Icke', icke]],
        subject: 'Flag mails',
        to: [['Icke', icke]]
      })

      I.login()
      this.haveSetting(options)
      I.waitForInvisible('#background-loader')
      I.openApp('Mail')
      I.waitForApp()
      I.waitForText('No message selected')
    },

    haveSetting: function (options) {
      I.executeScript(async function (options) {
        const { settings: mailSettings } = await import(String(new URL('io.ox/mail/settings.js', location.href)))
        mailSettings.set('features/flagging', options)
        mailSettings.flagByColor = options.mode === 'color'
        mailSettings.flagByStar = options.mode === 'star'
      }, options)
    },

    selectMail: function () {
      // wait for first email
      this.waitAndClick('.list-view .list-item')
      I.waitForVisible('.thread-view.list-view .list-item')
    },

    waitAndClick: function (arg) {
      I.waitForElement(arg)
      I.click(arg)
    },

    clickToolbarAction: function (action) {
      const selector = '.classic-toolbar [data-action="io.ox/mail/actions/' + action + '"]:not(.disabled)'
      this.waitAndClick(selector)
    },

    setFlags: async function (colorLabel, flag) {
      await I.executeAsyncScript(async function (colorLabel, flag, done) {
        const { default: http } = await import(String(new URL('io.ox/core/http.js', location.href)))
        http.PUT({
          module: 'mail',
          params: { action: 'update', id: 1, folder: 'default0/INBOX' },
          data: { color_label: colorLabel || 0, flags: 8, value: !!flag },
          appendColumns: false
        })
          .always(function () {
            // @ts-ignore
            window.list.reload()
            done()
          })
      }, colorLabel, flag)
    },

    removeAllFlags: function () {
      this.setFlags(0, false)
    },

    refreshList: function () {
      I.executeScript(function () {

      })
    }
  }
}
