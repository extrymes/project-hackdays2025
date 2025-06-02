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
import $ from '@/jquery'

import Wizard from '@/io.ox/core/tk/wizard'

describe('The Wizard.', function () {
  let wizard
  beforeEach(function () {
    wizard = new Wizard()
  })

  afterEach(function () {
    wizard.close()
  })

  describe('Adding steps.', function () {
    it('has no steps', function () {
      expect(wizard.steps).toHaveLength(0)
    })

    it('starts with first step', function () {
      expect(wizard.currentStep).toEqual(0)
    })

    it('allows adding steps', function () {
      wizard.step()
      expect(wizard.steps.length).toEqual(1)
    })

    it('supports long chains', function () {
      wizard.step().end().step().end().step()
      expect(wizard.steps.length).toEqual(3)
    })
  })

  describe('Navigation.', function () {
    beforeEach(function () {
      wizard.step().end().step().end()
    })

    it('offers "next"', function () {
      expect(wizard.hasNext()).toEqual(true)
    })

    it('moves to next step', function () {
      wizard.next()
      expect(wizard.currentStep).toEqual(1)
    })

    it('does not offer "back" if at start', function () {
      expect(wizard.hasBack()).toEqual(false)
    })

    it('does offer "back" if at second step', function () {
      wizard.next()
      expect(wizard.hasBack()).toEqual(true)
    })

    it('does not move to invalid position', function () {
      wizard.setCurrentStep(-1)
      expect(wizard.currentStep).toEqual(0)
      wizard.setCurrentStep(+1)
      expect(wizard.currentStep).toEqual(1)
      wizard.setCurrentStep(+2)
      expect(wizard.currentStep).toEqual(1)
    })
  })

  describe('Events.', function () {
    it('forwards step-related events', function () {
      const spyNext = jest.fn()
      const spyBack = jest.fn()
      const spyClose = jest.fn()

      wizard
        .step()
        .end()
        .on({ 'step:next': spyNext, 'step:back': spyBack, 'step:close': spyClose })
        .withCurrentStep(function (step) {
          step.trigger('next')
          step.trigger('back')
          step.trigger('close')
        })

      expect(spyNext.mock.calls).toHaveLength(1)
      expect(spyBack.mock.calls).toHaveLength(1)
      expect(spyClose.mock.calls).toHaveLength(1)
    })
  })

  describe('Execution.', function () {
    beforeEach(function () {
      wizard.step().end().step().end()
    })

    it('shows up in the DOM', function () {
      wizard.start()
      expect($('.wizard-step').length).toEqual(1)
    })

    it('get removed from the DOM', function () {
      wizard.start().close()
      expect($('.wizard-step').length).toEqual(0)
    })

    it('shows proper content', function () {
      wizard.steps[0].content('Lorem ipsum')
      wizard.start()
      expect($('.wizard-step .wizard-content').text()).toEqual('Lorem ipsum')
    })

    it('has proper "start" button', function () {
      wizard.start()
      expect($('.wizard-step .btn[data-action="next"]').text()).toEqual('Start tour')
    })

    it('has proper "back" button', function () {
      wizard.start().next()
      expect($('.wizard-step .btn[data-action="back"]').text()).toEqual('Back')
    })
  })
})
