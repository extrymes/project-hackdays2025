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
import PDFView from '@/io.ox/core/pdf/pdfview'
import Util from '@/io.ox/core/viewer/util'
import * as PDFJSLib from 'pdfjs-dist/build/pdf'

import { settings } from '@/io.ox/core/settings'

// class PDFDocument =======================================================

/**
 * The model of the Preview application. Stores and provides the HTML
 * representation of the document pages.
 *
 * @constructor
 *
 * @param {string} pdfConverterURL The URL of the PDF document.
 */
function PDFDocument (pdfConverterURL) {
  const self = this

  const loadDef = $.Deferred()

  // the resulting PDF.js document after loading
  let pdfjsDocument = null

  // the total page count of the document {Number}
  let pageCount = 0

  // the size of the first page is treated as default page size {width, height}
  let defaultPageSize = null

  // the size of the first page is treated as default page size {[{width, height}, ...]}
  const pageSizes = []

  // detecting the worker automatically no longer works, specify the workerSrc property manually
  PDFJSLib.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.js'

  // ---------------------------------------------------------------------

  function initializePageSize (pageNumber) {
    const def = $.Deferred()

    if (_.isNumber(pageNumber) && (pageNumber > 0) && (pageNumber <= pageCount)) {
      self.getPDFJSPage(pageNumber).then(function (pdfjsPage) {
        const viewport = pdfjsPage.getViewport({ scale: PDFView.getAdjustedZoom(1.0) })
        return def.resolve(PDFView.getNormalizedSize({ width: viewport.width, height: viewport.height }))
      })
    }

    return def.promise()
  }

  // methods ------------------------------------------------------------

  this.destroy = function () {
    if (pdfjsDocument) {
      pdfjsDocument.destroy()
    }
  }

  /**
   * @returns {jQuery.Promise} The promise of a Deferred object that will be resolved when the
   *                           PDF document has been loaded completely.
   */
  this.getLoadPromise = function () {
    return loadDef.promise()
  }

  // ---------------------------------------------------------------------

  /**
   * @returns {PDF.js document} The promise of a Deferred object that will be resolved when the
   *                            PDF document has been loaded completely.
   */
  this.getPDFJSDocument = function () {
    return pdfjsDocument
  }

  // ---------------------------------------------------------------------

  /**
   * Gets the PDF.js page promise for the specified page
   *
   * @param   {number}         pageNumber The number of the page.
   * @returns {PDF.js promise}            The PDF.js page promise.
   */
  this.getPDFJSPage = function (pageNumber) {
    return pdfjsDocument.getPage(pageNumber)
  }

  // ---------------------------------------------------------------------

  /**
   * Returns the number of pages contained in the document.
   *
   * @returns {number} The total number of pages in the document.
   */
  this.getPageCount = function () {
    return pageCount
  }

  // ---------------------------------------------------------------------

  /**
   * Returns the number of pages contained in the document.
   *
   * @returns {number} The total number of pages in the document.
   */
  this.getDefaultPageSize = function () {
    return defaultPageSize
  }

  // ---------------------------------------------------------------------

  /**
   * Gets the page size in pixels for the specified page or
   * null if pageNumber is outside of page range
   *
   * @param   {number}       pageNumber The number of the page.
   * @returns {width,height}            The size in pixels of the page.
   */
  this.getOriginalPageSize = function (pageNumber) {
    let pageSize = null

    if ((pageCount > 0) && _.isNumber(pageNumber) && (pageNumber > 0) && (pageNumber <= pageCount)) {
      pageSize = pageSizes[pageNumber - 1]

      /* TODO: reenable to get correct page sizes for all pages =>
       * ideal solution would be to retrieve and set original page size in first
       * real rendering of the page; retrieving all page sizes at the
       * begin will be too slow, so that this feature is currently disabled =>
       * all pages will have the default/first page size ATM
       * if (!pageSize) {
       *   initializePageSize(pageNumber).then( function(pageSize) {
       *     pageSizes[pageNumber - 1] = pageSize;
       *   });
       * }
       */
    }

    return (pageSize || defaultPageSize)
  }

  // ---------------------------------------------------------------------

  // Fetch the PDF document. In case of error, document converter returns a
  // JSON object with status code 200 (!) which has to be evaluated manually.
  fetch(pdfConverterURL).then(async response => {
    // detect JSON response and create an error descriptor object
    if (response.headers.get('Content-Type')?.startsWith('application/json')) {
      const data = { status: response.status }
      const json = await response.json()
      if (_.isObject(json) && _.isString(json.cause)) {
        Object.assign(data, json)
      } else {
        Object.assign(data, { cause: 'filterError', errorData: data })
      }
      loadDef.resolve(data)
      return
    }

    // error status
    if (!response.ok) {
      loadDef.resolve({ status: response.status, cause: 'filterError', errorData: response.statusText })
      return
    }

    // whether to enable range requests support, if not present the default is true
    const enableRangeRequests = settings.get('pdf/enableRangeRequests', true)

    // parse the PDF document
    const document = await PDFJSLib.getDocument({
      // The binary PDF data to be parsed.
      data: await response.arrayBuffer(),
      // Range request support. If the server supports range requests the PDF will be fetched in chunks.
      disableRange: !enableRangeRequests,
      // Streaming of PDF file data.
      disableStream: !enableRangeRequests,
      // Pre-fetching of PDF file data. PDF.js will automatically keep fetching more data even if it isn't needed to display the current page.
      // NOTE: It is also necessary to disable streaming, see above, in order for disabling of pre-fetching to work correctly.
      disableAutoFetch: !enableRangeRequests,
      // set verbosity level for PDF.js to errors only
      verbosity: PDFJSLib.VerbosityLevel.ERRORS,
      // The url to the predefined Adobe CMaps.
      cMapUrl: './pdfjs/cmaps/',
      // Specifies if CMaps are binary packed.
      cMapPacked: true
    }).promise

    Util.logPerformanceTimer('PDFDocument:PDFJs_getDocument_then_handler') // after first long running process

    // wrap around original getPage() function
    // to fix an exception which occurs when rapidly switching documents
    // and causes PDFjs to stop working and to render white pages only
    const origGetPageFunction = document?.transport?.getPage
    if (origGetPageFunction) {
      document.transport.getPage = function WorkerTransportGetPage (pageNumber, capability) {
        // return rejected promise if no message handler is present
        if (!document.transport.messageHandler) {
          return Promise.reject(new Error())
        }
        // call original getPage() function
        return origGetPageFunction.call(this, pageNumber, capability)
      }
    }

    if (document) {
      pdfjsDocument = document
      pageCount = document.numPages

      if (pageCount > 0) {
        initializePageSize(1).then(function (pageSize) {
          pageSizes[0] = defaultPageSize = pageSize
          loadDef.resolve(pageCount)
        })
        return
      }
    }

    loadDef.resolve({ cause: 'importError' })
  }).catch(error => {
    loadDef.resolve({ status: 500, cause: 'filterError', errorData: error.message })
  })
} // class PDFDocument

// exports ================================================================

export default PDFDocument
