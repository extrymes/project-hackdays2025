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

import apiFactory from '@/io.ox/core/api/factory'
import http from '@/io.ox/core/http'

const api = apiFactory({
  module: 'convert',
  requests: {
    get: {
      action: 'get'
    }
  }
})

/**
 * @param  {object}          dataSource
 * @param  {object}          dataHandler
 * @return {jQuery.Deferred}             done returns data object
 */
api.convert = function (dataSource, dataHandler) {
  return http.PUT({
    module: 'conversion',
    params: {
      action: 'convert'
    },
    data: {
      datasource: dataSource,
      datahandler: dataHandler
    }
  })
}

export default api
