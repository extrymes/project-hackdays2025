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

import _ from '@/underscore'

import api from '@/io.ox/mail/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'
import { settings } from '@/io.ox/mail/settings'

export default function (id) {
  let days = settings.get('archive/days')
  days = _.isNumber(days) && days > 1 ? days : 90

  new ModalDialog({
    title: gt('Archive messages'),
    description: gt('All messages older than %1$d days will be moved to the archive folder', days) + '.'
  })
    .addCancelButton()
  // #. Verb: (to) archive messages
    .addButton({ label: gt.pgettext('verb', 'Archive'), action: 'archive' })
    .on('archive', function () {
      // #. notification while archiving messages
      yell('busy', gt('Archiving messages ...'))
      api.archiveFolder(id, { days }).then(yell.done, yell)
    })
    .open()
};
