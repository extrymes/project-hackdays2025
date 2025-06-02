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

import ext from '@/io.ox/core/extensions'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import { createIcon } from '@/io.ox/core/components'
import { interpretTask, computePopupTime, buildOptionArray } from '@/io.ox/tasks/util'
import { BaseView } from '@/io.ox/core/notifications/views'
import capabilities from '@/io.ox/core/capabilities'

import taskAPI from '@/io.ox/tasks/api'
import reminderAPI from '@/io.ox/core/api/reminder'

import { invoke } from '@/io.ox/backbone/views/actions/util'
import { mediator } from '@/io.ox/core/notifications/util'
import { Adapter } from '@/io.ox/core/notifications/api'
import '@/io.ox/tasks/actions'
import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

if (capabilities.has('tasks')) {
  mediator('io.ox/notifications/adapter', {

    'task:reminder': api => {
      const type = 'task:reminder'
      const detail = 'task'
      const label = gt('Task reminder')
      const adapter = new Adapter({ type, detail, label, api, autoOpen: settings.get('autoOpenNewReminders', false) })

      settings.on('change:autoOpenNewReminders', adapter.changeAutoOpen.bind(adapter))

      // add
      reminderAPI.on('set:tasks:reminder', (e, items) => {
        // remove items that are in the collection but not in the array of items to display
        adapter.prune(items)
        for (const item of items) {
          adapter.add({
            app: 'tasks',
            category: 'reminder',
            reminderId: item.id,
            id: item.id,
            target_id: item.target_id,
            folder_id: item.folder,
            alarmTime: item.alarm
          })
        }
      })

      // no need for a folder_id here reminder id is already unique
      adapter.cid = data => { return `${type}:${data.id}` }

      // fetch missing data
      adapter.fetch = model => {
        const promises = []
        const models = model ? [model] : adapter.list()
        for (const model of models) {
          promises.push(taskAPI.get({ id: model.get('target_id'), folder_id: model.get('folder_id') }).then(data => {
            model.set({
              taskData: data,
              title: data.title
            })
            model.fetched = true
          }))
        }
        return Promise.allSettled(promises)
      }

      // sort by reminder end time then start time then alarm time
      adapter.getSortName = model => {
        const data = model.get('taskData')
        return data?.end_time || data?.start_time || data?.alarm || 0
      }

      adapter.on = async (eventname, model, value) => {
        const keys = [`${model.get('folder_id')}.${model.get('target_id')}`]
        const cleanCache = async () => {
          api.collection.remove(model)
          await Promise.all([taskAPI.caches.get.remove(keys), taskAPI.caches.list.remove(keys)])
          taskAPI.trigger(`update:${_.ecid(keys[0])}`)
        }
        switch (eventname) {
          case 'close':
            await reminderAPI.deleteReminder([{ id: model.get('reminderId') }])
            return cleanCache()
          case 'snooze':
            await reminderAPI.remindMeAgain(computePopupTime(value).alarmDate, model.get('reminderId'))
            cleanCache()
        // no default
        }
      }
    },

    'task:invitation': api => {
      const type = 'task:invitation'
      const detail = 'task'
      const label = gt('Task invitation')
      const adapter = new Adapter({ type, detail, label, api })

      // add
      taskAPI.on('set:tasks:to-be-confirmed mark:task:to-be-confirmed', (e, items) => {
      // mark:task:to-be-confirmed only returns new tasks invitations, not the whole list, so don't clear
        if (e.type === 'set:tasks:to-be-confirmed') adapter.prune(items)
        for (const item of items) {
          adapter.add({
            app: 'tasks',
            category: 'invitation',
            title: item.title,
            id: item.id,
            folder_id: item.folder_id
          })
        }
      })

      taskAPI.on('mark:task:confirmed', (e, tasks = []) => {
        tasks.forEach(task => {
          const model = api.collection.findWhere({ id: task.id, folder_id: task.folder_id })
          api.collection.remove(model)
        })
      })

      // sort by start_time, then end_time, use creation_date as fallback
      adapter.getSortName = model => { return model.get('start_time') || model.get('end_time') || model.get('creation_date') || 0 }

      // fetch missing data
      adapter.fetch = model => {
        const promises = []
        const models = model ? [model] : adapter.list()
        for (const model of models) {
          promises.push(taskAPI.get(model.pick('id', 'folder_id')).then(data => model.set(data)))
        }
        return Promise.allSettled(promises)
      }

      adapter.on = async (eventname, model) => {
        const baton = ext.Baton({ data: model.toJSON() })
        let confirmation
        switch (eventname) {
          case 'changestatus':
            return invoke('io.ox/tasks/actions/confirm', baton)
          case 'participate/yes':
            confirmation = 1
            break
          case 'participate/no':
            confirmation = 2
            break
          case 'participate/maybe':
            confirmation = 3
        // no default
        }

        if (!confirmation) return
        const result = await taskAPI.confirm({
          id: model.get('id'),
          folder_id: model.get('folder_id'),
          data: { confirmmessage: '', confirmation }
        })
        api.collection.remove(model)
        taskAPI.trigger(`update:${_.ecid(model.toJSON())}`, result)
      }
    },

    'task:overdue': api => {
      const type = 'task:overdue'
      const detail = 'task'
      const label = gt('Overdue task')
      const adapter = new Adapter({ type, detail, label, api })

      taskAPI.on('new-tasks mark:overdue', (e, items) => {
        const isSubset = e.type === 'mark:overdue'
        if (!isSubset) adapter.prune(items)
        for (const item of items) {
          adapter.add({
            app: 'tasks',
            category: 'overdueTasks',
            title: item.title,
            id: item.id,
            folder_id: item.folder_id,
            end_time: item.end_time,
            full_time: item.full_time
          })
        }
      })

      taskAPI.on('delete unmark:overdue', (e, items) => {
        for (const item of items) {
          adapter.remove(item)
        }
      })

      // fetch missing data
      adapter.fetch = model => {
        const models = model ? [model] : adapter.list()

        return Promise.allSettled(models.map(async model => {
          const data = await taskAPI.get(model.pick('id', 'folder_id'))
          model.set(
            _.pick(data, 'title', 'start_time', 'end_time', 'alarm', 'full_time', 'note', 'status')
          )
        }))
      }

      // sort by end_time, overdue tasks always have an end time
      adapter.getSortName = model => model.get('end_time')

      adapter.on = async (eventname, model) => {
        if (eventname !== 'close') return

        const result = await taskAPI.update({
          id: model.get('id'),
          folder_id: model.get('folder_id'),
          status: 3,
          percent_completed: 100,
          date_completed: Date.now()
        })
        api.collection.remove(model)
        taskAPI.trigger(`update:${_.ecid(model.toJSON())}`, result)
      }
    },

    'task:initial-fetch': () => {
    // load and invoke plugins with delay
      setTimeout(() => {
        reminderAPI.getReminders()
        taskAPI.getTasks()
      }, 5000)
    }
  })
}

const TaskBaseView = BaseView.extend({

  renderStatus () {
    const task = interpretTask(this.model.get('taskData') || this.model.toJSON())
    if (!task.status) return
    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Status')}">`).append(
          createIcon('bi/check2-circle.svg').addClass('row-icon')
        ),
        $(`<span class="status truncate ${task.badge}">${task.status}</span>`)
      )
    )
  },

  getDateLabel (showRelativeTime = false) {
    const task = interpretTask(this.model.get('taskData') || this.model.toJSON())
    const capitalFirstLetter = (string) => string[0].toUpperCase() + string.slice(1)
    const template = (dateValue, relativeTime) => {
      relativeTime = (relativeTime && showRelativeTime) ? `<div class="relative-time">${capitalFirstLetter(relativeTime)}</>` : ''
      return /* html */`
      <div class="date-time flex-grow">
        <span class="date-value ellipsis-2-lines">${dateValue}</span>
        ${relativeTime}
      </div>`
    }

    if (task.end_time) return template(task.end_time, task.end_time_diff)
    if (task.start_time) return template(task.start_time, task.start_time_diff)
    if (task.alarm) return template(task.alarm)
    return ''
  },

  renderTime (action = $(), showRelativeTime = false) {
    const nodes = this.getDateLabel(showRelativeTime)
    if (!nodes.length) return this
    this.$el.append(
      $('<div class="item-row">').append(
        $(`<div class="icon-wrap flex-center" aria-hidden="true" title="${gt('Date')}">`).append(
          createIcon('bi/clock.svg').addClass('row-icon')
        ),
        nodes,
        action
      )
    )
  }
})

export const TaskReminderView = TaskBaseView.extend({
  render () {
    this.$el.attr('data-cid', _.cid(_(this.model.get('taskData')).pick('id', 'folder_id')))
    const dropdown = new Dropdown({ $toggle: $(`<button type="button" class="btn btn-toolbar action" aria-label="${gt('Remind me again')}" />`).append($(`<div aria-hidden="true" title="${gt('Remind me again')}" />`).append(createIcon('bi/three-dots.svg'))) })
    // #. Header for a dropdown menu. This is followed by a list of dates: in 2 Minutes, tomorrow, next week etc.
      .header(gt('Remind me again'))
    buildOptionArray({ divider: true }).forEach(([value, text], index) => {
      if (value === '---') dropdown.divider(); else dropdown.option('snooze', value, text)
    })

    this.$el.empty()
    this.renderTitle(createIcon('bi/bell.svg'))
    this.renderTime(dropdown.render().$el, true)
    this.renderStatus()
    return this
  }
})

export const TaskInvitationView = TaskBaseView.extend({

  render () {
    this.$el.empty()
    this.renderTitle(createIcon('bi/check-square.svg'), { closable: false })
    this.renderTime()
    this.renderStatus()
    this.renderDescription()
    this.renderActions()
    return this
  },

  async renderActions () {
    const button = (action, title) => /* html */`<button type="button" class="btn btn-default" title="${title}" data-action="${action}"><div class="truncate">${title}</div></button>`
    const template = /* html */`
      <div class="item-row actions-container">
        <div class="actions flex-grow">
          <div class="btn-group" role="group" aria-label="${gt('Change participation')}">
            ${button('participate/yes', gt.pgettext('appointment participation status', 'Accept'))}
            ${button('participate/maybe', gt.pgettext('appointment participation status', 'Maybe'))}
            ${button('participate/no', gt.pgettext('appointment participation status', 'Decline'))}
            <button type="button" class="icon btn btn-default" data-action="changestatus" aria-label="${gt('Add comment')}"></button>
          </div>
        </div>
      </div>`
    // icon cannot be included in template because of weird createIcon implementation    this.$el.append(template).find('.icon').append(
    this.$el.append(template).find('.icon').append(
      $(`<div aria-hidden="true" title="${gt('Add comment')}">`).append(createIcon('bi/three-dots.svg'))
    )
  }
})

export const TaskOverdueView = TaskBaseView.extend({
  render () {
    this.$el.empty()
    this.renderTitle(createIcon('bi/lightning.svg'))
    this.renderTime()
    this.renderStatus()
    return this
  }
})
