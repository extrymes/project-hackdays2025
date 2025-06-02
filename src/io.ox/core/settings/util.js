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
import miniViews from '@/io.ox/backbone/mini-views/common'
import { expandableSection, buttonWithIcon, icon } from '@/io.ox/core/components'
import ext from '@/io.ox/core/extensions'
import gt from 'gettext'
import DisposableView from '@/io.ox/backbone/views/disposable'

$(document).on('click', '[help-section]', (e) => {
  const href = $(e.currentTarget).attr('help-section')
  const base = $(e.currentTarget).attr('base')
  import('@/io.ox/help/main').then(({ default: HelpApp }) => {
    if (HelpApp.reuse({ href, modal: true, base })) return
    HelpApp.getApp({ href, modal: true, base }).launch()
  })
})

export const header = function (text, helpSection, base = 'help') {
  return $('<div class="settings-header flex-row">').append(
    $('<h1 class="flex-grow">').text(text),
    helpSection ? helpButton(helpSection, base).addClass('ms-16') : $(),
    _.device('!smartphone')
      ? buttonWithIcon({ className: 'btn btn-toolbar close-settings', icon: icon('bi/x-lg.svg').addClass('bi-20'), title: gt('Close settings') })
        .attr('data-action', 'close').addClass('ms-16')
      : $()
  )
}

export const checkbox = function (name, label, model) {
  if (model.isConfigurable && !model.isConfigurable(name)) return $()
  const id = `${model._path || 'settings'}-${name}`.replace(/[/.]/g, '-').toLowerCase()
  return new miniViews.CustomCheckboxView({ name, model, label, id }).render().$el
}

export const radio = function (id, label, model, options) {
  if (model.isConfigurable && !model.isConfigurable(id)) return $()
  return fieldset(label, new miniViews.CustomRadioView({ name: id, model, list: options }).render().$el).addClass('compact')
}

export const switchView = function (id, label, model) {
  if (model.isConfigurable && !model.isConfigurable(id)) return $()
  return new miniViews.SwitchView({ name: id, model, label }).render().$el
}

export const select = function (id, label, model, options, View) {
  const SelectView = View || miniViews.SelectView
  const guid = _.uniqueId('form-control-label-')
  return [
    $('<label class="control-label col-sm-4">').attr('for', guid).text(label),
    $('<div class="col-sm-6">').append(
      new SelectView({
        list: options,
        name: id,
        model,
        id: guid,
        className: 'form-control'
      }).render().$el
    )
  ]
}

export const compactSelect = function (name, label, model, list, options) {
  if (model.isConfigurable && !model.isConfigurable(name)) return $()
  options = options || {}
  const id = 'settings-' + String(name).replace(/\//g, '-')
  return $('<div class="form-group row">').append(
    $('<div>').addClass('col-md-' + (options.width || 6)).append(
      $('<label>').attr('for', id).text(label),
      new miniViews.SelectView({ id, name, model, list, integer: !!options.integer, groups: !!options.groups }).render().$el
    )
  )
}

export const fieldset = function (text) {
  const args = _(arguments).toArray()
  return $('<fieldset>').append($('<legend class="sectiontitle">').append($('<h3>').text(text))).append(args.slice(1))
}

export const input = function (id, label, model, description) {
  const guid = _.uniqueId('form-control-label-')
  const attributes = description ? { 'aria-describedby': _.uniqueId('form-control-description_') } : {}
  return [
    $('<label>').attr('for', guid).text(label),
    new miniViews.InputView({ name: id, model, className: 'form-control', id: guid, attributes }).render().$el,
    description ? $('<div class="help-block">').text(description).prop('id', attributes['aria-describedby']) : $()
  ]
}

export const textarea = function (id, label, model, description) {
  const guid = _.uniqueId('form-control-label-')
  const attributes = description ? { 'aria-describedby': _.uniqueId('form-control-description_') } : {}
  return $('<div class="form-group row">').append(
    $('<div>').addClass('col-md-6').append(
      $('<label>').attr('for', guid).text(label),
      new miniViews.TextView({ name: id, model, id: guid, rows: 3, attributes }).render().$el,
      description ? $('<div class="help-block">').text(description).prop('id', attributes['aria-describedby']) : $()
    )
  )
}

export function explanation (text = '', helpSection) {
  return $('<div class="settings-explanation flex items-start mb-8">').append(
    $('<div class="flex-grow text-gray">').text(text),
    helpSection ? helpButton(helpSection).addClass('ms-8') : $()
  )
}

export function helpButton (helpSection, base = 'help') {
  return buttonWithIcon({ className: 'btn btn-toolbar', icon: icon('bi/question-circle.svg').addClass('bi-20'), title: gt('Open online help') })
    .attr({ 'help-section': helpSection, base })
}

export function help (helpSection) {
  return explanation('', helpSection)
}

export function renderExpandableSection (title, explanation, point, expanded = false) {
  expanded = _.device('smartphone') ? false : expanded
  return function render (baton) {
    const $section = expandableSection({ title, explanation, expanded }).addClass('settings-section')
    ext.point(point).invoke('render', $section.children('section'), baton)
    this.$el.append($section.attr('data-section', point))
  }
}

export function renderRadioCards (name, currentValue, options = [], callback) {
  return $('<ul class="list-none m-0 p-0 radio-card-list">').append(
    [].concat(options).map(option =>
      $('<li class="card-container">').append(
        $('<input type="radio" class="sr-only">')
          .attr({ name, id: `${name}-${option.id}` })
          .prop('checked', option.id === currentValue)
          .val(option.id),
        $('<label>').attr('for', `${name}-${option.id}`).append(
          callback($('<span class="card">'), option),
          $('<div class="card-caption truncate font-normal">').text(option.title)
        )
      )
    )
  )
}

// at some point we should try to also use this for the theme selector
export const RadioCardView = DisposableView.extend({
  tagName: 'ul',
  className: 'list-none m-0 p-0 radio-card-list',
  events: { change: 'onChange' },
  initialize (options = {}) {
    this.options = options
    this.name = options.name
  },
  onChange () {
    const input = $(`[name="${CSS.escape(this.name)}"]:checked`)
    this.model.set(this.name, this.$(input).val())
    input.focus()
  },
  render () {
    const currentValue = this.model.get(this.name)
    this.$el.empty().append(
      [].concat(this.options.list).map(option =>
        $('<li class="card-container">').append(
          $('<input type="radio" class="sr-only">')
            .attr({ name: this.name, id: `${this.name}-${option.id}` })
            .prop('checked', option.id === currentValue)
            .val(option.id),
          $('<label>').attr('for', `${this.name}-${option.id}`).append(
            this.renderCard(option),
            $('<div class="card-caption truncate font-normal">').text(option.title)
          )
        )
      )
    )
    return this
  },
  renderCard (option) {
    return $('<span class="card">')
  }
})
