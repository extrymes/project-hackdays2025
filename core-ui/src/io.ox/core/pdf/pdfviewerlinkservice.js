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
import { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer'

function parseQueryString (query) {
  const parts = query.split('&')
  const params = {}
  for (let i = 0, ii = parts.length; i < ii; ++i) {
    const param = parts[i].split('=')
    const key = param[0].toLowerCase()
    const value = param.length > 1 ? param[1] : null
    params[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return params
}

/**
 * Performs navigation functions inside PDF, such as opening specified page,
 * or destination.
 * @class
 * @implements {IPDFLinkService}
 */
class PDFViewerLinkService extends PDFLinkService {
  /**
   * @constructs PDFViewerLinkService
   */
  constructor (options) {
    super(options)
    options = options || {}
    this.baseUrl = options.baseUrl || null
    this.pdfDocument = options.pdfDocument || null
    this.pdfHistory = options.pdfHistory || null
    this.eventHub = options.eventHub || null
    this.externalLinkTarget = options.externalLinkTarget || null

    this._pagesRefCache = (this.pdfDocument) ? Object.create(null) : null
  }

  setDocument (pdfDocument, baseUrl) {
    this.baseUrl = baseUrl
    this.pdfDocument = pdfDocument
    this._pagesRefCache = Object.create(null)
  }

  setViewer (pdfViewer) {
    this.pdfViewer = pdfViewer
  }

  setHistory (pdfHistory) {
    this.pdfHistory = pdfHistory
  }

  setEventHub (eventHub) {
    this.eventHub = eventHub
  }

  /**
   * @returns {number}
   */
  get pagesCount () {
    return this.pdfDocument.numPages
  }

  /**
   * @param {object} dest The PDF destination object.
   */
  goToDestination (dest) {
    let destString = ''
    const self = this

    const goToDestination = function (destRef) {
      // dest array looks like that: <page-ref> </XYZ|FitXXX> <args..>
      let pageNumber = destRef instanceof Object
        ? self._pagesRefCache[destRef.num + ' ' + destRef.gen + ' R']
        : (destRef + 1)

      if (pageNumber) {
        if (pageNumber > self.pagesCount) {
          pageNumber = self.pagesCount
        }
        self.scrollPageIntoView(pageNumber, dest)

        if (self.pdfHistory) {
          // Update the browsing history.
          self.pdfHistory.push({
            dest,
            hash: destString,
            page: pageNumber
          })
        }
      } else {
        self.pdfDocument.getPageIndex(destRef).then(function (pageIndex) {
          const pageNum = pageIndex + 1
          const cacheKey = destRef.num + ' ' + destRef.gen + ' R'
          self._pagesRefCache[cacheKey] = pageNum
          goToDestination(destRef)
        }).catch(error => console.log(error))
      }
    }

    let destinationPromise
    if (typeof dest === 'string') {
      destString = dest
      destinationPromise = this.pdfDocument.getDestination(dest)
    } else {
      destinationPromise = Promise.resolve(dest)
    }
    destinationPromise.then(function (destination) {
      dest = destination
      if (!(destination instanceof Array)) {
        return // invalid destination
      }
      goToDestination(destination[0])
    })
  }

  /**
   * @param   {object} dest The PDF destination object.
   * @returns {string}      The hyperlink to the PDF object.
   */
  getDestinationHash (dest) {
    if (typeof dest === 'string') {
      return this.getAnchorUrl('#' + encodeURIComponent(dest))
    }
    if (dest instanceof Array) {
      const destRef = dest[0] // see navigateTo method for dest format
      const pageNumber = destRef instanceof Object
        ? this._pagesRefCache[destRef.num + ' ' + destRef.gen + ' R']
        : (destRef + 1)

      if (pageNumber) {
        let pdfOpenParams = this.getAnchorUrl('#page=' + pageNumber)
        const destKind = dest[1]
        if (typeof destKind === 'object' && 'name' in destKind && destKind.name === 'XYZ') {
          // var scale = (dest[4] || this.pdfViewer.currentScaleValue);
          let scale = (dest[4] || 1) // default to 100%

          const scaleNumber = parseFloat(scale)
          if (scaleNumber) {
            scale = scaleNumber * 100
          }
          pdfOpenParams += '&zoom=' + scale
          if (dest[2] || dest[3]) {
            pdfOpenParams += ',' + (dest[2] || 0) + ',' + (dest[3] || 0)
          }
        }
        return pdfOpenParams
      }
    }
    return this.getAnchorUrl('')
  }

  /**
   * Prefix the full url on anchor links to make sure that links are resolved
   * relative to the current URL instead of the one defined in <base href>.
   * @param   {string} anchor The anchor hash, including the #.
   * @returns {string}        The hyperlink to the PDF object.
   */
  getAnchorUrl (anchor) {
    return (this.baseUrl || '') + anchor
  }

  /**
   * @param {string} hash
   */
  setHash (hash) {
    if (hash.indexOf('=') >= 0) {
      const params = parseQueryString(hash)
      // borrowing syntax from "Parameters for Opening PDF Files"
      if ('nameddest' in params) {
        if (this.pdfHistory) {
          this.pdfHistory.updateNextHashParam(params.nameddest)
        }
        this.navigateTo(params.nameddest)
        return
      }
      let pageNumber, dest
      if ('page' in params) {
        pageNumber = (params.page | 0) || 1
      }
      if ('zoom' in params) {
        // Build the destination array.
        const zoomArgs = params.zoom.split(',') // scale,left,top
        const zoomArg = zoomArgs[0]
        const zoomArgNumber = parseFloat(zoomArg)

        if (zoomArg.indexOf('Fit') === -1) {
          // If the zoomArg is a number, it has to get divided by 100. If it's
          // a string, it should stay as it is.
          dest = [
            null,
            { name: 'XYZ' },
            zoomArgs.length > 1 ? (zoomArgs[1] | 0) : null,
            zoomArgs.length > 2 ? (zoomArgs[2] | 0) : null,
            (zoomArgNumber ? zoomArgNumber / 100 : zoomArg)
          ]
        } else if (zoomArg === 'Fit' || zoomArg === 'FitB') {
          dest = [null, { name: zoomArg }]
        } else if ((zoomArg === 'FitH' || zoomArg === 'FitBH') ||
                              (zoomArg === 'FitV' || zoomArg === 'FitBV')) {
          dest = [
            null,
            { name: zoomArg },
            zoomArgs.length > 1 ? (zoomArgs[1] | 0) : null
          ]
        } else if (zoomArg === 'FitR') {
          if (zoomArgs.length !== 5) {
            console.error('PDFViewerLinkService_setHash: ' + 'Not enough parameters for \'FitR\'.')
          } else {
            dest = [
              null,
              { name: zoomArg },
              (zoomArgs[1] | 0),
              (zoomArgs[2] | 0),
              (zoomArgs[3] | 0),
              (zoomArgs[4] | 0)
            ]
          }
        } else {
          console.error('PDFViewerLinkService_setHash: \'' + zoomArg + '\' is not a valid zoom value.')
        }
      }

      if (pageNumber || dest) {
        this.scrollPageIntoView(pageNumber, dest)
      }

      if ('pagemode' in params) {
        // trigger page mode event (bookmarks, outline, thumbs, attachments or none)
        this.eventHub.trigger('viewer:sidebar:pagemode', params.pagemode)
      }
    } else if (/^\d+$/.test(hash)) { // page number
      this.scrollPageIntoView(hash)
    } else { // named destination
      if (this.pdfHistory) {
        this.pdfHistory.updateNextHashParam(decodeURIComponent(hash))
      }
      this.navigateTo(decodeURIComponent(hash))
    }
  }

  /**
   * @param {string} action
   */
  executeNamedAction (action) {
    // See PDF reference, table 8.45 - Named action
    switch (action) {
      case 'GoBack':
        if (this.pdfHistory) this.pdfHistory.back()
        break

      case 'GoForward':
        if (this.pdfHistory) this.pdfHistory.forward()
        break

      case 'NextPage':
        this.eventHub.trigger('viewer:document:next')
        break

      case 'PrevPage':
        this.eventHub.trigger('viewer:document:previous')
        break

      case 'LastPage':
        this.eventHub.trigger('viewer:document:last')
        break

      case 'FirstPage':
        this.eventHub.trigger('viewer:document:first')
        break

      case 'Print':
        this.eventHub.trigger('viewer:document:print')
        break

      default:
        break // No action according to spec
    }
  }

  /**
   * @param {number} pageNum page number.
   * @param {object} pageRef reference to the page.
   */
  cachePageRef (pageNum, pageRef) {
    const refStr = pageRef.num + ' ' + pageRef.gen + ' R'
    this._pagesRefCache[refStr] = pageNum
  }

  /**
   * Scrolls page into view.
   * @param {number}             pageNumber
   * @param {object[]|integer[]} [dest]     original PDF destination array: <page-ref> </XYZ|FitXXX> <args..>
   */
  scrollPageIntoView (pageNumber, dest) {
    if (!_.isNumber(pageNumber)) {
      pageNumber = dest instanceof Object ? this._pagesRefCache[dest.num + ' ' + dest.gen + ' R'] : (dest + 1)
    }

    if (_.isNumber(pageNumber)) {
      pageNumber = Math.min(Math.max(pageNumber, 1), this.pagesCount)
      this.eventHub.trigger('viewer:document:scrolltopage', pageNumber)
    }
  }
}

export default PDFViewerLinkService
