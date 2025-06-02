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

// cSpell:ignore amodel, appliesto, cmodel, ncondition

import $ from '@/jquery'
import _ from '@/underscore'
import Backbone from '@/backbone'
import moment from '@open-xchange/moment'
import ext from '@/io.ox/core/extensions'
import mini from '@/io.ox/backbone/mini-views'
import util from '@/io.ox/mail/mailfilter/settings/filter/tests/util'

import { settings } from '@/io.ox/core/settings'
import gt from 'gettext'

const POINT = 'io.ox/mailfilter/settings/filter/detail'
let testCapabilities
let currentState = null

const checkForMultipleTests = function (el) {
  return $(el).find('[data-test-id]')
}

const setFocus = function (el, type, nestedConditionID) {
  const node = nestedConditionID ? $(el).find(`[data-test-id="${CSS.escape(nestedConditionID)}"]`) : $(el)
  if (type === 'condition') node.find((nestedConditionID ? '' : '.main') + '.add-condition > a').focus()
  if (type === 'action') $(el).find('.add-action > a').focus()
  if (type === 'appliesto') node.find((nestedConditionID ? '' : '.main') + '.appliesto > a').focus()
}

const renderWarningForEmptyTests = function (node) {
  const warning = $('<div class="alert alert-info">').text(gt('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.'))
  node.append(warning)
}

const renderWarningForEmptyActions = function (node) {
  const warning = $('<div>').addClass('alert alert-danger').text(gt('Please define at least one action.'))
  node.append(warning)
}

const filterValues = function (testType, possibleValues) {
  const availableValues = {}
  _.each(possibleValues, function (value, key) {
    if (_.indexOf(testCapabilities[testType], key) !== -1) availableValues[key] = value
  })
  return availableValues
}

const returnKeyForStop = function (actionsArray) {
  let indicatorKey
  _.each(actionsArray, function (action, key) {
    if (_.isEqual(action, { id: 'stop' })) {
      indicatorKey = key
    }
  })
  return indicatorKey
}

const FilterDetailView = Backbone.View.extend({
  tagName: 'div',
  className: 'io-ox-mailfilter-edit',

  initialize (opt) {
    this.conditionsTranslation = opt.conditionsTranslation
    this.actionsTranslations = opt.actionsTranslations
    this.defaults = opt.defaults
    this.config = opt.config

    testCapabilities = {}
    _.each(opt.config.tests, function (value) {
      testCapabilities[value.id] = value.comparisons
    })

    this.listView = opt.listView
    this.collection = opt.collection || opt?.listView?.collection
  },

  render () {
    const baton = ext.Baton({ model: this.model, view: this, config: this.config })
    ext.point(POINT + '/view').invoke('draw', this.$el.empty(), baton)

    baton.view.$el.trigger('toggle:saveButton')

    return this
  },
  events: {
    save: 'onSave',
    apply: 'onApply',
    'click [data-action=change-dropdown-value]': 'onChangeDropdownValue',
    'click [data-action="change-color"]': 'onChangeColor',
    'click [data-action="remove-test"]': 'onRemoveTest',
    'click [data-action="remove-action"]': 'onRemoveAction',
    'toggle:saveButton': 'onToggleSaveButton'
  },

  checkBlockList () {
    return this.model.get('actioncmds').some(action => this.config.options.blockedApplyActions.includes(action.id))
  },

  onToggleSaveButton () {
    if (this.$el.find('.has-error, .alert-danger').length === 0) {
      this.dialog.$el.find('.modal-footer [data-action="save"]').prop('disabled', false)
      // only allow if there is no blocked action
      this.dialog.$el.find('.modal-footer [data-action="apply"]').prop('disabled', this.checkBlockList())
    } else {
      this.dialog.$el.find('.modal-footer [data-action="save"]').prop('disabled', true)
      this.dialog.$el.find('.modal-footer [data-action="apply"]').prop('disabled', true)
    }
  },

  removeTest (testArray, testID) {
    // nested condition
    if (testID.split('_').length === 2) {
      const rootConditionID = testID.split('_')[0]
      const nestedConditionID = testID.split('_')[1]

      // remove condition in nested condition
      testArray.tests[rootConditionID].tests.splice(nestedConditionID, 1)
      // handle empty nested condition
      if (testArray.tests[rootConditionID].tests.length === 0) testArray.tests.splice(rootConditionID, 1)

      // only one test left
      if (testArray.tests.length === 1) testArray = testArray.tests[0]
    } else if (testArray.tests && testArray.tests.length > 2) {
      testArray.tests = _(testArray.tests).without(testArray.tests[testID])
    } else if (testArray.tests) {
      testArray.tests = _(testArray.tests).without(testArray.tests[testID])
      testArray = testArray.tests[0]
    } else {
      testArray = { id: 'true' }
    }

    return testArray
  },

  onRemoveTest (e) {
    e.preventDefault()
    const node = $(e.target)
    const testID = node.closest('li').attr('data-test-id')
    const testArray = _.copy(this.model.get('test'))

    this.model.set('test', this.removeTest(testArray, testID))
    this.render()
  },

  removeAction (actionArray, actionID) {
    actionArray.splice(actionID, 1)
    return actionArray
  },

  onRemoveAction (e) {
    e.preventDefault()
    const node = $(e.target)
    const actionID = node.closest('li').attr('data-action-id')
    const actionArray = _.copy(this.model.get('actioncmds'))

    this.model.set('actioncmds', this.removeAction(actionArray, actionID))
    this.render()
  },

  onSave () {
    const self = this
    const testsPart = this.model.get('test')
    const actionArray = this.model.get('actioncmds')
    const emptyValuesAllowed = ['exists', 'not exists']

    function isValid (tests, actions) {
      let result = true
      // single test
      if (_.has(tests, 'values')) {
        if (tests.values && tests.values[0] === '' && !_.contains(emptyValuesAllowed, tests.comparison)) result = false
      }

      // multiple test
      if (_.has(tests, 'tests')) {
        _.each(tests.tests, function (singleTest) {
          if (singleTest.values && singleTest.values[0] === '' && !_.contains(emptyValuesAllowed, singleTest.comparison)) result = false

          if (singleTest.tests) {
            _.each(singleTest.tests, function (nestedTest) {
              if (nestedTest.values && nestedTest.values[0] === '' && !_.contains(emptyValuesAllowed, nestedTest.comparison)) result = false
            })
          }
        })
      }

      _.each(actions, function (val) {
        if (val.to === '' || val.text === '') result = false
        if (val.flags && val.flags[0] === '$' && val.id !== 'setflags') result = false
      })

      return result
    }

    if (!isValid(testsPart, actionArray)) {
      self.dialog.idle()
      self.render()
      return
    }

    if (currentState !== null) self.model.trigger('ChangeProcessSub', currentState)
    currentState = null

    function returnTzOffset (timeValue) {
      return moment.tz(timeValue, settings.get('timezone')).format('Z').replace(':', '')
    }

    if (testsPart.tests && testsPart.tests.length === 0) {
      this.model.set('test', { id: 'true' })
    } else {
      if (testsPart.id === 'header' && testsPart.values[0].trim() === '' && !_.contains(emptyValuesAllowed, testsPart.comparison)) {
        this.model.set('test', { id: 'true' })
      }
      if (testsPart.id === 'size') {
        if (testsPart.size.toString().trim() === '') {
          this.model.set('test', { id: 'true' })
        }
      }

      // set zone option in currentdate condition for single test if "original" is set
      if (testsPart.zone === 'original' && testsPart.id === 'currentdate') {
        this.model.attributes.test.zone = returnTzOffset(testsPart.datevalue[0])
      }
    }

    if (this.model.attributes.test.tests) {
      _.each(this.model.attributes.test.tests, function (test, key) {
        // set zone option in currentdate condition for multiple tests if "original" zone is set
        if (test.zone === 'original' && test.id === 'currentdate') self.model.attributes.test.tests[key].zone = returnTzOffset(test.datevalue[0])

        // set zone option in currentdate condition for multiple nested tests if "original" zone is set
        if (test.tests && !_.isEmpty(test.tests)) {
          _.each(test.tests, function (nestedTest, nestedKey) {
            if (nestedTest.zone === 'original' && nestedTest.id === 'currentdate') self.model.attributes.test.tests[key].tests[nestedKey].zone = returnTzOffset(nestedTest.datevalue[0])
          })
        }
      })
    }

    // if there is a stop action it should always be the last
    if (returnKeyForStop(actionArray) !== undefined) {
      actionArray.splice(returnKeyForStop(actionArray), 1)
      actionArray.push({ id: 'stop' })
      this.model.set('actioncmds', actionArray)
    }

    return this.model.save().then(function (id) {
      // first rule gets 0
      if (!_.isUndefined(id) && !_.isNull(id) && !_.isUndefined(self.listView)) {
        self.model.set('id', id)
        self.listView.collection.add(self.model)
      } else if (!_.isUndefined(id) && !_.isNull(id) && !_.isUndefined(self.collection)) {
        self.model.set('id', id)
        self.collection.add(self.model)
      }
      self.dialog.close()
    }, self.dialog.idle)
  },

  onApply () {
    const model = this.model
    return this.onSave().then(function () {
      model.trigger('apply')
    })
  },

  onChangeDropdownValue (e) {
    function triggerRender () {
      self.render()

      setTimeout(function () {
        setFocus(self.el, valueType, nestedConditionID)
      }, 100)
    }

    e.preventDefault()
    const node = $(e.target)
    const data = node.data()
    const valueType = data.type
    const self = this
    let testArray
    let arrayOfTests
    let nestedConditionID

    // all of / any of
    if (data.target === 'id') {
      arrayOfTests = _.copy(this.model.get('test'))
      arrayOfTests.id = data.value
      this.model.set('test', arrayOfTests)
      triggerRender()
      return
    }

    // all of / any of nested condition
    if (data.target === 'nestedID') {
      arrayOfTests = this.model.get('test')
      nestedConditionID = node.closest('li').attr('data-test-id')

      arrayOfTests.tests[nestedConditionID].id = data.value
      this.model.set('test', arrayOfTests)
      triggerRender()
      return
    }

    // create nested condition
    if (data.nested && data.type === 'condition') {
      testArray = this.model.get('test')
      nestedConditionID = node.closest('li').attr('data-test-id')
      testArray.tests[nestedConditionID].tests.push(_.copy(this.defaults.tests[data.value], true))
      this.model.set('test', testArray)
      triggerRender()
      return
    }

    // create condition
    if (data.type === 'condition') {
      testArray = _.copy(this.model.get('test'))

      if (checkForMultipleTests(this.el).length > 1) {
        testArray.tests.push(_.copy(this.defaults.tests[data.value], true))
      } else if (checkForMultipleTests(this.el).length === 1) {
        const createdArray = [testArray]
        createdArray.push(_.copy(this.defaults.tests[data.value], true))
        testArray = { id: 'allof' }
        testArray.tests = createdArray
      } else {
        testArray = _.copy(this.defaults.tests[data.value], true)
      }

      this.model.set('test', testArray)
      triggerRender()
      return
    }

    // create action
    if (data.type === 'action') {
      const actionArray = this.model.get('actioncmds')
      actionArray.push(_.copy(this.defaults.actions[data.value], true))

      // if there is a stop action it should always be the last
      if (returnKeyForStop(actionArray) !== undefined) {
        actionArray.splice(returnKeyForStop(actionArray), 1)
        actionArray.push({ id: 'stop' })
        this.model.set('actioncmds', actionArray)
      }
      this.model.set('actioncmds', actionArray)
      triggerRender()
    }
  },

  setModel (type, model, num) {
    // this.subModelHasError = model.validationError !== null;

    if (type === 'test') {
      let testArray = _.copy(this.model.get(type))
      if (checkForMultipleTests(this.el).length > 1) {
        testArray.tests[num] = model.attributes
      } else {
        testArray = model.attributes
      }
      this.model.set(type, testArray)
    } else {
      const actioncmds = _.copy(this.model.get(type))
      actioncmds[num] = model.attributes
      this.model.set(type, actioncmds)
    }
  },

  setNestedModel (model, num) {
    const rootConditionKey = num.split('_')[0]
    const conditionKey = num.split('_')[1]

    const testArray = this.model.get('test')

    const nestedConditionArray = testArray.tests[rootConditionKey]

    nestedConditionArray.tests[conditionKey] = model.attributes

    testArray.tests[rootConditionKey] = nestedConditionArray
    this.model.set('test', testArray)
  },

  onChangeColor (e) {
    e.preventDefault()
    const list = $(e.currentTarget).closest('li[data-action-id]')
    const actionID = list.attr('data-action-id')
    const colorValue = list.find('div.flag').attr('data-color-value')
    const actionArray = _.copy(this.model.get('actioncmds'))

    actionArray[actionID].flags[0] = '$cl_' + colorValue
    this.model.set('actioncmds', actionArray)
    this.render()

    this.$el.find(`[data-action-id="${CSS.escape(actionID)}"] .dropdown-toggle`).focus()
  }

})

ext.point(POINT + '/view').extend({
  index: 150,
  id: 'tests',
  draw (baton) {
    const conditionList = $('<ol class="widget-list list-unstyled tests">')
    const actionList = $('<ol class="widget-list list-unstyled actions">')
    let appliedConditions = baton.model.get('test')
    const ConditionModel = Backbone.Model.extend({
      validate (attrs) {
        const emptyValuesAllowed = ['exists', 'not exists']
        if (_.has(attrs, 'size')) {
          const isValid = util.validateSize({ unit: attrs.unit, size: attrs.sizeValue })
          if (!isValid) {
            this.trigger('invalid:sizeValue')
            return 'sizeValue'
          }
          this.trigger('valid:size')
        }

        if (_.has(attrs, 'headers')) {
          if ($.trim(attrs.headers[0]) === '' && !_.contains(emptyValuesAllowed, attrs.comparison)) {
            if (attrs.values && $.trim(attrs.values[0]) === '' && !_.contains(emptyValuesAllowed, attrs.comparison)) {
              return 'headers values'
            }
            this.trigger('invalid:headers')
            return 'headers'
          }

          if ($.trim(attrs.headers[0]) === '' && _.contains(emptyValuesAllowed, attrs.comparison) && attrs.id === 'header') {
            return 'headers'
          }

          this.trigger('valid:headers')
        }

        if (_.has(attrs, 'source')) {
          if ($.trim(attrs.source[0]) === '' && !_.contains(emptyValuesAllowed, attrs.comparison)) {
            if (attrs.values && $.trim(attrs.values[0]) === '' && !_.contains(emptyValuesAllowed, attrs.comparison)) {
              return 'source values'
            }
            this.trigger('invalid:source')
            return 'headers'
          }

          if ($.trim(attrs.source[0]) === '' && _.contains(emptyValuesAllowed, attrs.comparison) && attrs.id === 'source') {
            return 'source'
          }

          this.trigger('valid:source')
        }

        if (_.has(attrs, 'values')) {
          if (attrs.values && $.trim(attrs.values[0]) === '' && !_.contains(emptyValuesAllowed, attrs.comparison)) {
            this.trigger('invalid:values')
            return 'values'
          }
          this.trigger('valid:values')
        }

        // check for empty nested tests
        if (_.has(attrs, 'tests')) {
          if (_.isEmpty(attrs.tests)) {
            this.trigger('invalid:tests')
            return 'tests'
          }
        }
      }
    })
    let redirectCounter = 0

    appliedConditions = appliedConditions.tests ? appliedConditions.tests : [appliedConditions]

    _(appliedConditions).each(function (condition, conditionKey) {
      const isNested = function () {
        if (condition.tests) return true
      }
      const addClass = isNested() ? 'nested' : ''
      const cmodel = new ConditionModel(condition)

      if (isNested()) {
        // condition point
        ext.point('io.ox/mail/mailfilter/tests').get('nested', function (point) {
          point.invoke('draw', conditionList, baton, conditionKey, cmodel)
        })

        const nestedConditions = condition.tests

        _(nestedConditions).each(function (ncondition, nconditionKey) {
          const cmodel = new ConditionModel(ncondition)
          const assembledKey = conditionKey + '_' + nconditionKey

          cmodel.on('change', function () {
            baton.view.setNestedModel(cmodel, assembledKey)
          })

          // condition point
          ext.point('io.ox/mail/mailfilter/tests').get(cmodel.get('id'), function (point) {
            point.invoke('draw', conditionList, baton, assembledKey, cmodel, filterValues, ncondition, addClass)
          })

          if (!cmodel.isValid()) {
            conditionList.find(`[data-test-id="${CSS.escape(assembledKey)}"] input`).closest('.row').addClass('has-error')
          }
        })
      }

      cmodel.on('change', function () {
        baton.view.setModel('test', cmodel, conditionKey)
      })

      // condition point
      ext.point('io.ox/mail/mailfilter/tests').get(cmodel.get('id'), function (point) {
        point.invoke('draw', conditionList, baton, conditionKey, cmodel, filterValues, condition, addClass)
      })

      // initial validation to disable save button
      if (!cmodel.isValid()) {
        _.each(cmodel.validationError.split(' '), function (name) {
          conditionList.find(`[data-test-id="${CSS.escape(conditionKey)}"] input[name="${CSS.escape(name)}"]`).closest('.row').addClass('has-error')
          if (name === 'tests') conditionList.find(`[data-test-id="${CSS.escape(conditionKey)}"]`).addClass('has-error')
        })
      }
    })

    _(baton.model.get('actioncmds')).each(function (action, actionKey) {
      const ActionModel = Backbone.Model.extend({
        validate (attrs) {
          if (_.has(attrs, 'to')) {
            if ($.trim(attrs.to) === '') {
              this.trigger('invalid:to')
              return 'error'
            }
            this.trigger('valid:to')
          }

          if (_.has(attrs, 'text')) {
            if ($.trim(attrs.text) === '') {
              this.trigger('invalid:text')
              return 'error'
            }
            this.trigger('valid:text')
          }

          if (_.has(attrs, 'flags')) {
            if ($.trim(attrs.flags[0]) === '$' && attrs.id !== 'setflags') {
              this.trigger('invalid:flags')
              return 'error'
            }
            this.trigger('valid:flags')
          }
        }
      })
      const amodel = new ActionModel(action)

      amodel.on('change', function () {
        baton.view.setModel('actioncmds', amodel, actionKey)
      })

      // action point
      if (action.id !== 'stop') {
        ext.point('io.ox/mail/mailfilter/actions').get(amodel.get('id'), function (point) {
          if (point.id === 'redirect') redirectCounter += 1
          point.invoke('draw', actionList, baton, actionKey, amodel, filterValues, action)
        })

        // initial validation to disable save button
        if (!amodel.isValid()) {
          actionList.find(`[data-action-id="${CSS.escape(actionKey)}"] .row`).addClass('has-error')
        }
      }
    })

    const headlineTest = $('<legend>').addClass('sectiontitle conditions').text(gt('Conditions'))
    const headlineActions = $('<legend>').addClass('sectiontitle actions').text(gt('Actions'))
    const notificationConditions = $('<div class="notification-for-conditions">')
    const notificationActions = $('<div class="notification-for-actions">')

    if (_.isEqual(appliedConditions[0], { id: 'true' })) {
      renderWarningForEmptyTests(notificationConditions)
    }

    // disable save button if no action is set
    if (_.isEmpty(baton.model.get('actioncmds'))) {
      renderWarningForEmptyActions(notificationActions)
    }
    const availableRedirects = baton.view.config.options.MAXREDIRECTS - (baton?.view?.collection?.catchAllRedirects || 0)
    this.append(
      headlineTest, notificationConditions, conditionList,
      util.drawDropdown(gt('Add condition'), baton.view.conditionsTranslation, {
        type: 'condition',
        toggle: 'dropdown',
        skip: baton.model.get('test').id === 'true' ? 'nested' : '',
        sort: baton.view.defaults.conditionsOrder,
        classes: 'add-condition main'
      }),
      headlineActions, notificationActions, actionList,
      util.drawDropdown(gt('Add action'), baton.view.actionsTranslations, {
        type: 'action',
        toggle: 'dropup',
        skip: redirectCounter >= availableRedirects ? 'redirect' : '',
        sort: baton.view.defaults.actionsOrder,
        classes: 'add-action'
      })
    )
  }
})

ext.point(POINT + '/view').extend({
  id: 'rulename',
  index: 100,
  draw (baton) {
    this.append(
      $('<label for="rulename">').text(gt('Rule name')),
      new mini.InputView({ name: 'rulename', model: baton.model, className: 'form-control', id: 'rulename' }).render().$el
    )
  }
})

ext.point(POINT + '/view').extend({
  index: 100,
  id: 'appliesto',
  draw (baton) {
    const testsId = baton.model.get('test').id
    const selectionModel = new Backbone.Model({ rule: testsId })
    const optionsSelect = new mini.SelectView({
      list: [{ value: 'allof', label: gt('Apply rule if all conditions are met') }, { value: 'anyof', label: gt('Apply rule if any condition is met') }],
      name: 'rule',
      model: selectionModel,
      id: 'appliestoSelect'
    })
    baton.view.listenTo(selectionModel, 'change', model => { baton.model.get('test').id = model.get('rule') })

    if (testsId === 'allof' || testsId === 'anyof') {
      this.append($('<div>').addClass('line').append(optionsSelect.render().$el))
    } else {
      this.append($('<div>').addClass('line').text(gt('Apply rule if all conditions are met')))
    }
  }
})

ext.point(POINT + '/view').extend({
  index: 200,
  id: 'stopaction',
  draw (baton) {
    const self = this
    const toggleWarning = function () {
      if (baton.model.get('actioncmds').length >= 1) {
        self.find('.alert.alert-danger').remove()
      } else {
        self.find('.alert.alert-danger').remove()
        renderWarningForEmptyActions(self.find('.notification-for-actions'))
      }
      baton.view.$el.trigger('toggle:saveButton')
    }
    const checkStopAction = function (e) {
      currentState = $(e.currentTarget).find('[type="checkbox"]').prop('checked')
      const arrayOfActions = baton.model.get('actioncmds')

      function getCurrentPosition (array) {
        let currentPosition
        _.each(array, function (single, id) {
          if (single.id === 'stop') {
            currentPosition = id
          }
        })

        return currentPosition
      }

      if (currentState === true) {
        arrayOfActions.splice(getCurrentPosition(arrayOfActions), 1)
      } else {
        arrayOfActions.push({ id: 'stop' })
      }
      baton.model.set('actioncmds', arrayOfActions)
      toggleWarning()
    }

    const drawcheckbox = function (value) {
      const guid = _.uniqueId('form-control-label-')
      return $('<div class="control-group mailfilter checkbox custom">').append(
        $('<div class="controls">'),
        $('<label>').attr('for', guid).text(gt('Process subsequent rules')).prepend(
          $('<input type="checkbox" class="sr-only">').attr('id', guid).prop('checked', value),
          $('<i class="toggle" aria-hidden="true">')
        )
      )
    }
    const modalBody = baton.view.dialog.$el.find('.modal-body')
    const arrayOfActions = baton.model.get('actioncmds')

    function checkForStopAction (array) {
      return _.findIndex(array, { id: 'stop' }) === -1
    }

    toggleWarning()

    const target = baton.view.$el.find('.sectiontitle.conditions')

    if (!modalBody.find('[type="checkbox"]').length) {
      _.defer(function () {
        target.prepend(drawcheckbox(checkForStopAction(arrayOfActions)).on('change', checkStopAction))
        baton.view.$el.trigger('toggle:saveButton')
      })
    }
  }
})

export default FilterDetailView
