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

// cSpell:ignore opac

import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/calendar/api'
import resourceAPI from '@/io.ox/core/api/resource'
import calendarModel from '@/io.ox/calendar/model'
import * as util from '@/io.ox/calendar/util'
import detailView from '@/io.ox/calendar/view-detail'
import DetailPopup from '@/io.ox/backbone/views/popup'
import yell from '@/io.ox/core/yell'
import folderAPI from '@/io.ox/core/folder/api'
import DisposableView from '@/io.ox/backbone/views/disposable'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import Backbone from '@/backbone'

import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { createButton, createIcon } from '@/io.ox/core/components'

const Perspective = DisposableView.extend({

  clickTimer: null, // timer to separate single and double click
  clicks: 0, // click counter

  events () {
    const events = {
      'click .appointment': 'onClickAppointment',
      'dblclick .appointment': 'onDoubleClick'
    }
    if (_.device('touch')) {
      events.swipeleft = 'onNext'
      events.swiperight = 'onPrevious'
    }
    return events
  },

  initialize (options) {
    this.listenTo(this.model, 'change:date', this.onChangeDate)
    this.listenTo(api, 'refresh.all', this.refresh.bind(this, true))
    if (coreSettings.get('features/resourceCalendars', false)) this.listenTo(api, 'updateResourceFolders', this.refresh.bind(this, false))
    this.listenTo(this.app, 'folders:change', this.refresh)
    this.listenTo(this.app.props, 'change:date', this.getCallback('onChangeDate'))
    this.app.getWindow().on('show', this.onWindowShow.bind(this))
    this.listenTo(settings, 'change:showDeclinedAppointments', this.getCallback('onResetAppointments'))
    this.listenTo(folderAPI, 'before:update', this.beforeUpdateFolder)

    _.defer(this.followDeepLink.bind(this, options.deepLink))
  },

  // needs to be implemented by the according view
  render: $.noop,
  refresh: $.noop,
  onWindowShow: $.noop,
  onChangeDate: $.noop,

  setCollection (collection) {
    if (this.collection === collection) return

    if (this.collection) this.stopListening(this.collection)
    this.collection = collection

    this.onResetAppointments()

    this
      .listenTo(this.collection, 'add', this.onAddAppointment)
      .listenTo(this.collection, 'change', this.onChangeAppointment)
      .listenTo(this.collection, 'remove', this.onRemoveAppointment)
      .listenTo(this.collection, 'reset', this.onResetAppointments)
      .listenTo(this.collection, 'load:fail', this.onLoadFail)
  },

  onAddAppointment: $.noop,
  onChangeAppointment: $.noop,
  onRemoveAppointment: $.noop,
  onResetAppointments: $.noop,

  getName: $.noop,

  onLoadFail (err) {
    // see Bug 68641
    if (err.code === 'CAL-5072') {
      // #.Error message shown to user if there are too many selected appointments in a timeframe
      yell('error', gt('Your current selection contains too many appointments for the chosen timeframe.'))
    }
  },

  showAppointment: (function () {
    function failHandler (e) {
      // CAL-4040: Appointment not found
      if (e && e.code === 'CAL-4040') {
        yell(e)
      } else {
        yell('error', gt('An error occurred. Please try again.'))
      }
      this.dialog.close()
      this.$('.appointment').removeClass('opac current')
      this.trigger('show:appointment:fail')
      if (_.device('smartphone')) {
        this.app.pages.getPage('detailView').idle()
        this.app.pages.goBack()
      }
    }

    return function (e, obj, options) {
      // open appointment details
      const self = this

      if (_.device('smartphone')) {
        self.app.pages.changePage('detailView')
        self.app.pages.getPage('detailView').busy()
      }

      self.detailCID = api.cid(obj)

      if (_.device('smartphone')) {
        const p = self.app.pages.getPage('detailView')
        api.get(obj).then(function (model) {
          const b = new ext.Baton({ data: model.toJSON(), model })
          p.idle().empty().append(detailView.draw(b))
          self.app.pages.getToolbar('detailView').setBaton(b)
        }, failHandler.bind(self))
      } else {
        const dialog = this.getDialog()
        dialog.$el.addClass('detail-popup-appointment')
        dialog.snap(e)
        api.get(obj).then(async model => {
          if (model.cid !== self.detailCID) {
            // this appointment was changed to an exception in the meantime, probably by another calendar client
            // switch to updated data, send info message and clean up
            if (model.get('seriesId') && model.get('seriesId') === obj.id) {
              api.pool.getByFolder(model.get('folder')).forEach(function (collection) {
                collection.expired = true
                collection.sync()
              })
              self.detailCID = model.cid
              yell('warning', gt('Appointment was changed in the meantime and was updated accordingly.'))
            } else {
              // close the dialog correctly and show an error message. Avoid never ending busy spinner.
              failHandler.call(self)
              return
            }
          }
          if (model.isResource() && !model.get('attendees')) {
            const resourceId = model.get('folder').split('cal://0/resource')[1]
            const resource = await resourceAPI.get({ id: resourceId })
            const resourceAttendee = util.createAttendee({ ...resource, type: 3 }, { partStat: 'ACCEPTED' })
            await model.getAttendees().add(resourceAttendee)
          }
          dialog.$body.append(
            detailView.draw(new ext.Baton({ model, popup: dialog }))
          )
          dialog.show({ center: !!options?.center })
        }, failHandler.bind(self))
      }
    }
  }()),

  closeAppointment () {
    this.$('.appointment').removeClass('opac current')
  },

  getDialog () {
    if (this.dialog) this.dialog.close()
    this.dialog = new DetailPopup({ selector: '.appointment' }).on('close', this.closeAppointment.bind(this))
    this.dialog.$el.attr({
      role: 'complementary',
      'aria-label': gt('Appointment Details')
    })
    return this.dialog
  },

  onClickAppointment (e) {
    this.lock = false
    const target = $(e[(e.type === 'keydown') ? 'target' : 'currentTarget'])
    if (target.hasClass('appointment') && !this.model.get('lasso') && !target.hasClass('disabled')) {
      if (!target.hasClass('current') || _.device('smartphone')) {
        setTimeout(() => {
          if (this.lock) return
          const obj = util.cid(String(target.data('cid')))
          // ignore the "current" check on smartphones
          this.$('.appointment')
            .removeClass('current opac')
            .not(this.$(`[data-root-id="${CSS.escape(obj.folder + '.' + obj.id)}"]`))
            .addClass((this.collection.length > this.limit || _.device('smartphone')) ? '' : 'opac') // do not add opac class on phones or if collection is too large
          this.$(`[data-root-id="${CSS.escape(obj.folder + '.' + obj.id)}"]`).addClass('current')
          this.showAppointment(e, obj)
        }, 200)
      } else {
        this.$('.appointment').removeClass('opac')
      }
    }
  },

  onDoubleClick (e) {
    const target = $(e.currentTarget)
    if (!target.hasClass('appointment') || this.model.get('lasso') || target.hasClass('disabled')) return

    if (!target.hasClass('modify')) return

    const obj = util.cid(String(target.data('cid')))

    this.lock = true
    api.get(obj).done(model =>
      ext.point('io.ox/calendar/detail/actions/edit')
        .invoke('action', this, new ext.Baton({ data: model.toJSON() }))
    )
  },

  createAppointment (data) {
    const baton = ext.Baton({ app: this.app })
    ext.point('io.ox/calendar/detail/actions/create')
      .invoke('action', this, baton, data)
  },

  updateAppointment (model, updates) {
    const prevStartDate = model.getMoment('startDate')
    const prevEndDate = model.getMoment('endDate')
    const prevFolder = model.get('folder')
    const hasChanges = _(updates).reduce(function (memo, value, key) {
      return memo || !_.isEqual(model.get(key), value)
    }, false)
    if (!hasChanges) return

    model.set(updates)
    const nodes = this.$(`[data-root-id="${CSS.escape(api.cid({ id: model.get('id'), folder: model.get('folder') }))}"]`).busy()

    function reset () {
      model.set({
        startDate: model.previous('startDate'),
        endDate: model.previous('endDate'),
        folder: prevFolder
      })
      nodes.idle()
    }

    function apiUpdate (model, options) {
      const obj = _(model.toJSON()).pick('id', 'folder', 'recurrenceId', 'seriesId', 'rrule', 'startDate', 'endDate', 'timestamp')

      api.update(obj, options).then(function success (data) {
        if (!data || !data.conflicts) return nodes.idle()

        ox.load(() => import('@/io.ox/calendar/conflicts/conflictList')).then(function ({ default: conflictView }) {
          conflictView.dialog(data.conflicts)
            .on('cancel', reset)
            .on('ignore', function () {
              apiUpdate(model, Object.assign(options || {}, { checkConflicts: false }))
            })
        })
      }, function fail (error) {
        reset()
        yell(error)
      })
    }

    util.showRecurrenceDialog(model)
      .then(function ({ action, rootModel }) {
        switch (action) {
          case 'series': {
            // calculate new dates if old dates are available
            const oldStartDate = rootModel.getMoment('startDate')
            if (model.hasFlag('overridden')) {
              rootModel.set({
                startDate: model.get('startDate'),
                endDate: model.get('endDate')
              })
            } else {
              const startDate = rootModel.getMoment('startDate').add(model.getMoment('startDate').diff(prevStartDate, 'ms'), 'ms')
              const endDate = rootModel.getMoment('endDate').add(model.getMoment('endDate').diff(prevEndDate, 'ms'), 'ms')
              const format = util.isAllday(model) ? 'YYYYMMDD' : 'YYYYMMDD[T]HHmmss'
              rootModel.set({
                startDate: { value: startDate.format(format), tzid: rootModel.get('startDate').tzid },
                endDate: { value: endDate.format(format), tzid: rootModel.get('endDate').tzid }
              })
            }

            util.updateRecurrenceDate(rootModel, oldStartDate)
            apiUpdate(rootModel, _.extend(util.getCurrentRangeOptions(), {
              checkConflicts: true
            }))
            break
          }
          case 'thisandfuture': {
            // calculate new dates if old dates are available use temporary new model to store data before the series split
            const updateModel = new calendarModel.Model(util.createUpdateData(rootModel, model))

            updateModel.set({
              startDate: model.get('startDate'),
              endDate: model.get('endDate')
            })

            // only if there is a new rrule set (if this and future is called on an exception we don't want to use the rrule from the root)
            if (model.get('rrule')) {
              updateModel.set('rrule', model.get('rrule'))
            }

            util.updateRecurrenceDate(updateModel, prevStartDate)
            apiUpdate(updateModel, {
              ...util.getCurrentRangeOptions(),
              checkConflicts: true,
              recurrenceRange: 'THISANDFUTURE'
            })
            break
          }
          case 'appointment':
            apiUpdate(model, { ...util.getCurrentRangeOptions(), checkConflicts: true })
            break
          default:
            reset()
        }
      })
  },

  // /*
  //  * Returns a function which will execute the requested function of the view
  //  * as soon as the view is visible
  //  */
  getCallback (name) {
    let last
    return function (...args) {
      const func = this[name]
      if (last) this.off('show', last)
      last = undefined
      if (this.$el.is(':visible')) return func.apply(this, args)
      this.once('show', last = function () {
        func.apply(this, args)
      })
    }.bind(this)
  },

  beforeUpdateFolder (id, model) {
    if (model.get('module') !== 'calendar') return
    if (!model.changed['com.openexchange.calendar.extendedProperties']) return

    const appointments = this.$(`.appointment[data-folder="${CSS.escape(model.get('id'))}"]`)
    if (!appointments.length) return

    const color = util.getFolderColor(model.attributes)
    const colors = util.deriveAppointmentColors(color)

    appointments
      .css({
        color: colors.foreground,
        'background-color': colors.background,
        'border-inline-start-color': colors.border
      })
      .data('background-color', colors.background)
      .removeClass('black white')
      .addClass(colors.background === 'white' ? 'white' : 'black')
  },

  async followDeepLink (id = '') {
    if (this.disposed) return
    if (!id) return
    const cid = api.cid(id)

    try {
      const appointmentModel = cid.id
        ? await api.get(cid)
        : await api.resolve(cid.folder).then(model => {
          // special case, when only an id is set. In this case we need to resolve the folder and recurrenceId first
          if (!model) throw new Error()
          Object.extend(cid, api.cid(model.cid))
          return model
        })

      // list perspective doesn't have `setStartDate` but `includeAppointment`
      if (this.setStartDate) this.setStartDate(appointmentModel.getMoment('startDate'))
      if (this.includeAppointment) this.includeAppointment(appointmentModel)

      if (this.app.props.get('layout') === 'list') return ox.launch(() => import('@/io.ox/calendar/detail/main'), { cid: api.cid(cid) })

      // only month, week and day view will have startDate and endDate
      const start = this.model.get('startDate')
      const end = this.model.get('endDate')
      const isInRange = appointmentModel.getMoment('startDate').isBetween(start, end) || appointmentModel.getMoment('endDate').isBetween(start, end)

      await this.app.folders.ready
      if (_.device('smartphone') || !isInRange || !this.app.folders.isSelected(appointmentModel.get('folder'))) {
        return ox.launch(() => import('@/io.ox/calendar/detail/main'), { cid: api.cid(cid) })
      }

      const selector = `.appointment[data-cid="${util.cid(cid)}"] .appointment-content`
      const target = this.$(selector)

      if (target.length) return this.showAppointment($.Event('click', { target }), cid, { arrow: false })
      this.collection.once('reset', () => {
        const target = this.$(selector)
        if (target.length) return this.showAppointment($.Event('click', { target }), cid, { arrow: false })
        ox.launch(() => import('@/io.ox/calendar/detail/main'), { cid: api.cid(cid) })
      })
    } catch (err) {
      import('@/io.ox/core/yell').then(({ default: yell }) => yell('error', gt('Could not find the requested appointment'), err))
    }
  }

})

const DragHelper = DisposableView.extend({

  constructor: function (opt) {
    this.opt = {
      ...this.options,
      ...opt
    }
    Backbone.View.prototype.constructor.call(this, opt)
  },

  mouseDragHelper (opt) {
    const self = this
    const e = opt.event
    const context = _.uniqueId('.drag-')
    // need this active tracker since mousemove events are throttled and may trigger the mousemove event
    // even after the undelegate function has been called
    let active = true
    let started = false
    let updated = false
    let stopped = false
    let escHandler
    const delay = opt.delay || 0

    if (e.which !== 1) return

    setTimeout(() => {
      if (stopped) return
      opt.start.call(this, opt.event)
      started = true
    }, delay)

    this.delegate('mousemove' + context, opt.updateContext, _.throttle(function (e) {
      if (!started) return
      if (e.which !== 1) return
      if (!active) return
      updated = true
      opt.update.call(self, e)
    }, 100))

    function clear () {
      active = false
      self.undelegate('mousemove' + context)
      self.undelegate('focusout' + context)
      $(document).off('mouseup' + context)
      if (opt.cancel) $(document).unbind('keyup', escHandler)
      if (opt.clear) opt.clear.call(self)
    }

    if (opt.clear) this.delegate('focusout' + context, clear)
    $(document).on('mouseup' + context, function (e) {
      stopped = true
      if (!started) opt.start.call(self, opt.event)
      if (!updated && delay > 0) opt.update.call(self, e)
      clear()
      opt.end.call(self, e)
    })
    if (opt.cancel) {
      escHandler = (e) => {
        e.preventDefault()
        if (e.key === 'Escape') {
          clear()
          if (opt.cancel) opt.cancel.call(self)
        }
      }
      $(document).bind('keyup', escHandler)
    }
  }
})

const CalendarHeader = DisposableView.extend({
  className: 'calendar-header',

  constructor: function (options) {
    DisposableView.prototype.constructor.apply(this, arguments)
    this.options = Object.assign({ type: 'week' }, this.options, options)
    this.app = this.options.app
    this.type = this.options.type
    this.parent = this.options.view
    this.update = _.debounce(this.update, 10)
    this.listenTo(this.model, 'change:date change:startDate', this.update)
    if (!_.device('smartphone') && this.type !== 'year') {
      this.listenTo(this.app.props, 'change:showMiniCalendar change:folderview', this.onToggleDatepicker)
    }
    this.$el.on('click', '.control.prev, .control.next, .control.today', this.onNavigate.bind(this))
    this.$currentText = $('<span>')

    this.$toolbar = $('<ul role="toolbar">')
    this.$current = $('<div class="current">')
    this.$el.append(this.$toolbar, !_.device('smartphone') && this.$current)
  },

  renderNavigation () {
    const titles = this.getNavigationTitles()
    this.$toolbar.empty().append(
      // Previous
      $('<li role="presentation">').append(
        createButton({ variant: 'toolbar', icon: { name: 'bi/chevron-left.svg', title: titles.prev, className: 'flip-rtl' } }).addClass('control prev mr-4')
      ),
      // Today
      $('<li role="presentation">').append(
        createButton({ variant: 'toolbar', tabindex: -1, text: gt('Today') }).addClass('control today mr-4')
      ),
      // Next
      $('<li role="presentation">').append(
        createButton({ variant: 'toolbar', tabindex: -1, icon: { name: 'bi/chevron-right.svg', title: titles.next, className: 'flip-rtl' } }).addClass('control next')
      )
    )
  },

  renderCurrent () {
    const props = this.app.props
    const isMiniCalendarAlreadyVisible = props.get('folderview') && props.get('showMiniCalendar')
    const isYearView = this.app.settings.get('layout') === 'year'
    const $node = this.$current.empty()

    // Do not show datepicker if miniCalendar is already visible in the sidebar, or in year view
    if (isMiniCalendarAlreadyVisible && !isYearView) {
      $node.append($('<h2 class="info">').append(
        this.$currentText,
        this.renderAdditionalInformation()
      ))
    } else {
      $node.append(
        $('<button class="info btn btn-default" type="button">')
          .attr('aria-label', gt('Use cursor keys to change the date. Press ctrl-key at the same time to change year or shift-key to change month. Close date-picker by pressing ESC key.'))
          .append(
            this.$currentText,
            this.renderAdditionalInformation(),
            createIcon('bi/chevron-down.svg')
          )
      )
    }
    this.attachDatePicker()
  },

  attachDatePicker () {},

  renderAdditionalInformation () {},

  renderLayoutDropdown () {
    if (_.device('smartphone')) return
    this.$el.find('.layout-dropdown').remove()

    function getLabel (value) {
      if (value === 'week:day') return gt('Day')
      if (value === 'week:workweek') return gt('Workweek')
      if (value === 'week:week') return gt('Week')
      if (value === 'month') return gt('Month')
      if (value === 'year') return gt('Year')
      if (value === 'list') return gt('List')
      return gt('Layout')
    }

    const flags = { radio: true, group: true }
    // ensure setting is change only by conscious user interaction
    const dropdown = new Dropdown({ caret: true, model: this.app.settings, label: getLabel(this.app.settings.get('layout')), buttonToggle: true })
      .headlessGroup(gt('Layout'))
      .option('layout', 'week:day', getLabel('week:day'), flags)
      .option('layout', 'week:workweek', getLabel('week:workweek'), flags)
      .option('layout', 'week:week', getLabel('week:week'), flags)
      .option('layout', 'month', getLabel('month'), flags)
      .option('layout', 'year', getLabel('year'), flags)
      .option('layout', 'list', getLabel('list'), flags)
      .divider()
    this.$el.append(dropdown.render().$el.addClass('margin-left-auto layout-dropdown').attr('role', 'presentation'))

    // don't show during search
    this.app.props.on('change:searching', (model, value) => {
      dropdown.$el.toggle(!value)
    })

    return dropdown
  },

  onToggleDatepicker () {
    this.renderCurrent()
  },

  onNavigate (e) {
    const target = $(e.currentTarget)
    if (target.hasClass('today')) {
      this.parent.setStartDate()
    } else {
      this.parent.setStartDate(target.hasClass('next') ? 'next' : 'previous')
    }
  },

  getNavigationTitles () {
    switch (this.type) {
      case 'day':
        return { prev: gt('Previous day'), next: gt('Next day') }
      case 'week':
        return { prev: gt('Previous week'), next: gt('Next week') }
      case 'month':
        return { prev: gt('Previous month'), next: gt('Next month') }
      case 'year':
        return { prev: gt('Previous year'), next: gt('Next year') }
    }
  }
})

export default {
  View: Perspective,
  DragHelper,
  CalendarHeader
}
