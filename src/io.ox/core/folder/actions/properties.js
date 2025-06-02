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

import $ from '@/jquery'
import _ from '@/underscore'
import moment from '@open-xchange/moment'

import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/folder/api'
import capabilities from '@/io.ox/core/capabilities'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { getAPI } from '@/io.ox/oauth/keychain'
import CopyToClipboard from '@/io.ox/backbone/mini-views/copy-to-clipboard'

import gt from 'gettext'
import openSettings from '@/io.ox/settings/util'

let oauthAPI
(async () => {
  oauthAPI = await getAPI()
})()

function group (label, value) {
  const guid = _.uniqueId('form-control-label-')
  return $('<div class="form-group">').append(
    // label
    $('<label class="control-label">').attr('for', guid).text(label),
    // value
    $('<div class="input-group link-group">').append(
      $('<input type="text" class="form-control">')
        .attr('id', guid)
        .prop('readonly', true)
        .val(value),
      $('<span class="input-group-btn">').append(
        new CopyToClipboard({ content: value }).render().$el
      )
    )
  )
}

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'caldav-url',
  index: 300,
  requires (model) {
    // make sure this works for tasks and calendar
    if (model.get('module') === 'calendar') {
      const usedForSync = model.get('used_for_sync') || {}
      if (!usedForSync || usedForSync.value !== 'true') return false
      // for tasks also check if the capability is enabled and the folder is private
    } else if (!(model.get('module') === 'tasks' && capabilities.has('caldav') && model.is('private'))) return false

    return model.get('com.openexchange.caldav.url')
  },
  render () {
    this.$body.append(group(gt('CalDAV URL'), this.model.get('com.openexchange.caldav.url')))
  }
})

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'ical-url',
  index: 400,
  requires (model) {
    const provider = model.get('com.openexchange.calendar.provider')
    if (provider !== 'ical') return false
    const config = model.get('com.openexchange.calendar.config')
    if (!config || !config.uri) return false
    return true
  },
  render () {
    this.$body.append(group(gt('iCal URL'), this.model.get('com.openexchange.calendar.config').uri))
  }
})

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'description',
  index: 500,
  requires (model) {
    const extendedProperties = model.get('com.openexchange.calendar.extendedProperties')
    return extendedProperties && extendedProperties.description && extendedProperties.description.value
  },
  render () {
    const extendedProperties = this.model.get('com.openexchange.calendar.extendedProperties')
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label>').text(gt('Description')),
        $('<div class="help-block">').text(extendedProperties.description.value)
      )
    )
  }
})

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'last-updated',
  index: 600,
  requires (model) {
    const extendedProperties = model.get('com.openexchange.calendar.extendedProperties')
    return extendedProperties && extendedProperties.lastUpdate
  },
  render () {
    const extendedProperties = this.model.get('com.openexchange.calendar.extendedProperties')
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label>').text(gt('Last updated')),
        $('<div class="help-block">').text(moment(extendedProperties.lastUpdate.value).fromNow())
      )
    )
  }
})

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'account',
  index: 700,
  requires (model) {
    const provider = model.get('com.openexchange.calendar.provider')

    if (provider !== 'google') return false
    const config = model.get('com.openexchange.calendar.config')
    if (!config || !config.oauthId) return false
    const account = oauthAPI.accounts.get(config.oauthId)
    if (!account) return false
    const displayName = account.get('displayName')
    if (!displayName) return false
    return true
  },
  render () {
    const self = this
    const displayName = oauthAPI.accounts.get(this.model.get('com.openexchange.calendar.config').oauthId).get('displayName')
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label>').text(gt('Account')),
        $('<div>').append(
          $('<a href="#" role="button">').text(displayName).on('click', function (e) {
            e.preventDefault()
            openSettings('virtual/settings/io.ox/settings/accounts')
            self.close()
          })
        )
      )
    )
  }
})

const providerMapping = {
  ical: gt('iCal feed'),
  google: gt('Google subscription')
}

ext.point('io.ox/core/folder/actions/properties').extend({
  id: 'provider',
  index: 800,
  requires (model) {
    const provider = model.get('com.openexchange.calendar.provider')
    return provider && providerMapping[provider]
  },
  render: (function () {
    return function () {
      const provider = this.model.get('com.openexchange.calendar.provider')
      this.$body.append(
        $('<div class="form-group">').append(
          $('<label>').text(gt('Type')),
          $('<div class="help-block">').text(providerMapping[provider])
        )
      )
    }
  }())
})

export default {
  check (id) {
    const model = api.pool.getModel(id)
    let somethingToShow = false

    ext.point('io.ox/core/folder/actions/properties').each(function (extension) {
      // we already show something
      if (somethingToShow) return
      // support functions and booleans
      if (_.isFunction(extension.requires)) {
        somethingToShow = extension.requires(model)
        return
      }
      if (_.isBoolean(extension.requires)) {
        somethingToShow = extension.requires
        return
      }
      // not defined? extension is shown
      somethingToShow = true
    })
    return somethingToShow
  },
  openDialog: function folderProperties (id) {
    const model = api.pool.getModel(id)

    new ModalDialog({
      title: gt('Properties') + ': ' + model.getTitle(),
      point: 'io.ox/core/folder/actions/properties',
      model,
      width: 500
    })
      .addButton({ label: gt('Close'), action: 'close' })
      .open()
  }
}
