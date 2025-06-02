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

import _ from '@/underscore'
import $ from '@/jquery'
import '@/io.ox/contacts/addressbook/style.scss'

const prefix = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" '
const list = prefix + 'class="bi bi-list"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>'
const people = prefix + 'class="bi bi-people"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>'

// use a template for maximum performance
// yep, no extensions here; too slow for find-as-you-type
const template = _.template(
  '<% _(list).each(function (item) { %>' +
  '<li class="list-item selectable" aria-selected="false" role="option" tabindex="-1" data-cid="<%- item.cid %>">' +
  '  <div class="list-item-checkmark"></div>' +
  '  <div class="list-item-content">' +
  '    <% if (item.list) { %>' +
  '      <div class="avatar distribution-list" aria-hidden="true">' + list + '</div>' +
  '    <% } else if (item.label) { %>' +
  '      <div class="avatar label" aria-hidden="true">' + people + '</div>' +
  '    <% } else if (item.image && appeared[item.image]) { %>' +
  '      <div class="avatar image" style="background-image: url(<%- item.image %>)" aria-hidden="true"></div>' +
  '    <% } else if (item.image) { %>' +
  '      <div class="avatar image" data-original="<%- item.image %>" aria-hidden="true"></div>' +
  '    <% } else { %>' +
  '      <div class="avatar initials <%- item.initials_color %>" aria-hidden="true"><%- item.initials %></div>' +
  '    <% } %>' +
  '    <div class="name">' +
  '      <% if (item.full_name_html) { %>' +
  '        <%= item.full_name_html %>' +
  '      <% } else { %>' +
  '        <%- item.email || "\u00A0" %>' +
  '      <% } %>' +
  '      <% if (item.department) { %><span class="gray">(<%- item.department %>)</span><% } %>' +
  '    </div>' +
  '    <div class="email gray"><%- item.caption || "\u00A0" %></div>' +
  '  </div>' +
  '</li>' +
  '<% }); %>'
)

function render ($el, list, offset = 0, limit = 20) {
  const el = $el[0]
  // get subset; don't draw more than n items by default
  const subset = list.slice(offset, limit)
  if (offset === 0) el.innerHTML = ''
  el.innerHTML += template({ list: subset, appeared })
  if (offset === 0) el.scrollTop = 0
  $el.find('.avatar[data-original]').lazyload()
}

function initialize ($el) {
  $el.on('appear', onAppear)
}

function onAppear (e) {
  appeared[$(e.target).attr('data-original')] = true
}

// track avatar URLs
const appeared = {}

export default {
  render,
  initialize,
  onAppear
}
