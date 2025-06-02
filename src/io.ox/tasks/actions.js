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

import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import capabilities from '@/io.ox/core/capabilities'
import ModalDialog from '@/io.ox/backbone/views/modal'
import print from '@/io.ox/core/print'
import extensions from '@/io.ox/tasks/common-extensions'
import folderAPI from '@/io.ox/core/folder/api'
import apps from '@/io.ox/core/api/apps'
import '@/io.ox/core/pim/actions'

import gt from 'gettext'

//  actions
const Action = actionsUtil.Action

Action('io.ox/tasks/actions/create', {
  shortcut: 'New task',
  action (baton) {
    const folderId = apps.get('io.ox/tasks').folder.get()
    const model = folderAPI.pool.models[folderId]

    const openCreateDialog = (folderid) => ox.load(() => import('@/io.ox/tasks/edit/main')).then(function ({ default: edit }) {
      edit.getApp().launch({ folderid })
    })
    if (!model || !model.can('create')) {
      const title = (model.is('shared') && gt('Tasks in shared folders')) ||
        (model.is('public') && gt('Tasks in public folders')) ||
        gt('Tasks in folders')
      return new ModalDialog({
        title,
        // #. %1$s is a name of a folders
        description: gt('You cannot add tasks in "%1$s". Do you want to add a new task to your default folder instead?', model.get('display_title') || model.get('title'))
      })
        .addCancelButton()
        .addButton({ label: gt('Use default'), action: 'create' })
        .on('create', function () {
          const folderId = folderAPI.getDefaultFolder('tasks')
          openCreateDialog(folderId)
        })
        .open()
    }
    openCreateDialog(folderId)
  }
})

Action('io.ox/tasks/actions/edit', {
  collection: 'one && modify',
  action (baton) {
    const data = baton.first()
    ox.load(() => import('@/io.ox/tasks/edit/main')).then(function ({ default: m }) {
      if (m.reuse('edit', data)) return
      m.getApp().launch({ taskData: data })
    })
  }
})

Action('io.ox/tasks/actions/delete', {
  collection: 'some && delete',
  action (baton) {
    ox.load(() => import('@/io.ox/tasks/actions/delete')).then(function ({ default: action }) {
      action(baton.array())
    })
  }
})

Action('io.ox/tasks/actions/done', {
  collection: 'some && modify',
  matches (baton) {
    // it's either multiple/array or just one and status not 'done'
    return baton.collection.has('multiple') || baton.first().status !== 3
  },
  action (baton) {
    ox.load(() => import('@/io.ox/tasks/actions/doneUndone')).then(function ({ default: action }) {
      action(baton.array(), 1)
    })
  }
})

Action('io.ox/tasks/actions/undone', {
  collection: 'some && modify',
  matches (baton) {
    // it's either multiple/array or just one and status not 'done'
    return baton.collection.has('multiple') || baton.first().status === 3
  },
  action (baton) {
    ox.load(() => import('@/io.ox/tasks/actions/doneUndone')).then(function ({ default: action }) {
      action(baton.array(), 3)
    })
  }
})

Action('io.ox/tasks/actions/move', {
  collection: 'some && delete',
  matches (baton) {
    // we cannot move tasks in shared folders
    return !baton.array().some(function (item) {
      return isShared(item.folder_id)
    })
  },
  action (baton) {
    ox.load(() => import('@/io.ox/tasks/actions/move')).then(function ({ default: action }) {
      action(baton)
    })
  }
})

function isShared (id) {
  const data = folderAPI.pool.getModel(id).toJSON()
  return folderAPI.is('shared', data)
}

// Tested: No
Action('io.ox/tasks/actions/confirm', {
  collection: 'one',
  matches (baton) {
    return _(baton.first().users).some(function (user) {
      return user.id === ox.user_id
    })
  },
  action (baton) {
    const data = baton.first()
    ox.load(() => Promise.all([import('@/io.ox/calendar/actions/acceptdeny'), import('@/io.ox/tasks/api')]))
      .then(function ([{ default: acceptdeny }, { default: api }]) {
        acceptdeny(data, {
          taskmode: true,
          api,
          callback () {
          // update detailview
            api.trigger('update:' + _.ecid({ id: data.id, folder_id: data.folder_id }))
          }
        })
      })
  }
})

Action('io.ox/tasks/actions/export', {
  collection: 'some && read',
  async action (baton) {
    const { default: exportDialog } = await import('@/io.ox/core/export')
    exportDialog.open('tasks', { list: baton.array() })
  }
})

Action('io.ox/tasks/actions/print', {
  device: '!smartphone',
  collection: 'some && read',
  action (baton) {
    print.request(() => import('@/io.ox/tasks/print'), baton.array())
  }
})

Action('io.ox/tasks/actions/placeholder', {
  collection: 'one && modify',
  action: _.noop
})

Action('io.ox/tasks/actions/subscribe-shared', {
  async action (baton) {
    const { default: subscribe } = await import('@/io.ox/core/sub/sharedFolders')
    subscribe.open({
      module: 'tasks',
      help: 'ox.appsuite.user.sect.tasks.folder.subscribeshared.html',
      title: gt('Subscribe to shared task folders'),
      tooltip: gt('Subscribe to task folder'),
      point: 'io.ox/core/folder/subscribe-shared-tasks-folders',
      noSync: !capabilities.has('caldav'),
      sections: {
        public: gt('Public tasks folders'),
        shared: gt('Shared tasks folders'),
        private: gt('Private'),
        hidden: gt('Hidden tasks folders')
      }
    })
  }
})

// Secondary actions
ext.point('io.ox/secondary').extend({
  id: 'subscribe-shared-tasks',
  index: 100,
  render (baton) {
    if (baton.appId !== 'io.ox/tasks') return
    this.action('io.ox/tasks/actions/subscribe-shared', gt('Subscribe to shared task folders'), baton)
    this.divider()
  }
})

ext.point('io.ox/tasks/links/inline').extend(
  {
    id: 'edit',
    index: 100,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/pencil.svg',
    title: gt('Edit'),
    ref: 'io.ox/tasks/actions/edit'
  },
  {
    id: 'change-due-date',
    index: 200,
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/clock.svg',
    title: gt('Due'),
    tooltip: gt('Change due date'),
    ref: 'io.ox/tasks/actions/placeholder',
    customize: extensions.dueDate
  },
  {
    id: 'done',
    index: 300,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/check-circle.svg',
    title: gt('Done'),
    tooltip: gt('Mark as done'),
    ref: 'io.ox/tasks/actions/done'
  },
  {
    id: 'undone',
    index: 310,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/play.svg',
    title: gt('Undone'),
    tooltip: gt('Mark as undone'),
    ref: 'io.ox/tasks/actions/undone'
  },
  {
    id: 'delete',
    index: 400,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/tasks/actions/delete'
  },
  {
    id: 'move',
    index: 500,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Move'),
    ref: 'io.ox/tasks/actions/move'
  },
  {
    id: 'confirm',
    index: 600,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Change confirmation'),
    ref: 'io.ox/tasks/actions/confirm'
  },
  {
    id: 'export',
    index: 650,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Export'),
    ref: 'io.ox/tasks/actions/export'
  },
  {
    id: 'print',
    index: 700,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Print'),
    ref: 'io.ox/tasks/actions/print'
  }
)
