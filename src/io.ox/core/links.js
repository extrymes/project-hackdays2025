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

import yell from '@/io.ox/core/yell'
import apps from '@/io.ox/core/api/apps'
import tabApi from '@/io.ox/core/api/tab'
import registry from './main/registry'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { addReadyListener } from '@/io.ox/core/events'

// open app with given folder
async function openFolder (app, folder) {
  // open files app
  const { default: api } = await import('@/io.ox/core/folder/api')
  try {
    // check for permissions
    await api.get(folder)
  } catch (err) {
    return yell(err)
  }
  const model = apps.get(app)
  await ox.launch(model.get('load'), { folder })
  // set proper folder
  if (app === 'io.ox/calendar') model.folders.setOnly(folder)
  else if (model.folder.get() !== folder) model.folder.set(folder)
}

//
// Generic app
//
const appHandler = function (e) {
  const data = $(this).data()
  const params = _.deserialize(data.all.match(/#.*/)[0])
  const appId = params.app
  const isOffice = /^io.ox\/office\//.test(appId)
  const isCalendar = /^io.ox\/calendar/.test(appId)
  // special handling for text and spreadsheet
  const options = isOffice
    ? { action: 'load', file: { folder_id: data.folder, id: data.id }, params }
    : _(data).pick('folder', 'folder_id', 'id', 'cid')

  const app = apps.get(appId)
  if (!app) return
  e.preventDefault()

  if (isOffice && tabApi.openInTabEnabled()) {
    tabApi.openChildTab(data.all)
    return
  }

  function onReady () {
    app.folders.add(data.folder)
    app.folders.setOnly(data.folder)
    app.folderView.tree.$el.find(`[data-id="${data.folder}"]`).closest('.section').addClass('open')
  }

  ox.launch(app.load, options).then(function () {
    // set proper folder
    if (data.folder && app.folder.get() !== data.folder) app.folder.set(data.folder)
    if (isCalendar) {
      if (app.folders) return onReady()
      app.getWindow().one('show', onReady)
    }
  })
}

$(document).on('click', '.deep-link-app', appHandler)

//
// Files
//
const filesHandler = function (e) {
  e.preventDefault()
  const data = $(this).data()
  if (data.id) {
    // open file in viewer
    Promise.all([import('@/io.ox/core/viewer/main'), import('@/io.ox/files/api')]).then(function ([{ default: Viewer }, { default: api }]) {
      // Don't rely on cache here, because the file might have been changed
      api.get(_(data).pick('folder', 'id'), { cache: false }).then(
        function success (data) {
          const viewer = new Viewer()
          viewer.launch({ files: [data] })
        },
        // fail
        yell
      )
    })
  } else {
    openFolder('io.ox/files', data.folder)
  }
}
$(document).on('click', '.deep-link-files', filesHandler)

//
// Address book
//
const contactsHandler = function (e) {
  e.preventDefault()
  const data = $(this).data()
  ox.launch(() => import('@/io.ox/contacts/main'), { folder: data.folder }).then(function (app) {
    const folder = data.folder; const id = String(data.id || '').replace(/\//, '.')
    if (app.folder.get() === folder) {
      app.getGrid().selection.set(id)
    } else {
      app.folder.set(folder).done(function () {
        app.getGrid().selection.set(id)
      })
    }
  })
}

$(document).on('click', '.deep-link-contacts', contactsHandler)

function calendarHandler (e) {
  const data = $(this).data()
  const id = data.id
  if (!id) return

  e.preventDefault()

  import('@/io.ox/calendar/util').then(({ openDeeplink }) => openDeeplink(id))
}

$(document).on('click', '.deep-link-calendar', calendarHandler)

//
// Tasks
//
const tasksHandler = function (e) {
  e.preventDefault()
  const data = $(this).data()
  ox.launch(() => import('@/io.ox/tasks/main'), { folder: data.folder }).then(function (app) {
    const folder = data.folder
    const id = String(data.id || '').replace(/\//, '.')
    const cid = id.indexOf('.') > -1 ? id : _.cid({ folder, id })

    $.when()
      .then(function () {
        // set folder
        if (!app.folder.get() === folder) return app.folder.set(folder)
      })
      .then(function () {
        // select item
        if (id) return app.getGrid().selection.set(cid)
      })
  })
}

$(document).on('click', '.deep-link-tasks', tasksHandler)

//
// Mail
//

const mailHandler = function (e) {
  e.preventDefault()

  const node = $(this); const data = node.data(); let address; let name; let tmp; let params = {}

  import('@/io.ox/mail/sanitizer').then(function ({ default: sanitizer }) {
    // has data?
    if (data.address) {
      // use existing address and name
      address = data.address
      name = data.name || data.address
    } else {
      // parse mailto string
      // cut off leading "mailto:" and split at "?"
      tmp = node.attr('href').substr(7).split(/\?/, 2)
      // address
      address = tmp[0]
      //  use the address as display name because it is not sure that the text is the name
      name = tmp[0]
      // process additional parameters; all lower-case (see bug #31345)
      params = _.deserialize(tmp[1])
      for (const key in params) params[key.toLowerCase()] = params[key]
      // fix linebreaks in mailto body (OXUIB-776)
      if (params.body && mailSettings.get('messageFormat') !== 'text') params.body = params.body.replace(/\n/g, '<br>')
    }

    registry.call('io.ox/mail/compose', 'open', {
      to: [[name, address]],
      subject: params.subject || '',
      content: sanitizer.sanitize({ content: params.body || '', content_type: 'text/html' }, { WHOLE_DOCUMENT: false }).content
    })
  })
}

addReadyListener('capabilities:user', (capabilities) => {
  if (capabilities.has('webmail')) {
    $(document).on('click', '.mailto-link', mailHandler)
  }
})

// event hub
ox.on('click:deep-link-mail', function (e, scope) {
  const types = e.currentTarget.className.split(' ')

  if (types.indexOf('deep-link-files') >= 0) filesHandler.call(scope, e)
  else if (types.indexOf('deep-link-contacts') >= 0) contactsHandler.call(scope, e)
  else if (types.indexOf('deep-link-tasks') >= 0) tasksHandler.call(scope, e)
  else if (types.indexOf('deep-link-app') >= 0) appHandler.call(scope, e)
  else if (types.indexOf('deep-link-calendar') >= 0) calendarHandler.call(scope, e)
  else if (types.indexOf('mailto-link') >= 0) mailHandler.call(scope, e)
})
