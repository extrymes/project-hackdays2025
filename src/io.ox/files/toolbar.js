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
import $ from '@/jquery'
import ext from '@/io.ox/core/extensions'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import api from '@/io.ox/files/api'
import folderApi from '@/io.ox/core/folder/api'
import '@/io.ox/files/actions'
import '@/io.ox/files/style.scss'
import { addReadyListener } from '@/io.ox/core/events'
import { hasStorageAccounts } from '@/io.ox/files/util'

import gt from 'gettext'

// define links for classic toolbar
const point = ext.point('io.ox/files/toolbar/links')

const meta = {
  //
  // --- HI ----
  //
  share: {
    prio: 'hi',
    mobile: 'lo',
    title: (baton) => {
      return baton.app.folder.get() === 'virtual/files/shares' ? gt('Edit share') : gt('Share')
    },
    icon: 'bi/share.svg',
    ref: 'io.ox/files/actions/share',
    drawDisabled: true
  },
  edit: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Edit'),
    icon: 'bi/pencil.svg',
    ref: 'io.ox/files/actions/editor'
  },
  'edit-federated': {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Edit'),
    icon: 'bi/pencil.svg',
    ref: 'io.ox/files/actions/edit-federated'
  },
  viewer: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/eye.svg',
    // #. used as a verb here. label of a button to view files
    title: gt('View'),
    ref: 'io.ox/files/actions/viewer'
  },
  download: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/cloud-download.svg',
    title: gt('Download'),
    ref: 'io.ox/files/actions/download'
  },
  'download-folder': {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/cloud-download.svg',
    title: gt('Download'),
    ref: 'io.ox/files/actions/download-folder'
  },
  addToFavorites: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/star.svg',
    title: gt('Add to favorites'),
    ref: 'io.ox/files/actions/favorites/add',
    section: 'favorites'
  },
  removeFromFavorites: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/star-fill.svg',
    title: gt('Remove from favorites'),
    ref: 'io.ox/files/actions/favorites/remove',
    section: 'favorites'
  },
  delete: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/trash.svg',
    title (baton) {
      const model = folderApi.pool.getModel(baton.folder_id)
      return model && folderApi.is('trash', model.toJSON()) ? gt('Delete forever') : gt('Delete')
    },
    ref: 'io.ox/files/actions/delete',
    drawDisabled: true
  },
  back: {
    prio: 'lo',
    mobile: 'hi',
    label: gt('Folders'),
    ref: 'io.ox/files/favorite/back'
  },
  //
  // --- LO ----
  //
  'show-in-folder': {
    prio: 'lo',
    mobile: 'lo',
    title: gt.pgettext('app', 'Drive'),
    ref: 'io.ox/files/actions/show-in-folder',
    section: 'favorites'
  },
  rename: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Rename'),
    ref: 'io.ox/files/actions/rename',
    section: 'edit'
  },
  'edit-description': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Edit description'),
    ref: 'io.ox/files/actions/edit-description',
    section: 'edit'
  },
  'save-as-pdf': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Save as PDF'),
    ref: 'io.ox/files/actions/save-as-pdf',
    section: 'save-as'
  },
  send: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Send by email'),
    ref: 'io.ox/files/actions/send',
    section: 'share'
  },
  'add-to-portal': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Add to portal'),
    ref: 'io.ox/files/actions/add-to-portal',
    section: 'share'
  },
  move: {
    title: gt('Move'),
    prio: 'lo',
    mobile: 'lo',
    ref: 'io.ox/files/actions/move',
    section: 'file-op'
  },
  copy: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/files/actions/copy',
    section: 'file-op'
  },
  lock: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Lock'),
    ref: 'io.ox/files/actions/lock',
    section: 'file-op'
  },
  unlock: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Unlock'),
    ref: 'io.ox/files/actions/unlock',
    section: 'file-op'
  },
  restore: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Restore'),
    ref: 'io.ox/files/actions/restore',
    section: 'file-op'
  }
}

// transform into extensions

let index = 0

_(meta).each(function (extension, id) {
  extension.id = id
  extension.index = (index += 100)
  point.extend(extension)
})

ext.point('io.ox/topbar/settings-dropdown').extend(
  {
    id: 'drive-layout',
    index: 100,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      this
        .group(gt('Layout'))
        .option('layout', 'list', gt('List'), { group: true, radio: true, illustration: svg('list') })
        .option('layout', 'icon', gt('Icons'), { group: true, radio: true, illustration: svg('icon') })
        .option('layout', 'tile', gt('Tiles'), { group: true, radio: true, illustration: svg('tile') })
        .divider()
      function svg (name) {
        return $.svg({ src: `themes/default/illustrations/drive-layout-${name}.svg`, width: 80, height: 60 })
          .addClass('ms-auto me-8').css({ color: 'var(--accent)' })
      }
    }
  },
  {
    id: 'drive-options',
    index: 200,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      const viewDropDown = this.group(gt('View options'))
      viewDropDown.option('checkboxes', true, gt('Checkboxes'), { group: true })
      if (_.device('!touch')) viewDropDown.option('details', true, gt('File details'), { group: true })
      viewDropDown.divider()
    }
  }, {
    id: 'add-storage-account',
    index: 300,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      addStorageAccount.call(this)
    }
  }, {
    id: 'manage-subscriptions',
    index: 400,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      manageSubscriptions.call(this)
    }
  }
)

ext.point('io.ox/files/mediator').extend({
  id: 'toolbar',
  index: 10000,
  setup (app) {
    const toolbarView = new ToolbarView({ point: 'io.ox/files/toolbar/links', title: app.getTitle(), strict: false })

    app.getWindow().nodes.main.find('.generic-sidebar-content').prepend(
      toolbarView.$el.css('padding', '0 8px')
    )

    app.updateToolbar = _.debounce(function (selection) {
      if (this.listView.isBusy) {
        const dropdownToggle = toolbarView.$el.find('a[data-toggle="dropdown"]')
        dropdownToggle.attr('data-toggle', []).addClass('disabled')
        this.listView.collection.once('complete', function () {
          dropdownToggle.attr('data-toggle', 'dropdown').removeClass('disabled')
        })
      } else {
        toolbarView.setSelection(selection.map(_.cid), function () {
          return this.getContextualData(selection, 'main')
        }.bind(this))
      }
    }, 10)
  }
})

ext.point('io.ox/files/mediator').extend({
  id: 'update-toolbar',
  index: 10200,
  setup (app) {
    // initial update
    updateToolbar()
    // update toolbar on selection and model changes
    app.listView.on('selection:change change', updateToolbar)
    // files as favorites
    api.on('favorite:add favorite:remove', updateToolbar)
    // folders as favorites
    folderApi.on('favorite:add favorite:remove', updateToolbar)
    // change folder
    app.on('folder:change', app.updateToolbar.bind(app, []))

    function updateToolbar () {
      app.updateToolbar(app.listView.selection.get())
    }
  }
})

const addStorageAccount = (function () {
  let canAddAccounts = false
  async function update () {
    const { default: capabilities } = await import('@/io.ox/core/capabilities')
    if (capabilities.has('guest')) return
    const hasAccounts = await hasStorageAccounts()
    if (!hasAccounts) return
    canAddAccounts = true
  }
  addReadyListener('capabilities:user', update)
  import('@/io.ox/core/api/filestorage').then(({ default: filestorageApi }) => {
    filestorageApi.on('create delete update reset', update)
  })

  return function () {
    if (!canAddAccounts) return
    this.append(
      $('<a href="#" data-action="add-storage-account" role="treeitem">')
        .text(gt('Add storage account'))
        .on('click', openAddStorageAccount)
    )
  }
})()

function openAddStorageAccount (e) {
  e.preventDefault()
  import('@/io.ox/files/actions/add-storage-account')
    .then(({ default: addStorageAccount }) => addStorageAccount())
}

const hasManagedSubscriptions = (() => {
  let isVisible
  return async function () {
    if (isVisible !== undefined) return isVisible
    // 10 is public folders, 15 is shared folders
    const [pFolders, sFolders] = await Promise.all([
      folderApi.list(15, { all: true, cache: false }),
      folderApi.list(10, { all: true, cache: false })
    ])

    return (isVisible = !_.isEmpty(pFolders) || !_.isEmpty(sFolders))
  }
})()
hasManagedSubscriptions()

// used to manage subscribed/unsubscribed status of folders from federated shares
function manageSubscriptions () {
  // append node now (serves as placeholder until requests return)
  this.append()
  const node = this.$ul.children().last()

  hasManagedSubscriptions().then(function (hasManagedSubscriptions) {
    // check if there are folders to unsubscribe at all
    if (!hasManagedSubscriptions) return node.remove()

    node.append(
      // #. opens a dialog to manage shared or public folders
      $('<a href="#" data-action="manage-subscriptions" role="treeitem">').text(gt('Manage Shares')).on('click', function () {
        import('@/io.ox/core/sub/sharedFolders').then(({ default: subscribe }) => {
          subscribe.open({
            module: 'infostore',
            help: 'ox.appsuite.user.sect.drive.folder.subscribeshared.html',
            title: gt('Shared folders'),
            tooltip: gt('Subscribe to folder'),
            point: 'io.ox/core/folder/subscribe-shared-files-folders',
            sections: {
              public: gt('Public'),
              shared: gt('Shared')
            },
            refreshFolders: true,
            noSync: true,
            // subscribe dialog is build for flat foldertrees, add special getData function to make it work for infostore
            // no cache or we would overwrite folder collections with unsubscribed folders
            getData () {
              return $.when(
                folderApi.list(15, { all: true, cache: false }),
                folderApi.list(10, { all: true, cache: false })
              )
                .then(function (publicFolders, sharedFolders) {
                  return { public: publicFolders || [], shared: sharedFolders || [] }
                })
            }
          })
        })
      })
    )
  }, function () {
    node.remove()
  })
}
