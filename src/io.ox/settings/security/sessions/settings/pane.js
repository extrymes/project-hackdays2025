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
import moment from '@open-xchange/moment'

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import yell from '@/io.ox/core/yell'

import http from '@/io.ox/core/http'
import SettingsListView from '@/io.ox/backbone/mini-views/settings-list-view'
import DisposableView from '@/io.ox/backbone/views/disposable'

import '@/io.ox/settings/security/sessions/settings/style.scss'

import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

const SessionModel = Backbone.Model.extend({

  idAttribute: 'sessionId',

  getDeviceInfo (name) {
    const device = this.get('device') || {}
    return device[name] || {}
  }

})

ext.point('io.ox/settings/sessions/deviceType').extend({
  id: 'desktop-mobile',
  index: 100,
  customize () {
    const os = this.getDeviceInfo('os').name || ''
    if (os === 'ios' || os === 'android') this.set('deviceType', 'phone')
    else this.set('deviceType', 'desktop')
  }
})

const SessionCollection = Backbone.Collection.extend({

  model: SessionModel,

  comparator (model) {
    // sort ascending
    // current session should always be topmost
    if (model.get('sessionId') === ox.session) return -Number.MAX_VALUE
    // sessions without lastActive timestamp should be last
    return model.has('lastActive') ? -model.get('lastActive') : Number.MAX_VALUE
  },

  initialize () {
    this.initial = this.fetch()
  },

  fetch () {
    const self = this
    return http.GET({
      url: ox.apiRoot + '/sessionmanagement',
      params: { action: 'all' }
    }).then(function success (data) {
      self.set(data)
    })
  }
})

const SessionItemView = DisposableView.extend({

  tagName: 'li',

  className: 'settings-list-item',

  events: {
    'click a[data-action="delete"]': 'onDelete'
  },

  render () {
    const isCurrent = this.model.get('sessionId') === ox.session
    const lastActive = this.model.has('lastActive') ? moment(this.model.get('lastActive')).fromNow() : ''
    this.$el.empty().append(
      createIcon(this.model.get('deviceType') === 'desktop' ? 'bi/laptop.svg' : 'bi/phone.svg').addClass('client-icon'),
      $('<div class="list-item-title flex-col flex-grow">').append(
        $('<div class="primary">').append(
          $('<span>').text(this.model.get('device').displayName || gt('Unknown application'))
        ),
        $('<div class="secondary">').append(
          $('<span>').text(this.model.get('location')),
          // #. text in the settings pane to indicate session that is currently active
          isCurrent ? $('<span class="label label-success">').text(gt('Now active')) : $('<span>').text(lastActive)
        )
      ),
      $('<div class="list-item-controls">').append(
        !isCurrent ? $('<a href="#" class="action" data-action="delete">').text(gt('Sign out')) : ''
      )
    )
    return this
  },
  onDelete (e) {
    const self = this
    e.preventDefault()

    const baton = ext.Baton({
      data: { sessionId: self.model.get('sessionId') },
      model: self.model,
      // assign collection here since the view might be removed later
      collection: this.collection
    })

    ext.point('io.ox/settings/sessions/signout').invoke('render', this, baton, {
      text: gt('Do you really want to sign out from that device?'),
      confirmText: gt('Sign out'),
      action: 'delete'
    })
  }

})

const SessionView = Backbone.View.extend({

  className: 'session-list-container',

  initialize () {
    this.$el.data('view', this)
    this.collection.on('update', _.bind(this.render, this))
  },

  render () {
    const self = this
    this.$el.empty().append(
      self.listView = new SettingsListView({
        collection: self.collection,
        ChildView: SessionItemView,
        childOptions: { collection: self.collection }
      }).render().$el
    )

    return this
  }

})

ext.point('io.ox/settings/security/sessions/settings/detail').extend({
  id: 'view',
  index: 100,
  draw () {
    const collection = new SessionCollection()
    this.append(
      new ExtensibleView({
        point: 'io.ox/settings/sessions/settings/detail/view',
        collection
      })
        .render().$el
    )

    ox.on('refresh^', function () {
      collection.fetch()
    })
  }
})

ext.point('io.ox/settings/sessions/settings/detail/view').extend({
  id: 'title',
  index: 100,
  render () {
    this.$el
      .addClass('io-ox-session-settings')
      .append(
        $('<h1>').text(gt('You are currently signed in with the following devices'))
      )
  }
})

ext.point('io.ox/settings/sessions/settings/detail/view').extend({
  id: 'spinner',
  index: 200,
  render (baton) {
    let spinner
    this.$el.append(spinner = $('<div>').busy())
    baton.view.collection.initial.always(function () {
      spinner.remove()
    })
  }
})

ext.point('io.ox/settings/sessions/settings/detail/view').extend({
  id: 'list',
  index: 300,
  render (baton) {
    this.$el.append(
      new SessionView({
        collection: baton.view.collection
      }).render().$el
    )
  }
})

ext.point('io.ox/settings/sessions/settings/detail/view').extend({
  id: 'remove-all',
  index: 1000,
  render (baton) {
    let link
    this.$el.append(
      link = $('<button data-action="remove-all" class="btn btn-default hidden">').text(gt('Sign out from all devices'))
        .on('click', function (e) {
          e.preventDefault()
          ext.point('io.ox/settings/sessions/signout').invoke('render', this, baton, {
            text: gt('Do you really want to sign out from all clients except the current one?'),
            confirmText: gt('Sign out'),
            action: 'clear'
          })
        })
    )
    baton.view.collection.initial.done(function () {
      if (baton.view.collection.length === 0) return
      link.removeClass('hidden')
    })
  }
})

ext.point('io.ox/settings/sessions/signout').extend({
  id: 'default',
  index: 100,
  render (baton, options) {
    // #. 'Sign out from device' as header of a modal dialog to sign out of a session.
    new ModalDialog({
      title: gt('Sign out from device'),
      description: options.text,
      async: true,
      point: 'io.ox/settings/sessions/signout/dialog'
    })
      .addCancelButton()
      .addButton({ label: options.confirmText, action: 'ok' })
      .on('ok', function () {
        ext.point('io.ox/settings/sessions/signout/dialog/' + options.action).invoke('action', this, baton)
      })
      .open()
  }
})

ext.point('io.ox/settings/sessions/signout/dialog/clear').extend({
  id: 'default',
  index: 100,
  action (baton) {
    const dialog = this
    this.busy()
    http.GET({
      url: ox.apiRoot + '/sessionmanagement',
      params: { action: 'clear' }
    }).fail(function (error) {
      yell(error)
    }).always(function () {
      baton.view.collection.fetch().always(dialog.close)
    })
  }
})

ext.point('io.ox/settings/sessions/signout/dialog/delete').extend({
  id: 'default',
  index: 100,
  action (baton) {
    const dialog = this
    http.PUT({
      url: ox.apiRoot + '/sessionmanagement',
      params: { action: 'delete' },
      data: [baton.data.sessionId]
    }).fail(function (error) {
      yell(error)
      baton.collection.fetch()
    }).always(function () {
      dialog.close()
    })

    // trigger destroy will remove the model from all collections
    // do not use destroy(), because that will use the backbone sync mechanism
    baton.model.trigger('destroy', baton.model)
  }
})

export default {
  Model: SessionModel,
  Collection: SessionCollection,
  View: SessionView
}
