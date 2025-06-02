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
import Backbone from '@/backbone'
import _ from '@/underscore'
import ox from '@/ox'
import moment from '@open-xchange/moment'

import ExtensibleView from '@/io.ox/backbone/views/extensible'
import mini from '@/io.ox/backbone/mini-views/common'
import Index from '@/io.ox/contacts/addressbook/index'
import addressItems from '@/io.ox/contacts/addressbook/items'
import '@/io.ox/backbone/views/search.scss'
import { createButton, createLabel } from '@/io.ox/core/components'

import gt from 'gettext'
import { CategoryIndex } from '@/io.ox/core/categories/index'
import { AutoCompleteCategoriesItems } from '@/io.ox/core/categories/view'
import { controller as notificationAreaController } from '@/io.ox/core/notifications/main'

let addressIndex
let yelled = false

const i18n = {
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  after: gt.pgettext('search', 'after'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  before: gt.pgettext('search', 'before'),
  // #. search terms must be one word (without spaces), lowercase, and must be unique per app
  // #. "yes" is used for filters that work like checkboxes, e.g. attachments:yes
  yes: gt.pgettext('search', 'yes')
}

const SearchView = ExtensibleView.extend({

  className: 'search-container',

  events: {
    'click .submit-button': 'onSubmit',
    'click .cancel-button': 'onCancel',
    'click .dropdown-toggle': 'onToggle',
    'click [data-remove-filter]': 'onRemoveFilter',
    'input .search-field': 'onInput',
    'focus .search-field,.cancel-button,.dropdown-toggle': 'onFocus',
    'blur .search-field,.cancel-button,.dropdown-toggle': 'onBlur',
    keyup: 'onKeyUp',
    'submit .dropdown': 'onSubmit'
  },

  constructor: function (options = {}) {
    ExtensibleView.prototype.constructor.apply(this, arguments)
    this.defaults = options.defaults || {}
    this.model = new Backbone.Model({ ...{ words: '' }, ...this.defaults })
    this.hasAutocomplete = options.autocomplete !== false
    this.showFilterDropdown = options.showFilterDropdown !== false
    this.filters = new Filters()
    this.app = options.app
    this.addressDefaultFilter = options.addressDefaultFilter ?? 'email'
    this.$el.addClass('search-view')
    const defaultFields = { ...options.defaultFields }
    const defaultTimeRange = { ...options.defaultTimeRange }

    // share one index across all instances
    if (!addressIndex) addressIndex = new Index()
    this.$input = $('<input type="search" class="search-field" spellcheck="false" autocomplete="off">')
    const autoSuggest = options.autoSuggest || (() => [])
    this.autocomplete = new AutoComplete(this.$input, {
      filters: this.filters,
      addressDefaultFilter: this.addressDefaultFilter,
      getFiltersFromAutoComplete: options.getFiltersFromAutoComplete,
      defaultFields,
      defaultTimeRange,
      autoSuggest
    })

    // rely on app window events to prevent rendering duplicate search views when switching apps
    if (this.app?.getWindow()) this.$el.hide()
    this.app?.getWindow().on({ show: async () => this.show(), hide: async () => this.hide() })
    this.app?.on('folder:change', async () => this.cancel())
    this.app?.folderView.tree.$el.on('click', '.folder.selected', async () => this.cancel())
    const mouseDownHandler = async (e) => this.closeDropdown(e)
    $(document).on('mousedown', mouseDownHandler)

    // default filters
    this.filters.define('words', '', '', 'string', true, false)
    // additional filters
    if (options.filters) {
      options.filters.forEach(([id, label, prefix, type, unique = true, visible = true, options]) => {
        this.filters.define(id, label, prefix, type, unique, visible, options)
      })
    }
    this.on('dispose', () => $(document).off('mousedown', mouseDownHandler))
  },

  render () {
    const id = _.uniqueId('label')
    this.$el.append(
      this.$submit = createButton({ variant: 'toolbar', icon: { name: 'bi/search.svg', title: gt('Search') } })
        .addClass('submit-button me-8'),
      createLabel({ for: id, text: this.options.placeholder })
        .addClass('sr-only'),
      $('<form class="search-field-wrapper" autocomplete="off">').append(
        this.$input
          .attr({ placeholder: this.options.placeholder || '', id })
          .on('submit', () => { this.submit() })),
      this.$cancel = createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Cancel search') } })
        .addClass('cancel-button ms-8').hide(),
      this.$dropdownToggle = createButton({ variant: 'toolbar', icon: { name: 'bi/chevron-down.svg', className: 'bi-12', title: gt('More search options') } })
        .attr({ 'aria-haspopup': true, 'aria-expanded': false })
        .addClass('dropdown-toggle')
        .toggle(!!this.showFilterDropdown),
      this.$dropdown = $('<form class="dropdown" autocomplete="off">'),
      this.autocomplete.$ul,
      this.$filters = $('<div class="filters flex-row">').hide()
    )

    this.invoke('render')
    this.filters.add('folder', this.defaults.folder)

    return this
  },

  hide () {
    this.trigger('before:hide')
    this.$el.hide()
    this.trigger('hide')
  },

  show () {
    this.trigger('before:show')
    this.$el.show()
    this.renderFilters()
    this.trigger('show')
  },

  toggleCancel () {
    const equalWithoutWords = _.isEqual(this.model.attributes, { ...this.defaults, ...{ words: this.model.attributes.words } })
    const equal = _.isEqual(this.model.attributes, this.defaults)
    if (!this.$input.val() && equalWithoutWords) this.$cancel.hide()
    else this.$cancel.toggle(!!this.$input.val() || !equal)
  },

  onInput () {
    this.toggleCancel()
    if (!this.hasAutocomplete) return
    this.autocomplete.onInput()
  },

  applyFilters () {
    Object.entries(this.model.attributes).forEach(([key, value]) => {
      // clean up value
      if (this.filters.getType(key) === 'date') {
        const date = parseDate(value)
        if (!date.isValid()) return
        value = date.valueOf()
      } else {
        value = String(value || '').trim()
      }
      if (this.filters.isUnique(key)) this.filters.add(key, value)
      else {
        String(value).match(/[^\s"']+|"([^"]*)"|'([^']*)'/g)?.forEach(value => {
          // last defense against empty inputs (you can construct some hard to detect space and " traps)
          if (isEmptyWord(value)) return
          this.filters.add(key, value)
        })
      }
    })
  },

  addFilter (id, label, prefix, type = 'string', unique = true, visible = false, options) {
    this.filters.define(id, label, prefix, type, unique, visible, options)
    return this
  },

  renderFilters () {
    const entries = this.filters.entries()
      .filter(([key, { value, visible, id }]) => visible && !!value && !/^(words)$/.test(id) && !(value === this.defaults[id]))
    $('#io-ox-core').toggleClass('show-search-filters', entries.length > 0)
    this.$filters
      .empty()
      .append(
        $('<div class="filters-centered flex-row">').append(
          entries.map(([key, filter]) => this.renderFilter(filter))
        )
      )
      .show()
  },

  renderFilter ({ id, value, label, type, visible } = {}) {
    // we don't render words or words as visible filters again
    if (!visible) return $()
    // don't show negative toggles (might happend, e.g. if users type "flagged:false")
    const isBool = type === 'checkbox'
    if (isBool && value === 'false') return $()
    // beautify dates
    let text = ''
    if (type === 'date') text = moment(value, 'x').format('l')
    // don't show 'true' as value; in those cases the name is enough
    else if (type === 'checkbox') text = ''
    else if (type === 'list') text = this.filters.getOption(id, value) || value
    else text = value.replaceAll(/^['"]|['"]$/g, '')
    return $('<div class="filter flex-row">')
      .append(
        $('<span class="content ms-8 me-4 truncate flex-grow">').append(
          $('<span>').text(label),
          $.txt(' '),
          $('<span class="text-bold">').text(text)
        ),
        createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Remove filter "%1$s %2$s"', label, text) } })
          .attr('data-remove-filter', id)
          .attr('data-remove-value', value)
      )
  },

  onRemoveFilter (e) {
    const $el = $(e.currentTarget)
    const filterKey = $el.attr('data-remove-filter')
    this.filters.delete(filterKey, $el.attr('data-remove-value'))
    this.model.set(filterKey, this.defaults[filterKey] || '')
    this.submit()
    this.renderFilters()
    this.$input.focus()
  },

  clear () {
    this.filters.clear()
    this.renderFilters()
    this.model.clear().set(this.options.defaults)
    this.filters.add('folder', this.defaults.folder)
  },

  onCancel () {
    this.cancel()
    this.$input.focus()
    this.$cancel.hide()
  },

  onFocus (e) {
    this.$el.addClass('has-focus')
    if ($(e.currentTarget).is(this.$input)) this.toggleDropdown(false)
  },

  onBlur (e) {
    if ($(e.relatedTarget).parent().is(this.$el)) return
    this.$el.removeClass('has-focus')
  },

  onToggle () {
    this.toggleDropdown()
  },

  toggleDropdown (state) {
    const inside = this.isFocusInsideDropdown()
    if (state === undefined) state = !this.isDropdownOpen()
    this.$el.toggleClass('open', state)
    this.$dropdownToggle.attr('aria-expanded', state)
    this.trigger(state ? 'open' : 'close')
    this.autocomplete.empty()
    // set focus
    if (state) {
      this.$dropdown.find(':input:first').focus()
      this.setModel(this.parseQuery(this.$input.val()))
      this.$cancel.show()
    } else if (inside) {
      this.$dropdownToggle.focus()
    } else if (!state) this.toggleCancel()
    // keep input and dropdown aligned
    return state
  },

  closeDropdown (e) {
    if (!this.isDropdownOpen()) return
    // click inside dropdown?
    if ($.contains(this.el, e.target)) return
    // or datepickers (which is somewhere else in the DOM)
    if ($(e.target).closest('.date-picker').length) return
    this.toggleDropdown(false)
  },

  isDropdownOpen () {
    return this.$el.hasClass('open')
  },

  onKeyUp (e) {
    if (e.which !== 27) return
    this.toggleDropdown(false)
    this.$dropdownToggle.focus()
  },

  onSubmit (e) {
    e.preventDefault()
    setTimeout(this.submit.bind(this), 0)
  },

  submit () {
    // avoid late dropdown after submit
    _.lfo(this.autocomplete.renderCallback)()
    if (this.isDropdownOpen()) {
      this.filters.clear()
      this.toggleDropdown(false)
    } else {
      this.model.set({ ...this.defaults, ...this.filters.toJSON() })
      this.setModel(this.parseQuery(this.$input.val()))
    }
    this.applyFilters()
    this.renderFilters()
    this.$input.val(this.model.get('words'))

    if (this.isEmpty()) return this.propagateCancel()

    this.$input.focus()
    if (ox.debug) console.debug('SearchView.submit()', JSON.stringify(this.filters.toJSON()))
    this.propagateSearch(this.filters.toJSON())
    // just yell once
    if (yelled) return
    this.$el.popover('show')
    yelled = true
    $(document).one('click', this.$el.popover.bind(this.$el, 'hide'))
  },

  isEmpty () {
    return !Object.entries(this.filters.toJSON())
      .some(([key, value]) => {
        if (!value) return false
        // folder alone does not count as search parameter
        if (key === 'folder') return false
        // ignore any default value
        if (value === this.defaults[key]) return false
        return true
      })
  },

  propagateSearch (criteria) {
    this.app?.props.set('searching', true)
    this.trigger('search', criteria)
  },

  cancel () {
    this.clear()
    this.$input.val('')
    this.toggleDropdown(false)
    this.autocomplete.empty()
    this.propagateCancel()
  },

  propagateCancel () {
    // hide cancel in any case (pressing search in the dropdown with empty filters needs this.)
    this.$cancel.hide()
    if (this.app && !this.app.props.get('searching')) return
    this.app?.props.set('searching', false)
    return this.trigger('cancel')
  },

  input (name, label, dataListField) {
    this.addFilter(name, label, '', 'string')
    if (!this.model.has(name)) this.model.set(name, '', { silent: true })
    const [$label, $input] = mini.getInputWithLabel(name, label, this.model)
    const $group = $('<div class="form-group">').append($label, $input)
    if (dataListField) {
      const id = _.uniqueId('datalist_')
      $input.attr('list', id)
      $group.append($('<datalist>').attr({ id, 'data-field': dataListField }))
      this.on('open', fillDataList(dataListField))
    } else {
      // 'off' will not work in Chrome; an invalid '0' works
      $input.attr('autocomplete', '0')
    }
    return $group
  },

  checkbox (name, label) {
    this.addFilter(name, label, '', 'checkbox')
    if (!this.model.has(name)) this.model.set(name, false, { silent: true })
    return new mini.CustomCheckboxView({ name, label, model: this.model }).render().$el
  },

  categoryInput (name, label) {
    this.addFilter(name, label, '', 'string')
    if (!this.model.has(name)) this.model.set(name, '', { silent: true })
    const [$label, $input] = mini.getInputWithLabel(name, label, this.model)
    const autocomplete = new AutoComplete($input, {
      addressDefaultFilter: 'name',
      customIndex: CategoryIndex,
      customItems: AutoCompleteCategoriesItems
    })
    if (this.hasAutocomplete) {
      $input.on('input', autocomplete.onInput.bind(autocomplete))
      const view = $input.data('view')
      const onChange = $.proxy(view.onChange, view)
      const events = _.device('firefox') ? 'change' : 'change blur'
      // skip 'onChange' handler while the autocomplete is open
      // otherwise using the mouse causes change and blur and we get unwanted substrings as filters
      autocomplete.$ul.on('toggle', (e, state) => {
        view.$el.off(events)
        if (!state) view.$el.on(events, onChange)
      })
    }
    return $('<div class="form-group">').append($label, $input, autocomplete.$ul)
  },

  address (name, label) {
    this.addFilter(name, label, '', 'string')
    if (!this.model.has(name)) this.model.set(name, '', { silent: true })
    const [$label, $input] = mini.getInputWithLabel(name, label, this.model)
    const autocomplete = new AutoComplete($input, { addressDefaultFilter: 'email' })
    if (this.hasAutocomplete) {
      $input.on('input', this.autocomplete.onInput.bind(autocomplete))
      const view = $input.data('view')
      const onChange = $.proxy(view.onChange, view)
      const events = _.device('firefox') ? 'change' : 'change blur'
      // skip 'onChange' handler while the autocomplete is open
      // otherwise using the mouse causes change and blur and we get unwanted substrings as filters
      autocomplete.$ul.on('toggle', (e, state) => {
        view.$el.off(events)
        if (!state) view.$el.on(events, onChange)
      })
    }
    return $('<div class="form-group">').append($label, $input.attr('autocomplete', '0'), autocomplete.$ul)
  },

  select (name, label, list) {
    this.addFilter(name, label, '', 'string')
    if (!this.model.has(name)) this.model.set(name, '', { silent: true })
    const guid = _.uniqueId('form-control-label-')
    return $('<div class="form-group">').append(
      $('<label>').attr('for', guid).text(label),
      new mini.SelectView({ name, id: guid, list, model: this.model }).render().$el
    )
  },

  dateRange ({ mandatoryAfter = false, mandatoryBefore = true } = {}) {
    const a = _.uniqueId('form-control-label-')
    const b = _.uniqueId('form-control-label-')
    this.addFilter('after', gt('After'), i18n.after, 'date', true, true)
    this.addFilter('before', gt('Before'), i18n.before, 'date', true, true)
    if (!this.model.has('after')) this.model.set('after', '', { silent: true })
    if (!this.model.has('before')) this.model.set('before', '', { silent: true })
    return $('<div class="form-group row">').append(
      $('<div class="col-md-6">').append(
        // #. Context: Search. Label for date control.
        $('<label>').attr('for', a).text(gt('After')),
        new mini.DateView({ name: 'after', id: a, model: this.model, mandatory: mandatoryAfter }).render().$el
      ),
      $('<div class="col-md-6">').append(
        // #. Context: Search. Label for date control.
        $('<label>').attr('for', b).text(gt('Before')),
        new mini.DateView({ name: 'before', id: b, model: this.model, mandatory: mandatoryBefore }).render().$el
      )
    )
  },

  button () {
    return $('<div class="row">').append(
      $('<div class="col-xs-12 text-right">').append(
        $('<button type="submit" class="btn btn-primary">').text(gt('Search'))
      )
    )
  },

  isFocusInsideDropdown () {
    return $.contains(this.$dropdown[0], document.activeElement)
  },

  setModel (data) {
    if (_.isEmpty(data)) {
      this.filters.add('words', '')
      this.model.set('words', '')
      return
    }
    // needed for resetting words correctly
    if (!data.words) data.words = ''
    this.model.set({ ...this.defaults, ...this.filters.toJSON() })
    this.model.set(data)
  },

  parseQuery (input) {
    const words = []
    const result = {}
    const inputValue = input.trim()
    if (!inputValue) return
    getWords(inputValue).forEach(word => {
      let filter
      // we don't touch 'word' to keep the user input as-is
      const [prefix, value, valueLowercase] = getPrefixAndValues(word)
      if (prefix && value) filter = this.filters.getFromPrefix(prefix)
      if (filter) {
        switch (this.filters.getType(filter)) {
          case 'date': {
            const date = parseDate(value)
            if (!date.isValid()) return
            result[filter] = date.valueOf()
            break
          }
          case 'list': {
            if (!this.filters.isValidOption(filter, value)) return
            result[filter] = valueLowercase
            break
          }
          case 'checkbox':
            result[filter] = /^(true|yes|yep|ja|oui|sim?|hai|1)$/.test(valueLowercase) || valueLowercase === i18n.yes ? 'true' : undefined
            break
          default:
            if (this.filters.isUnique(filter)) {
              result[filter] = value
            } else if (!result[filter] || !result[filter].split(' ').includes(value)) {
              // need to init this as empty string
              if (result[filter] === undefined) {
                result[filter] = value
              } else {
                result[filter] += ' ' + value
              }
            }
            break
        }
      } else if (/^[^@]+@[^@\s]*?\.\w+$/.test(word) && this.options.addressDefaultFilter) {
        result[this.addressDefaultFilter] = word
      } else {
        words.push(word)
      }
    })
    const w = words.filter(Boolean).join(' ')
    if (w) result.words = w
    return result
  }
})

function parseDate (value) {
  return moment(value, ['l', 'D.M.YYYY', 'D.M.YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-M-D', 'x'], true)
}

// utilities
SearchView.quote = function (word) {
  return /\s/.test(word) ? `"${word}"` : word
}

SearchView.convertOptions = function (list) {
  return _(list).mapObject((value, key) => { return { value: key, label: value } })
}

function getWords (rawinput) {
  let words = rawinput.split(/(\w+:\s*(?:"[^"]+"|\S+)|"[^"]+"|\S+)/)
  words = words.map(word => word.trim())
  words = words.filter(Boolean)
  return words
}

function getPrefixAndValues (word) {
  let [prefix, value] = word.split(':', 2)
  let valueLowercase
  prefix = prefix.toLowerCase()
  if (isEmptyWord(value)) value = ''
  if (prefix && value) {
    value = value.trim()
    valueLowercase = value.toLowerCase()
    return [prefix, value, valueLowercase]
  }
  return [prefix]
}
// returns only the words if there are any, otherwise empty string
function queryHasWords (input) {
  const words = getWords(input.trim())
  const hasWord = words.filter(word => {
    const [prefix, value] = getPrefixAndValues(word)
    return prefix && !value
  })
  return hasWord.join(' ')
}
const regLastWord = /((?:\w+:)?"[^"]+"|\w+:\S+|[^\s"]+)$/
const regWord = /^((\w+):)?(?:("([^"]+)(?:"|$))|(.*)$)/

function getLastWord (input = '') {
  // prepare input
  // We get some false positives in the regex in some cases with mixed quoted and unquoted input otherwise
  // remove excess characters at the end
  input = input.replace(/[\s"]*$/, '')
  // make sure all quotations are closed
  if ((input.match(/"/g)?.length || 0) % 2 === 1) input = input + '"'

  const words = input.match(regLastWord)
  // get last word without prefix (like "from:"")
  let word = words ? words[words.length - 1].trim() : ''
  // last defense against empty inputs (you can construct some hard to detect space and " traps)
  if (isEmptyWord(word)) word = ''
  const match = word.match(regWord)
  return { prefix: match[2] || '', word, typed: match[3] || match[5], unquoted: match[4] || match[5] }
}

// checks if the word only consists of spaces or quotation marks, aka. is empty
function isEmptyWord (word = '') {
  return word.replace(/[\s"]*/g, '').length === 0
}

function Filters () {
  const values = []
  const definitions = {}

  this.define = function (id, label, prefix, type = 'string', unique = true, visible = false, options = {}) {
    id = String(id).toLowerCase()
    // avoid redefinitions
    if (definitions[id]) return
    prefix = String(prefix || label).toLowerCase()
    definitions[id] = { id, label, prefix, type, unique, visible, options }
  }

  this.isDefined = function (id) {
    return !!definitions[id]
  }

  this.isValidPrefix = function (prefix) {
    return !!this.getFromPrefix(prefix)
  }

  // resolve prefix from translated string to english, or try english if not found
  this.getFromPrefix = function (prefix) {
    return Object.values(definitions).find(filter => filter.prefix === prefix)?.id || (definitions[prefix] ? definitions[prefix].id : undefined)
  }

  this.isValidOption = function (id, option) {
    return !!this.getOption(id, option)
  }

  this.getOption = function (id, option) {
    return definitions[id]?.options[option]
  }

  this.isUnique = function (id) {
    return definitions[id]?.unique !== false
  }

  this.getType = function (id) {
    return definitions[id]?.type
  }

  this.getLabel = function (id) {
    return definitions[id]?.label
  }

  this.getPrefix = function (id) {
    return definitions[id]?.prefix
  }

  this.indexOf = function (id, value) {
    // value might come in as string and dates are timestamps, i.e. numbers
    return values.findIndex(filter => filter.id === id && (value === undefined || String(filter.value) === String(value)))
  }

  this.add = function (id, value) {
    const definition = definitions[id]
    if (!definition) return
    // don't add empty values to avoid random order from the user perspective
    if (!value && !values.length) return
    const data = Object.assign({ id, value }, definition)
    if (this.isUnique(id)) {
      const index = this.indexOf(id)
      // do not add empty/falsy values to avoid a crowded list
      if (index === -1) {
        if (value) values.push(data)
      } else {
        if (value) values.splice(index, 1, data)
        else values.splice(index, 1)
      }
    } else {
      // still ensure unique values, even if the filter is not unique
      const index = this.indexOf(id, value)
      // again; not empty values (see above)
      if (index === -1 && !!value) values.push(data)
    }
  }

  this.delete = function (id, value) {
    const index = this.indexOf(id, value)
    if (index > -1) values.splice(index, 1)
  }

  this.clear = function () {
    values.splice(0, values.length)
  }

  this.definitions = function () {
    return definitions
  }

  this.entries = function () {
    return Object.entries(values)
  }

  this.setDrawn = function (id) {
    const index = values.findIndex(filter => filter.id === id)
    values[index].drawn = true
  }

  this.toJSON = function () {
    const json = {}
    for (const filter of values) {
      json[filter.id] = this.isUnique(filter.id)
        ? filter.value
        : (`${(json[filter.id] || '')} ${filter.value}`).trim()
    }
    return json
  }
}

function AutoComplete ($input, { filters, addressDefaultFilter, getFiltersFromAutoComplete, autoSuggest, customIndex, customItems, defaultFields, defaultTimeRange } = {}) {
  const index = customIndex || addressIndex
  const items = customItems || addressItems
  // auto-complete item
  this.$ul = $('<ul class="autocomplete address-picker overflow-y-auto" tabindex="-1">')
    .on('click', '.list-item', (e) => {
      const data = $(e.currentTarget).data()
      this.selectOptionAndSubmit(data)
      $input.focus()
      // FF behaves differently so we mimic the behavior (see common.js InputView event differentiation for completeness)
      if (_.device('firefox')) $input.one('blur', () => $input.get(0).dispatchEvent(new Event('change')))
    })

  $input
    .on('keydown', (e) => {
      switch (e.which) {
        // enter
        case 13: {
          e.preventDefault()
          const selected = this.$ul.children('.selected')
          if (this.isOpen() && selected.length) {
            this.selectOptionAndSubmit(selected.data())
          } else {
            $input.trigger('submit')
          }
          break
        }
        // tab
        case 9:
          if (this.isOpen()) {
            e.preventDefault()
            const options = this.$ul.children()
            const option = [
              options.filter('.selected').get(0),
              options.filter('.selectable:not(.auto-suggestion)').get(0),
              options.get(0)
            ].filter(Boolean)[0]
            this.selectOption($(option).data())
            this.empty()
          }
          break
        // cursor up
        case 38: {
          // avoid horizontal cursor movement
          e.preventDefault()
          const children = this.$ul.children('.selectable')
          const index = children.index(children.filter('.selected'))
          if (index <= 0) return
          children.filter('.selected').removeClass('selected')
          children.eq(index - 1).addClass('selected').intoView(this.$ul)
          this.toggleContainsLabel(children.filter('.selected').hasClass('contains-hint'))
          break
        }
        // cursor down
        case 40: {
          // avoid horizontal cursor movement
          e.preventDefault()
          const children = this.$ul.children('.selectable')
          const index = children.index(children.filter('.selected'))
          if (index >= children.length - 1) return
          children.filter('.selected').removeClass('selected')
          children.eq(index + 1).addClass('selected').intoView(this.$ul)
          this.toggleContainsLabel(children.filter('.selected').hasClass('contains-hint'))
          break
        }
        // no default
      }
    })
    .on('blur', () => {
      // don't close if the focus is in the autocomplete, e.g. by a click
      setTimeout(() => {
        if (this.$ul[0] === document.activeElement || $.contains(this.$ul[0], document.activeElement)) return
        this.empty()
      }, 0)
    })
    .on('submit', () => {
      this.empty()
    })
    .on('keyup', (e) => {
      // escape
      if (e.which !== 27) return
      if (!this.isOpen()) return
      e.stopPropagation()
      this.empty()
    })

  this.render = function (items) {
    // not this.empty() to avoid the event
    this.$ul.empty()
    // we might call this without anything to avoid
    // late dropdowns after hitting enter, for example
    if (items) {
      if (items.length) {
        // remove duplicates from end-user perspective, i.e. same name, same caption
        const exists = {}
        items = items.filter(item => {
          const cid = item.full_name && item.caption ? `${item.full_name}_${item.caption}` : item.cid
          if (exists[cid]) return false
          return (exists[cid] = true)
        })
        this.renderItems(items)
        this.$ul.children().removeAttr('tabindex')
        // accelerate initial appear event for first 8 items
        this.$ul.find('.avatar').slice(0, 8).trigger('appear')
        this.$ul.get(0).scrollIntoView()
      }
      // this part is rendered regardless of searched items
      this.renderSuggestions(items)
    }
    this.triggerToggle(this.isOpen())
    return this
  }

  this.renderCallback = this.render.bind(this)

  this.closeAutocompleteDropdown = e => {
    const inAutocomplete = this.$ul.find(e.target).length
    if (this.isOpen() && !inAutocomplete) this.empty()
  }

  this.empty = function () {
    this.$ul.empty()
    this.triggerToggle(false)
  }

  let currentState = false
  this.triggerToggle = function (state = false) {
    if (state === currentState) return
    this.$ul.trigger('toggle', [state])
    if (state) $(document).on('mousedown', this.closeAutocompleteDropdown)
    else $(document).off('mousedown', this.closeAutocompleteDropdown)
    currentState = state
  }

  this.isOpen = () => this.$ul.children().length > 0

  this.renderItems = function (list) {
    items.render(this.$ul, list)
  }

  this.renderSuggestions = function (items = []) {
    if (!autoSuggest) return
    const suggestions = autoSuggest(this.getLastWord(), items)
    if (!suggestions?.length) return
    this.$ul.prepend(
      this.renderContainsSuggestion(),
      suggestions.map(({ filter, value }) => {
        if (!filters.isDefined(filter)) return $()
        return $('<li class="list-item selectable py-4 auto-suggestion" aria-selected="false" role="option">')
          .attr({ 'data-prefix': filters.getPrefix(filter), 'data-value': value })
          .append(
            $('<div class="list-item-checkmark">'),
            $('<div class="list-item-content flex">').append(
              $('<b class="me-8">').text(filters.getLabel(filter)),
              $('<span class="ellipsis">').text(filters.getType(filter) === 'checkbox' ? '' : value)
            )
          )
      }),
      $('<li class="divider" role="separator">')
    )
  }

  this.getLastWord = () => getLastWord($input.val())

  this.toggleContainsLabel = function (state) {
    $(this.$ul.find('.suggestion-hint')).toggle(state)
  }

  this.renderContainsSuggestion = function () {
    const word = queryHasWords($input.val())
    // do not render the suggestion if there is a filter
    if (!word) return
    const defaultFieldLabels = Object.values(defaultFields).join(', ')

    // return a li without attributes of filters. This causes filters to be empty which falls back to full text search
    return [$('<li class="contains-hint list-item selectable py-4 auto-suggestion" aria-selected="false" role="option">')
      .attr('data-prefix-x', 'contains')
      .append($('<div class="list-item-content flex">')
        .append(
          $('<b class="me-8">').text(gt('Contains')),
          $('<span class="ellipsis">').text(word),
          // .# used in a search dropdown as a hint for the user to press the enter key
          $('<div class="suggestion-hint text-gray shrink-0 ml-auto pl-4" aria-hidden="true">').text(gt('Press ENTER'))
        ),
      // #. "Search in" like "Search in Subject, To, CC, BCC"; appears as hint in autocomplete
      defaultFieldLabels && $('<span class="text-xxs text-gray width-100">').text(gt('Search in %s, between %s and %s ', defaultFieldLabels, defaultTimeRange.after, defaultTimeRange.before))
      ),
    $('<li class="divider" role="separator">')]
  }

  this.onInput = _.debounce(function () {
    const { unquoted } = this.getLastWord()
    index.search(unquoted, true).then(_.lfo(this.renderCallback))
  }, 50)

  this.selectOption = function (data) {
    const { prefix, word, typed } = getLastWord($input.val())
    if (data.prefix) {
      this.replaceQueryPart(typed, `${data.prefix}:${SearchView.quote(data.value)}`)
    } else if (data.cid) {
      const [item] = index.resolve(data.cid)
      // we use autoSuggest as a test whether we are top-level or in the dropdown
      const replacement = autoSuggest && prefix
        ? Object.entries(this.getFiltersFromAutoComplete(item, prefix))
          .map(([key, value]) => `${key}:${SearchView.quote(value)}`)
          .join(' ')
        : item.email ?? item[addressDefaultFilter]
      this.replaceQueryPart(word, replacement)
    }
  }

  this.replaceQueryPart = function (word, replacement = '') {
    const lastIndex = $input.val().lastIndexOf(word)
    const value = $input.val().substr(0, lastIndex) + replacement
    $input.val(value)
    // move cursor to end
    const el = $input[0]
    el.scrollLeft = el.scrollWidth
  }

  this.selectOptionAndSubmit = function (data) {
    this.selectOption(data)
    $input.triggerHandler('submit')
  }

  this.getFiltersFromAutoComplete = function (item, prefix) {
    if (getFiltersFromAutoComplete) return getFiltersFromAutoComplete(item, prefix)
    if (!prefix || !filters.isValidPrefix(prefix)) {
      prefix = filters.getPrefix(addressDefaultFilter) || 'address'
    }
    return { [prefix]: item.email }
  }
}

const option = document.createElement('option')

function fillDataList (field) {
  return function () {
    const set = new Set(Object.values(addressIndex.hash).map(item => item[field]).filter(Boolean).sort())
    this.$(`datalist[data-field="${field}"]`).empty().append(
      [...set].map(value => {
        const el = option.cloneNode()
        el.setAttribute('value', value)
        return el
      })
    )
  }
}

export const ToggleSearchView = Backbone.View.extend({
  events: {
    click: 'toggleTarget'
  },
  el () {
    return createButton({
      type: 'none',
      icon: { name: 'bi/search.svg', title: gt('Search') },
      variant: 'toolbar'
    }).addClass('btn-topbar').get(0)
  },
  initialize ({ app, target, view }) {
    this.app = app
    this.target = target
    // add id to target, if it does not have one
    if (!target.attr('id')) target.attr('id', _.uniqueId('search-area-'))
    target.addClass('smartphone-search-container')
    this.view = view
    app.getWindow().on({ show: this.show.bind(this), hide: this.hide.bind(this) })

    // hide search area when notification area is shown
    notificationAreaController.mainView.on('main:visibility-change', visible => {
      if (visible) this.target.hide()
    })
  },
  toggleTarget () {
    // hide notification area
    notificationAreaController.trigger('hide')

    this.view.cancel()
    this.target.toggle()
    this.$el.attr('aria-expanded', this.target.is(':visible'))
    if (this.target.is(':visible')) this.target.find('.search-field').focus()
  },
  hide () {
    this.$el.hide()
  },
  show () {
    this.$el.show()
  },
  render () {
    this.$el.attr({
      'aria-controls': this.target.attr('id'),
      'aria-expanded': false
    })
    return this
  }
})

export function appendSearchView ({ app, view }) {
  if (_.device('smartphone')) {
    const target = $('<div>').hide()
    app.getWindow().nodes.outer.prepend(
      target.append(view.render().$el)
    )
    $('#io-ox-topbar-mobile-search-container').append(
      new ToggleSearchView({ app, target, view }).render().$el
    )
  } else {
    $('#io-ox-topsearch').append(view.render().$el)
  }
  app.searchView = view
}

export const unitTesting = {
  queryHasWords,
  getLastWord,
  isEmptyWord
}
export default SearchView
