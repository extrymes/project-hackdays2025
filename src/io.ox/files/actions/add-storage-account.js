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

import _ from '@/underscore'
import Backbone from '@/backbone'
import ox from '@/ox'

import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import { getAPI } from '@/io.ox/oauth/keychain'
import filestorageApi from '@/io.ox/core/api/filestorage'
import OAuth from '@/io.ox/oauth/backbone'

import gt from 'gettext'
import { getAvailableNonOauthServices, getAvailableOauthServices } from '@/io.ox/files/util'

const defaultNames = {
  'com.openexchange.oauth.google': 'Google Drive',
  'com.openexchange.oauth.boxcom': 'Box Drive',
  'com.openexchange.oauth.dropbox': 'Dropbox',
  'com.openexchange.oauth.microsoft.graph': 'OneDrive'
}

async function createAccount (service) {
  const oauthAPI = await getAPI()
  const account = new OAuth.Account.Model({
    serviceId: service.id,
    displayName: oauthAPI.chooseDisplayName(service)
  })
  const options = {}
  // #. Folder name for an external file storage (dropbox, google drive etc)
  // #. %1$s - the name of the file storage service (dropbox, one drive, google drive, box drive)
  if (defaultNames[service.id]) options.displayName = gt('My %1$s', defaultNames[service.id])

  // if only the filestorage account is missing there is no need for Oauth authorization.
  if (oauthAPI.accounts.forService(service.id)[0] && _(account.attributes.enabledScopes).contains('drive') && !filestorageApi.getAccountForOauth(account.attributes)) {
    return filestorageApi.createAccountFromOauth(account.attributes, options).done(function () {
      yell('success', gt('Account added successfully'))
    })
  }

  return account.enableScopes('drive').save().then(async function (res) {
    const api = (await import('@/io.ox/core/folder/api')).default
    api.once('pool:add', function () {
      // fetch account again - there should be new "associations" for this account
      const a = oauthAPI.accounts.get(res.id)
      if (a) a.fetch()
    })

    return filestorageApi.createAccountFromOauth(res, options)
  }).then(function () {
    yell('success', gt('Account added successfully'))
  })
}

function drawContent () {
  const dialog = this
  let view = new OAuth.Views.ServicesListView({
    collection: new Backbone.Collection(this.options.availableServices)
  })

  _.each(this.options.caps, function (cap) {
    filestorageApi.getService(cap).done(function (data) {
      view.collection.add([{ id: data.attributes.id, displayName: data.attributes.displayName, type: 'basicAuthentication' }])
    })
  })

  view.listenTo(view, 'select', function (service) {
    if (service.get('type') === 'basicAuthentication') {
      ox.load(() => import('@/io.ox/files/actions/basic-authentication-account')).then(function ({ default: add }) {
        add('create', service).always(function () {
          view.trigger('done')
        })
      })
    } else {
      createAccount(service).catch(function (e) {
        if (e && e.code === 'EEXISTS') { // cSpell:disable-line
          // #. error message shown to the user after trying to create a duplicate account
          yell('error', gt('Account already exists'))
        } else if (e) {
          yell(e)
        } else {
          yell('error', gt('Account could not be added'))
        }
      }).finally(function () {
        view.trigger('done')
      })
    }
  })
  view.listenTo(view, 'done', function () {
    view.stopListening()
    view = null
    dialog.close()
  })

  dialog.$body.append(view.render().$el)
}

export default async function () {
  return new ModalDialog({
    title: gt('Add storage account'),
    width: 576,
    caps: getAvailableNonOauthServices(),
    availableServices: await getAvailableOauthServices()
  })
    .addButton({ label: gt('Close'), action: 'close' })
    .build(drawContent)
    .open()
}
