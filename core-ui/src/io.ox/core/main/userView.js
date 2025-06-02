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

import ox from '@/ox'
import $ from '@/jquery'
import Backbone from '@/backbone'
import { settings } from '@/io.ox/core/settings'
import * as contactsUtil from '@/io.ox/contacts/util'
import contactAPI from '@/io.ox/contacts/api'
import userAPI from '@/io.ox/core/api/user'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'

export const UserView = Backbone.View.extend({

  tagName: 'li',

  className: 'user',

  initialize (options = { editable: true }) {
    this.options = options
  },

  render () {
    const type = settings.get('user/hidedomainpart', false) ? 'email-localpart' : 'email'
    const $node = $('<div class="user-picture-container" aria-hidden="true">')
    const { ellipsis, editable } = this.options

    const $nameNode = $('<div class="name">')
      .append(userAPI.getTextNode(ox.user_id, { type: 'name' }))
      .toggleClass('ellipsis', !!ellipsis)

    this.$el = $(`<${this.tagName} class="user">`).append(
      $('<button data-name="user-picture" class="action btn-unstyled" role="menuitem">')
        .attr('title', gt('Change user photo'))
        .append($node),
      $('<div class="text-container">').append(
        $nameNode,
        $('<div class="mail">').append(userAPI.getTextNode(ox.user_id, { type }))
          .toggleClass('ellipsis', !!ellipsis)
      )
    )

    if (editable) {
      this.$el.on('click', '.action', function (e) {
        e.preventDefault()
        import('@/io.ox/core/settings/user').then(function ({ default: user }) {
          user.openEditPicture()
        })
      })
    }
    updatePicture()
    // via global address book
    contactAPI.on('reset:image update:image', updatePicture)
    // via my contact data
    userAPI.on('reset:image:' + ox.user_id + ' update:image:' + ox.user_id, updatePicture)
    userAPI.on('update', updatePicture)
    userAPI.on('update', updateName)

    function updatePicture () {
      let $initials
      $node.empty().append(
        contactAPI.pictureHalo(
          $('<div class="user-picture" aria-hidden="true">')
            .append(
              $initials = $('<span class="initials">'),
              createIcon('bi/camera.svg').addClass('bi-18')
            ),
          { internal_userid: ox.user_id },
          { width: 40, height: 40, fallback: false }
        )
      )
      userAPI.me().then(function (data) {
        $initials.append(contactsUtil.getInitials(data))
      })
    }

    function updateName () {
      $nameNode.empty().append(userAPI.getTextNode(ox.user_id, { type: 'name' }))
    }

    return this
  }
})
