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

import Datepicker from '@/io.ox/backbone/views/datepicker'
import perspective from '@/io.ox/calendar/perspective'
import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import '@/io.ox/calendar/year/style.scss'

import gt from 'gettext'

const YearView = Backbone.View.extend({

  className: 'month-container',

  events: {
    click: 'onClick'
  },

  initialize (opt) {
    this.date = moment(opt.date)
    this.app = opt.app
    this.perspective = opt.perspective
    this.listenTo(this.model, 'change:numPerRow', this.onChangeNumRow)
    this.onChangeNumRow()
  },

  renderCaption () {
    return $('<caption>').append(
      $('<h2>').append(
        $('<button type="button" class="btn btn-link">').text(this.date.format('MMMM'))
      )
    )
  },

  renderHeader () {
    const firstDayOfWeek = moment.localeData().firstDayOfWeek()
    return $('<thead>').append(
      $('<th class="cw">').text(gt('CW')),
      _.range(firstDayOfWeek, firstDayOfWeek + 7).map(function (index) {
        const day = moment().day(index % 7)
        const cell = $('<th>').text(day.format('dd'))
        if (day.day() === 0 || day.day() === 6) cell.addClass('weekend')
        return cell
      })
    )
  },

  renderBody () {
    const body = $('<tbody>')
    const week = moment(this.date).startOf('week')
    const endOfMonth = moment(this.date).endOf('month').endOf('week')
    const today = moment()

    for (; week.isBefore(endOfMonth); week.add(1, 'week')) {
      const row = $('<tr>')
      const day = moment(week)
      const endOfWeek = moment(week).endOf('week')

      row.append($('<td class=cw>').text(day.format('w')))
      for (; day.isBefore(endOfWeek); day.add(1, 'day')) {
        const cell = $('<td>').text(day.date())
        if (day.day() === 0 || day.day() === 6) cell.addClass('weekend')
        if (!day.isSame(this.date, 'month')) {
          cell.addClass('out')
          cell.empty().append($('<span aria-hidden="true" role="presentation">').text(day.date()))
        }
        if (day.isSame(today, 'day')) cell.addClass('today')
        row.append(cell)
      }

      body.append(row)
    }

    return body
  },

  render () {
    this.$el.append(
      $('<table class="month">').append(
        this.renderCaption(),
        this.renderHeader(),
        this.renderBody()
      )
    )
    return this
  },

  onChangeNumRow () {
    this.$el.css('width', 'calc(' + (100 / this.model.get('numPerRow')) + '% - 16px)')
  },

  onClick () {
    this.app.props.set('date', this.date.valueOf())
    // change settings, not props (keeps app and dropdown synced)
    this.app.settings.set('layout', 'month')
    this.$el.closest('.year-view').busy()
      .find('button').prop('disabled', true)
  }
})

const YearDatepicker = Datepicker.extend({
  switchMode (mode, value) {
    this.trigger('select:year', value)
    this.close()
  },
  onToday () {
    this.setDate(this.getToday())
    this.$grid.focus()
  }
})

const CalendarHeader = perspective.CalendarHeader.extend({
  render () {
    this.renderNavigation()
    this.renderCurrent()
    this.renderLayoutDropdown()
    this.update()

    const self = this
    new YearDatepicker({ date: this.app.getDate().year(), todayButton: false })
      .attachTo(this.$current)
      .on('select:year', year => {
        this.app.setDate(moment([year]))
      })
      .on('before:open', function () {
        const year = self.app.getDate().year()
        this.setDate(moment().year(year))
        this.mode = 'decade'
      })

    this.listenTo(this.model, 'change:year', this.update)

    return this
  },

  update () {
    this.$currentText.text(this.model.get('year'))
  }
})

const View = perspective.View.extend({

  className: 'year-view translucent-high',

  initialize (opt) {
    this.app = opt.app

    this.model = new Backbone.Model({
      year: this.app.getDate().year(),
      numPerRow: this.getNumPerRow()
    })

    this.listenTo(this.model, 'change:year', this.getCallback('onChangeYear'))
    this.listenTo(this.model, 'change:date', this.getCallback('onChangeDate'))
    this.listenTo(this.app, 'change:folderview', this.onWindowResize)
    this.listenToDOM(window, 'resize', this.onWindowResize)
    this.on('show', this.onShow)

    perspective.View.prototype.initialize.call(this, opt)
  },

  renderViews () {
    const year = this.model.get('year')
    const start = moment([year])
    const end = moment([year]).endOf('year')

    let container = this.$('.year-view-container').empty()
    if (container.length === 0) container = $('<div class="year-view-container">')

    this.model.set('today', moment())

    for (; start.isBefore(end); start.add(1, 'month')) {
      container.append(
        new YearView({
          date: moment(start),
          app: this.app,
          model: this.model
        }).render().$el
      )
    }
    return container
  },

  render () {
    this.onWindowResize()
    this.$el.append(
      new CalendarHeader({ app: this.app, view: this, model: this.model, type: 'year' }).render().$el,
      this.renderViews()
    )
    return this
  },

  onShow () {
    this.$('button').prop('disabled', false)
    this.$el.idle()
  },

  onWindowShow () {
    if (this.$el.is(':visible')) this.trigger('show')
  },

  onChangeDate (model, value) {
    this.model.set('year', moment(value).year())
  },

  onChangeYear () {
    this.renderViews()
  },

  getNumPerRow () {
    const minWidth = 320
    const width = this.$el.width()
    let numPerRow = ((width / minWidth) >> 0)
    const allowed = [1, 2, 3, 4, 6]
    if (allowed.indexOf(numPerRow) < 0) {
      if (numPerRow <= 0) numPerRow = 1
      else if (numPerRow > 6) numPerRow = 6
      else if (numPerRow === 5) numPerRow = 4
      else numPerRow = 1
    }
    return numPerRow
  },

  onWindowResize () {
    this.model.set('numPerRow', this.getNumPerRow())
  },

  setStartDate (value) {
    const year = _.isString(value)
      ? this.model.get('year') + (value === 'next' ? +1 : -1)
      : moment().year()
    this.app.setDate(moment([year]))
  },

  refresh () {
    const now = new Date()
    const today = this.model.get('today')
    const year = this.model.get('year')

    // still the same day
    if (now.getDate() === today.date()) return
    // rerender completely, when new year
    if (now.toISOString().split('T')[0] === `${year + 1}-01-01`) this.onChangeDate({}, now.valueOf())
    // displayed year not matching
    if (now.getFullYear() !== year) return
    this.renderViews()
  }
})

export default View
