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

import gt from 'gettext'
import ModalDialog from '@/io.ox/backbone/views/modal'
import { createApp } from 'vue'
import ShortcutHelp from '@/io.ox/shortcuts/ShortcutHelp.vue'
// import ProfileSelect from '@/io.ox/shortcuts/profileSelect.vue'

import * as actionsUtil from '@/io.ox/backbone/views/actions/util'

let modal

const openDialog = function () {
  if (modal?.el) return

  modal = new ModalDialog({
    title: gt('Keyboard shortcuts'),
    // help: 'tbd.html',
    className: 'shortcuts-help-modal modal flex'
  })
    .build(function () {
      const app = createApp(ShortcutHelp)
      app.mount(this.el.querySelector('.modal-body'))

      // const app2 = createApp(ProfileSelect)
      // const $div = "<div id='profile-select'></div>"
      // this.$footer.prepend($div)
      // app2.mount(this.el.querySelector('#profile-select'))
    })
    .addCloseButton()
    .open()
}

actionsUtil.Action('io.ox/shortcuts/actions/showHelp', {
  shortcut: 'Show shortcut help',
  action: function (baton) {
    openDialog()
  }
})
