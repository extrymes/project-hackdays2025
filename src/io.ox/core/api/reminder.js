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
import moment from '@open-xchange/moment'
import ox from '@/ox'
import http from '@/io.ox/core/http'
import Events from '@/io.ox/core/event'
import taskAPI from '@/io.ox/tasks/api'

// this works API is a bit different than other APIs. Although reminders are requested from the server at the standard refresh interval
// we need to update the notification area independent from this.
// To accomplish this we get the reminders 1 hour in advance and use a timeout that triggers when the next reminder is due

let // object to store reminders that are not to display yet
  reminderStorage = {}
// arrays to store the reminders that should be displayed currently
let tasksToDisplay = []
// next reminder to be triggered
let nextReminder
// timer that triggers the next reminder
let reminderTimer
// updates the reminder storage
const updateReminders = function (reminders) {
  const keys = []
  _(reminders).each(function (reminder) {
    keys.push(reminder.id)
  })
  reminderStorage = _.object(keys, reminders)
}
// function to check which reminders should be displayed and keeps the timer for the next reminder up to date
const checkReminders = function () {
  // reset variables
  tasksToDisplay = []
  clearTimeout(reminderTimer)

  // check if nextReminder was removed meanwhile
  if (nextReminder && !reminderStorage[nextReminder.id]) {
    nextReminder = null
  }
  // find the next due reminder
  _(reminderStorage).each(function (reminder) {
    if (reminder.alarm <= _.now()) {
      tasksToDisplay.push(reminder)
    } else if (!nextReminder || reminder.alarm < nextReminder.alarm) {
      nextReminder = reminder
    }
  })

  // trigger events so notification area is up to date
  api.trigger('set:tasks:reminder', tasksToDisplay)

  if (nextReminder) {
    const timeout = nextReminder.alarm - _.now()
    reminderTimer = setTimeout(function () {
      nextReminder = null
      // get fresh reminders (a task or an appointment may have been deleted meanwhile)
      api.getReminders()
    }, timeout)
  }
}

const api = {

  /**
   * delete reminder
   * @param  {object[]}        reminders array of objects with reminderId, optional recurrence_position
   * @return {jQuery.Deferred}
   */
  deleteReminder (reminders) {
    return http.PUT({
      module: 'reminder',
      params: { action: 'delete' },
      data: reminders
    }).then(function () {
      if (_.isArray(reminders)) {
        _(reminders).each(function (reminder) {
          delete reminderStorage[reminder.id]
        })
      } else {
        delete reminderStorage[reminders.id]
      }
    })
  },

  /**
   * remind again (works only for task reminders)
   * @param  {number}          remindDate unix datetime
   * @param  {string}          reminderId
   * @return {jQuery.Deferred}
   */
  remindMeAgain (remindDate, reminderId) {
    return http.PUT({
      module: 'reminder',
      params: {
        action: 'remindAgain',
        id: reminderId,
        timezone: 'UTC'
      },
      data: { alarm: remindDate }
    }).always(function () {
      // get the new data
      api.getReminders()
    })
  },

  /**
   * get reminders
   * @param  {number}          range end of scope
   * @fires  api#set:tasks:reminder reminderTaskId, reminderId
   * @fires  api#set:calendar:reminder reminderCalId
   * @return {jQuery.Deferred}
   */
  getReminders (range) {
    return http.GET({
      module: 'reminder',
      params: {
        action: 'range',
        timezone: 'UTC',
        modules: 'tasks',
        // if no range given, get the reminders an our ahead(to be independent of global refresh)
        end: range || moment().add(1, 'hour').valueOf()
      }
    }).then(function (list) {
      // remove appointment reminders, those are requested via chronos api, remove code once backend supports modules parameter
      list = _(list).filter(function (reminder) {
        return reminder.module === 4
      })
      updateReminders(list)
      checkReminders()
      return list
    })
  },

  /**
   * get's a task for a given reminder
   * @param  {reminder}        reminder
   * @return {jQuery.Deferred}
   */
  get (reminder) {
    // no module attribute or target_id given, use the storage
    if (!reminder.module || !reminder.target_id) {
      reminder = reminderStorage[reminder.id]
    }
    if (!reminder) {
      // no valid reminder found
      return $.Deferred().reject()
    }

    const obj = {
      id: reminder.target_id,
      folder_id: reminder.folder
    }
    return taskAPI.get(obj)
  }
}

Events.extend(api)

/**
 * bind to global refresh; clears caches and trigger refresh.all
 * @fires  api#refresh.all
 * @return {jQuery.Promise}
 */
api.refresh = function () {
  api.getReminders().done(function () {
    // trigger local refresh
    api.trigger('refresh.all')
  })
}

ox.on('refresh^', function () {
  api.refresh()
})

function handleDelete (item) {
  if (!(item || item.length)) {
    return
  }

  // we only check for single items
  // multiple deletes will always trigger server request
  if (_.isArray(item)) {
    if (item.length === 1) {
      item = item[0]
    } else {
      api.getReminders()
    }
  }

  if (find(item, true)) {
    checkReminders()
  }
}
// function returns true if there is a reminder for the task or appointment
// setting remove to true also removes it
function find (item, remove) {
  let found = false
  _(reminderStorage).each(function (reminder, key) {
    if (reminder.target_id === item.id) {
      if (remove) {
        delete reminderStorage[key]
      }
      found = true
    }
  })
  return found
}

// bind some events to keep reminders up to date
taskAPI.on('delete mark:task:confirmed', function (e, item) {
  if (e.type === 'mark:task:confirmed') {
    const tasks = []
    // remove reminders for declined tasks
    _(item).each(function (obj) {
      if (!obj.data || obj.data.confirmation === 2) {
        tasks.push(obj)
      }
    })
    handleDelete(tasks)
  } else {
    handleDelete(item)
  }
})

taskAPI.on('update', function (e, item) {
  if (find(item)) {
    // get fresh data to be consistent(name, due date change etc)
    api.getReminders()
  }
})

export default api
