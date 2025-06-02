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

import { describe, it, expect } from '@jest/globals'
import _ from '@/underscore'

import * as util from '@/io.ox/tasks/util'
import moment from '@open-xchange/moment'
import { gt } from 'gettext'

import { settings as coreSettings } from '@/io.ox/core/settings'

describe('Tasks Utilities', function () {
  const options = {
    testData: {
      status: 2,
      title: undefined,
      start_time: 0,
      end_time: 1484031600000,
      alarm: 1484024400000
    },
    testDataFulltime: {
      status: 2,
      title: 'Fulltime Task',
      start_time: 1484006400000,
      end_time: 1484092800000,
      alarm: 1484024400000,
      full_time: true
    },
    testDataArray: [
      {
        status: 3,
        title: 'Top Test'
      }, {
        end_time: 1895104800000,
        status: 1,
        title: 'Bla bla'
      },
      {
        end_time: 1895104800000,
        status: 1,
        title: 'Abc'
      }, {
        end_time: 1384999200000,
        status: 1,
        title: 'Test Title'
      }
    ]
  }
  describe('interpreting a task', function () {
    it('should work on a copy', function () {
      util.interpretTask(options.testData)
      expect(_.allKeys(options.testData)).not.toContain('badge')
    })

    it('should add badge', function () {
      const result = util.interpretTask(options.testData)
      expect(_.allKeys(result)).toContain('badge')
    })

    it('should change status to a string', function () {
      const result = util.interpretTask(options.testData)
      expect(typeof result.status).toEqual('string')
    })

    it('should add \u2014 if title is empty', function () {
      const result = util.interpretTask(options.testData)
      expect(result.title).toEqual('\u2014')
    })

    it('should handle 1.1.1970 correctly', function () {
      const result = util.interpretTask(options.testData)
      expect(result.title).toEqual('\u2014')
    })

    it('should format times correctly', function () {
      let result = util.interpretTask(options.testData); const oldTimezone = coreSettings.get('timezone')
      expect(result.end_time).toEqual(moment.tz(1484031600000, coreSettings.get('timezone')).format('l, LT'))
      // timestamp 0
      expect(result.start_time).toEqual(moment.tz(0, coreSettings.get('timezone')).format('l, LT'))
      expect(result.alarm).toEqual(moment.tz(1484024400000, coreSettings.get('timezone')).format('l, LT'))

      // set to timezone with negative offset. This way we can see if start and end time are treated timezone independent in fulltime mode (negative offset changes date if it is applied)
      // see Bug 50918
      coreSettings.set('timezone', 'Etc/GMT-8')
      result = util.interpretTask(options.testDataFulltime)

      expect(result.end_time).toEqual(moment.utc(1484092800000).format('l'))
      expect(result.start_time).toEqual(moment.utc(1484006400000).format('l'))
      expect(result.alarm).toEqual(moment.tz(1484024400000, coreSettings.get('timezone')).format('l, LT'))

      coreSettings.set('timezone', oldTimezone)
    })
  })

  describe('buildOptionArray', function () {
    it('should return an array', function () {
      const result = util.buildOptionArray()
      expect(result).toBeInstanceOf(Array)
    })

    it('should only contain full days if parameter is set', function () {
      let result = _.object(util.buildOptionArray({ daysOnly: true }))
      expect(result[5]).toBeUndefined()
      result = _.object(util.buildOptionArray())
      expect(result[5]).toEqual(gt('In 5 minutes'))
    })
  })

  describe('buildDropdownMenu', function () {
    it('should return an array', function () {
      const result = util.buildDropdownMenu()
      expect(result).toBeInstanceOf(Array)
    })

    it('should return correct nodeTypes', function () {
      let result = util.buildDropdownMenu()
      expect(result[0].is('option')).toEqual(true)
      result = util.buildDropdownMenu({ bootstrapDropdown: true })
      expect(result[0].is('li')).toEqual(true)
    })
  })

  describe('computePopupTime', function () {
    it('should only return full days', function () {
      const result = moment.utc(util.computePopupTime('t').endDate)

      expect(result.hours()).toEqual(0)
      expect(result.minutes()).toEqual(0)
      expect(result.seconds()).toEqual(0)
      expect(result.milliseconds()).toEqual(0)
    })
  })

  describe('sortTasks', function () {
    it('should work on a copy', function () {
      util.sortTasks(options.testDataArray)
      expect(options.testDataArray[0]).toStrictEqual({ status: 3, title: 'Top Test' })
    })

    it('should sort overdue tasks to first position', function () {
      const result = util.sortTasks(options.testDataArray)
      expect(result[0]).toStrictEqual({ status: 1, title: 'Test Title', end_time: 1384999200000 })
    })

    it('should sort done tasks to last position', function () {
      const result = util.sortTasks(options.testDataArray)
      expect(result[3]).toStrictEqual({ status: 3, title: 'Top Test' })
    })

    it('should sort same dates alphabetically', function () {
      const result = util.sortTasks(options.testDataArray)
      expect(result[1]).toStrictEqual({ end_time: 1895104800000, status: 1, title: 'Abc' })
      expect(result[2]).toStrictEqual({ end_time: 1895104800000, status: 1, title: 'Bla bla' })
    })
  })
})
