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

// cSpell:ignore myfolders, mycalendars

import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import TreeNodeView from '@/io.ox/core/folder/node'
import api from '@/io.ox/core/folder/api'
import account from '@/io.ox/core/api/account'
import ext from '@/io.ox/core/extensions'
import capabilities from '@/io.ox/core/capabilities'
import mailAPI from '@/io.ox/mail/api'
import * as util from '@/io.ox/calendar/util'
import blocklist from '@/io.ox/core/folder/blacklist'
import http from '@/io.ox/core/http'
import apps from '@/io.ox/core/api/apps'
import '@/io.ox/core/folder/favorites'
import '@/io.ox/files/favorites'
import '@/io.ox/files/virtual/folders'
import { createButton } from '@/io.ox/core/components'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings as calSettings } from '@/io.ox/calendar/settings'
import { addReadyListener } from '@/io.ox/core/events'
import openSettings from '@/io.ox/settings/util'
import { device } from '@/browser'

const INBOX = 'default0' + mailAPI.separator + 'INBOX'

addReadyListener('capabilities:user', (capabilities) => {
  if (capabilities.has('webmail')) {
    // define virtual/standard
    api.virtual.add('virtual/standard', function () {
      const defaultFolders = mailSettings.get('defaultFolder') || {}
      const list = []
      // hash to avoid duplicates (see bug 59060)
      const hash = {}
      http.pause()
      // collect get requests
      list.push(api.get(INBOX))
      hash[INBOX] = true
      // append all-unseen and all-flagged below INBOX
      if (mailSettings.get('features/flagging/virtualFolder')) { list.push(api.get(mailAPI.allFlaggedMessagesFolder)) }
      if (mailSettings.get('features/unseenFolder')) { list.push(api.get('virtual/all-unseen')) }
      // ensure fixed order; rely on defaultFolders (see bug 56563)
      ['drafts', 'sent', 'spam', 'trash', 'archive'].forEach(function (type) {
        const folder = defaultFolders[type]
        if (!folder || hash[folder]) return
        if (type === 'archive' && !capabilities.has('archive_emails')) return
        list.push(api.get(folder))
        hash[folder] = true
      })
      http.resume()
      return this.concat.apply(this, list)
    })

    api.virtual.add('virtual/myfolders', function () {
      const id = api.altnamespace() ? 'default0' : INBOX
      return api.list(id).then(function (list) {
        return _(list).filter(function (data) {
          if (account.isHidden({ id: data.account_id })) return false
          if (data.id.indexOf('default0/External accounts') === 0) return false
          if (account.isStandardFolder(data.id)) return false
          if (api.is('public|shared', data)) return false
          return true
        })
      })
    })

    api.on('after:rename', function (id, data) {
      if (data.folder_id !== INBOX) return
      api.virtual.reload('virtual/myfolders')
    })

    // remote folders
    api.virtual.add('virtual/remote', function () {
      // standard environment
      return api.list('1').then(function (list) {
        return _(list).filter(function (data) {
          return account.isExternal(data.id)
        })
      })
    })
  }

  // TODO: right capability
  if (capabilities.has('filestore')) {
    api.virtual.add('virtual/filestorage', function () {
      return api.list('1').then(function (list) {
        return _(list).filter(function (data) {
          return api.isExternalFileStorage(data)
        })
      })
    })
  }

  if (capabilities.has('infostore')) {
    api.virtual.add('virtual/drive/private', function () {
      return this.concat(getMyFilesFolder(), getMySharesFolder(), getAllAttachmentsFolder(), getTrashFolder())
    })
    api.virtual.add('virtual/drive/private-without-myshares', function () {
      return this.concat(getMyFilesFolder(), getAllAttachmentsFolder(), getTrashFolder())
    })
    api.virtual.add('virtual/drive/public', function () {
      return api.list('9').then(function (list) {
        return _(list).filter(function (data) {
          if (String(data.id) === String(settings.get('folder/infostore'))) return false
          if (api.is('trash', data)) return false
          if (api.isExternalFileStorage(data)) return false
          return true
        })
      })
    })
  }
})

function getMyFilesFolder () {
  const id = settings.get('folder/infostore')
  return id ? api.get(id) : null
}

function getMySharesFolder () {
  if (capabilities.has('guest')) return
  if (!capabilities.has('gab || share_links')) return
  return $.when({
    id: 'virtual/files/shares',
    folder_id: '9',
    module: 'infostore',
    own_rights: 403710016, // all rights but admin
    permissions: [{ bits: 403710016, entity: ox.user_id, group: false }],
    standard_folder: true,
    supported_capabilities: [],
    title: gt('My shares')
  })
}

const attachmentView = settings.get('folder/mailattachments', {})

if (attachmentView.all) blocklist.add(attachmentView.all)

function getAllAttachmentsFolder () {
  const id = attachmentView.all
  return id ? api.get(id) : null
}

function openAttachmentView (e) {
  e.preventDefault()
  ox.launch(() => import('@/io.ox/files/main'), { folder: attachmentView.all }).then(function (app) {
    app.folder.set(attachmentView.all)
  })
}

function getTrashFolder () {
  return api.list('9').then(function (list) {
    return _(list).filter(function (data) {
      return api.is('trash', data)
    })
  })
}

if (capabilities.has('infostore')) {
  api.virtual.add('virtual/drive/private', function () {
    return this.concat(getMyFilesFolder(), getMySharesFolder(), getAllAttachmentsFolder(), getTrashFolder())
  })
  api.virtual.add('virtual/drive/private-without-myshares', function () {
    return this.concat(getMyFilesFolder(), getAllAttachmentsFolder(), getTrashFolder())
  })
  api.virtual.add('virtual/drive/public', function () {
    return api.list('9').then(function (list) {
      return _(list).filter(function (data) {
        if (String(data.id) === String(settings.get('folder/infostore'))) return false
        if (api.is('trash', data)) return false
        if (api.isExternalFileStorage(data)) return false
        return true
      })
    })
  })
}

const extensions = {

  unifiedFolders (tree) {
    // standard folders
    const view = new TreeNodeView({
      empty: false,
      filter (id, model) {
        // we check for ^default to make sure we only consider mail folders
        return /^default/.test(model.id) && account.isUnified(model.id)
      },
      folder: '1',
      headless: true,
      open: true,
      tree,
      parent: tree
    })
    this.append(
      view.render().$el.addClass('unified-folders').attr('role', 'treeitem')
    )
  },

  standardFolders (tree) {
    const view = new TreeNodeView({
      filter (id, model) {
        // do not filter unseen messages folder if enabled
        if (model.id === 'virtual/all-unseen' && mailSettings.get('unseenMessagesFolder')) return true
        if (model.id === mailAPI.allFlaggedMessagesFolder && mailSettings.get('flaggedMessagesFolder')) return true
        return account.isStandardFolder(model.id)
      },
      folder: 'virtual/standard',
      open: true,
      section: true,
      title: account.getPrimaryName() || gt('Standard folders'),
      tree,
      parent: tree
    })
    this.append(
      view.render().$el.addClass('standard-folders')
    )

    view.listenTo(ox, 'account:update', function (id) {
      if (id !== 0) return
      const title = account.getPrimaryName() || gt('Standard folders')
      view.model.set('title', title)
    })
    // show / hide folder on setting change
    view.listenTo(mailSettings, 'change:unseenMessagesFolder', function () {
      view.onReset()
    })
  },

  getLocalFolderName () {
    return gt('My folders')
  },

  localFolders (tree) {
    if (capabilities.has('guest')) return // Guests aren't able to create local folders

    const defaultId = api.altnamespace() ? 'default0' : INBOX

    const node = new TreeNodeView({
      contextmenu: 'myfolders',
      // always show the folder for altnamespace
      // otherwise the user cannot create folders
      empty: true, //! !api.altnamespace(),
      // convention! virtual folders are identified by their id starting with "virtual"
      folder: 'virtual/myfolders',
      icons: tree.options.icons,
      contextmenu_id: defaultId,
      parent: tree,
      title: extensions.getLocalFolderName(),
      tree
    })

    // open "My folders" whenever a folder is added to INBOX/root
    api.on('create:' + defaultId, function () {
      node.toggle(true)
    })

    this.append(node.render().$el)
  },

  remoteAccounts (tree) {
    const treenodeview = new TreeNodeView({
      folder: 'virtual/remote',
      headless: true,
      open: true,
      icons: tree.options.icons,
      tree,
      parent: tree,
      isRemote: true,
      empty: false
    })

    this.append(
      treenodeview.render().$el.addClass('remote-folders')
    )
  },

  fileStorageAccounts (tree) {
    const treenodeview = new TreeNodeView({
      folder: 'virtual/filestorage',
      headless: true,
      open: true,
      icons: tree.options.icons,
      tree,
      parent: tree,
      empty: false
    })

    this.append(
      treenodeview.render().$el.addClass('filestorage-folders')
    )
  },

  treeLinksFiles () {
    if (ext.point('io.ox/core/foldertree/files/treelinks').list().length === 0) return

    const node = $('<ul class="list-unstyled" role="group">')
    ext.point('io.ox/core/foldertree/files/treelinks').invoke('draw', node)
    this.append($('<li class="links list-unstyled" role="treeitem">').append(node))
  },

  treeLinks () {
    return undefined

    // if (ext.point('io.ox/core/foldertree/mail/treelinks').list().length === 0) return
    // const node = $('<ul class="list-unstyled" role="group">')
    // ext.point('io.ox/core/foldertree/mail/treelinks').invoke('draw', node)
    // this.append($('<li class="links list-unstyled" role="treeitem">').append(node))
  },

  allAttachments () {
    if (!attachmentView.all) return
    this.append(
      $('<li role="presentation">').append(
        $('<a href="#" data-action="all-attachments" role="treeitem">').text(gt('View all attachments')).on('click', openAttachmentView)
      )
    )
  },

  otherFolders (tree) {
    this.append(
      new TreeNodeView({
        empty: false,
        filter (id, model) {
          // exclude standard folder
          if (account.isStandardFolder(model.id)) return false
          // 'default0/virtual' is dovecot's special "all" folder
          if (model.id === 'default0/virtual') return false
          // alt namespace only allows public/shared folder here
          return api.altnamespace() ? api.is('public|shared', model.toJSON()) : true
        },
        folder: 'default0',
        headless: true,
        open: true,
        icons: tree.options.icons,
        tree,
        parent: tree
      })
        .render().$el.addClass('other-folders').attr('role', 'treeitem')
    )
  },

  addNewAddressBook (baton) {
    const module = baton.module
    const folder = api.getDefaultFolder(module)
    this.link('add-new-address-book', gt('Add new address book'), function (e) {
      e.data = { folder, module }
      addFolder(e)
    })
    this.divider()
  },

  rootFolders (tree) {
    const options = {
      folder: tree.root,
      headless: true,
      open: true,
      tree,
      parent: tree
    }

    if (tree.options.hideTrashfolder) {
      options.filter = function (id, model) {
        // exclude trashfolder
        return !api.is('trash', model.attributes)
      }
    }

    // TODO: disable when only one account
    if (tree.module === 'infostore') {
      const previous = options.filter
      options.filter = function (id, model) {
        // get response of previously defined filter function
        const unfiltered = (previous ? previous.apply(this, arguments) : true)
        // exclude external accounts and trashfolder if requested
        return unfiltered && !api.isExternalFileStorage(model) && (!tree.options.hideTrashfolder || !api.is('trash', model.attributes))
      }
    }
    this.append(
      new TreeNodeView(options).render().$el.addClass('root-folders')
    )
  },

  privateDriveFolders (tree) {
    this.append(
      new TreeNodeView({
        // empty: false,
        folder: 'virtual/drive/private',
        headless: true,
        open: true,
        icons: tree.options.icons,
        tree,
        parent: tree
      })
        .render().$el.addClass('private-drive-folders')
    )
  },

  privateDriveFoldersWithoutMyShares (tree) {
    this.append(
      new TreeNodeView({
        // empty: false,
        folder: 'virtual/drive/private-without-myshares',
        headless: true,
        open: true,
        icons: tree.options.icons,
        tree,
        parent: tree
      })
        .render().$el.addClass('private-drive-folders')
    )
  },

  publicDriveFolders (tree) {
    this.append(
      new TreeNodeView({
        // empty: false,
        folder: 'virtual/drive/public',
        headless: true,
        open: true,
        icons: tree.options.icons,
        tree,
        parent: tree
      })
        .render().$el.addClass('public-drive-folders')
    )
  }
}

let INDEX = 100

//
// Mail
//
ext.point('io.ox/core/foldertree/mail/app').extend(
  {
    id: 'unified-folders',
    index: INDEX += 100,
    draw: extensions.unifiedFolders
  },
  {
    id: 'standard-folders',
    index: INDEX += 100,
    draw: extensions.standardFolders
  },
  {
    id: 'local-folders',
    index: INDEX += 100,
    draw: extensions.localFolders
  },
  {
    id: 'other',
    index: INDEX += 100,
    draw: extensions.otherFolders
  },
  {
    id: 'remote-accounts',
    index: INDEX += 100,
    draw: extensions.remoteAccounts
  },
  {
    id: 'tree-links',
    index: INDEX += 100,
    draw: extensions.treeLinks
  }
)

ext.point('io.ox/core/foldertree/mail/treelinks').extend(
  {
    id: 'all-attachments',
    index: INDEX += 100,
    draw: extensions.allAttachments
  },
  {
    id: 'add-account',
    index: INDEX += 100,
    draw: extensions.addRemoteAccount
  }
)

ext.point('io.ox/core/foldertree/mail/popup').extend(
  {
    id: 'standard-folders',
    draw: extensions.standardFolders
  },
  {
    id: 'local-folders',
    draw: extensions.localFolders
  },
  {
    id: 'other',
    draw: extensions.otherFolders
  },
  {
    id: 'remote-accounts',
    draw: extensions.remoteAccounts
  }
)

// looks identical to popup but has no favorites
ext.point('io.ox/core/foldertree/mail/subscribe').extend(
  {
    id: 'root-folders',
    draw: extensions.rootFolders
  }
)

ext.point('io.ox/core/foldertree/mail/account').extend(
  {
    id: 'root-folders',
    draw: extensions.rootFolders
  }
)

ext.point('io.ox/core/foldertree/mail/filter').extend(
  {
    id: 'standard-folders',
    draw: extensions.standardFolders
  },
  {
    id: 'local-folders',
    draw: extensions.localFolders
  },
  {
    id: 'other',
    draw: extensions.otherFolders
  }
)

//
// Files / Drive
//

ext.point('io.ox/core/foldertree/infostore/app').extend(
  {
    id: 'private-folders',
    index: 100,
    draw: extensions.privateDriveFolders
  },
  {
    id: 'public-folders',
    index: 200,
    draw: extensions.publicDriveFolders
  },
  {
    id: 'remote-accounts',
    index: 300,
    draw: extensions.fileStorageAccounts
  },
  {
    id: 'tree-links-files',
    index: 400,
    draw: extensions.treeLinksFiles
  }
)

ext.point('io.ox/core/foldertree/infostore/subscribe').extend(
  {
    id: 'root-folders',
    draw: extensions.rootFolders
  }
)

ext.point('io.ox/core/foldertree/infostore/popup').extend(
  {
    id: 'private-folders',
    index: 100,
    draw: extensions.privateDriveFoldersWithoutMyShares
  },
  {
    id: 'public-folders',
    index: 200,
    draw: extensions.publicDriveFolders
  },
  {
    id: 'remote-accounts',
    index: 300,
    draw: extensions.fileStorageAccounts
  }
)

//
// Contacts
//

ext.point('io.ox/core/foldertree/contextmenu/mycontacts').extend({
  id: 'add-new_address_book',
  index: 100,
  render: extensions.addNewAddressBook
})

// helper

async function addFolder (e) {
  e.preventDefault()
  const { default: add } = await import('@/io.ox/core/folder/actions/add')
  return add(e.data.folder, { module: e.data.module })
}

_('contacts calendar tasks'.split(' ')).each(function (module) {
  //
  // Flat trees
  //

  const sectionNames = {
    contacts: {
      private: gt('My address books'),
      public: gt('Public address books'),
      shared: gt('Shared address books'),
      hidden: gt('Hidden address books')
    },
    calendar: {
      private: gt('My calendars'),
      public: gt('Public calendars'),
      shared: gt('Shared calendars'),
      hidden: gt('Hidden calendars'),
      resource: gt('Resources')
    },
    tasks: {
      private: gt('My lists'),
      public: gt('Public lists'),
      shared: gt('Shared lists'),
      hidden: gt('Hidden lists')
    }
  }

  function getTitle (module, type) {
    return sectionNames[module][type]
  }

  const defaultExtension = {
    id: 'standard-folders',
    index: 100,
    draw (tree) {
      const moduleName = module === 'calendar' ? 'event' : module
      const links = $('<ul class="list-unstyled" role="group">')
      const baton = ext.Baton({ module, view: tree, context: tree.context })
      const folder = 'virtual/flat/' + moduleName
      const modelId = 'flat/' + moduleName
      const defaults = { count: 0, empty: false, indent: false, open: false, tree, parent: tree, filter (id, model) { return !!model.get('subscribed') } }
      let privateFolders
      let publicFolders
      const placeholder = $('<li role="treeitem" class="hidden">')

      // no links. Used for example in move folder picker
      if (!tree.options.noLinks) {
        ext.point('io.ox/core/foldertree/' + module + '/links').invoke('draw', links, baton)
      }

      this.append(placeholder)

      // call flat() here to cache the folders. If not, any new TreeNodeview() and render() call calls flat() resulting in a total of 12 flat() calls.
      api.flat({ module: moduleName }).always(function () {
        privateFolders = new TreeNodeView(_.extend({}, defaults, {
          contextmenu: getContextmenu(),
          folder: folder + '/private',
          model_id: modelId + '/private',
          title: getTitle(module, 'private'),
          filter (id, model) { return !!model.get('subscribed') }
        }))

        // open private folder whenever a folder is added to it
        api.pool.getCollection('flat/' + moduleName + '/private').on('add', function () {
          privateFolders.toggle(true)
        })

        // open public folder whenever a folder is added to it
        api.pool.getCollection('flat/' + moduleName + '/public').on('add', function () {
          privateFolders.toggle(true)
        })

        publicFolders = new TreeNodeView(_.extend({}, defaults, { folder: folder + '/public', model_id: modelId + '/public', title: getTitle(module, 'public') }))

        placeholder.replaceWith(
          // private folders
          privateFolders.render().$el.addClass('section'),
          // links
          links.children().length ? $('<li class="links list-unstyled" role="treeitem">').append(links) : null,
          // public folders
          publicFolders.render().$el.addClass('section'),
          // shared with me
          new TreeNodeView(_.extend({}, defaults, { folder: folder + '/shared', model_id: modelId + '/shared', title: getTitle(module, 'shared') }))
            .render().$el.addClass('section'),
          // hidden folders
          new TreeNodeView(_.extend({}, defaults, { folder: folder + '/hidden', model_id: modelId + '/hidden', title: getTitle(module, 'hidden') }))
            .render().$el.addClass('section'),
          // general resource folders
          settings.get('features/resourceCalendars', true)
            ? new TreeNodeView(_.extend({}, defaults, { folder: folder + '/resources.general', model_id: modelId + '/resources.general', title: getTitle(module, 'resource'), contextmenu: 'resources' }))
              .render().$el.addClass('section')
            : $()
        )
        tree.$el.addClass('complete')
        $('html').addClass('complete')
      })

      function getContextmenu () {
        if (capabilities.has('guest')) return
        if (module === 'calendar') return 'mycalendars'
        return 'my' + module
      }
    }
  }

  ext.point('io.ox/core/foldertree/' + module + '/app').extend(_.extend({}, defaultExtension))
  ext.point('io.ox/core/foldertree/' + module + '/popup').extend(_.extend({}, defaultExtension))
})

//
// Calendar
//
ext.point('io.ox/core/foldertree/calendar/app').extend({
  id: 'resource-folders',
  index: 200,
  draw (baton) {
    if (!settings.get('features/resourceCalendars', true)) return
    const resourceGroups = calSettings.get('resources/groups', {})
    const orderedGroups = Object.keys(resourceGroups).sort().reduce((obj, key) => {
      obj[key] = resourceGroups[key]
      return obj
    }, {})
    Object.entries(orderedGroups).forEach(resourceGroup => {
      const [title, group] = resourceGroup
      if (title === 'general') return
      this.append(
        new TreeNodeView({
          contextmenu: 'resources',
          folder: `virtual/${group.folderId}`,
          model_id: group.folderId,
          title: group.title,
          tree: baton.app.treeView || baton,
          parent: baton.app.treeView || baton,
          empty: true,
          count: 0,
          indent: false,
          open: false,
          section: true
        }).render().$el.addClass('section')
      )
    })
  }
})

ext.point('io.ox/core/foldertree/contextmenu/mycalendars').extend({
  id: 'default',
  index: 100,
  render () {
    const folder = api.getDefaultFolder('calendar')
    // guests might have no default folder
    if (!folder) return
    this.link('folder', gt('Add new calendar'), function (e) {
      e.data = { folder, module: 'event' }
      addFolder(e)
    })
  }
})

//
// Tasks
//

ext.point('io.ox/core/foldertree/contextmenu/mytasks').extend({
  id: 'default',
  index: 100,
  render () {
    const folder = api.getDefaultFolder('tasks')
    // guests might have no default folder
    if (!folder) return
    this.link('add-new-folder', gt('Add new task list'), function (e) {
      e.data = { folder, module: 'tasks' }
      addFolder(e)
    })
  }
})

//
// Shared folders
//

function openPermissions (e) {
  const id = e.data.id
  Promise.all([import('@/io.ox/files/share/permissions')]).then(function ([{ default: controller }]) {
    controller.showFolderPermissions(id)
  })
}

function openSubSettings (e) {
  // TODO: make sure chronos module is used here
  openSettings('virtual/settings/io.ox/core/sub')
}

function toggleFolder (e) {
  if (e.type === 'keydown') {
    if (e.which !== 32) return
    e.stopImmediatePropagation()
  }
  const target = e.data.target
  const app = e.data.app
  const folder = e.data.folder
  if (target.closest('.single-selection').length > 0) return
  e.preventDefault()
  if (app.folders.isSelected(folder.id)) app.folders.remove(folder.id)
  else app.folders.add(folder.id)
  target.toggleClass('selected', app.folders.isSelected(folder.id))
  target.closest('.folder').attr('aria-checked', app.folders.isSelected(folder.id))
}

ext.point('io.ox/core/foldertree/node').extend(
  {
    id: 'shared-by',
    index: 100,
    draw (baton) {
      const model = baton.view.model; const data = model.toJSON()
      if (!/^(contacts|calendar|tasks)$/.test(data.module)) return
      if (!api.is('shared', data)) return
      baton.view.addA11yDescription(gt('Shared by other users'))
    }
  },
  {
    id: 'shared',
    index: 200,
    draw (baton) {
      this.find('.folder-node:first .folder-shared:first').remove()

      if (_.device('smartphone')) return
      // drive has virtual folder 'Shared by me'
      if (baton.data.module === 'infostore') return
      if (!api.is('unlocked', baton.data)) return

      baton.view.$.buttons.append(
        createButton({ variant: 'none', icon: { name: 'bi/share.svg', title: gt('You share this folder with other users') }, tabindex: -1 })
          .addClass('folder-shared')
          .on('click', { id: baton.data.id }, openPermissions)
      )
      baton.view.addA11yDescription(gt('You share this folder with other users'))
    }
  },
  {
    id: 'sub',
    index: 300,
    draw (baton) {
      if (!api.isVirtual(baton.view.folder)) {
        this.find('.folder-sub:first').remove()
      }

      // ignore shared folders
      if (api.is('shared', baton.data)) return
      if (!api.is('subscribed', baton.data)) return

      baton.view.$.buttons.append(
        createButton({ variant: 'none', icon: { name: 'bi/cloud.svg', title: gt('This folder has subscriptions') }, tabindex: -1 })
          .addClass('folder-subscribed')
          .on('click', { folder: baton.data }, openSubSettings)
      )
      baton.view.addA11yDescription(gt('This folder has subscriptions'))
    }
  },
  {
    id: 'is-selected',
    index: 400,
    draw (baton) {
      if (device('smartphone')) return
      if (!/^calendar$/.test(baton.data.module)) return

      const self = this
      const folderIcon = this.find('.folder-icon')
      const app = apps.get('io.ox/calendar')

      if (!app) return

      this.attr('aria-checked', app.folders.isSelected(baton.data.id))

      const setColors = () => {
        if (baton.view.disposed) return

        const folderColor = util.getFolderColor(baton.data)
        const colors = util.deriveAppointmentColors(folderColor)
        const borderColor = colors.border
        const backgroundColor = colors.background
        const foregroundColor = colors.foreground
        let target = folderIcon.find('.color-label')
        const colorName = colors.name

        // #. Will be used as aria-label for the screen reader to tell the user which color/category the appointment within the calendar has.
        if (colorName) baton.view.addA11yDescription(gt('Category') + ': ' + colorName)

        if (target.length === 0) target = $('<div class="color-label" aria-hidden="true">')
        target
          .toggleClass('selected', app.folders.isSelected(baton.data.id))
          .css({ borderColor, backgroundColor, color: foregroundColor })
          .off('click', toggleFolder)
          .on('click', { folder: baton.data, app, target }, toggleFolder)

        self.off('keydown', toggleFolder).on('keydown', { folder: baton.data, app, target }, toggleFolder)
        folderIcon.prepend(target)
      }

      setColors()
      ox.on('themeChange', setColors)
    }
  },
  {
    id: 'account-errors',
    index: 500,
    draw (baton) {
      const module = baton.data.module

      if (!/^(calendar|contacts|infostore)$/.test(module)) return

      // contacts
      if (module === 'contacts' && baton.data.meta && baton.data.meta.errors) {
        return baton.view.showStatusIcon(gt('The subscription could not be updated due to an error and must be recreated.'), 'click:account-error', baton.data)
      }

      // calendar and drive
      const accountError = module === 'calendar'
        ? baton.data['com.openexchange.calendar.accountError']
        : baton.data['com.openexchange.folderstorage.accountError']

      if (!accountError) return baton.view.hideStatusIcon()

      baton.view.showStatusIcon(accountError.error, 'click:account-error', baton.data)
      ox.trigger('http:error:' + accountError.code, accountError)
    }
  }
)

export default extensions
