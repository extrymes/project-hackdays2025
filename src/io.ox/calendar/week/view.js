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
import * as coreUtil from '@/io.ox/core/util'
import api from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import print from '@/io.ox/core/print'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import '@/io.ox/calendar/extensions'
import '@/io.ox/calendar/week/extensions'
import '@/io.ox/calendar/week/style.scss'
import { createIcon } from '@/io.ox/core/components'
import Picker from '@/io.ox/backbone/views/datepicker'

import { settings as coreSettings } from '@/io.ox/core/settings'
import { settings } from '@/io.ox/calendar/settings'
import gt from 'gettext'
import openSettings from '@/io.ox/settings/util'

const CalendarHeader = perspective.CalendarHeader.extend({

  events: {
    'click .merge-split': 'onMergeSplit'
  },

  initialize () {
    if (this.model.get('mode') === 'day') this.listenTo(this.model, 'change:mergeView', this.updateMergeview)
    this.$cw = $('<span class="cw">')
    this.update = _.debounce(this.update, 10)
  },

  update () {
    const startDate = this.model.get('startDate')
    if (this.model.get('numColumns') > 1) {
      // one day less than number of columns or the end date is actually the first day of next week instead of last day of this week
      const endDate = moment(startDate).add(this.model.get('numColumns') - 1, 'days')
      const fromMonth = startDate.format('MMMM')
      const toMonth = endDate.format('MMMM')
      const fromYear = startDate.format('YYYY')
      const toYear = endDate.format('YYYY')

      if (fromMonth === toMonth) {
        this.$currentText.text(startDate.formatCLDR('yMMMM'))
      } else if (fromYear === toYear) {
        // #. %1$s A month name
        // #. %2$s Another month name
        // #. %3$s A four digit year
        // #. Example: January - February 2019
        this.$currentText.text(gt('%1$s - %2$s %3$s', fromMonth, toMonth, fromYear))
      } else {
        // #. %1$s A month name
        // #. %2$s A four digit year
        // #. %3$s Another month name
        // #. %4$s Another year
        // #. Example: December 2019 - January 2020
        this.$currentText.text(gt('%1$s %2$s - %3$s %4$s', fromMonth, fromYear, toMonth, toYear))
      }
    } else {
      this.$currentText.text(startDate.format('ddd, l'))
    }
    this.$cw.text(
      // #. %1$d = Calendar week
      gt('CW %1$d', startDate.format('w'))
    )
    if (_.device('smartphone')) {
      // change navbar title
      this.app.pages.getNavbar('week:day').setTitle(
        this.model.get('numColumns') > 1
          ? startDate.formatInterval(moment(startDate).add(this.model.get('numColumns'), 'days'))
          : `${startDate.format('ddd, l')} (${this.$cw.text()})`
      )
    }
  },

  render () {
    this.renderNavigation()
    this.renderCurrent()
    this.renderSplitButton()
    this.renderLayoutDropdown()
    this.attachDatePicker()
    this.update()

    return this
  },

  attachDatePicker () {
    if (_.device('smartphone')) return

    const picker = new Picker({ date: this.model.get('startDate').clone() })
      .attachTo(this.$current.find('button'))
      .on('select', date => this.app.setDate(date.clone()))
      .on('before:open', () => picker.setDate(this.model.get('startDate')))
  },

  renderAdditionalInformation () {
    return this.$cw
  },

  renderSplitButton () {
    if (_.device('smartphone')) return
    if (this.model.get('mode') !== 'day') return
    if (this.app.folders.list().length <= 1) return
    this.$el.find('.btn.merge-split').remove()
    this.$el.append(
      $('<button type="button" class="btn btn-default merge-split" data-placement="bottom">')
    )
    this.updateMergeview()
  },

  updateMergeview () {
    const node = this.$('.merge-split')
    // #. Should appointments of different folders/calendars be shown in the same column (merge) or in separate ones (split)
    node.text(this.model.get('mergeView') ? gt('Merge') : gt('Split'))
      .tooltip('hide')
      .attr('data-original-title', this.model.get('mergeView')
        ? gt('Click to merge all folders into one column')
        : gt('Click to split all folders into separate columns')
      )
      .tooltip('fixTitle')
  },

  onMergeSplit () {
    settings.set('mergeview', !settings.get('mergeview')).save()
  }
})

const WeekViewToolbar = perspective.DragHelper.extend({

  className: 'weekview-toolbar',

  events: {
    'click .weekday': 'onCreateAppointment'
  },

  attributes: {
    role: 'toolbar'
  },

  initialize (opt) {
    this.$el.css('margin-inline-end', coreUtil.getScrollBarWidth())
    this.listenTo(this.model, 'change:startDate', this.render)
    this.listenTo(this.model, 'change:additionalTimezones', this.updateTimezones)
    this.listenTo(folderAPI, 'before:update', this.beforeUpdateFolder)
    if (this.model.get('mode') === 'day') {
      this.listenTo(this.model, 'change:mergeView', this.updateMergeview)
      this.listenTo(opt.app, 'folders:change', this.onFoldersChange)
    }
  },

  options: {
    todayClass: 'today'
  },

  render () {
    const self = this
    const tmpDate = moment(this.model.get('startDate'))
    const columns = this.model.get('mode') === 'day' ? this.opt.app.folders.list() : _.range(this.model.get('numColumns'))

    this.$el.empty()
    columns.forEach(function (c, index) {
      const day = $('<button href="#" class="weekday" tabindex="-1">')
        .attr({
          date: self.model.get('mergeView') ? 0 : index,
          'aria-label': gt('%s %s, create all-day appointment', tmpDate.format('ddd'), tmpDate.format('D')),
          tabindex: index === 0 ? '' : '-1'
        })
        .append(
          $('<span aria-hidden="true">').attr('title', gt('Create all-day appointment')).append(
            $('<span aria-hidden="true" class="number">').text(tmpDate.format('D')),
            $.txt(tmpDate.format('ddd'))
          )
        )

      if (_(c).isString()) {
        day
          .addClass('merge-view-label')
          .attr({
            'data-folder-cid': c, // need this when inserting events in this column
            'data-folder': c // this is used when folder color changes
          })
          .css('width', 'calc(' + day.css('width') + ' - 2px)')
        folderAPI.get(c).done(function (folder) {
          day
            .css({
              'border-color': util.getFolderColor(folder)
            })
            .text(folder.display_title || folder.title)
        })
      }

      // mark today
      if (util.isToday(tmpDate)) {
        let todayContainer
        if (self.model.get('mode') === 'day') {
          todayContainer = $('.week-container .day', self.pane).first()
        } else {
          // index is number so no $.escapeSelector needed
          todayContainer = $(`.week-container .day[date="${index}"]`, self.pane)
          if (self.model.get('numColumns') > 1) todayContainer.addClass(self.opt.todayClass)
          day
            .addClass(self.opt.todayClass)
            .attr('aria-label', function () {
              return gt('Today,') + ' ' + $(this).attr('aria-label')
            })
        }
      }
      self.$el.append(day)

      if (self.model.get('mode') !== 'day') tmpDate.add(1, 'day')
    })

    this.updateTimezones()
    if (self.model.get('mode') === 'day') this.updateMergeview()

    return this
  },

  updateTimezones () {
    const numTZs = this.model.get('additionalTimezones').length
    this.$el.css('margin-inline-start', (numTZs + 1) * 80)
  },

  updateMergeview () {
    this.$el.css({
      visibility: this.model.get('mergeView') ? '' : 'hidden',
      height: this.model.get('mergeView') ? '' : '27px'
    })
  },

  onFoldersChange () {
    if (this.model.get('mergeView')) this.render()
  },

  beforeUpdateFolder (id, model) {
    const color = util.getFolderColor(model.attributes)
    this.$(`[data-folder="${CSS.escape(model.get('id'))}"]`).css({
      'border-color': color
    })
  },

  onCreateAppointment (e) {
    if ($(e.target).closest('.appointment').length > 0) return

    e.preventDefault()

    const index = this.$('.weekday').index($(e.currentTarget))
    const startDate = this.model.get('startDate').clone()
    let folder = this.opt.app.folder.get()

    if (this.model.get('mergeView')) folder = this.opt.app.folders.list()[index]
    else startDate.add(index, 'days')

    this.opt.view.createAppointment({
      startDate: { value: startDate.format('YYYYMMDD') },
      endDate: { value: startDate.format('YYYYMMDD') },
      folder
    })
  }

})

// timestamp to add to a node. This way we can check if the node needs placement adjustments after the appointment changed or not (title change doesn't move the appointment)
const getTimestamp = model => `${model.getMoment('startDate').valueOf()}${model.getMoment('endDate').valueOf()}`

const AppointmentContainer = perspective.DragHelper.extend({

  initialize (opt) {
    const self = this
    this.on('collection:add', this.onAddAppointment)
    this.on('collection:change', this.onChangeAppointment)
    this.on('collection:remove', this.onRemoveAppointment)
    this.on('collection:before:reset', this.onBeforeReset)
    this.on('collection:after:reset', this.onAfterReset)

    this.listenTo(opt.app.props, 'change:layout', this.adjustPlacement)
    this.listenTo(ox.ui.windowManager, 'window.show', function (e, window) {
      if (window.app.get('id') === self.opt.app.get('id')) self.adjustPlacement()
    })

    if (this.model.get('mode') === 'day') {
      this.listenTo(this.model, 'change:mergeView', this.render)
      this.listenTo(opt.app, 'folders:change', this.onFoldersChange)
    }

    this.listenTo(this.model, 'change:gridSize', this.render)
  },

  renderAppointment (model) {
    // do not use a button here even if it's correct from a11y perspective. This breaks resize handles (you cannot make appointments longer/shorter) and hover styles on firefox.
    // it is fine in month perspective as there are no resize handles there.
    let node = this.$(`[data-cid="${CSS.escape(model.cid)}"]`)
    if (node.length === 0) node = $('<div role="button" class="appointment">')
    // keep resize handles (produces issues with multiple day appointments otherwise)
    node.children(':not(.resizable-handle)').remove()
    node.attr({
      'data-timestamp': getTimestamp(model),
      'data-cid': model.cid,
      'data-root-id': util.cid({ id: model.get('id'), folder: model.get('folder') }),
      'data-extension-point': 'io.ox/calendar/appointment',
      'data-composite-id': model.cid,
      'data-folder': null // reset folder in case of reuse
    })

    ext.point('io.ox/calendar/appointment')
      .invoke('draw', node, ext.Baton(_.extend({}, this.opt, { model, folders: this.opt.app.folders.list() })))
    return node
  },

  onFoldersChange () {
    if (this.model.get('mergeView')) this.render()
  },

  onAddAppointment (model) {
    if (settings.get('showDeclinedAppointments', false) === false && util.getConfirmationStatus(model) === 'DECLINED') return
    const startOfWeek = moment(this.model.get('startDate')).format('YYYYMMDD')
    const endOfWeek = moment(this.model.get('startDate')).add(Math.max(0, this.model.get('numColumns') - 1), 'days').format('YYYYMMDD')
    // check if appointment is out of displayed time, may happen with some strange recurrence rules
    // endDate is exclusive so if the end date matches the start of the week we will not show the event
    if (model.get('endDate').value <= startOfWeek || model.get('startDate').value > endOfWeek) return
    const node = this.renderAppointment(model)
    this.$appointmentContainer.append(node.hide())
    if (!this.onReset) this.adjustPlacement()
  },

  onChangeAppointment (model) {
    this.onReset = true
    const node = this.$(`[data-cid="${model.cid}"]`)
    // new or moved nodes need adjustmenmts, other nodes not. This is a costly operation (especially with full calendars) so we want to reduce it to a minimum
    const needsAdjustment = node.length === 0 || node.attr('data-timestamp') !== getTimestamp(model)
    this.onAddAppointment(model)
    this.onReset = false
    // make sure nodes are visible after redrawing them
    if (!needsAdjustment) return node.show()
    this.adjustPlacement()
  },

  onRemoveAppointment (model) {
    this.$(`[data-cid="${CSS.escape(model.cid)}"]`).remove()
    if (!this.onReset) this.adjustPlacement()
  },

  onBeforeReset () {
    this.$('.appointment').remove()
    this.onReset = true
  },

  onAfterReset () {
    this.adjustPlacement()
    this.onReset = false
  }

})

const FulltimeView = AppointmentContainer.extend({

  className: 'fulltime-container',

  events () {
    const events = {}
    if (_.device('touch')) {
      _.extend(events, {
        'touchstart .day': 'startTouchTimer',
        'touchmove .day': 'clearTouchTimer',
        'touchend .day': 'clearTouchTimer'
      })
    } else {
      _.extend(events, {
        'dblclick .appointment-panel': 'onCreateAppointment'
      })
      if (_.device('desktop') && this.model.get('mode') !== 'day') {
        _.extend(events, {
          'mousedown .appointment.modify': 'onDrag',
          'mousedown .resizable-handle': 'onResize'
        })
      }
    }
    return events
  },

  options: {
    fulltimeHeight: 1.25, // height of full-time appointments in rem
    fulltimeMax: 5 // threshold for visible full-time appointments in scrollpane header
  },

  initialize (opt) {
    AppointmentContainer.prototype.initialize.call(this, opt)

    this.listenTo(this.model, 'change:additionalTimezones', this.updateTimezones)
    this.listenTo(settings, 'change:favoriteTimezones', this.updateFavoriteTimezones)

    this.$appointmentContainer = $('<div class="appointment-panel">')
  },

  startTouchTimer (e) {
    this.touchTimer = setTimeout(this.onCreateAppointment.bind(this, e), 500)
  },

  clearTouchTimer () {
    clearTimeout(this.touchTimer)
  },

  drawDropdown: (function () {
    let self, hasDouble

    function drawOption () {
      // this = timezone name (string)
      // we may have a daylight saving change
      const startTimezone = moment(self.model.get('startDate')).tz(this)
      const endTimezone = moment(self.model.get('startDate')).add(Math.max(0, self.model.get('numColumns') - 1), 'days').endOf('day').tz(this)

      if (startTimezone.zoneAbbr() !== endTimezone.zoneAbbr()) hasDouble = true

      return startTimezone.zoneAbbr() === endTimezone.zoneAbbr()
        ? [
            $('<span class="offset">').text(startTimezone.format('Z')),
            $('<span class="timezone-abbr">').text(startTimezone.zoneAbbr()),
            _.escape(this)
          ]
        : [
            $('<span class="offset">').text(startTimezone.format('Z') + '/' + endTimezone.format('Z')),
            $('<span class="timezone-abbr">').text(startTimezone.zoneAbbr() + '/' + endTimezone.zoneAbbr()),
            _.escape(this)
          ]
    }

    const TimezoneModel = Backbone.Model.extend({
      defaults: {
        default: true
      },
      initialize (obj) {
        const self = this

        _(obj).each(function (value, key) {
          self[key] = value
        })
      }
    })

    return function () {
      self = this

      const list = _.intersection(
        settings.get('favoriteTimezones', []),
        settings.get('renderTimezones', [])
      )
      const favorites = _(settings.get('favoriteTimezones', [])).chain().map(function (fav) {
        return [fav, list.indexOf(fav) >= 0]
      }).object().value()
      // we may have a daylight saving change
      const startTimezone = moment(self.model.get('startDate')).tz(coreSettings.get('timezone'))
      const endTimezone = moment(self.model.get('startDate')).add(Math.max(0, self.model.get('numColumns') - 1), 'days').endOf('day').tz(coreSettings.get('timezone'))
      const model = new TimezoneModel(favorites)
      const dropdown = new Dropdown({
        className: 'dropdown timezone-label-dropdown',
        model,
        // must use start of view to get correct daylight saving timezone names (cet vs cest)
        label: startTimezone.zoneAbbr() === endTimezone.zoneAbbr() ? startTimezone.zoneAbbr() : startTimezone.zoneAbbr() + '/' + endTimezone.zoneAbbr(),
        tagName: 'div'
      })
      const render = function () {
        hasDouble = false
        dropdown.header(gt('Standard time zone'))
          .option('default', true, drawOption.bind(coreSettings.get('timezone')))

        if (settings.get('favoriteTimezones', []).length > 0) {
          dropdown.header(gt('Favorites'))
        }
        $('li[role="presentation"]', dropdown.$ul).first().addClass('disabled')
        $('a', dropdown.$ul).first().removeAttr('data-value').removeData('value')
        _(settings.get('favoriteTimezones', [])).each(function (fav) {
          if (fav !== coreSettings.get('timezone')) {
            dropdown.option(fav, true, drawOption.bind(fav))
          }
        })
        // add keep open for all timezone options, *not* the link to settings (Bug 53471)
        $('a', dropdown.$ul).attr('data-keep-open', 'true')

        dropdown.divider()
        dropdown.link('settings', gt('Manage favorites'), () => openSettings('virtual/settings/io.ox/calendar', 'io.ox/calendar/settings/timezones'))
        dropdown.$el.toggleClass('double', hasDouble)
      }

      render()

      model.on('change', function (model) {
        const list = []

        _(model.attributes).each(function (value, key) {
          if (value && key !== 'default') {
            list.push(key)
          }
        })

        settings.set('renderTimezones', list)
        settings.save()
      })

      // update on startdate change to get daylight savings right
      this.model.on('change:startDate', function () {
        const startTimezone = moment(self.model.get('startDate')).tz(coreSettings.get('timezone'))
        const endTimezone = moment(self.model.get('startDate')).add(Math.max(0, self.model.get('numColumns') - 1), 'days').endOf('day').tz(coreSettings.get('timezone'))
        dropdown.$el.find('.dropdown-label').empty().append(
          startTimezone.zoneAbbr() === endTimezone.zoneAbbr() ? startTimezone.zoneAbbr() : startTimezone.zoneAbbr() + '/' + endTimezone.zoneAbbr(),
          createIcon('bi/chevron-down.svg').addClass('xs')
        )
        dropdown.$ul.empty()
        render()
      })

      return dropdown
    }
  }()),

  render () {
    if (!_.device('smartphone')) {
      const dropdown = this.drawDropdown()
      const self = this

      this.$el.empty().append(
        $('<div class="time-label-bar">').append(
          $('<div class="timezone">'),
          dropdown.render().$el
        )
      )

      $('.dropdown-label', dropdown.$el).append(createIcon('bi/chevron-down.svg').addClass('xs'))
      this.updateTimezones()
      // update on startdate change to get daylight savings right
      this.model.on('change:startDate', function () {
        self.updateTimezones()
      })
    }

    this.$el.append(this.$appointmentContainer)
    // render appointments
    this.onReset = true
    this.opt.view.collection.filter(util.isAllday.bind(util)).forEach(this.onAddAppointment.bind(this))
    this.adjustPlacement()
    this.onReset = false
    return this
  },

  updateTimezones () {
    const timezoneLabels = this.model.get('additionalTimezones')
    const self = this
    this.$('.timezone').remove()
    this.$('.time-label-bar')
      .prepend(
        _(timezoneLabels).map(function (tz) {
          return $('<div class="timezone">').text(moment(self.model.get('startDate')).tz(tz).zoneAbbr())
        })
      )
      .css('width', timezoneLabels.length > 0 ? (timezoneLabels.length + 1) * 80 : '')
  },

  updateFavoriteTimezones () {
    const dropdown = this.drawDropdown()
    this.$('.dropdown').replaceWith(dropdown.render().$el)
    $('.dropdown-label', dropdown.$el).append(createIcon('bi/chevron-down.svg').addClass('xs'))
  },

  onCreateAppointment (e) {
    if ($(e.target).closest('.appointment').length > 0) return
    const numColumns = this.model.get('mergeView') ? this.opt.app.folders.list().length : this.model.get('numColumns')
    const slotWidth = this.$('.appointment-panel').width() / numColumns
    const left = e.pageX - $(e.target).offset().left
    const index = (left / slotWidth) >> 0
    const startDate = this.model.get('startDate').clone()
    let folder = this.opt.app.folder.get()

    if (this.model.get('mergeView')) folder = this.opt.app.folders.list()[index]
    else startDate.add(index, 'days')

    this.opt.view.createAppointment({
      startDate: { value: startDate.format('YYYYMMDD') },
      endDate: { value: startDate.format('YYYYMMDD') },
      folder
    })
  },

  onResize (e) {
    let node, model, startDate, endDate, maxStart, minEnd

    this.mouseDragHelper({
      event: e,
      updateContext: '.appointment-panel',
      start (e) {
        const target = $(e.target)
        node = target.closest('.appointment')
        model = this.opt.view.collection.get(node.attr('data-cid'))
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('current hover')

        if (target.hasClass('resizable-w')) {
          maxStart = model.getMoment('endDate').subtract(1, 'day')
          minEnd = model.getMoment('endDate')
        } else if (target.hasClass('resizable-e')) {
          maxStart = model.getMoment('startDate')
          minEnd = model.getMoment('startDate').add(1, 'day')
        }

        startDate = model.getMoment('startDate')
        endDate = model.getMoment('endDate')

        this.$el.addClass('no-select')
      },
      update (e) {
        const numColumns = this.model.get('mergeView') ? this.opt.app.folders.list().length : this.model.get('numColumns')
        const slotWidth = this.$('.appointment-panel').width() / numColumns
        const left = e.pageX - $(e.currentTarget).offset().left
        const index = (left / slotWidth) >> 0
        const date = this.model.get('startDate').clone().add(index, 'days')

        startDate = moment.min(maxStart, date)
        endDate = moment.max(minEnd, date.clone().add(1, 'day'))

        const pos = startDate.diff(this.model.get('startDate'), 'days')
        const width = Math.max(0, endDate.diff(startDate, 'days'))

        node.css({
          left: (100 / numColumns) * pos + '%',
          width: (100 / numColumns) * width + '%'
        })
      },
      end () {
        if (node) node.removeClass('resizing')
        this.$el.removeClass('no-select')
        this.opt.view.updateAppointment(model, {
          startDate: { value: startDate.format('YYYYMMDD') },
          endDate: { value: endDate.format('YYYYMMDD') }
        })
      }
    })
  },

  onDrag (e) {
    const node = $(e.target).closest('.appointment')
    const model = this.opt.view.collection.get(node.attr('data-cid'))
    const cloneCID = `clone-${model.cid}`
    let startDate = model.getMoment('startDate')
    let endDate = model.getMoment('endDate')
    const weekStart = this.model.get('startDate')
    const numColumns = this.model.get('numColumns')
    const weekEnd = moment(this.model.get('startDate')).add(numColumns, 'days')
    let offset; let slotWidth

    if ($(e.target).is('.resizable-handle')) return
    if (startDate.isBefore(weekStart)) return
    if (endDate.isAfter(weekEnd)) return

    this.mouseDragHelper({
      event: e,
      updateContext: '.appointment-panel',
      start (e) {
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('current hover')

        slotWidth = this.$('.appointment-panel').width() / numColumns
        offset = Math.floor((e.pageX - $(e.currentTarget).offset().left) / slotWidth) * slotWidth

        // Clone appointment to show origin of appointment during drag
        const cloneNode = this.$(`[data-cid="${CSS.escape(model.cid)}"]`).clone()
        cloneNode.attr('data-cid', cloneCID).css('opacity', '0.7').removeClass('resizing')
        node.css('opacity', '1')
        this.$('.appointment-panel').append(cloneNode)
      },
      update (e) {
        const left = e.pageX - offset - $(e.currentTarget).offset().left
        const index = (left / slotWidth) >> 0
        const startIndex = model.getMoment('startDate').diff(this.model.get('startDate'), 'days')
        const diff = index - startIndex

        if (diff !== 0) this.$el.addClass('no-select')

        startDate = model.getMoment('startDate').add(diff, 'days')
        endDate = model.getMoment('endDate').add(diff, 'days')

        let pos = startDate.diff(this.model.get('startDate'), 'days')
        let width = Math.max(0, endDate.diff(startDate, 'days'))
        pos = Math.max(pos, 0)
        width = Math.min(numColumns - pos, width)

        node.css({
          left: (100 / numColumns) * pos + '%',
          width: (100 / numColumns) * width + '%'
        })
      },
      end () {
        this.$(`[data-cid="${model.cid}"]`).css('opacity', '')
        this.$(`[data-cid="${cloneCID}"]`).remove()
        if (node) node.removeClass('resizing')
        this.$el.removeClass('no-select')
        this.opt.view.updateAppointment(model, {
          startDate: { value: startDate.format('YYYYMMDD') },
          endDate: { value: endDate.format('YYYYMMDD') }
        })
      },
      cancel () {
        this.$el.removeClass('no-select')
        this.$(`[data-cid="${model.cid}"]`).remove()
        this.$(`[data-cid="${cloneCID}"]`).css('opacity', '').attr('data-cid', model.cid)
      }
    })
  },

  adjustPlacement: (function () {
    /*
     * Simple algorithm to find free space for appointment. Works as follows:
     * 1) Has a table with slots which are empty by default
     * 2) Requests a certain column and width
     * 3) Search for first row, where all these fields are empty
     * 4) Mark these cells in the table as reserved
     * 5) Calculate maximum number of rows as a side-effect
     */
    function reserveRow (start, width, table) {
      let row = 0; let column; let empty
      start = Math.max(0, start)
      width = Math.min(table.length, start + width) - start
      // check for free space
      while (!empty) {
        empty = true
        for (column = start; column < start + width; column++) {
          if (table[column][row]) {
            empty = false
            break
          }
        }
        row++
      }
      // reserve free space
      for (column = start; column < start + width; column++) table[column][row - 1] = true
      return row - 1
    }

    return function () {
      let maxRow = 0
      const numColumns = this.model.get('mergeView') ? this.opt.app.folders.list().length : this.model.get('numColumns')
      const table = _.range(numColumns).map(function () { return [] })
      this.opt.view.collection.each(function (model) {
        if (!util.isAllday(model)) return
        if (settings.get('showDeclinedAppointments', false) === false && util.getConfirmationStatus(model) === 'DECLINED') return

        const startDate = model.getMoment('startDate').startOf('day')
        const fulltimePos = this.model.get('mergeView') ? this.opt.app.folders.list().indexOf(model.get('folder')) : startDate.diff(this.model.get('startDate'), 'days')
        // calculate difference in utc, otherwise we get wrong results if the appointment starts before a daylight saving change and ends after
        const fulltimeWidth = this.model.get('mergeView') ? 1 : Math.max(model.getMoment('endDate').diff(startDate, 'days') + Math.min(0, fulltimePos), 1)
        const row = reserveRow(fulltimePos, fulltimeWidth, table)
        const numColumns = this.model.get('mergeView') ? this.opt.app.folders.list().length : this.model.get('numColumns')
        const node = this.$appointmentContainer.find(`[data-cid="${CSS.escape(model.cid)}"]`)

        // append it again to stick to the order of the collection
        node.parent().append(node)
        node.show().css({
          height: this.opt.fulltimeHeight + 'rem',
          lineHeight: this.opt.fulltimeHeight + 'rem',
          width: 'calc(' + (100 / numColumns) * fulltimeWidth + '% - 4px)',
          left: (100 / numColumns) * Math.max(0, fulltimePos) + '%',
          top: row * (this.opt.fulltimeHeight + 0.0625) + 'rem'
        })

        maxRow = Math.max(maxRow, row + 1)
      }.bind(this))

      const height = (maxRow <= this.opt.fulltimeMax ? maxRow : (this.opt.fulltimeMax + 0.5)) * (this.opt.fulltimeHeight + 0.0625) + 'rem'
      this.$el.css('height', height)
      // enable/disable scrollbar
      if (maxRow > this.opt.fulltimeMax) this.$appointmentContainer.css({ 'overflow-y': 'scroll', 'margin-inline-end': '' })
      else this.$appointmentContainer.css({ 'overflow-y': 'hidden', 'margin-inline-end': coreUtil.getScrollBarWidth() })
    }
  }())

})

const AppointmentView = AppointmentContainer.extend({

  className: 'appointment-container f6-target',

  options: {
    // visual overlap of appointments [0.0 - 1.0]
    overlap: 0,
    // keep in sync with css styles (appointment min-height)
    minCellHeight: 27
  },

  events () {
    const events = {}
    if (_.device('touch')) {
      _.extend(events, {
        'touchstart .timeslot': 'startTouchTimer',
        'touchmove .timeslot': 'clearTouchTimer',
        'touchend .timeslot': 'clearTouchTimer'
      })
    } else {
      _.extend(events, {
        'dblclick .timeslot': 'onCreateAppointment'
      })
      if (_.device('desktop')) {
        _.extend(events, {
          'mouseenter .appointment': 'onHover',
          'mouseleave .appointment': 'onHover',
          'mousedown .timeslot': 'onLasso',
          'mousedown .resizable-handle': 'onResize',
          'mousedown .appointment.modify': 'onDrag'
        })
      }
    }
    return events
  },

  initialize (opt) {
    AppointmentContainer.prototype.initialize.call(this, opt)

    this.listenTo(this.model, 'change:additionalTimezones', this.updateTimezones)
    this.listenTo(this.model, 'change:startDate', this.updateToday)
    this.listenTo(this.model, 'change:startDate', this.updateTimezones)
    this.listenToDOM(window, 'resize', _.throttle(this.onWindowResize, 50))

    this.$hiddenIndicators = $('<div class="hidden-appointment-indicator-container">')
    this.initCurrentTimeIndicator()
  },

  startTouchTimer (e) {
    this.touchTimer = setTimeout(this.onCreateAppointment.bind(this, e), 500)
  },

  clearTouchTimer () {
    clearTimeout(this.touchTimer)
  },

  initCurrentTimeIndicator () {
    this.lastDate = moment()
    this.$currentTimeIndicator = $('<div class="current-time-indicator">').append(
      $('<div class="dot">'),
      $('<div class="dark-line">'),
      $('<div class="thin-line">')
    )
    window.setInterval(this.updateCurrentTimeIndicator.bind(this), 60000)
    this.updateCurrentTimeIndicator()
  },

  updateCurrentTimeIndicator () {
    const minutes = moment().diff(moment().startOf('day'), 'minutes')
    const top = minutes / 24 / 60
    this.$currentTimeIndicator.css({ top: top * 100 + '%' }).data('top', top)
    // remove if not or no longer visible
    const numColumns = this.model.get('numColumns')
    const columnIndex = moment().startOf('day').diff(this.model.get('startDate'), 'days')
    if (columnIndex < 0 || columnIndex >= numColumns) return this.$currentTimeIndicator.remove()
    // proper position
    const numTZs = this.model.get('additionalTimezones').length
    // use css-style without additional time zones
    if (_.device('!smartphone')) {
      this.$currentTimeIndicator.css('left', numTZs ? (numTZs + 1) * 80 + 'px' : '')
    }
    // insert into right container
    this.$('.scrollpane').append(this.$currentTimeIndicator)
    if (!this.lastDate.isSame(moment(), 'day')) {
      this.lastDate = moment()
      this.opt.view.render()
    }
    this.$el.css({ '--column-count': numColumns, '--column-index': columnIndex })
  },

  renderTimeLabel (timezone, className) {
    const timeLabel = $('<div class="week-container-label" aria-hidden="true">').addClass(className)
    const self = this
    timeLabel.append(
      _(_.range(24)).map(function (i) {
        const number = i === 0 ? '' : moment(self.model.get('startDate')).startOf('day').hours(i).tz(timezone).format('LT')
        return $('<div class="time">')
          .addClass((i >= self.model.get('workStart') && i < self.model.get('workEnd')) ? 'in' : '')
          .addClass((i + 1 === self.model.get('workStart') || i + 1 === self.model.get('workEnd')) ? 'working-time-border' : '')
          .append($('<div class="number">').text(number.replace(/^(\d\d?):00 ([AP]M)$/, '$1 $2')))
      })
    )

    return timeLabel
  },

  renderColumn (index) {
    const column = $('<div class="day">')
    if (this.model.get('mergeView')) column.attr('data-folder-cid', index)
    for (let i = 1; i <= this.getNumTimeslots(); i++) {
      column.append(
        $('<div>')
          .addClass('timeslot')
          .addClass((i <= (this.model.get('workStart') * this.model.get('gridSize')) || i > (this.model.get('workEnd') * this.model.get('gridSize'))) ? 'out' : '')
          .addClass((i === (this.model.get('workStart') * this.model.get('gridSize')) || i === (this.model.get('workEnd') * this.model.get('gridSize'))) ? 'working-time-border' : '')
      )
    }
    return column
  },

  updateToday () {
    if (this.model.get('mode') === 'day') return
    const start = this.model.get('startDate')
    this.$('>> .day').each(function (index) {
      $(this).toggleClass('today', util.isToday(start.clone().add(index, 'days')))
    })
  },

  render () {
    this.updateCellHeight()
    const scrollRatio = this.$el.scrollTop() / this.$el.height()
    const range = this.model.get('mergeView') ? this.opt.app.folders.list() : _.range(this.model.get('numColumns'))
    const height = this.getContainerHeight()
    this.$el.attr('tabindex', '-1').empty().append(
      $('<div class="scrollpane">').append(
        this.renderTimeLabel(coreSettings.get('timezone')),
        range.map(this.renderColumn.bind(this))
      ).on('scroll', this.updateHiddenIndicators.bind(this)),
      this.$hiddenIndicators.css('right', coreUtil.getScrollBarWidth())
    )
    if (!_.device('smartphone')) this.updateTimezones()
    this.updateToday()
    this.setColumnHeight()
    this.applyTimeScale()
    this.updateCurrentTimeIndicator()
    // update scrollposition
    this.$el.scrollTop(
      !scrollRatio || _.isNaN(scrollRatio)
        // don't use current time indicator top here because that only works when today is visible
        // set to 2 hours before current time. Past events are less important
        ? (moment().diff(moment().startOf('day'), 'minutes') / 24 / 60) * height - 2 * height / 24
        : scrollRatio * this.$el.height()
    )
    // render appointments
    this.onReset = true
    this.opt.view.collection.reject(util.isAllday.bind(util)).forEach(this.onAddAppointment.bind(this))
    this.adjustIndentation()
    this.onReset = false
    return this
  },

  getNumTimeslots () {
    return this.opt.slots * this.model.get('gridSize')
  },

  updateCellHeight () {
    const cells = Math.min(Math.max(4, (this.model.get('workEnd') - this.model.get('workStart') + 1)), 18)
    // try to estimate the height, the container will have when drawn. Is only needed sometimes as a fallback, when the element is not in the dom yet
    const height = this.$el.height() || (window.innerHeight - 250)
    const cellHeight = Math.floor(
      Math.max(height / (cells * this.model.get('gridSize')), this.options.minCellHeight)
    )
    this.model.set('cellHeight', cellHeight)
  },

  getContainerHeight () {
    return this.model.get('cellHeight') * this.getNumTimeslots()
  },

  applyTimeScale () {
    // remove all classes like time-scale-*
    this.$el.removeClass(function (index, css) {
      return (css.match(/(^|\s)time-scale-\S+/g) || []).join(' ')
    })
    this.$el.addClass('time-scale-' + this.model.get('gridSize'))
  },

  updateTimezones () {
    const self = this
    const timezones = this.model.get('additionalTimezones')
    this.$('.secondary-timezone').remove()
    this.$('.scrollpane')
      .prepend(
        timezones.map(function (tz) {
          return self.renderTimeLabel(tz).addClass('secondary-timezone')
        })
      )
      .toggleClass('secondary', timezones.length > 0)
    const left = timezones.length > 0 ? ((timezones.length + 1) * 80) + 'px' : ''
    self.$hiddenIndicators.css('left', left)
    this.updateCurrentTimeIndicator()
  },

  updateHiddenIndicators: (function () {
    function indicatorButton (column, width) {
      return $('<span>')
        .addClass('more-appointments fa')
        .css({
          left: (column * width) + '%',
          width: width + '%'
        })
    }

    return _.throttle(function () {
      const pane = this.$('.scrollpane')
      const min = pane.scrollTop()
      const max = pane.scrollTop() + pane.height()
      const threshold = 3
      const columns = this.$('.day')
      const columnWidth = 100 / columns.length
      const container = this.$hiddenIndicators

      container.empty()
      columns.each(function (i) {
        // node height 0 means the page is not visible yet. Prevent wrong calculations
        const appointments = $(this).find(' > .appointment').filter(function (index, node) {
          return $(node).height() > 0
        })
        const earlier = appointments.filter(function (index, el) {
          el = $(el)
          return el.position().top + el.height() - threshold < min
        }).length
        const later = appointments.filter(function (index, el) {
          el = $(el)
          return el.position().top + threshold > max
        }).length
        if (earlier > 0) container.append(indicatorButton(i, columnWidth).addClass('earlier fa-caret-up'))
        if (later > 0) container.append(indicatorButton(i, columnWidth).addClass('later fa-caret-down'))
      })
    }, 100)
  }()),

  onCreateAppointment (e) {
    const target = $(e.currentTarget)
    const index = this.$('.day').index(target.parent())
    const startDate = this.model.get('startDate').clone()
    let folder = this.opt.app.folder.get()
    const offset = 60 / this.model.get('gridSize') * target.index()

    if (this.model.get('mergeView')) folder = this.opt.app.folders.list()[index]
    else startDate.add(index, 'days')
    const startOfDay = startDate.clone()
    startDate.add(offset + this.getDSTOffset(startOfDay, offset), 'minutes')
    const endDate = startDate.clone().add(60, 'minutes')

    this.opt.view.createAppointment({
      startDate: { value: startDate.format('YYYYMMDD[T]HHmmss'), tzid: startDate.tz() },
      endDate: { value: endDate.format('YYYYMMDD[T]HHmmss'), tzid: endDate.tz() },
      folder
    })
  },

  getDSTOffset (startDate, offset) {
    const endDate = startDate.clone().add(offset, 'minutes')
    return startDate._offset - endDate._offset
  },

  onAddAppointment (model) {
    if (settings.get('showDeclinedAppointments', false) === false && util.getConfirmationStatus(model) === 'DECLINED') return

    const appointmentStartDate = model.getMoment('startDate')
    const startLocal = moment.max(appointmentStartDate, moment(this.model.get('startDate'))).local().clone()
    let endLocal = model.getMoment('endDate').local()
    let start = moment(startLocal).startOf('day')
    const end = moment(endLocal).startOf('day')
    const startOfNextWeek = moment(this.model.get('startDate')).startOf('day').add(this.model.get('numColumns'), 'days')
    let maxCount = 0
    const dayNodes = this.$('.day')

    // draw across multiple days
    while (maxCount <= this.model.get('numColumns')) {
      let node = this.renderAppointment(model).addClass('border')

      if (!start.isSame(end, 'day')) {
        endLocal = moment(startLocal).endOf('day').local()
      } else {
        endLocal = model.getMoment('endDate').local()
      }

      // kill overlap appointments with length null
      if (startLocal.isSame(endLocal) && maxCount > 0) {
        break
      }

      // break if appointment overlaps into next week
      if (start.isSame(startOfNextWeek)) {
        break
      }

      // check if we have a node for this day, if not create one by cloning the first (we need one node for each day when an appointment spans multiple days)
      node = node.get(maxCount) ? $(node.get(maxCount)) : $(node).first().clone()

      // daylight saving time change?
      const offset = start._offset - model.getMoment('startDate').tz(start.tz())._offset
      const height = endLocal.diff(startLocal, 'minutes') / 24 / 60
      let index = startLocal.day() - this.model.get('startDate').day()
      if (index < 0) index += 7

      const top = (Math.max(0, startLocal.diff(moment(start), 'minutes') - offset)) / 24 / 60 * 100

      node
        .addClass(endLocal.diff(startLocal, 'minutes') < 120 / this.model.get('gridSize') ? 'no-wrap' : '')
        .css({
          top: 'calc(' + top + '% - 1px)',
          height: 'calc( ' + height * 100 + '% - 1px)',
          lineHeight: this.opt.minCellHeight + 'px'
        })
      // needed for flags to draw correctly
      node.attr('contentHeight', height * dayNodes.eq(index).height() - 2)
      if (this.model.get('mergeView')) index = this.opt.app.folders.list().indexOf(model.get('folder'))

      ext.point('io.ox/calendar/week/view/appointment').invoke('draw', node, ext.Baton({ model, date: start, view: this }))

      // append at the right place
      dayNodes.eq(index).append(node)

      // do incrementation
      if (!start.isSame(end, 'day')) {
        start = startLocal.add(1, 'day').startOf('day').clone()
        maxCount++
      } else {
        // Check if we have too much nodes. This happens when a multiple day appointment is edited and spans less days than before
        // remove those excess nodes
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).slice(maxCount + 1).remove()
        break
      }
    }

    if (!this.onReset) this.adjustPlacement()
  },

  onAfterReset () {
    AppointmentContainer.prototype.onAfterReset.call(this)
    this.updateCurrentTimeIndicator()
  },

  adjustPlacement () {
    this.adjustIndentation()
    this.updateHiddenIndicators()
  },

  adjustIndentation: (function () {
    // adjusts left position and width of overlapping nodes
    function setPositions (nodes, overlap = 0) {
      nodes.sort(sortByLength)
      const slots = createHierarchy(nodes)
      const columns = slots.length
      const slotWidth = Math.min((100 / columns) * (1 + (overlap * (columns - 1))), 100)
      slots.forEach(function (slot, index) {
        const left = columns > 1 ? ((100 - slotWidth) / (columns - 1)) * index : 0
        slot.forEach(function (node) {
          const top = node[0].offsetTop
          const bottom = node.topPlusHeight
          let multiplier = 1
          // check if there is free space on the right side of the node. Expand width accordingly
          for (let i = index + 1; i < slots.length; i++) {
            if (slots[i].some(slotNode => slotNode[0].offsetTop <= bottom && slotNode.topPlusHeight >= top)) break
            multiplier++
          }
          node.css({
            left: 'calc(' + left + '% - 1px)',
            width: 'calc(' + slotWidth * multiplier + '% - 4px)'
          })
        })
      })
    }

    // sorts overlapping nodes to create minimal amount of columns
    function createHierarchy (nodes) {
      const slots = []
      nodes.forEach(function (node) {
        let inserted = false
        // check columns from left to right if the node would fit in there
        slots.forEach(function (slot) {
          if (inserted) return
          if (slot[slot.length - 1].topPlusHeight > node[0].offsetTop) return
          inserted = true
          slot.push(node)
        })
        if (inserted) return
        // node didn't fit into any column. Put it in a new column
        slots.push([node])
      })
      return slots
    }

    // sort by start time, if it's the same sort by length
    function sortByLength (nodeA, nodeB) {
      if (nodeA[0].offsetTop === nodeB[0].offsetTop) {
        return nodeB.height() - nodeA.height()
      }
      return nodeA[0].offsetTop - nodeB[0].offsetTop
    }

    return function () {
      // Simple algorithm to compute the indentation which works as follows
      // 1) Keep track of intersecting appointments with a slot array
      // 2) Try to find first possible spot in the slots array by comparing end and start position
      // 3) If an appointment is after the maximum time, apply slot indentation
      const self = this

      // keep order of collection
      this.opt.view.collection.each(function (model) {
        if (util.isAllday(model)) return
        self.$(`[data-cid="${CSS.escape(model.cid)}"]`).each(function () {
          const $this = $(this)
          $this.parent().append($this)
        })
      })

      this.$('.day').each(function () {
        let list = []
        let maxEnd = 0

        $('.appointment', this).each(function () {
          const node = $(this)
          // to not use node.offset().top as this gives us the window offset. What we need is the offset inside the day node. Otherwise our calculations would be depended on the scroll position and window size
          if (node[0].offsetTop >= maxEnd) {
            setPositions(list, self.opt.overlap)
            list = []
          }

          list.push(node)
          node.topPlusHeight = node[0].offsetTop + node.height()
          maxEnd = Math.max(maxEnd, node.topPlusHeight)
        })
        setPositions(list, self.opt.overlap)
      })
    }
  }()),

  onHover (e) {
    if (!this.model.get('lasso')) {
      const cid = util.cid(String($(e.currentTarget).data('cid')))
      const el = this.$(`[data-root-id="${CSS.escape(cid.folder + '.' + cid.id)}"]`)
      const bg = el.data('background-color')
      const color = el.data('color')
      const isDark = $('html').hasClass('dark')

      switch (e.type) {
        case 'mouseenter':
          if (e.relatedTarget && e.relatedTarget.tagName !== 'TD') {
            el.addClass('hover')
            if (bg) {
              const newBg = util.lightenDarkenColor(bg, 0.93)
              el.css({ 'background-color': newBg, color: isDark ? color : util.getForegroundColor(newBg) })
            }
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
    }
  },

  onLasso: (function () {
    function isBefore (elem, other) {
      if (other.parent().index() < elem.parent().index()) return true
      if (!elem.parent().is(other.parent())) return false
      return other.index() < elem.index()
    }

    function fixFolder (folder) {
      if (folderAPI.can('create', folder)) return folder
      return folderAPI.get(settings.get('chronos/defaultFolderId'))
    }

    function cont (e, f) {
      let pivot, folder, startDate, endDate

      this.mouseDragHelper({
        event: e,
        updateContext: '.timeslot',
        start (e) {
          pivot = $(e.target)
          folder = f
          this.$el.addClass('no-select')
        },
        update (e) {
          let start = pivot; let end = $(e.target); let day; let days = this.$('.day')
          function minutesToAdd (position, timeSlots) { return position / timeSlots * 24 * 60 }

          if (this.model.get('mode') === 'day') {
            days = pivot.parent()
            start = days.children().eq(start.index())
            end = days.children().eq(end.index())
          }
          // switch start and temp
          if (isBefore(start, end)) {
            start = end
            end = pivot
          }
          // loop over the days
          for (day = start.parent(); day.index() <= end.parent().index() && day.length > 0; day = day.next()) {
            const numTimeslots = this.getNumTimeslots()
            const top = start.parent().is(day) ? start.index() : 0
            const bottom = end.parent().is(day) ? end.index() + 1 : numTimeslots
            let node = day.find('.lasso')
            if (node.length === 0) node = $('<div class="lasso">').appendTo(day)
            node.css({
              top: (top / numTimeslots * 100) + '%',
              height: ((bottom - top) / numTimeslots * 100) + '%'
            })
            if (start.parent().is(day)) {
              const startDay = this.model.get('startDate').clone().add(days.index(day), 'days')
              const minutesToStart = minutesToAdd(top, numTimeslots)
              startDate = startDay.clone().add(minutesToStart + this.getDSTOffset(startDay, minutesToStart), 'minutes')
            }
            if (end.parent().is(day)) {
              const endDay = this.model.get('startDate').clone().add(days.index(day), 'days')
              const minutesToEnd = minutesToAdd(bottom, numTimeslots)
              endDate = endDay.clone().add(minutesToEnd + this.getDSTOffset(endDay, minutesToEnd), 'minutes')
            }
          }
          start.parent().prevAll().find('.lasso').remove()
          day.nextAll().addBack().find('.lasso').remove()
        },
        clear () {
          this.$('.lasso').remove()
          this.$el.removeClass('no-select')
        },
        end () {
          if (!startDate || !endDate) return
          this.opt.view.createAppointment({
            startDate: { value: startDate.format('YYYYMMDD[T]HHmmss'), tzid: startDate.tz() },
            endDate: { value: endDate.format('YYYYMMDD[T]HHmmss'), tzid: endDate.tz() },
            folder: folder.id
          })
        }
      })
    }

    return function (e) {
      if (e.type === 'mousedown') {
        const app = this.opt.app
        if (this.model.get('mergeView')) {
          const folderId = $(e.target).closest('.day').attr('data-folder-cid')
          folderAPI.get(folderId || app.folder.get()).then(fixFolder).done(cont.bind(this, e))
        } else {
          app.folder.getData().done(cont.bind(this, e))
        }
        return
      }

      cont.call(this, e)
    }
  }()),

  onResize: (function () {
    function isBefore (elem, other) {
      if (other.parent().index() < elem.parent().index()) return true
      if (!elem.parent().is(other.parent())) return false
      return other.index() < elem.index()
    }

    function getPivot (model, name) {
      const date = model.getMoment(name).subtract(name === 'endDate' ? 1 : 0).local()
      const startOfDay = date.clone().startOf('day')
      const day = date.diff(this.model.get('startDate'), 'days')
      const minutes = date.diff(startOfDay, 'minutes')
      const index = (minutes / 60 * this.model.get('gridSize')) >> 0
      return this.$('.day').eq(day).find('.timeslot').eq(index)
    }

    return function (e) {
      let pivot, node, model, startDate, endDate, startOffset, endOffset

      this.mouseDragHelper({
        event: e,
        updateContext: '.timeslot',
        start (e) {
          const target = $(e.target)
          node = target.closest('.appointment')
          model = this.opt.view.collection.get(node.attr('data-cid'))
          // Clone appointment to show origin of appointment during resize
          this.$(`[data-cid="${model.cid}"]`).each((idx, item) => {
            const cloneNode = $(item).clone()
            $(cloneNode).attr('data-cid', `clone-${model.cid}`).hide()
            $(item).after(cloneNode)
          })
          this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('current hover')
          // get pivot point
          if (target.hasClass('resizable-s')) pivot = getPivot.call(this, model, 'startDate')
          else if (target.hasClass('resizable-n')) pivot = getPivot.call(this, model, 'endDate')
          // offset in minutes in relation to the current grid size
          startOffset = model.getMoment('startDate').minutes() % (60 / this.model.get('gridSize'))
          endOffset = model.getMoment('endDate').minutes() % (60 / this.model.get('gridSize'))
          this.$el.addClass('no-select')
        },
        update (e) {
          let start = pivot; let end = $(e.target); let day; let days = this.$('.day')
          if (this.model.get('mode') === 'day') {
            days = pivot.parent()
            start = days.children().eq(start.index())
            end = days.children().eq(end.index())
          }
          // switch start and temp
          if (isBefore(start, end)) {
            start = end
            end = pivot
          }
          // loop over the days
          for (day = start.parent(); day.index() <= end.parent().index() && day.length > 0; day = day.next()) {
            const numTimeslots = this.getNumTimeslots()
            const top = start.parent().is(day) ? start.index() : 0
            const bottom = end.parent().is(day) ? end.index() + 1 : numTimeslots
            let slot = day.find('.resizing')
            const startOfDay = this.model.get('startDate').clone().add(days.index(day), 'days')

            // set defaults if not set yet
            if (!startDate) startDate = startOfDay
            if (!endDate) endDate = startOfDay.clone().add(1, 'day')
            // set start/end date if it is on the current date
            if (start.parent().is(day)) startDate = startOfDay.clone().add(top / numTimeslots * 24 * 60 + startOffset, 'minutes')
            if (end.parent().is(day)) endDate = startOfDay.clone().add(bottom / numTimeslots * 24 * 60 - endOffset, 'minutes')

            if (slot.length === 0) slot = node.clone().appendTo(day)
            const offsetTop = startDate.diff(startOfDay, 'minutes') / 60 / 24 * 100
            slot.css({
              top: offsetTop + '%',
              height: Math.min(100 - offsetTop, endDate.diff(startDate, 'minutes') / 60 / 24 * 100) + '%'
            })
          }
          start.parent().prevAll().find('.resizing').remove()
          day.nextAll().addBack().find('.resizing').remove()
        },
        end () {
          this.$el.removeClass('no-select')
          this.$(`[data-cid="clone-${model.cid}"]`).remove()
          this.$('.resizing').removeClass('resizing')
          if (!startDate || !endDate) return
          startDate.tz(model.getMoment('startDate').tz())
          endDate.tz(model.getMoment('endDate').tz())
          this.opt.view.updateAppointment(model, {
            startDate: { value: startDate.format('YYYYMMDD[T]HHmmss'), tzid: startDate.tz() },
            endDate: { value: endDate.format('YYYYMMDD[T]HHmmss'), tzid: endDate.tz() }
          })
        },
        cancel () {
          this.$el.removeClass('no-select')
          this.$(`[data-cid="${model.cid}"]`).remove()
          this.$(`[data-cid="clone-${model.cid}"]`).each((idx, item) => {
            $(item).attr('data-cid', model.cid).show()
          })
          this.$('.resizing').removeClass('resizing')
        }
      })
    }
  }()),

  onDrag (e) {
    const target = $(e.target); let offsetSlots; let startDate; let endDate; let days; let mousedownOrigin; let cellHeight; let sameDay; let startOffset; let numTimeslots
    let node = $(e.target).closest('.appointment')
    let model = this.opt.view.collection.get(node.attr('data-cid'))
    const cloneCID = `clone-${model.cid}`
    if (target.is('.resizable-handle')) return
    if (target.closest('.appointment').hasClass('io-ox-busy')) return
    this.mouseDragHelper({
      event: e,
      updateContext: '.day',
      delay: 300,
      start (e) {
        node = target.closest('.appointment')
        model = this.opt.view.collection.get(node.attr('data-cid'))
        startDate = model.getMoment('startDate')
        endDate = model.getMoment('endDate')
        days = this.$('.day')
        cellHeight = this.model.get('cellHeight')
        mousedownOrigin = { x: e.pageX, y: e.pageY }
        sameDay = model.getMoment('startDate').local().isSame(model.getMoment('endDate').local(), 'day')
        // check if end date is right at midnight at the same day (this would lead to an incorrect sameDay check)
        if (!sameDay) {
          const tempMoment = moment(model.getMoment('endDate').local()).startOf('day')
          // end date is right at midnight, so it might still be the same day
          if (tempMoment.isSame(moment(model.getMoment('endDate').local()))) {
            tempMoment.subtract(1, 'seconds')
            sameDay = model.getMoment('startDate').local().isSame(tempMoment, 'day')
          }
        }
        // offset in minutes in relation to the current grid size
        startOffset = model.getMoment('startDate').local().minutes() % (60 / this.model.get('gridSize'))
        numTimeslots = this.getNumTimeslots()
        offsetSlots = Math.floor((e.pageY - $(e.currentTarget).offset().top) / cellHeight)

        // Clone appointment to show origin of appointment during drag
        this.$(`[data-cid="${model.cid}"]`).each((idx, item) => {
          const cloneNode = $(item).clone()
          $(cloneNode).attr('data-cid', cloneCID).css('opacity', '0.7')
          $(item).after(cloneNode)
          node.css('opacity', '1')
        })
        this.$(`[data-cid="${CSS.escape(model.cid)}"]`).addClass('resizing').removeClass('hover')
      },
      update (e) {
        if (!this.$el.hasClass('no-select')) {
          const deltaX = mousedownOrigin.x - e.pageX
          const deltaY = mousedownOrigin.y - e.pageY
          if (deltaX * deltaX + deltaY * deltaY < cellHeight * cellHeight / 2) return
          this.$el.addClass('no-select')
        }

        const target = $(e.target)
        if (!target.hasClass('timeslot')) return

        const index = days.index(target.parent())
        // start of day is important or we get issues with appointments starting before the shown week (startIndex is 0 when it should be -1 for example)
        let startIndex = model.getMoment('startDate').startOf('day').diff(this.model.get('startDate'), 'days')
        let diffDays = index - startIndex
        let diffMinutes = 0; let i

        if (this.model.get('mergeView')) diffDays = 0

        const top = target.index() - offsetSlots
        const minutes = top / numTimeslots * 24 * 60 + startOffset
        // yeah this tz construct looks strange but works (local() will not work in some edge cases)
        const startMinutes = model.getMoment('startDate').diff(model.getMoment('startDate').tz(moment().tz()).startOf('day'), 'minutes')
        diffMinutes = minutes - startMinutes

        startDate = model.getMoment('startDate').tz(moment().tz()).add(diffDays, 'days').add(diffMinutes, 'minutes')
        endDate = model.getMoment('endDate').tz(moment().tz()).add(diffDays, 'days').add(diffMinutes, 'minutes')

        startIndex = Math.max(0, startDate.diff(this.model.get('startDate'), 'days'))
        let endIndex = Math.min(this.model.get('numColumns'), endDate.diff(this.model.get('startDate'), 'days'))

        // if the end date falls exactly on the start of a day we need to decrease the index by one
        // otherwise we would draw a node on the next day when the appointment ends on midnight
        const endsOnMidnight = endDate.isSame(endDate.clone().startOf('day'))
        if (endsOnMidnight) endIndex--

        // loop over the days
        for (i = startIndex; i <= endIndex; i++) {
          const day = days.eq(i)
          const pos = i === startIndex ? startDate.diff(startDate.clone().startOf('day'), 'minutes') : 0
          const bottom = i === endIndex && !endsOnMidnight ? endDate.diff(endDate.clone().startOf('day'), 'minutes') : 24 * 60
          let slot = day.find('.resizing')

          if (slot.length === 0) slot = node.clone().appendTo(day)
          slot.css({
            top: pos / 60 / 24 * 100 + '%',
            height: (bottom - pos) / 60 / 24 * 100 + '%'
          })
        }
        days.eq(startIndex).prevAll().find('.resizing').remove()
        days.eq(endIndex).nextAll().find('.resizing').remove()
      },
      end () {
        this.$(`[data-cid="${cloneCID}"]`).remove()
        this.$(`[data-cid="${model.cid}"]`).css('opacity', '')
        this.$el.removeClass('no-select')
        this.$('.resizing').removeClass('resizing')
        startDate.tz(model.getMoment('startDate').tz())
        endDate.tz(model.getMoment('endDate').tz())
        if (startDate.isSame(model.getMoment('startDate'))) return
        this.opt.view.updateAppointment(model, {
          startDate: { value: startDate.format('YYYYMMDD[T]HHmmss'), tzid: startDate.tz() },
          endDate: { value: endDate.format('YYYYMMDD[T]HHmmss'), tzid: endDate.tz() }
        })
      },
      cancel () {
        this.$el.removeClass('no-select')
        this.$(`[data-cid="${model.cid}"]`).remove()
        this.$(`[data-cid="${cloneCID}"]`).css('opacity', '').attr('data-cid', model.cid)
      }
    })
  },

  onWindowResize () {
    this.updateCellHeight()
    this.setColumnHeight()
  },

  setColumnHeight () {
    const height = this.getContainerHeight()
    this.$('.scrollpane').css('height', height / 16 + 'rem')
  }
})

export default perspective.View.extend({

  className: 'weekview-container translucent-low',

  options: {
    showFulltime: true,
    slots: 24,
    limit: 1000
  },

  initialize (opt) {
    this.mode = opt.mode || 'day'
    this.app = opt.app

    this.model = new Backbone.Model({
      additionalTimezones: this.getTimezoneLabels(),
      workStart: settings.get('startTime', 8) * 1,
      workEnd: settings.get('endTime', 18) * 1,
      gridSize: 60 / settings.get('interval', 30),
      mergeView: _.device('!smartphone') && this.mode === 'day' && this.app.folders.list().length > 1 && settings.get('mergeview'),
      date: opt.startDate || moment(this.app.getDate()),
      mode: this.mode
    })
    this.updateNumColumns()
    this.initializeSubviews()

    this.$el.addClass(this.mode)
    this.setStartDate(this.model.get('date'), { silent: true })

    this.listenTo(api, 'process:create update delete', this.onUpdateCache)

    this.listenTo(settings, 'change:renderTimezones change:favoriteTimezones', this.onChangeTimezones)
    this.listenTo(settings, 'change:startTime change:endTime', this.getCallback('onChangeWorktime'))
    this.listenTo(settings, 'change:interval', this.getCallback('onChangeInterval'))

    if (this.model.get('mode') === 'day') this.listenTo(settings, 'change:mergeview', this.onChangeMergeView)
    if (this.model.get('mode') === 'workweek') this.listenTo(settings, 'change:numDaysWorkweek change:workweekStart', this.getCallback('onChangeWorkweek'))

    perspective.View.prototype.initialize.call(this, opt)
  },

  initializeSubviews () {
    const opt = _.extend({
      app: this.app,
      view: this,
      model: this.model,
      type: this.model.get('mode') === 'day' ? 'day' : 'week'
    }, this.options)
    this.weekViewHeader = new CalendarHeader(opt)
    this.weekViewToolbar = new WeekViewToolbar(opt)
    this.fulltimeView = new FulltimeView(opt)
    this.appointmentView = new AppointmentView(opt)
    this.$el.append(
      this.weekViewHeader.$el,
      this.weekViewToolbar.$el,
      this.fulltimeView.$el,
      this.appointmentView.$el
    )
  },

  getTimezoneLabels () {
    const list = _.intersection(
      settings.get('favoriteTimezones', []),
      settings.get('renderTimezones', [])
    )

    // avoid double appearance of default timezone
    return _(list).without(coreSettings.get('timezone'))
  },

  updateNumColumns () {
    let columns
    switch (this.mode) {
      case 'day':
        if (this.model.get('mergeView')) this.$el.addClass('merge-view')
        columns = 1
        break
      case 'workweek':
        columns = settings.get('numDaysWorkweek')
        break
      case 'week':
      default:
        columns = 7
    }
    this.model.set('numColumns', columns)
  },

  onChangeDate (model, date) {
    date = moment(date)
    this.model.set('date', date)
    this.setStartDate(date)
  },

  onWindowShow () {
    if (this.$el.is(':visible')) this.trigger('show')
  },

  onChangeTimezones () {
    this.model.set('additionalTimezones', this.getTimezoneLabels())
  },

  /**
   * set week reference start date
   * @param {Moment} value   moment: moment date object in the reference week
   * @param {object} options propagate (boolean): propagate change
   */
  setStartDate (value, options) {
    if (_.isString(value)) {
      const mode = value === 'next' ? 'add' : 'subtract'
      const type = this.model.get('mode') === 'day' ? 'day' : 'week'
      value = this.model.get('startDate').clone()[mode](1, type)
    }

    const previous = moment(this.model.get('startDate'))
    const opt = _.extend({ propagate: true, silent: false }, options)
    const date = moment(value)

    // normalize startDate to beginning of the week or day
    switch (this.mode) {
      case 'day':
        date.startOf('day')
        break
      case 'workweek':
        // we always want to start on a date before or at the start date, so subtract days until we meet the day the workweek starts
        // don't use startOf week or iso week here. Work week view is completely independent from that.
        // use 7 + in modulo to avoid negative modulo ( -1 % 7 is -1 in js and not 6. But we want to go back 6 days and not go one day to the future)
        date.subtract((7 + date.day() - settings.get('workweekStart')) % 7, 'days').startOf('day')
        break
      case 'week':
      default:
        date.startOf('week')
        break
    }

    // only trigger change event if start date has changed
    if (date.isSame(previous)) return
    this.model.set({
      startDate: date,
      endDate: date.clone().add(this.model.get('numColumns'), 'days')
    }, { silent: opt.silent })
    if (opt.propagate) this.app.setDate(moment(value))
    if (ox.debug) console.log('refresh calendar data')
    this.refresh()
  },

  render () {
    this.weekViewHeader.render()
    this.weekViewToolbar.render()
    this.fulltimeView.render()
    this.appointmentView.render()
    return this
  },

  getRequestParam () {
    const params = {
      start: this.model.get('startDate').valueOf(),
      end: moment(this.model.get('startDate')).add(this.model.get('numColumns'), 'days').valueOf(),
      view: 'week',
      folders: this.app.folders.list()
    }
    return params
  },

  async refresh (useCache) {
    const self = this
    const obj = this.getRequestParam()
    const collection = api.getCollection(obj)
    // set manually to expired to trigger reload on next opening
    if (useCache === false) api.pool.grep('view=week').forEach(c => { c.expired = true })

    this.setCollection(collection)

    // no need to wait for folder data we already have the ids
    // TODO: check errorhandling if folders cannot be read etc
    collection.folders = this.app.folders.folders
    collection.sync()

    const folderData = await Promise.all([this.app.folder.getData(), this.app.folders.getData()])
    self.model.set('folders', folderData[1])
  },

  onUpdateCache () {
    const collection = this.collection
    // set all other collections to expired to trigger a fresh load on the next opening
    api.pool.grep('view=week').forEach(function (c) {
      if (c !== collection) c.expired = true
    })
    collection.sync()
  },

  onPrevious () {
    this.weekViewHeader.$('.prev').trigger('click')
  },

  onNext () {
    this.weekViewHeader.$('.next').trigger('click')
  },

  onChangeMergeView () {
    this.model.set('mergeView', _.device('!smartphone') && this.mode === 'day' && this.app.folders.list().length > 1 && settings.get('mergeview'))
  },

  onChangeInterval () {
    this.model.set('gridSize', 60 / settings.get('interval', 30))
  },

  onAddAppointment (model) {
    if (util.isAllday(model) && this.options.showFulltime) this.fulltimeView.trigger('collection:add', model)
    else this.appointmentView.trigger('collection:add', model)
  },

  onChangeWorkweek () {
    this.setStartDate(this.model.get('startDate'))
    this.updateNumColumns()
    this.render()
  },

  onChangeWorktime () {
    this.model.set({
      workStart: settings.get('startTime', 8) * 1,
      workEnd: settings.get('endTime', 18) * 1
    })
    this.render()
  },

  onChangeAppointment (model) {
    const isAllday = util.isAllday(model)
    if (model.changed.startDate) this.collection.sort()
    if (isAllday !== util.isAllday(model.previousAttributes())) {
      const prevView = isAllday ? this.appointmentView : this.fulltimeView
      const nextView = isAllday ? this.fulltimeView : this.appointmentView
      prevView.trigger('collection:remove', model)
      nextView.trigger('collection:add', model)
      return
    }
    if (util.isAllday(model) && this.options.showFulltime) this.fulltimeView.trigger('collection:change', model)
    else this.appointmentView.trigger('collection:change', model)
  },

  onRemoveAppointment (model) {
    if (util.isAllday(model) && this.options.showFulltime) this.fulltimeView.trigger('collection:remove', model)
    else this.appointmentView.trigger('collection:remove', model)
  },

  onResetAppointments () {
    this.fulltimeView.trigger('collection:before:reset')
    this.appointmentView.trigger('collection:before:reset')

    this.collection.forEach(function (model) {
      if (util.isAllday(model) && this.options.showFulltime) this.fulltimeView.trigger('collection:add', model)
      else this.appointmentView.trigger('collection:add', model)
    }.bind(this))

    this.fulltimeView.trigger('collection:after:reset')
    this.appointmentView.trigger('collection:after:reset')
  },

  getName () {
    return 'week'
  },

  // called when an appointment detail-view opens the according appointment
  selectAppointment (model) {
    // use start of appointment in calendar timezone
    this.setStartDate(model.getMoment('startDate').clone().tz(this.model.get('startDate').tz()))
    // check if there is a node drawn yet. If yes click it. if not, draw without arrow
    const target = this.$el.find(`.appointment[data-cid="${CSS.escape(util.cid(model))}"] .appointment-content`)
    if (target.length) {
      const e = new $.Event('click')
      e.pageX = target.offset().left + target.width() / 2
      target.trigger(e)
      return
    }
    this.showAppointment($.Event('click', { target: this.$el }), model, { arrow: false })
  },

  print () {
    const folders = this.model.get('folders')
    let title = gt('Appointments')
    if (folders.length === 1) title = folders[0].display_title || folders[0].title
    print.request(() => import('@/io.ox/calendar/week/print'), {
      start: this.model.get('startDate').valueOf(),
      end: this.model.get('startDate').clone().add(this.model.get('numColumns'), 'days').valueOf(),
      folders: _(folders).pluck('id'),
      title,
      numberOfColumns: this.model.get('numColumns')
    })
  }

})
