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
import Backbone from '@/backbone'
import ox from '@/ox'
import moment from '@open-xchange/moment'
import api from '@/io.ox/core/api/mailfilter'

import gt from 'gettext'

const DAY = 24 * 60 * 60 * 1000

const VacationNoticeModel = Backbone.Model.extend({

  parse (response) {
    // early return is required for model.save()
    // server does not return usable data
    if (!_.isArray(response)) return {}

    const data = response[0]
    const attr = {
      active: false,
      activateTimeFrame: false,
      days: '7',
      internal_id: 'vacation',
      subject: '',
      text: ''
    }

    // use defaults
    if (!data || !data.actioncmds[0]) {
      return _.extend(attr, this.getDefaultRange())
    }

    // copy all attributes from actioncmds[0], e.g. days, subject, text
    _.extend(attr, data.actioncmds[0])

    // from
    if (!attr.from) attr.from = 'default'

    // addresses
    _(attr.addresses).each(function (address) {
      attr['alias_' + address] = true
    })

    // IDs
    attr.internal_id = attr.id
    attr.id = data.id

    // active
    attr.active = !!data.active

    // position
    attr.position = data.position

    this.parseTest(attr, data.test)

    return attr
  },

  parseTest (attr, test) {
    if (test.id === 'allof') {
      test.tests.forEach(test => this.parseTest(attr, test))
    } else if (test.id === 'currentdate') {
      // we do have just start or end date
      if (test.zone === undefined) {
        test.zone = moment(test.datevalue[0]).format('Z').replace(':', '')
      }

      // we start with timestamp t and stay in UTC, therefore moment.utc(t)
      // now we set the timezone offset while keeping the same time (true)
      // finally we switch into local time without keeping the time (false).
      // we could just say moment(t) but this case ignores users who change timezone. yep, edge-case.
      const value = moment.utc(test.datevalue[0]).utcOffset(test.zone, true).local(false).valueOf()
      attr[test.comparison === 'ge' ? 'dateFrom' : 'dateUntil'] = value
      attr.activateTimeFrame = true
    } else {
      Object.assign(attr, this.getDefaultRange())
    }
  },

  getDefaultRange () {
    return { dateFrom: +moment().startOf('day'), dateUntil: +moment().endOf('day').add(1, 'week') }
  },

  toJSON () {
    const attr = this.attributes
    const cmd = _(attr).pick('days', 'subject', 'text')

    // copy internal_id as id
    cmd.id = attr.internal_id

    // from
    if (attr.from && attr.from !== 'default') {
      cmd.from = parseAddress(attr.from)
    }

    // addresses
    cmd.addresses = [attr.primaryMail]
    _(attr).each(function (value, name) {
      if (value === true && /^alias_.*@.*$/.test(name)) cmd.addresses.push(name.substr(6))
    })

    cmd.addresses = _.uniq(cmd.addresses)

    // time
    let testForTimeframe = { id: 'allof', tests: [] }

    function utcOffset (t) {
      return moment(t).format('Z').replace(':', '')
    }

    // date range
    [['dateFrom', 'ge'], ['dateUntil', 'le']].forEach(function (test) {
      const value = attr[test[0]]; const cmp = test[1]
      if (!value) return
      testForTimeframe.tests.push({
        id: 'currentdate',
        comparison: cmp,
        datepart: 'date',
        // server expects UTC timestamp
        datevalue: [value + moment(value).utcOffset() * 60 * 1000],
        // zone readds offset
        zone: utcOffset(value)
      })
    })

    if (testForTimeframe.tests.length === 1 && attr.activateTimeFrame) {
      testForTimeframe = testForTimeframe.tests[0]
    } else if (testForTimeframe.tests.length === 0 || attr.activateTimeFrame === false) {
      testForTimeframe = { id: 'true' }
    }

    // get final json
    const json = {
      active: attr.active,
      actioncmds: [cmd],
      test: testForTimeframe,
      flags: ['vacation'],
      rulename: gt('vacation notice')
    }

    // position
    if (attr.position !== undefined) json.position = attr.position

    if (attr.id !== undefined) json.id = attr.id

    return json
  },

  sync (method, module, options) {
    switch (method) {
      case 'create':
        return api.create(this.toJSON())
          .done(this.onUpdate.bind(this))
          .done(options.success).fail(options.error)
      case 'read':
        return api.getRules('vacation')
          .done(options.success).fail(options.error)
      case 'update':
        return api.update(this.toJSON())
          .done(this.onUpdate.bind(this))
          .done(options.success).fail(options.error)
      // no default
    }
  },

  // add missing promise support
  save () {
    const promise = Backbone.Model.prototype.save.apply(this, arguments)
    return !promise ? $.Deferred().reject(this.validationError) : promise
  },

  onUpdate () {
    // an easy way to propagate changes
    // otherwise we need to sync data across models or introduce a singleton-model-approach
    ox.trigger('mail:change:vacation-notice', this)
  },

  isActive () {
    if (!this.get('active')) return false
    if (!this.get('activateTimeFrame')) return true
    const now = +moment()
    // FROM and UNTIL
    if (this.has('dateFrom') && this.has('dateUntil')) {
      return this.get('dateFrom') <= now && (this.get('dateUntil') + DAY) > now
    }
    // just FROM
    if (this.has('dateFrom')) return this.get('dateFrom') <= now
    // just UNTIL
    return (this.get('dateUntil') + DAY) > now
  },

  isPast () {
    return this.has('dateUntil') && (this.get('dateUntil') + DAY) < +moment()
  },

  isReverse () {
    return this.has('dateFrom') && this.has('dateUntil') && this.get('dateFrom') > this.get('dateUntil')
  },

  getDuration () {
    const from = this.get('dateFrom'); const until = this.get('dateUntil')
    return Math.round(moment.duration(moment(until + DAY).diff(from)).asDays())
  },

  validate () {
    // false means "good"
    if (!this.get('active')) return false
    if (!this.get('activateTimeFrame')) return false
    if (this.isReverse()) return { dateUntil: gt('The end date must be after the start date.') }
    if (this.isPast()) return { dateUntil: gt('The time frame is in the past.') }
    return false
  }
})

function parseAddress (address) {
  const match = address.match(/^(.+)\s<(.+)>$/)
  return match ? match.slice(1, 3) : address
}

export default VacationNoticeModel
