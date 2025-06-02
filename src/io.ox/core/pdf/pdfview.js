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

// cSpell:ignore childs
// TODO: Fix spelling in this file: The plural of child is children, not childs

import $ from '@/jquery'
import _ from '@/underscore'

import Util from '@/io.ox/core/viewer/util'
import PDFTextLayerBuilder from '@/io.ox/core/pdf/pdftextlayerbuilder'
import PDFAnnotationsLayerBuilder from '@/io.ox/core/pdf/pdfannotationslayerbuilder'
import '@/io.ox/core/pdf/pdfstyle.scss'

import gt from 'gettext'

const PDFPAGE_SCALING = 96.0 / 72.0

const MAX_DEVICE_PIXEL_RATIO = 2.0

const DEVICE_PIXEL_RATIO = (function () {
  let devicePixelRatio = 1

  if (('deviceXDPI' in screen) && ('logicalXDPI' in screen) && (screen.logicalXDPI > 0)) {
    // IE mobile or IE
    devicePixelRatio = screen.deviceXDPI / screen.logicalXDPI
    /* eslint no-prototype-builtins: "off" */
  } else if (window.hasOwnProperty('devicePixelRatio')) {
    // other devices
    devicePixelRatio = window.devicePixelRatio
  }
  return devicePixelRatio
})()

const DEVICE_PDFPAGE_SCALING = PDFPAGE_SCALING

const DEVICE_OUTPUTSCALING = Math.min(DEVICE_PIXEL_RATIO, MAX_DEVICE_PIXEL_RATIO)

// max size of canvas width & height
// https://github.com/mozilla/pdf.js/issues/2439
// http://stackoverflow.com/a/22345796/4287795
const MAXIMUM_SIDE_SIZE = (_.browser.iOS || _.browser.Android || _.browser.Safari) ? 2156 : 4096

/**
 * Queues the render calls for execution. The first call added
 * is the first one to be executed (first in, first out).
 * Waits after every render call an amount of 250ms before executing the next one.
 */
const handleRenderQueue = (function () {
  let lastDef = $.when()
  const queue = []

  return function (deferred) {
    // add the deferred to the end of the queue
    queue.push(deferred)

    lastDef = lastDef.then(function () {
      const def = $.Deferred()
      // remove the first deferred from the queue
      const queuedDef = queue.shift()

      queuedDef.resolve()
      setTimeout(function () {
        def.resolve()
      }, 250)

      return def
    })
  }
}())

/**
 * Returns true if the given size object has valid width and height attributes.
 *
 * @param  {object}  size The size object to check.
 * @return {boolean}      Whether the size object is valid.
 */
function isValidSize (size) {
  return (_.isObject(size) && _.isNumber(size.width) && _.isNumber(size.height))
}

// the conversion factors between pixels and other units
const FACTORS = {
  px: 1,
  pc: 9,
  pt: 3 / 4,
  in: 1 / 96,
  cm: 2.54 / 96,
  mm: 25.4 / 96
}

function parseCSSLength (text) {
  let value = parseFloat(text)
  if (!Number.isFinite(value)) { value = 0 }
  if (text.length > 2) { value /= (FACTORS[text.slice(-2)] || 1) }
  return Math.round(value)
}

// - class PDFView ---------------------------------------------------------

/**
 * The PDF view of a PDF document.
 *
 * @constructor
 *
 * @extends n/a
 * @param {PDFDocumentLoadingTask} pdfDocument
 */
function PDFView (pdfDocument, globalOptions) {
  const pageData = []

  let blockRenderCount = 0

  // ---------------------------------------------------------------------

  function getPageViewport (pdfjsPage, pageZoom) {
    return _.isObject(pdfjsPage) ? pdfjsPage.getViewport({ scale: PDFView.getAdjustedZoom(pageZoom) }) : null
  }

  function intersects (aFrom, aTo, bFrom, bTo) {
    return (aFrom >= bFrom && bTo >= aFrom) || (bFrom >= aFrom && aTo >= bFrom)
  }

  function updateLine (line, child, allLines) {
    if (!line) {
      line = { min: 99999999, max: 0, childs: [] }
      let lastLine = _.last(allLines)
      if (lastLine) {
        lastLine = _.last(lastLine.childs)
        lastLine.innerHTML = lastLine.innerHTML + '\r\n'
      }
      allLines.push(line)
    }
    const cV = parseCSSLength(child.style.top, 'px', 1)
    const cH = parseCSSLength(child.style.fontSize, 'px', 1)

    line.min = Math.min(line.min, cV)
    line.max = Math.max(line.max, cV + cH)
    const lastChild = _.last(line.childs)
    line.childs.push(child)

    if (lastChild) {
      const letter = parseCSSLength(lastChild.style.fontSize, 'px', 1)
      const dist = parseCSSLength(child.style.left, 'px', 1) - ($(lastChild).width() + parseCSSLength(lastChild.style.left, 'px', 1))
      if (dist < letter * 4) {
        lastChild.innerHTML = lastChild.innerHTML + ' '
      } else {
        lastChild.innerHTML = lastChild.innerHTML + '\t'
      }
    }
    return line
  }

  // ---------------------------------------------------------------------

  /**
   * prepares all absolute-positioned textelements for textselection
   * by setting zIndex, margin and padding
   */
  function prepareTextLayerForTextSelection (textWrapperNode) {
    if (textWrapperNode) {
      let pageChildren = textWrapperNode.children()
      const childrenCount = pageChildren.length
      // top right bottom left
      const margin = '-500px -2em 0 -10em'
      const padding = '+500px +2em 0 +10em'
      const origin = '10em 0 0'
      const lines = []
      let currentLine = null

      pageChildren.detach()

      _.each(pageChildren, function (child) {
        if (child.innerHTML.length === 1) {
          // workaround for infinite height selections
          child.style.transform = 'scaleX(1)'
        }

        const childMin = parseCSSLength(child.style.top, 'px', 1)
        const childMax = parseCSSLength(child.style.fontSize, 'px', 1) + childMin

        if (currentLine && !intersects(currentLine.min, currentLine.max, childMin, childMax)) {
          currentLine = null
        }
        currentLine = updateLine(currentLine, child, lines)
      })

      lines.sort(function (a, b) { return a.min - b.min })

      _.each(lines, function (line) {
        textWrapperNode.append(line.childs)
      })

      // much bigger element for a smooth forward selection!
      pageChildren = textWrapperNode.children()
      _.each(pageChildren, function (child, index) {
        // Non IPAD case
        if (!(_.device('touch') && _.browser.iOS && _.browser.Safari)) {
          child.style.margin = margin
          child.style.padding = padding
          child.style.transformOrigin = origin
        }
        child.style.zIndex = childrenCount - index
      })

      pageChildren.appendTo(textWrapperNode)

      textWrapperNode.append('<div style="bottom: 0; right: 0; padding: 200% 0 0 100%; cursor: default;">&#8203;</div>')
    }
  }

  // ---------------------------------------------------------------------

  /**
   * Returns the page data object for a page with a given page position.
   * If the page data doesn't exist, it is created
   *
   * @param   {number}   pagePos The 0-based index of the page
   * @returns {pageData}         The page's data object.
   */
  function getPageData (pagePos) {
    // create internal rendering data structure for every page node
    if (!pageData[pagePos]) {
      pageData[pagePos] = {}
    }

    return pageData[pagePos]
  }

  // methods ------------------------------------------------------------

  this.destroy = function () {
  }

  // ---------------------------------------------------------------------

  /**
   * There will be no rendering calls made/possible, if
   * rendering callbacks are set and as long  as resumeRendering
   * ultimately sets the internal semaphore back to 0.
   * A suspend call needs to be followed by a resume call
   * in standard use cases to reenable rendering again.
   * Calling this function increases the internal semaphore by 1.
   *
   */
  this.suspendRendering = function () {
    ++blockRenderCount
  }

  /**
   * Rendering calls are made/possible again, if rendering
   * callbacks are set and the internal semaphore reaches 0.
   * A resume call needs to be preceded by a suspend call
   * in standard use cases.
   * Calling this function decreases the internal semaphore by 1.
   */
  this.resumeRendering = function () {
    --blockRenderCount
  }

  /**
   * Returns the state of the the automatic rendering process.
   *
   * @returns  true, if the the rendering of pages is currently suspended,
   *           either by an external call to <code>suspendRendering</code> or by
   *           internal program logic
   */
  this.isRenderingSuspended = function () {
    return (blockRenderCount > 0)
  }

  /**
   * creates the necessary nodes to render a single PDF page
   *
   * @param   {jQuery.Node} parentNode    The parent node to be rendered within.
   * @param   {object}      options       Additional rendering options, defaulted by the global options.
   * @param   {number}      [pageNumber]  The 1-based page number.
   * @param   {number}      [pageZoom]    The page zoom level.
   * @param   {boolean}     [textOverlay] If true overlay divs over the PDF text are created
   *                                      to provide text-selection functionality for the PDF.
   * @returns {object}                    The page size object the page was rendered with.
   */
  function initPageNode (parentNode, options) {
    const opt = _.extend({}, globalOptions, options)
    let pageSize = opt.pageSize
    const pageNumber = opt.pageNumber
    const pageZoom = opt.pageZoom

    if (!isValidSize(pageSize)) {
      pageSize = _.isNumber(pageNumber) ? pdfDocument.getOriginalPageSize(pageNumber) : pdfDocument.getDefaultPageSize()
    }

    if (_.isNumber(pageZoom) && isValidSize(pageSize)) {
      pageSize = PDFView.getNormalizedSize({ width: pageSize.width * pageZoom, height: pageSize.height * pageZoom })
    }

    // set retrieved PDF page size as page node data and append correctly initialized canvas to given page node
    if (isValidSize(pageSize)) {
      const extentAttr = 'width="' + pageSize.width + '" height="' + pageSize.height + '" style="width:' + pageSize.width + 'px; height:' + pageSize.height + 'px"'
      const pageNode = $('<div class="pdf-page" ' + extentAttr + '>')
      const canvasWrapper = $('<div class="canvas-wrapper" ' + extentAttr + '>')

      pageNode.append(canvasWrapper.append($('<canvas ' + extentAttr + '>')))

      if (opt.textOverlay) {
        const textWrapper = $('<div class="text-wrapper user-select-text" ' + extentAttr + '>')
        pageNode.append(textWrapper)
      }

      $(parentNode).append(pageNode)
    }

    return pageSize
  }

  // ---------------------------------------------------------------------

  /**
   * Initializes the page contents in the passed page node.
   *
   * @param   {jQuery}         pageNode                 The target page node, as jQuery object.
   * @param   {number}         pageNumber               The one-based index of the page to be loaded.
   * @param   {object}         [options]                Optional parameters:
   * @param   {number}         [options.width]          If specified, the requested width of the image, in pixels. If
   *                                                    the option 'options.height' is specified too, the resulting
   *                                                    width may be less than this value.
   * @param   {number}         [options.height]         If specified, the requested height of the image, in pixels. If
   *                                                    the option 'options.width' is specified too, the resulting
   *                                                    height may be less than this value.
   * @param   {boolean}        [options.printing=false] Specifies if the page is to be rendered for printing or just viewing
   * @returns {boolean}                                 Whether the page has been loaded successfully.
   */
  this.loadPage = function (pageNode, pageNumber, options) {
    const pageSize = initPageNode(pageNode, { pageNumber, pageZoom: 1, ...options })
    if (!pageSize) {
      pageNode.append(
        $('<div>').addClass('error-message').text(gt('Sorry, this page is not available at the moment.'))
      )
    }
    return !!pageSize
  }

  /**
   * Returns zoom factor of the page
   *
   * @param   {number} pageNumber The 1-based page number of the page
   *
   * @returns {number}            The current pageZoom or 1.0, if no zoom has been set before
   */
  this.getPageZoom = function (pageNumber) {
    const curPageData = getPageData(pageNumber - 1)
    return _.isNumber(pageNumber) && curPageData.pageZoom ? curPageData.pageZoom : 1.0
  }

  /**
   * Recalculates the size of the passed page node, according to the
   * original page size and zoom factor.
   *
   * @param   {jQuery} pageNode The page node containing the contents.
   * @param   {number} pageZoom The new zoom factor, as floating point number (the value 1
   *                            represents the original page size).
   * @returns {Promise}         The promise of the rendering function, that is resolved, when
   *                            rendering is finshed.
   */
  this.setPageZoom = async function (pageNode, pageZoom) {
    // the page number
    const pageNumber = parseInt(pageNode.attr('data-page') || '', 10) || 1
    // the original size of the page
    const pageSize = pdfDocument.getOriginalPageSize(pageNumber)
    // the resulting width/height
    const width = Math.ceil(pageSize.width * pageZoom)
    const height = Math.ceil(pageSize.height * pageZoom)
    const newPageSize = { width, height }

    pageNode.css(newPageSize)

    // <canvas> element: render page into canvas and create text overlay
    try {
      await renderPage(pageNode, pageNumber, pageZoom)
      pageNode.css({ visibility: 'visible' })
    } catch {
    }
  }

  // ---------------------------------------------------------------------

  /**
   * Returns the size of the zoomed page in pixels
   *
   * @param   {number} pageNumber The 1-based page number of the page
   * @param   {number} [pageZoom] The optional zoom of the page for which the page size is to be calculated. If no pageZoom
   *                              is given, the current/last pageZoom is returned.
   * @returns {object}            The real size of the page in pixels (width, height), based on the original size and the pageZoom
   */
  this.getRealPageSize = function (pageNumber, pageZoom) {
    let pageSize = null
    const curPageZoom = _.isNumber(pageZoom) ? pageZoom : this.getPageZoom(pageNumber)
    if (_.isObject(pdfDocument)) {
      pageSize = _.isNumber(pageNumber)
        ? pdfDocument.getOriginalPageSize(pageNumber)
        : pdfDocument.getDefaultPageSize()
    }
    return _.isObject(pageSize) ? { width: Math.ceil(curPageZoom * pageSize.width), height: Math.ceil(curPageZoom * pageSize.height) } : { width: 0, height: 0 }
  }

  // ---------------------------------------------------------------------

  /**
   * Renders the PDF page
   *
   * @param   {HTMLElement}    parentNode The parent node to be rendered within.
   * @param   {number}         pageNumber The 1-based page number of the page to be rendered
   * @param   {number}         [pageZoom] The optional zoom for the current rendering. If not set, the previously set zoom
   *                                      is used for rendering. If no zoom has been set before, 1.0 is set as default zoom.
   * @returns {jQuery.Promise}            The promise of the rendering function, that is resolved, when rendering is finshed.
   */
  function renderPage (parentNode, pageNumber, pageZoom) {
    const def = $.Deferred()
    const pageNode = $(parentNode).children().eq(0)
    const pagePos = pageNumber - 1

    // create internal rendering data structure for every page node
    if (!pageData[pagePos]) {
      pageData[pagePos] = {}
    }

    // reset isInRendering flag after rendering is done or in failure case
    def.always(function () {
      if (pageData[pagePos]) {
        pageData[pagePos].isInRendering = null
      }
    })

    if (pageNode.length && !pageData[pagePos].isInRendering) {
      pageData[pagePos].curPageZoom = pageZoom
      pageData[pagePos].isInRendering = true

      const renderDef = $.Deferred()
      renderDef.done(function () {
        Util.logPerformanceTimer('pdfView:renderPDFPage_before_getPDFJSPage_' + pageNumber) // 250 ms time shift between two pages (see handleRenderQueue)
        pdfDocument.getPDFJSPage(pageNumber).then(function (pdfjsPage) {
          Util.logPerformanceTimer('pdfView:renderPDFPage_getPDFJSPage_then_handler_' + pageNumber) // typically this then-handler starts immediately
          if (pageNode.children().length) {
            const viewport = getPageViewport(pdfjsPage, pageZoom)
            const pageSize = PDFView.getNormalizedSize({ width: viewport.width, height: viewport.height })
            const scaledSize = { width: pageSize.width, height: pageSize.height }
            const canvasWrapperNode = pageNode.children('.canvas-wrapper')
            const canvasNode = canvasWrapperNode.children('canvas')
            const textWrapperNode = pageNode.children('.text-wrapper')
            let pdfTextBuilder = null
            let pdfAnnotationsBuilder = null
            const getScale = function (orgSize) {
              if (orgSize * DEVICE_OUTPUTSCALING > MAXIMUM_SIDE_SIZE) {
                return MAXIMUM_SIDE_SIZE / (orgSize * DEVICE_OUTPUTSCALING)
              }
              return DEVICE_OUTPUTSCALING
            }
            const xScale = getScale(scaledSize.width)
            const yScale = getScale(scaledSize.height)

            scaledSize.width *= xScale
            scaledSize.height *= yScale

            canvasNode.empty()

            pageNode.css(pageSize)
            pageNode.parent('.document-page').css(pageSize)
            canvasWrapperNode.attr(pageSize).css(pageSize)
            canvasNode.attr(scaledSize).css(pageSize)

            if (textWrapperNode.length) {
              textWrapperNode.empty().attr(pageSize).css(pageSize)

              pdfTextBuilder = new PDFTextLayerBuilder({
                textLayerDiv: textWrapperNode[0],
                viewport,
                pageIndex: pageNumber
              })
            }

            if (globalOptions.annotationsOverlay) {
              pdfAnnotationsBuilder = new PDFAnnotationsLayerBuilder({
                pageDiv: pageNode[0],
                pdfPage: pdfjsPage,
                linkService: globalOptions.linkService
              })

              pdfAnnotationsBuilder.render(viewport, 'display')
            }

            const canvasCtx = canvasNode[0].getContext('2d')

            canvasCtx._transformMatrix = [xScale, 0, 0, yScale, 0, 0]
            canvasCtx.scale(xScale, yScale)

            Util.logPerformanceTimer('pdfView:renderPDFPage_before_pdfjsPage_render_' + pageNumber)

            return pdfjsPage.render({
              canvasContext: canvasCtx,
              viewport
            }).promise.then(function () {
              Util.logPerformanceTimer('pdfView:renderPDFPage_pdfjsPage_render_then_handler_' + pageNumber) // after second long running process (pdfjsPage.render)
              if (pdfTextBuilder) {
                return pdfjsPage.getTextContent().then(function (pdfTextContent) {
                  pdfTextBuilder.setTextContent(pdfTextContent)
                  pdfTextBuilder.render()
                  prepareTextLayerForTextSelection(textWrapperNode)
                  return def.resolve()
                })
              }
              def.resolve()
            })
          }
          return def.reject()
        })
      })
      handleRenderQueue(renderDef)
    } else {
      def.reject()
    }

    return def.promise()
  }
} // class PDFView

// ---------------------------------------------------------------------

PDFView.getAdjustedZoom = function (zoom) {
  return (_.isNumber(zoom) ? zoom * DEVICE_PDFPAGE_SCALING : 1.0)
}

// ---------------------------------------------------------------------

PDFView.getNormalizedSize = function (size) {
  return isValidSize(size) ? { width: Math.ceil(size.width), height: Math.ceil(size.height) } : null
}

// exports ================================================================

export default PDFView
