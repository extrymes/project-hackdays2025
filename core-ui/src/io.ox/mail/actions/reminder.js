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
import * as util from '@/io.ox/mail/util'
import yell from '@/io.ox/core/yell'

import { settings } from '@/io.ox/core/settings'
import ModalDialog from '@/io.ox/backbone/views/modal'
import taskAPI from '@/io.ox/tasks/api'
import { buildReminderOptionGroups } from '@/io.ox/tasks/util'
import gt from 'gettext'

export default function (baton) {
  const data = [].concat(baton.data)[0]
  // create popup dialog
  new ModalDialog({
    title: gt('Remind me'),
    help: 'ox.appsuite.user.sect.email.manage.reminder.html',
    width: 600
  })
    .addAlternativeButton({ action: 'more', label: gt('More options') + ' ...' })
    .addCancelButton()
    .addButton({ label: gt('Create reminder'), action: 'create' })
    .build(function () {
      let guid
      this.$body.append(
        $('<div class="form-group">').append(
          $('<label>').attr('for', guid = _.uniqueId('form-control-label-')).text(gt('Subject')),
          this.$titleInput = $('<input type="text" class="form-control">').attr('id', guid)
            .val(gt('Mail reminder') + ': ' + data.subject).focus(function () { this.select() })
        ),
        $('<div class="form-group">').append(
          $('<label>').attr('for', guid = _.uniqueId('form-control-label-')).text(gt('Note')),
          this.$noteInput = $('<textarea class="form-control" rows="5">').attr('id', guid)
            .val(gt('Mail reminder for') + ': ' + data.subject + ' \n' + gt('From') + ': ' + util.formatSender(data.from[0]))
        ),
        $('<div class="form-group">').append(
          $('<label>').attr('for', guid = _.uniqueId('form-control-label-')).text(gt('Remind me')),
          this.$dateSelector = $('<select class="form-control" name="dateselect">').attr('id', guid).append(
            buildReminderOptionGroups()
          )
        )
      )
    })
    .on('more', function () {
      const title = this.$titleInput.val()
      const note = this.$noteInput.val()
      const alarm = parseInt(this.$dateSelector.val())
      ox.load(() => import('@/io.ox/tasks/edit/main')).then(({ default: edit }) => {
        const app = edit.getApp()
        app.launch().then(() => {
          app.view.model.set({ title, note, alarm })
          app.view.autoOpen({ alarm })
          // enable create button
          app.view.$('.title-field').trigger('blur').focus()
        })
      })
    })
    .on('create', function () {
      // add mail cid so the task can offer a link
      const note = this.$noteInput.val() + '\n--\nmail://' + _.ecid(data)
      taskAPI.create({
        title: this.$titleInput.val(),
        folder_id: settings.get('folder/tasks'),
        alarm: parseInt(this.$dateSelector.val()),
        note,
        status: 1,
        recurrence_type: 0,
        percent_completed: 0
      })
        .done(function () {
          yell('success', gt('Reminder has been created'))
        })
    })
    .open()
}
