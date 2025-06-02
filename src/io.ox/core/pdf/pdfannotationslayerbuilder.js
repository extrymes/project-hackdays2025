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
import SimpleLinkService from '@/io.ox/core/pdf/pdfsimplelinkservice'
import * as PDFJSLib from 'pdfjs-dist/build/pdf'
import 'pdfjs-dist/build/pdf.worker'

const mozL10n = document.mozL10n || document.webL10n

/**
 * @typedef  {object} AnnotationsLayerBuilderOptions
 * @property {HTMLDivElement}  pageDiv
 * @property {PDFPage}         pdfPage
 * @property {IPDFLinkService} linkService
 */

/**
 * @class
 */
const AnnotationLayerBuilder = (function AnnotationLayerBuilderClosure () {
  /**
   * @param {AnnotationLayerBuilderOptions} options
   * @constructs AnnotationLayerBuilder
   */
  function AnnotationLayerBuilder (options) {
    this.pageDiv = options.pageDiv
    this.pdfPage = options.pdfPage
    this.linkService = options.linkService || new SimpleLinkService()
    this.div = null
    this.annotationLayer = {}
  }

  AnnotationLayerBuilder.prototype = /** @lends AnnotationLayerBuilder.prototype */ {

    /**
     * @param {PageViewport} viewport
     * @param {string}       intent   (default value is 'display')
     */
    render: function AnnotationLayerBuilderRender (viewport, intent) {
      const self = this
      let parameters = {
        intent: (intent === undefined ? 'display' : intent)
      }

      this.pdfPage.getAnnotations(parameters).then(function (annotations) {
        viewport = viewport.clone({ dontFlip: true }) // cSpell:disable-line
        parameters = {
          viewport,
          div: self.div,
          annotations,
          page: self.pdfPage,
          linkService: self.linkService,
          // Path for image resources, mainly for annotation icons. Include trailing slash.
          imageResourcesPath: './pdfjs/web/images/'
        }

        if (self.div) {
          // If an annotationLayer already exists, refresh its children's
          // transformation matrices.
          self.annotationLayer.update(parameters)
        } else {
          // Create an annotation layer div and render the annotations
          // if there is at least one annotation.
          if (annotations.length === 0) {
            return
          }

          self.div = document.createElement('div')
          self.div.className = 'annotationLayer'
          self.pageDiv.appendChild(self.div)

          self.annotationLayer = new PDFJSLib.AnnotationLayer({
            div: self.div,
            page: parameters.page,
            viewport
          })
          self.annotationLayer.render(parameters)

          if (typeof mozL10n !== 'undefined') {
            mozL10n.translate(self.div)
          }
        }
      })
    },

    hide: function AnnotationLayerBuilderHide () {
      if (!this.div) {
        return
      }
      this.div.setAttribute('hidden', 'true')
    }
  }

  return AnnotationLayerBuilder
})()

export default AnnotationLayerBuilder
