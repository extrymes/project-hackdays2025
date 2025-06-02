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

import capabilities from '@/io.ox/core/capabilities'
import OAuth from '@/io.ox/oauth/backbone'
import { getAPI } from '@/io.ox/oauth/keychain'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

async function createAccount (service) {
  const oauthAPI = await getAPI()
  const account = new OAuth.Account.Model({
    serviceId: service.id,
    displayName: oauthAPI.chooseDisplayName(service)
  })

  return account.enableScopes('calendar_ro').save().then(function () {
    return folderAPI.create('1', {
      module: 'event',
      title: gt('My Google Calendar'),
      'com.openexchange.calendar.provider': 'google',
      'com.openexchange.calendar.config': {
        oauthId: account.id
      }
    })
  }).then(function (res) {
    yell('success', gt('Account added successfully'))
    // fetch account again - there should be new "associations" for this account
    const a = oauthAPI.accounts.get(res['com.openexchange.calendar.config'].oauthId)
    if (a) a.fetch()
  })
}

export default async function () {
  if (!capabilities.has('calendar_google')) return console.error('Cannot add google calendar due to missing capability "calendar_google"')
  const oauthAPI = await getAPI()
  const googleService = oauthAPI.services.find(function (model) {
    return model.get('id').indexOf('google') >= 0
  })
  if (!googleService) return console.error('No google service provider found')
  if (googleService.get('availableScopes').indexOf('calendar_ro') < 0) return console.error('Cannot add calendar due to missing scope "calendar" in OAuth service')
  createAccount(googleService)
}
