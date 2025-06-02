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
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import capabilities from '@/io.ox/core/capabilities'
import jobsAPI from '@/io.ox/core/api/jobs'

let configHash = {}

const api = {

  /**
   * delete rule
   * @param  {string}          ruleId
   * @return {jQuery.Deferred}
   */
  deleteRule (ruleId) {
    return http.PUT({
      module: 'mailfilter/v2',
      params: { action: 'delete' },
      data: { id: ruleId }
    })
  },

  /**
   * create rule
   * @param  {object}          data
   * @return {jQuery.Deferred}
   */
  create (data) {
    return http.PUT({
      module: 'mailfilter/v2',
      params: { action: 'new' },
      data
    })
  },

  /**
   * get rules
   * @param  {string}          flag filters list
   * @return {jQuery.Deferred}
   */
  getRules (flag) {
    return http.GET({
      module: 'mailfilter/v2',
      params: { action: 'list', flag }
    })
      .then(function (data) {
        return data
      })
  },

  /**
   * update rule
   * @param  {object}          data
   * @return {jQuery.Deferred}
   */
  update (data) {
    return http.PUT({
      module: 'mailfilter/v2',
      params: { action: 'update' },
      data
    })
  },

  /**
   * get config
   * @return {jQuery.Deferred}
   */
  getConfig () {
    // do not send any requests which could fail, just return empty config instead.
    if (!capabilities.has('mailfilter_v2')) return $.when({ actioncmds: [], options: {}, tests: [] })

    const getter = function () {
      return http.GET({
        module: 'mailfilter/v2',
        params: { action: 'config' }
      }).then(function (config) {
        configHash = config
        return configHash
      })
    }

    return !_.isEmpty(configHash) ? $.Deferred().resolve(configHash) : getter()
  },

  /**
   * reorder rules
   * @param  {object[]}        data
   * @return {jQuery.Deferred}
   */
  reorder (data) {
    return http.PUT({
      module: 'mailfilter/v2',
      params: { action: 'reorder' },
      data
    })
  },

  apply (params, longRunningJobCallback) {
    return jobsAPI.enqueue(http.GET({
      module: 'mailfilter/v2',
      params: _.extend({ action: 'apply', allow_enqueue: true }, params)
    }), longRunningJobCallback)
  }
}

Events.extend(api)

export default api
