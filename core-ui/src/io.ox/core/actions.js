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
import ox from '@/ox'
import moment from '@open-xchange/moment'
import * as util from '@/io.ox/backbone/views/actions/util'
import registry from '@/io.ox//core/main/registry'
import ext from '@/io.ox/core/extensions'
import gt from 'gettext'
import capabilities from '@/io.ox/core/capabilities'
import { settings } from '@/io.ox/core/settings'

const Action = util.Action

Action('io.ox/secondary/compose', {
  shortcut: 'New mail',
  capabilities: 'webmail && !guest',
  action () {
    registry.call('io.ox/mail/compose', 'open', null, { folderId: 'default0/INBOX' })
  }
})

Action('io.ox/secondary/newAppointment', {
  action: _.debounce(function (baton) {
    baton = new ext.Baton({ app: baton.app, appId: baton.appId })
    const date = moment().startOf('hour').add(1, 'hours')
    const options = {
      folder: 'cal://0/' + settings.get('folder/calendar'),
      startDate: { value: date.format('YYYYMMDD[T]HHmmss'), tzid: date.tz() },
      endDate: { value: date.add(1, 'hours').format('YYYYMMDD[T]HHmmss'), tzid: date.tz() }
    }
    ox.load(() => import('@/io.ox/calendar/actions/create'))
      .then(({ default: action }) => action(baton, options))
  }, 500, true)
})

Action('io.ox/secondary/newContact', {
  action () {
    registry.call('io.ox/contacts/edit', 'edit', { folder_id: settings.get('folder/contacts') })
  }
})

Action('io.ox/secondary/newTask', {
  action () {
    ox.load(() => import('@/io.ox/tasks/edit/main')).then(function ({ default: edit }) {
      edit.getApp().launch({ folderid: settings.get('folder/tasks') })
    })
  }
})

// Render dropdown

ext.point('io.ox/secondary').extend(
  {
    id: 'compose',
    index: 1000,
    render (baton) {
      if (baton.appId === 'io.ox/mail') return
      if (!capabilities.has('webmail && !guest')) return
      this.action('io.ox/secondary/compose', gt('New email'), baton)
    }
  },
  {
    id: 'newAppointment',
    index: 1100,
    render (baton) {
      if (baton.appId === 'io.ox/calendar') return
      if (!capabilities.has('calendar')) return
      this.action('io.ox/secondary/newAppointment', gt('New appointment'), baton)
    }
  },
  {
    id: 'newContact',
    index: 1200,
    render (baton) {
      if (baton.appId === 'io.ox/contacts' || baton.appId === 'io.ox/files') return
      if (!capabilities.has('contacts')) return
      this.action('io.ox/secondary/newContact', gt('New contact'), baton)
    }
  },
  {
    id: 'newTask',
    index: 1300,
    render (baton) {
      if (baton.appId === 'io.ox/tasks' || baton.appId === 'io.ox/files') return
      if (!capabilities.has('tasks')) return
      this.action('io.ox/secondary/newTask', gt('New task'), baton)
    }
  }
)
