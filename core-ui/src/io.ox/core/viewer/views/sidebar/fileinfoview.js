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

// cSpell:ignore Gespeichert, unter

import $ from '@/jquery'
import _ from '@/underscore'
import moment from '@open-xchange/moment'
import ox from '@/ox'
import PanelBaseView from '@/io.ox/core/viewer/views/sidebar/panelbaseview'
import Ext from '@/io.ox/core/extensions'
import FilesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import UserAPI from '@/io.ox/core/api/user'
import * as util from '@/io.ox/core/util'
import * as mailUtil from '@/io.ox/mail/util'
import ViewerUtil from '@/io.ox/core/viewer/util'
import CopyToClipboardView from '@/io.ox/backbone/mini-views/copy-to-clipboard'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

function setFolder (e) {
  // launch files and set/change folder
  e.preventDefault()
  const id = e.data.id
  ox.launch(() => import('@/io.ox/files/main'), { folder: id }).then(function (app) {
    app.folder.set(id)
  })
}

function createCopyLinkButton (model, options) {
  const disableLink = options.disableLink || false
  // fix for 53324, 58378, 58894
  if (!model.isDriveItem()) return
  // fix for 56070
  if (disableLink) return
  // missing support
  const folderModel = folderAPI.pool.getModel(model.get('folder_id'))
  if (!folderModel.supports('permissions')) return

  const link = util.getDeepLink('io.ox/files', model.isFile() ? model.pick('folder_id', 'id') : model.pick('id'))

  const copyLinkButton = new CopyToClipboardView({
    className: 'btn btn-toolbar copy-link',
    content: link,
    label: gt('Private link: Only people who have access to the file/folder can use it. Use it to point to members of your organization to this file/folder.'),
    optionalIcon: 'bi/link-45deg.svg',
    events: {
      click (e) {
        e.stopPropagation()
        navigator.clipboard.writeText(link)
        this.$el.tooltip('hide')
        yell({ type: 'success', message: gt('The link has been copied to the clipboard.') })
      }
    }
  })

  return copyLinkButton.render().$el
}

function createDateString (date) {
  const isToday = moment().isSame(moment(date), 'day')
  const dateString = date ? moment(date).format(isToday ? 'LT' : 'l LT') : '-'

  return dateString
}

Ext.point('io.ox/core/viewer/sidebar/fileinfo').extend({
  index: 100,
  id: 'fileinfo',
  draw (baton) {
    if (!baton.model) return

    const model = baton.model
    const options = baton.options || {}
    const dateString = createDateString(model.get('last_modified'))
    const folderId = model.get('folder_id')
    const dl = $('<dl>')
    const isAttachmentView = !_.isEmpty(model.get('com.openexchange.file.storage.mail.mailMetadata'))

    if (model.isSharedFederatedSync()) {
      dl.append(
        // #. label for the server location, showing the hostname of a federsted share in Drive, in german probably 'Standort'
        $('<dt>').text(gt('Location')),
        $('<dd class="host-name">').text(model.getAccountDisplayNameSync())
      )
    }

    dl.append(
      // size
      $('<dt>').text(gt('Size')),
      $('<dd class="size">').text(ViewerUtil.renderItemSize(model))
    )
    if (!isAttachmentView) {
      // folder info block
      if (!options.disableFolderInfo) {
        dl.append(
          // path; using "Folder" instead of "Save in" because that one
          // might get quite long, e.g. in german "Gespeichert unter"
          $('<dt>').text(gt('Folder')),
          $('<dd class="saved-in">').append(
            $('<a>')
              .attr('href', folderAPI.getDeepLink({ module: 'infostore', id: folderId }))
              .append(folderAPI.getTextNode(folderId))
              .on('click', { id: folderId }, setFolder)
          )
        )
      }

      dl.append(
        // modified
        $('<dt>').text(gt('Modified')),
        $('<dd class="modified">').append(
          $('<span class="modifiedAt">').text(dateString),
          $('<span class="modifiedBy">').append(document.createTextNode('\u200B')).append(UserAPI.getTextNodeExtended(model.attributes, 'modified'))
        )
      )

      if (model.isSharedFederatedSync() && model.getAccountError()) {
        const errorString = model.getAccountError().error || ''
        dl.append(
          $('<dt>').text(gt('Error')),
          $('<dd class="host-name">').text(errorString)
        )
      }
    } else {
      // All Attachment View
      const mail = model.get('com.openexchange.file.storage.mail.mailMetadata')
      const attachmentView = settings.get('folder/mailattachments', {})
      dl.append(
        $('<dt>').text(gt('Folder')),
        $('<dd class="mail-folder">').append(
          $('<a>')
            .attr('href', folderAPI.getDeepLink({ module: 'mail', id: mail.folder }))
            .append(folderAPI.getTextNode(mail.folder))
            .on('click', function (e) {
              e.preventDefault()
              ox.launch(() => import('@/io.ox/mail/main'), { folder: mail.folder })
            })
        ),
        $('<dt>').text(gt('Subject')),
        $('<dd class="subject">').append(
          $.txt(mailUtil.getSubject(mail.subject || ''))
        ),
        $('<dt>').text(folderId === attachmentView.sent ? gt('To') : gt('From')),
        $('<dd class="from">').append(
          $.txt(mailUtil.getDisplayName(folderId === attachmentView.sent ? mail.to[0] : mail.from[0]))
        ),
        $('<dt>').text(folderId === attachmentView.sent ? gt('Sent') : gt('Received')),
        $('<dd class="received">').append(
          $.txt(dateString)
        ),
        $('<dt>'),
        $('<dd class="link">').append(
          $('<a data-detail-popup="mail">')
            .attr('data-cid', _.cid(mail))
            .attr('href', folderAPI.getDeepLink({ module: 'mail', id: mail.folder }))
            .text(gt('View message'))
        )
      )
    }

    this.find('.sidebar-panel-body').empty().append(dl)
  }
})

// only changed by user interaction
let lastState = true

/**
 * The FileInfoView is intended as a sub view of the SidebarView and
 * is responsible for displaying the general file details.
 */
const FileInfoView = PanelBaseView.extend({

  className: 'viewer-fileinfo',

  initialize (options) {
    PanelBaseView.prototype.initialize.apply(this, arguments)
    this.options = options || {}
    this.closable = !!this.options.closable
    // #. File and folder details
    this.setPanelHeader(gt('General'))
    this.$('.sidebar-panel-title').append(createCopyLinkButton(this.model, this.options))
    this.togglePanel(lastState)
    this.on('toggle-by-user', state => { lastState = state })
    // attach event handlers
    this.listenTo(this.model, 'change:cid change:filename change:title change:com.openexchange.file.sanitizedFilename change:file_size change:last_modified change:folder_id change:object_permissions change:permissions', this.render)
    // listen to version display events
    this.listenTo(this.viewerEvents, 'viewer:display:version', this.onDisplayTempVersion.bind(this))
  },

  render () {
    if (!this.model) return this
    const data = this.model.isFile() ? this.model.toJSON() : this.model.get('origData')
    const baton = Ext.Baton({ model: this.model, data, options: this.options })
    Ext.point('io.ox/core/viewer/sidebar/fileinfo').invoke('draw', this.$el, baton)
    return this
  },

  /**
   * Handles display temporary file version events.
   *
   * @param {object} versionData The JSON representation of the version.
   */
  onDisplayTempVersion (versionData) {
    if (!versionData) { return }

    this.model = new FilesAPI.Model(versionData)
    this.render()
  },

  onDispose () {
    if (this.model) this.model = null
  }

})

export default FileInfoView
