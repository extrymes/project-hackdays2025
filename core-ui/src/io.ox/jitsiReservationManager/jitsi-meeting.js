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

import DisposableView from '@/io.ox/backbone/views/disposable'
import { getConference } from '@/io.ox/conference/util'
import jitsiApi from '@/io.ox/jitsiReservationManager/api'
import { settings as jitsiSettings } from '@/io.ox/jitsiReservationManager/settings'

import { createIcon } from '@/io.ox/core/components'
import ox from '@/ox'
import gt from 'gettext'
import moment from '@open-xchange/moment'
import { longerThanOneYear } from '@/io.ox/conference/views/util'

const svgConferenceLogo = $('<div class="conference-logo">').append(createIcon('bi/camera-video.svg'))
const svgConferenceErrorLogo = createIcon('bi/exclamation.svg').addClass('conference-logo')

const MeetingView = DisposableView.extend({

  className: 'conference-view zoom',

  events: {
    'click [data-action="copy-to-location"]': 'copyToLocationHandler',
    'click [data-action="copy-to-clipboard"]': 'copyToClipboad'
  },

  initialize (options) {
    this.model = new Backbone.Model({ type: 'jitsi', state: 'done', joinURL: '' })
    this.appointment = options.appointment
    const conference = getConference(this.appointment.get('conferences'))
    this.model.set('joinURL', conference && conference.type === 'jitsi' ? conference.joinURL : '')
    this.listenTo(this.appointment, 'change:rrule', this.onChangeRecurrence)
    this.listenTo(this.appointment, 'create update', this.changeMeeting)
    window.jitsiMeeting = this
  },

  getExtendedProps () {
    return this.appointment.get('extendedProperties') || {}
  },

  getJoinURL () {
    return this.model && this.model.get('joinURL')
  },

  render () {
    this.renderPending()
    this.createMeeting().then(() => this.renderDone()).catch(error => this.renderError(error))
    return this
  },

  renderPending () {
    this.$el.append(
      $('<div class="pending">').append(
        svgConferenceLogo,
        // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
        $.txt(gt('Creating %s conference...', jitsiSettings.get('productName'))),
        createIcon('bi/arrow-clockwise.svg').addClass('animate-spin')
      )
    )
  },

  renderDone () {
    // show meeting
    const url = this.getJoinURL()
    // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
    const recurrenceWarning = gt('%s conferences expire after 365 days. We recommend to limit the series to one year. Alternatively, you can update the series before the meeting expires.', jitsiSettings.get('productName'))
    this.$el.empty().append(svgConferenceLogo,
`
<div class="ellipsis"><b>${gt('Link:')}</b> <a target="_blank" rel="noopener" href="${url}">${gt.noI18n(url)}</a></div>
<div>
  <a href="#" class="secondary-action" data-action="copy-to-location">${gt('Copy to location field')}</a>
  <a href="#" class="secondary-action" data-action="copy-to-clipboard" data-clipboard-text="${url}">${gt('Copy to clipboard')}</a>
</div>
<div class="alert alert-info hidden recurrence-warning">${recurrenceWarning}</div>
`)
    this.autoCopyToLocation()
    this.onChangeRecurrence()
  },

  renderError (errorMessage) {
    const errors = {
      'Reservation not possible in the past': gt('Reservation not possible in the past')
    }
    this.$el.empty().append(
      svgConferenceErrorLogo,
      $('<p class="alert alert-warning message">').append($.txt(errors[errorMessage] || gt('Error creating meeting')))
    )
  },

  copyToClipboad () {
    navigator.clipboard.writeText(this.getJoinURL())
  },

  copyToLocationHandler (e) {
    e.preventDefault()
    this.copyToLocation()
  },

  autoCopyToLocation () {
    if (!jitsiSettings.get('autoCopyToLocation')) return
    if (this.appointment.get('location')) return
    this.copyToLocation()
  },

  copyToLocation (e) {
    this.appointment.set('location', this.getJoinURL())
  },

  getExpirationDate () {
    const rrule = this.appointment.get('rrule')
    if (!rrule) return this.appointment.getMoment('endDate').add(365, 'd').toISOString()
    const until = rrule.match(/UNTIL=([^;]+)/)
    if (!until) return this.appointment.getMoment('startDate').add(365, 'd').toISOString()
    return moment(until[1]).toISOString()
  },

  async createMeeting () {
    if (this.getJoinURL()) return this.model.set({ state: 'done' })
    const meetingData = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), /* this.appointment.getMoment('startDate') */
      expires: this.getExpirationDate()
    }
    const meeting = await jitsiApi.createMeeting(meetingData)
    if (meeting.errorCode) throw meeting.message
    this.appointment.set('conferences', [{
      uri: meeting.joinLink,
      feature: 'VIDEO',
      // #. %s is a configurable product name of meeting service e.g. Jitsi or Zoom
      label: gt('%s Conference', jitsiSettings.get('productName')),
      extendedParameters: {
        'X-OX-TYPE': 'jitsi',
        'X-OX-ID': meeting.id,
        'X-OX-OWNER': ox.user_id
      }
    }])
    this.model.set({ joinURL: meeting.joinLink, state: 'done' })
  },

  changeMeeting () {
    const meeting = this.model.get('meeting')
    if (!meeting) return
    const data = this.appointment.toJSON()
    // This appointment is an exception of a series - do not change the zoom meeting
    if (data.seriesId && (data.seriesId !== data.id)) return
    // This appointment changed to an exception of a series - do not change the zoom meeting
    if (data.seriesId && (data.seriesId === data.id) && !data.rrule) return
    this.createMeeting()
  },

  isDone () {
    return this.getJoinURL() && this.model.get('meeting')
  },

  onChangeRecurrence () {
    const rrule = this.appointment.get('rrule')
    this.$el.find('.recurrence-warning').toggleClass('hidden', !longerThanOneYear(rrule))
  }
})

export default MeetingView
