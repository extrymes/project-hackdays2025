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
import Backbone from '@/backbone'
import ox from '@/ox'
import moment from '@open-xchange/moment'

import calAPI from '@/io.ox/calendar/api'
import ModalDialog from '@/io.ox/backbone/views/modal'
import folderAPI from '@/io.ox/core/folder/api'
import * as util from '@/io.ox/calendar/util'
import yell from '@/io.ox/core/yell'
import '@/io.ox/calendar/style.scss'
import mini from '@/io.ox/backbone/mini-views'

import gt from 'gettext'
import { RecurrenceRuleMapModel } from '../recurrence-rule-map-model'
import { getConfirmationStatus } from '@/io.ox/tasks/util'

async function getData (model) {
  const data = model.pick('folder', 'id')

  if (!model.get('taskmode') && !model.get('isSeries') && model.get('recurrenceId')) data.recurrenceId = model.get('recurrenceId')
  // make this work with exceptions
  if (!model.get('taskmode') && model.get('isSeries') && data.id !== model.get('seriesId')) data.id = model.get('seriesId')

  const api = model.get('api')
  let responseData = await api.get(data)

  // work on a copy for appointments (so we don't accidentally change the pool data)
  responseData = model.get('taskmode') ? responseData : responseData.toJSON()
  // check if the response is of type [responseData, timestamp]
  if (Array.isArray(responseData) && responseData.length === 2 && _.isNumber(responseData[1])) {
    responseData = responseData[0]
  }
  // always use calapi here because model.get('api') can be calendar api, task api or a dummy (external invitations)
  if (!model.get('isSeries') && model.get('recurrenceId')) responseData = calAPI.removeRecurrenceInformation(responseData)

  return responseData
}

function getFolderModel (dialogModel) {
  if (dialogModel.get('noFolderCheck')) return
  const folderModel = folderAPI.pool.models[dialogModel.get('folder')]
  if (folderModel?.is('resourceCalendar')) return $.when(folderModel)
  return folderAPI.get(dialogModel.get('folder'))
}

function getConfirmId (folder) {
  if (folderAPI.is('resourceCalendar', folder)) return folder.get('resourceId')
  return folder && folderAPI.is('shared', folder) ? folder.created_by || folder.created_from.identifier : ox.user_id
}

function findConfirmation (data, confirmId) {
  if (!confirmId) return
  const attendee = _(data.attendees).findWhere({ entity: confirmId })
  if (attendee) return attendee
  return _(data.attendees).find(function (attendee) {
    return attendee.extendedParameters && attendee.extendedParameters['X-OX-IDENTIFIER'] === confirmId
  })
}

function getConfirmationString (data, confirmId, { taskmode }) {
  if (taskmode) {
    const status = getConfirmationStatus(data)
    return ['', 'accepted', 'declined', 'tentative'][status]
  } else {
    const status = findConfirmation(data, confirmId)?.partStat?.toLowerCase()
    if (['', 'accepted', 'declined', 'tentative'].indexOf(status) < 0) return
    return status
  }
}

export default async function (o, { attendee, api, taskmode, noFolderCheck, callback, checkConflicts, status } = {}) {
  async function cont (isSeries) {
    const dialogModel = new Backbone.Model({
      api: api || calAPI,
      folder: o.folder || o.folder_id,
      id: o.id,
      recurrenceId: o.recurrenceId,
      seriesId: o.seriesId,
      isSeries,
      taskmode,
      noFolderCheck,
      callback,
      checkConflicts
    })

    const [data, folder] = await Promise.all([getData(dialogModel), getFolderModel(dialogModel)])
    const confirmId = attendee?.entity || getConfirmId(folder)

    dialogModel.set({
      data,
      confirmId,
      comment: util.getConfirmationMessage(o, confirmId),
      status: getConfirmationString(data, confirmId, { taskmode }) || status || 'accepted'
    })

    const confirmDialog = new ModalDialog({
      async: true,
      help: 'ox.appsuite.user.sect.calendar.manage.changestatus.html',
      focus: _.device('smartphone') ? '' : '[data-property="comment"]',
      title: gt('Change confirmation'),
      point: 'io.ox/calendar/actions/acceptdeny',
      model: dialogModel
    }).build(function () {
      // on behalf
      if (confirmId !== ox.user_id) {
        const isResource = attendee?.cuType === 'RESOURCE' || folderAPI.is('resourceCalendar', folder)
        this.$body.append(
          $('<div class="alert alert-info">').text(
            isResource
              // #. %1$s is the resource name (meeting room etc.)
              // #, c-format
              ? gt('This is a booking request for %1$s', attendee?.cn || folder?.get('title') || '')
              : gt('You are currently acting on behalf of the calendar owner.')
          )
        )
      }

      // description
      const appointmentData = this.model.get('data')
      const descriptionId = _.uniqueId('confirmation-dialog-description-')
      const recurrenceString = RecurrenceRuleMapModel.getRecurrenceString(appointmentData)
      let description = $('<strong>').text(appointmentData.title)

      this.$el.attr('aria-describedby', descriptionId)

      if (!this.model.get('taskmode')) {
        const strings = util.getDateTimeIntervalMarkup(appointmentData, { output: 'strings', zone: moment().tz() })
        description = [
          $('<div>').append($('<strong>').text(appointmentData.summary)),
          $('<div>').append(`${strings.dateStr}${recurrenceString !== '' ? ' \u2013 ' + recurrenceString : ''} ${strings.timeStr}`)
        ]
      }
      this.$body.append(
        $(`<p id=${descriptionId}>`).append(
          description
        )
      )

      // buttons
      const $title = this.$header.find('.modal-title')
      let uuid = $title.attr('id') || _.uniqueId('input-group-')
      $title.attr('id', uuid)
      this.$body.append(
        $(`<div class="form-group" role="group" aria-labelledby="${uuid}">`).css({ 'margin-top': '20px' }).append(
          new mini.CustomRadioView({
            name: 'status',
            model: this.model,
            list: [
              { label: gt('Accept'), value: 'accepted' },
              { label: gt('Maybe'), value: 'tentative' },
              { label: gt('Decline'), value: 'declined' }
            ]
          }).render().$el
        )
      )

      // comment
      uuid = _.uniqueId('input-')
      this.$body.append(
        $('<div class="form-group">').css({ 'margin-top': '20px' }).append(
          // #. This refers to the comment, a user can make regarding a confirmation status in an appointment.
          $('<label class="control-label">').attr('for', uuid).text(gt('Your Comment')).append(
            $('<span class="sr-only">').text((data.summary || data.title) + ' ' + gt('Please comment your confirmation status.'))
          ),
          new mini.TextView({ id: uuid, name: 'comment', model: this.model, rows: 3 }).render()
            .$el.attr('placeholder', gt('Leave a comment for other participants'))
        )
      )
    })
      .addCancelButton()
      .addButton({ action: 'save', label: gt('Save') })
      .on('action', function (action) {
        if (action === 'cancel') return

        const postProcess = taskmode ? this.postProcessTask : this.postProcessAppointment
        const requestData = postProcess.call(this)

        this.performConfirm(requestData, dialogModel.toJSON())
      })

    confirmDialog.performConfirm = async function (data, options = {}) {
      const { checkConflicts, api, callback } = options
      try {
        const response = await api.confirm(data, { ...util.getCurrentRangeOptions(), ...{ checkConflicts } })
        if (response && response.conflicts) {
          const { default: conflictView } = await ox.load(() => import('@/io.ox/calendar/conflicts/conflictList'))
          conflictView.dialog(response.conflicts)
            .on('cancel', () => {
              this.idle()
            })
            .on('ignore', () => {
              this.performConfirm(data, { ...options, checkConflicts: false })
            })
          return
        }
        this.close()
        if (callback) callback()
      } catch (e) {
        this.idle()
        yell(e)
      }
    }
    confirmDialog.postProcessAppointment = function () {
      const { data, status, comment, isSeries } = this.model.pick('data', 'status', 'comment', 'isSeries')
      const previousConfirmation = findConfirmation(data, confirmId) || {}
      const requestData = {
        // make a proper copy here
        attendee: JSON.parse(JSON.stringify(previousConfirmation)),
        id: data.id,
        folder: data.folder
      }

      if (requestData.attendee.cuType !== 'RESOURCE' && (!previousConfirmation || previousConfirmation.partStat === 'NEEDS-ACTION')) requestData.alarms = util.getDefaultAlarms(data)

      requestData.attendee.partStat = status.toUpperCase()
      if (comment) {
        requestData.attendee.comment = comment
      } else if (requestData.attendee.comment) {
        // if there was a previous comment we send null to remove it
        requestData.attendee.comment = null
      }
      if (!isSeries && o.recurrenceId) requestData.recurrenceId = o.recurrenceId
      // don't check if confirmation status did not change
      // no conflicts possible if you decline the appointment
      // no conflicts possible for free appointments
      dialogModel.set('checkConflicts', status !== 'declined' && data.transp === 'OPAQUE' && (!previousConfirmation || requestData.attendee.partStat !== previousConfirmation.partStat))

      return requestData
    }
    confirmDialog.postProcessTask = function () {
      const { data, status, comment } = this.model.pick('data', 'status', 'comment')
      this.model.set('checkConflicts', false)

      return {
        id: data.id,
        folder_id: data.folder_id,
        data: {
          confirmmessage: comment,
          id: ox.user_id,
          confirmation: _(['', 'accepted', 'declined', 'tentative']).indexOf(status)
        }
      }
    }

    return confirmDialog.open()
  }

  // not a series or a task
  if (taskmode || !o.recurrenceId || !o.seriesId) return cont()

  // series
  const hasSeriesPropagation = await util.hasSeriesPropagation(o)
  // no propagation? Only change appointment status
  if (!hasSeriesPropagation) return cont(false)

  return new ModalDialog({ title: gt('Change appointment confirmation'), width: 600 })
    .build(function () {
      this.$body.append(gt('This appointment is part of a series. Do you want to change your confirmation for the whole series or just for this appointment within the series?'))
    })
    .addCancelButton({ left: true })
    .addButton({ className: 'btn-default', label: gt('Change appointment'), action: 'appointment' })
    .addButton({
      action: 'series',
      // #. Use singular in this context
      label: gt('Change series')
    })
    .on('series', function () { _.defer(cont, true) })
    .on('appointment', function () { _.defer(cont, false) })
    .open()
};
