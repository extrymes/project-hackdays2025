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

import Backbone from '@/backbone'
import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'

import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import * as util from '@/io.ox/core/settings/util'
import yell from '@/io.ox/core/yell'
import api from '@/io.ox/core/api/appPasswordApi'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import PasswordView from '@/io.ox/settings/security/appPasswords/settings/views'

import '@/io.ox/settings/security/appPasswords/settings/style.scss'
import '@/io.ox/settings/security/appPasswords/settings/addPassword'

import gt from 'gettext'

const PasswordModel = Backbone.Model.extend({
  idAttribute: 'UUID'
})

const PasswordCollection = Backbone.Collection.extend({
  model: PasswordModel
})

ext.point('io.ox/settings/security/appPasswords/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      new ExtensibleView({ point: 'io.ox/settings/security/appPasswords/settings/detail/view' })
        .render().$el
    )
    ox.on('refresh^', function () {
      if ($('.appPasswords').is(':visible')) refreshList()
    })
  }
})

let INDEX = 0

ext.point('io.ox/settings/security/appPasswords/settings/detail/view').extend(
  {
    id: 'intro',
    index: INDEX += 100,
    render () {
      this.$el.append(
        util.explanation(
          gt('Manage additional passwords for use with other devices.')
        )
      )
    }
  },
  {
    id: 'list',
    index: INDEX += 100,
    render () {
      const $el = $('<div id="passwordList" class="appPasswords">')
      this.$el.append(
        util.fieldset(gt('Existing passwords'), $el).addClass('appPasswords')
      )
      // delay otherwise global selectors don't work (bad code anyhow)
      setTimeout(() => refreshList(), 10)
    }
  },
  {
    id: 'add',
    index: INDEX += 100,
    render (baton) {
      const $el = $('<div>')
      this.$el.append(
        util.fieldset(gt('Add passwords'), $el)
      )
      ext.point('io.ox/settings/security/appPasswords/addDevice/').invoke('render', $el, baton)
    }
  }
)

function refreshList () {
  api.getPasswords().then(
    function (data) {
      if (!_.isArray(data) || !data.length) {
        $('fieldset.appPasswords').hide()
        return
      }
      const collection = new PasswordCollection(data)
      const view = new ListView({
        tagName: 'ul',
        collection,
        ChildView: PasswordView.ListItem
      })
      view.on('remove', function () {
        if (!this.collection.length) $('fieldset.appPasswords').hide()
      })
      $('#passwordList').empty().append(view.render().$el)
      $('fieldset.appPasswords').show()
    },
    function (error) {
      yell('error', gt('There was a problem getting the list of passwords from the server.'))
      console.error(error)
    }
  )
}

export default {
  refresh: refreshList
}
