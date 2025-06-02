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

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import $ from '@/jquery'
import Backbone from '@/backbone'

import common from '@/io.ox/backbone/mini-views/common'
import date from '@/io.ox/backbone/mini-views/date'
import moment from '@open-xchange/moment'

describe('Core Backbone mini-views.', function () {
  describe('AbstractView view', function () {
    let view

    beforeEach(function () {
      view = new common.AbstractView({ name: 'test', model: new Backbone.Model() })
    })

    it('has an "initialize" function', function () {
      expect(view.initialize).toBeInstanceOf(Function)
    })

    it('has a "dispose" function', function () {
      expect(view.dispose).toBeInstanceOf(Function)
    })

    it('has a "valid" function', function () {
      expect(view.valid).toBeInstanceOf(Function)
    })

    it('has an "invalid" function', function () {
      expect(view.invalid).toBeInstanceOf(Function)
    })

    it('has a model', function () {
      expect(view.model).toBeDefined()
    })

    it('references itself via data("view")', function () {
      expect(view.$el.data('view')).toEqual(view)
    })
  })

  describe('InputView', function () {
    let view, model
    beforeEach(function () {
      model = new Backbone.Model({ test: '' })
      view = new common.InputView({ name: 'test', model })
    })

    it('is an input field', function () {
      expect(view.$el.prop('tagName')).toEqual('INPUT')
      expect(view.$el.attr('type')).toEqual('text')
    })

    it('has a setup function', function () {
      expect(view.setup).toBeInstanceOf(Function)
    })

    it('has an update function', function () {
      expect(view.update).toBeInstanceOf(Function)
    })

    it('has a render function', function () {
      expect(view.render).toBeInstanceOf(Function)
    })

    it('has a render function that returns "this"', function () {
      const result = view.render()
      expect(result).toEqual(view)
    })

    it('has a render function that calls update', function () {
      const spy = jest.spyOn(view, 'update')
      view.render()
      expect(spy.mock.calls).toHaveLength(1)
    })

    it('should render a name attribute', function () {
      view.render()
      expect(view.$el.attr('name')).toEqual('test')
    })

    it('should be empty', function () {
      expect(view.$el.val()).toHaveLength(0)
      expect(model.get('test')).toHaveLength(0)
    })

    it('reflects model changes', function () {
      model.set('test', '1337')
      expect(view.$el.val()).toEqual('1337')
    })

    it('updates the model', function () {
      view.$el.val('Hello World').trigger('change')
      expect(model.get('test')).toEqual('Hello World')
    })
  })

  describe('TextView', function () {
    let model, view

    beforeEach(function () {
      model = new Backbone.Model({ test: '' })
      view = new common.TextView({ name: 'test', model })
    })

    it('is an input field', function () {
      expect(view.$el.prop('tagName')).toEqual('TEXTAREA')
    })

    it('reflects model changes', function () {
      model.set('test', 'Lorem Ipsum')
      expect(view.$el.val()).toEqual('Lorem Ipsum')
    })

    it('updates the model', function () {
      view.$el.val('Lorem Ipsum').trigger('change')
      expect(model.get('test')).toEqual('Lorem Ipsum')
    })
  })

  describe('CheckboxView', function () {
    let model, view

    beforeEach(function () {
      model = new Backbone.Model({ test: '' })
      view = new common.CheckboxView({ name: 'test', model })
    })

    it('is an input field', function () {
      expect(view.$el.prop('tagName')).toEqual('INPUT')
      expect(view.$el.attr('type')).toEqual('checkbox')
    })

    it('reflects model changes', function () {
      model.set('test', true)
      expect(view.$el.prop('checked')).toEqual(true)
    })

    it('updates the model', function () {
      view.$el.prop('checked', true).trigger('change')
      expect(model.get('test')).toEqual(true)
    })
  })

  describe('PasswordView', function () {
    let model, view
    beforeEach(function () {
      model = new Backbone.Model({ test: '' })
      view = new common.PasswordView({ name: 'test', model })
    })

    it('is an input field', function () {
      expect(view.$el.prop('tagName')).toEqual('INPUT')
      expect(view.$el.attr('type')).toEqual('password')
    })

    it('has a setup function', function () {
      expect(view.setup).toBeInstanceOf(Function)
    })

    it('has an update function', function () {
      expect(view.update).toBeInstanceOf(Function)
    })

    it('has a render function', function () {
      expect(view.render).toBeInstanceOf(Function)
    })

    it('has a render function that returns "this"', function () {
      const result = view.render()
      expect(result).toEqual(view)
    })

    it('has a render function that calls update', function () {
      const spy = jest.spyOn(view, 'update')
      view.render()
      expect(spy.mock.calls).toHaveLength(1)
    })

    it('should render a name attribute', function () {
      view.render()
      expect(view.$el.attr('name')).toEqual('test')
    })

    it('should have a autocomplete attribute set to off', function () {
      view.render()
      expect(view.$el.attr('autocomplete')).toEqual('off')
    })

    it('should have a autocorrect attribute set to off', function () {
      view.render()
      expect(view.$el.attr('autocorrect')).toEqual('off')
    })

    it('should be empty', function () {
      expect(view.$el.val()).toHaveLength(0)
      expect(model.get('test')).toHaveLength(0)
    })

    it('should show stars if no value is set', function () {
      model.set('test', null)
      expect(view.$el.val()).toEqual('********')
    })

    it('reflects model changes', function () {
      model.set('test', '1337')
      expect(view.$el.val()).toEqual('1337')
    })

    it('updates the model', function () {
      view.$el.val('new password').trigger('change')
      expect(model.get('test')).toEqual('new password')
    })
  })

  describe('DateView', function () {
    let modelDate, model, view

    beforeEach(function () {
      modelDate = moment.utc({ year: 2012, month: 1, date: 5 })
      model = new Backbone.Model({ test: modelDate.valueOf() })
      view = new date.DateSelectView({ name: 'test', model, label: $('<label>').text('label') })
      view.render()
    })

    it('is a <div> tag with three <select> controls', function () {
      expect(view.$el.prop('tagName')).toEqual('DIV')
      expect(view.$el.children().length).toEqual(3)
      expect(view.$el.find('div > select').length).toEqual(3)
    })

    it('contains 1604 as fallback year', function () {
      expect(view.$el.find('.year').children().first().attr('value')).toEqual('1604')
    })

    it('contains an empty option for month', function () {
      expect(view.$el.find('.month').children().eq(0).attr('value')).toHaveLength(0)
    })

    it('lists month as one-digit numbers starting with 0', function () {
      expect(view.$el.find('.month').children().eq(1).attr('value')).toEqual('0')
    })

    it('contains an empty option for dates', function () {
      expect(view.$el.find('.date').children().eq(0).attr('value')).toHaveLength(0)
    })

    it('lists dates as one-digit numbers starting with 1', function () {
      expect(view.$el.find('.date').children().eq(1).attr('value')).toEqual('1')
    })

    it('reflects model state', function () {
      expect(view.$el.find('.date').val()).toEqual(String(modelDate.date()))
      expect(view.$el.find('.month').val()).toEqual(String(modelDate.month()))
      expect(view.$el.find('.year').val()).toEqual(String(modelDate.year()))
    })

    it('updates the model', function () {
      view.$el.find('.year').val('1978').trigger('change')
      view.$el.find('.month').val('0').trigger('change')
      view.$el.find('.date').val('29').trigger('change')
      expect(model.get('test')).toEqual(Date.UTC(1978, 0, 29))
    })
  })

  describe('ErrorView', function () {
    let model, container, containerDefault, inputView, view, viewSecond

    beforeEach(function () {
      model = new Backbone.Model({ test: '' })
      container = $('<div class="row">')
      containerDefault = $('<div class="form-group">')
      inputView = new common.InputView({ name: 'test', model })
      view = new common.ErrorView({ selector: '.row' })
      viewSecond = new common.ErrorView()
    })

    it('is an span container', function () {
      expect(view.$el.prop('tagName')).toEqual('SPAN')
      expect(view.$el.attr('class')).toEqual('help-block')
    })

    it('has a invalid function', function () {
      expect(view.invalid).toBeInstanceOf(Function)
    })

    it('has an valid function', function () {
      expect(view.valid).toBeInstanceOf(Function)
    })

    it('should render a aria-live attribute', function () {
      view.render()
      expect(view.$el.attr('aria-live')).toEqual('assertive')
    })

    it('has a render function', function () {
      expect(view.render).toBeInstanceOf(Function)
    })

    it('has a render function that returns "this"', function () {
      const result = view.render()
      expect(result).toEqual(view)
    })

    it('has a getContainer function ', function () {
      expect(view.getContainer).toBeInstanceOf(Function)
    })

    it('should listen to the custom container', function () {
      container.append(
        inputView.render().$el,
        view.render().$el
      )
      expect(view.getContainer().empty()[0]).toEqual(container[0])
    })

    it('should listen to the default container', function () {
      containerDefault.append(
        inputView.render().$el,
        viewSecond.render().$el
      )
      expect(viewSecond.getContainer().empty()[0]).toEqual(containerDefault[0])
    })
  })
})
