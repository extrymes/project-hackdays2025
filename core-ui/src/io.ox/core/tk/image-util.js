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
import exifread from '@/io.ox/contacts/widgets/exif'

function onMessage (e) {
  try {
    self[e.data.name](e.data.args, function (error, result) {
      if (error) return self.postMessage({ id: e.data.id, error })
      self.postMessage({ id: e.data.id, result })
    })
  } catch (error) {
    self.postMessage({ id: e.data.id, error: error.toString() })
  }
}

function PromiseWorker (obj) {
  const URL = window.URL || window.webkitURL
  const args = _(obj).map(function (value, key) {
    const content = value.toString()
    const name = value.name || (content.match(/^function\s*([^\s(]+)/) || [])[1]
    if (!name || name === key) return 'var ' + key + ' = ' + content
    return 'var ' + key + ' = ' + name + ' = ' + content
  })
  const script = args.join('\n') + '\n' + 'self.onmessage = ' + onMessage.toString()
  let blob

  try {
    blob = new Blob([script], { type: 'application/javascript' })
  } catch (e) {
    // fallback to BlobBuilder, especially for mobile browsers
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
    blob = new window.BlobBuilder()
    blob.append(script)
    blob = blob.getBlob()
  }
  this.promises = {}
  this.worker = new Worker(URL.createObjectURL(blob))
  this.worker.addEventListener('message', function (e) {
    const data = e.data
    const id = data.id
    if (!this.promises[id]) return
    if (data.error) this.promises[id].reject(data.error)
    else this.promises[id].resolve(data.result)
    delete this.promises[id]
  }.bind(this))
}

_.extend(PromiseWorker.prototype, {
  invoke (name, args) {
    const id = _.uniqueId()
    this.promises[id] = new $.Deferred()
    this.worker.postMessage({ id, name, args })
    return this.promises[id].promise()
  }
})

export default {

  PromiseWorker,

  getImageFromFile: (function () {
    function readFile (file, callback) {
      const fileReader = new FileReader()
      fileReader.onload = function () {
        callback(null, fileReader.result)
      }
      fileReader.onerror = callback
      fileReader.readAsDataURL(file)
    }

    function getImageFallback (fileReaderResult, callback) {
      const img = new Image()
      img.onload = function () {
        callback(null, img)
      }
      img.onerror = callback
      img.src = fileReaderResult
    }

    function getImage (file, callback) {
      self.createImageBitmap(file).then(function (img) {
        callback(null, img)
      }, function (error) {
        callback(error)
      })
    }

    function detectModernBrowser () {
      // skip exif handling for modern browsers
      return _.browser.chrome >= 81 || _.browser.firefox >= 77
    }

    const worker = new PromiseWorker({ getImage, readFile })
    let cache = []

    return function getImageFromFile (file, opt) {
      opt = _.extend({ exif: false }, opt)

      if (detectModernBrowser()) opt.exif = false

      let promise = _(cache).find(function (obj) {
        if (obj.file !== file) return false
        if (opt.exif && !obj.exif) return false
        return true
      })

      const badBrowserVersion = (_.browser.chrome && _.browser.chrome >= 77) || _.browser.safari

      // early exit if image is in cache
      if (promise) return promise.promise

      if (!opt.exif && self.createImageBitmap) {
        promise = badBrowserVersion ? createImageBitmap(file) : worker.invoke('getImage', file)
      } else {
        let exif
        promise = worker.invoke('readFile', file).then(function (result) {
          if (opt.exif) exif = exifread.getOrientation(result)

          if (self.createImageBitmap) return badBrowserVersion ? createImageBitmap(file) : worker.invoke('getImage', file)

          const def = new $.Deferred()
          getImageFallback(result, function (error, size) {
            if (error) def.reject(error)
            def.resolve(size)
          })
          return def
        }).then(function (img) {
          if (exif) img.exif = exif
          return img
        })
      }

      // store in cache for 10 seconds
      const obj = { file, exif: opt.exif, promise }
      _.delay(function () {
        cache = _(cache).without(obj)
      }, 10000)
      cache.push(obj)

      return promise
    }
  }())

}
