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

import ext from '@/io.ox/core/extensions'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import ModalDialog from '@/io.ox/backbone/views/modal'
import resourceAPI, { resourceCollection } from '@/io.ox/core/api/resource'
import { ResourceModel } from '@/io.ox/core/api/resource-model'
import editDialog from '@/plugins/administration/resources/settings/view-edit'
import { Action } from '@/io.ox/backbone/views/actions/util'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

//
// Actions
//

Action('administration/resources/create', {
  action () {
    editDialog.open()
  }
})

Action('administration/resources/edit', {
  collection: 'one',
  capabilities: 'edit_resource',
  action (baton) {
    editDialog.open({ id: baton.first().id })
  }
})

Action('administration/resources/delete', {
  collection: 'one',
  capabilities: 'edit_resource',
  action (baton) {
    const { id } = baton.first()
    const model = resourceCollection.get(id) || new ResourceModel()
    const detailPopupNode = document.querySelector(`.detail-popup-resource[data-cid="${id}"]`)
    // #. 'Delete resource' as head of a modal dialog to confirm to delete a resource
    // #. %1$s is the resource name
    const dialog = new ModalDialog({ async: true, title: gt('Delete resource'), description: gt('Do you really want to delete the resource "%1$s"? This action cannot be undone!', model.get('display_name')) })
      .addCancelButton()
      .addButton({ label: gt('Delete resource'), action: 'delete' })
      .on('delete', function onDelete () {
        resourceAPI.remove(id)
          .then(() => detailPopupNode?.remove(), yell)
          .always(dialog.close)
      })
      .open()
  }
})

//
// Toolbar links
//

ext.point('administration/resources/toolbar/inline').extend({
  index: 200,
  prio: 'hi',
  mobile: 'hi',
  id: 'edit',
  title: gt('Edit'),
  icon: 'bi/pencil.svg',
  drawDisabled: false,
  ref: 'administration/resources/edit'
}, {
  index: 300,
  prio: 'hi',
  mobile: 'hi',
  id: 'delete',
  title: gt('Delete'),
  icon: 'bi/trash.svg',
  drawDisabled: false,
  ref: 'administration/resources/delete'
})

export const ResourcesToolbarView = ToolbarView.extend({
  // needs to be this syntax
  constructor: function (options = { simple: true, align: 'right' }) {
    ToolbarView.prototype.constructor.call(this, { ...options })
  },
  update (selection = []) {
    // convert list of string ids to object with interger based id
    return this.setData(selection.map(id => { return { id: parseInt(id, 10) } }))
  }
})
