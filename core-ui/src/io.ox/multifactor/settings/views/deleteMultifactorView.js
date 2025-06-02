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
import Backbone from '@/backbone'

import ext from '@/io.ox/core/extensions'
import ModalView from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import api from '@/io.ox/multifactor/api'

import gt from 'gettext'

const POINT = 'multifactor/settings/deleteMultifactor'
let INDEX = 0

let def, dialog

function open (device) {
  dialog = openModalDialog(device)
  def = new $.Deferred()
  return def
}

function openModalDialog (device) {
  return new ModalView({
    async: true,
    point: POINT,
    title: gt('Delete Multifactor Device'),
    width: 640,
    enter: 'cancel',
    model: new Backbone.Model({
      device,
      id: $(device).attr('data-deviceId'),
      name: $(device).attr('data-deviceName'),
      provider: $(device).attr('data-provider')
    })
  })
    .build(function () {
    })
    .addAlternativeButton({ label: gt('Delete'), action: 'delete' })
    .on('delete', function () {
      const dialog = this
      doDelete(this.model).done(function () {
        dialog.close()
        def.resolve()
      })
        .fail(function (e) {
          dialog.idle()
          if (e && e.length > 1) yell('error', e)
          def.reject()
        })
    })
    .addButton({ label: gt('Cancel'), action: 'cancel' })
    .open()
}

ext.point(POINT).extend(
  {
    index: INDEX += 100,
    id: 'header',
    render (baton) {
      // #.  Devices are named.  This is the text for the deleting a multifactor device
      this.$body.append($('<p>').text(gt('This will delete the device named %s.', baton.model.get('name'))))
    }
  }

)

function doDelete (model) {
  const def = $.Deferred()
  api.deleteDevice(model.get('provider'), model.get('id')).then(def.resolve, function () {
    yell('error', gt('Unable to delete'))
    def.reject()
    dialog.close()
  })
  return def
}

export default {
  open,
  doDelete
}
