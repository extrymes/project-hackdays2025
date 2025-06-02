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
import ext from '@/io.ox/core/extensions'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import account from '@/io.ox/core/api/account'
import commons from '@/io.ox/core/commons'
import contextmenu from '@/io.ox/core/folder/contextmenu'
import folderAPI from '@/io.ox/core/folder/api'
import api from '@/io.ox/mail/api'
import FolderInfoView from '@/io.ox/core/tk/folder-info'
import { settings } from '@/io.ox/mail/settings'

import gt from 'gettext'
import { createButton } from '@/io.ox/core/components'

ext.point('io.ox/mail/view-options').extend({
  id: 'all',
  index: 100,
  draw (baton) {
    const view = this.data('view')
    const app = baton.app
    const extensions = contextmenu.extensions
    const node = view.$ul

    // show a generic select all action for all-unseen, search results and when using categories
    const actions = app.folder.get() === 'virtual/all-unseen' || app.folder.get() === api.allFlaggedMessagesFolder || app.props.get('searching') || app.props.get('categories')
      ? ['selectAll']
      : ['selectAll', 'divider', 'headerAll', 'markFolderSeen', 'moveAllMessages', 'archive', 'empty']

    app.folder.getData().done(function (data) {
      const baton = new ext.Baton({ data, module: 'mail', listView: app.listView })
      actions.forEach(id => extensions[id].call(node, baton))
    })

    if (!view.alreadyListening) {
      view.listenTo(app, 'folder:change', redraw)
      view.listenTo(app.props, 'change:categories change:searching', redraw)
      view.alreadyListening = true
    }

    function redraw () {
      // we need to postpone this because folder:change happens before model updates
      _.defer(() => {
        this.$ul.empty()
        ext.point('io.ox/mail/view-options').invoke('draw', this.$el, baton)
      })
    }
  }
})

ext.point('io.ox/mail/view-options').extend({
  id: 'sort',
  index: 200,
  draw (baton) {
    if (baton.app.props.get('searching')) return
    const view = this.data('view')
    const folder = baton.app.folder.get()
    if (folder === 'virtual/all-unseen') return

    view
      .divider()
      .header(gt('Sort by'))
      .option('sort', 661, gt('Date'), { radio: true })
      .option('sort', 'from-to', account.is('sent|drafts', folder) ? gt('To') : gt('From'), { radio: true })
      .option('sort', 651, gt('Unread'), { radio: true })
      .option('sort', 608, gt('Size'), { radio: true })
      .option('sort', 607, gt('Subject'), { radio: true })

    // #. Sort by messages that have attachments
    if (folderAPI.pool.getModel(folder).supports('ATTACHMENT_MARKER')) view.option('sort', 602, gt('Attachments'), { radio: true })
    // color flags
    if (settings.flagByColor) this.data('view').option('sort', 102, gt('Color'), { radio: true })
    // sort by /flagged messages, internal naming is "star"
    // #. Sort by messages which are flagged, "Flag" is used in dropdown
    if (settings.flagByStar) this.data('view').option('sort', 660, gt('Flag'), { radio: true })
  }
})

ext.point('io.ox/mail/view-options').extend({
  id: 'order',
  index: 300,
  draw (baton) {
    if (baton.app.props.get('searching')) return
    if (baton.app.folder.get() === 'virtual/all-unseen') return
    this.data('view')
      .divider()
      .header(gt('Sort order'))
      .option('order', 'asc', gt('Ascending'), { radio: true })
      .option('order', 'desc', gt('Descending'), { radio: true })
  }
})

ext.point('io.ox/mail/view-options').extend({
  id: 'thread',
  index: 400,
  draw (baton) {
    if (baton.app.props.get('searching')) return
    if (baton.app.folder.get() === 'virtual/all-unseen') return
    // don't add if thread view is disabled server-side
    if (baton.app.settings.get('threadSupport', true) === false) return
    // no thread support in drafts/sent folders. This breaks caching (Sent folders get incomplete threads). See OXUIB-853
    if (account.is('sent|drafts', baton.app.folder.get())) return
    this.data('view')
      .divider()
      .header(gt('Group by'))
      .option('thread', true, gt('Conversations'))
  }
})

ext.point('io.ox/mail/list-view/toolbar/top').extend({
  id: 'dropdown',
  index: 1000,
  draw (baton) {
    const dropdown = new Dropdown({
      tagName: 'li',
      className: 'dropdown grid-options toolbar-item margin-left-auto',
      attributes: { role: 'presentation' },
      $toggle: createButton({ variant: 'btn btn-toolbar', icon: { name: 'bi/three-dots.svg', title: gt('More message options') } }),
      dataAction: 'sort',
      model: baton.app.props
    })
    ext.point('io.ox/mail/view-options').invoke('draw', dropdown.$el, baton)
    this.append(
      dropdown.render().$el
        .find('.dropdown-menu')
        .addClass('dropdown-menu-right')
        .end()
        .on('dblclick', function (e) { e.stopPropagation() })
    )
  }
})

ext.point('io.ox/mail/list-view/toolbar/top').extend({
  id: 'all',
  index: 200,
  draw (baton) {
    if (_.device('smartphone')) return
    this.addClass('items-center').append(
      new FolderInfoView({ app: baton.app }).render().$el
    )
  }
})

ext.point('io.ox/mail/list-view/toolbar/bottom').extend({
  id: 'status',
  index: 100,
  draw (baton) {
    const $el = $('<li role="presentation" class="status-bar flex-center">').appendTo(this)
    baton.app.listView.on('collection:loading', updateStatus)
    setInterval(updateStatus.bind(baton.app.listView), 10000)

    function updateStatus () {
      $el.text(getStatus(this.collection))
    }

    function getStatus (collection) {
      if (collection.loading) return gt('Loading') + ' ...'
      const age = Math.ceil((_.now() - collection.timestamp) / 60000) || 0
      if (age < 2) return gt('Updated just now')
      if (age < 60) return gt('Updated %1$d minutes ago', age)
      // #. %1$d is a time
      return gt('Updated at %1$d', moment(collection.timestamp).format('LT'))
    }
  }
})

ext.point('io.ox/mail/sidepanel').extend({
  id: 'toggle-folderview',
  index: 1000,
  draw (baton) {
    const guid = _.uniqueId('control')
    this.addClass('bottom-toolbar').append(
      $('<div class="generic-toolbar bottom visual-focus" role="region">').attr('aria-labelledby', guid).append(
        createButton({ variant: 'toolbar', icon: { name: 'bi/layout-sidebar.svg', title: gt('Close folder view'), className: 'bi-14' } })
          .addClass('btn-translucent-white')
          .attr({ id: guid, 'data-action': 'close-folder-view' })
          .on('click', () => baton.app.folderView.toggle(false))
      )
    )
  }
})

ext.point('io.ox/mail/sidepanel').extend({
  id: 'help',
  index: 1100,
  draw: commons.help
})
