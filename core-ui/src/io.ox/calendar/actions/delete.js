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

import api from '@/io.ox/calendar/api'
import * as util from '@/io.ox/calendar/util'
import yell from '@/io.ox/core/yell'
import ModalDialog from '@/io.ox/backbone/views/modal'
import mini from '@/io.ox/backbone/mini-views/common'

import gt from 'gettext'

export default function (list, virtualSeriesIds = []) {
  api.getList(list).then(function (list) {
    const displayComment = _(list).every(function (event) {
      return (event.hasFlag('organizer') || (event.hasFlag('organizer_on_behalf') && !event.hasFlag('attendee'))) && event.hasFlag('scheduled')
    })
    let guid
    const model = new Backbone.Model({ comment: '' })
    const commentView = [
      $('<label>').text(gt('Add a message to the notification email for the other participants.')).attr({ for: guid = _.uniqueId('containerlabel-') }),
      new mini.InputView({ name: 'comment', model, placeholder: gt('Password'), autocomplete: false }).render().$el
    ]
    commentView[1].find('input').attr('id', guid)

    const cont = function (action) {
      list = _(list).chain().map(function (obj) {
        obj = obj instanceof Backbone.Model ? obj.attributes : obj
        const options = {
          // prefer the seriesId over the id to make it work for exceptions
          id: (action === 'thisandfuture' || action === 'series') && obj.seriesId && !_(virtualSeriesIds).contains(obj.seriesId) ? obj.seriesId : obj.id,
          folder: obj.folder,
          recurrenceRange: action === 'thisandfuture' ? 'THISANDFUTURE' : undefined
        }
        // if the whole series should be deleted, don't send the recurrenceId.
        if (action !== 'series' && obj.recurrenceId) {
          options.recurrenceId = obj.recurrenceId
        }
        return options
      })
        .uniq(function (obj) {
          return JSON.stringify(obj)
        }).value()

      const options = util.getCurrentRangeOptions()

      if (displayComment && model.get('comment')) options.comment = model.get('comment')

      api.remove(list, options).fail(yell)
    }

    const hasSeries = _(list).some(function (event) {
      if (event.hasFlag('last_occurrence') || !event.get('seriesId')) return false
      return event.has('recurrenceId') && !_(virtualSeriesIds).contains(event.get('seriesId'))
    })
    let text
    let hasFirstOccurrence

    if (hasSeries) {
      hasFirstOccurrence = _(list).some(function (event) {
        return event.hasFlag('first_occurrence') || !event.hasFlag('organizer')
      })
      text = hasFirstOccurrence
        ? gt('This appointment is part of a series. Do you want to delete all appointments of the series or just this appointment?')
        : gt('This appointment is part of a series. Do you want to delete this and all future appointments of the series or just this appointment?')
    } else {
      text = gt('Do you really want to delete this appointment?')
    }
    const dialog = new ModalDialog({
      title: gt('Delete appointment'),
      // those buttons can get quite large
      width: 600,
      // we need a flat array to avoid object object text here
      description: displayComment ? _([$('<div>').text(text), commentView]).flatten() : $('<div>').text(text)
    })
      .addCancelButton({ left: hasSeries })
      .on('action', function (action) {
        if (action === 'cancel') return
        cont(action)
      })
    dialog.$el.addClass('delete-dialog')

    if (hasSeries) {
      dialog.addButton({ label: gt('Delete this appointment'), action: 'appointment', className: 'btn-default' })
      if (hasFirstOccurrence) dialog.addButton({ label: gt('Delete all appointments'), action: 'series' })
      else dialog.addButton({ label: gt('Delete all future appointments'), action: 'thisandfuture' })
    } else {
      dialog.addButton({ label: gt('Delete appointment'), action: 'appointment' })
    }
    dialog.open()
  })
};
