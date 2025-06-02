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
//
// Suppress context menu
//

const contextmenuBlocklist = [
  '.vgrid',
  '.foldertree-sidepanel',
  '.window-toolbar',
  '.io-ox-notifications',
  '.io-ox-inline-links',
  '.io-ox-action-link',
  '.widgets',
  'select',
  'button:not(.contextmenu)',
  'input[type=radio]',
  'input[type=checkbox]',
  '.btn:not(.contextmenu)',
  '.fa-search',
  '.contact-grid-index',
  '.file-icon .wrap',
  '.carousel'
]

$(document).on('contextmenu', contextmenuBlocklist.join(', '), function (e) {
  if (ox.debug) { console.log('io.ox/core/boot/fixes prevent contextmenu!') }
  e.preventDefault()
  return false
})

//
// Desktop fixes
//

if (_.device('firefox && windows')) {
  $('html').addClass('fix-spin')
}

//
// Mobile fixes
//

// Orientation

$(window).on('orientationchange', function () {
  // dismiss dropdown on rotation change due to positioning issues
  if (_.device('tablet')) $('body').trigger('click')
  // ios scroll fix; only fix if scrollTop is below 64 pixel
  // some apps like portal really scroll <body>
  if ($(window).scrollTop() > 64) return

  // iOS safari bug: needs to get triggered later because rendering is not complete after setTimeout 0
  setTimeout(function () { window.scrollTo(0, 1) }, 500)
})

// Touch

if (_.device('touch')) {
  // disable tooltips for touch devices
  $.fn.tooltip = function () {
    return this
  }
} else {
  // make sure tooltips vanish if the reference node gets removed
  // same for popovers
  ['tooltip', 'popover'].forEach(function (name) {
    const original = $.fn[name]
    $.fn[name] = function () {
      $(this).on('dispose', onDispose(name))
      return original.apply($(this), arguments)
    }
  })
}

function onDispose (name) {
  // we use "hide" here; "destroy" sometimes provoke exceptions
  return function () { $(this)[name]('hide') }
}

// add some device properties to <html>
['windows', 'macos', 'ios', 'android', 'touch', 'smartphone', 'retina', 'standalone'].forEach(function (property) {
  if (_.device(property)) $('html').addClass(property)
})

//
// Connection / Window State
//

$(window).on('online offline', function (e) {
  ox.trigger('connection:' + e.type)
})

// handle document visibility
$(window).on('blur focus', function (e) {
  ox.windowState = e.type === 'blur' ? 'background' : 'foreground'
})
