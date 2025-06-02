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

import _ from '@/underscore'
import $ from '@/jquery'
import moment from '@open-xchange/moment'

import DisposableView from '@/io.ox/backbone/views/disposable'
import mini from '@/io.ox/backbone/mini-views/common'
import '@/io.ox/backbone/views/datepicker.scss'

//
// Time view: <input type="time"> or <input type="text"> plus Time Picker
//
let TimeView

const TimePickerView = DisposableView.extend({

  className: 'time-picker',

  events: {
    'click .date': 'onSelectDate',
    keydown: 'onKeydown'
  },

  // we use the constructor here not to collide with initialize()
  constructor: function (options) {
    this.options = options || {}
    this.$target = $()
    this.$parent = $(this.options.parent || 'body')
    this.date = this.getInitialDate()
    this.closing = false
    // the original constructor will call initialize()
    DisposableView.prototype.constructor.apply(this, arguments)
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
    $(window).on('resize', $.proxy(this.onWindowResize, this))
  },

  getInitialDate () {
    return moment(this.options.time).startOf('hour').add(1, 'hour')
  },

  attachTo (target) {
    this.$target = $(target)
    // just open from input fields (no toggle)
    this.$target.on('focus click', $.proxy(this.open, this))
    this.on('select', function () {
      this.$target.val(this.getFormattedDate()).trigger('change')
    })
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
    const id = _.uniqueId('picker')
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
    const m = this.date.clone().startOf('day')
    const fragments = 2
    this.$el.attr({ role: 'region', tabindex: 0 }).append(
      _.range(0, 24 * fragments).map(function () {
        const node = $('<div class="date">')
          .attr('data-date', m.valueOf())
          .toggleClass('fullhour', m.minutes() === 0)
          .text(m.format('LT'))
        m.add(60 / fragments, 'minutes')
        return node
      })
    )
    return this
  },

  onSelectDate (e) {
    const date = moment($(e.currentTarget).data('date'))
    this.trigger('select', date)
  },

  onTargetInput () {
    const val = this.$target.val(); const date = moment(val, 'LT')
    this.setDate(date)
  },

  getFormattedDate () {
    return this.getDate().format('LT')
  },

  getDate () {
    return this.date
  },

  setDate (date) {
    date = moment(date || this.date)

    // valid?
    if (!date.isValid()) return

    // update internal date
    const isSame = date.isSame(this.getDate())
    if (isSame) return

    this.date = date
    this.trigger('change', date)
  }
})

export default (() => {
  if (_.device('smartphone')) {
    return mini.InputView.extend({
      el: '<input type="time" class="form-control">'
    })
  }

  TimeView = mini.InputView.extend({
    format: 'LT',
    onChange () {
      const t = +moment(this.$el.val(), this.format)
      this.model.set(this.name, t)
    },
    update () {
      const date = this.model.get(this.name)
      this.$el.val(date || this.options.mandatory ? this.getFormattedDate(date) : '')
    },
    getFormattedDate (date) {
      return moment(date).format(this.format)
    },
    render () {
      mini.InputView.prototype.render.call(this)
      // need to be async here otherwise parent is undefined
      setTimeout(function () {
        new TimePickerView({ parent: this.$el.closest('.modal, #io-ox-core'), mandatory: this.options.mandatory })
          .attachTo(this.$el)
          .on('select', function (date) {
            this.model.set(this.name, date.valueOf())
          }.bind(this))
      }.bind(this))
      return this
    }
  })

  return TimeView
})()
