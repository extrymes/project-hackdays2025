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
import ox from '@/ox'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import _ from '@/underscore'

import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import * as util from '@/io.ox/core/settings/util'
import mini from '@/io.ox/backbone/mini-views'
import miniViews from '@/io.ox/backbone/mini-views/common'
import http from '@/io.ox/core/http'
import DisposableView from '@/io.ox/backbone/views/disposable'
import SettingsListView from '@/io.ox/backbone/mini-views/settings-list-view'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createIcon } from '@/io.ox/core/components'
import yell from '@/io.ox/core/yell'
import { st, isConfigurable } from '@/io.ox/settings/index'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings as multifactorSettings } from '@/io.ox/multifactor/settings'

import gt from 'gettext'

let INDEX = 0
ext.point('io.ox/settings/security/settings/detail').extend(
  {
    index: INDEX += 100,
    id: 'general',
    draw () {
      this.append(
        util.header(
          st.SECURITY,
          'ox.appsuite.user.chap.security.html'
        ),
        new ExtensibleView({ point: 'io.ox/settings/security', model: settings })
          .build(function () {
            this.$el.addClass('settings-body')
            this.listenTo(settings, 'change', () => { settings.saveAndYell() })
            this.listenTo(settings, 'change:autoLogout', () => { ox.autoLogout.restart() })
            this.listenTo(mailSettings, 'change', () => { mailSettings.saveAndYell() })
          })
          .inject({
            getAutoLogoutOptions () {
              const MINUTES = 60000
              return [
                { label: gt('Never'), value: 0 },
                { label: gt('5 minutes'), value: 5 * MINUTES },
                { label: gt('10 minutes'), value: 10 * MINUTES },
                { label: gt('15 minutes'), value: 15 * MINUTES },
                { label: gt('30 minutes'), value: 30 * MINUTES }
              ]
            }
          })
          .render().$el
      )
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/security').extend(
  {
    id: 'sessions',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.SESSIONS, st.SESSIONS_EXPLANATION, 'io.ox/settings/security/sessions', true)
  },
  {
    id: 'multifactor',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.TWO_STEP) return
      return util.renderExpandableSection(st.TWO_STEP, st.TWO_STEP_EXPLANATION, 'io.ox/settings/security/multifactor').call(this, baton)
    }
  },
  {
    id: 'passwords',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.APP_PASSWORDS) return
      return util.renderExpandableSection(st.APP_PASSWORDS, st.APP_PASSWORDS_EXPLANATION, 'io.ox/settings/security/passwords').call(this, baton)
    }
  },
  {
    id: 'images',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.EXTERNAL_IMAGES) return
      return util.renderExpandableSection(st.EXTERNAL_IMAGES, st.EXTERNAL_IMAGES_EXPLANATION, 'io.ox/settings/security/images').call(this, baton)
    }
  },
  {
    id: 'advanced',
    index: 10000,
    render (baton) {
      if (!isConfigurable.SECURITY_ADVANCED) return
      return util.renderExpandableSection(st.SECURITY_ADVANCED, '', 'io.ox/settings/security/advanced').call(this, baton)
    }
  }
)

ext.point('io.ox/settings/security/multifactor').extend(
  {
    id: 'load',
    index: 100,
    render ({ model, view }) {
      this.parent().one('open', () => {
        import('@/io.ox/multifactor/settings/pane.js').then(() => {
          this.addClass('.io-ox-multifactor-settings').append(
            new ExtensibleView({ point: 'io.ox/multifactor/settings/detail/view', model: multifactorSettings })
              .render().$el
          )
        })
      })
    }
  }
)

ext.point('io.ox/settings/security/passwords').extend(
  {
    id: 'load',
    index: 100,
    render (baton) {
      this.parent().one('open', () => {
        import('@/io.ox/settings/security/appPasswords/settings/pane.js').then(() => {
          ext.point('io.ox/settings/security/appPasswords/settings/detail').invoke('draw', this, baton)
        })
      })
    }
  }
)

ext.point('io.ox/settings/security/images').extend(
  {
    id: 'mail',
    index: 100,
    render () {
      const TrueFalseRadioView = mini.CustomRadioView.extend({
        onChange () {
          this.model.set(this.name, this.$(`[name="${CSS.escape(this.name)}"]:checked`).val() === 'true')
        },
        update () {
          const name = this.model.get(this.name)
          this.$(`[name="${CSS.escape(this.name)}"]`).each(function () {
            if (String(this.value) === String(name)) $(this).prop('checked', true)
          })
        }
      })
      const list = [
        // #. Option for mail settings. Show external images in emails
        { label: gt('Always show external images (excluding spam and untrustworthy senders)'), value: 'true' },
        // #. Option for mail settings. Ask before showing external images in emails
        { label: gt('Ask before showing external images'), value: 'false' }
      ]
      this.append(
        new TrueFalseRadioView({ list, name: 'allowHtmlImages', model: mailSettings }).render().$el
      )
    }
  },
  {
    id: 'trusted',
    index: 300,
    render ({ view }) {
      if (!isConfigurable.EXTERNAL_IMAGES_ALLOW_LIST) return

      const id = 'features/trusted/user'
      const description = gt('Addresses can be separated by space, comma, or line breaks, e.g. "example.org, alice@example.com"')
      const guid = _.uniqueId('form-control-label-')
      const allowHtmlImages = mailSettings.get('allowHtmlImages')
      const attributes = { 'aria-describedby': _.uniqueId('form-control-description_'), disabled: allowHtmlImages }

      const $textarea = new miniViews.TextView({ name: id, model: mailSettings, id: guid, rows: 6, attributes }).render().$el
      view.listenTo(mailSettings, 'change:allowHtmlImages', allowHtmlImages => {
        $textarea.prop('disabled', allowHtmlImages)
      })

      this.append(
        $('<div class="mt-24">').append(
          $(`<label for="${guid}">`).text(st.EXTERNAL_IMAGES_ALLOW_LIST),
          $textarea.addClass('form-control resize-y'),
          $(`<div class="help-block" id="${attributes['aria-describedby']}">`).text(description)
        )
      )
    }
  }
)

ext.point('io.ox/settings/security/advanced').extend(
  {
    id: 'autoLogout',
    index: 100,
    render ({ model, view }) {
      this.append(
        util.compactSelect('autoLogout', st.AUTO_LOGOUT, model, view.getAutoLogoutOptions())
      )
    }
  }
)

//
// Sessions / Active clients
//

const SessionModel = Backbone.Model.extend({
  idAttribute: 'sessionId',
  getDeviceInfo (name) {
    const device = this.get('device') || {}
    return device[name] || {}
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
    return http.GET({
      url: ox.apiRoot + '/sessionmanagement',
      params: { action: 'all' }
    })
      .then(data => this.set(data))
  }
})

const SessionItemView = DisposableView.extend({
  tagName: 'li',
  className: 'settings-list-item items-center',
  events: {
    'click [data-action="delete"]': 'onDelete'
  },
  render () {
    const isCurrent = this.model.get('sessionId') === ox.session
    const lastActive = this.model.has('lastActive') ? moment(this.model.get('lastActive')).fromNow() : ''
    this.$el.empty().append(
      createIcon(this.model.get('deviceType') === 'desktop' ? 'bi/laptop.svg' : 'bi/phone.svg').addClass('bi-28 me-16 text-gray'),
      $('<div class="list-item-title text-normal flex-col flex-grow">').append(
        $('<div class="primary">').append(
          $('<span class="text-medium">').text(this.model.get('device').displayName || gt('Unknown application'))
        ),
        $('<div class="secondary">').append(
          $('<span>').text(this.model.get('location')),
          // #. text in the settings pane to indicate session that is currently active
          isCurrent ? $('<span class="label label-subtle subtle-green text-sm">').text(gt('Now active')) : $('<span class="text-gray">').text(lastActive)
        )
      ),
      $('<div class="list-item-controls">').append(
        !isCurrent ? $('<button role="button" class="btn btn-toolbar action" data-action="delete">').text(gt('Sign out')) : ''
      )
    )
    return this
  },
  onDelete (e) {
    e.preventDefault()
    const baton = ext.Baton({
      data: { sessionId: this.model.get('sessionId') },
      model: this.model,
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

const SessionView = DisposableView.extend({
  className: 'session-list-container',
  initialize () {
    this.listenTo(this.collection, 'update', this.render)
    this.listenTo(ox, 'refresh^', () => {
      this.collection.fetch()
    })
  },
  render () {
    this.listView = new SettingsListView({
      collection: this.collection,
      ChildView: SessionItemView,
      childOptions: { collection: this.collection }
    })
    this.$el.empty().append(this.listView.render().$el)
    return this
  }
})

INDEX = 0
ext.point('io.ox/settings/security/sessions').extend(
  {
    id: 'explanation',
    index: INDEX += 100,
    render () {
      this.addClass('io-ox-session-settings').append(
        util.explanation(
          gt('The list below shows all devices you\'re currently signed in to. There might be multiple sessions from the same device.') + ' ' +
          gt('If a device is unfamiliar to you or you cannot explain where a session comes from, it is recommended to stop that session by clicking on "Sign out" in the corresponding row.'),
          'ox.appsuite.user.sect.security.sessions.html'
        ).addClass('mb-24')
      )
    }
  },
  {
    id: 'view',
    index: INDEX += 100,
    render ({ view }) {
      const collection = view.collection = new SessionCollection()
      this.append(
        new SessionView({ collection }).render().$el
      )
    }
  },
  {
    id: 'remove-all',
    index: INDEX += 100,
    render (baton) {
      const $button = $('<button type="button" class="btn btn-default hidden" data-action="remove-all">')
        .text(gt('Sign out from all devices'))
        .on('click', function (e) {
          ext.point('io.ox/settings/sessions/signout').invoke('render', this, baton, {
            text: gt('Do you really want to sign out from all devices except the current one?'),
            confirmText: gt('Sign out'),
            action: 'clear'
          })
        })
      this.append(
        $('<div class="form-grouo mt-24">').append($button)
      )
      baton.view.collection.initial.done(() => {
        $button.toggleClass('hidden', !baton.view.collection.length)
      })
    }
  }
)

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
