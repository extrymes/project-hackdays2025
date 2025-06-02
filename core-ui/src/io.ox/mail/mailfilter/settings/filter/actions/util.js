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
import mini from '@/io.ox/backbone/mini-views'
import folderAPI from '@/io.ox/core/folder/api'
import { createIcon } from '@/io.ox/core/components'

import gt from 'gettext'

function prepareFolderForDisplay (folder, input) {
  folderAPI.get(folder).done(function (data) {
    const arrayOfParts = folder.split('/')
    arrayOfParts.shift()
    if (data.standard_folder) {
      input.val(data.title)
    } else {
      input.val(arrayOfParts.join('/'))
    }
  })
}

function getSetFlagsInputValue (list) {
  list = [].concat(list || [])
  return list.map((value) => {
    return value.trim().replace(/^\$+/, '')
  }).join(' ')
}

function getSetFlagsModelValue (value) {
  value = value.toString().replace(/\s+/g, ' ').trim().split(' ')
  if (!value) return ''
  return ([].concat(value)).map((value) => {
    return '$' + value.trim().replace(/^\$+/, '')
  })
}

const Input = mini.InputView.extend({
  events: { change: 'onChange', keyup: 'onKeyup', paste: 'onPaste' },
  onChange () {
    if (this.name === 'flags') {
      const value = ((/customflag_/g.test(this.id)) || (/removeflags_/g.test(this.id))) ? ['$' + this.$el.val().toString()] : [this.$el.val()]
      this.model.set(this.name, value)
    } else if (this.name === 'setflags') {
      this.model.set('flags', getSetFlagsModelValue(this.$el.val()))
    } else if (this.name === 'to') {
      this.model.set(this.name, this.$el.val().trim())
    } else {
      this.model.set(this.name, this.$el.val())
    }

    // force validation
    this.onKeyup()
  },
  update () {
    if (/customflag_/g.test(this.id) || /removeflags_/g.test(this.id)) {
      this.$el.val(this.model.get('flags')[0].replace(/^\$+/, ''))
    } else if (/setflags_/g.test(this.id)) {
      this.$el.val(getSetFlagsInputValue(this.model.get('flags')))
    } else if (/move_/g.test(this.id) || /copy_/g.test(this.id)) {
      prepareFolderForDisplay(this.model.get('into'), this.$el)
    } else {
      this.$el.val($.trim(this.model.get(this.name)))
    }
  },
  onKeyup () {
    let state = $.trim(this.$el.val()) === '' ? 'invalid:' : 'valid:'
    if (this.name === 'setflags') state = 'valid:'
    this.model.trigger(state + this.name)
    this.$el.trigger('toggle:saveButton')
  }
})

const Dropdown = mini.DropdownLinkView.extend({
  onClick (e) {
    e.preventDefault()
    // cSpell:disable-next-line
    if (/markas_/g.test(this.id)) {
      this.model.set(this.name, [$(e.target).attr('data-value')])
    } else {
      this.model.set(this.name, $(e.target).attr('data-value'))
    }
  }
})

const drawAction = function (o) {
  const errorView = o.errorView ? new mini.ErrorView({ selector: '.row' }).render().$el : []

  if (o.activeLink) {
    return $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': o.actionKey }).append(
      $('<div>').addClass('col-sm-4 singleline').append(
        $('<span>').addClass('list-title').text(o.title)
      ),
      $('<div>').addClass('col-sm-8').append(
        $('<div>').addClass('row').append(
          $('<div>').addClass('col-sm-4 rightalign').append(
            $('<a href="#" class="folderselect">').text(gt('Select folder')).data({ model: o.inputOptions.model })
          ),
          $('<div class=" col-sm-8">').append(
            $(`<label for="${o.inputId}" class="sr-only">`).text(o.inputLabel),
            new Input(o.inputOptions).render().$el.prop('disabled', true)
          )
        )
      ),
      drawDeleteButton('action')
    )
  // cSpell:disable-next-line
  } else if (/markas_/g.test(o.inputId)) {
    return $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': o.actionKey }).append(
      $('<div>').addClass('col-sm-4 singleline').append(
        $('<span>').addClass('list-title').text(o.title)
      ),

      $('<div>').addClass('col-sm-8').append(
        $('<div>').addClass('row').append(
          $('<div>').addClass('col-sm-3 col-sm-offset-9 rightalign').append(
            new Dropdown(o.dropdownOptions).render().$el
          )
        )
      ),
      drawDeleteButton('action')
    )
  } else if (/discard_/g.test(o.inputId) || /keep_/g.test(o.inputId) || /guard_/g.test(o.inputId)) {
    return $('<li>').addClass(`filter-settings-view ${o.addClass} row`).attr('data-action-id', o.actionKey).append(
      $('<div>').addClass('col-sm-4 singleline').append(
        $('<span>').addClass('list-title').text(o.title)
      ),
      drawDeleteButton('action')
    )
  }
  return $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': o.actionKey }).append(
    $('<div>').addClass('col-sm-4 singleline').append(
      $(`<label for="${o.inputId}">`).addClass('list-title').text(o.title)
    ),
    $('<div>').addClass('col-sm-8').append(
      $('<div>').addClass('row').append(
        $('<div>').addClass('col-sm-8 col-sm-offset-4').append(
          new Input(o.inputOptions).render().$el,
          errorView
        )
      )
    ),
    drawDeleteButton('action')
  )
}

const drawDeleteButton = function (type) {
  return $('<button type="button" class="btn btn-link remove">')
    .attr({ 'data-action': `remove-${type}`, 'aria-label': gt('Remove') })
    .append(createIcon('bi/trash.svg').attr('title', gt('Remove')))
}

const drawColorDropdown = function (activeColor, colors, colorflags) {
  function changeLabel (e) {
    e.preventDefault()
    $(this).closest('.flag-dropdown').attr('data-color-value', e.data.color).removeClass(e.data.flagclass).addClass(`flag_${e.data.color}`)
  }

  const flagclass = `flag_${colorflags[activeColor]}`

  const node = $('<div class="dropup flag-dropdown clear-title flag">').attr('data-color-value', activeColor)
    .addClass(`flag_${colorflags[activeColor]}`)
    .append(
      // box
      $('<a href="#" class="abs dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true">').attr('aria-label', gt('Set color')),
      // drop down
      $('<ul class="dropdown-menu" role="menu">')
        .append(
          Object.keys(colors).map((key) => {
            const colorObject = colors[key]
            return $('<li role="presentation">').append(
              $('<a href="#" role="menuitem" data-action="change-color">').append(
                $.txt(colorObject.text),
                colorObject.value > 0 ? createIcon('bi/flag-fill.svg').addClass(`bi-18 color-flag flag_${colorObject.value}`) : $()
              )
                .on('click', { color: colorObject.value, flagclass }, changeLabel)
            )
          })
        )
    )

  $('<li class="divider" role="separator">').insertAfter(node.find('li:first'))

  return node
}

export default {
  Input,
  drawAction,
  Dropdown,
  drawDeleteButton,
  prepareFolderForDisplay,
  drawColorDropdown
}
