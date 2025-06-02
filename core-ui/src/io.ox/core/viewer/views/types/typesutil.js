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

import Capabilities from '@/io.ox/core/capabilities'
import Ext from '@/io.ox/core/extensions'

/**
 * OX Viewer types utilities.
 * Determines which file types are supported by the OX Viewer,
 * and offers file type related utility methods.
 */

// a map of supported file types to their implementations
const typesMap = {
  image: 'imageview',
  doc: 'documentview',
  xls: 'spreadsheetview',
  ppt: 'documentview',
  pdf: 'documentview',
  audio: 'audioview',
  vcf: 'contactview',
  video: 'videoview',
  txt: 'textview'
}

const typesUtil = {

  /**
   * Gets the corresponding file type string for the given model object.
   *
   * @param   {object} model an OX Viewer model object.
   * @returns {string}       the file type string.
   */
  getTypeString (model) {
    if (!model) { return 'defaultview' }

    let modelType = typesMap[(model.isEncrypted() ? model.getGuardType() : model.getFileType())] || 'defaultview'

    if (modelType === 'spreadsheetview' && (!Capabilities.has('spreadsheet') || !this.isNativeDocumentType(model))) {
      modelType = 'documentview'
    }

    if (modelType === 'documentview' && !Capabilities.has('document_preview')) {
      modelType = 'defaultview'
    }

    // item without file?
    if (model.isEmptyFile()) {
      modelType = 'descriptionview'
    }

    // special check for nested messages
    if (model.isMailAttachment() && model.get('file_mimetype') === 'message/rfc822') {
      modelType = 'mailview'
    }

    // TODO: special handling for contact details. Not possible in most contexts, but if all data is available.
    // if file_mimetype is set, we are dealing with a file, not an actual contact
    if (modelType === 'contactview' && (model.get('file_mimetype') || '').indexOf('text/vcard') >= 0) {
      modelType = 'defaultview'
    }

    return modelType
  },

  /**
   * Returns true if the Viewer is able to display the data of the given model.
   *
   * @param   {object}  model an OX Viewer model object.
   * @returns {boolean}       Whether the Viewer is able to display the data of the given model.
   */
  canView (model) {
    return (this.getTypeString(model) !== 'defaultview')
  },

  /**
   * Returns true if the model represents a document file type.
   *
   * @param   {object}  model an OX Viewer model object.
   * @returns {boolean}       Whether the model represents a document file type.
   */
  isDocumentType (model) {
    return (this.getTypeString(model) === 'documentview')
  },

  /**
   * Returns true if the model represents a spreadsheet file type.
   *
   * @param   {object}  model an OX Viewer model object.
   * @returns {boolean}       Whether the model represents a spreadsheet file type.
   */
  isSpreadsheetType (model) {
    return (this.getTypeString(model) === 'spreadsheetview')
  },

  /**
   * Returns true when at least one of the OX Document application is available.
   */
  isOfficeAvailable () {
    return (Capabilities.has('text') || Capabilities.has('presentation') || Capabilities.has('spreadsheet'))
  },

  /**
   * If at least one OX Documents application is available, returns whether
   * the model represents a native document that needs no further conversion.
   * Otherwise returns false.
   *
   * @param   {Backbone.Model} model an OX Viewer model object.
   * @returns {boolean}              Whether the model represents a native OX Documents file.
   */
  isNativeDocumentType (model) {
    // Ext.point.invoke returns an array of results
    function getBooleanFromInvokeResult (invokeResult) {
      return (invokeResult && _.isArray(invokeResult._wrapped)) ? invokeResult._wrapped[0] : false
    }

    if (!this.isOfficeAvailable()) { return false }

    const baton = new Ext.Baton({ data: model })
    const invokeResult = Ext.point('io.ox/office/extensionregistry').invoke('isNative', null, baton)

    return getBooleanFromInvokeResult(invokeResult)
  }

}

export default typesUtil
