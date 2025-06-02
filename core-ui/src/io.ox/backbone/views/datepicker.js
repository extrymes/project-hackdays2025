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

import moment from '@open-xchange/moment'
import $ from '@/jquery'
import _ from '@/underscore'

import DisposableView from '@/io.ox/backbone/views/disposable'
import a11y from '@/io.ox/core/a11y'
import '@/io.ox/backbone/views/datepicker.scss'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

//
// Date picker
//
// options:
// - date: the predefined date, either number, a native Date instance, or a moment.js instance
// - parent: parent element of the picker; default is <body>

const DatePickerView = DisposableView.extend({

  className: 'date-picker',

  events: {
    'click .btn-prev, .btn-next': 'onNavigate',
    'click .btn-today': 'onToday',
    'click .switch-mode': 'onSwitchMode',
    'click .date': 'onSelectDate',
    keydown: 'onKeydown'
  },

  // we use the constructor here not to collide with initialize()
  constructor: function (options) {
    this.options = options || {}
    this.datepickerId = _.uniqueId('dp_')
    this.$target = $()
    this.$parent = $(this.options.parent || 'body')
    this.date = this.getInitialDate()
    this.mode = 'month'
    this.closing = false
    // the original constructor will call initialize()
    DisposableView.prototype.constructor.apply(this, arguments)
    this.renderScaffold()
    this.on({
      select (date) {
        this.date = date.clone()
        this.close()
      },
      dispose () {
        this.$target
          .off({
            change: this.onTargetInput,
            click: this.open,
            dispose: this.remove,
            focus: this.open,
            focusout: this.focusOut,
            input: this.onTargetInput,
            keydown: this.onTargetKeydown
          })
          .closest('.scrollable').off('scroll', this.close)
        $(window).off('resize', $.proxy(this.onWindowResize, this))
      }
    })
    this.focusOut = _.debounce(function () {
      const active = document.activeElement
      if (this.disposed) return
      if (this.el === active) return
      if (this.$target[0] === active) return
      if ($.contains(this.el, active)) return
      this.close(false)
    }, 1)
    this.$el.on('focusout', $.proxy(this.focusOut, this))

    // add attribute information
    if (this.options.attribute) {
      this.$el.attr('data-attribute', this.options.attribute)
    }

    $(window).on('resize', $.proxy(this.onWindowResize, this))
  },

  getInitialDate () {
    if (this.options.mandatory) return null
    if (this.options.date !== undefined) return moment(this.options.date)
    return this.getToday()
  },

  getToday () {
    return moment().startOf('day')
  },

  //
  // Focus behavior
  //
  // <input> field:
  // - opens on focus and on click
  // - the focus is not changed
  // - closes if the focus moves along (neither on input or picker)
  //
  // non-input element:
  // - opens on click (i.e. mouse click and enter)
  // - focus is always moved to picker to allow keyboard usage
  // - closes if the focus moves along (neither on input or picker)
  //
  attachTo (target) {
    this.$target = $(target)
    if (this.$target.is('input')) {
      // just open from input fields (no toggle)
      this.$target.on('focus click', $.proxy(this.open, this))
      this.on('select', function () {
        this.$target.val(this.getFormattedDate()).trigger('change')
      })
    } else {
      // click (i.e. mouse click and enter) to toggle
      this.$target.on('click', $.proxy(this.toggle, this))
    }
    this.$target
      .attr({
        'aria-haspopup': true
      })
      .on('change input', $.proxy(this.onTargetInput, this))
      .on('keydown', $.proxy(this.onTargetKeydown, this))
      .on('focusout', $.proxy(this.focusOut, this))
      .on('dispose', $.proxy(this.remove, this))
      .closest('.scrollable').on('scroll', $.proxy(this.close, this))
    return this
  },

  toggle () {
    if (this.isOpen()) this.close(); else this.open()
  },

  open () {
    if (this.isOpen() || this.closing) return
    // reset mode
    this.mode = 'month'
    // render first to have dimensions
    this.trigger('before:open')
    this.render().$el.appendTo(this.$parent)
    // find proper placement
    const offset = this.$target.offset() || { top: 200, left: 600 }
    const targetHeight = this.$target.outerHeight() || 0
    const maxHeight = this.$parent.height()
    // exceeds screen bottom?
    if ((offset.top + targetHeight + this.$el.outerHeight()) > maxHeight) {
      // above but in viewport
      this.$el.css({ top: Math.max(0, offset.top - this.$el.outerHeight()) })
    } else {
      // below
      this.$el.css({ top: offset.top + targetHeight })
    }
    this.$el.css({ left: offset.left }).addClass('open')
    // only change for non-input fields
    if (!this.$target.is(':input')) this.$el.focus()

    const id = _.uniqueId('datepicker')
    this.$el.attr('id', id)
    this.$target.attr('aria-owns', id)
    this.trigger('open')
  },

  close (restoreFocus) {
    if (!this.isOpen()) return
    this.closing = true
    this.trigger('before:close')
    this.$el.removeClass('open')
    this.$target.removeAttr('aria-owns')
    if (restoreFocus !== false) this.$target.focus()
    this.closing = false
    this.trigger('close')
  },

  isOpen () {
    return this.$el.hasClass('open')
  },

  onWindowResize () {
    if (this.isOpen()) this.close()
  },

  render () {
    switch (this.mode) {
      case 'decade': this.renderDecade(); break
      case 'year': this.renderYear(); break
      default: this.renderMonth(); break
    }
    return this
  },

  renderScaffold () {
    const headerId = _.uniqueId('header')
    this.$el.attr({ 'aria-labelledby': headerId, role: 'region', tabindex: -1 }).append(
      $('<div class="navigation">').append(
        $('<button type="button" class="btn-prev pull-left">').append(createIcon('bi/chevron-left.svg')),
        $('<span role="heading" aria-live="assertive" aria-atomic="true" aria-level="2">').attr('id', headerId),
        $('<button type="button" class="btn-next pull-right">').append(createIcon('bi/chevron-right.svg'))
      ),
      this.$grid = $('<table class="grid grid-datepicker" role="grid" tabindex="0">')
        .attr('aria-label', gt('Use cursor keys to navigate, press enter to select a date'))
    )
    // today button
    if (this.options.showTodayButton !== false) {
      this.$el.append(
        $('<button type="button" class="btn-today">').text(gt('Today: %1$s', moment().format('l')))
      )
    }
  },

  renderHeader () {
    this.$('[role="heading"]').empty().append(_(arguments).toArray())
  },

  renderGrid () {
    this.$grid.empty().append(_(arguments).toArray())
  },

  setActiveDescendant (id) {
    if (!id) {
      const selected = this.$grid.find('[aria-selected="true"]')
      id = (selected.length ? selected : this.$grid.find('td:first').attr('aria-selected', true)).attr('id')
    }
    this.$grid.attr('aria-activedescendant', id)
  },

  setNavigationLabels (prev, next) {
    this.$('.btn-prev').attr('aria-label', prev).find('.fa').attr('title', prev)
    this.$('.btn-next').attr('aria-label', next).find('.fa').attr('title', next)
  },

  renderMonth () {
    const current = this.getDate().clone().startOf('day')
    const m = current.clone()
    const datepickerId = this.datepickerId

    this.renderHeader(
      $('<button type="button" class="switch-mode">')
        .attr({
          'data-mode': 'year',
          'data-value': m.year()
        })
        .text(m.formatCLDR('yMMMM'))
    )

    this.setNavigationLabels(gt('Go to previous month'), gt('Go to next month'))

    this.renderGrid(
      $('<thead>').append(
        $('<tr role="row">')
          // add empty <th> due to calendar week column
          .append($('<th class="cw weekday">').text(gt('CW')))
          .append(function () {
            const w = m.clone().startOf('week')
            return _.range(0, 7).map(function () {
              try {
                return $('<th class="weekday">')
                  .toggleClass('weekend', w.day() === 0 || w.day() === 6)
                  .text(w.format('dd'))
              } finally {
                w.add(1, 'day')
              }
            })
          })
      ),
      $('<tbody>').append(
        function () {
          const month = m.date(1).month(); const start = m.clone(); const end = m.clone().endOf('month')
          if (m.startOf('week').isAfter(start)) m.subtract(1, 'week')
          // use hours and divide by 168 (24 * 7). If we use days we get wrong results when a month has 6 calendar weeks and a daylight saving time change. (Oct 2016 for example) see Bug 49479
          return _.range(0, Math.ceil(end.diff(m, 'hours') / 168)).map(function () {
            return $('<tr role="row">')
              .append(
                $('<th class="cw date">').text(m.week())
              )
              .append(function () {
                return _.range(0, 7).map(function () {
                  try {
                    return $('<td role="gridcell" class="date">')
                      .attr({
                        id: datepickerId + '_' + m.format('l'),
                        // #. CW is calender week and %1$d is the week number
                        'aria-label': isToday(m)
                          ? gt('Today,') + ' ' + m.format('l, dddd') + ', ' + gt('CW %1$d', m.week())
                          : m.format('l, dddd') + ', ' + gt('CW %1$d', m.week()),
                        'aria-selected': isSame(m, current),
                        'data-date': m.valueOf()
                      })
                      .toggleClass('outside', m.month() !== month)
                      .toggleClass('weekend', m.day() === 0 || m.day() === 6)
                      .toggleClass('today', isToday(m))
                      .text(m.format('D'))
                  } finally {
                    m.add(1, 'day')
                  }
                })
              })
          })
        }
      )
    )

    this.setActiveDescendant()
  },

  renderYear () {
    const current = this.getDate().month()
    const m = this.getDate().clone().month(0)

    this.renderHeader(
      $('<button type="button" class="switch-mode">')
        .attr({
          'data-mode': 'decade',
          'data-value': m.year()
        })
        .text(m.format('YYYY'))
    )

    this.setNavigationLabels(gt('Go to previous year'), gt('Go to next year'))

    this.renderGrid(function () {
      return _.range(0, 4).map(function () {
        return $('<tr role="row">').append(function () {
          return _.range(0, 3).map(function () {
            try {
              return $('<td role="gridcell" class="month switch-mode">')
                .attr({
                  id: 'month_' + m.format('YYYY-MM'),
                  'aria-label': m.formatCLDR('yMMMM'),
                  'aria-selected': m.month() === current,
                  'data-mode': 'month',
                  'data-value': m.month()
                })
                .text(m.format('MMM'))
            } finally {
              m.add(1, 'month')
            }
          })
        })
      })
    })

    this.setActiveDescendant()
  },

  renderDecade () {
    const current = this.getDate().year()
    const m = this.getDate().clone()

    m.year(Math.floor(m.year() / 10) * 10)

    this.renderHeader(
      $('<caption>').text(m.format('YYYY') + ' - ' + m.clone().add(11, 'years').format('YYYY'))
    )

    this.setNavigationLabels(gt('Go to previous decade'), gt('Go to next decade'))

    this.renderGrid(function () {
      return _.range(0, 4).map(function () {
        return $('<tr role="row">').append(function () {
          return _.range(0, 3).map(function () {
            try {
              return $('<td role="gridcell" class="year switch-mode">')
                .attr({
                  id: 'year_' + m.year(),
                  'aria-selected': m.year() === current,
                  'data-mode': 'year',
                  'data-value': m.year()
                })
                .text(m.format('YYYY'))
            } finally {
              m.add(1, 'year')
            }
          })
        })
      })
    })

    this.setActiveDescendant()
  },

  onNavigate (e) {
    const fn = $(e.currentTarget).hasClass('btn-prev') ? 'subtract' : 'add'
    const date = this.getDate().clone()
    switch (this.mode) {
      case 'decade': date[fn](10, 'years'); break
      case 'year': date[fn](1, 'year'); break
      default: date[fn](1, 'month'); break
    }
    this.setDate(date, true)
    if (this.$el.hasClass('open')) e.stopPropagation()
  },

  onToday (e) {
    if (this.$el.hasClass('open')) e.stopPropagation()
    if (this.mode !== 'month') {
      // switch to current date in month view
      this.mode = 'month'
      this.setDate(this.getToday())
      this.$grid.focus()
    } else {
      // select current date and close picker
      this.trigger('select', this.getToday())
    }
  },

  switchMode (mode, value) {
    this.mode = mode
    const date = this.getDate().clone()
    switch (this.mode) {
      case 'year': date.year(value); break
      case 'month': date.month(value); break
      // no default
    }
    this.setDate(date)
    this.$grid.focus()
  },

  onSwitchMode (e) {
    const node = $(e.currentTarget); const value = node.data('value')
    this.switchMode(node.attr('data-mode'), value)
    if (this.$el.hasClass('open')) e.stopPropagation()
  },

  onSelectDate (e) {
    const target = $(e.currentTarget)
    const date = moment(target.data('date'))
    if (target.hasClass('cw')) return
    if (this.$el.hasClass('open')) e.stopPropagation()
    this.trigger('select', date)
  },

  onKeydown: (function () {
    const movement = {
      horizontal: { month: { day: 1 }, year: { month: 1 }, decade: { year: 1 } },
      vertical: { month: { week: 1 }, year: { months: 3 }, decade: { years: 3 } }
    }

    return function (e) {
      switch (e.which) {
        case 9:
          handleTab.call(this, e)
          return
        case 13:
          handleEnter.call(this, e)
          return
        case 27:
          handleEscape.call(this, e)
          return
        case 33:
        case 34:
          handlePageUpDown.call(this, e)
          break
        case 35:
        case 36:
          handleHomeEnd.call(this, e)
          break
        case 37:
        case 38:
        case 39:
        case 40:
          handleCursor.call(this, e)
          break
        // no default
      }

      // some keys interfere with outer UI so we stop bubbling
      e.stopPropagation()
    }

    function handleTab (e) {
      const tabbable = this.$(':input, :button')
      const index = tabbable.index(e.target)
      const lowOut = e.shiftKey && index === 0 && !!this.$target.length
      const highOut = !e.shiftKey && index === tabbable.length - 1 && !!this.$target.length

      // apply focus trap
      if (lowOut || highOut) e.preventDefault()
      if (!this.$target.length) return
      // set proper focus
      if (lowOut) this.$target.focus()
      else if (highOut) focusNext.call(this)
    }

    function focusNext () {
      const all = a11y.getTabbable($('body'))
      const index = all.index(this.$target)
      all.eq(index + 1).focus()
    }

    function handleEscape (e) {
      // we use preventDefault for nested handlers, e.g. picker in a modal dialog
      e.preventDefault()
      this.close()
    }

    function handleEnter () {
      // handle enter only if focus is on grid
      if (this.$grid[0] !== document.activeElement) return
      if (this.mode === 'month') {
        this.trigger('select', this.getDate().clone())
      } else {
        const selected = this.$('[aria-selected="true"]')
        const mode = selected.attr('data-mode')
        if (mode) this.switchMode(mode, selected.data('value'))
      }
    }

    function handlePageUpDown (e) {
      const interval = {}; const up = e.which === 33; const sign = up ? -1 : +1
      switch (this.mode) {
        case 'month': interval.month = sign * (e.shiftKey ? 12 : 1); break
        case 'year': interval.year = sign * (e.shiftKey ? 10 : 1); break
        case 'decade': interval.year = sign * (e.shiftKey ? 100 : 10); break
        // no default
      }
      this.setDate(this.getDate().clone().add(interval))
    }

    function handleHomeEnd (e) {
      const isEnd = e.which === 35; const fn = isEnd ? 'endOf' : 'startOf'
      this.setDate(this.getDate().clone()[fn]('month'))
    }

    function handleCursor (e) {
      const selected = this.$('[aria-selected="true"]')
      let type = 'add'; let direction = 'horizontal'

      // take care of the unexpected
      if (!selected.length) return this.setDate()

      switch (e.which) {
        // cursor left (nothing to do for cursor right)
        case 37: type = 'subtract'; break
        // cursor up
        case 38: type = 'subtract'; direction = 'vertical'; break
        // cursor down
        case 40: direction = 'vertical'; break
        // no default
      }

      this.setDate(this.getDate().clone()[type](movement[direction][this.mode]))
      this.$grid.focus()
    }
  }()),

  onTargetKeydown (e) {
    switch (e.which) {
      // capture tab (not shift-tab) if open
      case 9: // tab
        if (e.shiftKey || !this.isOpen()) return
        e.preventDefault()
        this.$el.focus()
        break
      case 27: // esc
        // we use preventDefault for nested handlers, e.g. picker in a modal dialog
        if (this.isOpen()) {
          e.preventDefault()
          this.close()
        }
        break
      case 13: // enter
        this.toggle()
        break
      // no default
    }
  },

  onTargetInput () {
    const val = this.$target.val()
    const date = moment(val, ['l', 'D.M.YYYY', 'D.M.YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-M-D'], true)
    this.setDate(date)
  },

  getDate () {
    return this.date || this.getToday()
  },

  getFormattedDate () {
    return this.getDate().format('l')
  },

  setDate (date, forceRender) {
    date = moment(date || this.date)
    // valid?
    if (!date.isValid()) return
    // avoid BC
    if (date.year() <= 0) return

    // update internal date
    const isSame = date.isSame(this.getDate())
    this.date = date

    let selector
    const select = function (node) {
      if (!node.length) return
      this.$('[aria-selected="true"]').attr('aria-selected', false)
      node.attr('aria-selected', true)
      this.setActiveDescendant(node.attr('id'))
    }.bind(this)

    // in some cases we want to force the view to draw new (looks strange if the month doesn't switch when the next months 1st is also visible. See Bug 52026)
    if (forceRender) {
      this.render()
    } else {
      // currently visible?
      switch (this.mode) {
        case 'decade': selector = '#year_' + date.year(); break
        case 'year': selector = '#month_' + date.format('YYYY-MM'); break
        case 'month': selector = '#date_' + CSS.escape(date.format('l')); break
        // no default
      }
      // found?
      const node = this.$grid.find(selector)
      if (node.length) select(node); else this.render()
    }
    if (!isSame) this.trigger('change', date)
  }
})

function isSame (a, b) {
  return a.isSame(b, 'day')
}

function isToday (m) {
  return isSame(m, moment())
}

export default DatePickerView
