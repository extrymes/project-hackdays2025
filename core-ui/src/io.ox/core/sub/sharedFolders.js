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
import Backbone from '@/backbone'
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import mini from '@/io.ox/backbone/mini-views'
import http from '@/io.ox/core/http'
import filestorageApi from '@/io.ox/core/api/filestorage'
import '@/io.ox/core/sub/sharedFolders.scss'

import gt from 'gettext'

let options = {}
let properties

function getItemName (descriptor) {
  const folderModel = new api.FolderModel(descriptor)

  const suffix = folderModel.is('drive') && folderModel.is('federated-sharing') && folderModel.getAccountDisplayName()
    ? ' (' + folderModel.getAccountDisplayName() + ')'
    : null
  const title = folderModel.get('display_title') || folderModel.get('title')
  return suffix ? title + suffix : title
}

function open (opt) {
  options = opt
  properties = 'used_for_sync'

  ext.point(options.point).extend({
    id: 'sections',
    index: 200,
    render () {
      const self = this
      const sections = options.sections

      _.each(this.dialogData, function (section, title) {
        self.$body.append(
          $('<div class="item-block">').append(
            $('<h4>').text(sections[title]),
            $('<ol class="list-group">').append(
              returnListItems(section, self, title)
            )
          )
        )
      })
    }
  })

  const dialog = new ModalDialog({
    top: 60,
    width: 600,
    center: false,
    help: options.help,
    async: true,
    point: options.point,
    title: options.title,
    render: false,
    noSync: options.noSync,
    tooltip: options.tooltip
  })

  dialog
    .addCancelButton()
    .addButton({ label: gt('Save'), action: 'subscribe' })
    .build(function () {
      this.$body.addClass('shared-folders')
    })
    .busy(true)
  return getData(dialog, opt).then(data => {
    loadLandingPage(data)
    data.dialog.open()
  })
}

function loadLandingPage (data) {
  data.dialog.dialogData = data.dialogData
  data.dialog.hash = data.hash
  openDialog(data)
}

function openDialog (data) {
  const updateSubscriptions = function (ignoreWarnings) {
    http.pause()

    // split hash, subscribe requests first, unsubscribe requests second
    // this helps with some race conditions in the MW
    const subscribe = {}
    const unsubscribe = {}

    _.each(data.hash, function (obj, id) {
      if (obj.subscribed) {
        subscribe[id] = obj
        return
      }
      unsubscribe[id] = obj
    })

    _.each(subscribe, function (obj, id) {
      api.update(id, obj, { ignoreWarnings })
    })

    _.each(unsubscribe, function (obj, id) {
      api.update(id, obj, { ignoreWarnings })
    })

    http.resume().then(function (responses) {
      // look for error FLD-1038. This means: Last folder of a domain (technically this is actually an account) was removed.
      // we show a confirmation dialog then, as this would result in the removal of the corresponding account as well (no more resubscribing without the original mail)
      const accountsToRemove = _(responses).chain().map(function (response) {
        // error params 1 is the domain name
        // #. text used when no domain name is given (like google.com etc)
        if (response && response.error && response.error.code === 'FLD-1038') return _.isEmpty(response.error.warnings.error_params[1]) ? gt('unknown Domain') : response.error.warnings.error_params[1]
        return false
      }).compact().unique().valueOf()

      if (accountsToRemove.length > 0) {
        openWarningDialog(accountsToRemove)
        return
      }

      if (options.refreshFolders && _(data.hash).size() > 0) api.refresh()
    })
  }
  const openWarningDialog = function (accountNames) {
    const accountNameList = accountNames.join(', ')
    new ModalDialog({
      top: 60,
      width: 600,
      center: false,
      async: false,
      // #. %1$s domain like google.com etc, may also be a list of domains
      title: gt('Shared folders from "%1$s"', accountNameList)
    })
      .addCancelButton()
      .addButton({ label: gt('OK'), action: 'confirm' })
      .build(function () {
        // #. confirmation when the last folder associated with a domain is unsubscribed
        // #. %1$s domain like google.com etc, may also be a list of domains
        this.$body.append(gt('You unsubscribed from all folders on "%1$s". Those folders will be removed from your account.', accountNameList))
      })
      .on('confirm', function () {
        updateSubscriptions(true)
      })
      .open()
  }

  data.dialog.on('subscribe', function () {
    data.dialog.close()
    const accountsToDelete = checkAccounts(data)
    // we will delete some accounts by doing this, offer dialog directly, no need to ask backend first
    if (accountsToDelete.length > 0) {
      openWarningDialog(accountsToDelete)
      return
    }
    updateSubscriptions()
  })

  ext.point(options.point).invoke('render', data.dialog)
  data.dialog.idle()

  // focus first usable checkbox; move to end of call stack for safari
  setTimeout(() => {
    data.dialog.$body.find('input[type="checkbox"]:enabled').first().focus()
  }, 0)
}

const ItemView = Backbone.View.extend({
  tagName: 'li',
  className: 'list-group-item',
  initialize (opt) {
    const self = this
    this.opt = _.extend({}, opt)
    this.model.on('change:subscribed', function (model, val) {
      if (!self.opt.dialog.hash[this.get('id')]) self.opt.dialog.hash[this.get('id')] = {}
      self.opt.dialog.hash[this.get('id')].subscribed = this.get('subscribed')

      if (self.opt.dialog.options.noSync) return

      if (!val) {
        const falseValue = _.copy(self.model.get(properties), true)
        falseValue.value = 'false'
        self.model.set(properties, falseValue)
        self.model.trigger(properties)
      }
    })

    if (opt.dialog.options.noSync) return
    this.model.on('change:' + properties, function () {
      if (!self.opt.dialog.hash[this.get('id')]) self.opt.dialog.hash[this.get('id')] = {}
      self.opt.dialog.hash[this.get('id')][properties] = this.get(properties)
    })
  },

  render () {
    let $checkbox
    const preparedValueTrue = _.copy(this.model.attributes[properties], true) // ?
    preparedValueTrue.value = 'true'

    const preparedValueFalse = _.copy(this.model.attributes[properties], true) // ?
    preparedValueFalse.value = 'false'

    const Switch = mini.SwitchView.extend({
      update () {
        const el = this.$el.closest('.list-group-item')
        const input = el.find(`input[name="${CSS.escape(properties)}"]`)

        el.toggleClass('disabled', !this.model.get('subscribed'))
        this.$input.prop('checked', this.setValue())

        // sync checkbox is protected? We are finished
        if (preparedValueFalse.protected === 'true') return
        input.prop('disabled', !this.model.get('subscribed')).attr('data-state', this.model.get('subscribed') ? '' : 'manual')
      }
    })

    this.$el.append(
      new Switch({
        name: 'subscribed',
        model: this.model,
        label: ''

      }).render().$el.attr('title', this.opt.dialog.options.tooltip || gt('Subscribe')),
      $('<div class="item-name">').append(
        $('<div>').text(getItemName(this.model.attributes))
      ),
      this.opt.dialog.options.noSync
        ? ''
        : $checkbox = new mini.CustomCheckboxView({
          name: properties,
          model: this.model,
          label: gt('Sync via DAV'),
          customValues: {
            true: preparedValueTrue,
            false: preparedValueFalse
          }
        }).render().$el.attr('title', gt('Sync via DAV'))
    )

    if (this.opt.dialog.options.noSync) return this

    if (!this.model.get('subscribed') || preparedValueFalse.protected === 'true') {
      $checkbox
        .addClass('disabled')
        .find(`input[name="${CSS.escape(properties)}"]`).prop('disabled', true).attr('data-state', 'manual')
    }
    return this
  }
})

function returnListItems (section, dialog, sectionTitle) {
  const elements = []
  const ItemModel = Backbone.Model.extend({})

  _.each(section, function (item) {
    if (!item[properties]) return

    const newItem = new ItemView({
      model: new ItemModel(item),
      dialog
    }).render().$el

    if (/^(private|hidden)$/.test(sectionTitle)) {
      newItem.find('[name="subscribed"]').prop('disabled', true).attr('data-state', 'manual')
    }
    elements.push(newItem)
  })

  return elements
}

function getData (dialog) {
  // use custom getData function if desired, can be used by modules that do not have a flat foldertree (infostore etc)
  return $.when(options.getData ? options.getData() : api.flat({ module: options.module, all: true })).then(function (pageData) {
    const dialogData = {}
    const sections = ['private', 'public', 'shared', 'hidden']

    // cleanup
    _.each(sections, function (section) {
      function filter (secOb) { return _.has(secOb, properties) }

      const filteredData = _.filter(pageData[section], filter)
      if (!_.isEmpty(filteredData)) {
        dialogData[section] = filteredData
      }
    })

    return {
      dialog,
      hash: {},
      dialogData
    }
  }, function (data) {
    dialog.$body.append(
      $('<div class="alert alert-warning">').text(data.error_desc)
    )
    dialog.$footer.find('button[data-action="subscribe"]').prop('disabled', true)
  })
}

// checks if accounts of federated shares will be deleted by this action (instead of waiting for MW warning first)
function checkAccounts (data) {
  let federatedFolders = []
  // find federated shared folders
  _(data.dialogData).each(function (folders) {
    federatedFolders = federatedFolders.concat(folders.filter(function (folder) {
      return api.is('federated-sharing', folder)
    }))
  })

  if (federatedFolders.length === 0) return []
  // create situation after updates and grouped by accountId
  federatedFolders = _(_(federatedFolders).map(function (folder) {
    return {
      accountId: folder.account_id,
      subscribed: _.isUndefined(data.hash[folder.id]) ? folder.subscribed : data.hash[folder.id].subscribed
    }
  })).groupBy('accountId')

  // check if accounts still have valid subscribes, return display name if not
  federatedFolders = _(_(_(federatedFolders).map(function (folders, accountId) {
    return _(folders).any(function (folder) { return folder.subscribed }) ? false : filestorageApi.getAccountDisplayName(accountId)
  })).values()).compact()

  return federatedFolders
}

export default {
  open
}
