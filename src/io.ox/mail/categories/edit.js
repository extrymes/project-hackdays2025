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
import DOMPurify from 'dompurify'
import Backbone from '@/backbone'
import api from '@/io.ox/mail/categories/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import hotspot from '@/io.ox/core/tk/hotspot'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'

function isEnabled () { return settings.get('categories/enabled') }

const CategoryItem = Backbone.View.extend({
  tagName: 'div',
  className: 'category-item',
  events: {
    'keyup input[type="text"]': 'editName',
    'change input[type="checkbox"]': 'toggleState'
  },
  initialize ({ collection, model, $footer }) {
    this.model = model
    this.collection = collection
    this.$footer = $footer
    this.model.on('invalid', () => {
      this.$el.find('.help-block').text(this.model.validationError.msg)
      $footer.find('button[data-action="save"]').attr('disabled', true)
    })
  },
  editName (e) {
    const { collection, model, $el, $footer } = this
    e.preventDefault()
    $el.find('.help-block').text('')
    model.set('name', e.currentTarget.value.trim(), { validate: true })
    const hasErrors = collection.models.some(({ validationError }) => validationError)
    if (!hasErrors) {
      $footer.find('button[data-action="save"]').attr('disabled', false)
    }
  },
  toggleState (e) {
    e.preventDefault()
    this.model.set('enabled', e.currentTarget.checked, { validate: true })
  },
  renderNameInput () {
    const { model } = this
    const { id, name } = model.attributes
    const canRename = model.can('rename')
    return canRename
      ? `<label class="sr-only" for="i-category-item-${id}">${gt('Category name')}</label><input type="text" class="form-control name" id="i-category-item-${id}" placeholder="${gt('Name')}" value="${name}">`
      : ''
  },
  renderDesc () {
    const { description } = this.model.attributes
    return description
      ? `<div class="description">${DOMPurify.sanitize(description, { ALLOWED_TAGS: [] })}</div>`
      : ''
  },
  render () {
    const { model, $el } = this
    const { enabled, id, name } = model.attributes
    const srOnly = model.can('rename') ? 'sr-only' : ''
    const disabled = model.can('disable') ? '' : 'disabled'
    $el.attr('data-id', id)
    $el.html(`
    <div>
      <div class="checkbox custom">
        <label for="category-item-${id}">
          <input type="checkbox" class="sr-only ${disabled}" id="category-item-${id}" ${enabled ? 'checked' : ''} ${disabled}>
          <i class="toggle" aria-hidden="true"></i>
          <span class="name ${srOnly}">${DOMPurify.sanitize(name, { ALLOWED_TAGS: [] })}</span>
        </label>
      </div>
      ${this.renderNameInput()}
      ${this.renderDesc()}
    </div>
    <div class="help-block error"></div>
    `)
    return this
  }
})

export default {
  open () {
    return new ModalDialog({
      async: true,
      collection: api.collection,
      enter: 'save',
      help: 'ox.appsuite.user.sect.email.manage.inboxcategories.html',
      maximize: false,
      point: 'io.ox/mail/categories/edit',
      title: gt('Configure categories')
    })
      .inject({
        onSave () {
          this.collection.update()
            .always(this.close.bind(this))
        },
        onToggle () {
          // toggle
          settings.set('categories/enabled', !isEnabled())
          // no need to show the hint
          if (isEnabled()) return
          // delay a bit not to confuse the user
          _.delay(function () {
            hotspot.add($('#io-ox-topbar-settings-dropdown-icon .dropdown-toggle svg'))
            yell('info', gt('You can enable categories again via the "Inbox categories" entry in the settings dropdown'))
              .on('notification:removed', function () {
                hotspot.removeAll()
              })
          }, 300)
          this.close()
        }
      })
      .extend({
        default () {
          const { collection, $footer, $body } = this
          $body.addClass('mail-categories-dialog').append(
            collection.map((category) => {
              const item = new CategoryItem({ collection, model: category, $footer })
              return item.render().$el
            })
          )
        },
        'locked-hint' () {
          const locked = this.collection.filter(function (model) {
            return !model.can('disable') || !model.can('rename')
          })
          if (!locked.length) return
          this.$body.append(
            $('<div class="hint">').text(
              gt('Please note that some categories are predefined and you might not be able to rename or disable them.')
            )
          )
        },
        register () {
          const { collection } = this
          collection.storeValues()
          this.on('save', this.onSave)
          this.on('toggle', this.onToggle)
          this.on('cancel', () => collection.resetValues())
        }
      })
      .addAlternativeButton({ label: gt('Disable categories'), action: 'toggle', className: (isEnabled() ? 'btn-default' : 'hidden') })
      .addButton({ label: gt('Cancel'), action: 'cancel', className: 'btn-default' })
      .addButton({ label: (isEnabled() ? gt('Save') : gt('Activate categories')), action: 'save' })
      .open()
  }
}
