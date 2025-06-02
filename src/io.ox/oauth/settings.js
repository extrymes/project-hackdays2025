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
import Backbone from '@/backbone'
import _ from '@/underscore'

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import { getAPI } from '@/io.ox/oauth/keychain'
import MiniViews from '@/io.ox/backbone/mini-views/common'
import ListView from '@/io.ox/backbone/mini-views/settings-list-view'
import AccountViews from '@/io.ox/settings/accounts/views'
import ModalDialog from '@/io.ox/backbone/views/modal'

import gt from 'gettext'

const accountTypeAppMapping = {
  mail: gt.pgettext('app', 'Mail'),
  fileStorage: gt.pgettext('app', 'Drive'),
  infostore: gt.pgettext('app', 'Drive'),
  calendar: gt.pgettext('app', 'Calendar'),
  contacts: gt.pgettext('app', 'Address Book')
}

function mapModuleLaunch (m) {
  return m === 'infostore' ? 'files' : m
}

function OAuthAccountDetailExtension (serviceId) {
  this.id = serviceId

  this.draw = function (args) {
    const account = oauthKeychain.accounts.get(args.data.id)
    const collection = new Backbone.Collection([].concat(account.get('associations')).map(function (as) {
      return _.extend({
        serviceId: account.get('serviceId'),
        accountType: as.module
      }, as)
    }))

    // sync data on scope remove
    collection.on('remove', function () {
      account.fetch()
    })

    new ModalDialog({
      focus: 'input',
      async: true,
      title: account.get('displayName'),
      point: 'io.ox/settings/accounts/' + serviceId + '/settings/detail/dialog',
      relatedAccountsCollection: collection,
      account,
      service: oauthKeychain.services.withShortId(serviceId),
      parentAccount: args.data.model
    })
      .extend({
        title () {
          const header = this.$el.find('.modal-header')
          const shortId = this.options.service.id.match(/\.?(\w*)$/)[1] || 'fallback'
          this.$el.addClass('oauth-account')
          if (this.options.account.has('identity')) {
            header.find('.modal-title').append(
              $('<div class="account-identity">').text(this.options.account.get('identity'))
            )
          }
          header.append(
            $('<div class="service-icon">').addClass('logo-' + shortId)
          )
        },
        text () {
          let guid
          const dialog = this
          const relatedAccountsView = new ListView({
            tagName: 'ul',
            ChildView: AccountViews.ListItem.extend({
              events () {
                return _.extend({
                  'click .deeplink': 'openModule'
                }, AccountViews.ListItem.prototype.events)
              },
              getTitle () {
                const customTitle = this.model.get('name') || accountTypeAppMapping[this.model.get('module')]
                // fall back to default implementation if we can not figure out a custom title
                return customTitle || AccountViews.ListItem.prototype.getTitle.apply(this)
              },
              renderTitle (title) {
                return $('<div class="list-item-title">').append(
                  $('<button type="button" class="btn btn-link deeplink">').attr({
                    // #. link title for related accounts into the corresponding folder
                    // #. %1$s - the name of the folder to link into, e.g. "My G-Calendar"
                    // #. %2$s - the translated name of the application the link points to, e.g. "Mail", "Drive"
                    title: gt('Open %1$s in %2$s', title, accountTypeAppMapping[this.model.get('module')])
                  }).append($('<span>').text(title))
                )
              },
              openModule () {
                const model = this.model
                ox.launch(
                  'io.ox/' + mapModuleLaunch(this.model.get('module')) + '/main',
                  { folder: model.get('folder') }
                ).then(function (app) {
                  app.folder.set(model.get('folder'))
                  dialog.close()
                })
              }
            }),
            collection: this.options.relatedAccountsCollection
          })
          this.$body.append(
            $('<div class="form-group">').append(
              $('<label>', { for: guid = _.uniqueId('input') }).text(gt('Account Name')),
              new MiniViews.InputView({ name: 'displayName', model: this.options.account, id: guid }).render().$el
            ),
            $('<div class="form-group">').append(
              relatedAccountsView.render().$el
            )
          )
        }
      })
      .addCancelButton()
      .addButton({
        action: 'save',
        label: gt('Save')
      })
      .on('save', function () {
        const dialog = this
        const account = this.options.account
        const parentAccount = this.options.parentAccount
        account.save().then(function () {
          parentAccount.set(account.attributes)
          dialog.close()
        }, function () {
          dialog.idle()
        })
      })
      .open()
  }

  this.renderSubtitle = function (model) {
    const account = oauthKeychain.accounts.get(model.get('id'))
    const $el = this
    if (!account) return

    $el.append($.txt(account.get('associations').map(function (association) {
      return accountTypeAppMapping[association.module] || account.get('displayName')
    }).join(', ')))
  }
}

let oauthKeychain
getAPI().then(api => {
  oauthKeychain = api
  _(oauthKeychain.serviceIDs).each(function (serviceId) {
    ext.point('io.ox/settings/accounts/' + serviceId + '/settings/detail').extend(new OAuthAccountDetailExtension(serviceId))
  })
})

export default {}
