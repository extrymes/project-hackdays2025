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
import ModalDialog from '@/io.ox/backbone/views/modal'
import api from '@/io.ox/core/folder/api'
import mini from '@/io.ox/backbone/mini-views/common'

import { removeResourceFolderGroup, removeResourceFolder } from '@/io.ox/calendar/resources/actions'

import gt from 'gettext'

export function addResourceDialog (model, opt) {
  new ModalDialog({
    model,
    async: true,
    enter: 'add',
    help: 'ox.appsuite.user.sect.calendar.resourcecalendar.add.html',
    focus: 'input[name="folder-name"]',
    previousFocus: $(document.activeElement),
    width: _.device('smartphone') ? window.innerWidth - 30 : 400
  })
    .build(function () {
      this.$('.modal-title').text(gt('Add new resource calendar group'))
      const guid = _.uniqueId('label_')
      this.$body.append(
        $('<div class="form-group">').append(
          $('<label class="sr-only">').text(gt('Resource calendar group name')).attr('for', guid),
          new mini.InputView({ id: guid, name: 'folder-name', model: this.model, autocomplete: false, mandatory: true, validate: true }).render().$el,
          new mini.ErrorView({ name: 'folder-name', model: this.model }).render().$el
        ),
        $('<div class="help-block">').text(
          gt('A resource calendar group is used to collect specific resources such as rooms, hardware or others that can be booked by other users.')
        )
      )
    })
    .addCancelButton()
    .addButton({ action: 'add', label: gt('Add') })
    .on({
      add () {
        if (this.model.validationError) return this.idle()
        this.model.save()
        this.close()
      },
      open () {
        this.$('input[name="folder-name"]').attr('placeholder', gt('New resource group')).focus().select()
      }
    })
    .open()
}

function deleteHandler (id, options) {
  if (options.removeResource) return removeResourceFolder(id, options)
  if (options.removeResourceGroup) return removeResourceFolderGroup(id)
}

export function removeResourceDialog (id, options = {}) {
  const model = api.pool.getModel(id)
  const title = options.removeResourceGroup ? gt('Delete resource calendar group') : gt('Delete resource calendar')
  const description = options.removeResourceGroup
  // #. Name of the resource calendar group that is going to be deleted
    ? gt('Do you really want to delete resource calendar group "%s"?', model.get('title'))
  // #. Name of the resource calendar that is going to be deleted
    : gt('Do you really want to delete calendar "%s"?', model.get('title'))

  new ModalDialog({ title, description })
    .addCancelButton()
    .addButton({ label: gt('Delete'), action: 'delete' })
    .on('delete', function () { deleteHandler(id, options) })
    .open()
};
