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
import Stage from '@/io.ox/core/extPatterns/stage'
import logout from '@/io.ox/core/main/logout'
import debug from '@/io.ox/core/main/debug'

import '@/io.ox/core/main/refresh'
import '@/io.ox/core/main/topbar_right'
import '@/io.ox/core/ping'
import '@/io.ox/core/upsell'
import '@/io.ox/core/commons'
import '@/io.ox/backbone/views/window'
import '@/io.ox/core/main/registry'
import '@/io.ox/core/main/offline'
import '@/io.ox/core/relogin'
import '@/io.ox/core/links'
import '@/io.ox/core/http_errors'
import '@/io.ox/backbone/views/disposable'
import '@/io.ox/tours/get-started'
import '@/io.ox/core/main/icons'
import '@/io.ox/core/main/appcontrol'
import '@/io.ox/core/main/stages'
import '@/io.ox/core/count/main'
import '@/io.ox/core/actions'
import '@/io.ox/core/detail-popup'

import gt from 'gettext'

// general fix for flexbox scrolling issue (see bugs 43799, 44938, 45501, 46950, 47395)
$('#io-ox-windowmanager').on('scroll', function () {
  // no infinite loop here. Only scroll if needed
  if (this.scrollTop > 0) this.scrollTop = 0
})

debug('core: Loaded')
ox.trigger('core:load')

_.stepwiseInvoke = function (list, method, context) {
  if (!_.isArray(list)) return $.when()
  const args = Array.prototype.slice.call(arguments, 3); const done = $.Deferred(); const tmp = []
  function store (result) {
    tmp.push(result)
  }
  function tick () {
    // are we done now?
    if (list.length === 0) return done.resolve(tmp)
    // get next item
    const item = list.shift()
    // has method?
    if (item && _.isFunction(item[method])) {
      // call method and expect a deferred object
      const ret = item[method].apply(context, args)
      if (ret && ret.promise) return ret.done(store).then(tick, done.reject)
    }
    tick()
  }
  tick()
  return done.promise()
}

ext.point('io.ox/core/mobile').extend({
  id: 'i18n',
  draw () {
    // pass the translated string to the dropdown handler
    // which has no access to gt functions
    $(document).trigger('dropdown:translate', gt('Close'))
  }
})

function launch () {
  // add some senseless characters
  // a) to avoid unwanted scrolling
  // b) to recognize deep links
  if (window.location.hash === '') window.location.hash = '#!!'

  const baton = ext.Baton.ensure({
    popups: []
  })

  debug('core: launch > run stages')
  Stage.run('io.ox/core/stages', baton)
}

export default {
  logout,
  launch
}
