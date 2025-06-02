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
import threadView from '@/io.ox/mail/threadview'
import api from '@/io.ox/mail/api'
import * as util from '@/io.ox/mail/util'
import yell from '@/io.ox/core/yell'

const NAME = 'io.ox/mail/detail'

ox.ui.App.mediator(NAME, {
  /*
   * Setup thread view
   */
  'thread-view' (app) {
    app.threadView = new threadView.Desktop({ disableDrag: true, standalone: true })
    app.getWindow().nodes.main
      .addClass('detail-view-app')
      .append(app.threadView.render().$el)
  },
  /*
   * Show thread/email
   */
  'show-mail' (app) {
    app.showMail = function (cid) {
      app.threadView.show(cid)
      if (app.threadView.model) {
        const subject = app.threadView.model.get('subject')
        app.setTitle(util.getSubject(subject))
        // respond to 'remove' event to close the detail view
        app.threadView.listenTo(app.threadView.model, 'remove', function () {
          app.quit()
        })
      }
    }
  }
})

// multi instance pattern
function createInstance () {
  // application object
  const app = ox.ui.createApp({
    closable: true,
    floating: !_.device('smartphone'),
    name: NAME,
    title: ''
  })

  app.on('quit', function () {
    app.threadView.remove()
    app.threadView = null
  })

  function cont (cid) {
    api.get(_.cid(cid)).then(
      function success () {
        app.showMail(cid)
      },
      yell
    )
  }

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

    let cid = options.cid; let obj

    if (cid !== undefined) {
      // called from mail app
      obj = _.cid(String(cid).replace(/^thread\./, ''))
      app.setState({ folder: obj.folder_id, id: obj.id })
      return cont(cid)
    }

    // deep-link
    obj = app.getState()
    cid = _.cid(obj)

    if (obj.folder && obj.id) cont(cid)
  })
}

export default {
  getApp: createInstance
}
