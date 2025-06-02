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

import api from '@/io.ox/files/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

export default function (data) {
  new ModalDialog({ title: gt('Description') })
    .build(function () {
      this.$body.append(
        this.$textarea = $('<textarea rows="10" class="form-control" maxlength="65535" >').val(data.description)

      )
    })
    .addCancelButton()
    .addButton({ label: gt('Save'), action: 'save' })
    .on('save', function () {
      return api.update(data, { description: this.$textarea.val() }).fail(function (error) {
        // too long description
        // #. %1$d: max number of characters
        if (error.code === 'IFO-0100' && error.truncated.toString() === '706') return yell('error', gt('File description can only be %1$d characters long.', error.problematic[0].max_size))
        yell(error)
      })
    })
    .open()
};
