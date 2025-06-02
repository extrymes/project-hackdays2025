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

import api from '@/io.ox/tasks/api'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

export default function (data, state) {
  let mods, message

  if (state === 3) {
    mods = {
      status: 1,
      percent_completed: 0,
      date_completed: null
    }
    // do not use "gt.ngettext" for plural without count
    message = (data.length === 1) ? gt('Task marked as undone') : gt('Tasks marked as undone')
  } else {
    mods = {
      status: 3,
      percent_completed: 100,
      date_completed: _.now()
    }
    // do not use "gt.ngettext" for plural without count
    message = (data.length === 1) ? gt('Task marked as done') : gt('Tasks marked as done')
  }

  api.updateMultiple(data, mods).then(
    function () {
      _(data).each(function (item) {
        api.trigger('update:' + _.ecid(item))
        api.trigger('update', item)
      })
      yell('success', message)
    },
    function (result) {
      yell('error', result)
    }
  )
}
