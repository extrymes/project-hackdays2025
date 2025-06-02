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

import ext from '@/io.ox/core/extensions'
import dropzone from '@/io.ox/core/dropzone'
import yell from '@/io.ox/core/yell'
import importAPI from '@/io.ox/core/api/import'
import calendarAPI from '@/io.ox/calendar/api'
import folderAPI from '@/io.ox/core/folder/api'
import { hasFeature } from '@/io.ox/core/feature'
import _ from '@/underscore'

import gt from 'gettext'

ext.point('io.ox/calendar/mediator').extend({
  id: 'import-ics',
  index: 1000000000000,
  setup (app) {
    if (_.device('smartphone')) return
    if (!hasFeature('dragDropICAL')) return

    const win = app.getWindow()
    const zone = new dropzone.Inplace({
      caption: gt('Drop ICS or ICAL files here to import'),
      filter: /\.(ics|ical)$/i
    })

    zone.on({
      async drop (files) {
        const folderId = app.folder.get()
        const folder = await folderAPI.get(folderId)
        const fileImports = files.map(file =>
          importAPI.importFile({
            file,
            type: 'ICAL',
            ignoreUIDs: true,
            folder: folderId,
            longRunningJobCallback: () => {
              yell('info', gt('This action takes some time, so please be patient, while the import runs in the background.'))
            }
          })
        )
        await Promise.allSettled(fileImports).then(() => {
          calendarAPI.pool.gc()
          calendarAPI.refresh()
          folderAPI.reload(folder)
        })
      },
      invalid () {
        yell('error', gt('Calendar was not imported. Only .ics and .ical files are supported.'))
      }
    })

    win.nodes.main.append(
      zone.render().$el.addClass('abs')
    )
  }
})
