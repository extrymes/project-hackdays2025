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
import BaseView from '@/io.ox/core/viewer/views/types/baseview'
import Ext from '@/io.ox/core/extensions'

import gt from 'gettext'

// The delay between invoking show() and launching the Spreadsheet app
const APP_LAUNCH_DELAY = 500
// The delay for the prefetch call to the REST service
const PREFETCH_DELAY = 1000
// The name of the document filter server module.
const FILTER_MODULE_NAME = 'oxodocumentfilter'

/**
 * The spreadsheet file type.
 * Uses OX Spreadsheet to display the spreadsheet preview.
 * Implements the ViewerType interface.
 *
 * @interface ViewerType (render, prefetch, show, unload)
 *
 */
const SpreadsheetView = BaseView.extend({

  initialize (options) {
    _.extend(this, options)

    this.isPrefetched = false
    this.documentContainer = null
    this.appLaunchDelayId = null
    this.spreadsheetApp = null

    // in popout mode the (plugged) documents app needs to be quit before the popout Viewer app
    this.listenToOnce(this.viewerEvents, 'viewer:beforeclose', this.onDispose)
  },

  /**
   * Invokes the passed callback immediately, if the wrapped spreadsheet
   * application is valid (exists, and is not shutting down).
   *
   * @param {Function} callback
   */
  withValidApp (callback) {
    if (!this.disposed && this.spreadsheetApp && this.spreadsheetApp.isInQuit && !this.spreadsheetApp.isInQuit()) {
      callback.call(this, this.spreadsheetApp)
    }
  },

  /**
   * Displays an error notification
   *
   * @param {string} message The error message to show.
   */
  showLoadError (message) {
    if (this.disposed) { return }

    this.displayDownloadNotification(message || gt('An error occurred loading the document so it cannot be displayed.'))
    this.documentContainer = null
  },

  /**
   * Creates and renders the spreadsheet slide.
   *
   * @returns {Backbone.View} the SpreadsheetView instance.
   */
  render () {
    this.documentContainer = $('<div class="viewer-document-container viewer-displayer-spreadsheet">')

    this.$el.empty().append(this.documentContainer).addClass('exclude-dark')

    return this
  },

  /**
   * "Prefetches" the spreadsheet slide.
   * In order to save memory and network bandwidth only documents with highest prefetch priority are prefetched.
   *
   * @param   {object}        options Optional parameters (options.priority):
   * @returns {Backbone.View}         A reference to this SpreadsheetView instance.
   */
  prefetch (options) {
    // check for highest prefetch priority and Drive files only
    if (options && options.priority === 1 && !this.disposed && this.model.isFile()) {
      // the params for the prefetch call to the REST service
      const params = { action: 'getoperations', subaction: 'prefetch', session: ox.session, id: this.model.get('id'), folder_id: this.model.get('folder_id') }
      // the resulting URL
      const url = ox.apiRoot + '/' + FILTER_MODULE_NAME + '?' + _.map(params, function (value, name) { return name + '=' + encodeURIComponent(value) }).join('&')

      _.delay(function () {
        $.ajax({
          url,
          dataType: 'text'
        })
      }, PREFETCH_DELAY)

      this.isPrefetched = true
    }
    return this
  },

  /**
   * "Shows" the spreadsheet slide.
   *
   * @returns {Backbone.View} the SpreadsheetView instance.
   */
  show () {
    const self = this

    // check if documentContainer has been replaced with an error node
    if (!this.documentContainer) { return }

    // ignore already loaded documents
    if (this.documentContainer.children().length > 0) { return }

    function launchApplication (model) {
      // fail safety: check for early exit of the viewer
      if (self.disposed) { return $.Deferred().reject() }

      // invoke the extension point to launch the embedded spreadsheet application
      const point = Ext.point('io.ox/office/spreadsheet/viewer/load/drive')
      const baton = new Ext.Baton({ data: model, page: self.documentContainer })
      const result = point.invoke('launch', self, baton)

      // `point.invoke()` returns an array of promises
      return (result && _.isArray(result._wrapped)) ? result._wrapped[0] : $.Deferred().reject()
    }

    function onLaunchSuccess (spreadsheetApp) {
      self.spreadsheetApp = spreadsheetApp

      // hide busy spinner
      if (!self.disposed) { self.$el.idle() }

      // wait until the Documents part (class `BaseApplication` and beyond) is added to the app
      self.spreadsheetApp.onInit(function () {
        function listenToWithValidApp (source, type, callback) {
          self.spreadsheetApp.waitForImportSuccess(function () {
            self.listenTo(source, type, self.withValidApp.bind(self, callback))
          })
        }

        // register event handlers
        listenToWithValidApp(self.viewerEvents, 'viewer:resize', function () {
          const view = self.spreadsheetApp.getView()
          if (view && _.isFunction(view.refreshPaneLayout)) { view.refreshPaneLayout() }
        })
        listenToWithValidApp(self.viewerEvents, 'viewer:zoom:in', function () { self.spreadsheetApp.getController().executeItem('view/zoom/inc') })
        listenToWithValidApp(self.viewerEvents, 'viewer:zoom:out', function () { self.spreadsheetApp.getController().executeItem('view/zoom/dec') })

        // ensure that the wrapped spreadsheet application window is shown along with the Preview app window
        if (self.app) {
          listenToWithValidApp(self.app.getWindow(), 'show', function () {
            self.spreadsheetApp.getWindow().show(null, true)
          })
        }

        // ensure that the Preview app window is hidden along with the wrapped spreadsheet application window
        self.spreadsheetApp.getWindow().on('hide', function () {
          if (self.app && !self.disposed) { self.app.getWindow().hide() }
        })

        // show error message if importing the document fails
        self.spreadsheetApp.waitForImportFailure(function (_finished, error) {
          self.showLoadError(error.message)
        })
      })
    }

    // show busy spinner
    this.$el.busy()
    // clear previous timeout
    if (this.appLaunchDelayId) { window.clearTimeout(this.appLaunchDelayId) }
    // init spreadsheet app launch delay timer
    this.appLaunchDelayId = window.setTimeout(function () {
      self.appLaunchDelayId = null

      launchApplication(self.model).then(onLaunchSuccess, self.showLoadError.bind(self))
    }, APP_LAUNCH_DELAY)

    return this
  },

  /**
   * "Unloads" the spreadsheet slide.
   *
   * @returns {Backbone.View} the SpreadsheetView instance.
   */
  unload () {
    const self = this

    // reset launch delay timer
    if (this.appLaunchDelayId) {
      window.clearTimeout(this.appLaunchDelayId)
      this.appLaunchDelayId = null
    }

    // quit app if running
    this.withValidApp(function (app) {
      app.quit().then(function () {
        self.spreadsheetApp = null
      })
    })

    this.isPrefetched = false

    return this
  },

  /**
   * Destructor function of this view.
   */
  onDispose () {
    if (this.disposed) return
    if (ox.tabHandlingEnabled) { this.disposed = true }
    this.unload()
    this.off().stopListening()
    if (!ox.tabHandlingEnabled) { this.disposed = true }
    this.documentContainer = null
  }

})

// returns an object which inherits BaseView
export default SpreadsheetView
