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
import moment from '@open-xchange/moment'

import api from '@/io.ox/core/folder/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import userAPI from '@/io.ox/core/api/user'
import * as util from '@/io.ox/contacts/util'
import * as calendarUtil from '@/io.ox/calendar/util'
import capabilities from '@/io.ox/core/capabilities'
import apps from '@/io.ox/core/api/apps'

import { settings } from '@/io.ox/calendar/settings'
import { settings as coreSettings } from '@/io.ox/core/settings'
import gt from 'gettext'

function openEditDialog (params) {
  ox.load(() => Promise.all([import('@/io.ox/calendar/edit/main'), import('@/io.ox/calendar/model')])).then(async function ([{ default: edit }, { default: models }]) {
    const app = edit.getApp()
    await app.launch()
    app.create(new models.Model(params))
  })
}

function showDialog (params, folder) {
  const dev = ((folder.created_from && util.getFullName(folder.created_from))
    ? $.when($.when({
      cn: folder.created_from.display_name,
      email: folder.created_from.contact.email1,
      uri: 'mailto:' + folder.created_from.contact.email1,
      entity: folder.created_from.entity,
      contact: folder.created_from.contact
    }))
    : userAPI.get({ id: folder.created_by }))
  dev.done(function (user) {
    new ModalDialog({
      title: gt('Appointments in shared calendars'),
      // standard 500px is too small in some languages (e.g. german)
      width: '550',
      description: [
        $('<p>').text(gt('The selected calendar is shared by %1$s. Appointments in shared calendars will generally be created on behalf of the owner.', util.getFullName(user)) + ' '),
        $('<p>').html(gt('Do you really want to create an appointment <b>on behalf of the folder owner</b> or do you want to create an appointment <b>with the folder owner</b> in your own calendar?'))
      ]
    })
      .addCancelButton({ left: true })
      .addButton({ label: gt('Invite owner'), action: 'invite', className: 'btn-default' })
      .addButton({ label: gt('On behalf of the owner'), action: 'behalf' })
      .on('behalf', function () { openEditDialog(params) })
      .on('invite', function () {
        params.attendees = calendarUtil.createAttendee(user)
        params.folder = settings.get('chronos/defaultFolderId')
        openEditDialog(params)
      })
      .open()
  })
}

function showDialogPublic (params) {
  const folderTitle = api.pool.getModel(params.folder).get('title')
  // standard 500px is too small in some languages (e.g. german)
  new ModalDialog({
    title: gt('Appointments in public calendars'),
    description: gt('The selected calendar "%1$s" is public. Do you really want to create an appointment in this calendar?', folderTitle),
    width: '550'
  })
    .addCancelButton()
    .addButton({ label: gt('Create in public calendar'), action: 'create' })
    .on('create', function () {
      openEditDialog(params)
    })
    .open()
}

function getSelectedResourceFolders (app) {
  const focusedFolder = app.folder.get()
  const selectedFolders = app.folders.folders.filter(id => /^cal:\/\/0\/resource/.test(id))
  const selectedResourceFolders = []

  // Add only the focused and selected resource calendar
  if (/^cal:\/\/0\/resource/.test(focusedFolder) && selectedFolders.includes(focusedFolder)) selectedResourceFolders.push(focusedFolder)
  // Select all resources in group, if they are selected
  else if (/^virtual\/flat\/event\/resources/.test(focusedFolder)) {
    const resourceGroupId = focusedFolder.split('.')[1]
    const resourceFolders = settings.get('resources/folders', [])
    const groupFolderIds = settings.get(`resources/groups/${resourceGroupId}/folders`, []).map(id => resourceFolders[id].folderId)
    const selectedFoldersInGroup = groupFolderIds.filter(folderId => selectedFolders.includes(folderId))
    selectedResourceFolders.push(...selectedFoldersInGroup)
  }
  return selectedResourceFolders
}

export default function (baton, obj) {
  obj = obj || {}
  const app = apps.get('io.ox/calendar')
  const params = {
    folder: obj.folder || app.folder.get()
  }

  if (coreSettings.get('features/resourceCalendars', false)) params.selectedResourceFolders = getSelectedResourceFolders(app)

  if (obj && obj.startDate) {
    _.extend(params, obj)
  } else {
    let refDate = moment().startOf('hour').add(1, 'hours')
    const perspective = app.perspective
    const now = _.now(); let range

    switch (perspective.getName()) {
      case 'week':
        range = calendarUtil.getCurrentRangeOptions()
        break
      case 'month':
        range = {
          rangeStart: perspective.current,
          rangeEnd: moment(perspective.current).endOf('month')
        }
        break
      case 'year':
        range = {
          rangeStart: moment({ year: perspective.year }),
          rangeEnd: moment({ year: perspective.year }).endOf('year')
        }
        break
      default:
    }

    if (range && (moment(range.rangeStart).valueOf() > now || now > moment(range.rangeEnd).valueOf())) {
      // use first visible date if today is not visible
      refDate = moment(range.rangeStart).hours(10)
    }

    params.startDate = { value: refDate.format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() }
    params.endDate = { value: refDate.add(1, 'hours').format('YYYYMMDD[T]HHmmss'), tzid: refDate.tz() }
  }

  // show warning for shared folders
  api.get(params.folder).then(function (folder) {
    // there is no default folder for guests so always return the requested folder
    if (api.can('create', folder) || capabilities.has('guest')) return folder
    params.folder = settings.get('chronos/defaultFolderId')
    return api.get(params.folder)
  }).done(function (folder) {
    if (!api.can('create', folder)) return
    // guests can only create in the current folder
    if (api.is('shared', folder) && !capabilities.has('guest')) showDialog(params, folder)
    else if (api.is('public', folder) && !capabilities.has('guest')) showDialogPublic(params, folder)
    else openEditDialog(params)
  })
}
