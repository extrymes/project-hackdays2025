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
import DisposableView from '@/io.ox/backbone/views/disposable'
import { createButton, createLabel } from '@/io.ox/core/components'
import gt from 'gettext'

import '@/io.ox/backbone/views/search.scss'

//
// This is a very simple variant of the application-oriented search view
// It shares some markup and CSS but it's far more simple, thus dedicated code
//
export const SearchView = DisposableView.extend({

  className: 'search-container search-view',

  events: {
    'click .submit-button': 'onSubmit',
    'click .cancel-button': 'onCancel',
    'input .search-field': 'onInput',
    'keydown .search-field': 'onKeydown'
  },

  render () {
    const id = _.uniqueId('label')
    this.$el.append(
      this.$submit = createButton({ variant: 'toolbar', icon: { name: 'bi/search.svg', title: gt('Search') } })
        .addClass('submit-button me-8'),
      createLabel({ for: id, text: gt('Search') })
        .addClass('sr-only'),
      $('<form class="search-field-wrapper" autocomplete="off">').append(
        this.$input = $('<input type="search" class="search-field" spellcheck="false" autocomplete="off">')
          .attr({ placeholder: gt('Search'), id })
          .on('submit', () => false)
      ),
      this.$cancel = createButton({ variant: 'toolbar', icon: { name: 'bi/x-lg.svg', title: gt('Cancel search') } })
        .addClass('cancel-button ms-8').hide()
    )
    return this
  },

  checkState () {
    const searching = !!this.$input.val()
    this.$cancel.toggle(searching)
    this.trigger(searching ? 'searching' : 'cancel')
  },

  onInput () {
    this.checkState()
    this.trigger('input')
  },

  onSubmit (e) {
    this.trigger('submit')
  },

  onCancel () {
    this.$input.val('')
    this.checkState()
    this.$input.focus()
  },

  onKeydown (e) {
    if (e.which === 13) this.onSubmit()
    else if (e.which === 40) {
      e.preventDefault()
      this.trigger('cursor-down')
    }
  }
})
