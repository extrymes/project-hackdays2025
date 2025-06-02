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
import { device } from '@/browser'
import ox from '@/ox'
import moment from '@open-xchange/moment'

import capabilities from '@/io.ox/core/capabilities'
import sanitizer from '@/io.ox/mail/sanitizer'
import { createIcon } from '@/io.ox/core/components'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

// global handler for cross-app links
$(document).on('click', '.ox-internal-mail-link', function (e) {
  e.preventDefault()
  const cid = decodeURIComponent($(this).attr('data-cid').replace(/:/g, '.'))
  ox.launch(() => import('@/io.ox/mail/detail/main'), { cid })
})

const hours = [
  // this morning
  8,
  // by noon
  12,
  // this afternoon
  15,
  // tonight
  18,
  // late in the evening
  22
]

export const computePopupTime = function (value, { daysOnly = false } = {}) {
  // no need for milliseconds or seconds, minutes are accurate enough
  const alarmDate = moment().milliseconds(0).seconds(0)

  if (!isNaN(parseInt(value, 10))) {
    // in x minutes
    alarmDate.add(parseInt(value, 10), 'minutes')
  } else {
    alarmDate.startOf('hour')
    if (value.indexOf('d') === 0) {
      // this morning, by noon etc
      alarmDate.hours(hours[parseInt(value.charAt(1), 10)])
    } else {
      alarmDate.hours(daysOnly ? 0 : 8)
      if (value === 't') {
        // tomorrow
        alarmDate.add(1, 'day')
      } else if (value.indexOf('ww') === 0) {
        // in n week(s)
        const week = parseInt(value.charAt(2))
        alarmDate.isoWeekday(1).add(week, 'weeks')
      } else if (value.indexOf('w') === 0) {
        // next sunday - saturday
        alarmDate.isoWeekday(parseInt(value.charAt(1), 10))
        // day selects the weekday of the current week, this might be in the past, for example selecting sunday on a wednesday
        if (alarmDate.valueOf() < Date.now()) alarmDate.add(1, 'week')
      }
    }
  }

  // set endDate
  const endDate = alarmDate.clone()
  // end Date does not have a time
  endDate.startOf('day')

  return {
    // UTC
    endDate: endDate.utc(true).valueOf(),
    alarmDate: alarmDate.utc().valueOf()
  }
}

// builds dropdownmenu nodes, if o.bootstrapDropdown is set listnodes are created else option nodes
export const buildDropdownMenu = function (o) {
  o = o || {}
  // get the values
  const options = buildOptionArray(o)
  const result = []

  // put the values in nodes
  _(options).each(function (obj) {
    const [value, label] = obj
    const data = { 'data-name': 'change-due-date', 'data-value': label.toLowerCase() }
    result.push(
      o.bootstrapDropdown
        ? $('<li>').append(
          $('<a href="#" role="menuitem">').attr(data).val(value)
            .append(() => {
              const index = label.indexOf('(')
              return index > -1 ? [$.txt(label.substr(0, index)), $('<span class="text-gray font-light ms-4">').text(label.substr(index))] : $.txt(label)
            })
        )
        : $('<option>').val(value).text(label)
    )
  })

  return result
}

const soon = [
  [5, gt('In %1$d minutes', 5)],
  [15, gt('In %1$d minutes', 15)],
  [30, gt('In %1$d minutes', 30)],
  [60, gt('In one hour')]
]

export function buildReminderOptionGroups () {
  const result = []
  const now = moment()
  let $optgroup

  // Very soon / in minutes
  $optgroup = $('<optgroup>').attr('label', gt('Shortly'))
  soon.forEach(([minutes, label]) => {
    $optgroup.append(createOption(now.clone().add(minutes, 'minutes'), label))
  })
  result.push($optgroup)

  // Today
  if (now.hours() < 22) {
    $optgroup = $('<optgroup>').attr('label', gt('Later today'))
    if (now.hours() < 18) $optgroup.append(createOption(now.clone().hours(18).startOf('hour'), gt('This evening'), 'LT'))
    $optgroup.append(createOption(now.clone().hours(22).startOf('hour'), gt('Late in the evening'), 'LT'))
    result.push($optgroup)
  }

  // Next days
  $optgroup = $('<optgroup>').attr('label', gt('In the next few days'))
  $optgroup.append(createOption(now.clone().add(1, 'day').hour(8).startOf('hour'), gt('Tomorrow'), 'LT').prop('selected', true))
  if (now.day() < 6) $optgroup.append(createOption(now.clone().day(6).hour(8).startOf('hour'), gt('This weekend'), 'dddd LT'))
  result.push($optgroup)

  // Next weeks
  $optgroup = $('<optgroup>').attr('label', gt('In the upcoming weeks'))
  for (let w = 1; w <= 4; w++) {
    const day = now.clone().day(1).add(w, 'week').hour(8).startOf('hour')
    $optgroup.append(
      w === 1
        ? createOption(day, gt('Next week'), 'dddd LT')
        : createOption(day, gt('Monday in %1$d weeks', w), 'L LT')
    )
  }
  result.push($optgroup)

  return result

  function createOption (moment, label, format = '') {
    const suffix = format ? moment.format(`[ (]${format}[)]`) : ''
    return $(`<option value="${moment.valueOf()}">${label}${suffix}</option>`)
  }
}

// returns the same as buildDropdownMenu but returns an array of value string pairs
export function buildOptionArray ({ daysOnly = false, divider = false } = {}) {
  let result = []
  const now = moment().startOf('hour')

  if (!daysOnly) {
    result = [
      [5, gt('In %1$d minutes', 5)],
      [15, gt('In %1$d minutes', 15)],
      [30, gt('In %1$d minutes', 30)],
      [60, gt('In one hour')]
    ]
    if (divider) result.push(['---', ''])
    const i = now.hours()
    if (i < 14) result.push(['d' + i, gt('This afternoon') + suffix(now.clone().hours(14))])
    if (i < 18) result.push(['d' + i, gt('Tonight') + suffix(now.clone().hours(18))])
    if (i < 22) result.push(['d' + i, gt('Late in the evening') + suffix(now.clone().hours(22))])
    if (divider && i < 22) result.push(['---', ''])
  }

  // tomorrow
  result.push(['t', gt('Tomorrow') + (daysOnly ? '' : suffix(now.clone().add(1, 'day').hours(8)))])
  result.push(['w6', gt('This weekend') + suffix(now.clone().isoWeekday(6).hours(daysOnly ? 0 : 8), daysOnly ? 'dddd' : 'dddd LT')])
  if (divider) result.push(['---', ''])

  now.isoWeekday(1).hours(daysOnly ? 0 : 8)
  result.push(['ww1', gt('Next week') + suffix(now.clone().add(1, 'week'), daysOnly ? 'dddd' : 'dddd LT')])
  result.push(['ww2', gt('Monday in %1$d weeks', 2) + suffix(now.clone().add(2, 'weeks'), daysOnly ? 'L' : 'L LT')])
  result.push(['ww3', gt('Monday in %1$d weeks', 3) + suffix(now.clone().add(3, 'weeks'), daysOnly ? 'L' : 'L LT')])
  result.push(['ww4', gt('Monday in %1$d weeks', 4) + suffix(now.clone().add(4, 'weeks'), daysOnly ? 'L' : 'L LT')])

  return result

  function suffix (m, format = 'LT') {
    return ' (' + m.format(format) + ')'
  }
}

export const isOverdue = function (task) {
  return (task.end_time !== undefined && task.end_time !== null && task.end_time < Date.now() && task.status !== 3)
}

export const getSmartEnddate = function (data) {
  const m = data.full_time ? moment.utc(data.end_time).local(true) : moment(data.end_time)
  const startOfDay = moment().startOf('day')
  // past?
  if (m.isBefore(startOfDay)) {
    if (m.isAfter(startOfDay.subtract(1, 'day'))) {
      return gt('Yesterday') + ', ' + m.format(data.full_time ? 'l' : 'l, LT')
    }
    return m.format('ddd, ' + m.format(data.full_time ? 'l' : 'l, LT'))
  }
  // future
  if (m.isBefore(startOfDay.add(1, 'days'))) {
    return gt('Today') + ', ' + m.format(data.full_time ? 'l' : 'l, LT')
  } else if (m.isBefore(startOfDay.add(1, 'day'))) {
    return gt('Tomorrow') + ', ' + m.format(data.full_time ? 'l' : 'l, LT')
  }
  return m.format('ddd, ' + m.format(data.full_time ? 'l' : 'l, LT'))
}

// looks in the task note for 'mail:' + _.ecid(maildata), removes that from the note and returns the mail link as a button that opens the mailapp
export const checkMailLinks = function (note) {
  const links = note.match(/mail:\/\/\S*/g)
  let link

  if (links && links[0] && capabilities.has('webmail')) {
    for (let i = 0; i < links.length; i++) {
      link = '<a href="#" role="button" data-cid="' + links[i].replace(/^mail:\/\//, '') + '" class="ox-internal-mail-link label label-primary">' + gt('Original mail') + '</a>'
      // replace links
      note = note.replace(links[i], link)
    }
    // remove signature style divider "--" used by tasks created by mail reminder function (if it's at the start remove it entirely)
    note = note.replace(/(<br>)+-+(<br>)*/, '<br>').replace(/^-+(<br>)*/, '')
  }

  // prevent malicious code here
  return sanitizer.simpleSanitize(note)
}

// change status number to status text. format enddate to presentable string
// if detail is set, alarm and startdate get converted too and status text is set for more states than overdue and success
export const interpretTask = function (task, options) {
  options = options || {}
  task = _.copy(task, true)

  // no state for task over time, so manual check is needed
  if (!options.noOverdue && isOverdue(task)) {
    task.status = gt('Overdue')
    task.badge = 'badge badge-overdue'
  } else if (task.status) {
    switch (task.status) {
      case 1:
        task.status = gt('Not started')
        task.badge = 'badge badge-notstarted'
        break
      case 2:
        task.status = gt('In progress')
        task.badge = 'badge badge-inprogress'
        break
      case 3:
        task.status = gt('Done')
        task.badge = 'badge badge-done'
        break
      case 4:
        task.status = gt('Waiting')
        task.badge = 'badge badge-waiting'
        break
      case 5:
        task.status = gt('Deferred')
        task.badge = 'badge badge-deferred'
        break
      // no default
    }
  } else {
    task.status = ''
    task.badge = ''
  }

  if (task.title === undefined || task.title === null) {
    task.title = '\u2014'
  }

  // convert UTC timestamps to local time
  ['end_time', 'start_time', 'alarm', 'date_completed'].forEach(function (field) {
    const fullTime = task.full_time && (field === 'end_time' || field === 'start_time')
    const format = formatTime(task[field], fullTime)
    task[field] = format.date
    task[field + '_diff'] = format.diff
  })

  function formatTime (value, fullTime) {
    const result = { date: '', diff: '' }
    if (value === undefined || value === null) return result
    // fulltime tasks are timezone independent
    const date = fullTime ? moment.utc(value) : moment.tz(value, settings.get('timezone'))
    result.date = date.format(fullTime ? 'l' : 'l, LT')
    result.diff = getDiff(date, fullTime)
    return result
  }

  function getDiff (date, fullTime) {
    const duration = moment.duration(date.diff(moment()))
    if (fullTime && duration.asHours() >= 1 && duration.asHours() < 24) return gt('Tomorrow')
    if (fullTime && duration.asHours() < 0 && duration.asHours() > -24) return gt('Today')
    return duration.humanize(true)
  }

  return task
}

// done tasks last, overduetasks first, same or no date alphabetical
export const sortTasks = function (tasks, order) {
  // make local copy
  tasks = _.copy(tasks, true)
  if (!order) {
    order = 'asc'
  }

  let resultArray = []
  const dateArray = []
  const emptyDateArray = []
  // sort by alphabet
  const alphabetSort = function (a, b) {
    if (!a.title) {
      return -1
    }
    if (!b.title) {
      return 1
    }
    if (a.title.toLowerCase() > b.title.toLowerCase()) {
      return 1
    }
    return -1
  }
  // sort by endDate. If equal, sort by alphabet
  const dateSort = function (a, b) {
    if (a.end_time > b.end_time) {
      return 1
      // treat end_time=null and end_time=undefined equally. may happen with done tasks
    } else if (a.end_time === b.end_time || (a.end_time === undefined && b.end_time === null) || (a.end_time === null && b.end_time === undefined)) {
      return alphabetSort(a, b)
    }
    return -1
  }

  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === 3) {
      resultArray.push(tasks[i])
    } else if (tasks[i].end_time === null || tasks[i].end_time === undefined) {
      // tasks without end_time
      emptyDateArray.push(tasks[i])
    } else {
      // tasks with end_time
      dateArray.push(tasks[i])
    }
  }
  // sort by end_time and alphabet
  resultArray.sort(dateSort)
  // sort by alphabet
  emptyDateArray.sort(alphabetSort)
  // sort by end_time and alphabet
  dateArray.sort(dateSort)

  if (order === 'desc') {
    resultArray.push(emptyDateArray.reverse(), dateArray.reverse())
    resultArray = _.flatten(resultArray)
  } else {
    resultArray.unshift(dateArray, emptyDateArray)
    resultArray = _.flatten(resultArray)
  }
  return resultArray
}

export const getPriority = function (data) {
  if (data) {
    const p = parseInt(data.priority, 10) || 0
    const $span = $('<span>')
    let n = 0
    switch (p) {
      case 0:
        $span.addClass('noprio').attr('title', gt('No priority'))
        break
      case 1:
        $span.addClass('low').attr('title', gt('Low priority'))
        break
      case 2:
        n = 1
        $span.addClass('medium').attr('title', gt('Medium priority'))
        break
      case 3:
        n = 3
        $span.addClass('high').attr('title', gt('High priority'))
        break
      // no default
    }
    for (let i = 0; i < n; i++) $span.append(createIcon('bi/exclamation.svg'))
    return $span
  }
}

export const getConfirmations = function (data) {
  const hash = {}
  if (data) {
    // internal users
    _(data.users).each(function (obj) {
      hash[String(obj.id)] = {
        status: obj.confirmation || 0,
        comment: obj.confirmmessage || ''
      }
    })
    // external users
    _(data.confirmations).each(function (obj) {
      hash[obj.mail] = {
        status: obj.status || 0,
        comment: obj.message || obj.confirmmessage || ''
      }
    })
  }
  return hash
}

export const getConfirmationStatus = function (obj, id) {
  const hash = getConfirmations(obj)
  const user = id || ox.user_id
  return hash[user] ? hash[user].status : 0
}

export const getConfirmationMessage = function (obj, id) {
  const hash = getConfirmations(obj)
  const user = id || ox.user_id
  return hash[user] ? hash[user].comment : ''
}

export const getDateTimeIntervalMarkup = function (data, options) {
  if (data && data.start_date && data.end_date) {
    options = _.extend({ timeZoneLabel: { placement: device('touch') ? 'bottom' : 'top' }, a11y: false, output: 'markup' }, options)

    if (options.container && options.container.parents('#io-ox-core').length < 1) {
      // view is not in core (happens with deep links)
      // add timezonepopover to body
      options.timeZoneLabel.container = 'body'
    }
    let startDate
    let endDate
    let dateStr
    let timeStr
    const timeZoneStr = moment(data.start_date).zoneAbbr()
    const formatString = options.a11y ? 'dddd, l' : 'ddd, l'

    if (data.full_time) {
      startDate = moment.utc(data.start_date).local(true)
      endDate = moment.utc(data.end_date).local(true).subtract(1, 'days')
    } else {
      startDate = moment(data.start_date)
      endDate = moment(data.end_date)
    }
    if (startDate.isSame(endDate, 'day')) {
      dateStr = startDate.format(formatString)
      timeStr = getTimeInterval(data, options.zone)
    } else if (data.full_time) {
      dateStr = getDateInterval(data)
      timeStr = getTimeInterval(data, options.zone)
    } else {
      // not same day and not fulltime. use interval with date and time, separate date and is confusing
      dateStr = startDate.formatInterval(endDate, formatString + ' LT')
    }

    // standard markup or object with strings
    if (options.output === 'strings') {
      return { dateStr, timeStr: timeStr || '', timeZoneStr }
    }
    return $('<div class="date-time">').append(
      // date
      $('<span class="date">').text(dateStr),
      // mdash
      $.txt(' \u00A0 '),
      // time
      $('<span class="time">').append(
        timeStr ? $.txt(timeStr) : ''
      )
    )
  }
  return ''
}

export const getDateInterval = function (data, a11y) {
  if (data && data.start_date && data.end_date) {
    let startDate; let endDate
    const formatString = a11y ? 'dddd, l' : 'ddd, l'

    a11y = a11y || false

    if (data.full_time) {
      startDate = moment.utc(data.start_date).local(true)
      endDate = moment.utc(data.end_date).local(true).subtract(1, 'days')
    } else {
      startDate = moment(data.start_date)
      endDate = moment(data.end_date)
    }
    if (startDate.isSame(endDate, 'day')) {
      return startDate.format(formatString)
    }
    if (a11y && data.full_time) {
      // #. date intervals for screen readers
      // #. please keep the 'to' do not use dashes here because this text will be spoken by the screen readers
      // #. %1$s is the start date
      // #. %2$s is the end date
      // #, c-format
      return gt('%1$s to %2$s', startDate.format(formatString), endDate.format(formatString))
    }
    return startDate.formatInterval(endDate, formatString)
  }
  return ''
}

export const getTimeInterval = function (data, zone, a11y) {
  if (!data || !data.start_date || !data.end_date) return ''
  if (data.full_time) {
    return getFullTimeInterval(data, true)
  }
  const start = moment(data.start_date)
  const end = moment(data.end_date)
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

export const getFullTimeInterval = function (data, smart) {
  const length = getDurationInDays(data)
  return length <= 1 && smart
    ? gt('All day')
    // #. General duration (nominative case): X days
    // #. %d is the number of days
    // #, c-format
    : gt.ngettext('%d day', '%d days', length, length)
}

export const getDurationInDays = function (data) {
  return moment(data.end_date).diff(data.start_date, 'days')
}

export const getReminderOptions = function () {
  const options = {}
  const reminderListValues = [
    { value: -1, format: 'string' },
    { value: 0, format: 'minutes' },
    { value: 5, format: 'minutes' },
    { value: 10, format: 'minutes' },
    { value: 15, format: 'minutes' },
    { value: 30, format: 'minutes' },
    { value: 45, format: 'minutes' },

    { value: 60, format: 'hours' },
    { value: 120, format: 'hours' },
    { value: 240, format: 'hours' },
    { value: 360, format: 'hours' },
    { value: 480, format: 'hours' },
    { value: 720, format: 'hours' },

    { value: 1440, format: 'days' },
    { value: 2880, format: 'days' },
    { value: 4320, format: 'days' },
    { value: 5760, format: 'days' },
    { value: 7200, format: 'days' },
    { value: 8640, format: 'days' },

    { value: 10080, format: 'weeks' },
    { value: 20160, format: 'weeks' },
    { value: 30240, format: 'weeks' },
    { value: 40320, format: 'weeks' }
  ]

  _(reminderListValues).each(function (item) {
    let i
    switch (item.format) {
      case 'string':
        options[item.value] = gt('No reminder')
        break
      case 'minutes':
        options[item.value] = gt.ngettext('%1$d Minute', '%1$d Minutes', item.value, item.value)
        break
      case 'hours':
        i = Math.floor(item.value / 60)
        options[item.value] = gt.ngettext('%1$d Hour', '%1$d Hours', i, i)
        break
      case 'days':
        i = Math.floor(item.value / 60 / 24)
        options[item.value] = gt.ngettext('%1$d Day', '%1$d Days', i, i)
        break
      case 'weeks':
        i = Math.floor(item.value / 60 / 24 / 7)
        options[item.value] = gt.ngettext('%1$d Week', '%1$d Weeks', i, i)
        break
      // no default
    }
  })

  return options
}
