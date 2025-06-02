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
import ox from '@/ox'

import capabilities from '@/io.ox/core/capabilities'
import ext from '@/io.ox/core/extensions'
import ExtensibleView from '@/io.ox/backbone/views/extensible'
import accountAPI from '@/io.ox/core/api/account'
import api from '@/io.ox/keychain/api'
import keychainModel from '@/io.ox/keychain/model'
import * as util from '@/io.ox/core/settings/util'
import yell from '@/io.ox/core/yell'
import AccountViews from '@/io.ox/settings/accounts/views'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'
import { st, isConfigurable } from '@/io.ox/settings/index'
import Backbone from '@/backbone'
import DisposableView from '@/io.ox/backbone/views/disposable'
import http from '@/io.ox/core/http'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { icon, buttonWithIcon, externalLink } from '@/io.ox/core/components'

ext.point('io.ox/settings/accounts/settings/detail').extend({
  index: 100,
  id: 'view',
  draw () {
    this.append(
      util.header(
        st.ACCOUNTS,
        'ox.appsuite.user.sect.dataorganisation.accounts.html'
      ),
      new ExtensibleView({ point: 'io.ox/settings/accounts', model: settings })
        .inject({
          hasNoOAuthCredentials (account) {
            return !(account.has('mail_oauth') && account.get('mail_oauth') >= 0)
          },
          updateListAndStatus () {
            const collection = this.collection

            return $.when(api.getAll(), accountAPI.getStatus()).done((accounts, status) => {
              collection.reset(keychainModel.wrap(accounts).models)
              status = status[0]
              for (const id in status) {
                // to avoid double ids the collection has the account type as prefix see Bug 50219
                const model = collection.get('mail' + id)
                const statusValue = status[id]
                if (!model) return
                model.set('status', statusValue.status !== 'ok' ? statusValue : statusValue.status)
              }
              collection
                .filter(model => !model.has('status') && model.has('associations'))
                .forEach(function setStatus (model) {
                  const relatedStatus = model.get('associations').reduce((acc, related) => {
                    related = collection.get((related.module || '') + related.id)
                    if (related && related.has('status')) return related.get('status')
                    return acc
                  }, 'ok')
                  if (relatedStatus) model.set('status', relatedStatus)
                })
            })
          },
          showNoticeFields: ['security/acceptUntrustedCertificates'],

          showNotice (attr) {
            return this.showNoticeFields.some(id => id === attr)
          }
        })
        .build(function () {
          this.$el.addClass('settings-body io-ox-accounts-settings')
          // make sure changes get saved
          this.listenTo(settings, 'change:security/acceptUntrustedCertificates', () => settings.save())
        })
        .render().$el
    )
  }
})

let INDEX = 0
ext.point('io.ox/settings/accounts').extend(
  {
    id: 'accounts',
    index: INDEX += 100,
    render: util.renderExpandableSection(st.YOUR_ACCOUNTS, st.YOUR_ACCOUNTS_EXPLANATION, 'io.ox/settings/accounts/list', true)
  },
  {
    id: 'subscriptions',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.SUBSCRIPTIONS) return
      return util.renderExpandableSection(st.SUBSCRIPTIONS, st.SUBSCRIPTIONS_EXPLANATION, 'io.ox/settings/accounts/subscriptions').call(this, baton)
    }
  },
  {
    id: 'apps',
    index: INDEX += 100,
    render (baton) {
      if (!isConfigurable.EXTERNAL_APPS) return
      return util.renderExpandableSection(st.EXTERNAL_APPS, st.EXTERNAL_APPS_EXPLANATION, 'io.ox/settings/accounts/external').call(this, baton)
    }
  }
)

INDEX = 0
ext.point('io.ox/settings/accounts/list').extend(
  //
  // Add account
  //
  {
    id: 'add-account',
    index: INDEX += 100,
    render () {
      if (!capabilities.has('multiple_mail_accounts')) return
      this.append(
        $('<div class="form-group mb-16">').append(
          $('<button type="button" class="btn btn-primary" data-name="io.ox/mail/actions/add-mail-account">')
            .text(gt('Add mail account'))
            .on('click', event => {
              import('@/io.ox/mail/accounts/settings')
                .then(({ default: settings }) => settings.mailAutoconfigDialog(event))
            })
        )
      )
    }
  },
  //
  // List view
  //
  {
    id: 'list',
    index: INDEX += 100,
    render ({ view }) {
      addReadyListener('accounts', () => {
        const collection = view.collection = keychainModel.wrap(api.getAll())

        const listView = new ListView({
          tagName: 'ul',
          ChildView: AccountViews.ListItem,
          collection: view.collection,
          filter: view.hasNoOAuthCredentials
        })

        import('@/io.ox/oauth/keychain').then(({ getAPI }) => getAPI()).then((keychain) => {
          listView.listenTo(keychain.accounts, 'add remove change', function () {
            collection.reset(keychainModel.wrap(api.getAll()).models)
          })
        })

        this.append(listView.render().$el)

        view.listenTo(api, 'refresh.all refresh.list', view.updateListAndStatus)
        view.listenTo(accountAPI, 'account:recovered', view.updateListAndStatus.bind(view))
      })
    }
  },
  {
    id: 'onchange',
    index: INDEX += 100,
    render ({ view }) {
      view.listenTo(settings, 'change', function (attr) {
        const showNotice = view.showNotice(attr)
        settings.saveAndYell(undefined, { force: !!showNotice }).then(
          function success () {
            if (!showNotice) return
            yell('success', gt('The setting requires a reload or logging in again to take effect.'))
          }
        )
      })
    }
  },
  //
  // Untrusted Certificates
  //
  {
    id: 'untrusted-certificates',
    index: INDEX += 100,
    render () {
      if (!settings.isConfigurable('security/acceptUntrustedCertificates')) return

      this.$el.append(
        $('<div class="form-group">').append(
          util.checkbox('security/acceptUntrustedCertificates', gt('Allow connections with untrusted certificates'), settings)
        )
      )
    }
  }
)

//
// Subscriptions
//

ext.point('io.ox/settings/accounts/subscriptions').extend(
  {
    id: 'load',
    index: INDEX += 100,
    render (baton) {
      this.parent().one('open', async () => {
        import('@/io.ox/core/sub/settings/pane.js').then(() => {
          ext.point('io.ox/core/sub/settings/detail').invoke('draw', this, baton)
        })
      })
    }
  }
)

//
// External Apps
//

const OAuthModel = Backbone.Model.extend({
  initialize (opt) {
    this.id = opt.client.id
  }
})

const OAuthCollection = Backbone.Collection.extend({
  model: OAuthModel,
  load () {
    return http.GET({ module: 'oauth/grants', params: { action: 'all' } }).then(list => {
      if (!list.length && ox.debug) {
        list = [{
          client: { id: 1, name: 'An external sample app (debug only)', website: 'https://example.org', description: 'Lorem ipsum dolor sit ...' },
          scopes: ['Bake cake'],
          date: 1674946800000
        }]
      }
      this.reset(list)
    })
  }
})

const collection = new OAuthCollection()

ext.point('io.ox/settings/accounts/external').extend(
  {
    id: 'load',
    index: INDEX += 100,
    render () {
      const $el = $('<div>')
      this.append($el).parent().one('open', async () => {
        collection.load().then(() => {
          if (!collection.length) {
            $el.text(gt('There are no external applications/services which can access your account.'))
          } else {
            $el.append(
              $('<p>').text(gt('The following external applications/services can access your data:')),
              new OAuthView({ collection }).render().$el
            )
          }
        })
      })
    }
  }
)

const OAuthView = DisposableView.extend({
  tagName: 'ul',
  className: 'list-unstyled settings-list-view',
  events: {
    'click [data-action="delete"]': 'onRemove'
  },
  initialize () {
    this.listenTo(this.collection, 'reset remove', this.render)
  },
  onRemove (e) {
    const id = $(e.currentTarget).closest('li').attr('data-id')
    // #. 'Revoke access' as header of a modal dialog to confirm to revoke access of an application.
    new ModalDialog({ title: gt('Revoke access'), description: gt('Do you want to revoke the access of this application?') })
      .addCancelButton()
      .addButton({ label: gt('Revoke'), action: 'ok' })
      .on('ok', function () {
        collection.remove(id)
        return http.GET({
          module: 'oauth/grants',
          params: { action: 'revoke', client: id }
        }).fail(yell)
      })
      .open()
  },
  renderItem (model) {
    const client = model.get('client')
    return $('<li class="settings-list-item flex-row items-start">').attr('data-id', client.id).append(
      $('<div class="list-item-title flex-col flex-grow">').append(
        $('<div class="text-bold">').text(client.name),
        $('<div>').append(
          externalLink({ href: client.website })
        ),
        $('<div class="text-gray mb-16">').text(client.description),
        $('<div class="mb-16">').text(
          // #. %1$s contains a space-separated list of permissions
          gt('Permissions: %1$s', _(model.get('scopes')).values().join(' '))
        ),
        // #. %1$s contains a formatted data
        $('<div class="text-gray text-sm">').text(gt('Approved: %1$s', moment(model.get('date')).format('l')))
      ),
      $('<div class="list-item-controls">').append(
        buttonWithIcon({ className: 'btn btn-toolbar', icon: icon('bi/x-lg.svg'), tooltip: gt('Revoke access') })
          .attr('data-action', 'delete')
      )
    )
  },
  render () {
    this.$el.empty().append(
      this.collection.map(this.renderItem)
    )
    return this
  }
})
