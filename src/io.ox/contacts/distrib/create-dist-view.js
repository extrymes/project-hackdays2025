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

import views from '@/io.ox/backbone/views'
import mini from '@/io.ox/backbone/mini-views'

import AddParticipantView from '@/io.ox/participants/add'
import pViews from '@/io.ox/participants/views'
import pModel from '@/io.ox/participants/model'
import WindowActionButtonsView from '@/io.ox/core/window-action-buttons-view'

import gt from 'gettext'

const point = views.point('io.ox/contacts/distrib/create-dist-view')
const ContactCreateDistView = point.createView({
  tagName: 'div',
  className: 'create-distributionlist-view'
})

point.basicExtend({
  id: 'title-controls',
  index: 100,
  className: 'row title-controls',
  draw (baton) {
    const input = this.find('input[name="display_name"]')

    const $header = baton.app.getWindow().setHeader(
      new WindowActionButtonsView({
        app: baton.app,
        saveTitle: baton.model.get('id') ? gt('Save') : gt('Create list'),
        onSave () {
          // wait if there was an error so the user has a chance to react (invalid data in the input field etc)
          const error = baton.addParticipantView.resolve()
          if (error) return
          // trigger blur so name changes are applied
          input.trigger('blur')
          baton.member.resolve().always(function () {
            baton.model.save()
          })
        }
      }).render().$el
    )

    if (_.device('smartphone')) $header.show()
  }
})

point.extend({
  id: 'displayname',
  index: 200,
  className: 'row',
  render () {
    const guid = _.uniqueId('form-control-label-')
    this.$el.append(
      $('<div>').addClass('form-group col-md-12').append(
        // see Bug 31073 - [L3] Field "List name" is mentioned as Display Name in the error message appears on create distribution list page
        // #. Name of distribution list
        $('<label>').addClass('control-label').attr('for', guid).text(gt('Name')),
        new mini.InputView({ name: 'display_name', model: this.baton.model, className: 'form-control control', id: guid }).render().$el
      )
    )
  }
})

// member container
point.extend({
  id: 'participants_list',
  index: 300,
  className: 'row',
  render () {
    const self = this
    // define collection
    this.baton.member = new pModel.Participants(this.baton.model.get('distribution_list'), { silent: false })

    this.listenTo(this.baton.member, 'add remove', function (ctx, col) {
      const all = col.map(function (m) {
        // simple regex to check if the contact id string is a number (note: _.isNumber doesn't work for strings, parseInt has issues with mixed strings like 123abc)
        if (/^-?\d+$/.test(m.getContactID())) {
          return {
            id: m.getContactID(),
            folder_id: m.get('folder_id'),
            display_name: m.getDisplayName(),
            mail: m.getTarget(),
            mail_field: m.getFieldNumber()
          }
        }
        return {
          display_name: m.getDisplayName(),
          mail: m.getTarget(),
          mail_field: 0
        }
      })
      self.baton.model.set('distribution_list', all)
    })

    this.$el.append(new pViews.UserContainer({
      collection: this.baton.member,
      baton: this.baton,
      isMail: true,
      strict: true,
      empty: gt('This list has no members yet')
    }).render().$el)
  }
})

// add member view
point.extend({
  id: 'add-participant',
  index: 400,
  className: 'row',
  render () {
    const view = new AddParticipantView({
      apiOptions: {
        contacts: true
      },
      placeholder: gt('Add contact') + ' \u2026',
      label: gt('Add contact'),
      collection: this.baton.member,
      scrollIntoView: true,
      isMail: true
    })
    this.$el.append(
      view.$el
    )
    view.render().$el.addClass('col-md-6')

    this.baton.addParticipantView = view
  }
})

point.extend({
  id: 'notice',
  index: 400,
  className: 'row',
  render () {
    this.$el.append(
      $('<div class="col-md-6">').append(
        $('<div class="help-block">').text(gt('To add contacts manually, just provide a valid email address (e.g john.doe@example.com or "John Doe" <jd@example.com>)'))
      )
    )
  }
})

export default ContactCreateDistView
