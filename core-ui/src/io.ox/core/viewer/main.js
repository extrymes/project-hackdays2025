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

import ext from '@/io.ox/core/extensions'
import Capabilities from '@/io.ox/core/capabilities'
import Util from '@/io.ox/core/viewer/util'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'
import '@/io.ox/files/style.scss'
import '@/io.ox/core/viewer/style.scss'

/**
 * The OX Viewer component
 *
 * @constructor
 */
const Viewer = function () {
  /**
   * Launches the OX Viewer.
   *
   * @param {object}   data
   * @param {object[]} data.files                an array of plain file objects or FilesAPI file models, which should to be displayed in the Viewer
   * @param {object}   [data.selection]          a selected file, as a plain object. This is optional. The Viewer will start with the first file
   *                                             in the data.files Array if this parameter is omitted.
   * @param {jQuery}   [data.container]          a container element where the viewer element should be appended to. Defaults to #io-ox-core element.
   * @param {string}   [data.standalone = false] whether viewer should be launched in standalone mode.
   * @param {boolean}  [data.app]                a reference to an app object, from which this viewer is launched.
   * @param {object}   [data.opt]                a reference to an an options object that can be accessed in all subviews
   * @param {string}   [data.folder]             if you want to open all files in the folder with the current file selected you can pass a single file and a folder. the file will be selected first
   */
  this.launch = function (data) {
    Util.startPerformanceTimer()

    if (!data) return console.error('Core.Viewer.main.launch(): no data supplied')
    if (!hasFiles() && !loadFolderContent()) return console.error('Core.Viewer.main.launch(): no files to preview.')

    const self = this
    const el = $('<div class="io-ox-viewer abs">')
      .toggleClass('dark', !data.standalone)
      .css('zIndex', $.zIndex())
    const container = data.container || $('#io-ox-core')
    const printOverlay = $('<div class="viewer-print-overlay">').append(
      $('<div class="print-content">').append(
        $('<div>').append(createIcon('bi/file-earmark-image-fill.svg')),
        $('<div>').text(gt('Sorry, there is no preview available.')),
        $('<div>').text(gt('To print this file, please use "Print as PDF" in the viewer.'))
      )
    ).attr('aria-hidden', true)

    container.append(el)
    el.append(printOverlay)

    const siblings = el.siblings().each(function () {
      const $this = $(this)
      $this.data('ox-restore-aria-hidden', el.attr('aria-hidden'))
    }).attr('aria-hidden', true)

    function loadFolderContent () {
      // Bug 50839 - Viewer opens arbitrary document -> don't expand folder for sharing
      return (!_.isEmpty(data.folder) && (data.folder !== '10'))
    }

    function hasFiles () {
      return (_.isArray(data.files) && (data.files.length > 0))
    }

    function cont () {
      Util.logPerformanceTimer('launchContStart')

      // whether the files to display are shared
      function isSharing () {
        // check if the user is guest or anonymous guest
        if (Capabilities.has('guest')) { return true }
        // check for sharing folder
        if (data.folder === '10') { return true }
        if (self.fileCollection.first() && self.fileCollection.first().get('folder_id') === '10') { return true }

        return false
      }

      // resolve dependencies now for an instant response
      Promise.all([
        import('@/io.ox/core/viewer/backbone'),
        import('@/io.ox/core/viewer/views/mainview')
      ]).then(function ([{ default: backbone }, { default: MainView }]) {
        // create file collection and populate it with file models
        self.fileCollection = new backbone.Collection()
        self.fileCollection.reset(data.fileList, { parse: true })
        // set the index of the selected file (Drive only)
        if (data.selection) {
          self.fileCollection.setStartIndex(data.selection)
        } else if (loadFolderContent() && hasFiles()) {
          // workaround to set correct start file for deep linking, #58378
          self.fileCollection.setStartIndex(data.files[0])
        }
        // create main view and append main view to core
        self.mainView = new MainView({ collection: self.fileCollection, el, app: data.app, standalone: Boolean(data.standalone), opt: data.opt || {}, openedBy: data.openedBy, isSharing: isSharing() })

        self.mainView.on('dispose', close)

        self.mainView.viewerEvents.listenTo(self.mainView.viewerEvents, 'viewer:beforeclose', beforeClose)
      })
    }

    function beforeClose () {
      // Remove file decode parameters from file models once viewer closes
      self.fileCollection.each(function (model) {
        model.set('file_options', {})
      })
    }

    // Cleanup, remove hidden attributes
    function close () {
      Util.savePerformanceTimer(data)

      siblings.removeAttr('aria-hidden').each(function () {
        const el = $(this)
        if (el.data('ox-restore-aria-hidden')) el.attr('aria-hidden', el.data('ox-restore-aria-hidden'))
        el.removeData('ox-restore-aria-hidden')
      })
      // remove id form URL hash (see bug 43410)
      // use-case: viewer was opened via deep-link; a page-reload might surprise the user
      // but don't remove the id from an OX Presenter URL
      const appName = ox.ui.App.getCurrentApp()?.get('name') || ''
      if (!appName.startsWith('io.ox/office/')) {
        _.url.hash('id', null)
      }

      if (data.restoreFocus && _.isFunction(data.restoreFocus.focus)) {
        data.restoreFocus.focus()
      }

      // Aborted Guard Authentication.
      if (!self.mainView) {
        // Remove element since the MainView hasn't been initialized and won't remove it on dispose.
        $(el).remove()

        // And quit the popout Viewer app for the same reason.
        if (data.app && data.app.get('state') === 'running') {
          data.app.quit()
        }
      }
    }

    function getFileListFromFiles () {
      return $.when([].concat(data.files))
    }

    function getFileListFromDriveFolder () {
      return import('@/io.ox/files/api').then(function ({ default: FilesAPI }) {
        function waitForPoolReady (_pool) {
          const def = $.Deferred()
          if (_pool.complete === true) { return def.resolve(_pool) }

          FilesAPI.collectionLoader.collection.once('reset', function () {
            def.resolve(_pool)
          })

          return def
        }
        // wait that loading the drive list has been finished to reuse that data, the viewer has listeners that work directly on the model
        // note: the file to view first is already requested before when the viewer is launched by url hash
        return waitForPoolReady(FilesAPI.pool.get('detail')).then(function (pool) { return pool.models })
      })
    }

    // fix for #58378
    (loadFolderContent() ? getFileListFromDriveFolder() : getFileListFromFiles()).then(function (fileList) {
      // add file list to baton data
      data.fileList = fileList
      // Call extension point for any required performs, e.g. Guard authentication
      return ext.point('io.ox/core/viewer/main').cascade(this, new ext.Baton({ data }))
    }).then(cont, close)
  }
}

export default Viewer
