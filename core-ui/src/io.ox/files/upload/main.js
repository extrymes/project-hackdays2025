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
import Backbone from '@/backbone'

import filesAPI from '@/io.ox/files/api'
import ext from '@/io.ox/core/extensions'
import yell from '@/io.ox/core/yell'
import upload from '@/io.ox/core/tk/upload'

import gt from 'gettext'

const limits = [{
  limit: 1000,
  message (t) {
    // #. estimated upload duration
    return gt.ngettext('%1$d second', '%1$d seconds', t, t)
  }
},
{
  limit: 60,
  message (t) {
    // #. estimated upload duration
    return gt.ngettext('%1$d minute', '%1$d minutes', t, t)
  }
},
{
  limit: 60,
  message (t) {
    // #. estimated upload duration
    return gt.ngettext('%1$d hour', '%1$d hours', t, t)
  }
},
{
  limit: 24,
  message (t) {
    // #. estimated upload duration
    return gt.ngettext('%1$d day', '%1$d days', t, t)
  }
},
{
  limit: 7,
  message (t) {
    // #. estimated upload duration
    return gt.ngettext('%1$d week', '%1$d weeks', t, t)
  }
}
]
const UploadFile = Backbone.Model.extend({
  defaults: {
    file: null,
    progress: 0,
    request: null,
    loaded: 0,
    abort: false
  }
})
const UploadCollection = Backbone.Collection.extend({
  model: UploadFile
})

function FileUpload () {
  let totalProgressQueueLength = 0 // length of the upload file queue
  let totalSizeBytes = 0 // accumulated size of all files
  let uploadedBytes = 0 // number of bytes, which are currently uploaded
  let startTime // time stamp, when the first file started uploading
  const uploadCollection = new UploadCollection()
  let $el; let bottomToolbar; let mainView // some dom nodes needed for the view
  let api = filesAPI

  function handleFileUploadProgress (e, position, files, model) {
    // update progress
    const currentFileProgress = e.loaded / e.total
    // better use the provided file size and not 'loaded', or you'll have different 'units' when calculating totalSizeBytes
    const uploadedBytesCurrentFile = files[position].file.size * currentFileProgress
    if (model) {
      const loaded = model.get('loaded')
      model.set({ progress: currentFileProgress, loaded: uploadedBytesCurrentFile })
      // global
      uploadedBytes += uploadedBytesCurrentFile - loaded
    }
    // global
    totalProgressQueueLength = (position + currentFileProgress) / files.length

    // update uploaded size for time estimation
    uploadCollection.trigger('progress', {
      progress: totalProgressQueueLength,
      estimatedTime: getEstimatedTime(),
      filesLeft: files.length - position
    })
  }

  api.on('add:imp_version', function (title) {
    yell('info', gt('A new version for "%1$s" has been added.', title))
  })

  this.calculateTotalSize = function () {
    // update the total size for time estimation
    uploadCollection.each(function (model) {
      // only add files that were not added to the total size already, calculateTotalSize can be called multiple times
      if (!model.get('counted')) {
        model.set({ counted: true })
        totalSizeBytes += model.get('file').size
      }
    })
  }

  this.changed = function (item, position, files) {
    const uploadFiles = files.slice(uploadCollection.length, files.length)
      .map(function (fileContainer) {
        const data = { file: fileContainer.file, progress: 0 }
        if (fileContainer.options) {
          if (fileContainer.options.id) {
            data.id = fileContainer.options.id
          }
          data.newVersion = !!fileContainer.options.newVersion
        }
        return new UploadFile(data)
      })

    // setup initial time, if uploadCollection was empty
    if (uploadCollection.length === 0) {
      startTime = new Date().getTime()
    }
    uploadCollection.add(uploadFiles)

    this.calculateTotalSize()
  }

  this.progress = function (item, position, files) {
    const model = uploadCollection.at(position)
    let request

    if (model.get('newVersion')) {
      request = api.versions.upload({
        file: item.file,
        id: item.options.id,
        folder: item.options.folder,
        timestamp: _.then(),
        params: item.options.params,
        version_comment: item.options.version_comment
      })
    } else {
      request = api.upload(
        _.extend({ file: item.file }, item.options)
      )
    }

    request.progress(function (e) {
      handleFileUploadProgress(e, position, files, model)
    })
      .fail(function (e) {
        model.set({ abort: true })
        remove(model)

        if (e && e.data && e.data.custom && e.error !== '0 abort') {
          yell(e.data.custom.type, e.data.custom.text)
        }
      })

    uploadCollection.at(position).set({ request })

    return request
  }

  this.stop = function (file, position, files) {
    const requests = uploadCollection.pluck('request')
    totalSizeBytes = 0
    api.trigger('stop:upload', requests, files)
    api.trigger('refresh.all')
    totalProgressQueueLength = 0
    uploadedBytes = 0
    // set abort to true to remove all files from uploadview which have not been uploaded yet
    uploadCollection.each(function (model) {
      if (model.get('progress') !== 1) model.set('abort', true)
    })
    uploadCollection.reset()
  }

  this.getTotalProgress = function () {
    return totalProgressQueueLength
  }

  function getEstimatedTime () {
    const time = new Date().getTime() - startTime
    const progress = Math.min(1, uploadedBytes / totalSizeBytes)
    let estimation = time / progress - time || 0 // more or less time left
    let counter = 0

    do {
      estimation = Math.round(estimation / limits[counter].limit)
      counter++
    } while (counter < limits.length && limits[counter].limit < estimation)

    return (limits[counter - 1].message(estimation)) || 0
  }
  this.getEstimatedTime = getEstimatedTime

  this.abort = function (cid) {
    uploadCollection
      .filter(function (model) {
        if (model === undefined) return false
        if (cid === undefined) return true
        return model.cid === cid
      })
      .forEach(function (model) {
        const request = model.get('request')
        if (request === null) {
          // remove the model from the list
          model.set({ abort: true })
          remove(model)
        } else if (request.state() === 'pending') {
          // abort the upload process
          request.abort()
        }
      })
  }

  this.collection = uploadCollection
  uploadCollection
    .on('progress', function (baton) {
      const progressWrapper = $('.upload-wrapper')
      const progressBar = progressWrapper.find('.progress-bar')
      const progressText = progressWrapper.find('.sr-only')
      const val = Math.round(baton.progress * 100)

      progressBar
        .attr({ 'aria-valuenow': val })
        .css({ width: val + '%' })
      progressText.text(
        // #. %1$s progress of currently uploaded files in percent
        gt('%1$s completed', val + '%')
      )

      progressWrapper.find('.estimated-time').text(
        // #. %1$s remaining upload time
        gt('Remaining time: %1$s', baton.estimatedTime)
      )

      $('.upload-wrapper').find('.items-left').text(
        // #. number of left files to complete the upload
        gt('%1$s Files left', baton.filesLeft)
      )
    })
    .on('remove', function (model, collection, options) {
      queue.remove(options.index)
    })

  function remove (model) {
    uploadedBytes -= model.get('loaded')
    totalSizeBytes -= model.get('file').size
    uploadCollection.remove(model)
  }

  this.setWindowNode = function (node) {
    bottomToolbar = node.find('.toolbar.bottom')
    mainView = node.find('.list-view-control')
    if (mainView.length === 0) {
      mainView = node
    }
  }

  this.setAPI = function (alternativeAPI) {
    api = alternativeAPI
  }

  // this.create = this.update = upload.createQueue(this)
  const queue = upload.createQueue(this)
    .on('start', function () {
      mainView.addClass('toolbar-bottom-visible')
      $el = $('<div class="upload-wrapper">')
      ext.point('io.ox/files/upload/toolbar').invoke('draw', $el, ext.Baton({ fileupload: this }))
      bottomToolbar.append($el)
    }.bind(this))
    .on('progress', function (e, def, file, position, files) {
      $('.upload-wrapper').find('.file-name').text(
        // #. the name of the file, which is currently uploaded (might be shortended by '...' on missing screen space )
        gt('Uploading "%1$s"', file.file.name)
      )
    })
    .on('stop', function () {
      // if something went wrong before the start (filesize to big etc.) there is no $el
      if (mainView) { mainView.removeClass('toolbar-bottom-visible') }
      if ($el) { $el.remove() }
    })

  /**
     * Offer new file/s (version) to upload and trigger queueChanged.
     * @param {object|object[]} file/s to upload
     * @param {object} options add newVersion = true to upload a new file version
     */
  this.offer = queue.offer.bind(queue)

  /**
     * Fill queue with new file/s (version) to upload without trigger queueChanged.
     * @param {object|object[]} file/s to upload
     * @param {object} options add newVersion = true to upload a new file version
     */
  this.fillQueue = queue.fillQueue.bind(queue)

  /**
     * Trigger queue changed to start upload.
     */
  this.queueChanged = queue.queueChanged.bind(queue)

  /**
     * Validate files.
     * @param {object[]} newFiles
     * @param {object} options
     * @returns {jQuery.Deferred} deferred resolves or get's rejected with a list of error messages
     */
  this.validateFiles = queue.validateFiles.bind(queue)
}

/*
     * This extension point adds a toolbar, which displays the upload progess of all files.
     * If several files are loaded this toolbar provides links to open an overview of all currently uploaded files.
     */
ext.point('io.ox/files/upload/toolbar').extend({
  draw (baton) {
    this.append(
      $('<div class="upload-title">').append(
        $('<div class="time-container">').append(
          $('<span class="estimated-time">'),
          $('<span class="items-left">')
        ),
        $('<div class="file-name">')
      ),
      $('<div class="upload-details">').append(
        $('<a href=#>').text(gt('Details')).click(function (e) {
          e.preventDefault()

          import('@/io.ox/files/upload/view').then(function ({ default: uploadView }) {
            uploadView.show()
          })
        })
      ),
      $('<div class="upload-cancel">').append(
        $('<a href=#>').text(gt('Cancel')).click(function (e) {
          e.preventDefault()
          baton.fileupload.abort()
        })
      ),
      $('<div class="progress">').append(
        $('<div class="progress-bar progress-bar-striped active">')
          .attr({
            role: 'progressbar',
            'aria-valuenow': '0',
            'aria-valuemin': '0',
            'aria-valuemax': '100'
          })
          .css({ width: '0%' })
          .append(
            $('<span class="sr-only">').text(
              // #. %1$s progress of currently uploaded files in percent
              gt('%1$s completed', '0%')
            )
          )
      )
    )
  }
})

export default new FileUpload()
