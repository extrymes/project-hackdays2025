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

import folderAPI from '@/io.ox/core/folder/api'
import api from '@/io.ox/files/api'
import shareAPI from '@/io.ox/files/share/api'
import * as util from '@/io.ox/files/util'
import * as folderUtil from '@/io.ox/core/folder/util'
import filestorageApi from '@/io.ox/core/api/filestorage'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import capabilities from '@/io.ox/core/capabilities'
import download from '@/io.ox/files/actions/download'
import pUtil from '@/io.ox/files/permission-util'
import yell from '@/io.ox/core/yell'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/files/settings'
import registry from '@/io.ox/core/main/registry'
import { addReadyListener } from '@/io.ox/core/events'
import gt from 'gettext'

const supportsComments = settings.get('features/comments', true)
// used by text editor
const allowedFileExtensions = ['csv', 'txt', 'js', 'css', 'md', 'tmpl', 'html']

const moveConflictErrorCodes = [/* move to not shared folder */'FILE_STORAGE-0074', 'FILE_STORAGE-0077', 'FLD-1045', 'FLD-1048'/* , move to another shared folder 'FILE_STORAGE-0075', 'FLD-1046', 'FLD-1049' */]

addReadyListener('capabilities:user', (capabilities) => {
  if (!capabilities.has('guard')) return
  allowedFileExtensions.push('pgp')
})

export function isTrash (baton) {
  let folderId
  if (baton.app) {
    folderId = baton.app.folder.get()
  } else if (baton.folder_id !== undefined) {
    folderId = baton.folder_id
  } else if (baton.data) {
    folderId = baton.data.folder_id
  }
  const model = folderAPI.pool.getModel(folderId)
  return model ? folderAPI.is('trash', model.toJSON()) : false
}

function isVirtual (id) {
  return /^virtual\//.test(id)
}

function fromMailCompose (baton) {
  return baton.openedBy === 'io.ox/mail/compose'
}

function noVersionDeleteSupport (data) {
  return /^(owncloud|webdav|nextcloud)$/.test(data.folder_id.split(':')[0])
}

function isEmpty (baton) {
  return _.isEmpty(baton.data)
}

function hasStatus (type, baton) {
  return util.hasStatus(type, baton.array())
}

// check if it's not a 'description only' item
function isFile (data) {
  return !_.isEmpty(data.filename) || data.file_size > 0
}

function isDriveFile (data) {
  // locally added but not yet uploaded, 'description only' items
  if (data.group === 'localFile') return false
  return isFile(data)
}

function createFilePickerAndUpload (baton, type) {
  let input = $()

  // notify when type is not provided
  if (!type && ox.debug) { return console.error('No type for upload provided') }
  if (type === 'folder') { input = $('<input type="file" name="file" multiple directory webkitdirectory mozdirectory>') }
  if (type === 'file') { input = $('<input type="file" name="file" multiple>') }
  if (_.isArray(baton.acceptExt)) {
    const acceptFileTypes = baton.acceptExt.map(ext => ext.startsWith('.') ? ext : `.${ext}`).join(',')
    input.attr('accept', acceptFileTypes)
  }
  const elem = $(baton.e.target)

  // remove old input-tags resulting from 'add local file' -> 'cancel'
  elem.siblings('input').remove()

  elem.after(
    input
      .css('display', 'none')
      .on('change', function (e) {
        const app = baton.app
        const fileList = baton.filter ? baton.filter(e.target.files) : e.target.files
        const extendedFileList = _.map(fileList, function (file) {
          // normalize with drag&drop: for a file upload, the filepicker does not provide a path,
          // in contrast to the more modern drag & drop behavior were a path is always provided
          const normalizedPath = file.webkitRelativePath || String('/' + file.name)
          return {
            file,
            fullPath: normalizedPath,
            preventFileUpload: false
          }
        })

        import('@/io.ox/files/upload/file-folder').then(({ default: fileFolderUpload }) => {
          const targetFolder = baton.folder_id
          const options = baton.file_options
          fileFolderUpload.upload(extendedFileList, targetFolder, app, options)
        })
        input.remove()
      })
  )

  input.trigger('click')
}

const Action = actionsUtil.Action

Action('io.ox/files/actions/upload', {
  folder: 'create',
  matches (baton) {
    // hide for virtual folders (other files root, public files root)
    if (_(['14', '15']).contains(baton.folder_id)) return false
    if (isTrash(baton)) return false
    return true
  },
  action (baton) {
    createFilePickerAndUpload(baton, 'file')
  }
})

Action('io.ox/files/actions/uploadFolder', {
  folder: 'create',
  device: '!(ios || android)',
  matches (baton) {
    // hide for virtual folders (other files root, public files root)
    if (_(['14', '15']).contains(baton.folder_id)) return false
    if (isTrash(baton)) return false
    return true
  },
  action (baton) {
    createFilePickerAndUpload(baton, 'folder')
  }
})

Action('io.ox/files/actions/edit-federated', {
  collection: 'one && modify',
  matches (baton) {
    const model = baton.models[0]
    return util.canEditDocFederated(model)
  },
  action (baton) {
    const guestLink = shareAPI.getFederatedSharingRedirectUrl(baton.first())
    window.open(guestLink, '_blank', 'noopener, noreferrer')
  }
})

Action('io.ox/files/actions/editor', {
  toggle: !!window.Blob,
  collection: 'one && modify',
  matches (baton) {
    if (isTrash(baton)) return false
    if (fromMailCompose(baton)) return false
    if (hasStatus('lockedByOthers', baton)) return false

    const file = baton.first()
    if (!file.folder_id || !file.id) return false

    const model = _.first(baton.models)
    const isEncrypted = model && model.isEncrypted()
    const encryptionPart = isEncrypted ? '\\.pgp' : ''
    // the pgp extension is added separately to the regex, remove it from the file extension list
    const fileExtensions = _.without(allowedFileExtensions, 'pgp')
    // build regex from list, pgp is added if guard is available
    const regex = new RegExp('\\.(' + fileExtensions.join('|') + '?)' + encryptionPart + '$', 'i')

    if (!regex.test(file.filename)) return false

    return api.versions.getCurrentState(file).then(function (currentVersion) {
      return currentVersion
    })
  },
  action (baton) {
    const data = baton.first()

    // if this was opened from the viewer and not from the pop out standalone viewer, close it now
    function closeViewer () {
      if (baton.context && baton.context.viewerEvents && !baton.context.standalone) {
        baton.context.viewerEvents.trigger('viewer:close')
      }
    }

    const launch = function (params) {
      if (ox.ui.App.reuse('io.ox/editor:edit.' + _.cid(data))) {
        closeViewer()
        return
      }
      ox.launch(() => import('@/io.ox/editor/main'), { folder: data.folder_id, id: data.id, params: _.extend({ allowedFileExtensions }, params) }).then(function () {
        closeViewer()
      })
    }

    // Check if Guard file.  If so, do auth then call with parameters
    // do not use endsWith because of IE11
    if (capabilities.has('guard') && ((data.meta && data.meta.Encrypted) || data.filename.toLowerCase().lastIndexOf('.pgp') === data.filename.length - 4)) {
      import('@/io.ox/guard/auth/authorizer').then(function ({ default: guardAuth }) {
        guardAuth.authorize().then(function (auth) {
          const params = {
            cryptoAction: 'Decrypt',
            cryptoAuth: auth,
            session: ox.session
          }
          launch(params)
        })
      })
      return
    }

    launch()
  }
})

Action('io.ox/files/actions/editor-new', {
  toggle: !!window.Blob,
  folder: 'create',
  async matches (baton) {
    const folder = await folderAPI.get(baton.folder_id)
    if (!folderUtil.can('read', folder)) return false
    // hide for virtual folders (other files root, public files root)
    if (_(['14', '15']).contains(baton.folder_id)) return false
    if (isTrash(baton)) return false
    // no new files in mail attachments
    if (fromMailCompose(baton)) return false
    return true
  },
  action (baton) {
    ox.launch(() => import('@/io.ox/editor/main')).then(function (app) {
      app.create({ folder: baton.app.folder.get(), params: { allowedFileExtensions } })
    })
  }
})

Action('io.ox/files/actions/download', {
  // no download for older ios devices
  device: '!ios || ios >= 12',
  collection: 'some',
  matches (baton) {
    if (baton.collection.has('multiple')) return baton.array().every(isDriveFile)
    if (util.isContact(baton)) return false
    return isDriveFile(baton.first())
  },
  action (baton) {
    download(baton.array().map(function (fileDescriptor) {
      const newElem = _.clone(fileDescriptor)
      newElem.version = undefined
      return newElem
    }))
  }
})

Action('io.ox/files/actions/download-folder', {
  // no download for older ios devices
  device: '!ios || ios >= 12',
  // single folders only
  collection: 'one && folders',
  async matches (baton) {
    await filestorageApi.rampup()
    // enable for federated share that support it
    if (filestorageApi.isFederatedAccount(baton.first().account_id)) {
      const canDownloadFolder = _.contains(baton.first().supported_capabilities, 'zippable_folder')
      return canDownloadFolder
    }
    // disable for external storages
    if (filestorageApi.isExternal(baton.first())) return false

    // disable for virtual folders
    if (isVirtual(baton.first().id)) return

    // user needs at least read permissions (user folders created by shares are not downloadable for example)
    // system folders cannot be downloaded (although they sometimes have the zippable_folder capability)
    return folderAPI.can('read', baton.first()) && !folderAPI.is('system', baton.first())
  },
  action (baton) {
    import('@/io.ox/files/api').then(function ({ default: api }) {
      api.zip(baton.first().id)
    })
  }
})

Action('io.ox/files/actions/downloadversion', {
  // no download for older ios devices
  device: '!ios || ios >= 12',
  matches (baton) {
    if (baton.collection.has('multiple')) return true
    // 'description only' items
    return isFile(baton.first())
  },
  action (baton) {
    // loop over list, get full file object and trigger downloads
    import('@/io.ox/core/download').then(function ({ default: download }) {
      _(baton.array()).each(function (o) {
        download.file(o)
      })
    })
  }
})

Action('io.ox/files/actions/send', {
  collection: 'some && items',
  matches (baton) {
    if (!capabilities.has('webmail')) return false
    if (isEmpty(baton)) return false
    if (fromMailCompose(baton)) return false
    if (isTrash(baton)) return false
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false
    return baton.array().reduce(function (memo, obj) {
      return memo || obj.file_size > 0
    }, false)
  },
  action (baton) {
    const list = baton.array().filter(function (obj) { return obj.file_size !== 0 })
    if (list.length === 0) return
    registry.call('io.ox/mail/compose', 'open', {
      attachments: list.map(function (file) {
        return { origin: 'drive', id: file.id, folder_id: file.folder_id, file_size: file.file_size }
      })
    })
  }
})

Action('io.ox/files/actions/delete', {
  collection: 'some && delete',
  matches (baton) {
    if (fromMailCompose(baton)) return false
    if (baton.standalone) return false
    if (hasStatus('lockedByOthers', baton)) return false
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false
    return true
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/delete')).then(function ({ default: action }) {
      const list = baton.array()
      if (!baton.models) {
        api.pool.add(list)
        baton.models = api.pool.resolve(list)
      }
      action(baton.models)
    })
  }
})

Action('io.ox/files/actions/viewer', {
  collection: 'some && items',
  matches (baton) {
    const file = baton.first()
    // don't open a new viewer instance within the viewer
    if (baton.isViewer) { return false }
    // Spreadsheet supports display of current version only
    // versions may not be loaded when the action is not called from versions list, so check current_version for false
    if (file.current_version === false && api.isSpreadsheet(file)) { return false }
    return !baton.collection.has('guard') || capabilities.has('guard')
  },
  action (baton) {
    ox.load(() => import('@/io.ox/core/viewer/main')).then(function ({ default: Viewer }) {
      const viewer = new Viewer(); const selection = baton.array()
      if (selection.length > 1 || !baton.all) {
        // only show selected files - the first one is automatically selected
        // baton.all is not defined when opening from version dropdown
        viewer.launch({ files: selection })
      } else {
        viewer.launch({ selection: _(selection).first(), files: baton.all.models })
      }
    })
  }
})

// drive action for double-click or enter in files
Action('io.ox/files/actions/default', {
  action (baton) {
    const model = baton.models && baton.models[0]
    if (util.canEditDocFederated(model)) {
      actionsUtil.invoke('io.ox/files/actions/edit-federated', baton)
    } else {
      actionsUtil.invoke('io.ox/files/actions/viewer', baton)
    }
  }
})

Action('io.ox/files/actions/lock', {
  capabilities: '!alone',
  device: '!smartphone',
  collection: 'some && modify && items',
  matches (baton) {
    if (isTrash(baton)) return false
    if (fromMailCompose(baton)) return false
    if (isEmpty(baton)) return false
    if (!hasStatus('!locked', baton)) return false
    return lockMatches(baton)
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/lock-unlock')).then(function ({ default: action }) {
      action.lock(baton.array())
    })
  }
})

Action('io.ox/files/actions/unlock', {
  capabilities: '!alone',
  device: '!smartphone',
  collection: 'some && modify && items',
  matches (baton) {
    if (isTrash(baton)) return false
    if (isEmpty(baton)) return false
    if (fromMailCompose(baton)) return false
    if (!hasStatus('locked', baton)) return false
    if (!hasStatus('lockedByMe', baton) && !hasStatus('createdByMe', baton)) return false
    return lockMatches(baton)
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/lock-unlock')).then(function ({ default: action }) {
      action.unlock(baton.array())
    })
  }
})

function lockMatches (baton) {
  const folderId = _.first(baton.models).get('folder_id')
  return folderAPI.get(folderId).then(function (fileModel) {
    return !folderAPI.isExternalFileStorage(fileModel)
  })
}

Action('io.ox/files/actions/rename', {
  collection: 'one',
  matches (baton) {
    if (isTrash(baton)) return false
    if (hasStatus('lockedByOthers', baton)) return false
    if (fromMailCompose(baton)) return false
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false
    // shortcuts
    if (baton.collection.has('folders')) return baton.collection.has('rename:folder')
    if (baton.collection.has('modify')) return true
    // this is async
    return pUtil.hasObjectWritePermissions(baton.first())
  },
  action (baton) {
    const data = baton.first()
    // if this is a folder use the folder rename action
    if (data.folder_id === 'folder') {
      ox.load(() => import('@/io.ox/core/folder/actions/rename')).then(function ({ default: action }) {
        action(data.id)
      })
    } else {
      // files use the file rename action
      ox.load(() => import('@/io.ox/files/actions/rename')).then(function ({ default: action }) {
        action(data)
      })
    }
  }
})

Action('io.ox/files/actions/save-as-pdf', {
  // bug 54493: no "Save as PDF" for anonymous guests (same solution as in bug 42621)
  capabilities: 'document_preview && !guest && !anonymous',
  collection: 'one && items',
  matches (baton) {
    if (isTrash(baton)) return false
    if (baton.originFavorites) return false
    if (fromMailCompose(baton)) return false
    const model = baton.models[0]
    // preferred variant over >> return (model.isFile() && !model.isPDF()); <<
    return model.isFile() && (model.isOffice() || model.isText())
  },
  action (baton) {
    // files use the file rename action
    ox.load(() => import('@/io.ox/files/actions/save-as-pdf')).then(function ({ default: action }) {
      action(baton)
    })
  }
})

Action('io.ox/files/actions/edit-description', {
  collection: 'one && items',
  matches (baton) {
    if (isTrash(baton)) return false
    if (fromMailCompose(baton)) return false
    if (hasStatus('lockedByOthers', baton)) return false
    if (!folderAPI.pool.getModel(baton.first().folder_id).supports('extended_metadata')) return false
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false
    if (baton.collection.has('modify')) return true
    return pUtil.hasObjectWritePermissions(baton.first())
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/edit-description')).then(function ({ default: action }) {
      // initially the description in not in the reduced data in the pool that is used here, get the fileModel
      api.get(baton.first()).done(function (fileModel) {
        action(fileModel)
      })
    })
  }
})

Action('io.ox/files/actions/upload-new-version', {
  toggle: supportsComments,
  collection: 'one && modify && items',
  matches (baton) {
    if (fromMailCompose(baton)) return false
    if (hasStatus('lockedByOthers', baton)) return false
    const data = baton.first()
    const model = folderAPI.pool.getModel(data.folder_id)
    return model && model.can('add:version')
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/upload-new-version')).then(function ({ default: action }) {
      action(baton.first())
    })
  }
})

// Action to restore a list of files and folders
Action('io.ox/files/actions/restore', {
  collection: 'some',
  matches (baton) {
    if (isEmpty(baton)) return false
    const trashFolderId = String(settings.get('folder/trash'))
    return baton.array().every(function (element) {
      // folderId where the item is located
      let folderId = element.folder_id
      if ((/^folder\./).test(baton.first().cid)) {
        // the folderId is the id of the parent folder if the item is a folder
        const folderModel = folderAPI.pool.getModel(baton.first().id)
        folderId = folderModel.get('folder_id')
      }
      // is an item is not located in the trash, disable the action
      return trashFolderId === folderId
    })
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/restore')).then(function ({ default: action }) {
      const models = []
      _.each(baton.array(), function (element) {
        const model = new api.Model(element)
        const key = baton.app.listView.getCompositeKey(model)
        // the file model of files and folders
        const convertedModel = api.resolve([key], false)
        if (convertedModel.length) models.push(convertedModel[0])
      })

      action(models)
    })
  }
})

function moveAndCopy (type, label) {
  Action('io.ox/files/actions/' + type, {
    // anonymous guests just have one folder so no valid target folder (see bug 42621)
    capabilities: '!guest && !anonymous',
    // different collection checks for move and copy
    collection: (type === 'move' ? 'some && delete' : 'some && items && read'),
    matches (baton) {
      if (fromMailCompose(baton)) return false
      if (type === 'move' && baton.originFavorites) return false
      if (hasStatus('lockedByOthers', baton)) return false
      return true
    },
    action (baton) {
      ox.load(() => import('@/io.ox/files/actions/move-copy')).then(function ({ default: action }) {
        let success = { single: gt('File has been copied'), multiple: gt('Files have been copied') }
        if (type === 'move') {
          success = { single: gt('File has been moved'), multiple: gt('Files have been moved') }
          const { data } = baton
          const isFolder = Array.isArray(data) ? data.every((item) => item.folder_id === 'folder') : data.folder_id === 'folder'
          if (isFolder) {
            success = { single: gt('Folder has been moved'), multiple: gt('Folders have been moved') }
          }
        }
        const list = baton.array()
        const isSearch = !!baton.app.props.get('searching')
        const options = {
          type,
          fullResponse: true,
          label,
          success,
          // TODO: please avoid multiple levels of if-else-nestings. Use "return early" or underscore's chaining to improve readability.
          successCallback (response, apiInput) {
            // see file/api.js transfer(): in case of an error the callback returns a string
            if (!_.isString(response)) {
              const conflicts = { warnings: [] }
              const itemsLeft = []
              const isMoveAction = type === 'move'
              let moveConflictError = false

              if (!_.isArray(response)) {
                response = [response]
              }
              // find possible conflicts with filestorages and offer a dialog with ignore warnings option see(Bug 39039)
              _.each(response, function (error) {
                // check the error structure to prevent a nested error object
                const errorResponse = _.isString(error.error) ? error : error.error

                if (errorResponse) {
                  const errorCausedByFolder = errorResponse.code === 'FLD-1038'
                  const errorCausedByFile = errorResponse.code.indexOf('FILE_STORAGE') === 0
                  const warningsInErrorResponse = _.isArray(errorResponse.warnings) ? errorResponse.warnings : [errorResponse.warnings]

                  if (errorResponse.categories === 'CONFLICT' && (errorCausedByFile || errorCausedByFolder)) {
                    if (isMoveAction) {
                      // -> populate 'itemsLeft' for folder that will be moved after pressed on ignore conflict
                      if (errorCausedByFolder && !_(itemsLeft).findWhere({ id: errorResponse.error_params[1] })) {
                        itemsLeft.push(_(list).findWhere({ id: errorResponse.error_params[1] }))
                      }

                      // -> populate 'itemsLeft' list for files that will be moved after pressed on ignore conflict
                      // note: when a folder is moved and the conflict happens for files in this folder, don't move these files but only the folder
                      if (!errorCausedByFolder && warningsInErrorResponse) {
                        _.each(warningsInErrorResponse, function (warning) {
                          if (!_(itemsLeft).findWhere({ id: warning.error_params[3] })) {
                            itemsLeft.push(_(list).findWhere({ id: warning.error_params[3] }))
                          }
                        })
                      }

                      // -> populate shown warnings for the dialog
                      if (warningsInErrorResponse) {
                        _.each(warningsInErrorResponse, function (warning) {
                          if (moveConflictErrorCodes.indexOf(warning.code) >= 0) {
                            if (!moveConflictError) {
                              conflicts.title = gt('Change who has access?')
                              conflicts.warnings.push(gt('You are moving one or more items that are shared with other people. These people will lose access.'))
                              moveConflictError = true
                            }
                          } else {
                            if (!conflicts.title) {
                              conflicts.title = errorResponse.error
                            }
                            conflicts.warnings.push(warning.error)
                          }
                        })
                      }
                    } else {
                      // -> populate error title for the dialog
                      if (!conflicts.title) {
                        conflicts.title = errorResponse.error
                      }

                      // -> populate shown warnings for the dialog
                      if (warningsInErrorResponse) {
                        _.each(warningsInErrorResponse, function (warning) {
                          conflicts.warnings.push(warning.error)
                        })
                      }

                      // unfortunately move and copy responses do nt have the same structure
                      if (type === 'copy') {
                        itemsLeft.push(_(list).findWhere({ id: errorResponse.error_params[1] }))
                      }
                    }
                  }
                }
              })

              if (conflicts.title && itemsLeft.length) {
                import('@/io.ox/core/tk/filestorageUtil').then(function ({ default: filestorageUtil }) {
                  filestorageUtil.displayConflicts(conflicts, {
                    callbackIgnoreConflicts () {
                      // if folderpicker is used baton.target is undefined (that's why the folderpicker is needed), use the previous apiInput to get the correct folder
                      api[type](itemsLeft, baton.target || apiInput.target, true)
                        .always(function (response) {
                          // see file/api.js transfer(): in case of an error the callback returns a string
                          // important: only errors must be checked, conflicts can't happen here, since the
                          // ignoreConflicts flag is 'true' at api.move
                          const error = _.isString(response)

                          if (error) {
                            yell('error', response)
                            api.trigger('reload:listview')
                          } else {
                            // no error, must be success
                            yell('success', list.length > 1 ? success.multiple : success.single)
                          }
                        })
                    },
                    callbackCancel () {
                      // note: drag&drop and actions via folder tree menu use a different baton, see b53498
                      const model = new api.Model(baton.first())
                      // you can't use folder_id to get the parent for 'folder' fileModels
                      const folderId = model.getParentFolder()

                      if (folderId) {
                        folderAPI.reload(folderId)
                        // bug 53498: refresh the list to display the not moved elements again after a failed move,
                        // when it's working without this sometimes, it's due to a side effect from pagination
                        api.trigger('reload:listview')
                      }
                    }
                  })
                })
              } else {
                // no error, must be success
                yell('success', list.length > 1 ? success.multiple : success.single)

                // set flag to expire cache for search
                baton.app.listView.model.set({ resetSearch: true })

                // reload listview to display copied/moved files in search results
                if (isSearch) {
                  api.trigger('reload:listview')
                }
              }
            } else {
              yell('error', response)
              // bug 53498: refresh the list to display the not moved elements again after a failed move,
              // when it's working without this sometimes, it's due to a side effect from pagination
              api.trigger('reload:listview')
            }
          }
        }
        action(list, baton, options)
      })
    }
  })
}

moveAndCopy('move', gt('Move'))
moveAndCopy('copy', gt('Copy'))

// folder based actions
Action('io.ox/files/actions/share', {
  collection: '!multiple && (!items || modify)',
  matches (baton) {
    if (baton.app && baton.app.folder.get() === 'virtual/files/shares') {
      return baton.collection.has('one')
    }
    return util.isShareable('invite', baton) || util.isShareable('link', baton)
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/share/permissions')).then(function ({ default: permissions }) {
      const options = { hasLinkSupport: util.isShareable('link', baton) }
      if (baton.models && baton.models.length) {
        // share selected file
        permissions.share(baton.models, options)
      } else {
        // share current folder except in virtual folders
        const id = baton.app.folder.get()
        if (/^virtual\//.test(id)) return
        // convert folder model into file model
        const model = new api.Model(folderAPI.pool.getModel(id).toJSON())
        permissions.share([model], options)
      }
    })
  }
})

// version specific actions
Action('io.ox/files/versions/actions/makeCurrent', {
  collection: 'one && items && modify',
  matches (baton) {
    if (fromMailCompose(baton)) return false
    const data = baton.first()
    if (data.current_version) return false
    return true
  },
  action (baton) {
    api.versions.setCurrent(baton.first())
  }
})

Action('io.ox/files/versions/actions/deletePreviousVersions', {
  collection: 'one && items && modify',
  matches (baton) {
    if (noVersionDeleteSupport(baton.data)) return false
    if (baton.latestVersion) return false
    if (fromMailCompose(baton)) return false
    return true
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/delete-previous-versions')).then(function ({ default: action }) {
      action(baton.first())
    })
  }
})

Action('io.ox/files/versions/actions/delete', {
  collection: 'one && items && delete',
  matches (baton) {
    if (fromMailCompose(baton)) return false
    if (noVersionDeleteSupport(baton.data)) return false
    return true
  },
  action (baton) {
    ox.load(() => import('@/io.ox/files/actions/versions-delete')).then(function ({ default: action }) {
      action(baton.first())
    })
  }
})

// Add new folder
Action('io.ox/files/actions/add-folder', {
  matches (baton) {
    const model = folderAPI.pool.getModel(baton.app.folder.get())
    return folderAPI.can('create:folder', model.toJSON()) && !folderAPI.is('trash', model.toJSON())
  },
  action (baton) {
    const id = baton.app.folder.get(); const model = folderAPI.pool.getModel(id)
    ox.load(() => import('@/io.ox/core/folder/actions/add')).then(function ({ default: add }) {
      add(id, { module: model.get('module') })
    })
  }
})

// Action to switch to the folder of a file
Action('io.ox/files/actions/show-in-folder', {
  device: '!smartphone',
  collection: 'one',
  matches (baton) {
    if (!baton.originFavorites && !baton.originMyShares && !baton.portal) return false
    const data = baton.first()
    const id = baton.collection.has('folders') ? data.id : data.folder_id
    const model = folderAPI.pool.getModel(id)
    return !!model
  },
  action (baton) {
    const app = baton.app
    const model = baton.models[0]
    const attr = model.attributes
    const folderId = model.isFile() ? attr.folder_id : attr.id
    const listView = app.listView
    const cid = app.listView.getCompositeKey(model)

    // refresh the view and select file even if the folder is already selected
    const alwaysChange = baton.alwaysChange

    function select () {
      listView.off('listview:shown', select)
      listView.off('collection:rendered', select)
      listView.selection.set([cid], true)

      const element = app.listView.selection.getNode(cid)
      listView.selection.selectAll(element)
    }
    listView.on('listview:shown', select)
    listView.on('listview:reset', select)

    if (alwaysChange && app.folder.get() === folderId) {
      select()
    } else {
      app.folder.set(folderId)
    }
  }
})

// Action to add files/folders to favorites
Action('io.ox/files/actions/favorites/add', {
  capabilities: '!guest && !anonymous',
  matches (baton) {
    if (isTrash(baton)) return false
    if (baton.originFavorites) return false
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false

    const favoritesFolder = coreSettings.get('favorites/infostore', [])
    const favoriteFiles = coreSettings.get('favoriteFiles/infostore', [])
    const allFavoriteIds = [].concat(favoritesFolder, _(favoriteFiles).pluck('id'))

    // check whether all selected items can be added to favorites
    const disabled = getSelectionOrTopFolder(baton).some(function (element) {
      // check that we don't have a local file (upload file in mailcompose, view the file -> we have a local file)
      if (element.space) return true
      if (element.group === 'localFile') return true
      if (folderAPI.is('trash', element)) return true
      // virtual folder
      if (isVirtual(element.id) || element.id === null) return true
      return _(allFavoriteIds).contains(element.id)
    })

    return !disabled
  },
  action (baton) {
    const list = markFoldersAsFolder(getSelectionOrTopFolder(baton))
    ox.load(() => import('@/io.ox/files/actions/favorites')).then(function ({ default: action }) {
      action.add(list)
    })
  }
})

function getSelectionOrTopFolder (baton) {
  let list = baton.array()
  if (_.isEmpty(list)) list = [{ id: baton.app.folder.get(), folder_id: 'folder' }]
  return list
}

function markFoldersAsFolder (list) {
  return list.map(function (item) {
    return 'folder_name' in item ? _.extend({}, item, { folder_id: 'folder' }) : item
  })
}

// Action to remove files/folders to favorites
Action('io.ox/files/actions/favorites/remove', {
  capabilities: '!guest && !anonymous',
  matches (baton) {
    if (baton.isViewer && !util.isCurrentVersion(baton)) return false

    const favoritesFolder = coreSettings.get('favorites/infostore', [])
    const favoriteFiles = coreSettings.get('favoriteFiles/infostore', [])
    const allFavoriteIds = [].concat(favoritesFolder, _(favoriteFiles).pluck('id'))

    // returns true if one file/folder of the selection is in favorites
    return getSelectionOrTopFolder(baton).some(function (element) {
      return _(allFavoriteIds).contains(element.id)
    })
  },
  action (baton) {
    const list = markFoldersAsFolder(getSelectionOrTopFolder(baton))
    ox.load(() => import('@/io.ox/files/actions/favorites')).then(function ({ default: action }) {
      action.remove(list)
    })
  }
})

Action('io.ox/files/favorite/back', {
  toggle: _.device('smartphone'),
  matches (baton) {
    return baton.originFavorites
  },
  action () {
    $('[data-page-id="io.ox/files/main"]').trigger('myfavorites-folder-back')
  }
})

// view menu 'Layout' options' as actions
Action('io.ox/files/actions/layout-list', {
  action (baton) {
    baton.app.props.set('layout', 'list')
  }
})

Action('io.ox/files/actions/layout-icon', {
  action (baton) {
    baton.app.props.set('layout', 'icon')
  }
})

Action('io.ox/files/actions/layout-tile', {
  action (baton) {
    baton.app.props.set('layout', 'tile')
  }
})

// view menu  'Options' as actions
Action('io.ox/files/actions/view-checkboxes', {
  action (baton) {
    const value = 'checkboxes'
    const newValue = !baton.app.props.get(value)
    baton.app.props.set(value, newValue)
  }
})

Action('io.ox/files/actions/view-folderview', {
  action (baton) {
    const value = 'folderview'
    const newValue = !baton.app.props.get(value)
    baton.app.props.set(value, newValue)
  }
})

Action('io.ox/files/actions/view-details', {
  action (baton) {
    const value = 'details'
    const newValue = !baton.app.props.get(value)
    baton.app.props.set(value, newValue)
  }
})

Action('io.ox/files/actions/add-storage-account', {
  drawDisabled: false,
  matches () {
    return util.hasStorageAccounts()
  },
  action () {
    import('@/io.ox/files/actions/add-storage-account')
      .then(({ default: addStorageAccount }) => addStorageAccount())
  }
})

// Secondary actions
ext.point('io.ox/secondary').extend(
  {
    id: 'files-new-folder',
    index: 100,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      this.action('io.ox/files/actions/add-folder', gt('New folder'), baton)
      this.divider()
    }
  },
  {
    id: 'files-upload-file',
    index: 200,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      this.action('io.ox/files/actions/upload', gt('Upload files'), baton)
    }
  },
  {
    id: 'files-upload-folder',
    index: 300,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      this.action('io.ox/files/actions/uploadFolder', gt('Upload folder'), baton)
      this.divider()
    }
  },
  {
    id: 'files-add-storage-account',
    // choose index so that documents action links are below this (those start at 350), see https://gitlab.open-xchange.com/documents/office-web/-/blob/main/src/io.ox/office/editframework/app/fileactions.js
    index: 340,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      this.action('io.ox/files/actions/add-storage-account', gt('Add storage account'), baton)
      this.divider()
    }
  },
  {
    id: 'files-new-note',
    index: 500,
    render (baton) {
      if (baton.appId !== 'io.ox/files') return
      // #. Creating a new note item in context of "note taking". "Notiz" in German, for example.
      // #. More like "to notice" than "to notify".
      this.action('io.ox/files/actions/editor-new', gt('New note'), baton)
      this.divider()
    }
  }
)

// share
ext.point('io.ox/files/toolbar/share').extend(
  {
    index: 100,
    id: 'invite',
    title: gt('Share / Permissions'),
    // #. sharing: a guest user will be created for the owner of that email address
    section: 'invite',
    ref: 'io.ox/files/actions/share'
  }
)

// inline links
const inlineLinks = [
  {
    id: 'openviewer',
    prio: 'hi',
    mobile: 'hi',
    // #. used as a verb here. label of a button to view files
    title: gt('View'),
    ref: 'io.ox/files/actions/viewer'
  },
  {
    id: 'editor',
    prio: 'hi',
    mobile: 'lo',
    title: gt('Edit'),
    ref: 'io.ox/files/actions/editor'
  },
  {
    id: 'download',
    prio: 'hi',
    mobile: 'hi',
    title: gt('Download'),
    icon: 'bi/download.svg',
    ref: 'io.ox/files/actions/download'
  },
  {
    id: 'download-folder',
    prio: 'hi',
    mobile: 'lo',
    title: gt('Download'),
    ref: 'io.ox/files/actions/download-folder'
  },
  {
    id: 'delete',
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/files/actions/delete'
  },
  {
    id: 'favorite-add',
    prio: 'hi',
    mobile: 'lo',
    title: gt('Add to favorites'),
    ref: 'io.ox/files/actions/favorites/add'
  },
  {
    id: 'favorite-remove',
    prio: 'hi',
    mobile: 'lo',
    title: gt('Remove from favorites'),
    ref: 'io.ox/files/actions/favorites/remove'
  },
  {
    id: 'add-to-portal',
    prio: 'lo',
    mobile: 'none',
    title: gt('Add to portal'),
    ref: 'io.ox/files/actions/add-to-portal',
    section: 'share'
  },
  {
    id: 'send',
    prio: 'lo',
    mobile: 'hi',
    icon: _.device('smartphone') ? 'bi/envelope.svg' : undefined,
    title: gt('Send by email'),
    ref: 'io.ox/files/actions/send',
    section: 'share'
  },
  {
    id: 'share',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Share / Permissions'),
    ref: 'io.ox/files/actions/share',
    section: 'share'
  },
  {
    id: 'rename',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Rename'),
    ref: 'io.ox/files/actions/rename',
    section: 'edit'
  },
  {
    id: 'edit-description',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Edit description'),
    ref: 'io.ox/files/actions/edit-description',
    section: 'edit'
  },
  {
    id: 'move',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Move'),
    ref: 'io.ox/files/actions/move',
    section: 'file-op'
  },
  {
    id: 'copy',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/files/actions/copy',
    section: 'file-op'
  },
  {
    id: 'lock',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Lock'),
    ref: 'io.ox/files/actions/lock',
    section: 'file-op'
  },
  {
    id: 'unlock',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Unlock'),
    ref: 'io.ox/files/actions/unlock',
    section: 'file-op'
  },
  {
    id: 'restore',
    prio: 'lo',
    mobile: 'lo',
    title: gt('Restore'),
    ref: 'io.ox/files/actions/restore',
    section: 'file-op'
  }
]

ext.point('io.ox/files/links/inline').extend(
  inlineLinks.map(function (extension, index) {
    extension.index = 100 + index * 100
    return extension
  })
)

// version links

// current version
ext.point('io.ox/files/versions/links/inline/current').extend(
  {
    id: 'view',
    index: 100,
    prio: 'lo',
    mobile: 'lo',
    // #. used as a verb here. label of a button to view files
    title: gt('View'),
    ref: 'io.ox/files/actions/viewer',
    section: 'view'
  },
  {
    id: 'editor',
    index: 150,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Edit'),
    ref: 'io.ox/files/actions/editor',
    section: 'edit'
  },
  {
    id: 'download',
    index: 200,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Download'),
    ref: 'io.ox/files/actions/downloadversion',
    section: 'edit'
  },
  {
    id: 'delete',
    index: 300,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Delete version'),
    ref: 'io.ox/files/versions/actions/delete',
    section: 'delete'
  },
  {
    id: 'deletePreviousVersions',
    index: 310,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Delete all previous versions'),
    ref: 'io.ox/files/versions/actions/deletePreviousVersions',
    section: 'delete'
  }
)

// older versions
ext.point('io.ox/files/versions/links/inline/older').extend(
  {
    id: 'view',
    index: 100,
    prio: 'lo',
    mobile: 'lo',
    // #. used as a verb here. label of a button to view files
    title: gt('View'),
    ref: 'io.ox/files/actions/viewer',
    section: 'view'
  },
  {
    id: 'download',
    index: 200,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Download'),
    ref: 'io.ox/files/actions/downloadversion',
    section: 'edit'
  },
  {
    id: 'makeCurrent',
    index: 250,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Make this the current version'),
    ref: 'io.ox/files/versions/actions/makeCurrent',
    section: 'edit'
  },
  {
    id: 'delete',
    index: 300,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Delete version'),
    ref: 'io.ox/files/versions/actions/delete',
    section: 'delete'
  },
  {
    id: 'deletePreviousVersions',
    index: 310,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Delete all previous versions'),
    ref: 'io.ox/files/versions/actions/deletePreviousVersions',
    section: 'delete'
  }
)

// Drag and Drop

ext.point('io.ox/files/dnd/actions').extend({
  id: 'create',
  index: 10,
  label: gt('Drop here to upload a <b class="dndignore">new file</b>'),
  multiple (files, app) {
    import('@/io.ox/files/upload/main').then(function (fileUpload) {
      fileUpload.offer(files, { folder: app.folder.get() })
    })
  }
})

ext.point('io.ox/files/dnd/actions').extend({
  id: 'newVersion',
  index: 20,
  isEnabled (app) {
    return !!app.currentFile
  },
  label (app) {
    if (app.currentFile.filename || app.currentFile.title) {
      return gt(
        // #. %1$s is the filename or title of the file
        'Drop here to upload a <b class="dndignore">new version</b> of "%1$s"',
        String(app.currentFile.filename || app.currentFile.title).replace(/</g, '&lt;')
      )
    }
    return gt('Drop here to upload a <b class="dndignore">new version</b>')
  },
  action (file, app) {
    import('@/io.ox/files/upload/main').then(function (fileUpload) {
      fileUpload.offer(file, { folder: app.folder.get(), newVersion: true })
    })
  }
})
