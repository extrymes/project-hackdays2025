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

import ext from '@/io.ox/core/extensions'
import DisposableView from '@/io.ox/backbone/views/disposable'
import common from '@/io.ox/backbone/mini-views/common'
import ModalDialog from '@/io.ox/backbone/views/modal'
import Typeahead from '@/io.ox/core/tk/typeahead'
import members from '@/plugins/administration/groups/settings/members'
import groupAPI from '@/io.ox/core/api/group'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

//
// Edit/create view
//

const View = DisposableView.extend({

  className: 'administration-group-editor',

  initialize () {
    this.membersView = new members.View({ model: this.model, editable: true })
    this.original = this.model.toJSON()

    /*
     * extension point for autocomplete item
     */
    ext.point('plugins/administration/groups/settings/edit/autoCompleteItem').extend({
      id: 'view',
      index: 100,
      draw (member) {
        this.append($('<div>').html(member.getFullNameHTML()))
      }
    })
  },

  render () {
    let guid
    const self = this
    const view = new Typeahead({
      apiOptions: {
        users: true,
        split: false
      },
      placeholder: gt('User name'),
      harmonize (data) {
        data = _(data).map(function (m) {
          m.internal_userid = m.id
          return new members.Member(m)
        })
        // remove duplicate entries from typeahead dropdown
        const col = self.membersView.collection
        return _(data).filter(function (model) {
          return !col.get(model.id)
        })
      },
      click (e, member) {
        self.membersView.collection.add(member, { parse: true })
      },
      extPoint: 'plugins/administration/groups/settings/edit'
    })

    this.$el.append(
      // name
      $('<div class="form-group">').append(
        $('<label>', { for: guid = _.uniqueId('input') }).text(gt('Group name')),
        new common.InputView({ name: 'display_name', id: guid, model: this.model }).render().$el
      ),
      // auto-complete
      $('<div class="form-group">').append(
        $('<label class="sr-only">', { for: guid = _.uniqueId('input') }).text(gt('Start typing to search for user names')),
        view.$el.attr({ id: guid })
      ),
      // members view
      $('<div class="form-group">').append(
        $('<label>', { for: guid = _.uniqueId('list') }).text(gt('Members')),
        this.membersView.render().$el.attr('id', guid)
      )
    )

    view.render()
    return this
  },

  toJSON () {
    return {
      id: this.model.get('id'),
      name: this.model.get('name'),
      display_name: this.model.get('display_name'),
      members: this.membersView.toJSON()
    }
  }
})

export default {

  //
  // Open modal dialog
  //
  open (options) {
    options = options || {}

    let model = groupAPI.getModel(options.id).clone()
    const edit = model.has('id')

    new ModalDialog({ title: edit ? gt('Edit group') : gt('Create new group'), async: true })
      .build(function () {
        this.$body.append(
          (this.view = new View({ model })).render().$el
        )
      })
      .addCancelButton()
      .addButton({ label: edit ? gt('Save') : gt('Create'), action: 'save' })
      .on('save', function () {
        const self = this
        groupAPI[edit ? 'update' : 'create'](this.view.toJSON()).then(
          function success () {
            self.close()
          },
          function fail (error) {
            yell(error)
            self.idle()
          }
        )
      })
      .on('close', function () {
        this.view = null
      })
      .open()

    model = null
  }
}
