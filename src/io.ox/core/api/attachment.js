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
import Events from '@/io.ox/core/event'
import * as util from '@/io.ox/core/util'

import filesApi from '@/io.ox/files/api'
import gt from 'gettext'
import { settings as coreSettings } from '@/io.ox/core/settings'

// shared api variable as workaround for detail view (progress bar)
const pendingAttachments = {}

const api = {
  isPending (key) { return !!pendingAttachments[key] },
  setPending (key) { pendingAttachments[key] = true },
  setCompleted (key) { pendingAttachments[key] = false },

  /**
   * gets all attachments for a specific object, for example a task
   * @param  {object}          options
   * @return {jQuery.Deferred}
   */
  getAll (options) {
    return http.GET({
      module: 'attachment',
      params: {
        action: 'all',
        module: options.module,
        attached: options.id,
        folder: options.folder || options.folder_id,
        columns: '1,800,801,802,803,804,805'
      }
    }).then(function (data) {
      // fix for backend bug folder should not be 0
      for (let i = 0; i < data.length; i++) {
        data[i].folder = options.folder || options.folder_id
      }
      // Filter out outlook-special attachments
      return data.filter(attachment => !attachment.rtf_flag)
    })
  },

  /**
   * removes attachments
   * @param  {object}          options
   * @param  {object}          data    id properties
   * @return {jQuery.Deferred}
   */
  remove (options, data) {
    const self = this
    return http.PUT({
      module: 'attachment',
      params: {
        action: 'detach',
        module: options.module,
        attached: options.id,
        folder: options.folder || options.folder_id
      },
      data
    }).done(function () {
      self.trigger('detach', {
        module: options.module,
        id: options.id,
        folder: options.folder || options.folder_id
      })
    })
  },

  /**
   * create attachment
   * @param  {object}          options
   * @param  {object}          data    attachment
   * @return {jQuery.Deferred}
   */
  create (options, files = [], references = []) {
    const data = {
      module: options.module,
      attached: options.id,
      folder: options.folder || options.folder_id
    }
    const formData = new window.FormData()
    const cid = _.ecid(options)

    // be robust
    files = [].concat(files)

    let counter = 0
    files.forEach(file => {
      formData.append(`json_${counter}`, JSON.stringify(data))
      formData.append(`file_${counter}`, file)
      counter++
    })

    references.forEach(reference => {
      formData.append(`json_${counter}`, JSON.stringify({ ...data, ...reference }))
      counter++
    })

    return http.UPLOAD({
      module: 'attachment',
      params: {
        action: 'attach',
        force_json_response: true
      },
      data: formData,
      fixPost: true
    }).progress(function (e) {
      api.trigger(`progress:${cid}`, e)
    }).done(function () {
      // TODO: unused?!
      api.trigger('attach', {
        module: options.module,
        id: options.id,
        folder: options.folder || options.folder_id
      })
    })
  },

  /**
   * builds URL to download/preview File
   * @param  {object} data
   * @param  {string} mode
   * @param  {object} options
   * @return {string}         url
   */
  getUrl (data, mode, options) {
    options = options || {}

    let url = '/attachment'
    // scaling options
    const scaling = options.width && options.height ? `&scaleType=${options.scaleType}&width=${options.width}&height=${options.height}` : ''

    // inject filename for more convenient file downloads
    url += (data.filename ? '/' + encodeURIComponent(data.filename) : '') + '?' + $.param({
      // needs to be added manually
      session: ox.session,
      action: 'document',
      folder: data.folder,
      id: data.id || data.managedId,
      module: data.module,
      attached: data.attached,
      source: 'task'
    })
    switch (mode) {
      case 'view':
      case 'open':
        return util.getShardingRoot(`${url}&delivery=view${scaling}`)
      case 'download':
        return `${ox.apiRoot}${url}&delivery=download`
      default:
        return util.getShardingRoot(url)
    }
  },

  /**
   * save attachment
   * @param  {object}          data
   * @param  {string}          target folder_id
   * @return {jQuery.Deferred}
   */
  save (data, target) {
    // multiple does not work, because module overides module
    // in params. So we need to do it one by one
    // be robust

    const descriptionText = {
      1: gt('Saved appointment attachment'),
      4: gt('Saved task attachment'),
      7: gt('Saved contact attachment')
      // 137: 'Saved Infostore attachment'
    }

    // make sure we have a string or target + api.DELIM results in NaN
    target = (target || coreSettings.get('folder/infostore')).toString()

    return http.PUT({
      module: 'files',
      params: {
        action: 'saveAs',
        folder: data.folder,
        module: data.module,
        attached: data.attached,
        attachment: data.id || data.managedId
      },
      data: { folder_id: target, description: descriptionText[data.module] || gt('Saved attachment') },
      appendColumns: false
    })
      .done(function () {
        filesApi.pool.resetFolder(target)
        filesApi.trigger('add:file')
      })
  }

}

Events.extend(api)

export default api
