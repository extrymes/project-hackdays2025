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
import mobile from '@/io.ox/backbone/views/actions/mobile'
import api from '@/io.ox/mail/api'

import gt from 'gettext'

const meta = {
  compose: {
    prio: 'hi',
    mobile: 'hi',
    title: gt('New email'),
    icon: 'bi/pencil.svg',
    ref: 'io.ox/mail/actions/compose',
    drawDisabled: true
  },
  reply: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/reply.svg',
    title: gt('Reply to sender'),
    ref: 'io.ox/mail/actions/reply',
    drawDisabled: true
  },
  'reply-all': {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/reply-all.svg',
    title: gt('Reply to all recipients'),
    ref: 'io.ox/mail/actions/reply-all',
    drawDisabled: true
  },
  forward: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/forward.svg',
    title: gt('Forward'),
    ref: 'io.ox/mail/actions/forward',
    drawDisabled: true
  },
  delete: {
    prio: 'hi',
    mobile: 'hi',
    icon: 'bi/trash.svg',
    title: gt('Delete'),
    ref: 'io.ox/mail/actions/delete',
    drawDisabled: true
  },
  'mark-read': {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Mark as read'),
    ref: 'io.ox/mail/actions/mark-read'
  },
  'mark-unread': {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Mark as unread'),
    ref: 'io.ox/mail/actions/mark-unread'
  },
  spam: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Mark as spam'),
    ref: 'io.ox/mail/actions/spam'
  },
  nospam: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Not spam'),
    ref: 'io.ox/mail/actions/nospam'
  },
  color: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Set color...'),
    ref: 'io.ox/mail/actions/triggerFlags'
  },
  flag: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Flag'),
    ref: 'io.ox/mail/actions/flag'
  },
  unflag: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Unflag'),
    ref: 'io.ox/mail/actions/unflag'
  },
  reminder: {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Reminder'),
    ref: 'io.ox/mail/actions/reminder'
  },
  copy: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Copy'),
    ref: 'io.ox/mail/actions/copy'
  },
  move: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Move'),
    ref: 'io.ox/mail/actions/move',
    drawDisabled: true
  },
  archive: {
    prio: 'hi',
    mobile: 'lo',
    // #. Verb: (to) archive messages
    title: gt.pgettext('verb', 'Archive'),
    ref: 'io.ox/mail/actions/archive'
  },
  sendmail: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Send email'),
    ref: 'io.ox/mail/actions/sendmail'
  },
  'save-as-distlist': {
    prio: 'lo',
    mobile: 'lo',
    title: gt('Save as distribution list'),
    ref: 'io.ox/mail/actions/createdistlist'
  },
  print: {
    prio: 'hi',
    mobile: 'lo',
    title: gt('Print'),
    ref: 'io.ox/mail/actions/print'
  },
  source: {
    prio: 'lo',
    mobile: 'lo',
    // #. source in terms of source code
    title: gt('View source'),
    ref: 'io.ox/mail/actions/source'
  }
}

const points = {
  listView: 'io.ox/mail/mobile/toolbar/listView',
  multiselect: 'io.ox/mail/mobile/toolbar/listView/multiselect',
  threadView: 'io.ox/mail/mobile/toolbar/threadView',
  detailView: 'io.ox/mail/mobile/toolbar/detailView'
}

mobile.addAction(points.listView, meta, ['compose'])
mobile.addAction(points.multiselect, meta, ['compose', 'delete', 'forward', 'mark-read', 'mark-unread', 'move', 'archive'])
mobile.addAction(points.threadView, meta, ['compose'])
mobile.addAction(points.detailView, meta, ['reply', 'reply-all', 'delete', 'forward', 'mark-read', 'mark-unread', 'color', 'flag', 'unflag', 'spam', 'nospam', 'move', 'copy', 'archive', 'sendmail', 'reminder', 'print', 'save-as-distlist', 'source'])
mobile.createToolbarExtensions(points)

const updateToolbar = _.debounce(function (selection) {
  if (!selection) return

  // remember if this list is based on a single thread
  let isThread = this.isThreaded()

  // resolve thread
  let list = api.resolve(selection, isThread)
  if (list.length === 0) isThread = false

  // extract single object if length === 1

  list = list.length === 1 ? list[0] : list

  // don't set an empty baton
  // if (selection.length === 0 && list.length === 0) return;
  // draw toolbar
  const baton = ext.Baton({ data: list, isThread, selection, app: this })

  // handle updated baton to pageController
  const current = this.pages.getCurrentPage()

  // handle baton to navbar
  // this is special for mail as we might show the "edit draft" action in the upper right corner
  // for draft mails
  current.navbar.setBaton(baton)
  if (current.toolbar) current.toolbar.setBaton(baton)
  if (current.secondaryToolbar) current.secondaryToolbar.setBaton(baton)
}, 50)

// multi select toolbar links need some attention
// in case nothing is selected disabled buttons
// This should be done via our Link concept, but I
// didn't get it running. Feel free to refactor this
// to a nicer solution
ext.point(points.multiselect).extend({
  id: 'update-button-states',
  index: 10000,
  draw (baton) {
    // should work for this easy case
    if (baton.data.length === 0) {
      $('a.mobile-toolbar-action, .mobile-toolbar-action a', this).addClass('ui-disabled')
    } else {
      $('a.mobile-toolbar-action, .mobile-toolbar-action a', this).removeClass('ui-disabled')
    }
  }
})

// some mediator extensions
// register update function and introduce toolbar updating
ext.point('io.ox/mail/mediator').extend({
  id: 'toolbar-mobile',
  index: 10100,
  setup (app) {
    if (!_.device('smartphone')) return
    app.updateToolbar = updateToolbar
  }
})

ext.point('io.ox/mail/mediator').extend({
  id: 'update-toolbar-mobile',
  index: 10300,
  setup (app) {
    if (!_.device('smartphone')) return
    app.updateToolbar()
    // update toolbar on selection change as well as any model change (seen/unseen flag)
    // selection:action also triggers if the same mail is opened again, so the toolbar has to be drawn
    app.listView.on('selection:change change selection:action', function () {
      const cp = app.pages.getCurrentPage()
      // don't update in folder view
      if (cp.name === 'folderTree') return
      // if there's a thread-mail baton already set, don't overwrite it
      // Happens because the change event occurs later than the "showmail" event
      if (cp.toolbar && cp.toolbar.baton.threadMember) return
      app.updateToolbar(app.listView.selection.get())
    })

    app.threadView.$el.on('showmail', function () {
      const baton = ext.Baton({ threadMember: true, data: app.threadView.mail, isThread: false, app })
      // handle updated baton to pageController
      app.pages.getPageObject('detailView').toolbar.setBaton(baton)
    })
  }
})

ext.point('io.ox/mail/mediator').extend({
  id: 'change-mode-toolbar-mobile',
  index: 10400,
  setup (app) {
    if (!_.device('smartphone')) return
    // if multiselect is triggered, show secondary toolbar with other options based on selection
    app.props.on('change:checkboxes', function (model, state) {
      const page = app.pages.getCurrentPage()
      app.pages.toggleSecondaryToolbar(page.name, state)
    })
  }
})
