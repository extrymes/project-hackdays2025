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

import momentLanguages from '@/moment-languages.json'
import $ from 'jquery'
import Backbone from '@/backbone'
import { version, revision } from '@/version'
import { capabilities as cap, debug } from '@/debug'

let root = window.location.pathname.replace(/\/[^/]*$/, '')
// fix URL
const oldRoot = root
root = root.replace(/^\/\//, '/')
if (oldRoot !== root) { // only change if it's different, otherwise we get infinite reloads
  window.location.href = window.location.href.replace(oldRoot, root)
}

export default Object.assign({
  abs: `${window.location.protocol}//${window.location.host}`,
  apiRoot: `${root}/api`,
  cap,
  context_id: 0,
  debug,
  language: 'en_US',
  momentLanguages,
  loginLocation: '',
  logoutLocation: '',
  online: navigator.onLine !== undefined ? navigator.onLine : true,
  relogin () { },
  revision,
  rampup: {},
  // usually "/appsuite" or just "/"
  root,
  secretCookie: false, // auto-login
  serverConfig: {},
  session: '',
  signin: true,
  t0: new Date().getTime(), // for profiling
  testTimeout: 30000,
  theme: 'default',
  ui: { session: {} },
  user: '',
  user_id: 0,
  version,
  windowState: 'foreground',
  busy (block) {
    // init screen blocker
    $('#background-loader')[block ? 'busy' : 'idle']()
      .show()
      .addClass(`secure${(block ? ' block' : '')}`)
  },
  idle () {
    $('#background-loader')
      .removeClass('secure block')
      .hide()
      .idle()
      .empty()
  },
  // only disable, don't show night-rider
  disable () {
    $('#background-loader')
      .addClass('busy block secure')
      .on('touchmove', function (e) {
        e.preventDefault()
        return false
      })
      .show()
  }
}, Backbone.Events)
