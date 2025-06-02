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
import api from '@/io.ox/tasks/api'
import yell from '@/io.ox/core/yell'
import detailView from '@/io.ox/tasks/view-detail'
import ext from '@/io.ox/core/extensions'

import gt from 'gettext'

const NAME = 'io.ox/tasks/detail'

ox.ui.App.mediator(NAME, {
  'show-task' (app) {
    app.showTask = function (task) {
      const ecid = _.ecid(task)
      api.get(task).done(function (data) {
        const baton = ext.Baton({ data, app })
        const handleDelete = function (e, tasks) {
          if (e.type === 'delete:' + ecid) {
            app.quit()
            return
          }
          _(tasks).each(function (taskObj) {
            if (taskObj.id === baton.data.id && taskObj.folder_id === baton.data.folder_id) {
              app.quit()
            }
          })
        }
        app.setTitle(data.title)
        api.on('delete ' + 'delete:' + ecid, handleDelete)
        app.on('quit', function () {
          api.off('delete ' + 'delete:' + ecid, handleDelete)
        })

        app.getWindowNode().addClass('detail-view-app').append(
          $('<div class="f6-target detail-view-container" tabindex="-1" role="region">')
            .attr('aria-label', gt('Task Details'))
            .append(detailView.draw(baton)))
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
      closable: true,
      floating: !_.device('smartphone')
    })

    app.setWindow(win)
    app.mediate()
    win.show()

    const cid = options.cid; let obj
    if (cid !== undefined) {
      // called from tasks app
      obj = _.cid(cid)
      app.folder.set(obj.folder_id)// needed for inline links to work correctly
      app.setState({ folder: obj.folder_id, id: obj.id })
      app.showTask(obj)
      return
    }

    // deep-link
    obj = app.getState()

    if (obj.folder && obj.id) {
      app.folder.set(obj.folder)// needed for inline links to work correctly
      app.showTask(obj)
    }
  })
}

export default {
  getApp: createInstance
}
