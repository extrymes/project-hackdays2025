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

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals'
import _ from '@/underscore'
import Backbone from '@/backbone'

import * as util from '@/io.ox/calendar/util'
import { RecurrenceRuleMapModel } from '@/io.ox/calendar/recurrence-rule-map-model'
import models from '@/io.ox/calendar/model'
import moment from '@open-xchange/moment'
import meta from '@/io.ox/core/locale/meta.js'

beforeAll(function () {
  moment.tz.setDefault('Europe/Berlin')
})

// \u2009: THIN SPACE
// \u202F: NARROW NO-BREAK SPACE

describe('Calendar utils', function () {
  describe('can convert timestamp to even smarter dates', function () {
    let model

    beforeEach(function () {
      model = new models.Model({ id: '1234567' })
    })

    it('yesterday', function () {
      const date = moment().subtract(1, 'day')
      model.set('startDate', {
        value: date.format('YYYYMMDD[T]HHmmss'),
        tzid: 'Europe/Berlin'
      })
      expect(util.getEvenSmarterDate(model)).toEqual('Yesterday, ' + date.format('l'))
    })

    it('same day', function () {
      const date = moment()
      model.set('startDate', {
        value: date.format('YYYYMMDD[T]HHmmss'),
        tzid: 'Europe/Berlin'
      })
      expect(util.getEvenSmarterDate(model)).toEqual('Today, ' + date.format('l'))
    })

    it('tomorrow', function () {
      const date = moment().add(1, 'day')
      model.set('startDate', {
        value: date.format('YYYYMMDD[T]HHmmss'),
        tzid: 'Europe/Berlin'
      })
      expect(util.getEvenSmarterDate(model)).toEqual('Tomorrow, ' + date.format('l'))
    })

    it('date in the past', function () {
      const date = moment().set({ year: 2012, month: 10, date: 11 })
      model.set('startDate', {
        value: date.format('YYYYMMDD[T]HHmmss'),
        tzid: 'Europe/Berlin'
      })
      expect(util.getEvenSmarterDate(model)).toEqual('Sun, 11/11/2012')
    })
  })

  describe('can convert two dates to a date interval string', function () {
    it('no given dates', function () {
      expect(util.getDateInterval()).toHaveLength(0)
    })

    it('same day', function () {
      expect(util.getDateInterval({ startDate: { value: '20121111' }, endDate: { value: '20121112' } })).toEqual('Sun, 11/11/2012')
    })

    it('one week difference', function () {
      expect(util.getDateInterval({ startDate: { value: '20121111' }, endDate: { value: '20121119' } })).toEqual('Sun, 11/11/2012\u2009–\u2009Sun, 11/18/2012')
    })
  })

  describe('can convert two time values to an interval string', function () {
    it('no given dates', function () {
      expect(util.getTimeInterval()).toHaveLength(0)
    })

    it('same time', function () {
      expect(util.getTimeInterval({ startDate: { value: '20121111T111100' }, endDate: { value: '20121111T111100' } })).toEqual('11:11\u202FAM')
    })

    it('same day', function () {
      expect(util.getTimeInterval({ startDate: { value: '20121111T111100' }, endDate: { value: '20121111T121100' } })).toEqual('11:11\u2009–\u200912:11\u202FPM')
    })
  })

  describe('build reminder options', function () {
    it('object', function () {
      const result = {
        PT0M: '0 minutes',
        PT5M: '5 minutes',
        PT10M: '10 minutes',
        PT15M: '15 minutes',
        PT30M: '30 minutes',
        PT45M: '45 minutes',
        PT1H: '1 hour',
        PT2H: '2 hours',
        PT4H: '4 hours',
        PT6H: '6 hours',
        PT8H: '8 hours',
        PT12H: '12 hours',
        P1D: '1 day',
        P2D: '2 days',
        P3D: '3 days',
        P4D: '4 days',
        P5D: '5 days',
        P6D: '6 days',
        P1W: '1 week',
        P2W: '2 weeks',
        P3W: '3 weeks',
        P4W: '4 weeks'
      }
      expect(util.getReminderOptions()).toStrictEqual(result)
    })
  })

  describe('should translate recurrence strings', function () {
    const localeWeek = {
      dow: moment.localeData().firstDayOfWeek(),
      doy: moment.localeData().firstDayOfYear()
    }

    afterEach(function () {
      moment.updateLocale('de', { week: localeWeek })
      moment.tz.setDefault('Europe/Berlin')
    })

    function getEvent () {
      return new models.Model({
        startDate: {
          value: '20200309T180000',
          tzid: 'Europe/Berlin'
        },
        endDate: {
          value: '20200309T190000',
          tzid: 'Europe/Berlin'
        }
      })
    }

    it('Only works for en_US', function () {
      expect(meta.getValidDefaultLocale()).toEqual('en_US')
    })

    // Different timezones
    it('Create recurring appointment in a different timezone (-4)', function () {
      // America/Caracas: -4
      moment.tz.setDefault('America/Caracas')

      const event = new models.Model({
        startDate: {
          value: '20200309T010000',
          tzid: 'Europe/Berlin'
        },
        endDate: {
          value: '20200309T020000',
          tzid: 'Europe/Berlin'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313T225959Z'
      })

      expect(RecurrenceRuleMapModel.getRecurrenceString(event)).toEqual('Every day. The series ends on 3/12/2020.')
    })

    it('Create recurring appointment in a different timezone (+4)', function () {
      // Asia/Muscat: +4
      moment.tz.setDefault('Asia/Muscat')

      const event = new models.Model({
        startDate: {
          value: '20200309T220000',
          tzid: 'Europe/Berlin'
        },
        endDate: {
          value: '20200309T230000',
          tzid: 'Europe/Berlin'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313T225959Z'
      })

      expect(RecurrenceRuleMapModel.getRecurrenceString(event)).toEqual('Every day. The series ends on 3/14/2020.')
    })

    it('Create recurring appointment in a different timezone (without day change)', function () {
      // Asia/Muscat: +4
      moment.tz.setDefault('Asia/Muscat')

      const event = new models.Model({
        startDate: {
          value: '20200309T120000',
          tzid: 'Europe/Berlin'
        },
        endDate: {
          value: '20200309T130000',
          tzid: 'Europe/Berlin'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313T225959Z'
      })

      expect(RecurrenceRuleMapModel.getRecurrenceString(event)).toEqual('Every day. The series ends on 3/13/2020.')
    })

    // All day events
    it('Recurring all day event', function () {
      const event = new models.Model({
        startDate: {
          value: '20200309'
        },
        endDate: {
          value: '20200310'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313'
      })

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day. The series ends on 3/13/2020.')
    })

    it('Recurring all day event of a different timezone (-4)', function () {
      moment.tz.setDefault('Asia/Caracas')

      const event = new models.Model({
        startDate: {
          value: '20200309'
        },
        endDate: {
          value: '20200310'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313'
      })

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day. The series ends on 3/13/2020.')
    })

    it('Recurring all day event of a different timezone (+4)', function () {
      moment.tz.setDefault('Asia/Muscat')

      const event = new models.Model({
        startDate: {
          value: '20200309'
        },
        endDate: {
          value: '20200310'
        },
        rrule: 'FREQ=DAILY;UNTIL=20200313'
      })

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day. The series ends on 3/13/2020.')
    })

    // Daily
    it('Every day', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=DAILY')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day.')
    })

    it('Every 10 days', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=DAILY;INTERVAL=10')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 10 days.')
    })

    it('Every day till specific date', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=DAILY;UNTIL=20200313T225959Z')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day. The series ends on 3/13/2020.')
    })

    it('Every day till a specific number of recurrences', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=DAILY;COUNT=3')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day. The series ends after 3 occurrences.')
    })

    // Weekly
    it('Weekly on Monday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every Monday.')
    })

    it('Weekly on Monday and Tuesday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every Monday and Tuesday.')
    })

    it('Weekly on Monday, Tuesday, Wednesday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU,WE')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every Monday, Tuesday, Wednesday.')
    })

    it('On workdays', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every Monday, Tuesday, Wednesday, Thursday, Friday.')
    })

    it('On weekends', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=SU,SA')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every weekend.')
    })

    it('Weekly on all days -> Every day', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every day.')
    })

    // Weekly - interval > 1
    it('Every 2 weeks on Monday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on Monday.')
    })

    // test if superessive days and start of the week work well together
    it('Every 2 weeks on Monday with start of week = 3', function () {
      moment.updateLocale('de', { week: { dow: 3, doy: localeWeek.doy } })

      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on Monday.')
    })

    it('Every 2 weeks on Monday, Tuesday, Wednesday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU,WE;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on Monday, Tuesday, Wednesday.')
    })

    it('Every 2 weeks on workdays', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on Monday, Tuesday, Wednesday, Thursday, Friday.')
    })

    it('Every 2 weeks on weekends', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=SU,SA;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on weekends.')
    })

    it('Every 2 weeks on all days', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SU,SA;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 weeks on all days.')
    })

    // Monthly
    it('Monthly on day 11', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYMONTHDAY=11')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every month on day 11.')
    })

    it('Every 2 months on day 11', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYMONTHDAY=11;INTERVAL=2')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 2 months on day 11.')
    })

    // Monthly - specific days
    it('Monthly on the first Friday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYDAY=FR;BYSETPOS=1')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every month on the first Friday.')
    })

    it('Monthly on the last Sunday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYDAY=SU;BYSETPOS=-1')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every month on the fifth / last Sunday.')
    })

    // Monthly - specific days - interval > 1
    it('Every 3 months on the first Friday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYDAY=FR;BYSETPOS=1;INTERVAL=3')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 3 months on the first Friday.')
    })

    it('Every 3 months on the last Sunday', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=MONTHLY;BYDAY=SU;BYSETPOS=-1;INTERVAL=3')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every 3 months on the fifth / last Sunday.')
    })

    // Yearly
    it('Yearly on January 29', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=29')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every year in January on day 29.')
    })

    // Yearly - specific days
    it('Yearly on the first Friday of July', function () {
      const event = getEvent()
      event.set('rrule', 'FREQ=YEARLY;BYMONTH=7;BYDAY=FR;BYSETPOS=1')

      const str = RecurrenceRuleMapModel.getRecurrenceString(event)
      expect(str).toEqual('Every year on the first Friday in July.')
    })
  })

  describe('updates recurrence patterns on date change', function () {
    it('shifts single day', function () {
      // originally on 12/04/2017 and repeated monday, wednesday and friday
      const event = new models.Model({
        startDate: {
          value: '20171204T130000',
          tzid: 'Europe/Berlin'
        },
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
      })

      // change to 12/08/2017
      event.set('startDate', {
        value: '20171208T130000',
        tzid: 'Europe/Berlin'
      })

      util.updateRecurrenceDate(event, moment('20171204T130000'))

      // repeated days should have changed to friday, sunday and tuesday
      expect(event.get('rrule')).toEqual('FREQ=WEEKLY;BYDAY=SU,TU,FR')
    })

    it('shifts multiple weeks', function () {
      // originally on 12/04/2017 and repeated monday, wednesday and friday
      const event = new models.Model({
        startDate: {
          value: '20171204T130000',
          tzid: 'Europe/Berlin'
        },
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
      })

      // change to 11/16/2017
      event.set('startDate', {
        value: '20171116T130000',
        tzid: 'Europe/Berlin'
      })

      util.updateRecurrenceDate(event, moment('20171204T130000'))

      // repeated days should have changed to monday, thursday and saturday
      expect(event.get('rrule')).toEqual('FREQ=WEEKLY;BYDAY=MO,TH,SA')
    })
  })
})

describe('createAttendee', function () {
  // partial user object
  const testUser = {
    contact_id: 123456,
    display_name: 'Test, Miss',
    email1: 'miss.test@test.com',
    first_name: 'Miss',
    folder_id: 123,
    id: 1337,
    last_name: 'Test',
    user_id: 1337
  }
  const testUserResult = {
    cuType: 'INDIVIDUAL',
    cn: 'Test, Miss',
    role: 'REQ-PARTICIPANT',
    partStat: 'NEEDS-ACTION',
    entity: 1337,
    email: 'miss.test@test.com',
    uri: 'mailto:miss.test@test.com',
    contact: {
      display_name: 'Test, Miss',
      first_name: 'Miss',
      last_name: 'Test'
    }
  }
  // test resource object
  const testResource = {
    description: 'Now with 20% more PEW PEW',
    display_name: 'Deathstar',
    email1: 'sith@dark.side',
    mailaddress: 'sith@dark.side',
    id: 319,
    type: 3
  }
  const testResourceResult = {
    cn: 'Deathstar',
    cuType: 'RESOURCE',
    entity: 319,
    partStat: 'ACCEPTED',
    role: 'REQ-PARTICIPANT',
    resource: _.clone(testResource),
    email: 'sith@dark.side',
    uri: 'mailto:sith@dark.side'
  }
  // test contact object
  const testContact = {
    display_name: 'Smith, Hannibal',
    email1: 'hannibal@a.team',
    first_name: 'Hannibal',
    folder_id: 123,
    id: 1337,
    internal_userid: 0,
    last_name: 'Smith',
    type: 5
  }
  const testContactResult = {
    cn: 'Smith, Hannibal',
    cuType: 'INDIVIDUAL',
    email: 'hannibal@a.team',
    partStat: 'NEEDS-ACTION',
    role: 'REQ-PARTICIPANT',
    uri: 'mailto:hannibal@a.team',
    contact: {
      display_name: 'Smith, Hannibal',
      first_name: 'Hannibal',
      last_name: 'Smith'
    }
  }
  // input from addParticipants for external contacts not in your gab
  const inputFragment = {
    display_name: 'vader',
    email1: 'vader@dark.side',
    field: 'email1',
    type: 5
  }

  it('should return undefined if no argument is given', function () {
    expect(util.createAttendee()).toEqual(undefined)
  })

  it('should work with user object', function () {
    expect(util.createAttendee(testUser)).toStrictEqual(testUserResult)
  })

  it('should work with user model', function () {
    expect(util.createAttendee(new Backbone.Model(testUser))).toStrictEqual(testUserResult)
  })

  it('should work with contact object', function () {
    expect(util.createAttendee(testContact)).toStrictEqual(testContactResult)
  })

  it('should work with contact model', function () {
    expect(util.createAttendee(new Backbone.Model(testContact))).toStrictEqual(testContactResult)
  })

  it('should handle resources correctly', function () {
    expect(util.createAttendee(testResource)).toStrictEqual(testResourceResult)
    expect(util.createAttendee(new Backbone.Model(testResource))).toStrictEqual(testResourceResult)
  })

  it('should add predefined values', function () {
    const result = _.copy(testUserResult)
    result.partStat = 'ACCEPTED'
    expect(util.createAttendee(testUser, { partStat: 'ACCEPTED' })).toStrictEqual(result)
  })

  it('should resolve distribution lists', function () {
    expect(util.createAttendee({ mark_as_distributionlist: true, distribution_list: [testUser, testContact] }, { partStat: 'ACCEPTED' })).toStrictEqual([testUserResult, testContactResult])
  })

  it('should work with input fragments created by addParticipants autocomplete', function () {
    expect(util.createAttendee(inputFragment)).toStrictEqual({
      cn: 'vader',
      cuType: 'INDIVIDUAL',
      email: 'vader@dark.side',
      partStat: 'NEEDS-ACTION',
      role: 'REQ-PARTICIPANT',
      uri: 'mailto:vader@dark.side',
      contact: {
        display_name: 'vader',
        first_name: undefined,
        last_name: undefined
      }
    })
  })
})

describe('createUpdateData', function () {
  it('should work with all recurrence formats', function () {
    const recurrenceRoot = new models.Model({
      id: '1234567',
      startDate: { tzid: 'Europe/Berlin', value: '20200107T120000' },
      endDate: { tzid: 'Europe/Berlin', value: '20200107T130000' }
    })
    const exception = new models.Model({
      id: '1234568',
      recurrenceId: '20200108T110000Z'
    })

    expect(util.createUpdateData(recurrenceRoot, exception)).toStrictEqual({
      id: '1234567',
      startDate: { tzid: 'Europe/Berlin', value: '20200108T120000' },
      endDate: { tzid: 'Europe/Berlin', value: '20200108T130000' },
      recurrenceId: '20200108T110000Z'
    })

    exception.set('recurrenceId', '20200108T110000')
    expect(util.createUpdateData(recurrenceRoot, exception)).toStrictEqual({
      id: '1234567',
      startDate: { tzid: 'Europe/Berlin', value: '20200108T110000' },
      endDate: { tzid: 'Europe/Berlin', value: '20200108T120000' },
      recurrenceId: '20200108T110000'
    })

    exception.set('recurrenceId', 'Europe/Berlin:20200108T110000')
    expect(util.createUpdateData(recurrenceRoot, exception)).toStrictEqual({
      id: '1234567',
      startDate: { tzid: 'Europe/Berlin', value: '20200108T110000' },
      endDate: { tzid: 'Europe/Berlin', value: '20200108T120000' },
      recurrenceId: 'Europe/Berlin:20200108T110000'
    })
  })
})
