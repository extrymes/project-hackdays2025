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

/*
 * https://github.com/remy/polyfills
 * dataset.js
 * License: http://rem.mit-license.org
 */
import _ from '@/underscore'
(function () {
  const forEach = [].forEach
  const regex = /^data-(.+)/
  const dashChar = /-([a-z])/ig
  const el = document.createElement('div')
  let mutationSupported = false

  function detectMutation () {
    mutationSupported = true
    this.removeEventListener('DOMAttrModified', detectMutation, false)
  }

  function toCamelCase (s) {
    return s.replace(dashChar, function (m, l) { return l.toUpperCase() })
  }

  function updateDataset () {
    const dataset = {}
    forEach.call(this.attributes, function (attr) {
      const match = attr.name.match(regex)
      if (match) {
        dataset[toCamelCase(match[1])] = attr.value
      }
    })
    return dataset
  }

  // only add support if the browser doesn't support data-* natively
  if (el.dataset !== undefined) return

  el.addEventListener('DOMAttrModified', detectMutation, false)
  el.setAttribute('foo', 'bar')

  function defineElementGetter (obj, prop, getter) {
    if (Object.defineProperty) {
      Object.defineProperty(obj, prop, {
        get: getter
      })
    } else {
      obj.__defineGetter__(prop, getter)
    }
  }

  if (mutationSupported) {
    defineElementGetter(Element.prototype, 'dataset', function () {
      if (!this._datasetCache) {
        this._datasetCache = updateDataset.call(this)
      }
      return this._datasetCache
    })
  } else {
    defineElementGetter(Element.prototype, 'dataset', mutationSupported, updateDataset)
  }

  document.addEventListener('DOMAttrModified', function (event) {
    delete event.target._datasetCache
  }, false)
})()

if (window.CanvasPixelArray && window.CanvasPixelArray.prototype && !window.CanvasPixelArray.prototype.set) {
  window.CanvasPixelArray.prototype.set = function () {
    return this
  }
}

(function () {
  // override drawImage on desktop and mobile Safari
  if (_.device('safari')) {
    const origDrawImage = window.CanvasRenderingContext2D.prototype.drawImage

    window.CanvasRenderingContext2D.prototype.drawImage = function () {
      try {
        return origDrawImage.apply(this, arguments)
      } catch (e) {
        console.info('Canvas drawImage() call FAILED', e)
      }
    }
  }
})()
