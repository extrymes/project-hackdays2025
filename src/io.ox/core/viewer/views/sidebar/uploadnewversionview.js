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
import DisposableView from '@/io.ox/backbone/views/disposable'
import filesAPI from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import * as util from '@/io.ox/files/util'
import ext from '@/io.ox/core/extensions'
import userAPI from '@/io.ox/core/api/user'
import fileUpload from '@/io.ox/files/upload/main'

import gt from 'gettext'
/**
 * The UploadNewVersionView is intended as a sub view of the SidebarView and
 * is responsible for uploading a new file version.
 * It triggers the system file selection dialog and opens the version comment dialog.
 */
const UploadNewVersionView = DisposableView.extend({

  className: 'viewer-uploadnewversion',

  events: {
    'change input[type="file"]': 'onFileSelected'
  },

  /**
   * Handle file input change events.
   * Gets the file object, opens a version comment dialog and uploads
   * the file as new version.
   */
  onFileSelected (event) {
    event.preventDefault()
    if (!(folderAPI.pool.getModel(this.model.get('folder_id')).supports('extended_metadata'))) return this.upload()

    const self = this

    new ModalDialog({ title: gt('Version Comment') })
      .addCancelButton()
      .addButton({ label: gt('Upload'), action: 'upload' })
      .build(function () {
        this.$body.append(
          $('<textarea rows="6" class="form-control comment">')
        )
      })
      .on('upload', function () {
        const comment = this.$body.find('textarea.comment').val() || ''
        // upload file
        self.upload(comment)
      })
      .on('cancel', function () {
        // reset file input
        _.first(self.$('input[type="file"]')).value = ''
      })
      .open()
  },

  getFile () {
    return _.first(this.$('input[type="file"]')[0].files)
  },

  upload (comment) {
    const newFile = this.getFile()
    const data = {
      folder: this.model.get('folder_id'),
      id: this.model.get('id'),
      // If file already encrypted, update should also be encrypted
      params: filesAPI.versions.mustEncryptNewVersion(this.model, newFile.name) ? { cryptoAction: 'Encrypt' } : {},
      newVersion: true
    }
    const node = this.app ? this.app.getWindowNode() : this.$el.closest('.io-ox-viewer').find('.viewer-displayer')

    if (folderAPI.pool.getModel(this.model.get('folder_id')).supports('extended_metadata')) data.version_comment = comment || ''

    fileUpload.setWindowNode(node)
    fileUpload.offer(newFile, data)
  },

  initialize (options) {
    options = options || {}
    if (!this.model || !this.model.isFile()) {
      this.$el.hide()
    }
    this.app = options.app
  },

  render () {
    if (!this.model || !this.model.isFile()) return this
    const self = this

    // check if the user has permission to upload new versions
    $.when(folderAPI.get(this.model.get('folder_id')), userAPI.get()).done(function (folderData, userData) {
      if (this.disposed) return
      if (util.hasStatus('lockedByOthers', { context: this.model.attributes })) return
      if (!folderAPI.can('add:version', folderData)) return

      // try to find available permissions
      if (!folderAPI.can('write', folderData)) {
        const array = self.model.get('object_permissions') || self.model.get('com.openexchange.share.extendedObjectPermissions') || []
        let myself = _(array).findWhere({ entity: ox.user_id })
        // check if there is a permission for a group, the user is a member of
        // use max permissions available
        if ((!myself || (myself && myself.bits < 2)) && _(array).findWhere({ group: true })) {
          myself = _(array).findWhere({ entity: _(_.pluck(array, 'entity')).intersection(userData.groups)[0] })
        }
        if (!(myself && (myself.bits >= 2))) return
      }

      // add file upload widget
      const $el = this.$el
      import('@/io.ox/core/tk/attachments').then(function ({ default: attachments }) {
        $el.append(
          attachments.fileUploadWidget({
            multi: false,
            buttontext: gt('Upload new version')
          })
        )
        // Extension point required for Guard implementation
        ext.point('io.ox/core/viewer/views/sidebarview/uploadnewversion').invoke('draw', this)
      }.bind(this))
    }.bind(this))
    return this
  },

  onDispose () {
    if (this.model) this.model = null
  }

})

export default UploadNewVersionView
