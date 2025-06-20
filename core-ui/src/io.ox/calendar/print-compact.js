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

import print from '@/io.ox/core/print'
import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import _ from '@/underscore'
import $ from '@/jquery'

import gt from 'gettext'

function getDate (data) {
  const strings = util.getDateTimeIntervalMarkup(data, { output: 'strings' })
  return strings.dateStr + ' ' + strings.timeStr
}

function process (data) {
  return {
    original: data,
    subject: data.get('summary'),
    location: $.trim(data.get('location')),
    date: getDate(data.attributes),
    participants: _(data.get('attendees')).where({ cuType: 'INDIVIDUAL' }).concat(_(data.attendees).where({ cuType: undefined })).length
  }
}

export default {

  open (selection, win) {
    print.smart({

      get (obj) {
        return api.get(obj)
      },

      i18n: {
        location: gt('Location'),
        participants: gt('Participants')
      },

      title: selection.length === 1 ? selection[0].get('summary') : undefined,

      process,
      selection,
      selector: '.appointment-compact',
      window: win
    })
  }
}
