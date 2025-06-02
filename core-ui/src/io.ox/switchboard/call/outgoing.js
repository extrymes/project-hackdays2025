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

import Modal from '@/io.ox/backbone/views/modal'
import presence from '@/io.ox/switchboard/presence'
import contactsAPI from '@/io.ox/contacts/api'
import ringtone from '@/io.ox/switchboard/call/ringtone'
import { createCircularButton, createIcon } from '@/io.ox/core/components'

import '@/io.ox/switchboard/style.scss'

import gt from 'gettext'
import { manifestManager } from '@/io.ox/core/manifests.js'

export default {
  openDialog (callModel) {
    return new Modal({ autoClose: false, title: gt('New Zoom call') })
      .inject({
        renderCallees () {
          const callees = callModel.getCallees()
          const $photo = $('<div class="photo">')
          if (callees.length === 1) {
            $photo.append(
              contactsAPI.pictureHalo($('<div class="contact-photo">'), { email: callees[0] }, { width: 80, height: 80 }),
              presence.getPresenceIcon(callees[0])
            )
          } else {
            $photo.append(
              $('<div class="contact-photo">').append(createIcon('bi/people.svg'))
            )
          }
          this.$body.empty().append(
            $photo,
            $('<div class="name">').append(
              callees.length === 1 ? callModel.getCalleeName(callees[0]) : $.txt(gt('Conference call'))
            ),
            $('<div class="email">').text(gt.noI18n(callees.join(', ')))
          )
        },
        async renderService () {
          const type = callModel.getType()
          const [{ default: CallView }] = await manifestManager.loadPluginsFor(`conference/call-view/${type}`)
          this.conference = new CallView({ model: callModel })
          this.$body.append(this.conference.render().$el)
        },
        renderButtons () {
          const state = this.conference.model.get('state')
          this.$footer.empty()
          switch (state) {
            case 'offline':
              this.renderCancelButton()
              break
            case 'unauthorized':
              this.renderConnectButtons()
              break
            case 'authorized':
            case 'done':
              this.renderCallButtons()
              // no default
          }
        },
        renderConnectButtons () {
          let renderFn
          if (_.isFunction(this.conference.createConnectButtons)) {
            renderFn = this.conference.createConnectButtons.bind(this)
          } else {
            renderFn = function () {
              return $('<div class="action-button-rounded">').append(
                this.createButton('cancel', gt('Cancel'), 'bi/x.svg'),
                this.createButton('connect', gt('Connect'), 'bi/plug.svg', 'btn-accent')
              )
            }
          }
          this.$footer.append(renderFn())
        },
        renderCallButtons () {
          this.$footer.append($('<div class="action-button-rounded">').append(
            this.createButton('cancel', gt('Cancel'), 'bi/x.svg'),
            this.createButton('call', gt.pgettext('verb', 'Call'), 'bi/telephone-fill.svg', 'btn-green')
          ))
          this.toggleCallButton()
          this.$('button[data-action="call"]').focus()
        },
        renderCancelButton () {
          this.$footer.append($('<div class="action-button-rounded">').append(
            this.createButton('cancel', gt('Cancel'), 'bi/x.svg')
          ))
          this.$('button[data-action="cancel"]').focus()
        },
        createButton (action, title, icon, className) {
          return createCircularButton({ action, title, icon }).addClass(className)
        },
        toggleCallButton () {
          const url = this.conference.model.get('joinURL')
          this.getButton('call').prop('disabled', !url)
        },
        getButton (action) {
          return this.$(`button[data-action="${CSS.escape(action)}"]`)
        },
        getJoinURL () {
          return this.conference.model.get('joinURL')
        }
      })
      .build(function () {
        this.$header.addClass('sr-only')
        this.$el.addClass('call-dialog')
        this.renderCallees()
        this.renderService().then(function () {
          this.renderButtons()
          this.listenTo(this.conference.model, 'change:state', this.renderButtons)
          this.listenTo(this.conference.model, 'change:joinURL', this.toggleCallButton)
          this.listenTo(this.conference.model, 'done', this.close)
        }.bind(this))
      })
      .on('connect', function () {
        this.conference.trigger('connect')
      })
      .on('call', function () {
        const url = this.getJoinURL()
        if (!url) return
        window.open(url, 'call')
        callModel.set('joinURL', url).propagate()
        ringtone.outgoing.play()
        this.getButton('cancel').remove()
        this.getButton('call').replaceWith(
          this.createButton('hangup', gt('Hang up'), 'bi/telephone-fill.svg', 'btn-red hangup')
        )
        callModel.addToHistory()
      })
      .on('hangup', function () {
        this.close()
      })
      .on('close', function () {
        ringtone.outgoing.stop()
        callModel.hangup()
      })
      .open()
  }
}
