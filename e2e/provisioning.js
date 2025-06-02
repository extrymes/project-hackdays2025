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

const helperUtil = require('@open-xchange/codecept-helper/src/util.js')
const fs = require('node:fs')
const util = require('node:util')
require('codeceptjs')
const { getConfig } = require('codeceptjs/lib/command/utils')
require('dotenv-defaults').config()

const userPath = process.env.DEFAULT_USER_PATH_HC || process.env.DEFAULT_USER_PATH
const PMUserPath = process.env.PM_USER_PATH
const codeceptDir = process.cwd()
const config = getConfig(codeceptDir)
const { admin, smtpServer, imapServer } = config.helpers.OpenXchange

const mxDomain = process.env.MX_DOMAIN || 'box.ox.io'
const filestoreId = process.env.FILESTORE_ID || '8'
const defaultContextData = { id: 10, loginMappings: 'defaultcontext', filestoreId, maxQuota: -1 }
const PMContextData = { id: 11, loginMappings: 'pm', filestoreId, maxQuota: -1 }
const additionalCaps = process.env.PROVISIONING_CAPS ? process.env.PROVISIONING_CAPS.split(',') : ['switchboard', 'spreadsheet', 'text', 'document_preview', 'presentation', 'presenter', 'remote_presenter']

const adminUser = {
  name: 'oxadmin',
  password: admin.password,
  display_name: 'context admin',
  sur_name: 'admin',
  given_name: 'context',
  email1: `oxadmin@${mxDomain}`,
  primaryEmail: `oxadmin@${mxDomain}`
}

const createContext = async (contextData) => {
  try {
    await helperUtil.executeSoapRequest('OXContextService', 'create', {
      ctx: contextData,
      admin_user: adminUser,
      auth: admin
    })
    console.log('Context created', contextData.id)

    await helperUtil.executeSoapRequest('OXContextService', 'changeModuleAccessByName', {
      ctx: { id: contextData.id },
      access_combination_name: 'all',
      auth: admin
    }).catch(err => {
      console.log('access failed')
      console.error(err)
    })

    await Promise.all([
      additionalCaps.map(capsToAdd => {
        return helperUtil.executeSoapRequest('OXContextService', 'changeCapabilities', {
          capsToAdd,
          ctx: { id: contextData.id },
          auth: admin
        }).catch(err => {
          console.log('caps failed')
          console.error(err)
        })
      })
    ])
  } catch (error) {
    console.error(error)
  }
}

const provisionUsers = async (contextData, userPath) => {
  const readFile = util.promisify(fs.readFile)
  const users = JSON.parse(String(await readFile(userPath)))

  await Promise.all([
    users.map(user => {
      const specificUser = Object.assign({
        password: user.password,
        primaryEmail: `${user.name}@${mxDomain}`,
        email1: `${user.name}@${mxDomain}`,
        display_name: `${user.given_name} ${user.sur_name}`,
        imapLogin: user.name,
        imapServer,
        smtpServer
      }, user)
      return helperUtil.executeSoapRequest('OXUserService', 'create', {
        ctx: { id: contextData.id },
        usrdata: specificUser,
        auth: { login: adminUser.name, password: adminUser.password }
      }).catch(err => {
        if (!err.message.includes('is already used') && !err.message.includes('already exists')) console.error(err)
      })
    })
  ])
}
(async () => {
  await createContext(defaultContextData)
  await createContext(PMContextData)
  provisionUsers(defaultContextData, userPath)
  provisionUsers(PMContextData, PMUserPath)
})()
