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
import { getConference } from '@/io.ox/conference/util'
import { createIcon } from '@/io.ox/core/components'
import gt from 'gettext'

const ConferenceSelectView = DisposableView.extend({
  events: {
    'change select': 'onChangeType'
  },
  initialize (options) {
    this.point = options.point
    this.appointment = options.appointment
    this.listenTo(this.appointment, 'warnOldDialInInfo', this.warnOldDialInInfo)
    const conference = getConference(this.appointment.get('conferences'))
    this.type = (conference && conference.type) || 'none'
    this.$col = $('<div class="col-xs-12">')
  },
  removeConference () {
    const location = this.appointment.get('location')
    const conference = location && this.appointment.get('conferences')?.find(conference => conference.uri === location)
    if (conference) this.appointment.set('location', '')
    this.appointment.set('conferences', [])
  },
  onChangeType () {
    this.type = this.$('select').val()
    this.$col.empty()
    this.removeConference()
    if (this.type === 'none') return
    this.renderConferenceDetails()
  },
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<label class="control-label col-xs-12 col-md-6">').attr('for', guid).append(
        $.txt(gt('Conference')),
        $('<select class="form-control" name="conference-type">').attr('id', guid).append(
          this.point.list().map(function (item) {
            return $('<option>').val(item.value).text(item.label)
          })
        )
          .val(this.type)
      ),
      this.$col
    )
    if (this.appointment.get('warnOldDialInInfo')) this.warnOldDialInInfo()
    this.renderConferenceDetails()
    return this
  },
  renderConferenceDetails () {
    this.point.get(this.type, function (extension) {
      if (!extension.render) return
      extension.render.call(this.$col, this)
    }.bind(this))
  },
  warnOldDialInInfo () {
    if (this.warnedOldDialInInfo) return
    this.$el.append(
      $('<div class="col-xs-12">').append(
        $('<div class="conference-view zoom">').append(
          createIcon('bi/exclamation.svg').addClass('conference-logo'),
          $('<p class="alert alert-warning message">').append(
            gt('The appointment description might contain outdated information from a previous zoom conference that needs to be deleted manually.')
          )
        )
      )
    )
    this.warnedOldDialInInfo = true
  }
})

export default ConferenceSelectView
