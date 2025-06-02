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

import api from '@/io.ox/files/api'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'
import tabAPI from '@/io.ox/core/api/tab'
import '@/io.ox/files/actions'

import gt from 'gettext'

const NAME = 'io.ox/files/detail'
const MODEL_CHANGE_EVENTS_FOR_TAB_PROPAGATION = 'change:cid change:filename change:title change:com.openexchange.file.sanitizedFilename change:file_size change:last_modified change:description change:folder_id change:object_permissions change:permissions change:current_version change:number_of_versions change:version'
const MODEL_CHANGE_EVENTS_FOR_RENAME = 'change:com.openexchange.file.sanitizedFilename change:filename change:title'

ox.ui.App.mediator(NAME, {
  'show-file' (app) {
    let fileModel = null

    function fileRenameHandler (model) {
      app.setTitle(model.getDisplayName())
    }

    function fileChangeHandler (model) {
      tabAPI.propagate('refresh-file', _.pick(model.toJSON(), 'folder_id', 'id'))
    }

    function showModel (data) {
      const title = data['com.openexchange.file.sanitizedFilename'] || data.filename || data.title

      fileModel = api.pool.get('detail').get(_.cid(data)) || null

      // alternate file version
      if (fileModel && data.override_file_version) {
        const versionData = _.find(fileModel.get('versions'), function (item) {
          return item.version === data.override_file_version
        })

        fileModel = (versionData) ? new api.Model(versionData) : fileModel
      }

      import('@/io.ox/core/viewer/main').then(function ({ default: Viewer }) {
        const launchParams = {
          files: [fileModel || data],
          app,
          container: app.getWindowNode(),
          standalone: true,
          opt: { disableFolderInfo: !fileModel }
        }
        const viewer = new Viewer()
        viewer.launch(launchParams)
      })

      app.setTitle(title)

      if (fileModel) {
        app.listenTo(fileModel, MODEL_CHANGE_EVENTS_FOR_RENAME, fileRenameHandler)

        app.on('quit', function () {
          app.stopListening(fileModel, MODEL_CHANGE_EVENTS_FOR_RENAME, fileRenameHandler)
        })

        api.once('delete:' + _.ecid(data), function () {
          app.quit()
        })
      }

      // propagate file changes to all browser tabs
      if (ox.tabHandlingEnabled && fileModel) {
        app.listenTo(fileModel, MODEL_CHANGE_EVENTS_FOR_TAB_PROPAGATION, fileChangeHandler)

        app.on('quit', function () {
          app.stopListening(fileModel, MODEL_CHANGE_EVENTS_FOR_TAB_PROPAGATION, fileChangeHandler)
        })
      }
    }

    app.showFile = function (file) {
      app.getWindowNode().addClass('detail-view-app').append(
        $('<div class="f6-target detail-view-container" tabindex="-1" role="complementary">').attr('aria-label', gt('File Details'))
      )

      if (file.file) return showModel(file.file)

      // load file and folder data, e.g. needed if popout viewer is launched in a new browser tab
      folderAPI.get(file.folder_id || file.folder).then(function () {
        return api.get(file)
      }).then(function (modelData) {
        // current model
        if (!file.version) { return modelData }

        // alternate model
        modelData.override_file_version = file.version
        return api.versions.load(modelData, { cache: false }).then(function () { return modelData })
      }).then(showModel, app.showErrorAndCloseApp)
    }
  },
  'manage-url' (app) {
    const win = app.getWindow()
    let state

    win.on('show', function () {
      app.setState(state)
    })
    win.on('hide', function () {
      app.setState({ attachment: null })
    })

    app.setUrlParameter = function (obj) {
      state = obj
      app.setState(obj)
    }
  },
  'handle-api-file-change' () {
    // listen to events that affect the filename, version and generic changes
    api.on('rename add:version remove:version change:version change:permissions', _.debounce(function (file) {
      api.get(_.cid(file), { cache: false })
    }, 100))

    api.on('share:link:remove share:link:new', _.debounce(function (shareModel) {
      // only files can be viewed in the pop-out viewer, folder can be ignored
      const fileModel = shareModel.get('files')[0]
      if (fileModel.isFolder()) return
      api.get(_.cid(fileModel.get('cid')), { cache: false })
    }, 100))
  },
  'error-handler' (app) {
    app.showErrorAndCloseApp = function (error) {
      yell(error)
      app.close()
    }
  }
})

// multi instance pattern
function createInstance () {
  // application object
  const app = ox.ui.createApp({
    closable: true,
    name: NAME,
    title: ''
  })

  // launcher
  return app.setLauncher(function (options) {
    const win = ox.ui.createWindow({
      chromeless: true,
      name: NAME,
      toolbar: false
    })

    // necessary when plugging Spreadsheet into the Viewer, otherwise the Drive side bar would be visible
    win.nodes.outer.css('z-index', 2)

    app.setWindow(win)
    app.mediate()
    win.show()

    // handle mail attachments
    if (options.file) {
      const mail = options.file.mail
      if (mail) {
        // generic mail attachment
        app.setUrlParameter({ folder: mail.folder_id, id: mail.id, attachment: options.file.id })
      } else {
        // sharing mail attachment
        app.setUrlParameter({ folder: options.file.folder_id, id: options.file.id })
      }
      return app.showFile(options)
    }

    // deep-link and 'open in new browser tab'
    const obj = _.clone(app.getState())

    if (obj.space && obj.attachment) {
      // mail compose attachment
      import('@/io.ox/mail/compose/api').then(function ({ default: composeAPI }) {
        return composeAPI.space.get(obj.space)
      }).then(function (data) {
        const attachment = _.extend({ space: obj.space }, _.find(data.attachments, function (attachment) {
          return attachment.id === obj.attachment
        }))

        return app.showFile({ file: attachment })
      }, app.showErrorAndCloseApp)
    } else if (obj.module && obj.id && obj.folder && obj.attachment) {
      // pim attachment
      import('@/io.ox/core/api/attachment').then(function ({ default: attachmentAPI }) {
        return attachmentAPI.getAll({
          folder_id: obj.folder,
          id: obj.id,
          module: obj.module

        }).then(function (attachments) {
          const attachmentId = parseInt(obj.attachment, 10)
          const attachment = _.find(attachments, function (attachment) {
            return attachment.id === attachmentId
          })

          app.showFile({ file: attachment })
        }, app.showErrorAndCloseApp)
      })
    } else if (obj.id && obj.folder && obj.attachment) {
      // mail attachment

      Promise.all([import('@/io.ox/mail/api'), import('@/io.ox/mail/util')]).then(([{ default: mailAPI }, mailUtil]) => {
        const mailOptions = { folder: obj.folder, id: obj.id }
        if (obj.decrypt && obj.cryptoAuth) { // Must decrypt Guard email again if checking attachments
          _.extend(mailOptions, {
            decrypt: true,
            cryptoAuth: obj.cryptoAuth
          })
        }
        return mailAPI.get(mailOptions).then(function success (mail) {
          const attachments = mailUtil.getAttachments(mail)
          const attachment = _.find(attachments, function (attachment) {
            return attachment.id === obj.attachment
          })
          if (obj.decrypt) { // Add decryption info to attachment for file viewer
            _.extend(attachment, {
              security: {
                decrypted: true,
                authentication: obj.cryptoAuth
              }
            })
          }
          app.showFile({ file: attachment })
        }, app.showErrorAndCloseApp)
      })
    } else if (obj.id && obj.folder) {
      // file
      app.showFile(obj)
    } else if (options.id && options.folder) {
      app.setUrlParameter(_.pick(options, 'id', 'folder'))
      app.showFile({ id: options.id, folder_id: options.folder })
    } else if (options.cid) {
      const versionObj = {}
      if (!options.get('current_version')) {
        versionObj.version = options.get('version')
      }
      app.setUrlParameter(_.extend(versionObj, _.pick(_.cid(options.cid), 'id', 'folder')))
      app.showFile(_.extend(versionObj, _.cid(options.cid)))
    }
  })
}

export default {
  getApp: createInstance
}
