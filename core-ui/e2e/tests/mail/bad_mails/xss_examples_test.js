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

Feature('Mail > Listview @codeReview')

const fs = require('node:fs')
const util = require('node:util')
const path = require('node:path')
const readFile = util.promisify(fs.readFile)
const assert = require('assert')
const FormData = require('form-data')
const helperUtil = require('@open-xchange/codecept-helper').util

Before(async ({ users }) => { await users.create() })

After(async ({ users }) => { await users.removeAll() })

async function chunk (start, end) {
  const { I } = inject()
  // @ts-ignore
  const joinedPath = path.join(global.codecept_dir, 'media/mails/badmails-xss.json')
  const files = JSON.parse(String(await readFile(joinedPath)))
  let size = 0
  // forEach does not handle await correctly
  I.say(start + ':' + end + ':' + files.length, 'blue')
  for (let index = 0; index < files.length; index++) {
    if (index >= start && index < end) {
      size++
      const { httpClient, session } = await helperUtil.getSessionForUser()

      // import the mail
      const form = new FormData()
      form.append('file', files[index].content, { filename: files[index].filename })
      const response = await httpClient.post('/api/mail', form, {
        params: {
          action: 'import',
          session,
          folder: 'default0/INBOX',
          force: true
        },
        headers: form.getHeaders()
      })

      // magic hack to just get the json out of the html response
      const matches = /\((\{.*?\})\)/.exec(response.data)
      const resData = matches && matches[1] ? JSON.parse(matches[1]) : response.data
      assert.strictEqual(resData.error, undefined, JSON.stringify(resData))
    }
  }
  I.login('app=io.ox/mail')
  I.waitForVisible('.io-ox-mail-window .list-view')
  for (let i = (size - 1); i >= 0; i--) {
    I.waitForElement(`.list-view .list-item[data-index="${i}"] .drag-title`)
  }
  I.logout()
}

Scenario('[C204747] Listing mailbox content (chunk #1)', async () => await chunk(0, 20))
Scenario('[C204747] Listing mailbox content (chunk #2)', async () => await chunk(20, 40))
Scenario('[C204747] Listing mailbox content (chunk #3)', async () => await chunk(40, 60))
Scenario('[C204747] Listing mailbox content (chunk #4)', async () => await chunk(60, 80))
Scenario('[C204747] Listing mailbox content (chunk #5)', async () => await chunk(80, 100))
Scenario('[C204747] Listing mailbox content (chunk #6)', async () => await chunk(100, 120))
