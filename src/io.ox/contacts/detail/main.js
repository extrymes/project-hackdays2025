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

import ox from '@/ox'
import api from '@/io.ox/contacts/api'
import yell from '@/io.ox/core/yell'
import detailView from '@/io.ox/contacts/view-detail'

import ext from '@/io.ox/core/extensions'
import * as util from '@/io.ox/contacts/util'

import gt from 'gettext'

const NAME = 'io.ox/contacts/detail'

ox.ui.App.mediator(NAME, {
  'show-contact' (app) {
    app.showContact = function (contact) {
      api.get(contact).done(function (data) {
        const baton = ext.Baton({ data })
        const title = util.getFullName(data)
        const label = data.mark_as_distributionlist ? gt('Distribution List Details') : gt('Contact Details')

        app.setTitle(title)
        api.on('delete:' + _.ecid(data), function () {
          app.quit()
        })
        app.on('quit', function () {
          api.off('delete:' + _.ecid(data), function () {
            app.quit()
          })
        })

        app.getWindowNode().addClass('detail-view-app').append(
          $('<div class="f6-target detail-view-container" role="region" tabindex="-1">').attr('aria-label', label).append(
            detailView.draw(baton)
          )
        )
      }).fail(yell)
    }
  }
})

// multi instance pattern
function createInstance () {
  // application object
  const app = ox.ui.createApp({
    closable: true,
    name: NAME,
    title: '',
    floating: !_.device('smartphone')
  })

  // launcher
  return app.setLauncher(function (options) {
    const win = ox.ui.createWindow({
      chromeless: true,
      name: NAME,
      toolbar: false,
      floating: !_.device('smartphone'),
      closable: true
    })

    app.setWindow(win)
    app.mediate()
    win.show()

    const cid = options.cid; let obj
    if (cid !== undefined) {
      // called from contacts app
      obj = _.cid(cid)
      app.setState({ folder: obj.folder_id, id: obj.id })
      app.showContact(obj)
      return
    }

    // deep-link
    obj = app.getState()

    if (obj.folder && obj.id) {
      app.showContact(obj)
    }
  })
}

export default {
  getApp: createInstance
}
