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
import moment from '@open-xchange/moment'

import AbstractView from '@/io.ox/backbone/mini-views/abstract'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

// used by firefox only, because it doesn't trigger a change event automatically
const firefoxDropHelper = function (e) {
  if (e.originalEvent.dataTransfer.getData('text')) {
    const self = this
    // use a one time listener for the input Event, so we can trigger the changes after the input updated (onDrop is still to early)
    this.$el.one('input', function () {
      self.$el.trigger('change')
    })
  }
}
// used by password field, because it doesn't trigger a change event automatically
const pasteHelper = function (e) {
  if (!e || e.type !== 'paste') return
  if (e.originalEvent.clipboardData.types.indexOf('text/plain') !== -1) {
    const self = this
    // use a one time listener for the input Event, so we can trigger the changes after the input updated (onDrop is still to early)
    this.$el.one('input', function () {
      self.$el.trigger('change')
    })
  }
}

//
// <input type="text">
//
export const InputView = AbstractView.extend({
  el: '<input type="text" class="form-control">',
  // firefox does not trigger a change event if you drop text.
  events: _.device('firefox') ? { change: 'onChange', drop: 'onDrop', paste: 'onPaste' } : { blur: 'onChange', change: 'onChange', paste: 'onPaste' },
  onChange () {
    this.model.set(this.name, this.$el.val(), { validate: this.options.validate })
  },
  onDrop: firefoxDropHelper,
  onPaste: pasteHelper,
  setup () {
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    // trim left spaces if possible
    const val = _.isString(this.model.get(this.name)) ? this.model.get(this.name).replace(/^\s+/, '') : this.model.get(this.name)
    this.$el.val(val)
    // update model too or the the left spaces are still in the model data. They would be saved when the model is saved, creating inconsistent data
    // infinite loops are not possible because the change event is only triggered if the new value is different
    this.model.set(this.name, val)
    // trigger extra update event on view
    this.trigger('update', this.$el)
  },
  render () {
    this.$el.attr({ name: this.name })
    if (this.id) this.$el.attr('id', this.id)
    if (this.attributes) this.$el.attr(this.attributes)
    if (this.options.maxlength) this.$el.attr('maxlength', this.options.maxlength)
    if (this.options.mandatory) this.$el.attr('aria-required', true)
    if (_.isBoolean(this.options.autocomplete) && !this.options.autocomplete) this.$el.attr('autocomplete', 'off')
    this.update()
    return this
  }
})

//
// <input type="password">
//
export const PasswordView = AbstractView.extend({
  el: '<input type="password" class="form-control">',
  events: {
    change: 'onChange',
    paste: 'onPaste'
  },
  onChange () {
    let value = this.$el.val()
    if (/^\*$/.test(value)) value = null
    this.model.set(this.name, value, { validate: this.options.validate, _event: 'change' })
  },
  // paste doesn't trigger a change event
  onPaste: pasteHelper,
  setup () {
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    const value = this.model.get(this.name)
    this.$el.val(value !== null ? $.trim(value) : '********')
  },
  toggle (state) {
    state = _.isBoolean(state) ? state : this.$el.attr('type') === 'password'
    this.$el.attr('type', state ? 'text' : 'password')
  },
  render () {
    this.$el.attr({
      autocomplete: 'off',
      autocorrect: 'off',
      name: this.name,
      placeholder: this.options.placeholder
    })
    if (this.id) this.$el.attr('id', this.id)
    if (this.options.maxlength) this.$el.attr('maxlength', this.options.maxlength)
    if (this.options.mandatory) this.$el.attr('aria-required', true)
    // see bug 49639, 51204
    if (_.isBoolean(this.options.autocomplete) && !this.options.autocomplete) this.$el.attr('autocomplete', 'new-password').removeAttr('name')
    this.update()
    return this
  }
})

//
// wraps PasswordView and adds toggle button
// <span>
//    <input type="password">
//    <button class="toggle-asterisks">
//
export const PasswordViewToggle = AbstractView.extend({
  el: '<div class="password-container has-feedback input-group">',
  events: {
    'click .toggle-asterisks': 'toggle',
    keydown: 'onKeyPress',
    keyup: 'onKeyPress',
    focusin: 'onFocusChange',
    focusout: 'onFocusChange'
  },
  icons: { password: 'eye', text: 'eye-slash' },
  initialize (opt) {
    this.passwordView = new PasswordView(opt)
  },
  onFocusChange: _.debounce(function () {
    this.$el.toggleClass('has-focus', $(document.activeElement).closest('.password-container').length > 0)
    // use long delay here as safari messes up the focus order
  }, _.device('safari') ? 200 : 0),
  onKeyPress (e) {
    // Mac left alt / Windows Key / Chromebook Search key
    const match = _.device('macos') ? e.which === 18 : e.which === 91
    if (!match) return
    this.toggle(e, e.type === 'keydown')
  },
  toggle (state) {
    state = _.isBoolean(state) ? state : undefined
    this.passwordView.toggle(state)
    switch (this.passwordView.$el.attr('type')) {
      case 'text':
        this.$el.find('.bi-eye').hide()
        this.$el.find('.bi-eye-slash').show()
        break
      case 'password':
        this.$el.find('.bi-eye').show()
        this.$el.find('.bi-eye-slash').hide()
        break
    }
    // safari needs manual focus
    if (_.device('safari')) {
      this.$el.find('.toggle-asterisks').focus()
    }
  },
  render () {
    this.$el.empty().append(
      this.passwordView.render().$el.addClass('border-none'),
      $('<span class="input-group-btn">').append(
        $('<button type="button" class="btn btn-toolbar btn-default form-control-feedback toggle-asterisks">')
          // #. title of toggle button within password field
          .attr({ title: gt('toggle password visibility') })
          .append(
            createIcon('bi/eye.svg'), createIcon('bi/eye-slash.svg').hide()
          )
      )
    )
    return this
  }
})

//
// <textarea>
//
export const TextView = AbstractView.extend({
  el: '<textarea class="form-control">',
  // firefox does not trigger a change event if you drop text.
  events: _.device('firefox') ? { change: 'onChange', drop: 'onDrop' } : { change: 'onChange' },
  onChange () {
    this.model.set(this.name, this.$el.val(), { validate: this.options.validate })
  },
  onDrop: firefoxDropHelper,
  setup (options) {
    this.rows = options.rows
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    this.$el.val(this.model.get(this.name))
  },
  render () {
    this.$el.attr({ name: this.name })
    if (this.attributes) this.$el.attr(this.attributes)
    if (this.options.id) this.$el.attr('id', this.options.id)
    if (this.rows) this.$el.attr('rows', this.rows)
    if (this.options.maxlength) this.$el.attr('maxlength', this.options.maxlength)
    this.update()
    return this
  }
})

//
// <input type="checkbox">
// if you require custom values instead of true and false you may pass the option customValues. This must be an object containing the values to be used with 'true' and 'false' as keys.
// used for transparency in calendar edit for example
//
export const CheckboxView = AbstractView.extend({
  el: '<input type="checkbox">',
  events: { change: 'onChange' },
  getValue () {
    return (this.options.customValues && this.options.customValues.true && this.options.customValues.false)
      ? this.options.customValues[this.isChecked()]
      : this.isChecked()
  },
  setValue () {
    let value = this.model.get(this.name) || this.options.defaultVal
    if (this.options.customValues && this.options.customValues.true && this.options.customValues.false) {
      value = _.isEqual(this.options.customValues.true, value)
    } else {
      // make true boolean
      value = !!value
    }
    return value
  },
  onChange () {
    this.model.set(this.name, this.getValue())
  },
  isChecked () {
    return !!this.$input.prop('checked')
  },
  setup (options) {
    this.$input = this.$el
    this.nodeName = options.nodeName
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    this.$input.prop('checked', this.setValue())
  },
  render () {
    this.$input.attr({ name: this.nodeName || this.name })
    if (this.options.id) this.$input.attr('id', this.options.id)
    this.update()
    return this
  }
})

//
// custom checkbox
// options: id, name, nodeName, size (small | large), label
//
export const CustomCheckboxView = CheckboxView.extend({
  el: '<div class="checkbox custom">',
  render () {
    const id = this.options.id || _.uniqueId('custom-')
    this.$el
      .addClass(this.options.size || 'small')
      .append(
        $('<label>')
          .attr('for', id)
          .append(
            this.$input = this.renderInput(id),
            this.renderToggle(),
            this.renderText()
          )
      )
    this.update()
    return this
  },
  renderInput (id) {
    return $('<input type="checkbox">').attr({ id, name: this.nodeName || this.name })
  },
  renderToggle () {
    return $()
  },
  renderText () {
    return $.txt(this.options.label || '\u00a0')
  },
  disable (bool = true) {
    this.$el.toggleClass('disabled', !!bool)
    this.$input.prop('disabled', !!bool)
  }
})

//
// switch control
// options: id, name, size (small | large), label
//
export const SwitchView = CustomCheckboxView.extend({
  el: '<div class="checkbox switch">',
  events: {
    change: 'onChange',
    'swipeleft .toggle': 'onSwipeLeft',
    'swiperight .toggle': 'onSwipeRight'
  },
  renderInput (id) {
    return CustomCheckboxView.prototype.renderInput.call(this, id).addClass('sr-only')
  },
  renderToggle () {
    return $('<div class="toggle" aria-hidden="true">')
      .append(createIcon('bi/check.svg'))
      .attr('title', this.options.title)
  },
  renderText () {
    return $('<span>').text(this.options.label || '\u00a0')
  },
  onSwipeLeft () {
    if (this.isChecked()) this.$input.prop('checked', false)
  },
  onSwipeRight () {
    if (!this.isChecked()) this.$input.prop('checked', true)
  }
})

//
// <input type="radio">
//
export const RadioView = AbstractView.extend({
  tagName: 'div',
  className: 'controls',
  events: { change: 'onChange' },
  onChange () {
    this.model.set(this.name, this.$(`[name="${CSS.escape(this.name)}"]:checked`).val())
  },
  setup () {
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    // cast to string, because this.value is a string and === below would fail for numbers (in model)
    const value = String(this.model.get(this.name))
    this.$(`[name="${CSS.escape(this.name)}"]`).each(function () {
      $(this).prop('checked', this.value === value)
    })
  },
  render () {
    this.$el.append(_(this.options.list).map(this.renderOption, this))
    this.update()
    return this
  },
  renderOption (data) {
    return $('<div class="radio custom">')
      .addClass(this.options.size || 'small')
      .append(this.renderLabel(data))
  },
  renderLabel (data) {
    return $('<label>').append(this.renderInput(data), $.txt(data.label))
  },
  renderInput (data) {
    return $('<input type="radio">').attr('name', this.name).val(data.value)
  }
})

export const CustomRadioView = RadioView.extend({
  renderLabel (data) {
    const id = _.uniqueId('custom-')
    return $('<label>').attr('for', id).append(
      this.renderInput(data).attr('id', id),
      $.txt(data.label)
    )
  },
  renderInput () {
    return RadioView.prototype.renderInput.apply(this, arguments)
  }
})

//
// <select>
//
export const SelectView = AbstractView.extend({
  tagName: 'select',
  className: 'form-control',
  events: { change: 'onChange' },
  onChange () {
    const val = this.$el.val()
    this.model.set(this.name, this.options.integer ? parseInt(val, 10) : val)
  },
  setup () {
    this.listenTo(this.model, 'change:' + this.name, this.update)
  },
  update () {
    this.$el.val(this.model.get(this.name))
  },
  render () {
    this.$el.attr({ name: this.name })
    if (this.id) this.$el.attr({ id: this.id })
    this.rerender()
    return this
  },
  renderOptionGroups (items) {
    return _(items)
      .chain()
      .map(function (item) {
        if (item.label === false) return this.renderOptions(item.options)
        return $('<optgroup>').attr('label', item.label).append(
          this.renderOptions(item.options)
        )
      }, this)
      .flatten(true)
      .value()
  },
  renderOptions (items) {
    return _(items).map(function (item) {
      return $('<option>').attr({ value: item.value }).text(item.label)
    })
  },
  rerender () {
    this.$el.empty().append(
      this.options.groups
        ? this.renderOptionGroups(this.options.list)
        : this.renderOptions(this.options.list)
    )
    this.update()
  },
  setOptions (list) {
    this.options.list = list
    this.rerender()
  }
})

//
// Date view: <input type="date"> or <input type="text"> plus Date Picker
//
const DateViewBase = {
  setup (options = {}) {
    InputView.prototype.setup.call(this, options)
    // format tells us how to parse and format the model value
    this.format = options.format || 'l'
    // modelFormat can be used to define a different model value
    // default: x is unix timestamp in milliseconds
    this.modelFormat = options.modelFormat || 'x'
  },
  onChange () {
    const date = this.parseDate(this.$el.val())
    if (!date.isValid()) return
    this.model.set(this.name, this.getValue(date))
  },
  update () {
    const value = this.model.get(this.name)
    if (value === undefined && this.options.mandatory) return
    this.$el.val(value === undefined ? '' : this.getFormattedDate(value))
  },
  parseDate (value) {
    return _.isNumber(value) ? moment(value) : moment(value, [this.format, 'D.M.YYYY', 'D.M.YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-M-D'], true)
  },
  getValue (date) {
    const format = this.modelFormat || this.format
    const value = date.format(format)
    return format === 'x' || format === 'X' ? parseInt(value, 10) : value
  },
  getFormattedDate (value) {
    const date = this.parseDate(value)
    return date.isValid() ? date.format(this.format) : ''
  }
}
export const DateView = _.device('smartphone')
  ? InputView.extend(_.extend(DateViewBase, {
    // $el.val() if always YYYY-MM-DD (displayed format is localized)
    el: '<input type="date" class="form-control">',
    getFormattedDate (value) {
      const date = this.parseDate(value)
      return date.isValid() ? date.format('YYYY-MM-DD') : ''
    }
  }))
  : InputView.extend(_.extend(DateViewBase, {
    render () {
      InputView.prototype.render.call(this)
      import('@/io.ox/backbone/views/datepicker').then(({ default: DatePicker }) => {
        // need to be async here otherwise parent is undefined
        setTimeout(() => {
          const date = this.parseDate(this.model.get(this.name))
          new DatePicker({ parent: this.$el.closest('.modal, #io-ox-core'), mandatory: this.options.mandatory })
            .attachTo(this.$el)
            .listenTo(this.model, 'change:' + this.name, function (model, value) {
              if (value !== undefined) this.setDate(value, true)
            })
            .on('select', date => {
              this.model.set(this.name, this.getValue(date))
            })
            // setDate expects a timestamp
            .setDate((date.isValid() ? date : moment()).valueOf(), true)
        })
      })
      return this
    }
  }))

//
// Error view
//
export const ErrorView = AbstractView.extend({
  tagName: 'span',
  className: 'help-block',
  setup (opt) {
    this.focusSelector = opt.focusSelector || 'input'
  },
  getContainer () {
    if (this.options.selector) {
      if (_.isString(this.options.selector)) return this.$el.closest(this.options.selector)
      if (_.isObject(this.options.selector)) return this.options.selector
    } else {
      return this.$el.closest('.form-group, [class*="col-"]')
    }
  },
  render () {
    const self = this
    _.defer(function () {
      const container = self.getContainer()
      const errorId = _.uniqueId('error-help_')
      container.on({
        invalid (e, message) {
          // check if already invalid to avoid endless focus calls
          if ($(this).hasClass('has-error')) return
          $(this).addClass('has-error')
          self.$el.attr({
            id: errorId
          })
          self.$el.text(message).show().end()
          $(this).find('input').attr({
            'aria-invalid': true,
            'aria-describedby': errorId
          })
          _.defer(function () {
            $(container).find(self.focusSelector).focus()
          })
        },
        valid () {
          $(this).removeClass('has-error')
          self.$el.removeAttr('id role')
          self.$el.text('').hide().end()
          $(this).find('input').removeAttr('aria-invalid aria-describedby')
        }
      })
    })
    this.$el.attr({ 'aria-live': 'assertive' }).hide()
    return this
  }
})

//
// Form view
//
export const FormView = AbstractView.extend({
  tagName: 'form',
  setup () {
    this.listenTo(this.model, 'change')
  },
  render () {
    if (this.id) this.$el.attr({ id: this.id })
    return this
  }
})

//
// Dropdown Link view
//
export const DropdownLinkView = Dropdown.extend({
  tagName: 'div',
  className: 'dropdownlink',
  update () {
    this.updateLabel()
    Dropdown.prototype.update.apply(this, arguments)
  },
  updateLabel () {
    this.$el.find('.dropdown-label').text(this.options.values[this.model.get(this.name)])
  },
  render () {
    const self = this
    Dropdown.prototype.render.apply(this, arguments)
    _(this.options.values).each(function (name, value) {
      const tooltip = self.options.tooltips && self.options.tooltips[value] ? self.options.tooltips[value] : name
      self.option(self.name, value, name, { radio: true, title: tooltip })
    })
    this.updateLabel()
    return this
  }
})

// most needed pattern
function getInputWithLabel (id, label, model) {
  const guid = _.uniqueId('form-control-label-')
  return [
    $('<label>').attr('for', guid).text(label),
    new InputView({ name: id, model, id: guid }).render().$el
  ]
}

export default {
  AbstractView,
  InputView,
  PasswordView,
  PasswordViewToggle,
  TextView,
  CheckboxView,
  CustomCheckboxView,
  SwitchView,
  RadioView,
  CustomRadioView,
  SelectView,
  DateView,
  ErrorView,
  FormView,
  DropdownLinkView,
  getInputWithLabel
}
