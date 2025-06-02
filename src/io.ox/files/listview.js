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

import ListView from '@/io.ox/core/tk/list'
import ContextMenu from '@/io.ox/core/tk/list-contextmenu'
import ext from '@/io.ox/core/extensions'
import extensions from '@/io.ox/files/common-extensions'
import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import { createIcon } from '@/io.ox/core/components'

import '@/io.ox/files/view-options'
import '@/io.ox/files/style.scss'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const LISTVIEW = 'io.ox/files/listview'; const ITEM = LISTVIEW + '/item'

//
// Extend ListView
//

const FileListView = ListView.extend(ContextMenu).extend({

  ref: LISTVIEW,

  initialize (options) {
    ListView.prototype.initialize.apply(this, arguments)
    this.contextMenu = options.contextMenu
    this.contextMenuRef = 'io.ox/files/listview/contextmenu'
    this.freeSpaceContextMenuRef = 'io.ox/files/listview/contextmenu/freespace'
    this.$el.attr('aria-label', gt('List view')).addClass('file-list-view')

    updateSettings.call(this)
    settings.on('change:favorites/infostore', updateSettings.bind(this))

    function updateSettings () {
      this.favorites = settings.get('favorites/infostore', [])
      this.favoriteFiles = settings.get('favoriteFiles/infostore', [])
    }

    this.listenTo(filesAPI, 'favorite:toggle', this.onToggleFavorite)
  },

  getCompositeKey (model) {
    return model.isFolder() ? this.createFolderCompositeKey(model.get('id')) : model.cid
  },

  createFolderCompositeKey (folderId) {
    return 'folder.' + folderId
  },

  onChange (model) {
    // ignore irrelevant changed attributes (see bug 49257)
    const relevantChanges = _.intersection(_(model.changed).keys(), FileListView.relevantAttributes)
    if (!relevantChanges.length) return
    ListView.prototype.onChange.apply(this, arguments)
  },

  onToggleFavorite (file) {
    const model = this.collection.get(_.cid(file))
    if (model) ListView.prototype.onChange.apply(this, [model])
  },

  getContextMenuData (selection) {
    return this.app.getContextualData(selection, 'main')
  }
})

// we redraw only if a relevant attribute changes (to avoid flickering)
FileListView.relevantAttributes = ['com.openexchange.share.extendedObjectPermissions', 'com.openexchange.share.extendedPermissions', 'index', 'id', 'last_modified', 'locked_until', 'filename', 'file_mimetype', 'file_size', 'source', 'title', 'version', 'index/virtual/favorites/infostore', 'com.openexchange.file.sanitizedFilename']

//
// Extension for detail sidebar
//

ext.point('io.ox/core/viewer/sidebar/fileinfo').extend({
  index: 50,
  id: 'thumbnail',
  draw (baton) {
    let body = this.find('.sidebar-panel-body')
    _.defer(function () {
      // only append in files app
      if (body.closest('.viewer-sidebar.rightside').length) {
        const oldColumn = body.closest('.viewer-sidebar.rightside').find('.sidebar-panel-thumbnail')
        const column = oldColumn.length ? oldColumn : $('<div class="sidebar-panel-thumbnail" role="tabpanel">')
        column.empty()
        extensions.thumbnail.call(column, baton)
        body.before(column)
      }
      body = null
    })
  }
})

//
// Extensions
//

ext.point(LISTVIEW + '/notification/empty').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    // can be unified with mail (same code)
    const isSearch = !!baton.app.props.get('searching')
    const file = isSearch ? 'empty-search' : 'empty-folder'
    this.attr('role', 'option').css('padding-bottom', '120px').empty().append(
      $.svg({ src: `themes/default/illustrations/${file}.svg`, width: 200, height: 96, role: 'none' })
        .addClass('illustration'),
      $('<div>').text(
        isSearch ? gt('No search results') : gt('This folder is empty')
      )
    )
  }
})

ext.point(LISTVIEW + '/notification/error').extend({
  id: 'default',
  index: 100,
  draw (baton) {
    function retry (e) {
      e.data.baton.listView.load()
    }

    this.append(
      createIcon('bi/exclamation-triangle.svg'),
      $.txt(gt('Error: Failed to load files')),
      $('<button type="button" class="btn btn-link">')
        .text(gt('Retry'))
        .on('click', { baton }, retry)
    )
  }
})

ext.point(ITEM).extend(
  {
    id: 'default',
    index: 100,
    draw (baton) {
      const layout = (baton.app && baton.app.props.get('layout')) || 'list'
      if (!baton.model) {
        baton.model = new filesAPI.Model(baton.data)
      }
      ext.point(ITEM + '/' + layout).invoke('draw', this, baton)
    }
  },
  {
    id: 'aria-label',
    index: 200,
    draw: extensions.ariaLabel
  }
)

const isAttachmentView = function (baton) {
  const attachmentView = settings.get('folder/mailattachments', {})
  return (_.values(attachmentView).indexOf(baton.app.folder.get()) > -1)
}

// list layout

ext.point(ITEM + '/list').extend(
  {
    id: 'file-type',
    index: 10,
    draw: extensions.fileTypeClass
  },
  {
    id: 'locked',
    index: 20,
    draw: extensions.locked
  },
  {
    id: 'icon',
    index: 100,
    draw (baton) {
      const column = $('<div class="list-item-column column-s">')
      extensions.fileTypeIcon.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'name',
    index: 200,
    draw (baton) {
      const file = baton.model.getFileStats()
      const shareStates = baton.model.getShareStates()
      this.append(
        $('<div class="list-item-column column-grow-1 flex-row column-mw-120">').append(
          $('<div class="filename truncate">').attr('title', file.summary).text(file.name),
          $('<div class="extension">').text(file.extension),
          file.isLocked ? $('<div class="locked ms-8">').text('(' + gt('Locked') + ')') : $(),
          $('<div class="icons">').append(
            baton.model.isEncrypted()
              ? $('<span>').append(createIcon('bi/lock-fill.svg')).attr('title', gt('Encrypted')).addClass('bi-13 ms-8 encrypted')
              : $(),
            shareStates.internal || shareStates.guest
              // #. label for a file or folder that is shared with other users or guests
              ? $('<span>').append(createIcon(shareStates.guest ? 'bi/person-plus-fill.svg' : 'bi/person-fill.svg'))
                .attr('title',
                  shareStates.internal && shareStates.guest
                    ? gt('Shared with internal and guest users')
                    : shareStates.guest ? gt('Shared with guest users') : gt('Shared with internal users'))
                .addClass('bi-13 ms-8 gray')
              : $(),
            shareStates.anon
              // #. label for a file or folder that is shared with other users or guests
              ? $('<span>').append(createIcon('bi/link.svg')).attr('title', gt('Shared by public link')).addClass('bi-13 ms-8 public-link')
              : $(),
            // we show stars this even in the favorite folder
            // yes, superfluous but looks better / unexpectedly empty otherwise
            baton.model.isFavorite()
              ? $('<span>').append(createIcon('bi/star-fill.svg')).attr('title', gt('Marked as favorite')).addClass('bi-13 ms-8 favorite')
              : $()
          )
        )
      )
    }
  },
  {
    id: 'mail-attachment-from',
    index: 210,
    draw (baton) {
      if (_.device('smartphone')) return
      if (!isAttachmentView(baton)) return
      const column = $('<div class="list-item-column column-mw-30p">')
      extensions.mailFrom.call(column, baton)
      this.addClass('attachment-view').append(column)
    }
  },
  {
    id: 'mail-attachment-subject',
    index: 220,
    draw (baton) {
      if (_.device('smartphone')) return
      if (!isAttachmentView(baton)) return
      const column = $('<div class="list-item-column column-mw-30p">')
      extensions.mailSubject.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'folder',
    index: 300,
    draw (baton) {
      if (_.device('smartphone')) return
      const isVirtualFolder = /^virtual\//.test(baton.app.folder.get())
      if (!isVirtualFolder) return
      // virtual/favorites/infostore
      // virtual/files/recent
      // virtual/files/shares
      const folderId = baton.model.get('folder_id')
      this.append(
        $('<div class="list-item-column column-xl gray truncate ms-16">').append(
          folderAPI.getTextNode(folderId)
        )
      )
    }
  },
  {
    id: 'date',
    index: 300,
    draw (baton) {
      if (_.device('smartphone')) return
      if (isAttachmentView(baton) && baton.app.props.get('sort') !== 5) return
      const column = $('<div class="list-item-column column-xl text-right gray">')
      extensions.smartdate.call(column, baton)
      this.append(column)
    }
  },
  {
    id: 'size',
    index: 500,
    draw (baton) {
      if (_.device('smartphone')) return
      if (_.device('tablet') && /^virtual\//.test(baton.app.folder.get())) return
      if (isAttachmentView(baton) && baton.app.props.get('sort') !== 704) return
      const column = $('<div class="list-item-column column-xl text-right gray">')
      extensions.size.call(column, baton)
      this.append(column)
    }
  }
)

// icon layout

ext.point(ITEM + '/icon').extend(
  {
    id: 'file-type',
    index: 10,
    draw: extensions.fileTypeClass
  },
  {
    id: 'thumbnail',
    index: 100,
    draw () {
      extensions.thumbnail.apply(this, arguments)
    }
  },
  {
    id: 'locked',
    index: 200,
    draw: extensions.locked
  },
  {
    id: 'file-icon-and-name',
    index: 300,
    draw (baton) {
      const file = baton.model.getFileStats()
      const $icon = $('<div class="filename-file-icon me-8">')
      extensions.fileTypeIcon.call($icon, baton)

      // tooltip on content
      if (!baton.model.isFolder()) {
        this.find('.icon-thumbnail').attr('title', file.summary)
      }

      this.append(
        $('<div class="flex-row p-8 width-100 items-center">').append(
          $icon,
          $('<div class="filename flex-grow truncate">')
            .attr('title', file.summary)
            .append($('<span>').text(file.name), $('<span class="opacity-60">').text(file.extension)),
          baton.app.folder.get() !== 'virtual/favorites/infostore' && baton.model.isFavorite()
            ? createIcon('bi/star-fill.svg').attr('title', gt('Marked as favorite')).addClass('bi-13 ms-4 favorite')
            : $()
        )
      )
    }
  }
)

// tile layout

ext.point(ITEM + '/tile').extend(
  {
    id: 'file-type',
    index: 10,
    draw: extensions.fileTypeClass
  },
  {
    id: 'thumbnail',
    index: 100,
    draw () {
      extensions.thumbnail.apply(this, arguments)
    }
  },
  {
    id: 'locked',
    index: 200,
    draw: extensions.locked
  },
  {
    id: 'file-icon-and-name',
    index: 300,
    draw (baton) {
      const file = baton.model.getFileStats()
      // file
      if (!baton.model.isFolder()) {
        // tooltip on content
        this.find('.icon-thumbnail').attr('title', file.summary)
        return
      }
      // folder
      const $icon = $('<div class="filename-file-icon me-8">')
      extensions.fileTypeIcon.call($icon, baton)
      this.append(
        $('<div class="flex-row p-8 width-100 items-center">').append(
          $icon,
          $('<div class="filename flex-grow truncate">')
            .attr('title', file.summary)
            .text(file.name),
          baton.app.folder.get() !== 'virtual/favorites/infostore' && baton.model.isFavorite()
            ? createIcon('bi/star-fill.svg').attr('title', gt('Marked as favorite')).addClass('bi-13 ms-4 favorite')
            : $()
        )
      )
    }
  }
)

export default FileListView
