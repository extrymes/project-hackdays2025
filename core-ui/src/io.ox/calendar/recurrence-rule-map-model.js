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
import _ from '@/underscore'

import moment from '@open-xchange/moment'
import * as util from '@/io.ox/calendar/util'

export const RecurrenceRuleMapModel = Backbone.Model.extend({

  days: ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'],

  initialize () {
    this.model = this.get('model')
    this.set('timezone', (this.model.get('startDate') && this.model.get('startDate').tzid) ? this.model.get('startDate').tzid : moment().tz())
    this.unset('model')
    this.listenTo(this.model, 'change', this.deserialize)
    this.deserialize()
    this.on('change', this.serialize)
  },

  serialize () {
    const self = this
    const args = []
    const days = this.days
      .filter((day, index) => (self.get('days') & (1 << index)) !== 0)
      .map(day => day.toUpperCase())
      .join(',')
    switch (this.get('recurrence_type')) {
      case 1:
        args.push('FREQ=DAILY')
        break
      case 2:
        args.push('FREQ=WEEKLY')
        args.push('BYDAY=' + days)
        break
      case 3:
        args.push('FREQ=MONTHLY')
        if (self.get('days')) {
          args.push('BYDAY=' + days)
          const pos = this.get('day_in_month')
          args.push('BYSETPOS=' + (pos === 5 ? -1 : pos))
        } else {
          args.push('BYMONTHDAY=' + this.get('day_in_month'))
        }
        break
      case 4:
        args.push('FREQ=YEARLY')
        if (self.get('days')) {
          args.push('BYMONTH=' + (this.get('month') + 1))
          args.push('BYDAY=' + days)
          args.push('BYSETPOS=' + this.get('day_in_month'))
        } else {
          args.push('BYMONTH=' + (this.get('month') + 1))
          args.push('BYMONTHDAY=' + this.get('day_in_month'))
        }
        break
      default:
    }
    if (this.get('interval') > 1) args.push('INTERVAL=' + this.get('interval'))
    // when this is an allday appointment the util part of an rrule must not have a Time
    if (this.get('until')) args.push(util.isAllday(this.model) ? 'UNTIL=' + moment(this.get('until')).format('YYYYMMDD') : 'UNTIL=' + moment(this.get('until')).utc().format(util.ZULU_FORMAT))
    if (this.get('occurrences')) args.push('COUNT=' + this.get('occurrences'))
    if (args.length > 0) this.model.set('rrule', args.join(';'))
    else this.model.set('rrule', null)
  },

  splitRule () {
    const str = this.model.get('rrule')
    const attributes = str.split(';')
    const rrule = {}

    _(attributes).each(function (attr) {
      attr = attr.split('=')
      const name = attr[0]
      let value = attr[1].split(',')
      if (value.length === 1) value = value[0]
      rrule[name] = value
      rrule[name.toLowerCase()] = _.isArray(value) ? attr[1].toLowerCase().split(',') : value.toLowerCase()
    })

    // TODO: figure out which recurrence rules we want to support and rework this
    if (!rrule.bysetpos && rrule.byday && !_.isArray(rrule.byday) && rrule.byday.length > 2) {
      rrule.bysetpos = rrule.byday.substr(0, rrule.byday.length - 2)
      rrule.byday = rrule.byday.substr(rrule.byday.length - 2)
    }

    return rrule
  },

  deserialize () {
    const changes = {}
    changes.startDate = _.clone(this.model.get('startDate'))
    changes.endDate = _.clone(this.model.get('endDate'))
    if (!this.model.get('rrule')) return this.set(changes)
    const self = this
    const rrule = this.splitRule()
    const date = util.getMoment(this.model.get('startDate'))

    switch (rrule.freq) {
      case 'daily':
        changes.recurrence_type = 1
        break
      case 'weekly':
        changes.recurrence_type = 2
        if (rrule.byday) {
          changes.days = _([].concat(rrule.byday)).reduce(function (memo, day) {
            return memo + (1 << self.days.indexOf(day))
          }, 0)
        } else {
          changes.days = 1 << date.day()
        }
        break
      case 'monthly':
        changes.recurrence_type = 3
        if (rrule.bymonthday) {
          changes.day_in_month = parseInt(rrule.bymonthday, 10) || 0
        } else if (rrule.byday) {
          let pos = rrule.bysetpos
          if (pos === -1) pos = 5
          changes.day_in_month = parseInt(pos, 10) || 0
          changes.days = 1 << this.days.indexOf(rrule.byday)
        } else {
          changes.day_in_month = date.date()
        }
        break
      case 'yearly':
        changes.recurrence_type = 4
        if (rrule.bymonthday) {
          changes.month = (parseInt(rrule.bymonth, 10) || 0) - 1
          changes.day_in_month = parseInt(rrule.bymonthday, 10) || 0
        } else if (rrule.byday) {
          changes.month = (parseInt(rrule.bymonth, 10) || 0) - 1
          changes.day_in_month = parseInt(rrule.bysetpos, 10) || 0
          changes.days = 1 << this.days.indexOf(rrule.byday)
        } else {
          changes.month = date.month()
          changes.day_in_month = date.date()
        }
        break
      default:
        changes.recurrence_type = 0
    }
    if (rrule.count) {
      changes.occurrences = parseInt(rrule.count, 10) || 1
    } else {
      // we need to remove old and now invalid data too (might happen during series updates etc)
      this.unset('occurrences')
    }

    if (rrule.UNTIL) {
      changes.until = moment(rrule.UNTIL).valueOf() || 0
    } else {
      // we need to remove old and now invalid data too (might happen during series updates etc)
      this.unset('until')
    }
    changes.interval = parseInt(rrule.interval, 10) || 1
    this.set(changes)
  },

  getRecurrenceString () {
    return RecurrenceRuleMapModel.getFullRecurrenceDescription(this.toJSON())
  }
}, {
  getRecurrenceString (data) {
    if (data instanceof RecurrenceRuleMapModel) return data.getRecurrenceString()
    if (data instanceof Backbone.Model && data.getRruleMapModel) return data.getRruleMapModel().getRecurrenceString()
    if (!(data instanceof Backbone.Model) && data.rrule) return new RecurrenceRuleMapModel({ model: new Backbone.Model(data) }).getRecurrenceString()
    if (data instanceof Backbone.Model) data = data.toJSON()
    return RecurrenceRuleMapModel.getFullRecurrenceDescription(data)
  },

  getFullRecurrenceDescription (data) {
    let str = util.getRecurrenceDescription(data)
    if (data.recurrence_type > 0 && (data.until || data.occurrences)) str += ' ' + util.getRecurrenceEnd(data)
    return str
  }
})
