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
import Backbone from 'backbone'
import _ from '@/underscore'
import DisposableView from '@/io.ox/backbone/views/disposable'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { InputView, RadioView, TextView } from '@/io.ox/backbone/mini-views/common'
import { DelegatesView, AddDelegateView } from '@/plugins/administration/resources/settings/view-delegates'
import { resourceCollection } from '@/io.ox/core/api/resource'
import { ResourceModel } from '@/io.ox/core/api/resource-model'
import { hasFeature } from '@/io.ox/core/feature'
import yell from '@/io.ox/core/yell'
import '@/plugins/administration/resources/settings/style.scss'
import '@/io.ox/contacts/util'

import gt from 'gettext'

//
// Edit/create view
//

const ModalBodyView = DisposableView.extend({

  className: 'resource-editor-view',

  initialize () {
    this.original = this.model.toJSON()
    this.permissionsCollection = this.model.getPermissionsAsCollection()

    // initial value depending on permissions of all-users-group ('ask_to_book' vs. 'book_directly')
    const value = this.permissionsCollection.get('group:0').get('privilege')
    this.configModel = new Backbone.Model({ 'booking-behavior': value })

    this.listenTo(this.configModel, 'change:booking-behavior', this.toggleDelegatesList)
    this.toggleDelegatesList()
  },

  render () {
    const nameFieldGuid = _.uniqueId('input')
    this.$el.append(
      $('<div class="form-group">').append(
        $(`<label for="${nameFieldGuid}" class="text-gray">`).text(gt('Name')),
        new InputView({ name: 'display_name', id: nameFieldGuid, model: this.model, maxlength: 100, validate: false, mandatory: true }).render().$el,
        $('<div class="error help-block hidden" data-property="display_name" data-validation="display_name:conflict">').text(
          gt('This name is already used. Please choose a different one.')
        ),
        $('<div class="error help-block hidden" data-property="display_name" data-validation="display_name:missing">').text(
          gt('This field is mandatory')
        )
      )
    )

    const mailFieldGuid = _.uniqueId('input')
    this.$el.append(
      $('<div class="form-group">').append(
        $(`<label for="${mailFieldGuid}" class="text-gray" required="true">`).text(gt('Email address')),
        new InputView({ name: 'mailaddress', id: mailFieldGuid, model: this.model, validate: false, mandatory: true }).render().$el.attr('type', 'email'),
        $('<div class="error help-block hidden" data-property="mailaddress" data-validation="mailaddress:conflict">').text(
          gt('This email address is already used. Please choose a different one.')
        ),
        $('<div class="error help-block hidden" data-property="mailaddress" data-validation="mailaddress:invalid">').text(
          gt('This email address is invalid.')
        ),
        $('<div class="error help-block hidden" data-property="display_name" data-validation="mailaddress:missing">').text(
          gt('This field is mandatory')
        )
      )
    )

    const descriptionFieldGuid = _.uniqueId('input')
    this.$el.append(
      $('<div class="form-group">').append(
        $(`<label for="${descriptionFieldGuid}" class="text-gray">`).text(gt('Description (optional)')),
        new TextView({ name: 'description', id: descriptionFieldGuid, model: this.model, rows: 6, validate: false }).render().$el
      )
    )

    if (!hasFeature('managedResources')) return this
    this.$el.append(
      $('<div class="form-group">').append(
        $('<h2 class="mb-5 heading-unstyled text-gray font-bold leading-5">').text(gt('Booking behavior')),
        new RadioView({
          name: 'booking-behavior',
          model: this.configModel,
          list: [
            { label: gt('Booking requests are automatically accepted if the resource is free.'), value: 'book_directly' },
            { label: gt('Resource delegates manually accept or decline the booking request.'), value: 'ask_to_book' }
          ],
          validate: false
        }).render().$el)
    )

    this.$el.append(
      $('<div class="form-group add-delegates">').append(
        new AddDelegateView({
          collection: this.permissionsCollection,
          scrollIntoView: true
        }).render().$el.addClass('mb-16')
      )
    )

    this.$el.append(
      $('<div class="form-group delegates">').append(
        $('<h2 class="mb-5 heading-unstyled text-gray font-bold leading-5">').text(gt('Resource delegates')),
        new DelegatesView({
          collection: this.permissionsCollection,
          editable: true,
          empty: gt('This list has no delegates yet'),
          label: 'no'
        }).render().$el
      )
    )

    return this
  },
  toggleDelegatesList () {
    const value = this.configModel.get('booking-behavior')
    this.$el.toggleClass('book_directly', value === 'book_directly')
  }

})

export default {

  open (options = {}) {
    const model = (resourceCollection.get(options.id) || new ResourceModel()).clone()
    const isEdit = model.has('id')

    new ModalDialog({
      title: isEdit ? gt('Edit resource') : gt('Create new resource'),
      width: 560,
      async: true
    })
      .inject({
        validate () {
          const errors = this.view.model.validate()
          this.$('.error[data-validation]').toggleClass('hidden', true)
          errors.forEach(error => this.$(`.error[data-validation="${error}"]`).toggleClass('hidden', false))
          return errors
        }
      })
      .build(function () {
        this.$el.addClass('resource-editor-dialog')
        this.$body.append(
          (this.view = new ModalBodyView({ model })).render().$el
        )
      })
      .addCancelButton()
      .addButton({ label: isEdit ? gt('Save') : gt('Create'), action: 'save' })
      .on('save', function save () {
        const dialogView = this
        const { model, configModel, permissionsCollection } = this.view
        // abort when validation fails
        const validationErrors = this.validate()
        if (validationErrors.length) return this.idle()
        // remove delegates in case user changed booking behavior in general
        if (configModel.get('booking-behavior') === 'book_directly') {
          permissionsCollection.remove(permissionsCollection.getDelegates())
        }
        model
          .set('permissions', permissionsCollection.toJSON())
          .save().then(
            () => {
              dialogView.close()
            },
            error => {
              yell(error)
              dialogView.idle()
            }
          )
      })
      // arrow function would have 'wrong' context
      .on('close', function () { this.view.dispose() })
      .open()
  }
}
