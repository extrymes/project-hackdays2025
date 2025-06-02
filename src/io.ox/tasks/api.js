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

import http from '@/io.ox/core/http'
import apiFactory from '@/io.ox/core/api/factory'
import folderAPI from '@/io.ox/core/folder/api'

/**
 * notify
 * @private
 * @param  {object}    currentvalues (object with current task data from backend(after update/create))
 * @param  {object}    modifications
 * @param  {boolean}   create (if this was called after a create action, default = false)
 * @fires  api#mark:task:confirmed (ids)
 * @fires  api#mark:overdue (ids)
 * @fires  api#unmark:overdue (ids)
 * @return {undefined}
 */
const checkForNotifications = function (currentValues, modifications, create) {
  // check move
  if (modifications.folder_id && modifications.folder_id !== currentValues.folder_id) {
    api.getTasks()
    import('@/io.ox/core/api/reminder').then(function ({ default: reminderAPI }) {
      reminderAPI.getReminders()
    })
  } else {
    // check participants
    if (modifications.participants) {
      const myId = ox.user_id
      let triggered = false
      // user is added to a task
      _(modifications.participants).each(function (obj) {
        if (obj.id === myId) {
          triggered = true
          api.trigger('mark:task:to-be-confirmed', [currentValues])
        }
      })
      // user is not in the current participants
      if (!triggered) {
        // user was removed from a task, reset all possible notifications, so no artifacts remain
        api.trigger('mark:task:confirmed', [currentValues])
        import('@/io.ox/core/api/reminder').then(function ({ default: reminderAPI }) {
          reminderAPI.getReminders()
        })
        api.getTasks()
        return
      }
    }
    // check alarm
    if ((modifications.alarm !== undefined) || (create && modifications.alarm)) {
      import('@/io.ox/core/api/reminder').then(function ({ default: reminderAPI }) {
        reminderAPI.getReminders()
      })
    }

    // check overdue
    if (modifications.status || (modifications.end_time !== undefined)) {
      if (currentValues.status !== 3 && currentValues.end_time < _.now()) {
        api.trigger('mark:overdue', [currentValues])
      } else {
        api.trigger('unmark:overdue', [currentValues])
      }
    }
  }
}

/**
 * applies task modifications to all cache
 * @private
 * @param  {object[]}        tasks         (objects with id and folder_id)
 * @param  {string}          folder        (folder id of the current folder)
 * @param  {object}          modifications (modifications of the cachevalues)
 * @return {jQuery.Deferred}
 */
const updateAllCache = function (tasks, folder, modifications) {
  let list = _.copy(tasks, true)
  // make sure we have an array
  list = list || []
  list = _.isArray(list) ? list : [list]

  // is's empty. nothing to do
  if (list.length === 0) {
    return $.when()
  }
  // make sure ids are strings
  folder = folder.toString()
  _(list).each(function (task) {
    task.id = task.id.toString()
    task.folder_id = task.folder_id.toString()
  })

  // move operation
  if (list[0].folder_id && list[0].folder_id !== folder) {
    return api.caches.all.clear()
  }
  let found = false
  const cacheKey = api.cid({
    folder,
    sort: api.options.requests.all.sort,
    order: api.options.requests.all.order
  })
  // look for items and copy modifications to the cache to make it valid again
  return api.caches.all.get(cacheKey).then(function (cachevalue) {
    if (cachevalue) {
      _(cachevalue).each(function (singlevalue) {
        _(list).each(function (item) {
          if (singlevalue.id.toString() === item.id && singlevalue.folder_id.toString() === folder) {
            // apply modified values
            _.extend(singlevalue, modifications)
            found = true
          }
        })
      })
      if (found) {
        return api.caches.all.add(cacheKey, cachevalue)
      }
    }
    // just leave it to the next all request, no need to do it here
  })
}

/**
 * gets every task in users private folders. Used in Portal tile
 * @private
 * @return {jQuery.Deferred}
 */
const getAllFromAllFolders = function () {
  return api.search({ pattern: '', end: _.now() })
}

/**
 * return array of participants with normalized properties
 * @param  {object[]} participants
 * @return {object[]}
 */
const repairParticipants = function (participants) {
  // current participantsmodel is heavily overloaded but does not
  // contain the needed information ... maybe include this in the
  // standard participants model if calendar etc need the same
  const list = []
  if (participants && participants.length > 0) {
    _(participants).each(function (participant) {
      let tmp = {}
      tmp.type = participant.type
      switch (participant.type) {
        case 1:// internal user
          tmp.type = participant.type
          tmp.mail = participant.email1
          tmp.display_name = participant.display_name
          tmp.id = participant.id
          break
        case 5:// external user
          tmp.type = participant.type
          tmp.mail = participant.mail
          tmp.display_name = participant.display_name
          tmp.id = 0
          break
        default:// all the rest
          tmp = participant
          break
      }
      list.push(tmp)
    })
    return list
  }
  return participants
}

// generate basic API
const api = apiFactory({
  module: 'tasks',
  pipe: {
    get: data => ({
      ...data,
      categories: data.categories
    })
  },
  keyGenerator (obj) {
    let folder = null
    if (obj) {
      if (obj.folder) {
        folder = obj.folder
      } else if (obj.folder_id) {
        folder = obj.folder_id
      } else {
        // no folderAttribute for cache Keygen found, using default
        folder = folderAPI.getDefaultFolder('tasks')
      }
    }

    return obj ? folder + '.' + obj.id : ''
  },
  requests: {
    all: {
      folder: folderAPI.getDefaultFolder('tasks'),
      columns: '1,5,20,101,200,203,220,300,301,317,401',
      extendColumns: 'io.ox/tasks/api/all',
      sort: '317',
      order: 'asc',
      // allow DB cache
      cache: true,
      timezone: 'UTC'
    },
    list: {
      action: 'list',
      columns: '1,2,5,20,101,200,203,220,221,300,301,309,316,317,401',
      extendColumns: 'io.ox/tasks/api/list',
      timezone: 'UTC'
    },
    get: {
      action: 'get',
      timezone: 'UTC'
    },
    search: {
      action: 'search',
      columns: '1,2,5,20,101,200,203,220,221,300,301,309,317,401',
      extendColumns: 'io.ox/tasks/api/all',
      sort: '317',
      order: 'asc',
      timezone: 'UTC',
      getData (query) {
        return { pattern: query.pattern, end: query.end, start: query.start }
      }
    }
  }
})

/**
 * remove from get/list cache
 * @param  {string | Array} key
 * @fires  api#create (task)
 * @return {jQuery.Promise}
 */
api.removeFromCache = function (key) {
  return $.when(api.caches.get.remove(key), api.caches.list.remove(key))
}

// used for attachmentAPI.pendingAttachments
const tasksModuleId = 4
api.getAttachmentsHashKey = data => `${tasksModuleId}:${_.cid({ id: data.id, folder_id: data.folder || data.folder_id })}`

/**
 * create a task
 * @param  {object}          task
 * @return {jQuery.Deferred}      done returns object with id property
 */
api.create = function (task) {
  task.participants = repairParticipants(task.participants)
  let response
  // task.alarm must not be null on creation, it's only used to delete an alarm on update actions
  if (task.alarm === null) {
    // leaving it in would throw a backend error
    delete task.alarm
  }
  if (task.priority === 'null' || !task.priority) {
    delete task.priority
  }
  // make sure we have an integer here
  if (task.status) {
    task.status = parseInt(task.status, 10)
  }
  if (task.status === 3) {
    // make sure we have date_completed
    task.date_completed = task.date_completed || _.now()
  } else {
    // remove invalid date_completed
    delete task.date_completed
  }
  return http.PUT({
    module: 'tasks',
    params: { action: 'new', timezone: 'UTC' },
    data: task,
    appendColumns: false
  }).then(function (obj) {
    task.id = obj.id
    response = obj

    // get fresh data
    return api.get({ folder: task.folder_id, id: task.id })
  }).then(function (newData) {
    // fill caches
    task = newData
    return $.when(
      api.caches.all.grepRemove(task.folder_id + api.DELIM),
      api.caches.list.merge(task)
    )
  }).then(function () {
    checkForNotifications(task, task, true)
    api.trigger('create', task)
    api.trigger('refresh.all')
    return response
  })
}

/**
 * update single task
 * @param  {object} task      (id, folder_id, 'changed attributes')
 * @param  {string} newFolder (optional; target folder id)
 * @fires  api#refresh.all
 * @fires  api#update:ecid
 * @return {[type]}
 */
api.update = function (task, newFolder) {
  let obj
  let useFolder = task.folder_id
  let move = false

  // delete temp attributes
  delete task.timezone

  // repair broken folder attribute
  if (task.folder) {
    useFolder = task.folder_id = task.folder
    delete task.folder
  }

  // recurrence attribute key present but undefined means it must be removed so set to null
  // this is different from calendar implementation, where recurrence attributes that are not in the request are set to null automatically by the backend
  if (_(task).has('days') && task.days === undefined) {
    task.days = null
  }
  if (_(task).has('day_in_month ') && task.day_in_month === undefined) {
    task.day_in_month = null
  }
  if (_(task).has('month') && task.month === undefined) {
    task.month = null
  }

  // folder is only used by move operation, because here we need 2 folder attributes
  if (newFolder && arguments.length === 2) {
    // only minimal set for move operation needed
    task = {
      folder_id: newFolder,
      id: task.id
    }
    move = true
  }
  // set always (OX6 does this too)
  task.notification = true

  // if no folder is given use default
  if (useFolder === undefined) {
    useFolder = api.getDefaultFolder()
  }

  if (task.status !== undefined) {
    // status might be undefined during an update
    // we only touch the completion date if we know the status (see bug 38587)

    // make sure we have an integer here
    task.status = parseInt(task.status, 10)

    // update/keep date_completed when status is 3 (done)
    task.date_completed = task.status === 3 ? (task.date_completed || _.now()) : null
  }

  if (task.priority === 0) {
    task.priority = null
  }

  const key = useFolder + '.' + task.id

  return http.PUT({
    module: 'tasks',
    params: {
      action: 'update',
      folder: useFolder,
      id: task.id,
      timestamp: task.last_modified || _.then(),
      timezone: 'UTC'
    },
    data: _(task).omit('last_modified'),
    appendColumns: false
  })
    .then(function () {
    // update cache
      let sortChanged = false
      const def = $.Deferred()
      // data that is important for sorting changed, so clear the all cache
      if (task.title || task.end_time || task.status) {
        sortChanged = true
      }
      // api.get updates list and get caches
      api.removeFromCache(key).then(function () {
      // api.get updates list and get caches
        api.get({ id: task.id, folder_id: newFolder || useFolder }).done(def.resolve).fail(function (error) {
        // don't fail if permission to see the task is denied (update worked fine and user has probably removed himself from the task. Edgecase but possible)
          if (error && error.code === 'TSK-0046') def.resolve()
          def.reject(arguments)
        })
      })
      return $.when(
        def,
        sortChanged ? api.caches.all.clear() : updateAllCache([task], useFolder, task))
    })
    .then(function (data) {
      // return object with id and folder id needed to save the attachments correctly
      obj = { folder_id: useFolder, id: task.id }
      // notification check
      if (data) {
        checkForNotifications(data, task, true)
      } else {
        // not enough data, so just get fresh data from the server, to keep the notifications up to date
        import('@/io.ox/core/api/reminder').then(function ({ default: reminderAPI }) {
          reminderAPI.getReminders()
        })
        api.getTasks()
      }
      return obj
    })
    .done(function () {
      // trigger refresh, for vGrid etc
      api.trigger('refresh.all')
      if (move) {
        api.trigger('move', { id: task.id, folder_id: useFolder, newFolder: task.folder_id })
        api.trigger('move:' + _.ecid({ id: task.id, folder_id: useFolder }), task.folder_id)
      } else {
        api.trigger('update', { id: task.id, folder_id: useFolder })
        api.trigger('update:' + _.ecid({ id: task.id, folder_id: useFolder }))
      }
    })
}

/**
 * update list of tasks used by done/undone and move actions when used with multiple selection
 * @param  {object[]}        list          of task objects (id, folder_id)
 * @param  {object}          modifications
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}
 */
api.updateMultiple = function (list, modifications) {
  const keys = []
  // set always (OX6 does this too)
  modifications.notification = true
  http.pause()

  _(list).map(function (obj) {
    // repair broken folder attribute
    if (obj.folder) {
      obj.folder_id = obj.folder
      delete obj.folder
    }
    keys.push(obj.folder_id + '.' + obj.id)
    return http.PUT({
      module: 'tasks',
      params: {
        action: 'update',
        id: obj.id,
        folder: obj.folder_id,
        timestamp: _.then(),
        timezone: 'UTC'
      },
      data: modifications,
      appendColumns: false
    })
  })
  return http.resume().then(function () {
    // update cache
    return $.when(api.removeFromCache(keys), updateAllCache(list, modifications.folder_id || list[0].folder_id, modifications))
  }).done(function () {
    // update notifications
    // no exact checks here because multiple may contain a very large number of items
    api.getTasks()
    import('@/io.ox/core/api/reminder').then(function ({ default: reminderAPI }) {
      reminderAPI.getReminders()
    })
    api.trigger('refresh.all')
  })
}

/**
 * move task to folder
 * @param  {object | Array}  task      (or array of tasks)
 * @param  {string}          newFolder (target folder id)
 * @fires  api#refresh.all
 * @return {jQuery.Deferred}           done returns object with properties folder_id and task id
 */
api.move = function (task, newFolder) {
  // api.caches.all.grepRemove(targetFolderId + api.DELIM),
  // api.caches.all.grepRemove(o.folder_id + api.DELIM),
  // api.caches.list.remove({ id: o.id, folder: o.folder_id })

  // call updateCaches (part of remove process) to be responsive
  return api.updateCaches(task).then(function () {
    // trigger visual refresh
    api.trigger('refresh.all')

    if (!task.length) {
      return api.update(task, newFolder)
    } else if (task.length === 1) {
      return api.update(task[0], newFolder)
    }
    return api.updateMultiple(task, { folder_id: newFolder })
  })
}

/**
 * change confirmation status
 * @param  {object}         options (properties: data, folder_id, id)
 * @return {jQuery.Promise}
 */
api.confirm = function (options) {
  // options.id is the id of the task not userId
  const folderId = (options.folder_id || options.folder)
  const key = folderId + '.' + options.id
  return http.PUT({
    module: 'tasks',
    params: {
      action: 'confirm',
      folder: folderId,
      id: options.id,
      timezone: 'UTC'
    },
    // object with confirmation attribute
    data: options.data,
    appendColumns: false
  }).then(function () {
    api.trigger('mark:task:confirmed', [{ id: options.id, folder_id: folderId, data: options.data }])
    // update cache
    return api.removeFromCache(key)
  })
}

/**
 * @return {string} default folder for tasks
 */
api.getDefaultFolder = function () {
  return folderAPI.getDefaultFolder('tasks')
}

/**
 * used for portal plugin
 * @return {jQuery.Deferred} done returns list of tasks
 */
api.getAllMyTasks = (function () {
  function delegatedToMe (participants) {
    return _(participants).any(function (user) {
      const isMe = user.type === 1 && user.id === ox.user_id
      const isDeclined = user.confirmation === 2
      return isMe && !isDeclined
    })
  }

  function filter (task) {
    return (task.created_by === ox.user_id && (!task.participants || task.participants.length === 0)) || delegatedToMe(task.participants)
  }

  return function () {
    return getAllFromAllFolders().then(function (list) {
      return _(list).filter(filter)
    })
  }
}())

/**
 * get tasks for notification view
 * @fires api#new-tasks (dueTasks)
 * @fires api#set:tasks:to-be-confirmed (confirmTasks)
 * @return {jQuery.Deferred} done returns list of tasks
 */
api.getTasks = function () {
  // no default folder returns an empty list
  // happens with guestmode
  if (!api.getDefaultFolder()) {
    return $.Deferred().resolve([])
  }

  // could be done to use all folders, see portal widget but not sure if this is needed
  return http.GET({
    module: 'tasks',
    params: {
      action: 'all',
      folder: api.getDefaultFolder(),
      columns: '1,20,200,203,221,300,309,317',
      sort: '317',
      order: 'asc',
      timezone: 'UTC'
    }
  }).then(function (list) {
    // sorted by end_time filter over due Tasks
    const now = new Date()
    const userId = ox.user_id
    const dueTasks = []
    const confirmTasks = []
    for (let i = 0; i < list.length; i++) {
      const filterOverdue = (list[i].end_time < now.getTime() && list[i].status !== 3 && list[i].end_time !== null)
      if (filterOverdue) {
        dueTasks.push(list[i])
      }

      // use users array here because participants array contains external participants and unresolved groups(members of this groups are in the users array)
      for (let a = 0; a < list[i].users.length; a++) {
        if (list[i].users[a].id === userId && list[i].users[a].confirmation === 0) {
          confirmTasks.push(list[i])
        }
      }
    }
    // even if empty array is given it needs to be triggered to remove
    // notifications that does not exist anymore (already handled in ox6 etc)
    api.trigger('new-tasks', dueTasks)
    // same here
    api.trigger('set:tasks:to-be-confirmed', confirmTasks)
    return list
  })
}

/**
 * bind to global refresh; clears caches and trigger refresh.all
 * @fires  api#refresh.all
 * @return {jQuery.Promise}
 */
api.refresh = function () {
  if (ox.online) {
    // clear all caches
    $.when(
      api.caches.all.clear(),
      api.caches.list.clear(),
      api.caches.get.clear(),
      api.getTasks()
    ).done(function () {
      // trigger local refresh
      api.trigger('refresh.all')
    })
  }
}

api.on('create update', function (e, obj) {
  api.get(obj).then(function (obj) {
    // has participants?
    if (obj && _.isArray(obj.participants) && obj.participants.length > 0) {
      // check for external participants
      const hasExternalParticipants = _(obj.participants).some(function (participant) {
        return participant.type === 5
      })
      if (hasExternalParticipants) {
        import('@/io.ox/contacts/api').then(function ({ default: contactsApi }) {
          contactsApi.trigger('maybeNewContact')
        })
      }
    }
  })
})

export default api
