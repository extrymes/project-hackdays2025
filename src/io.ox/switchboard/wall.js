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

import Backbone from '@/backbone'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import _ from '@/underscore'

import presence from '@/io.ox/switchboard/presence'
import api from '@/io.ox/switchboard/api'
import contactsAPI from '@/io.ox/contacts/api'
import * as util from '@/io.ox/contacts/util'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'

import '@/io.ox/switchboard/style.scss'

import gt from 'gettext'

const Wall = Backbone.View.extend({
  className: 'wall',
  events: {
    'click .close': 'onClose',
    'click .reply': 'onReply'
  },
  initialize () {
    this.collection = new Backbone.Collection()
    this.listenTo(this.collection, 'add', this.addMessage)
    this.listenTo(this.collection, 'remove', this.removeMessage)
  },
  render () {
    $('body').append(this.$el)
    return this
  },
  addMessage (model) {
    const from = model.get('from')
    this.$el.append(
      $('<div class="wall-message">').attr('data-cid', model.cid).append(
        contactsAPI.pictureHalo($('<div class="contact-photo">'), { email: from }, { width: 40, height: 40 }),
        presence.getPresenceIcon(from),
        $('<div class="sender">').text(api.getUserName(from)),
        $('<div class="content">').append(
          $.txt(model.get('message')),
          $('<a href="#" class="reply">').text(gt('Reply'))
        ),
        $('<div class="date">').text(moment(model.get('sent')).format('LT')),
        $('<button type="button" class="close">').attr('aria-label', gt('Close')).append(
          $('<span aria-hidden="true">&times;</span>')
            .attr('title', gt('Close'))
        )
      )
    )
  },
  removeMessage (model) {
    this.$(`.wall-message[data-cid="${CSS.escape(model.cid)}"]`).remove()
  },
  onClose (e) {
    const cid = $(e.currentTarget).closest('.wall-message').data('cid')
    const model = this.collection.get(cid)
    if (model) this.collection.remove(model)
  },
  onReply (e) {
    e.preventDefault()
    const cid = $(e.currentTarget).closest('.wall-message').data('cid')
    const model = this.collection.get(cid)
    const data = { email1: model.get('from'), folder_id: util.getGabId() }
    const baton = new ext.Baton({ data: [data] })
    actionsUtil.invoke('io.ox/switchboard/wall-user', baton)
  }
})

const wall = new Wall().render()
let cid = 3

  ; (async () => {
  const socket = await api.getSocket()

  // respond to wall messages
  socket.on('wall', function (from, to, payload) {
    wall.collection.add({ message: payload.message, from, to, sent: _.now(), cid: cid++ })
  })
})()
