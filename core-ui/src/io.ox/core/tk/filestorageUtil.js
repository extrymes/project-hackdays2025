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

import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'
import '@/io.ox/files/style.scss'
import gt from 'gettext'

// this file contains helper methods for external file storages, such as a method for displaying conflicts

/* displays conflicts when a filestorage does not support some features like versioning. Offers cancel and ignore warnings function
  conflicts is an object with a title and a warnings array containing strings
  options may have :
    callbackIgnoreConflicts - function that is called when the ignore conflicts button is pressed
    callbackCancel - function that is called when the ignore cancel button is pressed
  if there is no callback function only an OK button is drawn
*/
export function displayConflicts (conflicts, options = {}) {
  const dialog = new ModalDialog({ title: gt('Conflicts') })
  if (!options.callbackCancel && !options.callbackIgnoreConflicts) {
    dialog.addButton({ label: gt('Ok'), action: 'ok' })
  } else {
    // #. 'Ignore conflicts' as button text of a modal dialog to confirm to ignore conflicts.
    dialog.addCancelButton()
      .addButton({ label: gt('Ignore conflicts'), action: 'ignorewarnings' })
  }
  dialog.build(function () {
    // build a list of warnings
    const warnings = (conflicts.warnings || []).map(warning => {
      return $('<div class="filestorage-conflict-warning">').text(warning)
    })
    this.$body.append(
      $('<div>').text(conflicts.title),
      warnings.length ? $('<div class="filestorage-conflict-container">').append($('<h4>').text(gt('Warnings:')), warnings) : ''
    )
  })
    .on('ignorewarnings', function () {
      if (options.callbackIgnoreConflicts) options.callbackIgnoreConflicts(conflicts)
    })
    .on('cancel', function () {
      if (options.callbackCancel) options.callbackCancel(conflicts)
      else yell('info', gt('Canceled'))
    })
    .open()
}

export default { displayConflicts }
