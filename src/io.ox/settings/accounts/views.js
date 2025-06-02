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

import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import * as settingsUtil from '@/io.ox/settings/util'
import listUtils from '@/io.ox/backbone/mini-views/listutils'
import ModalDialog from '@/io.ox/backbone/views/modal'
import DisposableView from '@/io.ox/backbone/views/disposable'
import yell from '@/io.ox/core/yell'
import { getAPI } from '@/io.ox/oauth/keychain'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

function createExtpointForSelectedAccount (args) {
  if (args.data.id !== undefined && args.data.accountType !== undefined) {
    ext.point('io.ox/settings/accounts/' + args.data.accountType + '/settings/detail').invoke('draw', args.data.node, args)
  }
}

/**
 * getAccountState
 * Used to display a possible error message.
 * Returns a jQuery node containing the error.
 */
function drawAccountState (model) {
  if ((typeof model.get('status') === 'undefined') || model.get('status') === 'ok') return

  // ignore secondary account errors when deactivated (props 'deactivated' and 'status' does not change at the same time)
  if (model.get('deactivated') || (model.get('status') || {}).status === 'deactivated') return

  return $('<div class="error-wrapper mt-16 pt-16">').append(
    createIcon('bi/exclamation-triangle.svg').addClass('error-icon shrink-0 text-xl'),
    $('<div class="error-message">').text(model.get('status').message)
  )
}
const SettingsAccountListItemView = DisposableView.extend({

  tagName: 'li',

  className: 'settings-list-item',

  events: {
    'click [data-action="edit"]': 'onEdit',
    'click [data-action="delete"]': 'onDelete',
    'click [data-action="enable"]': 'onEnable'
  },

  initialize () {
    this.listenTo(this.model, 'change', this.render)
  },

  getTitle () {
    // mail accounts are special, displayName might be different from account name, want account name, here
    const titleAttribute = this.model.get('accountType') === 'mail' ? 'name' : 'displayName'
    // no translation needed, this is only a dev feature, for convenience. Those accounts are only displayed when ox.debug is set to true
    if (/xox\d+|xctx\d+/.test(this.model.get('filestorageService'))) return 'Shared folders from ' + this.model.get(titleAttribute)
    return this.model.get(titleAttribute)
  },

  renderSubtitle () {
    const el = $('<div class="list-item-subtitle">')
    ext.point(`io.ox/settings/accounts/${this.model.get('accountType')}/settings/detail`).invoke('renderSubtitle', el, this.model)
    return el
  },

  renderTitle (title) {
    return listUtils.makeTitle(title)
  },

  renderAction (action) {
    const POINT = 'io.ox/settings/accounts/' + this.model.get('accountType') + '/settings/detail'
    const isPrimaryOrSecondary = this.model.get('id') === 0 || this.model.get('secondary')
    switch (action) {
      case 'edit':
        if (this.model.get('deactivated') && !_.device('smartphone')) return $()
        if (this.model.get('accountType') !== 'fileAccount' && ext.point(POINT).pluck('draw').length <= 0) return
        return listUtils.controlsEdit({ ariaLabel: gt('Edit %1$s', this.getTitle()) })
      case 'delete':
        return listUtils.controlsDelete({ ariaLabel: gt('Delete %1$s', this.getTitle()) }).prop('disabled', isPrimaryOrSecondary)
      case 'enable':
        if (!this.model.get('secondary')) return $()
        if (!this.model.get('deactivated')) return $()
        this.$el.addClass('disabled')
        if (_.device('smartphone')) return $()
        return $('<a href="#" class="action" role="button" class="toggle" data-action="enable">').attr('aria-label', gt('Enable %1$s', this.getTitle())).text(gt('Enable'))
      default:
        return $()
    }
  },

  render () {
    const model = this.model
    const type = model.get('accountType') || model.get('module')
    const shortId = String(model.get('serviceId') || model.id).match(/\.?([a-zA-Z]*)(\d*)$/)[1] || 'fallback'

    function drawIcon () {
      return $('<i class="account-icon" aria-hidden="true">')
        .addClass(type.toLowerCase())
        .addClass('logo-' + shortId)
    }

    this.$el.attr({
      'data-id': model.get('id'),
      'data-accounttype': model.get('accountType')
    })

    this.$el.empty().append(
      drawIcon(model),
      this.renderTitle(this.getTitle()).addClass('flex-col justify-center px-16').append(
        this.renderSubtitle()
      ),
      listUtils.makeControls().append(
        this.renderAction('edit'),
        this.renderAction('enable'),
        this.renderAction('delete')
      ),
      // show a possible account error
      drawAccountState(this.model)
    )

    return this
  },

  onDelete (event) {
    event.preventDefault()
    const account = this.model.pick('id', 'accountType', 'folder', 'rootFolder', 'filestorageService')
    const self = this
    const { serviceId } = this.model.attributes
    let parentAccountRemoved
    if (account.accountType === 'fileAccount') {
      account.folder = account.rootFolder
    }
    new ModalDialog({
      async: true,
      title: gt('Delete account')
    })
      .build(function () {
        this.$body.append(gt('Do you really want to delete this account?'))
      })
      .addCancelButton()
      .addButton({ action: 'delete', label: gt('Delete account') })
      .on('delete', async function () {
        const popup = this
        const api = await getAPI()
        const parentModel = api.accounts.findWhere({ serviceId })
        let moduleLoader
        let opt

        function simplifyId (id) {
          return id.substring(id.lastIndexOf('.') + 1)
        }

        if (account.accountType === 'fileAccount') {
          moduleLoader = import('@/io.ox/core/api/filestorage')
          opt = { id: account.id, filestorageService: account.filestorageService }
        } else if (parentModel && parentModel.get('associations').length === 1) {
          opt = { id: parentModel.get('id'), accountType: simplifyId(parentModel.get('serviceId')) }
          moduleLoader = import('@/io.ox/keychain/api')
          parentAccountRemoved = true
        } else {
          // use correct api, folder API if there's a folder and account is not a mail account,
          // keychain API otherwise
          const useFolderAPI = typeof account.folder !== 'undefined' && account.accountType !== 'mail'
          moduleLoader = useFolderAPI ? import('@/io.ox/core/folder/api') : import('@/io.ox/keychain/api')
          opt = useFolderAPI ? account.folder : account
        }
        settingsUtil.yellOnReject(
          moduleLoader
            .then(({ default: api }) => api.remove(opt))
            .then(
              function success () {
                if (self.disposed) {
                  popup.close()
                  return
                }

                if (parentAccountRemoved) {
                  popup.close('', { resetDialogQueue: true })
                } else {
                  self.model.collection.remove(self.model)
                  popup.close()
                }
              },
              function fail (error) {
                yell(error)
                console.error(error)
                popup.close()
              }
            )
            .finally(() => {
              // update folder tree
              Promise.all([
                import('@/io.ox/core/api/account'),
                import('@/io.ox/core/folder/api')
              ]).then(([{ default: accountAPI }, { default: folderAPI }]) => {
                accountAPI.getUnifiedInbox().done(unifiedInbox => {
                  accountAPI.trigger('refresh.list')
                  if (!unifiedInbox) return folderAPI.refresh()
                  const prefix = unifiedInbox.split('/')[0]
                  folderAPI.pool.unfetch(prefix)
                  folderAPI.refresh()
                })
              })
            })
        )
      })
      .open()
  },

  onEdit (event) {
    event.preventDefault()
    event.data = {
      id: this.model.get('id'),
      accountType: this.model.get('accountType'),
      model: this.model,
      node: this.el
    }
    if (this.model.get('accountType') === 'fileAccount') {
      ox.load(() => import('@/io.ox/files/actions/basic-authentication-account'))
        .then(({ default: update }) => update('update', event.data.model))
    } else createExtpointForSelectedAccount(event)
  },

  onEnable () {
    const self = this
    Promise.all([
      import('@/io.ox/core/api/account'),
      import('@/io.ox/mail/accounts/model')
    ]).then(([{ default: accountAPI }, { default: AccountModel }]) => {
      accountAPI.get(self.model.get('id'))
        .done(data => {
          const aModel = new AccountModel(data)
          aModel.set('deactivated', false).save()
          self.listenTo(aModel, 'sync', model => self.model.set(model.attributes))
        })
    })
  }
})

export default {
  ListItem: SettingsAccountListItemView
}
