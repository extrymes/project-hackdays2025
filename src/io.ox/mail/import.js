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
import ext from '@/io.ox/core/extensions'
import api from '@/io.ox/mail/api'
import accountAPI from '@/io.ox/core/api/account'
import upload from '@/io.ox/core/tk/upload'
import dropzone from '@/io.ox/core/dropzone'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

ext.point('io.ox/mail/mediator').extend({
  id: 'import-eml',
  index: 1000000000000,
  setup (app) {
    if (app.settings.get('features/importEML') === false) return

    const win = app.getWindow()

    app.queues = {
      importEML: upload.createQueue({
        start () {
          win.busy()
        },
        progress (item, position, items) {
          return api.importEML({ file: item.file, folder: item.options.folder })
            .done(function (data) {
              const first = _(data.data || []).first() || {}
              // add response for external listeners
              item.response = first
              // no clue if upper-case is correct here and if errors wind up here
              if ('Error' in first) {
                yell('error', first.Error)
              } else {
                yell('success', items.length <= 1
                  ? gt('Mail has been imported')
                  : gt('Mail %1$n of %2$n has been imported', position + 1, items.length)
                )
              }
            })
          // we need a fail handler für server-side errors (as well)
            .fail(yell)
        },
        stop () {
          win.idle()
        },
        type: 'importEML'
      })
    }
    const Zone = dropzone.Inplace.extend({
      isSupported () {
        return !accountAPI.isUnifiedFolder(app.folder.get())
      }
    })
    const zone = new Zone({
      caption: gt('Drop EML file here for import'),
      filter: /\.eml$/i
    })

    zone.on({
      show () {
        app.right.removeClass('preview-visible')
        app.listControl.$el.stop().hide()
      },
      hide () {
        app.listControl.$el.fadeIn('fast')
      },
      drop (files) {
        app.queues.importEML.offer(files, { folder: app.folder.get() })
      },
      invalid () {
        yell('error', gt('Mail was not imported. Only .eml files are supported.'))
      }
    })

    app.left.append(
      zone.render().$el.addClass('abs')
    )
  }
})
