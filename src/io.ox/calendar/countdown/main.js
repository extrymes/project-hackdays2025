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
import _ from '@/underscore'
import $ from '@/jquery'
import http from '@/io.ox/core/http'
import moment from '@open-xchange/moment'
import Backbone from 'backbone'
import { ZULU_FORMAT, getDateTimeIntervalMarkup } from '@/io.ox/calendar/util'
import DisposableView from '@/io.ox/backbone/views/disposable'
import calendarAPI from '@/io.ox/calendar/api'
import { playSound } from '@/io.ox/core/tk/sounds-util'
import { createIcon } from '@/io.ox/core/components'
import { getJoinDetails, getJoinButton, getJoinIcon } from '@/io.ox/conference/util'
import { isEnabledByUser, onChangeUserToggle, getFeedbackUrl } from '@/io.ox/core/feature'
import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import '@/io.ox/calendar/countdown/style.scss'

const TEN_SECONDS = 10_000
const ONE_MINUTE = 60_000
const EXPIRES = 600_000
let leadTime = 5
let meetingsOnly = false

export async function getUpcomingAppointments (n = 1) {
  const now = moment().valueOf()
  const tenMinutesAgo = moment().subtract(10, 'minutes').utc()
  const rangeStart = tenMinutesAgo.format(ZULU_FORMAT)
  const rangeEnd = moment().add(leadTime, 'minutes').utc().format(ZULU_FORMAT)
  return http
    .PUT({
      module: 'chronos',
      params: {
        action: 'all',
        expand: true,
        fields: 'attendees,conferences,description,endDate,folder,id,location,startDate,summary,transp',
        rangeStart,
        rangeEnd,
        sort: 'startDate',
        order: 'asc'
      },
      data: { folders: ['cal://0/all'] }
    })
    .then(result => {
      if (!result?.length) return []
      return _(result?.[0]?.events)
        .chain()
        .filter(data => {
          if (data.transp !== 'OPAQUE') return false
          const startTimestamp = moment.tz(data.startDate.value, data.startDate.tzid).valueOf()
          if (startTimestamp < tenMinutesAgo) return false
          // add id to sortKey to ensure same order
          data.sortKey = startTimestamp + '.' + data.id
          const end = moment.tz(data.endDate.value, data.endDate.tzid).valueOf()
          if (end <= now) return false
          const partStat = _(data.attendees).findWhere({ cuType: 'INDIVIDUAL', entity: ox.user_id })?.partStat
          if (!/^(ACCEPTED|TENTATIVE)$/i.test(partStat)) return false
          // skip appointments closed by user
          if (isClosed(uuid(data), 'started')) return false
          // restrict to meetings
          if (meetingsOnly && data.attendees.length <= 1 && !getJoinDetails(data).url) return false
          return true
        })
        .sortBy('sortKey')
        .first(n)
        .value()
    })
}

export const CountdownCollectionView = DisposableView.extend({
  className: 'countdown-collection draggable',
  events: {
    'click [data-action="minimize"], [data-action="maximize"]': 'toggleSize',
    'click [data-action="feedback"]': 'feedback'
  },
  initialize () {
    this.collection = new Backbone.Collection()
    this.isSmall = localStorage.getItem('countdown.small') === 'true'
    this.listenTo(this.collection, 'reset add remove', _.debounce(this.render, 10))
    const feedbackUrl = getFeedbackUrl('countdown')
    this.$el.toggleClass('small', this.isSmall).append(
      // just for early internal development purposes
      feedbackUrl
        ? $('<div class="feedback">')
          .html('This feature is in a trial phase.<br><a href="#" data-action="feedback">Click here for feedback and details (e.g. how to turn it off)</a>')
        : $()
    )
    // add to DOM
    this.$el.hide().appendTo('body')
    // delay by number of milliseconds to match clock tick
    setTimeout(() => {
      const interval = setInterval(() => this.tick(), 1000)
      this.on('dispose', () => clearInterval(interval))
    }, 1000 - moment().millisecond())
  },
  tick () {
    this.propagate('tick', moment())
  },
  propagate (event, payload) {
    this.collection.each(model => model.trigger(event, payload))
  },
  render () {
    this.$('.countdown').remove()
    this.$el.toggle(!!this.collection.length)
    this.$el.prepend(
      this.collection.map(model => new CountdownView({ model, isSmall: this.isSmall }).render().$el)
    )
    return this
  },
  toggleSize (e) {
    this.isSmall = !this.isSmall
    this.$el.toggleClass('small', this.isSmall)
    this.propagate('resize', this.isSmall)
    // remember
    localStorage.setItem('countdown.small', this.isSmall)
    // refocus
    const $el = $(e.target)
    $el.closest('.countdown').find(`[data-action="${this.isSmall ? 'maximize' : 'minimize'}"]`).focus()
  },
  feedback () {
    window.open(getFeedbackUrl('countdown'), 'feedback')
  }
})

export const CountdownView = DisposableView.extend({
  className: 'countdown text-sm',
  events: {
    'click [data-action="snooze"], [data-action="close"], [data-action="join"]': 'close'
  },
  initialize ({ model, isSmall = false }) {
    this.$counter = $('<div class="counter font-mono text-2xl mt-8">')
    this.$caption = $('<div class="caption opacity-75">')
    this.appointment = model.toJSON()
    this.uuid = uuid(this.appointment)
    this.start = moment.tz(this.appointment.startDate.value, this.appointment.startDate.tzid)
    this.notify = _.debounce(this.notify, 5000, true)
    this.$el.attr('data-uuid', this.uuid).hide()
    this.listenTo(model, 'tick', this.update)
    this.listenTo(model, 'resize', this.resize)
    this.resize(isSmall)
  },
  render () {
    const joinDetails = getJoinDetails(this.appointment)
    const $location = $('<div class="location mb-8">')
    const summary = this.appointment.summary
    // const feedbackUrl = getFeedbackUrl('countdown')
    if (joinDetails.url) {
      const $button = getJoinButton(joinDetails)
      $button.prepend(createIcon('bi/camera-video.svg').addClass('me-8'))
      $location.append($button.addClass('my-8'))
    } else {
      $location.addClass('truncate').text(this.appointment.location)
    }
    this.$el.empty()
      .attr({ 'data-detail-popup': 'appointment', 'data-cid': _.cid(this.appointment) })
      .append(
        // large layout
        $('<div class="panel-large flex-col p-16">').append(
          $('<div class="flex-row">').append(
            $('<div class="title text-bold text-lg truncate multiline three-lines mb-8 flex-grow">').text(summary),
            createButton('minimize', gt('Minimize'), 'bi/arrows-angle-contract.svg').addClass('ms-16'),
            createButton('snooze', gt('Snooze'), 'bi/clock.svg').addClass('-me-8'),
            createButton('close', gt('Close'), 'bi/x-lg.svg').addClass('-me-8').hide()
          ),
          $location,
          $('<div class="flex-row">').append(
            $('<div class="flex-grow">').append(
              $('<div class="start text-bold">').append(
                // make sure to show time in local timezone
                getDateTimeIntervalMarkup(this.appointment, { zone: moment().tz(), noTimezoneLabel: true })
              ),
              $('<div class="caption opacity-75">')
            ),
            $('<div class="counter font-mono text-2xl text-right">')
          )
        ),
        // small layout -- eventually it's easier and cleaner to have everything twice
        $('<div class="panel-small flex-row">').append(
          joinDetails.url ? getJoinIcon(joinDetails).addClass('circle join-icon') : $(),
          $('<div class="title truncate flex-grow ms-16 me-8">')
            .attr('title', summary).text(summary),
          $('<div class="counter font-mono text-bold text-right">'),
          createButton('maximize', gt('Maximize'), 'bi/arrows-angle-expand.svg').addClass('circle ms-8'),
          createButton('snooze', gt('Snooze'), 'bi/clock.svg').addClass('circle'),
          createButton('close', gt('Close'), 'bi/x-lg.svg').addClass('circle').hide()
        )
      )

    this.update()
    return this

    function createButton (action, title, icon) {
      return $(`<button type="button" class="btn btn-action" data-action="${action}">`)
        .attr('title', title)
        .append(createIcon(icon))
    }
  },
  update (now = moment()) {
    if (this.disposed) return
    const diff = now.valueOf() - this.start.valueOf()
    const state = this.getState(diff)
    switch (state) {
      case 'soon':
        this.$el.removeClass('starting late')
        this.$('.caption').text(gt('The meeting will start soon'))
        break
      case 'in-a-minute':
        // show started/yellow color 10 seconds before the meeting
        this.$el.removeClass('late').toggleClass('starting', diff > -TEN_SECONDS)
        this.$('.caption').text(gt('The meeting will start in a minute'))
        break
      case 'started':
        if (diff < ONE_MINUTE) {
          // running since 1 minute
          this.$el.addClass('starting').removeClass('late')
          this.$('.caption').text(gt('The meeting has just started'))
        } else {
          this.$el.removeClass('starting').addClass('late')
          this.$('.caption').text(gt('The meeting has already started'))
        }
        this.$('[data-action="snooze"]').hide()
        this.$('[data-action="close"]').show()
        break
    }
    this.setState(state)
    // update
    const duration = moment.utc(Math.abs(diff))
    this.$('.counter').text(duration.format('m:ss'))
    // play once when the meeting starts
    if (diff >= -1000 && diff <= 500) this.notify()
    // hide after 10 minutes
    if (diff > EXPIRES) this.close()
  },
  getState (diff) {
    if (diff < -(leadTime * ONE_MINUTE)) return 'waiting'
    if (diff < -ONE_MINUTE) return 'soon'
    if (diff < 0) return 'in-a-minute'
    return 'started'
  },
  setState (state) {
    if (this.state === state) return
    this.state = state
    if (isClosed(this.uuid, state)) return
    if (/^(soon|in-a-minute|started)$/.test(state)) this.show()
  },
  show () {
    // apply last position
    if (right !== undefined) applyPosition(this.$el, top, right)
    this.$el.show()
  },
  notify () {
    // this one gets throttled in initialize
    // we need a dedicated alarm sound (not just a ping)
    playSound()
    // show desktop notification
    showDesktopNotification({
      title: this.appointment.summary,
      body: gt('Meeting starts now') + ` (${this.start.format('LT')})`,
      onclick: () => {
        window.focus()
        ox.launch(() => import('@/io.ox/calendar/main'))
      }
    })
  },
  close () {
    sessionStorage.setItem(`countdown.closed.${uuid(this.appointment)}.${getCloseState(this.state)}`, true)
    this.$el.hide()
    renderCountdown()
  },
  resize (isSmall = false) {
    this.$el.toggleClass('small', isSmall)
  }
})

// we need a unique cid per startDate
function uuid (appointment) {
  return _.cid(appointment) + '.' + appointment.startDate.value
}

function isClosed (uuid, state) {
  return !!sessionStorage.getItem(`countdown.closed.${uuid}.${getCloseState(state)}`)
}

function getCloseState (state) {
  return /^(waiting|soon|in-a-minute|)$/.test(state) ? 'before' : 'after'
}

// separate implementation independent of global user setting and visibility API
function showDesktopNotification ({ title, body, onclick } = {}) {
  switch (Notification.permission) {
    case 'unsupported':
    case 'denied':
      return
    case 'granted':
      proceed()
      break
    default:
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') proceed()
      })
      break
  }
  function proceed () {
    // eslint-disable-next-line no-new
    new Notification(title, { body, onclick })
  }
}

const countdownCollectionView = new CountdownCollectionView()

const renderCountdown = _.debounce(async function () {
  try {
    const upcoming = await getUpcomingAppointments(3)
    countdownCollectionView.collection.reset(upcoming)
  } catch (e) {
    console.error('renderCountdown', e)
  }
}, 100, true)

let dragging = null; let startX = 0; let startY = 0; let top; let right; let outerWidth
$(document)
  .on('mousedown', '.countdown-collection.draggable', e => {
    dragging = e.currentTarget
    const $el = $(dragging)
    const position = $el.position()
    outerWidth = $el.outerWidth()
    position.right = document.body.clientWidth - position.left - outerWidth
    startX = (document.body.clientWidth - e.pageX) - position.right
    startY = e.pageY - position.top
    ox.trigger('drag:start')
  })
  .on('mouseup', () => {
    if (!dragging) return
    if (top) localStorage.setItem('countdown.position.top', top)
    if (right) localStorage.setItem('countdown.position.right', right)
    setTimeout(el => $(el).removeClass('dragged'), 0, dragging)
    dragging = null
    ox.trigger('drag:stop')
  })
  .on('mousemove', e => {
    if (!dragging) return
    const width = document.body.clientWidth
    top = (e.pageY - startY) * 100 / document.body.clientHeight
    right = (width - (e.pageX + startX)) * 100 / width
    applyPosition($(dragging), top, right).addClass('dragged')
  })

function applyPosition ($el, t = 0, r = 0) {
  // we need a fallback width since the $el might be detached
  const outerWidth = $el.outerWidth() || 420
  const width = document.body.clientWidth
  const maxRight = (width - outerWidth) / width * 100
  t = Math.min(Math.max(0, t), 90)
  r = Math.min(Math.max(0, r), maxRight)
  return $el.css({ top: `${t}%`, right: `min(calc(100vw - ${outerWidth}px), ${r}%)`, left: 'auto' })
}

// respond to changing user settings
const applyUserSettings = () => {
  meetingsOnly = settings.get('countdown/meetingsOnly', false)
  leadTime = parseInt(settings.get('countdown/leadTime', '5'), 10) || 5
}
applyUserSettings()
settings.on('change:countdown/meetingsOnly change:countdown/leadTime', () => {
  if (!isEnabledByUser('countdown')) return
  applyUserSettings()
  renderCountdown()
})

// calendar events
const EVENTS = 'refresh.all create update delete'

function start () {
  renderCountdown()
  calendarAPI.on(EVENTS, renderCountdown)
}

function stop () {
  countdownCollectionView.collection.reset()
  calendarAPI.off(EVENTS, renderCountdown)
}

onChangeUserToggle('countdown', value => {
  if (value) start(); else stop()
})

// final check of feature toggle to be sure
if (isEnabledByUser('countdown')) start()
