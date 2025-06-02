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

'use strict'

const { recorder, event: codeceptEvents } = require('codeceptjs')
const { event, util } = require('@open-xchange/codecept-helper')

module.exports = function () {
  codeceptEvents.dispatcher.on(codeceptEvents.all.before, function () {
    recorder.startUnlessRunning()
    console.log('shared domain configuration')
    recorder.add('configure shared domain', async () => {
      try {
        await util.executeSoapRequest('OXaaSService', 'createSharedDomain', {
          domainname: util.mxDomain(),
          creds: util.admin() // cspell:disable-line
        })
      } catch (e) {
        console.error(e)
      }
    })
  })
  event.dispatcher.on(event.provisioning.user.created, (user) => {
    recorder.startUnlessRunning()
    recorder.add('inject custom user settings', async () => {
      await Promise.all([
        user.hasConfig('io.ox/tours//server/startOnFirstLogin', false),
        user.hasConfig('io.ox/tours//whatsNew/autoShow', 0),
        user.doesntHaveCapability('mandatory_wizard'),
        user.doesntHaveCapability('multifactor'),
        user.hasConfig('io.ox/core//whatsNew/autoStart', false)
      ])
      if (user.keepWelcomeMail) return
      try {
        const { httpClient, session } = await util.getSessionForUser({ user })
        const clearMailFolder = (folder) => httpClient.put('api/folders', [folder], {
          params: {
            action: 'clear',
            session
          }
        })
        await clearMailFolder('default0/INBOX')
        await clearMailFolder('default0/Trash')
      } catch (error) {
        console.error(error.message ? error.message : error)
      }
    })
  })
}
