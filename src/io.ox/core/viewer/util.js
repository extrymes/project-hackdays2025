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
import $ from '@/jquery'
import ox from '@/ox'

import apps from '@/io.ox/core/api/apps'
import Capabilities from '@/io.ox/core/capabilities'
import http from '@/io.ox/core/http'

import gt from 'gettext'
import settings from '@/io.ox/mail/accounts/settings'

// video: 'file-video',
// audio: 'file-audio',

// whether the loading performance of the viewer shall be measured
let logPerformance = false
// a global timer that can be used for performance debugging
let performanceTimer = null
// object for logging several time stamps
let performanceLogger = null
// key to recognize the text application
const textKey = 'io.ox/office/text/main'
// key to recognize the presentation application
const presentationKey = 'io.ox/office/presentation/main'
// key to recognize the spreadsheet application
const spreadsheetKey = 'io.ox/office/spreadsheet/main'
// whether at least one office application is installed
const officeInstalled = !!(apps && (apps.has(textKey) || apps.has(presentationKey) || apps.has(spreadsheetKey)))

const Util = {}

// constants --------------------------------------------------------------
/**
 * Maps the file categories of the OX Viewer model to Font Awesome icon classes.
 */
Util.CATEGORY_ICON_MAP = {
  file: 'bi/file-earmark.svg',
  txt: 'bi/file-earmark-text.svg',
  doc: 'bi/file-earmark-word.svg',
  ppt: 'bi/file-earmark-ppt.svg',
  xls: 'bi/file-earmark-excel.svg',
  image: 'bi/file-earmark-image.svg',
  video: 'bi/file-earmark-play.svg',
  audio: 'bi/file-earmark-music.svg',
  pdf: 'bi/file-earmark-pdf.svg'
}

// static methods ---------------------------------------------------------

/**
 * Shortens a String and returns a result object containing the original
 * and two Strings clipped to normal and short max length.
 *
 * @param   {string} str                          The input String.
 * @param   {object} options                      Additional parameters
 * @param   {number} [options.maxNormal = 40]     The max length for the String clipped to normal length.
 * @param   {number} [options.maxShort = 26]      The max length for the String clipped to short length.
 * @param   {string} [options.charpos = 'middle'] The position of the ellipsis char, 'end' or 'middle'.
 * @param   {string} [options.char = '\u2026']    The ellipsis char.
 * @returns {object}                              {String} title: the original or an empty String
 *                                                {String} data-label-normal: the String clipped to normal length
 *                                                {String} data-label-short: the String clipped to short length
 */
Util.getClippedLabels = function (str, options) {
  const opt = _.extend({
    maxNormal: 40,
    maxShort: 26,
    charpos: 'middle'
  }, options || {})

  const text = String(str || '').trim()

  const normal = _.ellipsis(text, _.extend(opt, { max: opt.maxNormal }))
  const short = _.ellipsis(text, _.extend(opt, { max: opt.maxShort }))

  return {
    title: text,
    'aria-label': text,
    'data-label-normal': normal,
    'data-label-short': short
  }
}

/**
 * Set a clipped label and the title to the given node according to the device type.
 *
 * Shortens a String and returns a result object containing the original
 * and two clipped Strings.
 *
 * @param {jQuery|DOM} node                 The node to be labeled.
 * @param {string}     str                  The label String.
 * @param {string}     [charpos = 'middle'] The position of the ellipsis char, 'middle' or 'end'.
 */
Util.setClippedLabel = function (node, str, charpos) {
  const attr = Util.getClippedLabels(str, charpos)

  node = (node instanceof $) ? node : $(node)
  node.attr(attr).addClass('viewer-responsive-label')
}

/**
 * Sets a CSS to indicate if current device is a 'smartphone' or 'tablet'
 * to the given DOM node.
 *
 * @param {jQuery|DOM} node The node to be labeled.
 */
Util.setDeviceClass = function (node) {
  node = (node instanceof $) ? node : $(node)
  if (_.device('smartphone')) return node.addClass('smartphone')
  if (_.device('tablet')) return node.addClass('tablet')
}

/**
 * Returns the Font Awesome icon class for the file category of the
 * given OX Viewer model.
 *
 * @param   {FilesAPI.Model} model the Drive file model.
 * @returns {string}               The Font Awesome icon class String.
 */
Util.getIcon = function (model) {
  if (!model) {
    return Util.CATEGORY_ICON_MAP.file
  }
  const fileType = model.getFileType()
  const icon = Util.CATEGORY_ICON_MAP[fileType] || Util.CATEGORY_ICON_MAP.file

  return icon
}

/**
 * Detect visible nodes from given nodes array.
 *
 * @returns {integer[]} an array of indices of visible nodes.
 */
Util.getVisibleNodes = function (nodes) {
  const visibleNodes = []
  // Whether the page element is visible in the viewport, wholly or partially.
  function isNodeVisible (node) {
    const nodeBoundingRect = node.getBoundingClientRect()
    function isInWindow (verticalPosition) {
      return verticalPosition >= 0 && verticalPosition <= window.innerHeight
    }
    return isInWindow(nodeBoundingRect.top) ||
                isInWindow(nodeBoundingRect.bottom) ||
                (nodeBoundingRect.top < 0 && nodeBoundingRect.bottom > window.innerHeight)
  }
  // return the visible pages
  _.each(nodes, function (element, index) {
    if (!isNodeVisible(element)) { return }
    visibleNodes.push(index + 1)
  })
  return visibleNodes
}

Util.createAbortableDeferred = function (abortFunction) {
  return _.extend($.Deferred(), {
    abort: abortFunction
  })
}

Util.renderItemSize = function (model) {
  let fileSize, itemCount, resultString

  // for files
  if (model.isFile() || model.isComposeAttachment() || model.isMailAttachment() || model.isPIMAttachment()) {
    fileSize = model.get('file_size')
    resultString = (_.isNumber(fileSize)) ? _.filesize(fileSize) : '-'

    // for folders
  } else {
    itemCount = model.get('total')
    resultString = _.isNumber(itemCount) ? gt.ngettext('%1$d item', '%1$d items', itemCount, itemCount) : '-'
  }

  return resultString
}

const ModelSourceRefMap = {
  // drive: 'io.ox/files/actions/download',
  drive: 'io.ox/files/actions/downloadversion',
  mail: 'io.ox/mail/attachment/actions/download',
  compose: 'io.ox/mail/compose/actions/download',
  pim: 'io.ox/core/tk/actions/download-attachment',
  guardDrive: 'oxguard/download'
}

Util.getRefByModelSource = function (app) {
  return ModelSourceRefMap[app]
}

/**
 * Restricts the passed value to the specified numeric range.
 *
 * @param   {number} value The value to be restricted to the given range.
 * @param   {number} min   The lower border of the range.
 * @param   {number} max   The upper border of the range.
 * @returns {number}       The passed value, if inside the given range, otherwise either the lower or upper border.
 */
Util.minMax = function (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// debugging --------------------------------------------------------------

// empty default debug functions
// -> these functions will be overwritten, if property is available and set
Util.startPerformanceTimer = $.noop
Util.logPerformanceTimer = $.noop
Util.addToPerformanceLogger = $.noop
Util.addDefaultPerformanceInfo = $.noop
Util.savePerformanceTimer = $.noop

// check if the property 'logPerformanceData' is set for logging performance data
// of the editors and the viewer. This property is set in the 'office' module.
// Therefore it can only be queried, if at least one office application is installed.

if (officeInstalled) {
  // check if the capability for at least one office application is specified
  const isOfficeEnabled = Capabilities.has('text') || Capabilities.has('spreadsheet') || Capabilities.has('presentation')

  if (isOfficeEnabled) {
    // office is installed and enabled -> now office settings can be required
    import('$/io.ox/office/settings').then(({ settings }) => settings.ensureData()).then(function () {
      // if office is installed and enabled the property can be checked
      logPerformance = settings.get('module/logPerformanceData', false)

      if (logPerformance) {
        /**
         * Starting the performance timer.
         */
        Util.startPerformanceTimer = function () {
          performanceLogger = {}
          performanceTimer = _.now()
        }

        /**
         * Logging info with the performance timer.
         *
         * @param {string} key A message that is saved at the performance timer.
         */
        Util.logPerformanceTimer = function (key) {
          if (performanceTimer) { Util.addToPerformanceLogger(key, (_.now() - performanceTimer)) }
        }

        /**
         * Adding one key-value pair to the performance logger object.
         *
         * @param {string} key   The key for the performance logger object.
         * @param {any}    value The value for the performance logger object.
         */
        Util.addToPerformanceLogger = function (key, value) {
          if (performanceLogger) { performanceLogger[key] = value }
        }

        /**
         * Adding some default information about browser, appsuite version, ...
         * to the performance data.
         *
         * @param {object} [data] The data object given to the launcher of the OX Viewer.
         */
        Util.addDefaultPerformanceInfo = function (data) {
          Util.addToPerformanceLogger('user-agent', navigator.userAgent)
          Util.addToPerformanceLogger('platform', navigator.platform)
          Util.addToPerformanceLogger('user', ox.user)
          Util.addToPerformanceLogger('version', ox.version)
          Util.addToPerformanceLogger('server', ox.abs)
          Util.addToPerformanceLogger('application', 'viewer')
          Util.addToPerformanceLogger('filename', (data && data.selection && data.selection.filename) ? data.selection.filename : '')
        }

        /**
         * Saving the collected performance data and sending them to the server.
         *
         * @param   {object}         [data] The data object given to the launcher of the OX Viewer.
         * @returns {jQuery.Promise}        The promise from the http request. If no request is made, the promise is already resolved.
         */
        Util.savePerformanceTimer = function (data) {
          let httpPromise = null

          if (performanceTimer && performanceLogger) {
            // adding default information to the performance logger object
            Util.addDefaultPerformanceInfo(data)

            // debug code
            // console.log('Performance: ');
            // for (var key in performanceLogger) { console.log(key + ' : ' + performanceLogger[key]); }

            // sending the http post request to save data
            httpPromise = http.POST({ module: 'oxodocumentfilter', data: { action: 'logperformancedata', performanceData: JSON.stringify(performanceLogger) } })
            // resetting the logger and the timer
            performanceLogger = null
            performanceTimer = null
          }

          return httpPromise || $.when()
        }
      }
    })
  }
}

export default Util
