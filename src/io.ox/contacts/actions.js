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
import { subscribe, subscribeShared } from '@/io.ox/contacts/extensions'
import ModalDialog from '@/io.ox/backbone/views/modal'
import folderAPI from '@/io.ox/core/folder/api'
import capabilities from '@/io.ox/core/capabilities'
import upsell from '@/io.ox/core/upsell'
import api from '@/io.ox/contacts/api'
import registry from '@/io.ox/core/main/registry'
import '@/io.ox/core/pim/actions'
import gt from 'gettext'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import { settings } from '@/io.ox/contacts/settings'
import apps from '@/io.ox/core/api/apps'

//  actions
const Action = actionsUtil.Action

Action('io.ox/contacts/actions/delete', {
  index: 100,
  collection: 'some && delete',
  action (baton) {
    ox.load(() => import('@/io.ox/contacts/actions/delete')).then(function ({ default: action }) {
      action(baton)
    })
  }
})

Action('io.ox/contacts/actions/update', {
  index: 100,
  collection: 'one && modify',
  action (baton) {
    const data = baton.first()
    if (data.mark_as_distributionlist === true) {
      registry.call('io.ox/contacts/distrib', 'edit', data)
    } else {
      registry.call('io.ox/contacts/edit', 'edit', data)
    }
  }
})

Action('io.ox/contacts/actions/create', {
  shortcut: 'New contact',
  action (baton) {
    const folderId = apps.get('io.ox/contacts').folder.get()
    const model = folderAPI.pool.models[folderId]
    const openCreateDialog = (folderId) => registry.call('io.ox/contacts/edit', 'edit', { folder_id: folderId })
    if (!model || !model.can('create')) {
      const title = (model.is('shared') && gt('Contacts in shared address books')) ||
        (model.is('public') && gt('Contacts in public address books')) ||
        gt('Contacts in address books')
      return new ModalDialog({
        title,
        // #. %1$s is a name of a folders
        description: gt('You cannot add contacts in "%1$s". Do you want to add a new contact to your default address book instead?', model.get('display_title') || model.get('title'))
      })
        .addCancelButton()
        .addButton({ label: gt('Use default'), action: 'create' })
        .on('create', function () {
          const folderId = folderAPI.getDefaultFolder('contacts')
          openCreateDialog(folderId)
        })
        .open()
    }
    openCreateDialog(folderId)
  }
})

Action('io.ox/contacts/actions/new-distribution-list', {
  device: '!smartphone',
  folder: 'create',
  action (baton) {
    ox.load(() => import('@/io.ox/contacts/distrib/main')).then(async function ({ default: m }) {
      const app = m.getApp()
      await app.launch()
      app.create(baton.folder_id)
    })
  }
})

Action('io.ox/contacts/actions/subscribe', {
  async action (baton) {
    if (capabilities.has('subscription')) {
      return import('@/io.ox/core/sub/subscriptions').then(({ default: subscriptions }) => {
        subscriptions.buildSubscribeDialog({
          module: 'contacts',
          app: baton.app
        })
      })
    }

    if (!upsell.enabled(['subscription'])) return
    upsell.trigger({
      type: 'inline-action',
      id: 'io.ox/core/foldertree/contextmenu/default/subscribe',
      missing: upsell.missing(['subscription'])
    })
  }
})

Action('io.ox/contacts/actions/subscribe-shared', {
  // dialog serves multiple purposes, manage sync via carddav (all folder types) or subscribe/unsubscribe shared or public folders
  capabilities: 'edit_public_folders || read_create_shared_folders || carddav',
  async action () {
    const { default: subscribe } = await import('@/io.ox/core/sub/sharedFolders')
    subscribe.open({
      module: 'contacts',
      help: 'ox.appsuite.user.sect.contacts.folder.subscribeshared.html',
      title: gt('Subscribe to shared address books'),
      tooltip: gt('Subscribe to address book'),
      point: 'io.ox/core/folder/subscribe-shared-address-books',
      noSync: !capabilities.has('carddav'),
      sections: {
        public: gt('Public'),
        shared: gt('Shared'),
        private: gt('Private'),
        hidden: gt('Hidden')
      }
    })
  }
})

Action('io.ox/contacts/actions/move', {
  collection: 'some && read && delete',
  action: generate('move', gt('Move'), { multiple: gt('Contacts have been moved'), single: gt('Contact has been moved') })
})

Action('io.ox/contacts/actions/copy', {
  collection: 'some && read',
  action: generate('copy', gt('Copy'), { multiple: gt('Contacts have been copied'), single: gt('Contact has been copied') })
})

function generate (type, label, success) {
  return function (baton) {
    const vgrid = baton.grid || (baton.app && baton.app.getGrid())
    ox.load(() => import('@/io.ox/core/folder/actions/move')).then(function ({ default: move }) {
      move.item({
        api,
        button: label,
        flat: true,
        indent: false,
        list: baton.array(),
        module: 'contacts',
        root: '1',
        settings,
        success,
        target: baton.target,
        title: label,
        type,
        vgrid
      })
    })
  }
}

Action('io.ox/contacts/actions/send', {
  capabilities: 'webmail',
  collection: 'some',
  every: 'mark_as_distributionlist || email1 || email2 || email3',
  action (baton) {
    import('@/io.ox/contacts/actions/send')
      .then(({ default: action }) => action(baton.array()))
  }
})

Action('io.ox/contacts/actions/export', {
  collection: 'some && read',
  action (baton) {
    import('@/io.ox/core/export')
      .then(({ default: exportDialog }) => exportDialog.open('contacts', { list: baton.array() }))
  }
})

Action('io.ox/contacts/actions/vcard', {
  capabilities: 'webmail',
  collection: 'some && read',
  action (baton) {
    return api.getList(baton.array(), false, { allColumns: true }).then(function (list) {
      registry.call('io.ox/mail/compose', 'open', {
        attachments: list.map(function (contact) {
          return { origin: 'contacts', id: contact.id, folderId: contact.folder_id }
        })
      })
    })
  }
})

Action('io.ox/contacts/actions/invite', {
  capabilities: 'calendar',
  collection: 'some',
  every: 'mark_as_distributionlist || internal_userid || email1 || email2 || email3',
  action (baton) {
    import('@/io.ox/contacts/actions/invite')
      .then(({ default: action }) => action(baton.array()))
  }
})

Action('io.ox/contacts/actions/add-to-contactlist', {
  collection: 'one',
  matches (baton) {
    const data = baton.first()
    if (data.folder_id === String(mailSettings.get('contactCollectFolder'))) return true
    return !data.folder_id && !data.id
  },
  action (baton) {
    const data = _(baton.first()).omit('folder_id', 'id')
    baton = ext.Baton({ data })
    import('@/io.ox/contacts/actions/addToContactlist')
      .then(({ default: action }) => action(baton))
  }
})

Action('io.ox/contacts/actions/print', {
  device: '!smartphone',
  collection: 'some && read',
  matches (baton) {
    // check if collection has min 1 contact
    if (settings.get('features/printList') === 'list') return true
    return baton.array().some(function (el) { return !el.mark_as_distributionlist })
  },
  action (baton) {
    import('@/io.ox/contacts/actions/print')
      .then(({ default: print }) => print.multiple(baton.array()))
  }
})

// Secondary actions
let INDEX = 100
ext.point('io.ox/secondary').extend({
  id: 'new-distribution-list',
  index: INDEX += 100,
  render (baton) {
    if (baton.appId !== 'io.ox/contacts') return
    this.action('io.ox/contacts/actions/new-distribution-list', gt('New distribution list'), baton)
    this.divider()
  }
}, {
  id: 'subscribe',
  index: INDEX += 100,
  render: subscribe
}, {
  id: 'subscribe-shared-contacts',
  index: INDEX += 100,
  render: subscribeShared
})

//  inline links
INDEX = 100
ext.point('io.ox/contacts/links/inline').extend(
  {
    id: 'add-to-contactlist',
    prio: 'hi',
    index: INDEX += 100,
    icon: 'bi/person-plus.svg',
    title: gt('Add to address book'),
    ref: 'io.ox/contacts/actions/add-to-contactlist'
  },
  {
    id: 'edit',
    index: INDEX += 100,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/pencil.svg',
    title: gt('Edit'),
    ref: 'io.ox/contacts/actions/update'
  },
  {
    id: 'send',
    index: INDEX += 100,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/envelope.svg',
    title: gt('Send email'),
    ref: 'io.ox/contacts/actions/send'
  },
  {
    id: 'invite',
    index: INDEX += 100,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/calendar.svg',
    title: gt('Invite'),
    tooltip: gt('Invite to appointment'),
    ref: 'io.ox/contacts/actions/invite'
  },
  {
    id: 'delete',
    index: INDEX += 100,
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/contacts/actions/delete'
  },
  {
    id: 'vcard',
    index: INDEX += 100,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Send as vCard'),
    ref: 'io.ox/contacts/actions/vcard'
  },
  {
    id: 'move',
    index: INDEX += 100,
    mobile: 'lo',
    title: gt('Move'),
    ref: 'io.ox/contacts/actions/move',
    section: 'file-op'
  },
  {
    id: 'copy',
    index: INDEX += 100,
    mobile: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/contacts/actions/copy',
    section: 'file-op'
  },
  {
    id: 'print',
    index: INDEX += 100,
    title: gt('Print'),
    ref: 'io.ox/contacts/actions/print',
    section: 'export'
  },
  {
    id: 'export',
    index: INDEX += 100,
    prio: 'lo',
    mobile: 'lo',
    title: gt('Export'),
    ref: 'io.ox/contacts/actions/export',
    section: 'export'
  },
  {
    id: 'add-to-portal',
    index: INDEX += 100,
    mobile: 'lo',
    title: gt('Add to portal'),
    ref: 'io.ox/contacts/actions/add-to-portal',
    section: 'export'
  }
)
