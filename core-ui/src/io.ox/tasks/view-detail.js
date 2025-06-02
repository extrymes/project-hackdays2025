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

import * as util from '@/io.ox/tasks/util'
import * as calendarUtil from '@/io.ox/calendar/util'
import ext from '@/io.ox/core/extensions'
import taskAPI from '@/io.ox/tasks/api'
import attachmentAPI from '@/io.ox/core/api/attachment'
import ParticipantsView from '@/io.ox/participants/detail'
import attachments from '@/io.ox/core/tk/attachments'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import ActionDropdownView from '@/io.ox/backbone/views/action-dropdown'
import { getHumanReadableSize } from '@/io.ox/core/strings'
import locale from '@/io.ox/core/locale'
import '@/io.ox/tasks/actions'
import '@/io.ox/tasks/style.scss'
import { CategoryBadgesView } from '@/io.ox/core/categories/view'
import { getCategoriesFromModel } from '@/io.ox/core/categories/api'
import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'
import { RecurrenceRuleMapModel } from '../calendar/recurrence-rule-map-model'
import { createIcon } from '@/io.ox/core/components'

const taskDetailView = {

  draw (baton) {
    // make sure we have a baton
    baton = ext.Baton.ensure(baton)
    const data = baton.data
    if (!data) return $('<div>')

    const task = util.interpretTask(data)
    const self = this
    const node = $.createViewContainer(data, taskAPI)
      .on('redraw', function (e, tmp) {
        baton.data = tmp
        node.replaceWith(self.draw(baton))
      })
      .addClass('tasks-detailview')

    baton.interpretedData = task
    ext.point('io.ox/tasks/detail-inline').invoke('draw', node, baton)
    ext.point('io.ox/tasks/detail-view').invoke('draw', node, baton)
    return node
  }
}

// inline links
ext.point('io.ox/tasks/detail-inline').extend({
  index: 10,
  id: 'inline-links',
  draw (baton) {
    (baton.popup ? baton.popup.$toolbar.empty() : this).append(
      new ToolbarView({ point: 'io.ox/tasks/links/inline', inline: true })
        .setSelection(baton.array(), { data: baton.array() }).$el
    )
  }
})

// detail-view
ext.point('io.ox/tasks/detail-view').extend({
  index: 100,
  id: 'header',
  draw (baton) {
    const infoPanel = $('<div class="info-panel">')
    const task = baton.interpretedData
    const title = $('<h1 class="title clear-title">').append(
      // lock icon
      // TODO: A11y - Clean this up
      baton.data.private_flag
        ? createIcon('bi/eye-slash.svg').addClass('private-flag').attr({
          title: gt('Private'),
          'data-placement': 'bottom',
          'data-animation': 'false'
        }).tooltip()
        : [],
      // priority
      $('<span class="priority">').append(
        util.getPriority(task)
      ),
      // title
      $.txt(task.title)
    )
    this.append(
      $('<div class="task-header">').append(
        _.device('smartphone') ? [title, infoPanel] : [infoPanel, title]
      )
    )
    ext.point('io.ox/tasks/detail-view/infopanel').invoke('draw', infoPanel, task)
  }
})

ext.point('io.ox/tasks/detail-view').extend({
  index: 200,
  id: 'details',
  draw (baton) {
    const task = baton.interpretedData
    const fields = {
      categories: settings.get('features/categories', false) ? gt('Categories') : '',
      status: gt('Status'),
      percent_completed: gt('Progress'),
      end_time: gt('Due'),
      start_time: gt('Start date'),
      note: gt('Description'),
      target_duration: gt('Estimated duration in minutes'),
      actual_duration: gt('Actual duration in minutes'),
      target_costs: gt('Estimated costs'),
      actual_costs: gt('Actual costs'),
      trip_meter: gt('Distance'),
      billing_information: gt('Billing information'),
      companies: gt('Companies'),
      date_completed: gt('Date completed')
    }
    const $details = $('<dl class="task-details definition-list">')

    if (task.recurrence_type) {
      $details.append(
        $('<dt class="detail-label">').text(gt('This task recurs')),
        $('<dd class="detail-value">').text(RecurrenceRuleMapModel.getRecurrenceString(baton.data))
      )
    }

    _(fields).each(function (label, key) {
      // 0 is valid; skip undefined, null, and ''
      let value = task[key]
      if (!value && value !== 0) return
      const $dt = $('<dt class="detail-label">').text(label)
      const $dd = $('<dd class="detail-value">')
      switch (key) {
        case 'status':
          $dd.append(
            $('<div>').text(task.status).addClass('state ' + task.badge)
          )
          break
        case 'end_time':
        case 'start_time': {
          const diff = task[key + '_diff'] ? ' (' + task[key + '_diff'] + ')' : ''
          $dd.text(value + diff)
          break
        }
        case 'percent_completed':
          $dd.append(
            // #. %1$s how much of a task is completed in percent, values from 0-100
            // #, c-format
            $('<div>').text(gt('%1$s %', task.percent_completed)),
            $('<div class="progress" aria-hidden="true">').append(
              $('<div class="progress-bar">').width(task.percent_completed + '%')
            )
          )
          break
        case 'target_costs':
        case 'actual_costs':
          value = task.currency ? locale.currency(value, task.currency) : locale.number(value, 2)
          $dd.text(value)
          break
        case 'note': {
          let note = calendarUtil.getNote(task, 'note')
          note = util.checkMailLinks(note)
          if (note) $dd.html(note)
          break
        }
        case 'categories':{
          if (settings.get('features/categories', false)) {
            const collection = getCategoriesFromModel(baton.data.categories, 'task' + baton.data.id)
            if (collection.length === 0) return

            $dd.append(new CategoryBadgesView({ collection, searchable: true }).render().$el)
          }
          break
        }
        default:
          $dd.text(value)
          break
      }
      $details.append($dt, $dd)
    })

    this.append(
      $('<fieldset class="details">').append($details)
    )
  }
})

ext.point('io.ox/tasks/detail-view').extend({
  index: 300,
  id: 'attachments',
  draw (baton) {
    const task = baton.interpretedData
    const container = $('<dd class="detail-value">')
    const hasKey = taskAPI.getAttachmentsHashKey(task)
    if (!attachmentAPI.isPending(hasKey) && task.number_of_attachments < 1) return

    this.find('dl.task-details').append(
      $('<dt class="detail-label attachment-label">').text(gt('Attachments')),
      container
    )

    if (attachmentAPI.isPending(hasKey)) {
      const progressview = new attachments.ProgressView({ cid: _.ecid(task) })
      return container.append(progressview.render().$el)
    }

    ext.point('io.ox/tasks/detail-attach').invoke('draw', container, task)
  }
})

ext.point('io.ox/tasks/detail-view').extend({
  index: 500,
  id: 'participants',
  draw (baton) {
    const pView = new ParticipantsView(baton)
    this.append(pView.draw())
  }
})

ext.point('io.ox/tasks/detail-view/infopanel').extend({
  index: 100,
  id: 'infopanel',
  draw (task) {
    // alarm makes no sense if reminders are disabled
    if (task.alarm) {
      this.append(
        $('<div>').addClass('alarm-date').text(
          // #. %1$s reminder date of a task
          // #, c-format
          gt('Reminder date %1$s', task.alarm)
        )
      )
    }
  }
})

// attachments
ext.point('io.ox/tasks/detail-attach').extend({
  index: 100,
  id: 'attachments',
  draw (task) {
    const containerNode = this
    const listNode = $('<ul class="list-unstyled attachment-list view">')
    attachmentAPI.getAll({ folder_id: task.folder_id, id: task.id, module: 4 }).then(list => {
      list.forEach(a => buildDropdown(listNode, a.filename, a))
      if (list.length > 1) {
        buildDropdown(listNode, gt('All attachments'), list)
      }
      listNode.on('click', 'a', e => { e.preventDefault() })
      containerNode.append(listNode)
    }, function attachmentFail () {
      containerNode.empty().append(
        $.fail(gt('Could not load attachments for this task.'), () => {
          ext.point('io.ox/tasks/detail-attach').invoke('draw', containerNode, task)
        })
      )
    })
  }
})

const TaskActionDropdownView = ActionDropdownView.extend({
  tagName: 'li',
  className: 'flex-row zero-min-width pull-right'
})

const buildDropdown = function (container, title, data) {
  const dropdown = new TaskActionDropdownView({
    point: 'io.ox/core/tk/attachment/links',
    data,
    title,
    customize () {
      const node = this
      const icon = node.find('svg')
      const text = node.text().trim()
      const size = data.file_size > 0 ? getHumanReadableSize(data.file_size, 0) : '\u00A0'
      this.addClass('attachment text-left bg-dark zero-min-width py-8 flex-grow').text('').append(
        // no template string here because filename is user content and could cause XSS
        $('<div class="filename ellipsis flex-grow">').attr('title', text).text(text),
        $('<div class="filesize text-gray pl-4">').text(size),
        icon
      )
      // use normal size for 'All attachments'
      if (data.length) {
        dropdown.$el.removeClass('pull-right')
        node.removeClass('flex-grow')
      }
    }
  })
  dropdown.$toggle.attr('tabindex', null)
  container.append(dropdown.$el)
}

export default taskDetailView
