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

import api from '@/plugins/halo/api'
import ext from '@/io.ox/core/extensions'
import '@/plugins/halo/style.scss'

export default {

  redraw (baton) {
    api.halo.investigate(baton.contact, baton.provider)
      .done(function (response) {
        baton.data = response
        baton.ray.empty().triggerHandler('dispose')
        api.viewer.draw(baton)
      })
      .always(function () {
        baton = null
      })
  },

  draw (data, popup) {
    const container = $('<div class="io-ox-halo">')
    _(api.halo.investigate(data)).each(function (promise, providerName) {
      let node = $('<div class="ray">')
        .css('minHeight', '100px')
        .attr('data-prodiver', providerName)
        .busy()
        .appendTo(container)
      promise
        .done(function (response) {
          const baton = new ext.Baton({ contact: data, data: response, provider: providerName, ray: node, popup })
          api.viewer.draw(baton)
        })
        .always(function () {
          node.idle().css('minHeight', '')
          node = null
        })
    })
    return container
  }
}
