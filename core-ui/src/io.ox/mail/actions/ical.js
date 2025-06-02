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
import conversionAPI from '@/io.ox/core/api/conversion'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/core/settings'
import { settings as calendarSettings } from '@/io.ox/calendar/settings'
import gt from 'gettext'

export default function (baton) {
  const attachment = _.isArray(baton.data) ? _.first(baton.data) : baton.data

  conversionAPI.convert(
    {
      identifier: 'com.openexchange.mail.ical',
      args: [
        { 'com.openexchange.mail.conversion.fullname': attachment.parent.folder_id },
        { 'com.openexchange.mail.conversion.mailid': attachment.parent.id },
        { 'com.openexchange.mail.conversion.sequenceid': attachment.id }
      ]
    },
    {
      identifier: 'com.openexchange.chronos.ical',
      args: [
        { 'com.openexchange.groupware.calendar.folder': calendarSettings.get('chronos/defaultFolderId') },
        { 'com.openexchange.groupware.task.folder': settings.get('folder/tasks') }
      ]
    }
  )
    .done(function () {
      yell('success', gt('The appointment has been added to your calendar'))
    })
    .fail(yell)
};
