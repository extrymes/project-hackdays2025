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

import ext from '@/io.ox/core/extensions'
import perspective from '@/io.ox/calendar/perspective'
import * as util from '@/io.ox/calendar/util'
import api from '@/io.ox/calendar/api'
import print from '@/io.ox/core/print'
import '@/io.ox/calendar/extensions'
import '@/io.ox/calendar/month/extensions'
import '@/io.ox/calendar/month/style.scss'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import { createIcon } from '@/io.ox/core/components'
import Picker from '@/io.ox/backbone/views/datepicker'

import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'

const CalendarHeader = perspective.CalendarHeader.extend({

  render () {
    this.renderNavigation()
    this.renderCurrent()
    this.renderLayoutDropdown()
    this.update()

    return this
  },

  update () {
    this.$currentText.text(this.model.get('startOfMonth').formatCLDR('yMMMM'))
    // Show displayed month name as title on mobile (navbar not available on desktop!)
    this.app.pages.getNavbar('month')?.setTitle(
      this.model.get('startOfMonth').format('MMMM YYYY')
    )
  },

  attachDatePicker () {
    if (_.device('smartphone')) return

    const picker = new Picker({ date: this.model.get('date').clone() })
      .attachTo(this.$current.find('button'))
      .on('select', date => this.app.setDate(date.clone()))
      .on('before:open', () => picker.setDate(this.model.get('date')))
  }

})

const MonthView = perspective.DragHelper.extend({

  tagName: 'table',

  className: 'month',

  events () {
    const events = {}
    _.extend(events, {
      'dblclick .day': 'onCreateAppointment'
    })
    if (_.device('smartphone')) {
      _.extend(events, {
        'click .day': 'onTapAppointment'
      })
    }
    if (_.device('touch')) {
      _.extend(events, {
        'touchstart .day': 'startTouchTimer',
        'touchmove .day': 'clearTouchTimer',
        'touchend .day': 'clearTouchTimer'
      })
    }
    if (_.device('desktop')) {
      _.extend(events, {
        'mouseenter .appointment': 'onHover',
        'mouseleave .appointment': 'onHover',
        'mousedown .appointment.modify': 'onDrag'
      })
    }
    return events
  },

  initialize () {
    this.on('collection:add', this.onAddAppointment)
    this.on('collection:change', this.onChangeAppointment)
    this.on('collection:remove', this.onRemoveAppointment)
    this.on('collection:before:reset', this.onBeforeReset)
    this.on('collection:after:reset', this.onAfterReset)

    this.listenTo(this.model, 'change:startDate', this.render)
    this.listenTo(this.opt.app.props, 'change:showMonthviewWeekend', this.updateWeekends)
    this.updateWeekends()
  },

  startTouchTimer (e) {
    this.touchTimer = setTimeout(this.onCreateAppointment.bind(this, e), 500)
  },

  clearTouchTimer () {
    clearTimeout(this.touchTimer)
  },

  updateWeekends () {
    this.$el.toggleClass('weekends', _.device('smartphone') || this.opt.app.props.get('showMonthviewWeekend'))
  },

  render () {
    const self = this
    const day = this.model.get('startDate').clone()
    const end = this.model.get('endDate').clone()
    let row
    const tbody = $('<tbody>')

    // add days
    for (; day.isBefore(end); day.add(1, 'day')) {
      if (!row || day.isSame(day.clone().startOf('week'), 'day')) {
        row = $('<tr class="week">').append(
          $('<td class="day cw">').append(
            $('<span class="number">').text(gt('CW %1$d', day.format('w')))
          )
        )
        tbody.append(row)
      }

      const dayCell = $('<td>')
      row.append(
        dayCell.addClass('day')
          .attr({
            id: day.format('YYYY-M-D'),
            // #. %1$s is a date: october 12th 2017 for example
            title: gt('%1$s', day.format('ddd LL'))
          })
          .data('date', day.valueOf())
          .append(
            $('<div class="number" aria-hidden="true">').append(
              day.isSame(self.model.get('startOfMonth'), 'week') ? $('<span class="day-label">').text(day.format('ddd')) : '',
              day.date()
            ),
            $('<div class="list abs">')
          )
      )

      if (day.isSame(moment(), 'day')) dayCell.addClass('today')
      if (day.day() === 0 || day.day() === 6) dayCell.addClass('weekend')
      if (!day.isSame(this.model.get('startOfMonth'), 'month')) dayCell.addClass('out')
    }

    this.$el.empty().append(
      $('<thead>').append(
        $('<tr>').append(
          function () {
            const labels = []; const current = day.clone().startOf('week')
            for (let i = 0; i < 7; i++, current.add(1, 'day')) {
              labels.push($('<th>').text(current.format('ddd')))
            }
            return labels
          }
        )
      ),
      tbody
    )

    this.$('tbody tr').css('height', (Math.floor(100 / this.$('tbody tr').length) + '%'))

    if (_.device('smartphone')) {
      this.$el.css('min-height', 100 / 7 * this.$el.children(':not(.month-name)').length + '%')
    }

    return this
  },

  onTapAppointment (e) {
    const app = this.opt.app
    app.setDate($(e.currentTarget).data('date'))
    app.pages.changePage('week:day', { animation: 'slideleft' })
  },

  renderAppointment (model, startDate) {
    const node = $('<button class="appointment" type="button">')
      .attr({
        'data-cid': model.cid,
        'data-root-id': util.cid({ id: model.get('id'), folder: model.get('folder') }),
        'data-extension-point': 'io.ox/calendar/appointment',
        'data-composite-id': model.cid
      })
      .data('startDate', model.getTimestamp('startDate'))

    const baton = ext.Baton(_.extend({}, this.opt, { model, folders: this.opt.app.folders.list(), startDate }))
    ext.point('io.ox/calendar/appointment').invoke('draw', node, baton)
    ext.point('io.ox/calendar/month/view/appointment').invoke('draw', node, baton)

    return node
  },

  onFoldersChange () {
    if (this.model.get('mergeView')) this.render()
  },

  onCreateAppointment (e) {
    if ($(e.target).closest('.appointment').length > 0) return

    const start = moment($(e.currentTarget).data('date'))
    const folder = this.opt.app.folder.get()
    // add current time to start timestamp
    start.add(Math.ceil((moment().hours() * 60 + moment().minutes()) / 30) * 30, 'minutes')

    this.opt.view.createAppointment({
      startDate: { value: start.format('YYYYMMDD[T]HHmmss'), tzid: start.tz() },
      endDate: { value: start.add(1, 'hour').format('YYYYMMDD[T]HHmmss'), tzid: start.tz() },
      folder
    })
  },

  onHover (e) {
    const cid = util.cid(String($(e.currentTarget).data('cid')))
    const el = this.$(`[data-root-id="${CSS.escape(cid.folder + '.' + cid.id)}"]:visible`)
    const bg = el.data('background-color')
    const color = el.data('color')
    const isDark = $('html').hasClass('dark')

    switch (e.type) {
      case 'mouseenter':
        el.addClass('hover')
        if (bg) {
          const newBg = util.lightenDarkenColor(bg, 0.93)
          el.css({ 'background-color': newBg, color: isDark ? color : util.getForegroundColor(newBg) })
        }
        break
      case 'mouseleave':
        el.removeClass('hover')
        if (bg) {
          el.css({ 'background-color': bg, color: isDark ? color : util.getForegroundColor(bg) })
        }
        break
      default:
        break
    }
  },

  onDrag (e) {
    let node; let model; let startDate; let diff; let cloneCID
    let first = true
    // area where nothing happens. Mouse must move at least this far from starting position for drag to trigger (prevents accidental dragging, when appointment detail view should be opened instead)
    // note: set this to at least 1. disabling this causes issues on windows, somehow the first mousemove is triggered directly after mousedown, without movement involved.
    //       This causes issues as it prevents appointments from opening the detail view
    // deadzone is just a square for now, no pythagoras to determine the distance
    const deadzone = 5
    const startCoords = { x: 0, y: 0 }
    let inDeadzone = true

    this.mouseDragHelper({
      event: e,
      updateContext: '.day',
      delay: 300,
      start (e) {
        inDeadzone = true
        node = $(e.target).closest('.appointment')
        model = this.opt.view.collection.get(node.attr('data-cid'))
        startDate = moment(node.closest('.day').data('date'))
        startCoords.x = e.pageX
        startCoords.y = e.pageY

        // Clone appointment to show origin of appointment during drag
        const cloneNode = node.clone()
        cloneCID = 'clone' + model.cid
        cloneNode.attr('data-cid', cloneCID).css('opacity', '0.7')
        node.closest('.day').find('.list').first().prepend(cloneNode)
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('hover')
      },
      update (e) {
        if (inDeadzone && (Math.abs(startCoords.x - e.pageX) > deadzone || Math.abs(startCoords.y - e.pageY) > deadzone)) {
          inDeadzone = false
        }
        if (inDeadzone) return
        if (first) {
          this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('current hover')
          this.$el.addClass('no-select')
          first = false
        }

        const target = $(e.target).closest('.day')
        if (target.length === 0) return
        diff = moment(target.data('date')).diff(startDate, 'days')
        const targetDate = model.getMoment('startDate').add(diff, 'days')
        const cell = this.$('#' + targetDate.format('YYYY-M-D') + ' .list')
        if (node.parent().is(cell)) return
        node.data('startDate', targetDate.valueOf())
        cell.append(node)
        cell.append(cell.children().sort(this.nodeComparator))
        node.get(0).scrollIntoView()
        if (diff === 0) return this.$(`[data-cid="${CSS.escape(cloneCID)}"]`).hide()
        this.$(`[data-cid="${CSS.escape(cloneCID)}"]`).show()
      },
      end () {
        node.removeClass('resizing')
        this.$el.removeClass('no-select')
        this.$(`[data-cid="${CSS.escape(cloneCID)}"]`).remove()
        const newStartDate = model.getMoment('startDate').add(diff, 'days')
        const newEndDate = model.getMoment('endDate').add(diff, 'days')
        if (newStartDate.isSame(model.getMoment('startDate'))) return
        let newStart = { value: newStartDate.format('YYYYMMDD[T]HHmmss'), tzid: newStartDate.tz() }
        let newEnd = { value: newEndDate.format('YYYYMMDD[T]HHmmss'), tzid: newEndDate.tz() }
        if (util.isAllday(model)) {
          newStart = { value: newStartDate.format('YYYYMMDD') }
          newEnd = { value: newEndDate.format('YYYYMMDD') }
        }
        this.opt.view.updateAppointment(model, { startDate: newStart, endDate: newEnd })
      },
      cancel () {
        this.$el.removeClass('no-select')
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).remove()
        this.$(`[data-cid="${CSS.escape(cloneCID)}"]`).show().css('opacity', '').attr('data-cid', model.cid)
      }
    })
  },

  nodeComparator: function comparator (a, b) {
    return $(a).data('startDate') - $(b).data('startDate')
  },

  onAddAppointment (model) {
    if (settings.get('showDeclinedAppointments', false) === false && util.getConfirmationStatus(model) === 'DECLINED') return

    // we need to convert start and end time to the local timezone of this calendar or we will display appointments from other timezones on the wrong day
    const startMoment = moment.max(util.getMomentInLocalTimezone(model.get('startDate')), this.model.get('startDate')).clone()
    const endMoment = moment.min(util.getMomentInLocalTimezone(model.get('endDate')), this.model.get('endDate')).clone()

    // subtract 1ms. This will not be visible and will fix appointments till 12am to not be drawn on the next day (e.g. allday appointments)
    if (!startMoment.isSame(endMoment)) endMoment.subtract(1, 'millisecond')

    if (_.device('smartphone')) {
      do {
        const node = $('#' + startMoment.format('YYYY-M-D') + ' .list', this.$el).empty()
        this.renderAppointmentIndicator(node)
        startMoment.add(1, 'day').startOf('day')
      } while (startMoment.isSameOrBefore(endMoment))
      return
    }

    // draw across multiple days
    while (startMoment.isSameOrBefore(endMoment)) {
      const cell = this.$('#' + startMoment.format('YYYY-M-D') + ' .list')
      cell.append(this.renderAppointment(model, startMoment))
      if (!this.onReset) cell.append(cell.children().sort(this.nodeComparator))
      startMoment.add(1, 'day').startOf('day')
    }
  },

  renderAppointmentIndicator (node) {
    ext.point('io.ox/calendar/month/view/appointment/mobile')
      .invoke('draw', node)
  },

  onChangeAppointment (model) {
    this.onRemoveAppointment(model)
    this.onAddAppointment(model)
  },

  onRemoveAppointment (model) {
    this.$(`[data-cid="${CSS.escape(model.cid)}"]`).remove()
  },

  onBeforeReset () {
    this.$('.appointment').remove()
    this.$('.list.abs').empty()
    this.onReset = true
  },

  onAfterReset () {
    this.onReset = false
  }

})

ext.point('io.ox/calendar/month/view/appointment/mobile').extend({
  id: 'default',
  index: 100,
  draw () {
    this.append(createIcon('bi/circle.svg'))
  }
})

export default perspective.View.extend({

  className: 'monthview-container translucent-low',

  options: {
    limit: 1000
  },

  initialize (opt) {
    this.app = opt.app

    this.model = new Backbone.Model({
      date: opt.startDate || this.app.getDate(),
      currentDate: moment() // stores the current date to detect day changes and update the today label
    })
    this.initializeSubviews()

    this.listenTo(api, 'process:create update delete', this.onUpdateCache)

    this.setStartDate(this.model.get('date'), { silent: true })

    perspective.View.prototype.initialize.call(this, opt)
  },

  initializeSubviews () {
    const opt = _.extend({
      app: this.app,
      view: this,
      model: this.model,
      type: 'month'
    }, this.options)
    this.toolbarView = new CalendarHeader(opt)
    this.monthView = new MonthView(opt)
    this.$el.append(
      this.toolbarView.$el,
      $('<div class="month-container" role="presentation">').append(
        this.monthView.$el
      )
    )
  },

  onChangeDate (model, date) {
    date = moment(date)
    this.model.set('date', date)
    this.setStartDate(date)
  },

  onWindowShow () {
    if (this.$el.is(':visible')) this.trigger('show')
  },

  onUpdateCache () {
    const collection = this.collection
    // set all other collections to expired to trigger a fresh load on the next opening
    api.pool.grep('view=month').forEach(function (c) {
      if (c !== collection) c.expired = true
    })
    collection.sync()
  },

  setStartDate (value, options) {
    if (_.isString(value)) {
      const mode = value === 'next' ? 'add' : 'subtract'
      value = this.model.get('startOfMonth').clone()[mode](1, 'month')
    }

    const previous = moment(this.model.get('startOfMonth'))
    const opt = _.extend({ propagate: true, silent: false }, options)
    const date = moment(value)

    date.startOf('month')

    // only trigger change event if start date has changed
    if (date.isSame(previous)) return
    this.model.set({
      startDate: date.clone().startOf('week'),
      endDate: date.clone().endOf('month').endOf('week'),
      startOfMonth: date
    }, { silent: opt.silent })
    if (opt.propagate) this.app.setDate(moment(value))
    if (ox.debug) console.log('refresh calendar data')
    this.refresh()
  },

  render () {
    this.toolbarView.render()
    this.monthView.render()
    return this
  },

  rerender () {
    this.toolbarView.update()
    this.monthView.render()
    return this
  },

  getRequestParam () {
    const params = {
      start: this.model.get('startDate').valueOf(),
      end: this.model.get('endDate').valueOf(),
      view: 'month',
      folders: this.app.folders.list()
    }
    return params
  },

  async refresh (useCache) {
    const self = this
    const obj = this.getRequestParam()
    const collection = api.getCollection(obj)

    // // set manually to expired to trigger reload on next opening
    if (useCache === false) api.pool.grep('view=month').forEach(c => { c.expired = true })

    // Rerender the view when the date changes (e.g. keep appsuite open overnight)
    if (!this.model.get('currentDate').isSame(moment(), 'day')) {
      this.model.set('currentDate', moment())
      this.rerender()
    }

    this.setCollection(collection)

    // no need to wait for folder data we already have the ids
    // TODO: check errorhandling if folders cannot be read etc
    collection.folders = this.app.folders.folders
    collection.sync()
    const folderData = await Promise.all([this.app.folder.getData(), this.app.folders.getData()])
    self.model.set('folders', folderData[1])
  },

  onAddAppointment (model) {
    this.monthView.trigger('collection:add', model)
  },

  onChangeAppointment (model) {
    this.monthView.trigger('collection:change', model)
  },

  onRemoveAppointment (model) {
    this.monthView.trigger('collection:remove', model)
  },

  onResetAppointments () {
    this.monthView.trigger('collection:before:reset')
    this.collection.forEach(this.monthView.trigger.bind(this.monthView, 'collection:add'))
    this.monthView.trigger('collection:after:reset')
  },

  onPrevious () {
    this.toolbarView.$('.prev').trigger('click')
  },

  onNext () {
    this.toolbarView.$('.next').trigger('click')
  },

  getName () {
    return 'month'
  },

  print () {
    const folders = this.model.get('folders')
    let title = gt('Appointments')
    if (folders.length === 1) title = folders[0].display_title || folders[0].title

    print.request(() => import('@/io.ox/calendar/month/print'), {
      current: this.model.get('startOfMonth').valueOf(),
      start: this.model.get('startDate').valueOf(),
      end: this.model.get('endDate').valueOf(),
      folders: _(folders).pluck('id'),
      title
    })
  },

  // called when an appointment detail-view opens the according appointment
  selectAppointment (model) {
    this.setStartDate(model.getMoment('startDate'))
  }

})
