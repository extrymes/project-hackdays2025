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
import CoreHTTP from '@/io.ox/core/http'

import gt from 'gettext'

/**
 * Error messages for the document converter.
 */
const DOC_CONVERTER_ERROR_MESSAGES = {
  importError: gt('An error occurred while loading the document so it cannot be displayed.'),
  filterError: gt('An error occurred while converting the document so it cannot be displayed.'),
  passwordProtected: gt('This document is password protected and cannot be displayed.'),
  invalidFilename: gt('The PDF could not be exported. The file name contains invalid characters:')
}

/**
 * Provides static methods for communication with the document converter.
 */
const Utils = {}

// Utils constants --------------------------------------------------------

/**
 * The name of the document converter server module.
 */
Utils.CONVERTER_MODULE_NAME = 'oxodocumentconverter'

/**
 * The magic module id to source map.
 */
Utils.MODULE_SOURCE_MAP = {
  1: 'calendar',
  4: 'tasks',
  7: 'contacts'
}

// static methods ---------------------------------------------------------

/**
 * Creates and returns the URL of a document converter request.
 *
 * @param   {object}             [params] Additional parameters to be inserted into the URL (optional).
 * @returns {string | undefined}          The final URL of the server request; or undefined,
 *                                        if the current session is invalid.
 */
Utils.getConverterUrl = function (params) {
  // return nothing if no session is present
  if (!ox.session || !ox.ui.App.getCurrentApp()) {
    return
  }

  const currentAppUniqueID = ox.ui.App.getCurrentApp().get('uniqueID')
  const module = Utils.CONVERTER_MODULE_NAME

  // add default parameters (session and UID), and file parameters
  params = _.extend({ session: ox.session, uid: currentAppUniqueID }, params)

  // build and return the resulting URL
  return ox.apiRoot + '/' + module + '?' + $.param(_.omit(params, _.isUndefined))
}

/**
 * Creates and returns the URL of a document converter request.
 * Special characters not allowed in URLs will be encoded.
 *
 * @param   {FilesAPI.Model}     model    The Drive file model.
 * @param   {object}             [params] Additional parameters to be inserted into the URL (optional).
 * @returns {string | undefined}          The final URL of the server request; or undefined, if the current session is invalid.
 */
Utils.getEncodedConverterUrl = function (model, params) {
  return Utils.getConverterUrl(Utils.getConvertParams(model, params), { encodeUrl: true })
}

/**
 * Starts the thumbnail conversion job.
 *
 * @param   {FilesAPI.Model} model The Drive file model.
 * @returns {jQuery.Promise}       The promise from document converter request.
 */
Utils.beginConvert = function (model) {
  const params = {
    action: 'convertdocument',
    convert_format: 'image',
    convert_action: 'beginconvert',
    // only resolve if response contains page count, otherwise reject
    reject_on_empty_page_count: true
  }

  return Utils.sendConverterRequest(model, params)
}

/**
 * Ends the thumbnail conversion job.
 *
 * @param   {FilesAPI.Model} model The Drive file model.
 * @param   {string}         jobId The conversion job ID.
 * @returns {jQuery.Promise}       The promise from document converter request.
 */
Utils.endConvert = function (model, jobId) {
  if (!jobId) {
    return $.Deferred().reject()
  }

  const params = {
    action: 'convertdocument',
    convert_action: 'endconvert',
    job_id: jobId
  }

  return Utils.sendConverterRequest(model, params)
}

/**
 * Sends a request to the document converter.
 *
 * @param   {object}         [params] An object containing additional converter parameters.
 * @returns {jQuery.Promise}          The promise from the Ajax request enriched with an abort method.
 */
Utils.sendConverterRequest = function (model, params) {
  if (!model || !ox.ui.App.getCurrentApp()) {
    return $.Deferred().reject()
  }

  const // converter parameters passed to the server request
    converterParams = Utils.getConvertParams(model, params)
  // properties passed to the server request
  const requestProps = { module: Utils.CONVERTER_MODULE_NAME, params: converterParams }
  // the Deferred object representing the core AJAX request
  let ajaxRequest = null
  // the Promise returned by this method
  let promise = null

  requestProps.processResponse = !!(params && params.processResponse)

  // send the AJAX request
  ajaxRequest = CoreHTTP.GET(requestProps)

  // reject, if the response contains an error; otherwise resolve.
  // e.g. the document endconvert request does not return a response in case of success.
  promise = ajaxRequest.then(function (response) {
    return (response && response.cause) || (params.reject_on_empty_page_count && response && !_.isNumber(response.pageCount)) ? $.Deferred().reject(response) : $.Deferred().resolve(response)
  })

  // add an abort() method, forward invocation to AJAX request
  return _.extend(promise, { abort () { ajaxRequest.abort() } })
}

/**
 * Build necessary parameters for the document conversion to PDF.
 * Also add proprietary parameters for Mail attachments, PIM attachments and Guard files.
 *
 * @param   {FilesAPI.Model} model         The Drive file model.
 * @param   {object}         [extraParams] An object with additional parameters to add.
 * @returns {object}                       An object containing the converter parameters.
 */
Utils.getConvertParams = function (model, extraParams) {
  const // proprietary parameters for Mail, PIM or Guard
    proprietaryParams = Utils.getProprietaryParams(model)
  // default converter parameters
  const defaultParams = {
    action: 'getdocument',
    documentformat: 'pdf',
    priority: 'instant',
    session: ox.session,
    filename: model.get('filename'),
    id: model.get('id'),
    folder_id: model.get('folder_id'),
    mimetype: model.get('file_mimetype'),
    revtag: _.uniqueId('revtag-'), // needed when doing revisionless save
    nocache: _.uniqueId() // needed to trick the browser
  }

  // add application UID
  if (ox.ui.App.getCurrentApp()) {
    defaultParams.uid = ox.ui.App.getCurrentApp().get('uniqueID')
  }

  // add version
  if (model.has('version')) {
    defaultParams.version = model.get('version')
  }

  // return the combined parameters
  return _.extend(defaultParams, proprietaryParams, extraParams)
}

/**
 * Returns the proprietary converter parameters for the given model
 * if the model represents a mail attachment, PIM attachment or a Guard file.
 *
 * @param   {FilesAPI.Model} model The Drive file model.
 * @returns {object | null}        An object containing the proprietary converter parameters or null.
 */
Utils.getProprietaryParams = function (model) {
  // the original mail and PIM attachment model data
  const originalModel = model.get('origData')
  // the PIM module id
  const moduleId = model.get('module')
  // the Guard parameters
  let fileOptions = null
  let fileOptionsParams = null
  let security = null
  let meta = null
  // the resulting params
  let params = null

  if (model.isComposeAttachment()) {
    // check for mail compose models
    params = {
      source: 'compose',
      id: model.get('spaceId'),
      attachmentId: model.get('id')
    }
  } else if (model.isMailAttachment()) {
    // the Guard parameters for mail

    fileOptionsParams = model.get('file_options') ? model.get('file_options').params : null

    params = {
      id: originalModel.mail.id,
      source: 'mail',
      attached: model.get('id')
    }
    // Office call, check for crypto data in model
    if (model.isEncrypted() || (fileOptionsParams && fileOptionsParams.cryptoAuth)) {
      params.decrypt = true
      params.cryptoAuth = fileOptionsParams ? fileOptionsParams.cryptoAuth : ''
      params.cryptoAction = fileOptionsParams ? fileOptionsParams.cryptoAction : ''
    } else { // Call for viewer, crypto info will be in originalModel
      security = originalModel && originalModel.security

      params.cryptoAuth = (security && security.authentication) || originalModel.auth || ''
      params.decrypt = Boolean(security && security.decrypted)
    }
  } else if (model.isPIMAttachment()) {
    params = {
      source: Utils.MODULE_SOURCE_MAP[moduleId],
      attached: originalModel.attached,
      module: moduleId
    }
  } else if (model.isEncrypted()) {
    // the Guard parameters
    fileOptions = model.get('file_options')
    fileOptionsParams = fileOptions ? fileOptions.params : null
    meta = model.get('meta')

    params = {
      source: 'guard',
      cryptoAuth: fileOptionsParams ? fileOptionsParams.cryptoAuth : null,
      cryptoAction: fileOptionsParams ? fileOptionsParams.cryptoAction : null,
      mimetype: (meta && meta.OrigMime) || model.get('file_mimetype')
    }
  }

  return params
}

// Error handling ---------------------------------------------------------

Utils.isDocConverterError = function (docConverterResponse) {
  return docConverterResponse && docConverterResponse.origin && (docConverterResponse.origin === 'DocumentConverter')
}

Utils.getErrorTextFromResponse = function (docConverterResponse) {
  // return 'null' when it's not a docConverterResponse,
  // this behavior is utilized in different parts of the code
  if (!Utils.isDocConverterError(docConverterResponse)) { return null }

  const cause = docConverterResponse && docConverterResponse.cause
  const errorParams = docConverterResponse
  return Utils.getErrorText(cause, errorParams)
}

Utils.getErrorText = function (cause, errorParams) {
  switch (cause) {
    case 'importError':
      return DOC_CONVERTER_ERROR_MESSAGES.importError

    case 'filterError':
      return DOC_CONVERTER_ERROR_MESSAGES.filterError

    case 'passwordProtected':
      return DOC_CONVERTER_ERROR_MESSAGES.passwordProtected

    case 'invalidFilename':
      return DOC_CONVERTER_ERROR_MESSAGES.invalidFilename + ' "' + errorParams.invalidCharacters.join('') + '"'

    default:
      // return 'null' when no or an unknown cause is provided,
      // this behavior is utilized in different parts of the code
      return null
  }
}

export default Utils
