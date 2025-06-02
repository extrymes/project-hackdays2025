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

import userAPI from '@/io.ox/core/api/user'
import groupAPI from '@/io.ox/core/api/group'
import folderAPI from '@/io.ox/core/folder/api'
import contactsAPI from '@/io.ox/contacts/api'
import * as util from '@/io.ox/core/util'
import ModalDialog from '@/io.ox/backbone/views/modal'
import a11y from '@/io.ox/core/a11y'
import _ from '@/underscore'
import ox from '@/ox'
import $ from '@/jquery'
import moment from '@open-xchange/moment'
import Backbone from '@/backbone'
import apps from '@/io.ox/core/api/apps'
import rgba from 'color-rgba'
import { hasFeature } from '@/io.ox/core/feature'

import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'
import { createIcon } from '@/io.ox/core/components'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'
import { colorToRGB, colorToHSL, getRelativeLuminance } from '@/io.ox/core/theming/util'

// day names
const nCount = [gt('fifth / last'), '', gt('first'), gt('second'), gt('third'), gt('fourth'), gt('fifth / last')]
// confirmation status (none, accepted, declined, tentative)
const chronosStates = ['NEEDS-ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE']
const confirmTitles = [
  gt('unconfirmed'),
  gt('accepted'),
  gt('declined'),
  gt('tentative')
]
const nConfirm = ['bi/question-circle.svg', 'bi/check-circle-fill.svg', 'bi/x-circle-fill.svg', 'bi/question-circle-fill.svg']

// map permissions to initial participation status
const resourcePermissionPartStat = {
  none: 'DECLINED',
  ask_to_book: 'NEEDS-ACTION',
  book_directly: 'ACCEPTED',
  delegate: 'ACCEPTED'
}
const superessiveWeekdays = [
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Sunday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Monday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Tuesday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Wednesday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Thursday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Friday'),
  // #. superessive of the weekday
  // #. will only be used in a form like “Happens every week on $weekday”
  gt.pgettext('superessive', 'Saturday')
]
const attendeeLookupArray = ['', 'INDIVIDUAL', 'GROUP', 'RESOURCE', 'RESOURCE', 'INDIVIDUAL']

const colorsHEX = {
  red: '#ff2968',
  orange: '#ff9500',
  yellow: '#ffcc00',
  green: '#63da38',
  blue: '#16adf8',
  purple: '#cc73e1',
  brown: '#a2845e',
  gray: '#707070'
}

// column translations
export const columns = {
  title: gt.pgettext('title', 'Title'),
  location: gt('Location'),
  note: gt('Description')
}

// day bitmask
export const days = {
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 4,
  WEDNESDAY: 8,
  THURSDAY: 16,
  FRIDAY: 32,
  SATURDAY: 64
}

export const colors = [
  { label: gt('Red'), value: colorsHEX.red },
  { label: gt('Orange'), value: colorsHEX.orange },
  { label: gt('Yellow'), value: colorsHEX.yellow },
  { label: gt('Green'), value: colorsHEX.green },
  { label: gt('Blue'), value: colorsHEX.blue },
  { label: gt('Purple'), value: colorsHEX.purple },
  { label: gt('Brown'), value: colorsHEX.brown },
  { label: gt('Gray'), value: colorsHEX.gray }
]

export const colorDisabled = colorsHEX.gray

export const ZULU_FORMAT = 'YYYYMMDD[T]HHmmss[Z]'

export const getFirstWeekDay = function () {
  // week starts with (0=Sunday, 1=Monday, ..., 6=Saturday)
  return moment.localeData().firstDayOfWeek()
}

export const getDaysInMonth = function (year, month) {
  // trick: month + 1 & day = zero -> last day in month
  return moment([year, month + 1]).daysInMonth()
}

export const isToday = function (timestamp) {
  return moment().isSame(timestamp, 'day')
}

export const getTime = function (moment) {
  return moment.format('LT')
}

export const getDate = function (timestamp) {
  return moment(timestamp || undefined).format('ddd, l')
}

export const getSmartDate = function (model) {
  return model.getMoment('startDate').calendar()
}

export const getEvenSmarterDate = function (model) {
  // use current calendar timezone
  const m = model.getMoment('startDate').tz(moment().tz())
  const startOfDay = moment().startOf('day')
  // past?
  if (m.isBefore(startOfDay)) {
    if (m.isAfter(startOfDay.subtract(1, 'day'))) {
      return gt('Yesterday') + ', ' + m.format('l')
    }
    return m.format('ddd, l')
  }
  // future
  if (m.isBefore(startOfDay.add(1, 'days'))) {
    return gt('Today') + ', ' + m.format('l')
  }
  if (m.isBefore(startOfDay.add(1, 'day'))) {
    return gt('Tomorrow') + ', ' + m.format('l')
  }
  return m.format('ddd, l')
}

// function that returns markup for date and time + timezone label
export const getDateTimeIntervalMarkup = function (data, options) {
  if (data && data.startDate && data.endDate) {
    options = _.extend({ timeZoneLabel: { placement: _.device('touch') ? 'bottom' : 'top' }, a11y: false, output: 'markup' }, options)

    if (options.container && options.container.parents('#io-ox-core').length < 1) {
      // view is not in core (happens with deep links)
      // add timezone popover to body
      options.timeZoneLabel.container = 'body'
    }
    let startDate
    let endDate
    let dateStr
    let timeStr
    let timeZoneStr = getMoment(data.startDate).zoneAbbr()
    const formatString = options.a11y ? 'dddd, l' : 'ddd, l'

    if (isAllday(data)) {
      startDate = moment.utc(data.startDate.value).local(true)
      endDate = moment.utc(data.endDate.value).local(true).subtract(1, 'days')
    } else {
      startDate = getMoment(data.startDate)
      endDate = getMoment(data.endDate)
      if (options.zone) {
        startDate.tz(options.zone)
        endDate.tz(options.zone)
        timeZoneStr = startDate.zoneAbbr()
      }
    }
    if (startDate.isSame(endDate, 'day')) {
      dateStr = startDate.format(formatString)
      timeStr = getTimeInterval(data, options.zone)
    } else if (isAllday(data)) {
      dateStr = getDateInterval(data)
      timeStr = getTimeInterval(data, options.zone)
    } else {
      // not same day and not fulltime. use interval with date and time, separate date and is confusing
      dateStr = startDate.formatInterval(endDate, formatString + ' LT')
    }

    // standard markup or object with strings
    if (options.output === 'strings') {
      return {
        dateStr,
        timeStr: timeStr || '',
        timeZoneStr,
        startDay: startDate.format('D'),
        startMonth: startDate.format('MMM')
      }
    }
    return $('<div class="date-time">').append(
      // date
      $('<span class="date">').text(dateStr),
      // mdash
      $.txt(' \u00A0 '),
      // time
      $('<span class="time">').append(
        timeStr ? $.txt(timeStr) : '',
        // Yep there are appointments without timezone. May not be all day appointments either
        data.startDate.tzid && !options.noTimezoneLabel ? addTimezonePopover($('<span class="label label-subtle ms-8 pointer" tabindex="0">').text(timeZoneStr), data, options.timeZoneLabel) : ''
      )
    )
  }
  return ''
}

export const getDateInterval = function (data, zone, a11y) {
  if (data && data.startDate && data.endDate) {
    let startDate; let endDate
    const formatString = a11y ? 'dddd, l' : 'ddd, l'

    a11y = a11y || false

    if (isAllday(data)) {
      startDate = moment.utc(data.startDate.value).local(true)
      endDate = moment.utc(data.endDate.value).local(true).subtract(1, 'days')
    } else {
      startDate = getMoment(data.startDate)
      endDate = getMoment(data.endDate)
      if (zone) {
        startDate.tz(zone)
        endDate.tz(zone)
      }
    }
    if (startDate.isSame(endDate, 'day')) {
      return startDate.format(formatString)
    }
    if (a11y && isAllday(data)) {
      // #. date intervals for screen readers
      // #. please keep the 'to' do not use dashes here because this text will be spoken by the screen readers
      // #. %1$s is the start date
      // #. %2$s is the end date
      // #, c-format
      return gt('%1$s to %2$s', startDate.format(formatString), endDate.format(formatString))
    }
    return startDate.formatInterval(endDate, 'yMEd', { alwaysFullDate: true })
  }
  return ''
}

export const getDateIntervalA11y = function (data, zone) {
  return getDateInterval(data, zone, true)
}

export const getTimeInterval = function (data, zone, a11y) {
  if (!data || !data.startDate || !data.endDate) return ''
  if (isAllday(data)) {
    return getFullTimeInterval(data, true)
  }
  const start = getMoment(data.startDate)
  const end = getMoment(data.endDate)
  if (zone) {
    start.tz(zone)
    end.tz(zone)
  }
  if (a11y) {
    // #. date intervals for screen readers
    // #. please keep the 'to' do not use dashes here because this text will be spoken by the screen readers
    // #. %1$s is the start date
    // #. %2$s is the end date
    // #, c-format
    return gt('%1$s to %2$s', start.format('LT'), end.format('LT'))
  }
  return start.formatInterval(end, 'time')
}

export const getTimeIntervalA11y = function (data, zone) {
  return getTimeInterval(data, zone, true)
}

export const getFullTimeInterval = function (data, smart) {
  const length = getDurationInDays(data)
  return length <= 1 && smart
    ? gt('All day')
    // #. General duration (nominative case): X days
    // #. %d is the number of days
    // #, c-format
    : gt.ngettext('%d day', '%d days', length, length)
}

export const getReminderOptions = function () {
  const options = {}
  const reminderListValues = [
    // value is ical duration format
    { value: 'PT0M', format: 'minutes' },
    { value: 'PT5M', format: 'minutes' },
    { value: 'PT10M', format: 'minutes' },
    { value: 'PT15M', format: 'minutes' },
    { value: 'PT30M', format: 'minutes' },
    { value: 'PT45M', format: 'minutes' },

    { value: 'PT1H', format: 'hours' },
    { value: 'PT2H', format: 'hours' },
    { value: 'PT4H', format: 'hours' },
    { value: 'PT6H', format: 'hours' },
    { value: 'PT8H', format: 'hours' },
    { value: 'PT12H', format: 'hours' },

    { value: 'P1D', format: 'days' },
    { value: 'P2D', format: 'days' },
    { value: 'P3D', format: 'days' },
    { value: 'P4D', format: 'days' },
    { value: 'P5D', format: 'days' },
    { value: 'P6D', format: 'days' },

    { value: 'P1W', format: 'weeks' },
    { value: 'P2W', format: 'weeks' },
    { value: 'P3W', format: 'weeks' },
    { value: 'P4W', format: 'weeks' }
  ]

  _(reminderListValues).each(function (item) {
    const i = item.value.match(/\d+/)[0]
    switch (item.format) {
      case 'minutes':
        options[item.value] = gt.ngettext('%1$d minute', '%1$d minutes', i, i)
        break
      case 'hours':
        options[item.value] = gt.ngettext('%1$d hour', '%1$d hours', i, i)
        break
      case 'days':
        options[item.value] = gt.ngettext('%1$d day', '%1$d days', i, i)
        break
      case 'weeks':
        options[item.value] = gt.ngettext('%1$d week', '%1$d weeks', i, i)
        break
      // no default
    }
  })

  return options
}

export const onSameDay = function (t1, t2) {
  return moment(t1).isSame(t2, 'day')
}

export const getDurationInDays = function (data) {
  return getMoment(data.endDate).diff(getMoment(data.startDate), 'days')
}

export const getStartAndEndTime = function (data) {
  const ret = []
  if (!data || !data.startDate || !data.endDate) return ret
  if (isAllday(data)) {
    ret.push(getFullTimeInterval(data, false))
  } else {
    // make sure to convert to current calendar timezone before displaying
    ret.push(moment.tz(data.startDate.value, data.startDate.tzid || moment().tz()).tz(moment().tz()).format('LT'), moment.tz(data.endDate.value, data.endDate.tzid || moment().tz()).tz(moment().tz()).format('LT'))
  }
  return ret
}

export const addTimezoneLabel = function (parent, data, options) {
  let current = moment(data.startDate)
  if (data.startDate.value) {
    current = getMoment(data[options.attrName || 'startDate'])
  }
  parent.append(
    $.txt(getTimeInterval(data)),
    addTimezonePopover($('<span class="label label-subtle ms-8 pointer" tabindex="0">').text(current.zoneAbbr()), data, options)
  )

  return parent
}

export const addTimezonePopover = (function () {
  function getContent (data) {
    // hard coded for demo purposes
    const div = $('<ul class="list-unstyled">')
    let list = settings.get('favoriteTimezones')

    if (!list || list.length === 0) {
      list = [
        'America/Los_Angeles',
        'America/New_York',
        'Europe/London',
        'Europe/Berlin',
        'Australia/Sydney'
      ]
    }

    _(list).chain().uniq().first(10).each(function (zone) {
      // get short name (with a few exceptions; see bug 41440)
      const name = /(North|East|South|West|Central)/.test(zone) ? zone : zone.replace(/^.*?\//, '')
      // must use outer DIV with "clear: both" here for proper layout in firefox
      div.append(
        $('<li>').append(
          $('<span>').text(name.replace(/_/g, ' ')),
          $('<span class="time">').text(getTimeInterval(data, zone))
        )
      )
    })

    return div
  }

  function getTitle (data) {
    return getTimeInterval(data, getMoment(data.startDate).tz()) + ' ' + getMoment(data.startDate).zoneAbbr()
  }

  function addA11ySupport (parent) {
    // a11y preparations such that the popover will be able to receive focus
    let preventClose = false
    parent.on('focusout blur', function (e) {
      if (!preventClose) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }).on('show.bs.popover', function () {
      parent.on('keydown.a11y', function (e) {
        if (e.which !== 9) return
        if (e.shiftKey) return

        const popover = $(`#${parent.attr('aria-describedby')}`)
        if (popover.length === 0) return

        // prevent default only if a popup is open
        e.preventDefault()
        preventClose = true
        popover.attr('tabindex', -1).focus()
        _.defer(function () { preventClose = false })

        popover.on('keydown.a11y', function tabOut (e) {
          if (e.which !== 9) return
          e.preventDefault()
          popover.off('keydown.a11y')
          if (e.shiftKey) {
            preventClose = true
            parent.focus()
            _.defer(function () { preventClose = false })
          } else {
            a11y.getNextTabbable(parent).focus()
            parent.popover('hide')
          }
        }).on('blur', function () {
          if (preventClose) return
          parent.popover('hide')
        })
      })
    }).on('hide.bs.popover', function (e) {
      $(e.target).off('keydown.a11y')
      preventClose = false
    })
  }

  return function (parent, data, opt) {
    opt = _.extend({
      placement: 'left',
      trigger: 'hover focus'
    }, opt)

    addA11ySupport(parent)

    parent.popover({
      container: opt.container || '#io-ox-core',
      viewport: {
        selector: '#io-ox-core',
        padding: 10
      },
      content: getContent.bind(null, data),
      html: true,
      placement (tip) {
        // add missing outer class
        $(tip).addClass('timezones')
        // get placement
        return opt.placement
      },
      title: getTitle.bind(null, data),
      trigger: opt.trigger
    }).on('blur dispose', function () {
      $(this).popover('hide')
      // set correct state or toggle doesn't work on next click
      $(this).data('bs.popover').inState.click = false
    })

    if (opt.closeOnScroll) {
      // add listener on popup shown. Otherwise we will not get the correct scroll parent at this point (if the popover container is not yet added to the dom)
      parent.on('shown.bs.popover', function () {
        parent.scrollParent().one('scroll', function () {
          parent.popover('hide')
          // set correct state or toggle doesn't work on next click
          parent.data('bs.popover').inState.click = false
        })
      })
    }

    return parent
  }
}())

export const getShownAsClass = function (data) {
  if (hasFlag(data, 'transparent')) return 'free'
  return 'reserved'
}

export const getStatusClass = function (model) {
  const data = model.attributes || model
  // currently only canceled status has an extra class
  return (data.status === 'CANCELLED' || hasFlag(data, 'event_cancelled')) ? 'cancelled' : ''
}

export const getShownAsLabel = function (data) {
  if (hasFlag(data, 'transparent')) return 'free'
  return 'label-info'
}

export const getShownAs = function (data) {
  // #. State of an appointment (reserved or free)
  if (hasFlag(data, 'transparent')) return gt('Free')
  return gt('Reserved')
}

export const getConfirmationSymbol = function (status) {
  return nConfirm[(_(status).isNumber() ? status : chronosStates.indexOf(status)) || 0]
}

export const getConfirmationClass = function (status) {
  return (_(status).isNumber() ? chronosStates[status] : status || 'NEEDS-ACTION').toLowerCase()
}

export const getConfirmationLabel = function (status) {
  return confirmTitles[(_(status).isNumber() ? status : chronosStates.indexOf(status)) || 0]
}

export const getRecurrenceDescription = function (data) {
  function getCountString (i) {
    return nCount[i + 1]
  }

  function getDayString (days, options) {
    options = _.extend({ superessive: false }, options)
    const firstDayOfWeek = moment.localeData().firstDayOfWeek()
    const tmp = [...Array(7)].map((_, index) => index)
      .filter(index => (days & (1 << ((index + firstDayOfWeek) % 7))) !== 0)
      .map((index) => options.superessive
        ? superessiveWeekdays[(index + firstDayOfWeek) % 7]
        : moment().weekday(index).format('dddd')
      )

    // recurrence string
    // used to concatenate two weekdays, like Monday and Tuesday
    // make sure that the leading and trailing spaces are also in the translation
    const and = gt(' and ')

    // This delimiter is used to concatenate a list of string
    // Example: Monday, Tuesday, Wednesday
    // make sure, that the trailing space is also in the translation
    const delimiter = gt(', ')

    return tmp.length === 2 ? tmp.join(and) : tmp.join(delimiter)
  }

  function getMonthString (i) {
    // month names
    return moment.months()[i]
  }

  function getWorkweekBitmask () {
    let bitmask = 0; let i
    for (i = 0; i < settings.get('numDaysWorkweek'); i++) bitmask += 1 << ((settings.get('workweekStart') + i) % 7)
    return bitmask
  }

  let str = ''
  const interval = data.interval
  const days = data.days || null
  const month = data.month
  const dayInMonth = data.day_in_month

  switch (data.recurrence_type) {
    // DAILY
    case 1:
      str = (interval === 1)
        ? gt.pgettext('daily', 'Every day.')
        // #. recurrence string
        // #. the case %1$d == 1 is handled separately and will not be used
        // #. %1$d: number of days per interval
        // #, c-format
        : gt.npgettext('daily', 'Every %1$d day.', 'Every %1$d days.', interval, interval)
      break

    // WEEKLY
    case 2:
      // special case: weekly but all 7 days checked
      if (days === 127) {
        str = (interval === 1)
          // #. recurrence string
          // #. special case, weekly but every day is checked
          ? gt.pgettext('daily', 'Every day.')
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: number of weeks per interval
          // #, c-format
          : gt.npgettext('weekly', 'Every %1$d week on all days.', 'Every %1$d weeks on all days.', interval, interval)
      } else if (days === getWorkweekBitmask()) { // special case: weekly on workdays
        str = (interval === 1)
          // #. recurrence string
          // #. special case: the weekly interval is 1 and all workdays are checked
          ? gt.pgettext('weekly', 'On workdays.')
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: number of weeks per interval
          // #, c-format
          : gt.npgettext('weekly', 'Every %1$d week on workdays.', 'Every %1$d weeks on workdays.', interval, interval)
      } else if (days === 65) {
        str = (interval === 1)
          // #. recurrence string
          // #. special case: the weekly interval is 1 and Sat and Sun are checked
          ? gt.pgettext('weekly', 'Every weekend.')
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: number of weeks per interval
          // #, c-format
          : gt.npgettext('weekly', 'Every %1$d week on weekends.', 'Every %1$d weeks on weekends.', interval, interval)
      } else {
        str = (interval === 1)
          // #. recurrence string
          // #. special case: the weekly interval is 1
          // #. %1$s: day string, e.g. "Friday" or "Monday, Tuesday, Wednesday"
          // #. day string will be in nominative form
          // #, c-format
          ? gt.pgettext('weekly', 'Every %1$s.', getDayString(days))
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: number of weeks per interval
          // #. %2$s: day string, e.g. "Friday" or "Monday, Tuesday, Wednesday"
          // #. day string will be in "superessive" form
          // #, c-format
          : gt.npgettext('weekly', 'Every %1$d week on %2$s.', 'Every %1$d weeks on %2$s.', interval, interval, getDayString(days, { superessive: true }))
      }

      break

    // MONTHLY
    case 3:
      if (days === null) {
        str = (interval === 1)
          // #. recurrence string
          // #. special case: the monthly interval is 1
          // #. %1$d: numeric, day in month
          // #. Example: Every month on day 18.
          // #, c-format
          ? gt.pgettext('monthly', 'Every month on day %1$d.', dayInMonth)
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: numeric, interval
          // #. %2$d: numeric, day in month
          // #. Example: Every 5 months on day 18.
          // #, c-format
          : gt.npgettext('monthly', 'Every %1$d month on day %2$d.', 'Every %1$d months on day %2$d.', interval, interval, dayInMonth)
      } else {
        str = (interval === 1)
          // #. recurrence string
          // #. special case: the monthly interval is 1
          // #. %1$s: count string, e.g. first, second, or last
          // #. %2$s: day string, e.g. Monday
          // #. Example Every month on the second Tuesday.
          // #, c-format
          ? gt.pgettext('monthly', 'Every month on the %1$s %2$s.', getCountString(dayInMonth), getDayString(days))
          // #. recurrence string
          // #. the case %1$d == 1 is handled separately and will not be used
          // #. %1$d: numeric, interval
          // #. %2$s: count string, e.g. first, second, or last
          // #. %3$s: day string, e.g. Monday
          // #. Example Every 3 months on the second Tuesday.
          // #, c-format
          : gt.npgettext('monthly', 'Every %1$d month on the %2$s %3$s.', 'Every %1$d months on the %2$s %3$s.', interval, interval, getCountString(dayInMonth), getDayString(days))
      }

      break

    // YEARLY
    case 4:
      if (days === null) {
        // #. recurrence string
        // #. %1$s: Month name, e.g. January
        // #. %2$d: Date, numeric, e.g. 29
        // #. Example: Every year in December on day 3
        str = gt('Every year in %1$s on day %2$d.', getMonthString(month), dayInMonth)
      } else {
        // #. recurrence string
        // #. %1$s: count string, e.g. first, second, or last
        // #. %2$s: day string, e.g. Monday
        // #. %3$s: month name, e.g. January
        // #. Example: Every year on the first Tuesday in December
        str = gt('Every year on the %1$s %2$s in %3$d.', getCountString(dayInMonth), getDayString(days), getMonthString(month))
      }

      break
    // no default
  }

  return str
}

export const getRecurrenceEnd = function (data) {
  let str
  if (data.until) {
    let lastOccurrence

    if (isAllday(data)) {
      lastOccurrence = moment(data.until)
    } else {
      const tzid = data.endDate.tzid || 'UTC'
      // this code part expects, that the date of the last occurrence is equal to the until date in the rrule.
      // whereas this is not required by the RFC, all checked clients stick to that
      // the until date is either directly on the end of the appointment or refers to the end of the same day
      const diffToStartOfDay = getMoment(data.endDate).diff(getMoment(data.endDate).startOf('day'), 'ms')
      lastOccurrence = moment.tz(data.until, tzid).startOf('day').add(diffToStartOfDay, 'ms').tz(moment().tz())
    }

    str = gt('The series ends on %1$s.', lastOccurrence.format('l'))
  } else if (data.occurrences) {
    const n = data.occurrences
    str = gt.ngettext('The series ends after %1$d occurrence.', 'The series ends after %1$d occurrences.', n, n)
  } else {
    str = gt('The series never ends.')
  }

  return str
}
// basically the same as in recurrence-view
// used to update recurrence information when moving events
export const updateRecurrenceDate = function (event, oldDate) {
  if (!event || !oldDate) return

  const rruleMapModel = event.getRruleMapModel()
  const type = rruleMapModel.get('recurrence_type')
  if (type === 0) return

  const date = event.getMoment('startDate')

  // if weekly, shift bits
  if (type === 2) {
    const newDay = moment(date).startOf('day')
    const oldDay = moment(oldDate).startOf('day')
    let shift = newDay.diff(oldDay, 'days') % 7
    let days = rruleMapModel.get('days')
    if (shift < 0) shift += 7
    for (let i = 0; i < shift; i++) {
      days = days << 1
      if (days > 127) days -= 127
    }
    rruleMapModel.set('days', days)
  }

  // if monthly or yearly, adjust date/day of week
  if (type === 3 || type === 4) {
    if (rruleMapModel.has('days')) {
      // repeat by weekday
      rruleMapModel.set({
        day_in_month: ((date.date() - 1) / 7 >> 0) + 1,
        days: 1 << date.day()
      })
    } else {
      // repeat by date
      rruleMapModel.set('day_in_month', date.date())
    }
  }

  // if yearly, adjust month
  if (type === 4) {
    rruleMapModel.set('month', date.month())
  }

  // change until
  if (rruleMapModel.get('until') && moment(rruleMapModel.get('until')).isBefore(date)) {
    rruleMapModel.set({
      until: undefined,
      occurrences: undefined
    })
  }
  rruleMapModel.serialize()
  return event
}

export const getAttendeeName = function (data) {
  return data?.cn || data?.email || data?.uri || ''
}

export function getNote (data, prop = 'description') {
  // calendar: description, tasks: note
  return (data[prop] || (data.get ? data.get(prop) : '')).trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/</g, '&lt;')
    // links
    .replace(/[\s\S]*/, match => util.urlify(match))
    // phone numbers
    .replace(/[\s\S]*/, match => util.parsePhoneNumbers(match))
    // use br to keep line breaks when pasting (see 38714)
    .replace(/\n/g, '<br>')
}

export const getConfirmations = function (data) {
  const hash = {}
  if (data) {
    // internal users
    _(data.users).each(function (obj) {
      hash[String(obj.id)] = {
        status: obj.confirmation || 0
      }
      // only add confirm message if there is one
      if (obj.confirmmessage) {
        hash[String(obj.id)].comment = obj.confirmmessage
      }
    })
    // external users
    _(data.confirmations).each(function (obj) {
      hash[obj.mail] = {
        status: obj.status || 0
      }
      // only add confirm message if there is one
      if (obj.message || obj.confirmmessage) {
        hash[String(obj.id)].comment = obj.message || obj.confirmmessage
      }
    })
  }
  return hash
}

export const getConfirmationStatus = function (model, defaultStatus) {
  let flags = model instanceof Backbone.Model ? model.get('flags') : model.flags
  if (!flags) return false

  if (_.isArray(flags)) flags = _.object(flags, flags)

  if (flags.accepted) return 'ACCEPTED'
  if (flags.tentative) return 'TENTATIVE'
  if (flags.declined) return 'DECLINED'
  if (flags.needs_action) return 'NEEDS-ACTION'
  if (flags.event_accepted) return 'ACCEPTED'
  if (flags.event_tentative) return 'TENTATIVE'
  if (flags.event_declined) return 'DECLINED'
  return defaultStatus || 'NEEDS-ACTION'
}

export const getConfirmationMessage = function (obj, id) {
  let user = _(obj.attendees).findWhere({
    entity: id || ox.user_id
  })
  // try extendedParameter (federated sharing)
  if (id && !user) {
    user = _(obj.attendees).find(function (attendee) {
      return attendee.extendedParameters && attendee.extendedParameters['X-OX-IDENTIFIER'] === id
    })
  }
  if (!user) return
  return user.comment
}

// should be addressed by OXUI-1128
export const getConfirmationSummary = function (conf) {
  const ret = { count: 0 }
  // init
  _.each(chronosStates, function (cls, i) {
    ret[i] = {
      icon: nConfirm[i] || 'bi/exclamation-circle.svg',
      count: 0,
      css: cls.toLowerCase(),
      title: confirmTitles[i] || '',
      partStat: cls
    }
  })

  _.each(conf, function (c) {
    // tasks
    if (_.isNumber(c.status)) {
      ret[c.status].count++
      ret.count++
      // don't count groups or resources, ignore unknown states (the spec allows custom partstats)
    } else if (ret[chronosStates.indexOf((c.partStat || 'NEEDS-ACTION').toUpperCase())] && (c.cuType === 'INDIVIDUAL' || !c.cuType)) {
      ret[chronosStates.indexOf((c.partStat || 'NEEDS-ACTION').toUpperCase())].count++
      ret.count++
    }
  })
  return ret
}

export const getWeekScaffold = function (timestamp) {
  const day = moment(timestamp).startOf('week')
  let obj
  const ret = { days: [] }
  for (let i = 0; i < 7; i++) {
    ret.days.push(obj = {
      year: day.year(),
      month: day.month(),
      date: day.date(),
      day: day.day(),
      timestamp: +day,
      isToday: moment().isSame(day, 'day'),
      col: i % 7
    })
    // is weekend?
    obj.isWeekend = obj.day === 0 || obj.day === 6
    obj.isFirst = obj.date === 1
    if (obj.isFirst) {
      ret.hasFirst = true
    }
    day.add(1, 'days')

    obj.isLast = day.date() === 1
    if (obj.isLast) {
      ret.hasLast = true
    }
  }
  return ret
}

// returns array of {mail, displayName} objects + additional fields depending on type
// contacts have additional fields: first_name, last_name
// internal users have additional fields: first_name, last_name, type 1, id
// resolves groups, eliminates duplicates, uses provided mail address of attendee, filters out resources
export const resolveAttendees = async function (data, options) {
  options = options || {}
  // clone array
  const attendees = data.attendees.slice()
  const users = []
  const groups = []
  const result = []

  const organizerIsExternalParticipant = data.organizer && !data.organizer.entity && _.isString(data.organizer.email) && attendees.find((p) => {
    return p.mail === data.organizer.email
  })

  // add organizer if not already part of attendees and not external
  if (data.organizer && !organizerIsExternalParticipant && !(data.organizer.entity && _(_(attendees).pluck('entity')).contains(data.organizer.entity))) {
    attendees.unshift(data.organizer)
  }

  attendees.forEach(attendee => {
    switch (attendee.cuType) {
      case undefined:
      case 'INDIVIDUAL': {
        if (!attendee.email) return
        const data = {
          display_name: attendee.cn,
          mail: attendee.email
        }

        // internal user
        if (attendee.entity) {
          if (options.filterSelf && attendee.entity === ox.user_id) return
          users.push(attendee.entity)
          data.type = 1
          data.id = attendee.entity
        }

        if (attendee.contact) {
          data.first_name = attendee.contact.first_name
          data.last_name = attendee.contact.last_name
        }

        result.push(data)
        break
      }
      // group
      case 'GROUP':
        // group expects array of object [{ id: 1337 }], yay (see bug 47207)
        groups.push({ id: attendee.entity })
        break
      // resource or resource group
      case 'RESOURCE':
        // ignore resources
        break
      // no default
    }
  })

  if (!groups.length) return result

  return groupAPI.getList(groups)
    // resolve groups
    .then(function (groups) {
      let members = []
      _.each(groups, function (single) {
        members = _.union(single.members, members)
      })
      members = _(members).difference(users)
      if (!members.length) return result
      return userAPI.getList(members)
    })
    .then(function (users) {
      return result.concat(_(_(users).map(function (user) {
        return {
          display_name: user.display_name,
          first_name: user.first_name,
          last_name: user.last_name,
          type: 1,
          mail: user.email1 || user.email2 || user.email3,
          id: user.id
        }
      })).filter(function (user) {
        // don't add if mail address is missing (yep, edge-case)
        return !!user.mail
      }))
    })
}

export const getUserIdByInternalId = function (internal) {
  return contactsAPI.get({ id: internal, folder: 6 }).then(function (data) {
    return data.user_id
  })
}

export function hasOrganizerRights (model) {
  return model.hasFlag('organizer') || model.hasFlag('organizer_on_behalf')
}

export const getAppointmentColor = function (folder, eventModel) {
  const folderColor = getFolderColor(folder)
  let eventColor = eventModel.get('color')
  let categoryColor = null

  if (coreSettings.get('features/categories', false) && settings.get('categoryColorAppointments', true)) {
    const category = getCategoriesFromModel(eventModel.get('categories'), 'appointment' + eventModel.get('id')).first()
    categoryColor = category?.get('color') && category.get('color') !== 'transparent' ? category.get('color') : null
  }
  const defaultStatus = folderAPI.is('public', folder) || folderAPI.is('private', folder) ? 'ACCEPTED' : 'NEEDS-ACTION'
  const conf = getConfirmationStatus(eventModel, defaultStatus)

  if (_.isNumber(eventColor)) eventColor = colors[eventColor - 1].value

  // appointments in resource calendars should always get the folder color
  if (!hasOrganizerRights(eventModel) && eventModel.isResource()) return folderColor
  // shared appointments which are needs-action or declined don't receive color classes
  if (getConfirmationClass(conf) === 'declined') return ''
  // appointments which have cancelled status does not receive color classes
  if (/^(cancelled)$/.test(getStatusClass(eventModel))) return ''

  if (!hasOrganizerRights(eventModel)) return categoryColor ? sanitizeHue(categoryColor) : folderColor

  // set color of appointment. if color is 0, then use color of folder
  // and eventually sanitize color
  return sanitizeHue(categoryColor || eventColor || folderColor)
}

export const deriveAppointmentColors = function (color) {
  const isDark = $('html').hasClass('dark')
  const background = getBackgroundColor(color, isDark)
  const foreground = isDark ? color : getForegroundColor(background)
  const border = getBorderColor(color)
  const name = getColorName(color)
  return { background, border, foreground, name }
}

export const sanitizeHue = _.memoize(function (color) {
  const [hue, sat, lum] = colorToHSL(color)
  // keep gray tones
  if (sat < 5) return `hsl(0, 0%, ${lum}%)`
  // red
  if (hue > 320) return colorsHEX.red
  if (hue > 260) return colorsHEX.purple
  if (hue > 180) return colorsHEX.blue
  if (hue > 69) return colorsHEX.green
  if (hue > 45) return colorsHEX.yellow
  if (hue > 15) return sat > 70 ? colorsHEX.orange : colorsHEX.brown
  return colorsHEX.red
})

export const lightenDarkenColor = _.memoize(function (color, amt) {
  let [h, s, l] = colorToHSL(color)
  l = Math.floor(l * amt)
  l = Math.max(Math.min(100, l), 0)
  return `hsl(${h}, ${s}%, ${l}%)`
}, hashFunction)

export const colorToRGBUnusedDueToBugInLib = function (color) {
  const [r, g, b, a] = rgba(color)
  // special case: transparent. We assume a white background
  return a === 0 ? [255, 255, 255] : [r >> 0, g >> 0, b >> 0]
}

// returns color ensuring a color contrast higher than 1:4.5
// based on algorithm as defined by https://www.w3.org/TR/WCAG20-TECHS/G18.html#G18-tests
export const getForegroundColor = _.memoize(function (color, contrast = 4.8, saturation = 30) {
  function colorContrast (foreground) {
    const l2 = getRelativeLuminance(colorToRGB(foreground))
    return (l1 + 0.05) / (l2 + 0.05)
  }

  const l1 = getRelativeLuminance(colorToRGB(color))
  const hsl = colorToHSL(color)
  const hue = hsl[0]
  const sat = hsl[1] > 0 ? saturation : 0
  let lum = 100
  let foreground

  if (l1 < 0.18333) return 'white'

  // start with 50% luminance; then go down until color contrast exceeds 5 (little higher than 4.5)
  // whoever finds a simple way to calculate this programmatically
  // (and which is still correct in all cases) gets a beer or two
  do {
    foreground = 'hsl(' + hue + ', ' + sat + '%, ' + lum + '%)'
    lum -= 2
  } while (lum >= 0 && colorContrast(foreground) < contrast)

  return foreground
}, hashFunction)

export const getHighContrastForeground = _.memoize(function (color) {
  const l1 = getRelativeLuminance(colorToRGB(color))
  return l1 < 0.18333 ? 'white' : 'black'
})

export const getBackgroundColor = _.memoize(function (foreground, isDark = false) {
  const hsl = colorToHSL(foreground)
  const hue = hsl[0]
  const sat = hsl[1]
  return `hsl(${hue}, ${Math.max(0, sat)}%, ${isDark ? 12 : 90}%)`
}, hashFunction)

export const getBorderColor = function (foreground) {
  return foreground
}

export const canAppointmentChangeColor = function (folder, eventModel) {
  const eventColor = eventModel.get('color')
  const defaultStatus = folderAPI.is('public', folder) || folderAPI.is('private', folder) ? 'ACCEPTED' : 'NEEDS-ACTION'
  const conf = getConfirmationStatus(eventModel, defaultStatus)

  // appointments in resource calendars should receive color classes
  if (!hasOrganizerRights(eventModel) && eventModel.isResource()) return true
  // shared appointments which are needs-action or declined don't receive color classes
  if (getConfirmationClass(conf) === 'declined') return false
  // appointments which have cancelled status does not receive color classes
  if (/^(cancelled)$/.test(getStatusClass(eventModel))) return false

  if (!eventModel.hasFlag('organizer')) return true

  return !eventColor
}

export const getDefaultFolderColor = function () {
  return settings.get('defaultFolderColor', colorsHEX.blue)
}

export const getFolderColor = function (folder) {
  const defaultColor = getDefaultFolderColor()
  // should work with models and plain objects
  const extendedProperties = (folder.get ? folder.get('com.openexchange.calendar.extendedProperties') : folder['com.openexchange.calendar.extendedProperties']) || {}
  let color = extendedProperties.color ? (extendedProperties.color.value || defaultColor) : defaultColor
  // fallback if color is an index (might still occur due to defaultFolderColor)
  if (_.isNumber(color)) color = colors[color - 1].value
  return color
}

export const getColorName = function (color) {
  if (!color) return gt('None')
  const colorObj = _.findWhere(colors, { value: color })
  if (colorObj) return colorObj.label
  return gt('Unknown')
}

export const getDeepLink = function (data) {
  return [
    ox.abs,
    ox.root,
    '/#app=io.ox/calendar&id=',
    cid(data)
  ].join('')
}

/**
 *
 * @param {string} id | id or composite id of an appointment (e.g. '2380' or 'cal://0/181.669.Europe/Berlin:20230119T160000')
 */
export function openDeeplink (id) {
  ox.launch(() => import('@/io.ox/calendar/main')).then(app => {
    // if app is resumed, perspective is already set
    if (app.perspective) {
      app.perspective.followDeepLink(id)
    } else {
      app.getWindow().one('change:perspective', () => {
        app.perspective.followDeepLink(id)
      })
    }
  })
}

export const showRecurrenceDialog = async function (model, options) {
  const [{ default: calendarAPI }, { default: CalendarModel }] = await Promise.all([import('@/io.ox/calendar/api'), import('@/io.ox/calendar/model')])
  if (!(model instanceof Backbone.Model)) model = new CalendarModel.Model(model)

  if (!model.get('recurrenceId')) return { action: 'appointment' }

  let rootModel
  try {
    rootModel = await calendarAPI.get({ id: model.get('seriesId'), folder: model.get('folder') }, false)
  } catch (e) {
    // in some rare cases we have series exceptions without a series root (don't ask me how someone achieves this). We only edit this single appointment then
    return { action: 'appointment' }
  }

  options = options || {}
  let text
  const teaser = gt('This appointment is part of a series.')
  const dialog = new ModalDialog({
    width: 620
  }).addCancelButton({ left: true })
  if (!options.dontAllowExceptions) dialog.addButton({ label: gt('Edit this appointment'), action: 'appointment', className: 'btn-default' })

  if (model.hasFlag('first_occurrence')) {
    if (options.dontAllowExceptions) return { action: 'series', rootModel }
    text = gt('Do you want to edit the whole series or just this appointment within the series?')
    dialog.addButton({ label: gt('Edit series'), action: 'series' })
  } else if (model.hasFlag('last_occurrence') && !options.allowEditOnLastOccurrence) {
    return { action: 'appointment' }
  } else if (options.dontAllowExceptions) {
    text = gt('Do you want to edit this and all future appointments or the whole series?')
    dialog.addButton({ label: gt('Edit series'), action: 'series', className: 'btn-default' })
    dialog.addButton({ label: gt('Edit all future appointments'), action: 'thisandfuture' })
  } else {
    text = gt('Do you want to edit this and all future appointments or just this appointment within the series?')
    dialog.addButton({ label: gt('Edit all future appointments'), action: 'thisandfuture' })
  }
  dialog.build(function () {
    this.$title.text(gt('Edit appointment'))
    this.$body.append(teaser, '\u00a0', text)
  }).open()

  const value = await new Promise(resolve => dialog.on('action', resolve))
  return { action: value, rootModel }
}

export const isPrivate = function (data, strict) {
  return hasFlag(data, 'private') || (!strict && hasFlag(data, 'confidential'))
}

export const hasParticipationStatus = function (model) {
  const flags = model?.get('flags') || []
  return flags.indexOf('organizer') > -1 || flags.indexOf('attendee') > -1
}

export const returnIconsByType = function (obj) {
  const icons = { type: [], property: [] }

  if (isImplicitlyCanceled(obj)) {
    const { icon, text } = getImplicitCancelElements()
    icons.type.push(createFlag('implicit-cancel-flag', icon, text))
  }
  if (hasFlag(obj, 'declined')) {
    icons.type.push(createFlag('declined-flag', 'bi/x-circle.svg', gt('Appointment is declined')))
  }
  if (hasFlag(obj, 'tentative')) {
    icons.type.push(createFlag('tentative-flag', 'bi/question-circle.svg', gt('Tentative')))
  }
  if (hasFlag(obj, 'private')) {
    icons.type.push(createFlag('private-flag', 'bi/person-circle.svg', gt('Appointment is private')))
  }
  if (hasFlag(obj, 'confidential')) {
    icons.type.push(createFlag('confidential-flag', 'bi/eye-slash.svg', gt('Appointment is confidential')))
  }
  if (hasFlag(obj, 'series') || hasFlag(obj, 'overridden')) {
    icons.property.push(createFlag('recurrence-flag', 'bi/arrow-clockwise.svg', gt('Appointment is part of a series')))
  }
  if (hasFlag(obj, 'scheduled') && !obj.isResource()) {
    icons.property.push(createFlag('participants-flag', 'bi/person.svg', gt('Appointment has participants')))
  }
  if (hasFlag(obj, 'attachments')) {
    icons.property.push(createFlag('attachments-flag', 'bi/paperclip.svg', gt('Appointment has attachments')))
  }
  if (obj.isResource()) {
    icons.property.push(createFlag('resource-flag', 'bi/gear-fill.svg', gt('Appointment has resources')))
  }

  function createFlag (className, icon, title) {
    return $('<span>').addClass(className).attr('aria-label', title)
      .append(createIcon(icon).addClass('sm').attr('title', title))
  }

  return icons
}

export const getCurrentRangeOptions = function () {
  const app = apps.get('io.ox/calendar')
  if (!app) return {}
  const perspective = app.perspective
  if (!perspective) return {}

  let rangeStart; let rangeEnd; const model = perspective.model
  switch (perspective.getName()) {
    case 'week':
      rangeStart = moment(model.get('startDate')).utc()
      rangeEnd = moment(model.get('startDate')).utc().add(model.get('numColumns'), 'days')
      break
    case 'month':
      rangeStart = moment(model.get('startDate')).utc()
      rangeEnd = moment(model.get('endDate')).utc()
      break
    case 'list':
      // search view has different ranges. use ?. operator to not run into any issues here
      if (app?.listView?.loader?.mode === 'search' && app.listView?.model?.get('criteria')?.after && app.listView?.model?.get('criteria')?.before) {
        rangeStart = moment(app.listView.model.get('criteria').after)
        rangeEnd = moment(app.listView.model.get('criteria').before)
        break
      }
      rangeStart = moment().startOf('day').utc()
      rangeEnd = moment().startOf('day').add((app.listView.loader.collection.range || 1), 'month').utc()
      break
    default:
  }

  if (!rangeStart || !rangeEnd) return {}
  return {
    expand: true,
    rangeStart: rangeStart.format(ZULU_FORMAT),
    rangeEnd: rangeEnd.format(ZULU_FORMAT)
  }
}

export const rangeFilter = function (start, end) {
  return function (obj) {
    const tsStart = getMoment(obj.startDate)
    const tsEnd = getMoment(obj.endDate)
    if (tsEnd < start) return false
    if (tsStart > end) return false
    return true
  }
}

export const cid = function (o) {
  if (_.isObject(o)) {
    if (o.attributes) o = o.attributes
    let cid = o.folder + '.' + o.id
    if (o.recurrenceId) cid += '.' + o.recurrenceId
    return cid
  } else if (_.isString(o)) {
    const s = o.split('.')
    const r = { folder: s[0], id: s[1] }
    if (s.length === 3) r.recurrenceId = s[2]
    return r
  }
}

// creates an attendee object from a user object or model and contact model or object
// distribution lists create an array of attendees representing the members of the distribution list
// used to create default participants and used by addparticipantsview
// options can contain attendee object fields that should be prefilled (usually partStat: 'ACCEPTED')
export const createAttendee = function (user, options) {
  if (!user) return
  // make it work for models and objects
  user = user instanceof Backbone.Model ? user.attributes : user

  // distribution lists are split into members
  if (user.mark_as_distributionlist) {
    return _(user.distribution_list).map(createAttendee)
  }
  options = options || {}
  const attendee = {
    cuType: attendeeLookupArray[user.type] || 'INDIVIDUAL',
    cn: user.display_name || user.cn,
    partStat: 'NEEDS-ACTION',
    role: 'REQ-PARTICIPANT'
  }

  if (attendee.cuType !== 'RESOURCE') {
    // guests have a user id but are still considered external, so don't add an entity here (normal users have guest_created_by === 0)
    if (!user.guest_created_by && (user.user_id !== undefined || user.contact_id) && user.type !== 5) {
      attendee.entity = user.user_id || user.id
    } else if (user.entity) attendee.entity = user.entity
    attendee.email = user.field && user[user.field] ? user[user.field] : (user.email1 || user.mail || user.email)
    if (!attendee.cn) attendee.cn = attendee.email
    attendee.uri = 'mailto:' + attendee.email
  } else {
    // default is accepted
    attendee.partStat = resourcePermissionPartStat[user.own_privilege] || 'ACCEPTED'
    attendee.entity = user.id
    attendee.resource = user
    if (user.mailaddress) {
      attendee.email = user.mailaddress
      attendee.uri = 'mailto:' + user.mailaddress
    }
  }

  if (attendee.cuType === 'GROUP') {
    attendee.entity = user.id
    // not really needed. Added just for convenience. Helps if group should be resolved
    attendee.members = user.members
  }
  // not really needed. Added just for convenience. Helps if distribution list should be created
  if (attendee.cuType === 'INDIVIDUAL' || !attendee.cuType) {
    if (user.contact) {
      attendee.contact = {
        display_name: user.cn || user.display_name,
        first_name: user.contact.first_name,
        last_name: user.contact.last_name
      }
    } else {
      attendee.contact = {
        display_name: user.display_name,
        first_name: user.first_name,
        last_name: user.last_name
      }
    }
  }
  // override with predefined values if given
  return _.extend(attendee, options)
}

// all day appointments have no timezone and the start and end dates are in date format not date-time
// checking the start date is sufficient as the end date must be of the same type, according to the spec
export const isAllday = function (app) {
  if (!app) return false
  app = app instanceof Backbone.Model ? app.attributes : app
  const time = app.startDate
  // there is no time value for all day appointments
  return isLocal(app) && (time.value.indexOf('T') === -1)
}

// appointments may be in local time. This means they do not move when the timezone changes. Do not confuse this with UTC time
export const isLocal = function (app) {
  if (!app) return false
  const time = app instanceof Backbone.Model ? app.get('startDate') : app.startDate
  return time && time.value && !time.tzid
}

export const getMoment = function (date) {
  if (_.isObject(date)) return moment.tz(date.value, date.tzid || moment().tz())
  return moment(date)
}

export const getMomentInLocalTimezone = function (date) {
  return getMoment(date).tz(moment().tz())
}

// get the right default alarm for an event
// note: the default alarm for the birthday calendar is not considered here. There is no use case since you cannot edit those events atm.
export const getDefaultAlarms = function (event) {
  // no event or not fulltime (isAllday returns false for no event)
  if (!isAllday(event)) {
    return settings.get('chronos/defaultAlarmDateTime', [])
  }
  return settings.get('chronos/defaultAlarmDate', [])
}

// checks if the user is allowed to edit an event
// data is plain object, folder is folderModel (e.g. via app.folder.getModel())
export const allowedToEdit = function (data, folder) {
  if (!data || !folder) return false
  if (!data.id || !data.folder) return false

  // organizer is allowed to edit
  if (hasFlag(data, 'organizer') || hasFlag(data, 'organizer_on_behalf')) return true
  // if user is neither organizer nor attendee editing is only based on folder permissions, so just return true and let the collection modify etc check handle this.
  if (!hasFlag(data, 'attendee') && !hasFlag(data, 'attendee_on_behalf')) return true
  // if user is attendee, check if modify privileges are granted
  if ((hasFlag(data, 'attendee') || hasFlag(data, 'attendee_on_behalf')) && data.attendeePrivileges === 'MODIFY') return true

  const restrictChanges = settings.get('chronos/restrictAllowedAttendeeChanges', true)
  const restrictChangesPublic = settings.get('chronos/restrictAllowedAttendeeChangesPublic', true)

  // if both settings are the same, we don't need a folder check
  // all attendees are allowed to edit or not, no matter which folder the event is in
  if (restrictChanges === restrictChangesPublic) return !restrictChanges

  return folder.is('public') ? !restrictChangesPublic : !restrictChanges
}

export const hasFlag = function (data, flag) {
  // support for arrays (used in multiple selection). returns true if all items in the array have the flag
  if (_.isArray(data) && data.length > 0) return _(data).reduce(function (oldVal, item) { return oldVal && hasFlag(item, flag) }, true)
  if (data instanceof Backbone.Model) return data.hasFlag(flag)
  if (!data.flags || !data.flags.length) return false
  return data.flags.indexOf(flag) >= 0
}

// DEPRECATED: Typo in function name. See OXUIB-2542
export function isImplicitlyCancelled (model) {
  if (ox.debug) console.warn('`isImplicitlyCancelled` is deprecated, pending removed with 8.20. Please use `isImplicitlyCanceled` instead.')
  return isImplicitlyCanceled(model)
}
// returns true if
// - the appointment is not yet ended (i.e. upcoming or running)
// - the appointment is reserved (not free/transparent)
// - the appointment has more than one attendee (not considering resources)
// - all (human) attendees except the current user have declined
export function isImplicitlyCanceled (model) {
  if (!model) return false
  if (!hasFeature('implicitCancel')) return false
  if (model.hasFlag('transparent')) return false
  if (model.hasFlag('needs_action')) return false
  // user declined anyhow
  if (model.hasFlag('declined')) return false
  // don't check/show for past appointments
  const end = model.get('endDate')
  const isOver = moment.tz(end.value, end.tzid).valueOf() < moment().valueOf()
  if (isOver) return false
  // all others declined?
  return model.hasFlag('all_others_declined')
}

export function getImplicitCancelElements () {
  return {
    icon: 'bi/exclamation-circle-fill.svg',
    text: gt('This appointment might not take place because all other attendees declined')
  }
}

// creates data for the edit dialog when an exception should be used to update the series
export const createUpdateData = function (root, exception) {
  // consolidate data
  root = root instanceof Backbone.Model ? root.attributes : root
  exception = exception instanceof Backbone.Model ? exception.attributes : exception

  // deep copy
  const result = JSON.parse(JSON.stringify(root))
  // we have 4 possible formats for the recurrence id : Zulu, Date, dateTime, Timezone:localtime, see https://jira.open-xchange.com/browse/SCR-584
  const recurrenceId = _(exception.recurrenceId.split(':')).last()

  result.recurrenceId = exception.recurrenceId

  // recreate dates
  result.startDate.value = isAllday(root) ? moment(exception.recurrenceId).format('YYYYMMDD') : moment(recurrenceId).tz(root.startDate.tzid || moment().tz()).format('YYYYMMDD[T]HHmmss')
  // calculate duration and add it to startDate, then format
  result.endDate.value = isAllday(root)
    ? moment(moment(result.startDate.value).valueOf() + moment(root.endDate.value).valueOf() - moment(root.startDate.value).valueOf()).format('YYYYMMDD')
    : moment.tz(moment(result.startDate.value).valueOf() + moment(root.endDate.value).valueOf() - moment(root.startDate.value).valueOf(), result.startDate.tzid || moment().tz()).format('YYYYMMDD[T]HHmmss')

  return result
}
// cleans attendee confirmations and comments, used when data from existing appointments should be used to create a new one (invite, follow up)
export const cleanupAttendees = function (attendees, additionalAttr = []) {
  // clean up attendees (remove confirmation status comments etc)
  return _(attendees).map(function (attendee) {
    const attr = ['cn', 'cuType', 'email', 'uri', 'entity', 'contact', 'resource'].concat(additionalAttr)
    const temp = _(attendee).pick(attr)
    // resources are always set to accepted
    if (temp.cuType === 'RESOURCE') {
      temp.partStat = 'ACCEPTED'
      if (attendee.comment) temp.comment = attendee.comment
    } else {
      temp.partStat = 'NEEDS-ACTION'
    }
    return temp
  })
}

export const confirmWithConflictCheck = async function (requestData, options) {
  options = options || {}

  const [{ default: calendarAPI }, { default: conflictView }] = await Promise.all([import('@/io.ox/calendar/api'), import('@/io.ox/calendar/conflicts/conflictList')])
  return calendarAPI.confirm(requestData, options).then(data => {
    if (data && data.conflicts) {
      return new Promise(function (resolve, reject) {
        conflictView.dialog(data.conflicts)
          .on('cancel', function () {
            reject(new Error())
          })
          .on('ignore', function () {
            options.checkConflicts = false
            resolve(confirmWithConflictCheck(requestData, options))
          })
      })
    }
    return data
  }, (error) => { throw new Error(error?.error) })
}

export const getRow = function () {
  const $icon = $('<div class="detail-row-icon">')
  const $content = $('<div class="detail-row-content">')
  return { $row: $('<div class="detail-row">').append($icon, $content), $icon, $content }
}

function hashFunction () {
  return _.toArray(arguments).join(',')
}

export async function hasSeriesPropagation (appointment = {}) {
  // no data -> no propagation
  if (!appointment.id || !appointment.folder || !appointment.recurrenceId) return false
  const { default: calendarAPI } = await import('@/io.ox/calendar/api')
  try {
    const recurrenceData = await calendarAPI.getRecurrence(appointment)
    // mw api to old -> return true to offer all options (keep same behavior as before OXUI-1090)
    if (recurrenceData.unsupportedMW) return true
    // rescheduled -> no propagation
    if (recurrenceData.rescheduled) return false
    // not overridden -> propagation
    if (!recurrenceData.overridden) return true
    // this is an orphaned series, see MW-1134. Series is just used to keep track by MW (usually caused if user is invited to an series exception from an external calendar via mail)
    if (!recurrenceData.masterEvent) return false
    // not rescheduled but overridden -> if participation status matches there is series propagation
    return getConfirmationStatus(recurrenceData.masterEvent, 'none') === getConfirmationStatus(recurrenceData.recurrenceEvent, 'none')
  } catch (e) {
    // error when requesting recurrence information. Be robust but don't offer series propagation
    return false
  }
}

export function getResourcePermission (event, resourceId) {
  const attendees = event.get ? event.get('attendees') : event.attendees
  if (!attendees) return false
  return _(attendees).findWhere({ cuType: 'RESOURCE', entity: resourceId })?.resource?.own_privilege
}
