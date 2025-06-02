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

// cSpell:ignore appliesto, cmodel

import $ from '@/jquery'
import _ from '@/underscore'

import ext from '@/io.ox/core/extensions'

import mini from '@/io.ox/backbone/mini-views'
import util from '@/io.ox/mail/mailfilter/settings/filter/tests/util'
import DatePicker from '@/io.ox/backbone/mini-views/datepicker'
import capabilities from '@/io.ox/core/capabilities'

import gt from 'gettext'

const getTestIds = _.memoize((config) => {
  return config.tests.reduce((memo, val) => {
    memo[val.id] = val
    return memo
  }, {})
})

const isSupportedCondition = _.memoize((action, config) => {
  return getTestIds(config)[action]
})

// function processConfig (config) {
//   const getIdList = function () {
//     const list = {}
//     _.each(config.tests, function (val) {
//       list[val.id] = val
//     })
//     return list
//   }

//   const supportedConditions = getIdList()

// if (config.options.allowNestedTests) {
ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'nested',

  index: 1500,

  supported (config) {
    return config.options.allowNestedTests
  },

  tests: {
    nested: {
      id: 'anyof',
      tests: []
    }
  },

  translations: {
    nested: gt('Nested condition')
  },

  conditionsMapping: {
    nested: ['nested']
  },

  draw (baton, conditionKey) {
    const arrayOfTests = baton.model.get('test').tests[conditionKey]
    const options = {
      target: 'nestedID',
      toggle: 'dropup',
      caret: true,
      type: 'appliesto',
      classes: 'appliesto'
    }
    const optionsSwitch = util.drawDropdown(arrayOfTests.id, { allof: gt('continue if all of these conditions are met'), anyof: gt('continue if any of these conditions are met') }, options)
    const assembled = arrayOfTests.id === 'allof' || arrayOfTests.id === 'anyof' ? optionsSwitch : $('<div>').addClass('line').text(gt('continue if all conditions are met'))
    this.append(
      $('<li>').addClass('filter-settings-view row nestedrule').attr({ 'data-test-id': conditionKey }).append(
        $('<div>').addClass('col-sm-9 singleline').append(
          assembled
        ),
        $('<div>').addClass('col-sm-3 singleline').append(
          util.drawDropdown(gt('Add condition'), baton.view.conditionsTranslation, {
            type: 'condition',
            nested: true,
            toggle: 'dropdown',
            classes: 'add-condition',
            // multi options?
            skip: 'nested',
            sort: baton.view.defaults.conditionsOrder
          })
        ),
        util.drawDeleteButton('test')
      )
    )
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'body',

  index: 700,

  supported (config) {
    return isSupportedCondition('body', config)
  },

  tests (config) {
    return {
      body: {
        id: 'body',
        comparison: util.returnDefault(config.tests, 'body', 'comparisons', 'contains'),
        extensionskey: 'text',
        extensionsvalue: null,
        values: ['']
      }
    }
  },

  translations: {
    body: gt('Body')
  },

  conditionsMapping: {
    body: ['body']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('body_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.body,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.body + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'currentdate',

  index: 1400,

  supported (config) {
    return isSupportedCondition('currentdate', config)
  },

  tests (config) {
    return {
      currentdate: {
        id: 'currentdate',
        comparison: util.returnDefault(config.tests, 'currentdate', 'comparisons', 'ge'),
        datepart: 'date',
        datevalue: [],
        zone: 'original'
      }
    }
  },

  translations: {
    currentdate: gt('Current date')
  },

  conditionsMapping: {
    currentdate: ['currentdate']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    function generateTimezoneValues (from, to) {
      const values = {}
      for (let i = from; i <= to; i += 1) {
        let label = Math.abs(i).toString() + ':00'
        let value = Math.abs(i).toString() + '00'

        label = label.length === 4 ? '0' + label : label
        value = value.length === 3 ? '0' + value : value

        label = i > -1 ? '+' + label : '-' + label
        value = i > -1 ? '+' + value : '-' + value
        values[value] = label
      }
      values.original = gt('original time zone')
      return values
    }

    const timeValues = {
      // #. greater than or equal to
      ge: gt('Greater equals'),
      // #. lower than or equal to
      le: gt('Lower equals'),
      is: gt('Is exactly'),
      'not is': gt('Is not exactly'),
      // #. lower than the given value
      'not ge': gt('Lower'),
      // #. greater than the given value
      'not le': gt('Greater')
    }

    const timezoneValues = generateTimezoneValues(-12, 14)

    const ModifiedDatePicker = DatePicker.extend({
      updateModel () {
        const time = this.getTimestamp()
        if (_.isNull(time) || _.isNumber(time)) {
          this.model[this.model.setDate ? 'setDate' : 'set'](this.attribute, [time], { validate: true })
          this.model.trigger('valid')
        } else {
          this.model.trigger('invalid:' + this.attribute, [gt('Please enter a valid date')])
        }
      }
    })

    let li

    // set to default if not available
    if (!_.has(cmodel.attributes, 'zone') || cmodel.get('zone') === null) cmodel.attributes.zone = 'original'

    cmodel.on('change:datevalue', function () {
      if (cmodel.get('datevalue')[0] === null) {
        baton.view.$el.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').addClass('has-error')
      } else {
        baton.view.$el.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').removeClass('has-error')
      }
      baton.view.$el.trigger('toggle:saveButton')
    })
    this.append(
      li = $('<li>').addClass('filter-settings-view row ' + addClass).attr({ 'data-test-id': conditionKey }).append(
        $('<div>').addClass('col-sm-3 singleline').append(
          $('<span>').addClass('list-title').text(baton.view.conditionsTranslation[condition.id])
        ),
        $('<div>').addClass('col-sm-9').append(
          $('<div>').addClass('row').append(
            $('<div>').addClass('col-sm-4').append(
              new util.DropdownLinkView({ name: 'comparison', model: cmodel, values: filterValues('currentdate', timeValues) }).render().$el
            ),
            $('<div>').addClass('col-sm-4').append(
              new mini.DropdownLinkView({ name: 'zone', model: cmodel, values: timezoneValues }).render().$el
            ),
            $('<div class="col-sm-4">').append(
              new ModifiedDatePicker({
                model: cmodel,
                display: 'DATE',
                attribute: 'datevalue',
                label: gt('datepicker')
              }).render().$el
            )
          )
        ),
        util.drawDeleteButton('test')
      )
    ).find(`[data-test-id="${CSS.escape(conditionKey)}"] label`).addClass('sr-only')
    if (cmodel.get('datevalue')[0] === null || cmodel.get('datevalue').length === 0) this.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').addClass('has-error')

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues('currentdate', timeValues),
      model: cmodel
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'date',

  index: 1300,

  supported (config) {
    return isSupportedCondition('date', config)
  },

  tests (config) {
    return {
      date: {
        id: 'date',
        comparison: util.returnDefault(config.tests, 'date', 'comparisons', 'ge'),
        zone: 'original',
        header: 'Date',
        datepart: 'date',
        datevalue: []
      }
    }
  },

  translations: {
    date: gt('Sent date')
  },

  conditionsMapping: {
    date: ['date']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    function generateTimezoneValues (from, to) {
      const values = {}
      for (let i = from; i <= to; i += 1) {
        let label = Math.abs(i).toString() + ':00'
        let value = Math.abs(i).toString() + '00'

        label = label.length === 4 ? '0' + label : label
        value = value.length === 3 ? '0' + value : value

        label = i > -1 ? '+' + label : '-' + label
        value = i > -1 ? '+' + value : '-' + value
        values[value] = label
      }
      values.original = gt('original time zone')
      return values
    }

    const timeValues = {
      // #. greater than or equal to
      ge: gt('Greater equals'),
      // #. lower than or equal to
      le: gt('Lower equals'),
      is: gt('Is exactly'),
      'not is': gt('Is not exactly'),
      // #. lower than the given value
      'not ge': gt('Lower'),
      // #. greater than the given value
      'not le': gt('Greater')
    }

    const timezoneValues = generateTimezoneValues(-12, 14)

    const ModifiedDatePicker = DatePicker.extend({
      updateModel () {
        const time = this.getTimestamp()
        if (_.isNull(time) || _.isNumber(time)) {
          this.model[this.model.setDate ? 'setDate' : 'set'](this.attribute, [time], { validate: true })
          this.model.trigger('valid')
        } else {
          this.model.trigger('invalid:' + this.attribute, [gt('Please enter a valid date')])
        }
      }
    })
    let li

    // set to default if not available
    if (!_.has(cmodel.attributes, 'zone') || cmodel.get('zone') === null) cmodel.attributes.zone = 'original'

    cmodel.on('change:datevalue', function () {
      if (cmodel.get('datevalue')[0] === null) {
        baton.view.$el.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').addClass('has-error')
      } else {
        baton.view.$el.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').removeClass('has-error')
      }
      baton.view.$el.trigger('toggle:saveButton')
    })

    this.append(
      li = $('<li>').addClass('filter-settings-view row ' + addClass).attr({ 'data-test-id': conditionKey }).append(
        $('<div>').addClass('col-sm-3 singleline').append(
          $('<span>').addClass('list-title').text(baton.view.conditionsTranslation[condition.id])
        ),
        $('<div>').addClass('col-sm-9').append(
          $('<div>').addClass('row').append(
            $('<div>').addClass('col-sm-4').append(
              new util.DropdownLinkView({ name: 'comparison', model: cmodel, values: filterValues('date', timeValues) }).render().$el
            ),
            $('<div>').addClass('col-sm-4').append(
              new mini.DropdownLinkView({ name: 'zone', model: cmodel, values: timezoneValues }).render().$el
            ),
            $('<div class="col-sm-4">').append(
              new ModifiedDatePicker({
                model: cmodel,
                display: 'DATE',
                attribute: 'datevalue',
                label: gt('datepicker'),
                timezoneButton: false
              }).render().$el
            )
          )
        ),
        util.drawDeleteButton('test')
      )
    ).find(`[data-test-id="${CSS.escape(conditionKey)}"] label`).addClass('sr-only')
    if (cmodel.get('datevalue')[0] === null || cmodel.get('datevalue').length === 0) this.find(`[data-test-id="${CSS.escape(conditionKey)}"] input.datepicker-day-field`).closest('.row').addClass('has-error')

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues('date', timeValues),
      model: cmodel
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'envelope',

  index: 900,

  supported (config) {
    return isSupportedCondition('envelope', config)
  },

  tests (config) {
    return {
      envelope: {
        id: 'envelope',
        comparison: util.returnDefault(config.tests, 'envelope', 'comparisons', 'is'),
        addresspart: util.returnDefault(config.tests, 'envelope', 'parts', 'all'),
        headers: [util.returnDefault(config.tests, 'envelope', 'headers', 'to')],
        values: ['']
      }
    }
  },

  translations: {
    envelope: gt('Envelope')
  },

  conditionsMapping: {
    envelope: ['envelope']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const headerValues = {
      to: gt('To'),
      from: gt('From')
    }
    const addressValues = {
      all: gt('All'),
      localpart: gt('Local-part'),
      domain: gt('Domain'),
      user: gt('User'),
      detail: gt('Detail')
    }; let li

    const inputId = _.uniqueId('envelope_')
    this.append(
      li = util.drawCondition({
        layout: '3',
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.envelope,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        seconddropdownOptions: { name: 'headers', model: cmodel, values: util.filterHeaderValues(baton.config.tests, 'envelope', headerValues), saveAsArray: true },
        thirddropdownOptions: { name: 'addresspart', model: cmodel, values: util.filterPartValues(baton.config.tests, 'envelope', addressValues) },
        inputLabel: baton.view.conditionsTranslation.envelope + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'header',

  index: 1000,

  supported (config) {
    return isSupportedCondition('header', config)
  },

  order: ['cleanHeader'],

  tests (config) {
    return {
      cleanHeader: {
        comparison: util.returnDefault(config.tests, 'header', 'comparisons', 'matches'),
        headers: [''],
        id: 'header',
        values: ['']
      }
    }
  },

  translations: {
    cleanHeader: gt('Header')
  },

  conditionsMapping: {
    header: ['cleanHeader']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const secondInputId = _.uniqueId('values')
    let li

    const title = baton.view.conditionsTranslation.cleanHeader
    const inputId = _.uniqueId('header_')

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputOptions: { name: 'headers', model: cmodel, className: 'form-control', id: inputId },
        secondInputId,
        secondInputLabel: title + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        secondInputOptions: { name: 'values', model: cmodel, className: 'form-control', id: secondInputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[baton.view.defaults.conditionsMapping[condition.id]]
    })
  }
})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'subject',

  index: 600,

  supported (config) {
    return isSupportedCondition('subject', config)
  },

  tests (config) {
    return {
      subject: {
        comparison: util.returnDefault(config.tests, 'subject', 'comparisons', 'contains'),
        headers: ['Subject'],
        id: 'subject',
        values: ['']
      }
    }
  },

  translations: {
    subject: gt('Subject')
  },

  conditionsMapping: {
    subject: ['subject']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('subject_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.subject,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.subject + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[condition.id]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'from',

  index: 100,

  supported (config) {
    return isSupportedCondition('from', config)
  },

  tests (config) {
    return {
      from: {
        comparison: util.returnDefault(config.tests, 'from', 'comparisons', 'contains'),
        headers: ['From'],
        id: 'from',
        values: ['']
      }
    }
  },

  translations: {
    from: gt('From')
  },

  conditionsMapping: {
    from: ['from']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('from_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.from,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()), tooltips: util.returnDefaultToolTips() },
        inputLabel: baton.view.conditionsTranslation.from + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[baton.view.defaults.conditionsMapping[condition.id]]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'to',

  index: 200,

  supported (config) {
    return isSupportedCondition('to', config)
  },

  tests (config) {
    return {
      to: {
        comparison: util.returnDefault(config.tests, 'to', 'comparisons', 'contains'),
        headers: ['To'],
        id: 'to',
        values: ['']
      }
    }
  },

  translations: {
    to: gt('To')
  },

  conditionsMapping: {
    to: ['to']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('to_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.to,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.to + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[baton.view.defaults.conditionsMapping[condition.id]]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'cc',

  index: 300,

  supported (config) {
    return isSupportedCondition('cc', config)
  },

  tests (config) {
    return {
      cc: {
        comparison: util.returnDefault(config.tests, 'cc', 'comparisons', 'contains'),
        headers: ['Cc'],
        id: 'cc',
        values: ['']
      }
    }
  },

  translations: {
    cc: gt('Cc')
  },

  conditionsMapping: {
    cc: ['cc']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('cc_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.cc,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.cc + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[baton.view.defaults.conditionsMapping[condition.id]]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'anyrecipient',

  index: 400,

  supported (config) {
    return isSupportedCondition('anyrecipient', config)
  },

  tests (config) {
    return {
      anyrecipient: {
        comparison: util.returnDefault(config.tests, 'anyrecipient', 'comparisons', 'contains'),
        headers: ['To', 'Cc'],
        id: 'anyrecipient',
        values: ['']
      }
    }
  },

  translations: {
    anyrecipient: gt('Any recipient')
  },

  conditionsMapping: {
    anyrecipient: ['anyrecipient']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('anyrecipient_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.anyrecipient,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.anyrecipient + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[condition.id]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'mailinglist',

  index: 500,

  supported (config) {
    return isSupportedCondition('mailinglist', config)
  },

  tests (config) {
    return {
      mailinglist: {
        comparison: util.returnDefault(config.tests, 'mailinglist', 'comparisons', 'contains'),
        headers: ['List-Id', 'X-BeenThere', 'X-Mailinglist', 'X-Mailing-List'],
        id: 'mailinglist',
        values: ['']
      }
    }
  },

  translations: {
    mailinglist: gt('Mailing list')
  },

  conditionsMapping: {
    mailinglist: ['mailinglist']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('mailinglist_')
    let li

    this.append(
      li = util.drawCondition({
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.mailinglist,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputLabel: baton.view.conditionsTranslation.mailinglist + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })

    util.handleSpecialComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values',
      defaults: baton.view.defaults.tests[baton.view.defaults.conditionsMapping[condition.id]]
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'size',

  index: 1200,

  supported (config) {
    return isSupportedCondition('size', config)
  },

  tests (config) {
    return {
      size: {
        comparison: util.returnDefault(config.tests, 'size', 'comparisons', 'over'),
        id: 'size',
        size: ''
      }
    }
  },

  translations: {
    size: gt('Size')
  },

  conditionsMapping: {
    size: ['size']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const inputId = _.uniqueId('size_')
    const sizeValues = {
      over: gt('Is bigger than'),
      under: gt('Is smaller than')
    }; let li

    const unitValues = {
      B: 'Byte',
      K: 'kB',
      M: 'MB',
      G: 'GB'
    }

    const sizeValueView = new util.Input({ name: 'sizeValue', model: cmodel, className: 'form-control', id: inputId })

    const size = cmodel.get('size')
    let unit = size.charAt(size.length - 1)
    let number = size.substring(0, size.length - 1)

    if (!unitValues[unit]) {
      unit = null
      number = cmodel.get('size')
    }

    // initial states
    cmodel.set('unit', unit || 'B', { silent: true })
    cmodel.set('sizeValue', number, { silent: true })

    cmodel.on('change:sizeValue change:unit', function () {
      // workaround to trigger validation on sizevalue-input also when unit changes
      if (this.changed.unit) sizeValueView.onKeyup()
      this.set('size', this.get('sizeValue') + this.get('unit'))
    })

    this.append(
      li = $('<li>').addClass('filter-settings-view row ' + addClass).attr({ 'data-test-id': conditionKey }).append(
        $('<div>').addClass('col-sm-3 singleline').append(
          $('<span>').addClass('list-title').text(baton.view.conditionsTranslation[condition.id])
        ),
        $('<div>').addClass('col-sm-9').append(
          $('<div>').addClass('row').append(
            $('<div>').addClass('col-sm-7').append(
              new util.DropdownLinkView({ name: 'comparison', model: cmodel, values: filterValues(condition.id, sizeValues) }).render().$el
            ),
            $('<div class="col-sm-4">').append(
              sizeValueView.render().$el
            ),
            $('<div>').addClass('col-sm-1 no-padding-left').append(
              new mini.DropdownLinkView({ name: 'unit', model: cmodel, values: unitValues }).render().$el,
              new mini.ErrorView({ selector: '.row' }).render().$el
            )
          )
        ),
        util.drawDeleteButton('test')
      )
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, sizeValues),
      model: cmodel,
      inputName: 'size'
    })
  }

})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'address',

  index: 800,

  supported (config) {
    return isSupportedCondition('address', config)
  },

  tests (config) {
    return {
      address: {
        id: 'address',
        addresspart: util.returnDefault(config.tests, 'address', 'parts', 'all'),
        comparison: util.returnDefault(config.tests, 'address', 'comparisons', 'is'),
        headers: [util.returnDefault(config.tests, 'address', 'headers', 'from')],
        values: ['']
      }
    }
  },

  translations: {
    address: gt('Email address')
  },

  conditionsMapping: {
    address: ['address']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const config = baton.config
    const addressValues = {
      all: gt('All'),
      localpart: gt('Local-part'),
      domain: gt('Domain'),
      user: gt('User'),
      detail: gt('Detail')
    }
    const headerValues = {
      from: gt('From'),
      to: gt('To'),
      cc: gt('Cc'),
      bcc: gt('Bcc'),
      sender: gt('Sender'),
      // #. header entry - needs no different translation
      'resent-from': gt('Resent-From'),
      // #. header entry - needs no different translation
      'resent-to': gt('Resent-To')
    }
    const inputId = _.uniqueId('address_')
    let li

    this.append(
      li = util.drawCondition({
        layout: '3',
        conditionKey,
        inputId,
        title: baton.view.conditionsTranslation.address,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        seconddropdownOptions: { name: 'headers', model: cmodel, values: util.filterHeaderValues(config.tests, 'address', headerValues), saveAsArray: true },
        thirddropdownOptions: { name: 'addresspart', model: cmodel, values: util.filterPartValues(config.tests, 'address', addressValues) },
        inputLabel: baton.view.conditionsTranslation.address + ' ' + addressValues[cmodel.get('comparison')],
        inputOptions: { name: 'values', model: cmodel, className: 'form-control', id: inputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })
  }
})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'string',

  index: 1000,

  supported (config) {
    return isSupportedCondition('string', config)
  },

  tests (config) {
    return {
      string: {
        comparison: util.returnDefault(config.tests, 'string', 'comparisons', 'matches'),
        source: [''],
        id: 'string',
        values: ['']
      }
    }
  },

  translations: {
    string: gt('String')
  },

  conditionsMapping: {
    string: ['string']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    const secondInputId = _.uniqueId('values')
    let li

    const title = baton.view.conditionsTranslation.string
    const inputId = _.uniqueId('string_')

    this.append(
      li = util.drawCondition({
        conditionKey,
        title,
        dropdownOptions: { name: 'comparison', model: cmodel, values: filterValues(condition.id, util.returnContainsOptions()) },
        inputId,
        InputLabel: gt('Source'),
        inputOptions: { name: 'source', model: cmodel, className: 'form-control', id: inputId },
        secondInputId,
        secondInputLabel: title + ' ' + util.returnContainsOptions()[cmodel.get('comparison')],
        secondInputOptions: { name: 'values', model: cmodel, className: 'form-control', id: secondInputId },
        errorView: true,
        addClass
      })
    )

    util.handleUnsupportedComparisonValues({
      $li: li,
      values: filterValues(condition.id, util.returnContainsOptions()),
      model: cmodel,
      inputName: 'values'
    })
  }
})

ext.point('io.ox/mail/mailfilter/tests').extend({

  id: 'guard_verify',

  index: 500,

  supported (config) {
    return isSupportedCondition('guard_verify', config) && capabilities.has('guard-mail')
  },

  tests: {
    guard_verify: {
      id: 'guard_verify',
      comparison: 'is'
    }
  },

  translations: {
    guard_verify: gt('PGP signature')
  },

  conditionsMapping: {
    guard_verify: ['guard_verify']
  },

  draw (baton, conditionKey, cmodel, filterValues, condition, addClass) {
    this.append(
      $('<li class="filter-settings-view row">').addClass(addClass).attr('data-test-id', conditionKey).append(
        $('<div class="col-sm-3 singleline">').append(
          $('<span class="list-title">').text(baton.view.conditionsTranslation.guard_verify)
        ),
        $('<div class="col-sm-9">').append(
          $('<div class="col-sm-9">').append($('<div class="row">').append(
            // #. Tests for PGP Signature.
            new util.DropdownLinkView({ name: 'comparison', model: cmodel, values: { is: gt('The signature exists and is valid'), 'not is': gt('The signature is missing or is not valid') } }).render().$el)
          )),
        util.drawDeleteButton('test')))
  }

})
