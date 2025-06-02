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

import http from '@/io.ox/core/http'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const fallbackTemplate = 'default.tmpl'

const defaultTemplates = {
  mail: 'super-mail-template.tmpl',
  contacts: 'super-contacts-template.tmpl',
  tasks: 'super-tasks-template.tmpl'
}

const callbacks = {}

function escapeTitle (str) {
  return (str || '').replace(/[#%&§/$*!`´'"=:@+^\\.+?{}|]/g, '_')
}
// '

function addCallback (options, it) {
  const id = 'print_' + _.now()

  window[id] = function (document) {
    try {
      const selector = options.selector || 'script'
      const template = $(document.body).find('[type="text/template"]').filter(selector).html()
      const title = (options.title || '').trim()

      // edge has problems if the content is not trimmed and there is more than one node. So trim and put a wrapper around it.
      $(document.body).html('<div class="print-wrapper">' + $.trim(_.template(template)(it)) + '</div>')
      // Add custom classes, for example to make html mails with custom css work properly
      if (options.meta.classes) $(document.body).addClass(options.meta.classes)
      // hint: in case title contains a '.' chrome will cut off at this char when suggesting a filename
      document.title = escapeTitle(ox.serverConfig.pageTitle || '') + escapeTitle(title.length ? ' ' + title : '') + ' ' + gt('Printout')
    } catch (e) {
      console.error(e)
    }
  }

  return id
}

function removeCallbacks () {
  for (const id in callbacks) {
    if (callbacks[id] && callbacks[id].closed) {
      delete callbacks[id]
      delete window[id]
    }
  }
}

export default {

  request (printModule, selection) {
    // need to open window now, otherwise get duplicate window for second print
    const win = this.openURL('busy.html')
    printModule().then(printWindow => printWindow.default.open(selection, win))

    return win
  },

  smart (options) {
    options = _.extend({
      get: $.noop,
      selection: [],
      i18n: {},
      file: 'print.html',
      meta: {}
    }, options)

    options.selection = _.chain(options.selection).toArray().compact()
    http.pause()

    $.when.apply($,
      options.selection
        .map(function getCID (obj) {
          return _.isString(obj) ? obj : _.cid(obj)
        })
        .uniq()
        .map(function getData (cid, index) {
          return options.get(_.cid(cid), index).then(
            function (obj) {
              return options.process ? options.process(obj, index, options) : obj
            },
            function fail (e) {
              console.error(e)
            }
          )
        })
        .value()
    )
      .done((...args) => {
        let data = _.chain(args).toArray()
        const all = data.value().length
        if (options.filter) data = data.filter(options.filter)
        if (options.sortBy) data = data.sortBy(options.sortBy)
        data = data.value()
        // create new callback & open print window
        const id = addCallback(options, { data, i18n: options.i18n, meta: options.meta, length: data.length, filtered: all - data.length })
        const url = options.file + '?' + id
        // defer the following (see bug #31301)
        _.defer(() => {
          if (options.window) {
            options.window.location = url
            callbacks[id] = options.window
          } else {
            callbacks[id] = this.openURL(url)
          }
          removeCallbacks()
        })
      })
      .fail(function () {
        if (options.window) options.window.close()
        yell({
          type: 'error',
          headline: gt('Error'),
          // do not use "gt.ngettext" for plural without count
          message: (options.selection.value().length === 1) ? gt('Cannot print this item') : gt('Cannot print these items')
        })
      })

    http.resume()
  },

  getWindowOptions () {
    const { screen } = window
    const o = { width: 750, height: Math.min(screen.availHeight - 100, 1050), top: 40 }
    o.left = (screen.availWidth - o.width) / 2 >> 0
    o.string = 'width=' + o.width + ',height=' + o.height + ',left=' + o.left + ',top=' + o.top + ',menubar=no,toolbar=no,location=no,scrollbars=yes,status=no'
    return o
  },

  getWindow (url) {
    // avoid bugs about non-opening windows
    const name = 'print_' + _.now()
    const options = this.getWindowOptions(url)
    const win = window.open(url, name, options.string)
    return win
  },

  // module and data are mandatory;
  // use options to overwrite default request params
  open (module, data, options) {
    const params = { action: 'get' }

    // workaround for old printcalendar
    if (module === 'printCalendar') {
      delete params.action
    }

    if (_.isArray(data)) {
      params.data = JSON.stringify(data)
    } else if (_.isObject(data)) {
      params.folder = data.folder_id || data.folder
      params.id = data.id
    }

    params.format = 'template'
    params.template = defaultTemplates[module] || fallbackTemplate
    params.session = ox.session

    const url = ox.apiRoot + '/' + module + '?' + $.param(_.extend(params, options))

    return this.getWindow(url)
  },

  openURL (url) {
    return this.getWindow(url || 'blank.html')
  },

  interim (url) {
    console.warn('Temporary solution; replace by open()', url)
    return this.openURL(url)
  }
}
