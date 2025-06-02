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

/* global __vitePreload */

import '@open-xchange/bootstrap'
import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import boot from '@/io.ox/core/boot/main'

import '@open-xchange/bootstrap/dist/style.css'
import '@/themes/variables.scss'
import '@open-xchange/bootstrap-datepicker/css/datepicker3.css'
import '@/themes/style.scss'
import '@/themes/login/login.scss'
import { registerWorker } from '@/io.ox/core/version-check'

// Prevents flash of unstyled content
document.getElementById('io-ox-login-content').removeAttribute('style')

;(() => {
  const preload = typeof __vitePreload === 'undefined' ? async cb => cb() : __vitePreload
  document.addEventListener('load-css', (event) => {
    const files = event?.detail?.css
    if (!files) return
    const base = `${ox.abs}${ox.root}/`.replace(/\/\//g, '/')
    preload(() => {}, files.map(f => `./${f}`), base).catch(err => {
      console.error('CSS Preloading failed', err)
    })
  })
})()

;(async function () {
  registerWorker()

  // ugly device hack
  // if device small wait 10ms check again
  // maybe the check was made too early could be wrong
  // desktop was recognized as mobile in some cases because of this
  if (_.device('smartphone')) {
    setTimeout(function () { _.recheckDevice() }, 10)
  }

  if (_.device('!android')) {
    // prevent loading touch icons on desktop
    $('[rel="icon"]').remove()
  }

  //
  // Server down notification
  //

  ox.on({

    'server:up' () {
      $('body').removeClass('down') // to be safe
      clearTimeout(serverTimeout)
    },

    'server:down' () {
      console.error('Server is down.')
      stopTheShow('down')
    },

    'configuration:invalid' (missing) {
      console.error('Invalid/missing configuration:', missing)
      stopTheShow('configuration', '(' + missing + ')')
    }
  })

  function stopTheShow (message = 'down', reason = '') {
    if ($('#showstopper').is(':visible')) return
    $('body').addClass('down')
    $('#io-ox-login-container').empty()
    $('#background-loader').removeClass('busy').show()
    $('.throbber').hide()
    $(`#showstopper, #showstopper .${message}`).show()
    $(`#showstopper .${message} .details`).text(reason)
    $('#showstopper .reload').on('click', function (e) {
      e.preventDefault()
      window.location.reload()
    })
  }

  // detect if backend is down. use long timeout for slow connections & IE
  const serverTimeout = setTimeout(ox.trigger.bind(ox, 'server:down'), 30000)

  import('@/io.ox/core/boot/fixes')
  import('@/global-event-handler')

  try {
    boot.start()
  } catch (error) {
    console.error('Server down', error.message, error)
    ox.trigger('server:down')
  }
})()
