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

import '@/io.ox/core/pdf/pdfpolyfill'
import CustomStyle from '@/io.ox/core/pdf/pdfcustomstyle'
import * as PDFJSLib from 'pdfjs-dist/build/pdf'
import 'pdfjs-dist/build/pdf.worker'

// --------------------------
// - PDFTextLayerBuilder.js -
// --------------------------

const MAX_TEXT_DIVS_TO_RENDER = 100000

const NonWhitespaceRegexp = /\S/

function isAllWhitespace (str) {
  return !NonWhitespaceRegexp.test(str)
}

/**
 * @typedef {object} TextLayerBuilderOptions
 * @property {HTMLDivElement}    textLayerDiv   - The text layer container.
 * @property {number}            pageIndex      - The page index.
 * @property {PageViewport}      viewport       - The viewport of the text layer.
 * @property {PDFFindController} findController
 */

/**
 * TextLayerBuilder provides text-selection functionality for the
 * PDF. It does this by creating overlay divs over the PDF text.
 * These divs contain text that matches the PDF text they are
 * overlaying. This object also provides a way to highlight text
 * that is being searched for.
 *
 * @class
 */
const TextLayerBuilder = (function TextLayerBuilderClosure () {
  function TextLayerBuilder (options) {
    this.textLayerDiv = options.textLayerDiv
    this.renderingDone = false
    this.divContentDone = false
    this.pageIdx = options.pageIndex
    this.pageNumber = this.pageIdx + 1
    this.matches = []
    this.viewport = options.viewport
    this.textDivs = []
    this.findController = options.findController || null
  }

  TextLayerBuilder.prototype = {
    _finishRendering: function TextLayerBuilderFinishRendering () {
      this.renderingDone = true

      const event = document.createEvent('CustomEvent')
      event.initCustomEvent('textlayerrendered', true, true, {
        pageNumber: this.pageNumber
      })
      this.textLayerDiv.dispatchEvent(event)
    },

    renderLayer: function TextLayerBuilderRenderLayer () {
      const textLayerFrag = document.createDocumentFragment()
      const textDivs = this.textDivs
      const textDivsLength = textDivs.length
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // No point in rendering many divs as it would make the
      // browser
      // unusable even after the divs are rendered.
      if (textDivsLength > MAX_TEXT_DIVS_TO_RENDER) {
        this._finishRendering()
        return
      }

      let lastFontSize
      let lastFontFamily
      for (let i = 0; i < textDivsLength; i++) {
        const textDiv = textDivs[i]
        if (textDiv.dataset.isWhitespace !== undefined) {
          continue
        }

        const fontSize = textDiv.style.fontSize
        const fontFamily = textDiv.style.fontFamily

        // Only build font string and set to context if
        // different from last.
        if (fontSize !== lastFontSize || fontFamily !== lastFontFamily) {
          ctx.font = fontSize + ' ' + fontFamily
          lastFontSize = fontSize
          lastFontFamily = fontFamily
        }

        const width = ctx.measureText(textDiv.textContent).width
        if (width > 0) {
          textLayerFrag.appendChild(textDiv)
          let transform
          if (textDiv.dataset.canvasWidth !== undefined) {
            // Dataset values come of type string.
            const textScale = textDiv.dataset.canvasWidth / width
            transform = 'scaleX(' + textScale + ')'
          } else {
            transform = ''
          }
          const rotation = textDiv.dataset.angle
          if (rotation) {
            transform = 'rotate(' + rotation + 'deg) ' + transform
          }
          if (transform) {
            CustomStyle.setProp('transform', textDiv, transform)
          }
        }
      }

      this.textLayerDiv.appendChild(textLayerFrag)
      this._finishRendering()
      this.updateMatches()
    },

    /**
     * Renders the text layer.
     *
     * @param {number} [timeout] if specified, the rendering waits for specified amount of ms.
     */
    render: function TextLayerBuilderRender (timeout) {
      if (!this.divContentDone || this.renderingDone) {
        return
      }

      if (this.renderTimer) {
        clearTimeout(this.renderTimer)
        this.renderTimer = null
      }

      if (!timeout) { // Render right away
        this.renderLayer()
      } else { // Schedule
        const self = this
        this.renderTimer = setTimeout(function () {
          self.renderLayer()
          self.renderTimer = null
        }, timeout)
      }
    },

    appendText: function TextLayerBuilderAppendText (geom, styles) {
      const style = styles[geom.fontName]
      const textDiv = document.createElement('div')
      this.textDivs.push(textDiv)
      if (isAllWhitespace(geom.str)) {
        textDiv.dataset.isWhitespace = true
        return
      }
      const tx = PDFJSLib.Util.transform(this.viewport.transform, geom.transform)
      let angle = Math.atan2(tx[1], tx[0])
      if (style.vertical) {
        angle += Math.PI / 2
      }
      const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]))
      let fontAscent = fontHeight
      if (style.ascent) {
        fontAscent = style.ascent * fontAscent
      } else if (style.descent) {
        fontAscent = (1 + style.descent) * fontAscent
      }

      let left
      let top
      if (angle === 0) {
        left = tx[4]
        top = tx[5] - fontAscent
      } else {
        left = tx[4] + (fontAscent * Math.sin(angle))
        top = tx[5] - (fontAscent * Math.cos(angle))
      }
      textDiv.style.left = left + 'px'
      textDiv.style.top = top + 'px'
      textDiv.style.fontSize = fontHeight + 'px'
      textDiv.style.fontFamily = style.fontFamily

      textDiv.textContent = geom.str
      // |fontName| is only used by the Font Inspector. This
      // test will succeed
      // when e.g. the Font Inspector is off but the Stepper
      // is on, but it's
      // not worth the effort to do a more accurate test.
      if (PDFJSLib.pdfBug) {
        textDiv.dataset.fontName = geom.fontName
      }
      // Storing into dataset will convert number into string.
      if (angle !== 0) {
        textDiv.dataset.angle = angle * (180 / Math.PI)
      }
      // We don't bother scaling single-char text divs,
      // because it has very
      // little effect on text highlighting. This makes
      // scrolling on docs with
      // lots of such divs a lot faster.
      if (textDiv.textContent.length > 1) {
        if (style.vertical) {
          textDiv.dataset.canvasWidth = geom.height * this.viewport.scale
        } else {
          textDiv.dataset.canvasWidth = geom.width * this.viewport.scale
        }
      }
    },

    setTextContent: function TextLayerBuilderSetTextContent (textContent) {
      this.textContent = textContent

      const textItems = textContent.items
      for (let i = 0, len = textItems.length; i < len; i++) {
        this.appendText(textItems[i], textContent.styles)
      }
      this.divContentDone = true
    },

    convertMatches: function TextLayerBuilderConvertMatches (matches) {
      let i = 0
      let iIndex = 0
      const bidiTexts = this.textContent.items
      const end = bidiTexts.length - 1
      const queryLen = (this.findController === null
        ? 0
        : this.findController.state.query.length)
      const ret = []

      for (let m = 0, len = matches.length; m < len; m++) {
        // Calculate the start position.
        let matchIdx = matches[m]

        // Loop over the div indices.
        while (i !== end && matchIdx >= (iIndex + bidiTexts[i].str.length)) {
          iIndex += bidiTexts[i].str.length
          i++
        }

        if (i === bidiTexts.length) {
          console.error('Could not find a matching mapping')
        }

        const match = {
          begin: {
            divIdx: i,
            offset: matchIdx - iIndex
          }
        }

        // Calculate the end position.
        matchIdx += queryLen

        // Somewhat the same array as above, but use >
        // instead of >= to get
        // the end position right.
        while (i !== end && matchIdx > (iIndex + bidiTexts[i].str.length)) {
          iIndex += bidiTexts[i].str.length
          i++
        }

        match.end = {
          divIdx: i,
          offset: matchIdx - iIndex
        }
        ret.push(match)
      }

      return ret
    },

    renderMatches: function TextLayerBuilderRenderMatches (matches) {
      // Early exit if there is nothing to render.
      if (matches.length === 0) {
        return
      }

      const bidiTexts = this.textContent.items
      const textDivs = this.textDivs
      let prevEnd = null
      const pageIdx = this.pageIdx
      const isSelectedPage = (this.findController === null
        ? false
        : (pageIdx === this.findController.selected.pageIdx))
      const selectedMatchIdx = (this.findController === null
        ? -1
        : this.findController.selected.matchIdx)
      const highlightAll = (this.findController === null
        ? false
        : this.findController.state.highlightAll)
      const infinity = {
        divIdx: -1,
        offset: undefined
      }

      function beginText (begin, className) {
        const divIdx = begin.divIdx
        textDivs[divIdx].textContent = ''
        appendTextToDiv(divIdx, 0, begin.offset, className)
      }

      function appendTextToDiv (divIdx, fromOffset, toOffset, className) {
        const div = textDivs[divIdx]
        const content = bidiTexts[divIdx].str.substring(
          fromOffset, toOffset)
        const node = document.createTextNode(content)
        if (className) {
          const span = document.createElement('span')
          span.className = className
          span.appendChild(node)
          div.appendChild(span)
          return
        }
        div.appendChild(node)
      }

      let i0 = selectedMatchIdx; let i1 = i0 + 1
      if (highlightAll) {
        i0 = 0
        i1 = matches.length
      } else if (!isSelectedPage) {
        // Not highlighting all and this isn't the selected
        // page, so do nothing.
        return
      }

      for (let i = i0; i < i1; i++) {
        const match = matches[i]
        const begin = match.begin
        const end = match.end
        const isSelected = (isSelectedPage && i === selectedMatchIdx)
        const highlightSuffix = (isSelected
          ? ' selected'
          : '')

        if (this.findController) {
          this.findController.updateMatchPosition(
            pageIdx, i, textDivs, begin.divIdx,
            end.divIdx)
        }

        // Match inside new div.
        if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
          // If there was a previous div, then add the
          // text at the end.
          if (prevEnd !== null) {
            appendTextToDiv(prevEnd.divIdx,
              prevEnd.offset, infinity.offset)
          }
          // Clear the divs and set the content until the
          // starting point.
          beginText(begin)
        } else {
          appendTextToDiv(prevEnd.divIdx, prevEnd.offset,
            begin.offset)
        }

        if (begin.divIdx === end.divIdx) {
          appendTextToDiv(begin.divIdx, begin.offset,
            end.offset, 'highlight' + highlightSuffix)
        } else {
          appendTextToDiv(begin.divIdx, begin.offset,
            infinity.offset, 'highlight begin' + highlightSuffix)
          for (let n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
            textDivs[n0].className = 'highlight middle' + highlightSuffix
          }
          beginText(end, 'highlight end' + highlightSuffix)
        }
        prevEnd = end
      }

      if (prevEnd) {
        appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset)
      }
    },

    updateMatches: function TextLayerBuilderUpdateMatches () {
      // Only show matches when all rendering is done.
      if (!this.renderingDone) {
        return
      }

      // Clear all matches.
      const matches = this.matches
      const textDivs = this.textDivs
      const bidiTexts = this.textContent.items
      let clearedUntilDivIdx = -1

      // Clear all current matches.
      for (let i = 0, len = matches.length; i < len; i++) {
        const match = matches[i]
        const begin = Math.max(clearedUntilDivIdx, match.begin.divIdx)
        for (let n = begin, end = match.end.divIdx; n <= end; n++) {
          const div = textDivs[n]
          div.textContent = bidiTexts[n].str
          div.className = ''
        }
        clearedUntilDivIdx = match.end.divIdx + 1
      }

      if (this.findController === null || !this.findController.active) {
        return
      }

      // Convert the matches on the page controller into the
      // match format
      // used for the textLayer.
      this.matches = this.convertMatches(this.findController.pageMatches[this.pageIdx] || [])
      this.renderMatches(this.matches)
    }
  }
  return TextLayerBuilder
})()

export default TextLayerBuilder
