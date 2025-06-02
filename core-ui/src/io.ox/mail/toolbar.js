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

// was define.async
import $ from '@/jquery'
import _ from '@/underscore'
import ox from '@/ox'
import ext from '@/io.ox/core/extensions'
import * as actionsUtil from '@/io.ox/backbone/views/actions/util'
import * as util from '@/io.ox/mail/util'
import flagPicker from '@/io.ox/core/tk/flag-picker'
import api from '@/io.ox/mail/api'
import capabilities from '@/io.ox/core/capabilities'
import ToolbarView from '@/io.ox/backbone/views/toolbar'
import mailfilter from '@/io.ox/core/api/mailfilter'
import '@/io.ox/mail/actions'
import '@/io.ox/mail/style.scss'
import '@/io.ox/mail/folderview-extensions'

import { settings } from '@/io.ox/core/settings'
import { settings as mailSettings } from '@/io.ox/mail/settings'
import gt from 'gettext'
import { addReadyListener } from '@/io.ox/core/events'

// define links for classic toolbar
const point = ext.point('io.ox/mail/toolbar/links')

const meta = {
  edit: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Edit draft'),
    icon: 'bi/pencil.svg',
    ref: 'io.ox/mail/actions/edit'
  },
  'edit-copy': {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Edit copy'),
    icon: 'bi/files.svg',
    ref: 'io.ox/mail/actions/edit-copy'
  },
  // ------------------------------------------------------
  delete: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    drawDisabled: true,
    ref: 'io.ox/mail/actions/delete'
  },
  archive: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/archive.svg',
    // #. Verb: (to) archive messages
    title: gt.pgettext('verb', 'Archive'),
    ref: 'io.ox/mail/actions/archive'
  },
  spam: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/bag-x.svg',
    title: gt('Mark as spam'),
    ref: 'io.ox/mail/actions/spam'
  },
  nospam: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/hand-thumbs-up.svg',
    title: gt('Not spam'),
    ref: 'io.ox/mail/actions/nospam'
  },
  // ------------------------------------------------------
  reply: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/reply.svg',
    iconClass: 'bi-20',
    title: gt('Reply to sender'),
    drawDisabled: true,
    ref: 'io.ox/mail/actions/reply'
  },
  'reply-all': {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/reply-all.svg',
    iconClass: 'bi-20',
    title: gt('Reply to all recipients'),
    drawDisabled: true,
    ref: 'io.ox/mail/actions/reply-all'
  },
  forward: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/forward.svg',
    iconClass: 'bi-20',
    title: gt('Forward'),
    drawDisabled: true,
    ref: 'io.ox/mail/actions/forward'
  },
  // ------------------------------------------------------
  category: {
    prio: 'hi',
    mobile: 'none',
    icon: 'bi/folder.svg',
    title: gt('Set category'),
    ref: 'io.ox/mail/actions/category',
    customize (baton) {
      if (!mailSettings.get('categories/enabled')) return
      import('@/io.ox/mail/categories/picker').then(function ({ default: picker }) {
        picker.attach(this, { props: baton.app.props, data: baton.data })
      }.bind(this))
    }
  },
  color: {
    prio: 'hi',
    mobile: 'none',
    icon: 'bi/flag.svg',
    title: gt('Set color'),
    ref: 'io.ox/mail/actions/color',
    customize (baton) {
      flagPicker.attach(this, { data: baton.data })
    }
  },

  flag: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/star.svg',
    // #. Verb: (to) flag messages
    title: gt.pgettext('verb', 'Flag'),
    ref: 'io.ox/mail/actions/flag'
  },
  unflag: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/star-fill.svg',
    // #. Verb: (to) unflag messages
    title: gt.pgettext('verb', 'Unflag'),
    ref: 'io.ox/mail/actions/unflag'
  },
  move: {
    prio: 'hi',
    mobile: 'lo',
    icon: 'bi/folder-symlink.svg',
    title: gt('Move'),
    ref: 'io.ox/mail/actions/move',
    section: 'file-op'
  },
  'mark-read': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Mark as read'),
    ref: 'io.ox/mail/actions/mark-read',
    section: 'flags'
  },
  'mark-unread': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Mark as unread'),
    ref: 'io.ox/mail/actions/mark-unread',
    section: 'flags'
  },
  copy: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/mail/actions/copy',
    section: 'file-op'
  },
  print: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Print'),
    ref: 'io.ox/mail/actions/print',
    section: 'file-op'
  },
  'save-as-eml': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Save as file'),
    ref: 'io.ox/mail/actions/save',
    section: 'file-op'
  },
  'save-as-pdf': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Save as PDF'),
    ref: 'io.ox/mail/actions/save-as-pdf',
    section: 'file-op'
  },
  source: {
    prio: 'lo',
    mobile: 'none',
    // #. source in terms of source code
    title: gt('View source'),
    ref: 'io.ox/mail/actions/source',
    section: 'file-op'
  },
  reminder: {
    prio: 'lo',
    mobile: 'none',
    title: gt('Reminder'),
    ref: 'io.ox/mail/actions/reminder',
    section: 'keep'
  },
  'add-to-portal': {
    prio: 'lo',
    mobile: 'none',
    title: gt('Add to portal'),
    ref: 'io.ox/mail/actions/add-to-portal',
    section: 'keep'
  }
}

// transform into extensions

let index = 0
_(meta).each(function (extension, id) {
  point.extend(_.extend({ id, index: index += 100 }, extension))
})

// local dummy action

const Action = actionsUtil.Action

Action('io.ox/mail/actions/category', {
  capabilities: 'mail_categories',
  collection: 'some',
  matches (baton) {
    return !!baton.app.props.get('categories')
  },
  action: $.noop
})

Action('io.ox/mail/actions/color', {
  collection: 'some',
  matches (baton) {
    return mailSettings.flagByColor && !util.isEmbedded(baton.data)
  },
  action: $.noop
})

Action('io.ox/mail/actions/dummy', {
  collection: 'some',
  action: $.noop
})

index = 0
ext.point('io.ox/topbar/settings-dropdown').extend(
  {
    id: 'mail-layout',
    index: index += 100,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      this.group(gt('Layout'))
        .option('layout', 'vertical', gt('Vertical'), { radio: true, group: true, illustration: svg('vertical') })
        .option('layout', 'horizontal', gt('Horizontal'), { radio: true, group: true, illustration: svg('horizontal') })
        .option('layout', 'list', gt('List'), { radio: true, group: true, illustration: svg('list') })
        .divider()
      function svg (name) {
        return $.svg({ src: `themes/default/illustrations/layout-${name}.svg`, width: 80, height: 60, role: 'presentation' })
          .addClass('ms-auto me-8').css({ color: 'var(--accent)' })
      }
    }
  },
  {
    id: 'mail-list-options',
    index: index += 100,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      this
        .group(gt('List options'))
        .option('listViewLayout', 'avatars', gt('Contact pictures'), { radio: true, group: true })
      if (settings.get('selectionMode') !== 'alternative') {
        this.option('listViewLayout', 'checkboxes', gt('Checkboxes'), { radio: true, group: true })
      }
      this.option('listViewLayout', 'simple', gt('Simple'), { radio: true, group: true })
        .divider()
    }
  },
  {
    id: 'add-mail-account',
    index: (index = 4000),
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      this.link('add-mail-account', gt('Add mail account') + ' ...', addMailAccount)
    }
  },
  {
    id: 'all-attachments',
    index: index += 100,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      if (!settings.get('folder/mailattachments', {}).all) return
      this.link('attachments', gt('All attachments') + ' ...', allAttachments.bind(null, baton.app))
    }
  },
  {
    id: 'mail-categories',
    index: (index = 6100),
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      if (!capabilities.has('mail_categories')) return
      this
        // .group(gt('Inbox'))
        // .option('categories', true, gt('Use categories'), { group: true })
        // #. term is followed by a space and three dots (' …')
        // #. the dots refer to the term 'Categories' right above this dropdown entry
        // #. so user reads it as 'Configure Categories'
        .link('categories-config', gt('Inbox categories') + ' ...', _.bind(onConfigureCategories, this, baton.app.props))
    }
  },
  {
    id: 'mail-vacation-notice',
    index: index += 100,
    render (baton) {
      if (baton.appId !== 'io.ox/mail') return
      if (!supportsVacationNotice) return
      this.link('vacation-notice', gt('Vacation notice') + ' ...', onOpenVacationNotice)
    }
  },
  {
    id: 'mail-statistics',
    index: index += 100,
    render ({ appId, app }) {
      if (appId !== 'io.ox/mail') return
      const isVirtualFolderSelected = app.folderView.tree.$container.find('li.folder.selectable.virtual.selected').length > 0
      if (isVirtualFolderSelected) return
      this.link('statistics', gt('Statistics') + ' ...', statistics.bind(null, app))
    }
  }
)

let supportsVacationNotice = false
addReadyListener('capabilities:user', (capabilities) => {
  if (!capabilities.has('mailfilter_v2')) return
  mailfilter.getConfig().then(function doneFilter (config) {
    supportsVacationNotice = !!_(config.actioncmds).findWhere({ id: 'vacation' })
  })
})

ext.point('io.ox/mail/toolbar/links/view-dropdown').extend({
  id: 'mail-attachments',
  index: 500,
  draw (baton) {
    if (!settings.get('folder/mailattachments', {}).all) return
    this.link('attachments', gt('All attachments'), allAttachments.bind(null, baton.app))
  }
})

function statistics (app, e) {
  e.preventDefault()
  import('@/io.ox/mail/statistics')
    .then(({ default: statistics }) => statistics.open(app))
}

function allAttachments (app, e) {
  e.preventDefault()
  const attachmentView = settings.get('folder/mailattachments', {})
  ox.launch(() => import('@/io.ox/files/main'), { folder: attachmentView.all }).then(function (app) {
    app.folder.set(attachmentView.all)
  })
}

function onConfigureCategories (props) {
  import('@/io.ox/mail/categories/edit')
    .then(({ default: dialog }) => dialog.open(props))
}

function onOpenVacationNotice (e) {
  e.preventDefault()
  import('@/io.ox/mail/mailfilter/vacationnotice/view')
    .then(({ default: view }) => view.open())
}

async function addMailAccount (e) {
  const { default: m } = await import('@/io.ox/mail/accounts/settings')
  m.mailAutoconfigDialog(e)
}

// classic toolbar
ext.point('io.ox/mail/mediator').extend({
  id: 'toolbar',
  index: 10000,
  setup (app) {
    if (_.device('smartphone')) return

    const toolbarView = new ToolbarView({ point: 'io.ox/mail/toolbar/links', title: app.getTitle() })
    app.getWindow().nodes.body.addClass('classic-toolbar-visible').prepend(
      toolbarView.$el
    )

    app.updateToolbar = function (selection) {
      const options = { data: [], folder_id: this.folder.get(), app: this, isThread: this.isThreaded() }
      toolbarView.setSelection(selection.map(_.cid), function () {
        // resolve thread
        options.data = api.resolve(selection, options.isThread)
        return options
      })
    }

    app.forceUpdateToolbar = function (selection) {
      toolbarView.selection = null
      this.updateToolbar(selection)
    }
  }
})

ext.point('io.ox/mail/mediator').extend({
  id: 'update-toolbar',
  index: 10200,
  setup (app) {
    if (_.device('smartphone')) return
    app.updateToolbar([])
    // update toolbar on selection change as well as any model change (seen/unseen flag)
    app.listView.on('selection:change', function () {
      app.updateToolbar(app.listView.selection.get())
    })
    app.listView.on('change', function (model) {
      if (!('flags' in model.changed)) return
      app.forceUpdateToolbar(app.listView.selection.get())
    })
    app.threadView?.collection?.on('reset add remove', _.debounce(() => {
      app.forceUpdateToolbar(app.listView.selection.get())
    }, 10))
  }
})
