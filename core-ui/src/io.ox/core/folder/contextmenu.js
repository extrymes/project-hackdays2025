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
import actions from '@/io.ox/core/folder/actions/common'
import api from '@/io.ox/core/folder/api'
import account from '@/io.ox/core/api/account'
import capabilities from '@/io.ox/core/capabilities'
import filestorage from '@/io.ox/core/api/filestorage'
import contextUtils from '@/io.ox/backbone/mini-views/contextmenu-utils'
import * as folderUtil from '@/io.ox/core/folder/util'
import properties from '@/io.ox/core/folder/actions/properties'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'
import { settings } from '@/io.ox/mail/settings'
import { settings as fileSettings } from '@/io.ox/files/settings'

const extensions = {

  //
  // Mark all mails as read
  //
  markFolderSeen (baton) {
    if (baton.module !== 'mail') return

    contextUtils.addLink(this, {
      action: 'markfolderread',
      data: { folder: baton.data.id, app: baton.app },
      enabled: api.can('write', baton.data),
      handler: actions.markFolderSeen,
      text: gt('Mark all messages as read')
    })
  },

  //
  // Move all messages to a target folder ...
  //
  moveAllMessages (baton) {
    if (baton.module !== 'mail') return

    contextUtils.addLink(this, {
      action: 'move-all-messages',
      data: { id: baton.data.id },
      enabled: api.can('delete', baton.data),
      handler: actions.moveAll.bind(actions, baton.data.id),
      text: gt('Move all messages')
    })
  },

  //
  // Clean up / Expunge
  //
  expunge (baton) {
    if (baton.module !== 'mail') return

    contextUtils.addLink(this, {
      action: 'expunge',
      data: { folder: baton.data.id },
      enabled: api.can('delete', baton.data),
      handler: actions.expunge.bind(actions, baton.data.id),
      text: gt('Clean up')
    })
  },

  //
  // Archive messages
  //
  archive: (function () {
    function handler (e) {
      ox.load(() => import('@/io.ox/core/folder/actions/archive')).then(function ({ default: archive }) {
        archive(e.data.id)
      })
    }

    return function (baton) {
      if (baton.module !== 'mail') return
      if (!capabilities.has('archive_emails')) return

      // is in a subfolder of archive?
      const id = baton.data.id
      if (account.is('archive', id)) return

      contextUtils.addLink(this, {
        action: 'archive',
        data: { id },
        enabled: api.can('delete', baton.data),
        handler,
        text: gt('Archive old messages')
      })
    }
  }()),

  //
  // Empty folder
  //
  empty (baton) {
    const isTrash = api.is('trash', baton.data)

    // no items in folder?
    if (!baton.data.total) {
      // folders in trash folder or files in folder collection?
      if (isTrash && !baton.data.subscr_subflds && !baton.app.listView.collection.length) return
      // common folder
      if (!isTrash) return
    }

    // #. empty is a verb in this case. Used when the contents of a folder should be deleted
    let label = gt('Empty folder')
    if ((baton.module !== 'mail' && baton.module !== 'infostore') || (baton.module === 'infostore' && !isTrash)) return

    if (isTrash) label = gt('Empty trash')
    else if (baton.module === 'mail') label = gt('Delete all messages')

    contextUtils.addLink(this, {
      action: 'clearfolder',
      data: { id: baton.data.id },
      enabled: api.can('delete', baton.data),
      handler: actions.clearFolder.bind(actions, baton.data.id),
      text: label
    })
  },

  //
  // Add folder
  //
  add (baton) {
    // only mail and infostore show hierarchies
    if (/^(contacts|calendar|tasks)$/.test(baton.module)) return

    // special case: default0 with altnamespace
    const canCreate = baton.data.id === 'default0' && api.altnamespace()
    if (!canCreate && !api.can('create:folder', baton.data)) return

    // not within trash
    if (api.is('trash', baton.data)) return

    if (this.link) {
      this.link('add-subfolder', gt('Add new folder'), handler)
    } else {
      contextUtils.addLink(this, {
        action: 'add-subfolder',
        data: { app: baton.app, folder: baton.data.id, module: baton.module },
        enabled: true,
        handler,
        text: gt('Add new folder')
      })
    }

    function handler () {
      ox.load(() => import('@/io.ox/core/folder/actions/add')).then(function ({ default: add }) {
        add(baton.data.id, { module: baton.module })
      })
    }
  },

  //
  // Rename folder
  //
  rename: (function () {
    function handler (e) {
      ox.load(() => import('@/io.ox/core/folder/actions/rename')).then(function ({ default: rename }) {
        rename(e.data.id)
      })
    }

    return function (baton) {
      const folderId = baton.data.id || baton.app.folder.get()
      const model = api.pool.getModel(folderId)

      if (!api.can('rename', baton.data)) return
      if (api.is('trash', model.toJSON())) return

      contextUtils.addLink(this, {
        action: 'rename',
        data: { id: baton.data.id },
        enabled: true,
        handler,
        text: gt('Rename')
      })
    }
  }()),

  //
  // Edit default alarms
  //
  alarms: (function () {
    function handler (e) {
      ox.load(() => import('@/io.ox/calendar/actions/change-folder-alarms')).then(function ({ default: alarms }) {
        alarms(e.data)
      })
    }

    return function (baton) {
      // return if provider is chronos (no per calendar support because they share one calendar account), use settings instead
      // must support alarms
      if (!api.supports('alarms', baton.data) || baton.data['com.openexchange.calendar.provider'] === 'chronos') return

      contextUtils.addLink(this, {
        action: 'alarms',
        data: baton.data,
        enabled: true,
        handler,
        text: gt('Change reminders')
      })
    }
  }()),

  //
  // Remove folder
  //
  removeFolder: (function () {
    function handler (e) {
      ox.load(() => import('@/io.ox/core/folder/actions/remove')).then(function ({ default: remove }) {
        remove(e.data.id)
      })
    }

    return function (baton) {
      if ((/^(owncloud|webdav|nextcloud)$/.test(baton.data.id.split(':')[0])) && baton.data.folder_id === '1') return
      if (!api.can('remove:folder', baton.data)) return
      const folderId = baton.data.id || baton.app.folder.get()
      const model = api.pool.getModel(folderId)
      contextUtils.addLink(this, {
        action: 'delete',
        data: { id: baton.data.id },
        enabled: true,
        handler,
        text: api.is('trash', model.toJSON()) ? gt('Delete forever') : gt('Delete')
      })
    }
  }()),

  //
  // Restore folder
  //
  restoreFolder: (function () {
    return function (baton) {
      function handler (e) {
        ox.load(() => Promise.all([import('@/io.ox/files/api'), import('@/io.ox/files/actions/restore')])).then(function ([{ default: filesApi }, { default: action }]) {
          const model = new filesApi.Model(api.pool.getModel(e.data.id).toJSON())
          const key = e.data.listView.getCompositeKey(model)

          // the file model of files and folders
          const convertedModel = filesApi.resolve([key], false)
          action(convertedModel)
        })
      }

      if (!/^(infostore)$/.test(baton.module)) return
      if (!api.is('trash', baton.data)) return
      if (!api.can('restore:folder', baton.data)) return
      if (String(fileSettings.get('folder/trash')) !== baton.data.folder_id) return

      contextUtils.addLink(this, {
        action: 'restore',
        data: { id: baton.data.id, listView: baton.app.listView },
        enabled: true,
        handler,
        text: gt('Restore')
      })
    }
  }()),

  //
  // Move
  //
  move: (function () {
    function handler (e) {
      import('@/io.ox/core/folder/actions/move').then(function ({ default: move }) {
        move.folder(e.data.id, settings)
      })
    }

    return function (baton) {
      if (!/^(mail)$/.test(baton.module)) return
      if (_.device('smartphone')) return
      if (!api.can('move:folder', baton.data, {})) return

      contextUtils.addLink(this, {
        action: 'move',
        data: { id: baton.data.id },
        enabled: true,
        handler,
        text: gt('Move')
      })
    }
  }()),

  //
  // Move - only for Drive
  //
  moveDrive: (function () {
    function handler (e) {
      e.preventDefault()
      const id = e.data.id
      ox.load(() => Promise.all([import('@/io.ox/files/api'), import('@/io.ox/backbone/views/actions/util')])).then(function ([{ default: filesApi }, actionsUtil]) {
        const model = new filesApi.Model(api.pool.getModel(id).toJSON())
        // id from the model must be a compositeKey
        const key = e.data.app.listView.getCompositeKey(model)
        const convertedModel = filesApi.resolve([key])
        actionsUtil.invoke('io.ox/files/actions/move', ext.Baton({
          models: convertedModel,
          data: convertedModel[0],
          app: e.data.app
        }))
      })
    }

    return function (baton) {
      if (!/^(infostore)$/.test(baton.module)) return
      if (_.device('smartphone')) return
      if (!api.can('move:folder', baton.data, {})) return
      if (baton.originFavorites) return false

      contextUtils.addLink(this, {
        action: 'move',
        data: { app: baton.app, id: baton.data.id },
        enabled: true,
        handler,
        text: gt('Move')
      })
    }
  }()),

  //
  // Zip folder
  //
  zip: (function () {
    function handler (e) {
      import('@/io.ox/files/api').then(function ({ default: api }) {
        api.zip(e.data.id)
      })
    }

    return function (baton) {
      if (_.indexOf(baton.data.supported_capabilities, 'zippable_folder') === -1) return
      if (_.device('smartphone')) return
      if (baton.module !== 'infostore') return
      if (!folderUtil.can('read', baton.data)) return

      // we don't allow folder download on external storages see Bug 40979
      const isEnabled = !filestorage.isExternal(baton.data)
      contextUtils.addLink(this, {
        action: 'zip',
        data: { id: baton.data.id },
        enabled: isEnabled,
        handler,
        text: gt('Download entire folder')
      })
    }
  }()),

  //
  // Export folder
  //
  exportData: (function () {
    function exportDialog (e) {
      import('@/io.ox/core/export').then(function ({ default: exportDialog }) {
        exportDialog.open(e.data.baton.data.module, { folder: e.data.baton.data.id })
      })
    }

    function download (e) {
      import('@/io.ox/core/download').then(function ({ default: download }) {
        download.exported({ folder: e.data.baton.data.id, format: 'ical' })
      })
    }

    return function (baton) {
      if (_.device('ios || android')) return
      if (!api.can('export', baton.data)) return
      if (baton.data.total === 0) return
      if (!_.isNumber(baton.data.total) && baton.data.total !== null) return

      let handler = exportDialog
      if (baton.data.module === 'calendar') handler = download

      contextUtils.addLink(this, {
        action: 'export',
        data: { baton },
        enabled: true,
        handler,
        text: gt('Export')
      })
    }
  }()),

  //
  // Import data
  //
  importData: (function () {
    function handler (e) {
      e.preventDefault()
      import('@/io.ox/core/import/import').then(function ({ default: importer }) {
        importer.show(e.data.baton.data.module, e.data.baton.data.id)
      })
    }

    return function (baton) {
      if (_.device('ios || android')) return
      if (!api.can('import', baton.data)) return

      contextUtils.addLink(this, {
        action: 'import',
        data: { baton },
        enabled: true,
        handler,
        text: gt('Import')
      })
    }
  }()),

  //
  // Share / Permissions
  //
  shares: (function () {
    function invite (e) {
      e.preventDefault()
      const id = e.data.id
      Promise.all([import('@/io.ox/files/share/permissions')]).then(function ([{ default: permissions }]) {
        permissions.showFolderPermissions(id)
      })
    }

    return function (baton) {
      // permissions and sharing in context menu not for files
      if (baton.data.filename) return

      if (_.device('smartphone')) return
      // trash or subfolders do not support sharing or permission changes
      if (api.is('trash', baton.data)) return

      // check if folder can be shared
      const id = String(baton.data.id)
      const model = api.pool.getModel(id)

      const supportsInternal = model.supportsInternalSharing()
      const supportsInvite = model.supportsInviteGuests()
      const showInvitePeople = supportsInvite && model.supportsShares()
      const hasLinkSupport = capabilities.has('share_links') && !model.is('mail') && model.isShareable()

      // stop if neither invites or links are supported
      if (!supportsInternal && !showInvitePeople && !hasLinkSupport) return

      contextUtils.addLink(this, {
        action: 'share',
        data: { app: baton.app, id },
        enabled: true,
        handler: invite,
        text: model.isShareable() ? gt('Share / Permissions') : gt('Permissions')
      })
    }
  }()),

  //
  // Manage Deputies (only inbox and calendar for now)
  //
  deputies: (function () {
    function handler (e) {
      e.preventDefault()
      import('@/io.ox/core/deputy/dialog').then(function ({ default: deputyDialog }) {
        deputyDialog.open()
      })
    }

    return function (baton) {
      // needs deputy capability, needs to be inbox or default calendar and module must be available for deputy permissions
      if (capabilities.has('deputy') &&
      ((baton.data.id === api.getDefaultFolder('mail') && _(baton.availableDeputyModules).contains('mail')) ||
      (baton.data.id === api.getDefaultFolder('calendar') && _(baton.availableDeputyModules).contains('calendar')))) {
        contextUtils.addLink(this, {
          action: 'manageDeputies',
          data: { folder: baton.data.id, app: baton.app },
          enabled: true,
          handler,
          text: gt('Manage deputies')
        })
      }
    }
  }()),

  //
  // Favorite "show in Drive" is only for files
  //
  showInDrive: (function () {
    function handler (e) {
      e.preventDefault()
      import('@/io.ox/files/api').then(function ({ default: filesAPI }) {
        const models = filesAPI.pool.get('detail').get(e.data.cid)
        actions.invoke('io.ox/files/actions/show-in-folder', null, ext.Baton({
          models,
          app: this.view.app,
          alwaysChange: true
        }))
      })
    }

    return function (baton) {
      if (baton.data.folder_name) return

      if (_.device('smartphone')) return
      contextUtils.addLink(this, {
        action: 'showInDrive',
        data: { cid: baton.data.cid },
        enabled: true,
        handler,
        text: gt('Show in  %1$s', gt.pgettext('app', 'Drive'))
      })
    }
  }()),

  //
  // Folder properties
  //

  properties: (function () {
    function handler (e) {
      e.preventDefault()
      properties.openDialog(e.data.id)
    }

    return function (baton) {
      if (_.device('smartphone')) return
      // check if there is an extension that has something to show in the dialog
      if (!properties.check(baton.data.id)) return

      contextUtils.addLink(this, {
        action: 'properties',
        data: { baton, id: String(baton.data.id) },
        enabled: true,
        handler,
        text: gt('Properties')
      })
    }
  }()),

  //
  // Hide/show folder
  //

  toggle: (function () {
    function handler (e) {
      e.preventDefault()
      // hide/show
      api.toggle(e.data.id, e.data.state)
    }

    return function (baton) {
      // if data is empty we have nothing to do here
      if (!baton.data.id) return
      if (!/^(contacts|calendar|tasks)$/.test(baton.module)) return
      if (_.device('smartphone')) return
      if (baton.data.standard_folder) return

      const hidden = api.is('hidden', baton.data)

      contextUtils.addLink(this, {
        action: 'hide',
        data: { id: baton.data.id, state: hidden, view: baton.view },
        enabled: true,
        handler,
        text: hidden ? gt('Show') : gt('Hide')
      })
    }
  }()),

  customColor: (function () {
    return function (baton) {
      if (!/^calendar$/.test(baton.module)) return
      const extProps = baton.data['com.openexchange.calendar.extendedProperties']
      if (extProps && extProps.color && extProps.color.protected === false) return

      let listItem; const container = this.parent()

      this.append(listItem = $('<li role="presentation" class="io-ox-calendar-color-picker-container">'))

      Promise.all([import('@/io.ox/calendar/color-picker'), import('@/io.ox/calendar/util')]).then(function ([{ default: ColorPicker }, calendarUtil]) {
        listItem.append(
          new ColorPicker({
            model: api.pool.getModel(baton.data.id),
            getValue () {
              return calendarUtil.getFolderColor(this.model.attributes)
            },
            setValue (value) {
              // make sure existing properties are not overwritten
              api.update(this.model.get('id'), { 'com.openexchange.calendar.extendedProperties': _(_.copy(this.model.get('com.openexchange.calendar.extendedProperties') || {})).extend({ color: { value } }) }).fail(function (error) {
                yell(error)
              })
            }
          }).render().$el
        )
        // trigger ready to recompute bounds of smart dropdown
        container.trigger('ready')
      })
    }
  })(),

  //
  // manual refresh calendar data from external provider
  //
  refreshCalendar (baton) {
    // only in calendar module
    if (!/^calendar$/.test(baton.module)) return
    // check if folder supports cache updates ("cached" capability is present)
    if (!api.can('sync:cache', baton.data)) return

    contextUtils.addLink(this, {
      action: 'refresh-calendar',
      data: { folder: baton.data },
      enabled: true,
      handler: actions.refreshCalendar,
      text: gt('Refresh this calendar')
    })
  },

  //
  // Only select that calendar folder
  //
  selectOnly (baton) {
    if (!/^calendar$/.test(baton.module)) return
    const isOnly = baton.view.$el.hasClass('single-selection')
    contextUtils.addLink(this, {
      action: 'select-only',
      data: { folder: baton.data },
      enabled: true,
      handler: actions.selectOnly,
      text: isOnly ? gt('Show all calendars') : gt('Show this calendar only')
    })
  },

  // not used in folder contextmenu
  // but in the "select all" menu in listview
  selectAll (baton) {
    if (baton.module !== 'mail') return

    contextUtils.addLink(this, {
      action: 'selectall',
      data: { folder: baton.data.id, app: baton.app },
      enabled: true,
      handler () {
        baton.listView.selection.selectAll()
        baton.listView.trigger('selection:showHint')
      },
      text: gt('Select all messages')
    })
  },

  headerAll () {
    contextUtils.header.call(this, gt('All messages in this folder'))
  },

  divider: contextUtils.divider
}

//
// Default extensions
//

ext.point('io.ox/core/foldertree/contextmenu/default').extend(
  {
    id: 'add-folder',
    index: 1000,
    draw: extensions.add
  },
  {
    id: 'rename',
    index: 1100,
    draw: extensions.rename
  },
  {
    id: 'change-alarms',
    index: 1100,
    draw: extensions.alarms
  },
  {
    id: 'move',
    index: 1200,
    draw: extensions.move
  },
  {
    id: 'moveDrive',
    index: 1250,
    draw: extensions.moveDrive
  },
  {
    id: 'publications',
    index: 1300,
    draw: extensions.publish
  },
  {
    id: 'subscribe',
    index: 1400,
    draw: extensions.subscribe
  },
  {
    id: 'divider-1',
    index: 1450,
    draw: contextUtils.divider
  },
  // -----------------------------------------------
  {
    id: 'customColor',
    index: 1500,
    draw: extensions.customColor
  },
  {
    id: 'divider-2',
    index: 1600,
    draw: contextUtils.divider
  },
  // -----------------------------------------------
  {
    id: 'shares',
    index: 2000,
    draw: extensions.shares
  },
  {
    id: 'deputies',
    index: 2050,
    draw: extensions.deputies
  },
  {
    id: 'divider-3',
    index: 2100,
    draw: contextUtils.divider
  },
  // -----------------------------------------------
  {
    id: 'import',
    index: 3100,
    draw: extensions.importData
  },
  {
    id: 'export',
    index: 3200,
    draw: extensions.exportData
  },
  {
    id: 'zip',
    index: 3300,
    draw: extensions.zip
  },
  {
    id: 'divider-4',
    index: 3400,
    draw: contextUtils.divider
  },
  // -----------------------------------------------
  {
    id: 'mark-folder-read',
    index: 4100,
    draw: extensions.markFolderSeen
  },
  {
    id: 'move-all-messages',
    index: 4200,
    draw: extensions.moveAllMessages
  },
  {
    id: 'expunge',
    index: 4300,
    draw: extensions.expunge
  },
  {
    id: 'archive',
    index: 4400,
    draw: extensions.archive
  },
  {
    id: 'divider-5',
    index: 4500,
    draw: contextUtils.divider
  },
  // -----------------------------------------------

  {
    id: 'refresh-calendar',
    index: 6100,
    draw: extensions.refreshCalendar
  },
  {
    id: 'select-only',
    index: 6200,
    draw: extensions.selectOnly
  },
  {
    id: 'toggle',
    index: 6300,
    draw: extensions.toggle
  },
  {
    id: 'showInDrive',
    index: 6400,
    draw: extensions.showInDrive
  },
  {
    id: 'empty',
    index: 6500,
    draw: extensions.empty
  },
  {
    id: 'delete',
    index: 6600,
    draw: extensions.removeFolder
  },
  {
    id: 'restore',
    index: 6600,
    draw: extensions.restoreFolder
  },
  {
    id: 'properties',
    index: 6700,
    draw: extensions.properties
  }
)

//
// Special extensions
//
ext.point('io.ox/core/foldertree/contextmenu/myfolders').extend({
  id: 'add-folder',
  index: 100,
  render: extensions.add
}, {
  id: 'divider-1',
  index: 200,
  render () {
    this.divider()
  }
}, {
  id: 'add-account',
  index: 300,
  render () {
    if (!capabilities.has('multiple_mail_accounts')) return
    this.link('add-mail-account', gt('Add mail account'), function (e) {
      import('@/io.ox/mail/accounts/settings')
        .then(({ default: m }) => m.mailAutoconfigDialog(e))
    })
  }
})

export default {
  extensions,
  addLink: contextUtils.addLink,
  disable: contextUtils.disable,
  divider: contextUtils.divider
}
