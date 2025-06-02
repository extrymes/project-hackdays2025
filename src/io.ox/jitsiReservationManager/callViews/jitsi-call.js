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

import DisposableView from '@/io.ox/backbone/views/disposable'
import api from '@/io.ox/jitsiReservationManager/api'
import { createIcon } from '@/io.ox/core/components'
import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'

import gt from 'gettext'

const JitsiCallView = DisposableView.extend({

  className: 'conference-view jitsi',

  constructor: function () {
    DisposableView.prototype.constructor.apply(this, arguments)
    this.model.set('state', 'creating')
    this.listenTo(this.model, 'change:state', this.onStateChange)
    this.createMeeting()
  },

  onStateChange () {
    this.$el.empty().removeClass('error')
    this.render()
  },

  getJoinURL () {
    return this.model.get('joinURL')
  },

  render () {
    if (this.model.get('state') === 'done') this.renderDone()
    else this.renderPending()
    return this
  },

  renderPending () {
    this.$el.append(
      $('<div class="pending">').append(
        // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
        $.txt(gt('Creating %s conference...', jitsiSettings.get('productName'))),
        createIcon('bi/arrow-clockwise.svg').addClass('animate-spin')
      )
    )
  },

  renderDone () {
    const url = this.getJoinURL()
    this.$el.empty().append(
      $('<div>').append(
        $('<a target="_blank" rel="noopener">').attr('href', url).html(
          _.escape(url).replace(/([-/.?&=])/g, '$1<wbr>')
        )
      ),
      $('<div>').append(
        $(`<button type="button" class="btn btn-link copy-to-clipboard">${gt('Copy to clipboard')}</button>`)
          .on('click', () => navigator.clipboard.writeText(url))
      )
    )
  },

  createMeeting () {
    return api.createMeeting().then((data) => {
      this.model.set({ joinURL: data.joinLink, state: 'done' })
      // this.renderDone()
    }, error => console.error(error))
  }

})

export default JitsiCallView
