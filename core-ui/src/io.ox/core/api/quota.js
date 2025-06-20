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
import Backbone from '@/backbone'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'

const QuotaModel = Backbone.Model.extend({

  defaults: { quota: -1, use: 0, countquota: -1, countuse: 0 },

  constructor: function (type) {
    this.type = type
    this.fetched = false
    Backbone.Model.apply(this, [])
  },

  fetch () {
    const isUnified = settings.get('quotaMode', 'default') === 'unified'
    const useExistingData = this.fetched ||
      (this.type === 'mail' && !capabilities.has('webmail') && !isUnified) ||
      (this.type === 'filestore' && !capabilities.has('infostore') && !isUnified)

    if (useExistingData) return this.toJSON()

    return http.GET({
      module: 'quota',
      // return unified quota if quota mode is unified, use it for both, mail and file
      params: { action: (isUnified ? 'unified' : this.type) }
    })
      .then(function (data) {
        this.fetched = true
        // for demo purposes
        // if (this.type === 'mail') {
        //     data.quota = 5.88 * 1024 * 1024; // 100mb limit
        //     data.use = 4.85 * 1024 * 1024; // 87mb in use
        //     data.countquota = 200; // 200 limit
        //     data.countuse = 191;  // 191 in use
        // } else {
        //     data.quota = 50 * 1024 * 1024; // 50mb limit
        //     data.use = 26 * 1024 * 1024; // 26mb in use
        // }
        // update settings (other source to get quota information)
        if (this.type === 'filestore' && settings.get('properties/infostoreUsage') > 0) {
          settings.set('properties/infostoreUsage', data.use)
        }
        return this.set(data).toJSON()
      }.bind(this))
  }
})

const mailQuota = new QuotaModel('mail')
const fileQuota = new QuotaModel('filestore')

let requestForFileQuoteUpdates = false

const api = {

  mailQuota,
  fileQuota,

  checkQuota (folder, files) {
    if (folder.module !== 'infostore') return {}

    return http.PUT({
      module: 'folders',
      params: {
        action: 'checklimits',
        id: folder.id,
        type: 'filestorage'
      },
      appendColumns: false,
      data: {
        files: files.map(function (file) {
          return { size: file.size, name: file.name }
        })
      }
    }).then(function (res) {
      return [].concat.apply((res && res.errors) || [])
    })
  },

  getModel (type) {
    if (type === 'mail') return mailQuota
    return fileQuota
  },

  /**
   * get mail and file quota
   * @return {jQuery.Deferred} returns quota object
   */
  load () {
    http.pause()
    // when using unified quota mail quota is the same as filequota
    // filequota will actually get the unified quota and fill in the values for both types.
    if (settings.get('quotaMode', 'default') !== 'unified') {
      this.mailQuota.fetch()
    }
    this.fileQuota.fetch()
    return http.resume().then(function () {
      if (settings.get('quotaMode', 'default') === 'unified') {
        mailQuota.fetched = true
        mailQuota.set(fileQuota.attributes)
      }
      return {
        mail: mailQuota.toJSON(),
        file: fileQuota.toJSON()
      }
    })
  },

  reload () {
    mailQuota.fetched = false
    if (requestForFileQuoteUpdates) fileQuota.fetched = false
    return this.load()
  },

  getAccountQuota: (function () {
    const pool = new Backbone.Collection()

    return function (account, module, cache) {
      // support accounts of form 123 and fileStoreService://123 (backend sends only the number)
      const model = pool.find({ account_id: account.replace(/.*:\/\//, ''), module })
      if (model && cache !== false) return $.when(model)

      return http.GET({
        module: 'quota',
        params: {
          account,
          module
        }
      }).then(function (data) {
        // data may be empty if account does not support it. So fill with default values to prevent js errors.
        data = data || { account_id: account.replace(/.*:\/\//, '') }
        data.module = module
        return pool.add(data)
      })
    }
  }())

}

// get fresh quota to trigger update events
ox.on('refresh^', function () {
  api.reload()
})

api.requestFileQuotaUpdates = function () {
  requestForFileQuoteUpdates = true
}

export default api
