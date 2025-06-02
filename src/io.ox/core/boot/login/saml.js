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
import { addReadyListener } from '@/io.ox/core/events'
import config from '@/io.ox/core/boot/config'

function RedirectHandler (options) {
  options = options || {}
  function checkReload (uri) {
    _.defer(function () {
      if (window.location.href !== uri) return
      window.location.reload()
    })
  }

  _.extend(this, options, {
    id: 'saml_redirect',
    handle (baton) {
      let uri = baton.data.redirect_uri
      if (!uri) return

      baton.handled = $.Deferred()
      if ((/^http/i).test(uri)) {
        window.location = uri
        checkReload(uri)
      } else {
        let path = uri[0] === '/' ? '' : '/'
        path += uri

        uri = window.location.protocol + '//' + window.location.host + path
        window.location = uri
        checkReload(uri)
      }
    }
  })
}

function setupExtensions () {
  ext.point('io.ox.saml/relogin').extend(new RedirectHandler())
  ext.point('io.ox.saml/logout').extend(new RedirectHandler())
  ext.point('io.ox.saml/login').extend(new RedirectHandler())
}

let samlPath = '/saml'

ext.point('io.ox/core/boot/login').extend({
  id: 'saml',
  after: 'autologin',
  async login () {
    await config.server()
    if (!ox.serverConfig.samlLogin) return
    if (ox.serverConfig.samlPath) {
      samlPath = '/saml/' + ox.serverConfig.samlPath
    }
    setupExtensions()

    // we want to handle session based errors ourselves
    ox.off('login:fail:session-based')

    if (ox.serverConfig.samlLoginErrorPage === true) {
      setTimeout(function () {
        ox.trigger('server:down')
        $('body').addClass('down')
        $('#io-ox-login-container').empty().append(
          $('<div class="alert alert-info">').append(
            $('<div><b>Connection error</b></div> The service is not available right now. <a href="#">Retry</a>')
          )
            .on('click', function (e) { e.preventDefault(); window.location.reload() })
        )
        $('#background-loader').fadeOut(250)
        console.warn('Server is down.')
      }, 250)
    }
    const params = {
      flow: 'login'
    }
    // decode value from location.hash because it already is encoded and would be encoded again
    // before being sent to the MW (through $.param)
    if (!_.isEmpty(window.location.hash)) params.uriFragment = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    return $.get([
      ox.apiRoot,
      samlPath,
      '/init?',
      $.param(params)
    ].join('')).then(function (data) {
      const baton = new ext.Baton({ data })
      ext.point('io.ox.saml/login').invoke('handle', baton, baton)
      if (baton.handled && baton.handled.catch) {
        // silently catch errors
        return baton.handled.catch(_.noop)
      }
    }, function (jqXHR, textStatus, errorThrown) {
      if (ox.serverConfig.samlLoginErrorRedirect) {
        _.url.redirect(ox.serverConfig.samlLoginErrorRedirectURL +
                        '#&' + _.serialize({ language: ox.locale, statusCode: jqXHR.status || 'undefined', statusText: textStatus, error: errorThrown }))
      }
    })
  },
  relogin () {
    if (!ox.serverConfig.samlLogin) return
    const params = {
      flow: 'relogin'
    }
    // decode value from location.hash because it already is encoded and would be encoded again
    // before being sent to the MW (through $.param)
    if (!_.isEmpty(window.location.hash)) params.uriFragment = decodeURIComponent(window.location.hash.replace(/^#/, ''))

    return $.get([
      ox.apiRoot,
      samlPath,
      '/init?',
      $.param(params)
    ].join('')).then(function (data) {
      const baton = new ext.Baton({ data })
      ext.point('io.ox.saml/relogin').invoke('handle', baton, baton)
      return $.Deferred()
    })
  }
})

addReadyListener('capabilities:user', (capabilities) => {
  if (!capabilities.has('saml-single-logout') && !ox.serverConfig.samlSingleLogout) return
  ext.point('io.ox/core/logout').extend({
    id: 'saml_logout',
    index: 'last',
    async logout () {
      const data = await $.get(ox.apiRoot + samlPath + '/init?flow=logout&session=' + ox.session)
      const baton = new ext.Baton({ data })
      ext.point('io.ox.saml/logout').invoke('handle', baton, baton)
      await new Promise() // stop all further processing. This is never resolved.
    }
  })
})
