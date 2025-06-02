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

import api from '@/io.ox/files/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { validateFilename, confirmDialog } from '@/io.ox/files/util'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

export default function (data) {
  const filename = data['com.openexchange.file.sanitizedFilename'] || data.filename || data.title

  function rename (name) {
    // 'title only' entries vs files
    const changes = !data.filename && data.title ? { title: name } : { filename: name }
    return api.update(data, changes).fail(notify)
  }

  // notifications lazy load
  function notify () {
    const self = this; const args = arguments
    yell.apply(self, args)
  }

  /**
   * user have to confirm if name doesn't contains a file extension
   * @return {jQuery.Promise}
   */
  function process (name) {
    const warnings = validateFilename(name)

    if (warnings.length) {
      warnings.forEach(warning => notify('warning', warning))
      return $.Deferred().reject()
    }

    // show confirm dialog if necessary
    return confirmDialog(name, filename).then(rename.bind(this, name))
  }

  new ModalDialog({ title: gt('Rename'), enter: 'rename', async: true, select: false })
    .build(function () {
      const self = this
      this.$body.append(
        $('<input type="text" name="name" class="form-control">')
          .on('keyup', function () {
            self.$footer.find('[data-action="rename"]').prop('disabled', _.isEmpty(this.value))
          })
      )
      // Test for Guard .suffix.pgp such as .jpg.pgp
      const highlight = (/\.[a-z0-9]+\.pgp/i).test(filename) ? filename.replace('.pgp', '').lastIndexOf('.') : filename.lastIndexOf('.')
      const node = this.$body
      _.defer(function () {
        node.find('input[name="name"]')
          .focus().val(filename)
          .get(0).setSelectionRange(0, highlight > -1 ? highlight : filename.length)
      })
    })
    .addCancelButton()
    .addButton({ label: gt('Rename'), action: 'rename' })
    .on('rename', function () {
      const node = this.$body
      const name = node.find('input[name="name"]').val()
      process(name).then(this.close, this.idle).fail(function () {
        _.defer(function () { node.focus() })
      })
    })
    .open()
};
