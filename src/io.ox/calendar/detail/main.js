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

import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import ext from '@/io.ox/core/extensions'
import detailView from '@/io.ox/calendar/view-detail'
import yell from '@/io.ox/core/yell'

import gt from 'gettext'

const NAME = 'io.ox/calendar/detail'

ox.ui.App.mediator(NAME, {
  'show-appointment' (app) {
    app.showAppointment = function (appointment) {
      api.get(appointment).then(
        function success (model) {
          app.setTitle(model.get('summary'))
          app.getWindowNode().addClass('detail-view-app').append($('<div class="f6-target detail-view-container" tabindex="0" role="complementary">').attr({
            'aria-label': gt('Appointment Details')
          }).append(detailView.draw(new ext.Baton({ model }))))

          api.once('delete:' + util.cid(model.attributes), function () {
            app.quit()
          })
        },
        function fail () {
          yell('error', gt('An error occurred. Please try again.'))
        }
      )
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
  return app.setLauncher(options => {
    const { cid } = options
    const win = ox.ui.createWindow({
      chromeless: true,
      name: NAME,
      toolbar: false,
      closable: true,
      floating: !_.device('smartphone')
    })
    app.setWindow(win)
    app.mediate()
    win.show()
    let obj
    if (cid !== undefined) {
      // called from calendar app
      obj = util.cid(cid)
      app.setState({ folder: obj.folder, id: obj.id, recurrenceId: obj.recurrenceId || null })
      app.showAppointment(obj)
      return
    }

    // deep-link
    if (options.folder && options.id) app.setState({ folder: options.folder, id: options.id })

    obj = app.getState()

    if (obj.folder && obj.id) app.showAppointment(obj)
  })
}

export default {
  getApp: createInstance
}
