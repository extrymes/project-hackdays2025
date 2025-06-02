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

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import _ from '@/underscore'

import feedback from '@/plugins/core/feedback/register'

import { settings } from '@/io.ox/core/settings'

describe('Feedback Plugin', function () {
  let clock, clockUnderscore
  beforeEach(function () {
    // Thu Jan 16 2020 11:00:00 GMT+0100
    clock = jest.spyOn(Date, 'now').mockImplementation(() => 1579168800000)
    clockUnderscore = jest.spyOn(_, 'now').mockImplementation(() => 1579168800000)
  })
  afterEach(function () {
    clock.mockRestore()
    clockUnderscore.mockRestore()
  })

  it('should work without settings', function () {
    settings.set('feedback/timeLimit', undefined)
    settings.set('feedback/maxFeedbacks', undefined)
    settings.set('feedback/usedFeedbacks', undefined)
    settings.set('feedback/firstFeedbackTime', undefined)

    expect(feedback.allowedToGiveFeedback()).toEqual(true)
  })

  it('should honor maxFeedbacks setting', function () {
    settings.set('feedback/timeLimit', undefined)
    settings.set('feedback/maxFeedbacks', 3)
    settings.set('feedback/usedFeedbacks', 3)
    settings.set('feedback/firstFeedbackTime', undefined)

    expect(feedback.allowedToGiveFeedback()).toEqual(false)
  })

  it('should work with relative time', function () {
    settings.set('feedback/timeLimit', '3m')
    settings.set('feedback/maxFeedbacks', 3)
    settings.set('feedback/usedFeedbacks', undefined)
    settings.set('feedback/firstFeedbackTime', undefined)

    // no feedback given yet
    expect(feedback.allowedToGiveFeedback()).toEqual(true)
    expect(settings.get('feedback/usedFeedbacks')).toEqual(undefined)

    // one feedback given already
    settings.set('feedback/usedFeedbacks', 1)
    settings.set('feedback/firstFeedbackTime', 1579168680000)
    expect(feedback.allowedToGiveFeedback()).toEqual(true)
    expect(settings.get('feedback/usedFeedbacks')).toEqual(1)

    // max feedbacks given already
    settings.set('feedback/usedFeedbacks', 3)
    expect(feedback.allowedToGiveFeedback()).toEqual(false)
    expect(settings.get('feedback/usedFeedbacks')).toEqual(3)

    // max feedbacks given already but time is up so the used feedbacks should be resetted
    settings.set('feedback/firstFeedbackTime', 1579168500000)
    expect(feedback.allowedToGiveFeedback()).toEqual(true)
    expect(settings.get('feedback/usedFeedbacks')).toEqual(0)
  })
})
