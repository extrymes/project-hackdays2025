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
import ModalDialog from '@/io.ox/backbone/views/modal'
import capabilities from '@/io.ox/core/capabilities'
import folderAPI from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'
import filestorageApi from '@/io.ox/core/api/filestorage'
import Upload from '@/io.ox/files/upload/main'

import { settings } from '@/io.ox/files/settings'
import gt from 'gettext'

const regexp = {}
// action requires handling of deferreds
const RESOLVE = $.Deferred().resolve()
const REJECT = $.Deferred().reject()

// pseudo reject -> real reject
function normalize (val) {
  // consider: fc
  if (!_.isUndefined(val) && val === false) {
    return $.Deferred().reject()
  }
  return $.Deferred().resolve()
}

function getFolderId (baton) {
  let folderId
  if (baton.collection.has('one')) {
    if (baton.models && baton.models.length > 0) {
      const selectedModel = baton.models[0]
      folderId = selectedModel.isFolder() ? selectedModel.get('id') : selectedModel.get('folder_id')
    }

    if (!folderId) {
      const data = baton.first()
      folderId = baton.collection.has('folders') ? data.id : data.folder_id
      if (!folderId) {
        folderId = data.folder_id && data.folder_id !== 'folder' ? data.folder_id : data.id
      }
    }
  } else if (baton.app) {
    // use current folder
    folderId = baton.app.folder.get()
  }

  return folderId
}

/**
 * returns deferred that sequently checks sync and async conditions
 * @return {jQuery.Deferred} that rejects on first false/reject in chain
 *
 * @example
 *  truthy condition:
 *  ta) true
 *  tb) resolved deferred
 *  tc) resolved deferred returning true
 *
 *  falsy condition:
 *  fa) false
 *  fb) rejected deferred
 *  fc) resolved deferred returning false
 */
export const conditionChain = function () {
  const list = _.isArray(arguments[0]) ? arguments[0] : arguments || []
  let chain = $.when()
  const response = $.Deferred()

  // conditions
  _.each(list, function (cond) {
    const async = !!cond.then
    const def = cond ? RESOLVE : REJECT
    // line up conditions
    chain = chain.then(function () {
      return async ? cond.then(normalize) : def
    })
  })

  // real reject/resolve -> pseudo resolve/reject
  chain.always(function () {
    return response.resolveWith(undefined, [chain.state() === 'resolved'])
  })

  return response.promise()
}

/**
 * check type of folder
 * @param  {string}          type  (e.g. 'trash')
 * @param  {object}          baton [description]
 * @return {jQuery.Deferred}       that is rejected if
 */
export const isFolderType = (function () {
  // tries to get data from current/provided folder
  // hint: may returns a empty object in case no usable data is provided
  function getFolder (baton) {
    const app = baton.app
    const data = baton.data || {}
    if (app) {
      return app.folder.getData()
    } else if (data.folder_id) {
      // no app given, maybe the item itself has a folder
      return folderAPI.get(data.folder_id)
    }
    // continue without getFolder
    return $.Deferred().resolveWith(data)
  }
  return function (type, baton) {
    return getFolder(baton).then(function (data) {
      // '!' type prefix as magical negation
      let inverse
      if (type[0] === '!') {
        type = type.substr(1)
        inverse = true
      }
      const result = folderAPI.is(type, data)
      // reject/resolve
      if (inverse ? !result : result) {
        return RESOLVE
      }
      return REJECT
    })
  }
})()

/**
 * check for 'lock' and 'unlock' status
 * @param  {string}  type (potentially negated with '!' prefix)
 * @param  {event}   e    (e.context)
 * @return {boolean}
 */
export const hasStatus = function (type, e) {
  const self = this
  const list = _.isArray(e) ? e : _.getArray(e.context)
  const mapping = {
    locked (obj) {
      return obj.locked_until > _.now()
    },
    lockedByOthers (obj) {
      return obj.locked_until > _.now() && obj.modified_by !== ox.user_id
    },
    lockedByMe (obj) {
      return obj.locked_until > _.now() && obj.modified_by === ox.user_id
    },
    createdByMe (obj) {
      return obj.created_by === ox.user_id
    }
  }
  let inverse
  let result
  // '!' type prefix as magical negation
  if (type[0] === '!') {
    type = type.substr(1)
    inverse = true
  }
  // map type and fn
  const fn = mapping[type]
  // call
  return _(list).reduce(function (memo, obj) {
    result = fn.call(self, obj)
    // negate result?
    return memo || (inverse ? !result : result)
  }, false)
}

/**
 * checks for audio/video support
 * @param  {string}          type (audio|video)
 * @param  {event}           e
 * @return {jQuery.Deferred}      resolves with boolean
 */
export const checkMedia = function (type, e) {
  if (!e.collection.has('some') && !settings.get(type + 'Enabled')) {
    return false
  }

  let list = _.copy(e.baton.allIds, true)
  const incompleteHash = {}
  const incompleteItems = []
  let def = $.Deferred()
  let index

  if (_.isUndefined(e.baton.allIds)) {
    e.baton.allIds = e.baton.data
    list = [e.baton.allIds]
  }

  // avoid runtime errors
  if (!_.isArray(list)) return false

  // identify incomplete items
  _(list).each(function (item) {
    if (_.isUndefined(item.filename)) {
      // collect all incomplete items grouped by folder ID
      incompleteHash[item.folder_id] = (incompleteHash[item.folder_id] || []).concat(item)
      // all incomplete items
      incompleteItems.push(item)
      index = list.indexOf(item)
      if (index !== -1) {
        list.splice(index, 1)
      }
    }
  })

  // complement data from server/cache
  const folder = Object.keys(incompleteHash)
  if (folder.length === 1) {
    // get only this folder
    def = api.getAll(folder[0])
  } else if (folder.length > 1) {
    // multiple folder -> use getList
    def = api.getList(incompleteItems).then(function (data) {
      return list.concat(data)
    })
  } else {
    // nothing to do
    def.resolve(list)
  }

  return def.then(function (data) {
    return import('@/io.ox/files/mediasupport').then(function ({ default: mediasupport }) {
      // update baton
      e.baton.allIds = data
      return _(data).reduce(function (memo, obj) {
        return memo || !!(obj && mediasupport.checkFile(type, obj.filename))
      }, false)
    })
  })
}

/**
 * shows confirm dialog in case user changes file extension
 * @param  {string}         formFilename   filename
 * @param  {string}         serverFilename filename
 * @return {jQuery.Promise}                resolves if user confirms or dialogue needed
 */
export const confirmDialog = function (formFilename, serverFilename, options) {
  const opt = options || {}
  // be robust
  serverFilename = String(serverFilename || '')
  formFilename = String(formFilename || '')
  const def = $.Deferred()
  const extServer = serverFilename.indexOf('.') >= 0 ? _.last(serverFilename.split('.')) : ''
  const extForm = _.last(formFilename.split('.'))
  const $hint = $('<p style="padding-top: 16px;">').append(
    $('<em>').text(gt('Please note, changing or removing the file extension will cause problems when viewing or editing.'))
  )
  let message

  // set message
  if (formFilename !== '' && formFilename.split('.').length === 1 && extServer !== '') {
    // file extension ext removed
    message = gt('Do you really want to remove the extension ".%1$s" from your filename?', extServer)
  } else if (extServer.toLowerCase() !== extForm.toLowerCase() && extServer !== '') {
    // ext changed
    message = gt('Do you really want to change the file extension from  ".%1$s" to ".%2$s" ?', extServer, extForm)
  }
  // confirmation needed
  if (message) {
    new ModalDialog(_.extend(opt, { title: gt('Confirmation'), description: [message, $hint] }))
      .addButton({ label: gt('Adjust'), action: 'change', className: 'btn-default' })
      .addButton({ label: gt('Yes'), action: 'rename' })
      .on('action', function (action) {
        if (action === 'rename') def.resolve()
        else def.reject()
      })
      .open()
  } else if (formFilename === '') {
    // usually prevented from ui
    def.reject()
  } else {
    def.resolve()
  }
  return def.promise()
}

/**
 * returns previewmode and checks capabilities
 * @param  {object} file
 * @return {string}      (thumbnail|cover|preview) or false as fallback
 */
export const previewMode = function (file) {
  const image = '(gif|png|jpe?g|bmp|tiff|heic?f?)'
  const audio = '(mpeg|m4a|m4b|mp3|ogg|oga|opus|x-m4a)'
  const video = '(mp4|m4v|ogv|ogm|webm)'
  const office = '(csv|xls|xla|xlb|xlt|ppt|pps|doc|dot|xlsx|xlsm|xltx|xltm|xlam|pptx|pptm|ppsx|ppsm|ppa|ppam|pot|potx|potm|docx|docm|dotx|dotm|odc|odb|odf|odg|otg|odi|odp|otp|ods|ots|odt|odm|ott|oth|pdf|rtf)'
  const application = '(ms-word|ms-excel|ms-powerpoint|msword|msexcel|mspowerpoint|openxmlformats|opendocument|pdf|rtf)'
  const text = '(rtf|plain)'

  // check file extension or mimetype (when type is defined)
  function is (list, type) {
    const key = (type || '') + '.' + list
    if (regexp[key]) {
      // use cached
      return regexp[key].test(type ? file.file_mimetype : file.filename)
    } else if (type) {
      // e.g. /^image\/.*(gif|png|jpe?g|bmp|tiff).*$/i
      return (regexp[key] = new RegExp('^' + type + '\\/.*' + list + '.*$', 'i')).test(file.file_mimetype)
    }
    // e.g. /^.*\.(gif|png|jpe?g|bmp|tiff)$/i
    return (regexp[key] = new RegExp('^.*\\.' + list + '$', 'i')).test(file.filename)
  }

  // identify mode
  if (is(image, 'image') || is(image)) {
    return 'thumbnail'
  } else if (is(audio, 'audio') || is(audio)) {
    return 'cover'
  } else if (capabilities.has('document_preview') && (is(application, 'application') || is(text, 'text') || is(office) || is(video))) {
    return 'preview'
  }
  return false
}

/**
 * Returns if a upload of new version for the file is in progress.
 * If a upload is running a dialog appears with the information that
 * the user can edit the file after the file is uploaded.
 *
 * @param  {string}  fileId  file ID to test if a upload is in progress.
 * @param  {string}  message the message for the yell dialog. If empty no dialog appears.
 *
 * @return {boolean}         True if a upload is in progress, otherwise false.
 */
export const isFileVersionUploading = function (fileId, message) {
  return Upload.collection.find(function (file) {
    if (file && file.id === fileId) {
      if (message) {
        yell({ type: 'info', message })
      }
      return true
    }

    return false
  })
}

/**
 * Returns whether a file (type office document) can be edited in its federated guest account.
 *
 * @param  {object}  fileModel The file model to be checked.
 * @return {boolean}           True if the file can be edited in the federated guest account
 */
export const canEditDocFederated = function (fileModel) {
  // early out
  if (!fileModel) { return false }
  if (!fileModel.isOffice()) { return false }

  // check if file is in federated shared file account
  if (!filestorageApi.isFederatedAccount(fileModel.getItemAccountSync())) { return false }

  const accountMeta = filestorageApi.getAccountMetaData(fileModel.getItemAccountSync())
  const guestCapabilities = accountMeta && accountMeta.guestCapabilities
  let canOpenInFederatedContext = false

  // Temporary workaround for use-case 'edit federated' in 7.10.5:
  // Use local edit when office available, and when not, check whether
  // it can be edited in the federated context and open the guest drive as a fallback.
  // Therefore the e.g. "!capabilities.has('text')" check was added, remove this part
  // below when restoring the old behavior.
  if (fileModel.isWordprocessing()) { canOpenInFederatedContext = !capabilities.has('text') && guestCapabilities.indexOf('text') > 0 }
  if (fileModel.isSpreadsheet()) { canOpenInFederatedContext = !capabilities.has('spreadsheet') && guestCapabilities.indexOf('spreadsheet') > 0 }
  if (fileModel.isPresentation()) { canOpenInFederatedContext = !capabilities.has('presentation') && guestCapabilities.indexOf('presentation') > 0 }
  return canOpenInFederatedContext
}

export const isCurrentVersion = function (baton) {
  // folder tree folder, always current version
  if (!baton.collection.has('some')) return true
  // drive folder, always current version
  if (baton.collection.has('folders')) return true
  // single selection
  if (baton.collection.has('one') && baton.first().current_version !== false) return true
  // multi selection
  if (baton.collection.has('multiple') && baton.array().every(function (file) { return file.current_version !== false })) return true
  // default
  return false
}

// check if this is a contact not a file, happens when contact is send as vcard
export const isContact = function (baton) {
  return _(baton.first()).has('internal_userid')
}

/**
 * Checks if the collection inside an event is shareable
 * @param   {Event}   e    Event to check the collection
 * @param   {string}  type Type of the sharing to check ("invite" or "link")
 * @returns {boolean}      Whether the elements inside the collection are shareable
 */
export const isShareable = function (type, baton) {
  // not possible for multi-selection
  if (baton.collection.has('multiple')) return false
  if (isContact(baton)) return false
  if (baton.isViewer && !isCurrentVersion(baton)) return false
  // Links aren't possible for encrypted files
  if (type === 'link' && baton.first() && new api.Model(baton.first()).isEncrypted()) return false
  if (!baton.collection.matches('!items || modify')) return false
  // get folder id
  const id = getFolderId(baton)
  if (!id) return false
  // general capability and folder check
  const model = folderAPI.pool.getModel(id)
  if (!model.isShareable()) return false
  if (model.is('trash')) return false
  return type === 'invite' ? model.supportsInviteGuests() : true
}

/**
 * Validate file/folder name
 * @param   {string}  filename  file or folder name to be validated
 * @param   {string}  type      validate file or folder name
 * @returns {array}   warnings  array of validation warning. Empty array = valid file/folder name
 */
export const validateFilename = function (filename, type = 'file') {
  const warnings = []
  if (!filename || _.isEmpty(filename.trim())) {
    warnings.push(type === 'file' ? gt('File names must not be empty') : gt('Folder names must not be empty'))
  } else if (/\//.test(filename)) {
    warnings.push(type === 'file' ? gt('File names must not contain slashes') : gt('Folder names must not contain slashes'))
  }
  return warnings
}

export function getAvailableNonOauthServices () {
  return ['nextcloud', 'webdav', 'owncloud'].filter(s => capabilities.has('filestorage_' + s))
}

export async function getAvailableOauthServices () {
  const [{ getAPI }] = await Promise.all([
    import('@/io.ox/oauth/keychain'),
    filestorageApi.rampup()
  ])
  const oauthAPI = await getAPI()
  const availableServices = oauthAPI.services.filter(function (service) {
    return service.canAdd({ scopes: ['drive'] }) && filestorageApi.isStorageAvailable(service.id)
  })
  return availableServices
}

export async function hasStorageAccounts () {
  const availableNonOauthServices = getAvailableNonOauthServices()
  if (availableNonOauthServices.length > 0) return true

  const availableServices = await getAvailableOauthServices()
  if (availableServices.length > 0) return true

  return false
}
