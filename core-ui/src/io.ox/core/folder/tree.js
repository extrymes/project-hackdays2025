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
import DisposableView from '@/io.ox/backbone/views/disposable'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import ContextMenuUtils from '@/io.ox/backbone/mini-views/contextmenu-utils'
import Selection from '@/io.ox/core/folder/selection'
import api from '@/io.ox/core/folder/api'
import ext from '@/io.ox/core/extensions'
import filestorageApi from '@/io.ox/core/api/filestorage'
import capabilities from '@/io.ox/core/capabilities'
import '@/io.ox/core/folder/favorites'
import '@/io.ox/files/favorites'
import '@/io.ox/core/folder/extensions'

import { settings } from '@/io.ox/core/settings'

import gt from 'gettext'

const TreeView = DisposableView.extend({

  attributes: { role: 'navigation' },

  className: 'folder-tree',

  events: {
    'click .contextmenu-control': 'onToggleContextMenu',
    'contextmenu .folder.selectable[aria-haspopup="true"]': 'onContextMenu',
    'keydown .folder.selectable[aria-haspopup="true"]': 'onKeydownMenuKeys',
    'keydown .folder.selectable': 'onKeydown',
    'click .folder.selectable.selected': 'onClick'
  },

  initialize (options) {
    options = _.extend({
      context: 'app',
      contextmenu: false,
      customize: $.noop,
      disable: $.noop,
      abs: true,
      icons: settings.get('features/folderIcons', true),
      root: 'default0/INBOX',
      highlight: _.device('!smartphone'),
      highlightclass: 'visible-selection',
      hideTrashfolder: false,
      realNames: false,
      ariaLabel: gt('Folders')
    }, options)

    this.all = !!options.all
    this.app = options.app
    this.context = options.context
    this.flat = !!options.flat
    this.module = options.module
    this.open = options.open
    this.root = options.root
    this.realNames = options.realNames
    this.id = _.uniqueId('folder-tree-')

    this.$el.data('view', this)
    this.$container = $('<ul class="tree-container f6-target" role="tree">').attr('id', this.id)
    this.$el.attr('aria-label', options.ariaLabel)

    this.$dropdownMenu = $()
    this.options = options

    this.$el.toggleClass(options.highlightclass, !!options.highlight)
    this.$el.append(this.$container)

    this.selection = new Selection(this)

    if (options.abs) this.$el.addClass('abs')

    // add contextmenu?
    if (options.contextmenu) {
      _.defer(function () {
        if (this.disposed) return
        this.renderContextMenu()
      }.bind(this))
    }
  },

  // convenience function
  // to avoid evil trap: path might contains spaces
  appear (node) {
    const id = node.folder.replace(/\s/g, '_')
    this.trigger('appear:' + id, node)
  },

  // See Bug: 54812 (Note: This should not be necessary, but node does not get focus otherwise)
  onClick (e) {
    if ($(document.activeElement).is('.folder.selectable.selected')) return
    $(e.currentTarget).focus()
  },

  // counter-part
  onAppear (id, handler) {
    const node = this.getNodeView(id)
    if (node) return handler.call(this, node)
    // to avoid evil trap: path might contains spaces
    id = String(id).replace(/\s/g, '_')
    this.once('appear:' + id, handler)
  },

  preselect (id) {
    // wait for node to appear
    if (id === undefined) return
    this.onAppear(id, function () {
      // defer selection; might be too fast otherwise
      _.defer(function () {
        if (this.disposed) return
        this.selection.set(id)
      }.bind(this))
      this.trigger('afterAppear')
    })
  },

  // hint: doesn't cover 'sections'
  traversePath (id, callback) {
    const tree = this
    api.path(id).then(function (path) {
      return _(path).pluck('id').forEach(callback.bind(tree))
    })
  },

  // usually you want to use app.folder.set
  select (id) {
    let ids = []; const tree = this

    function open () {
      // get next id and the corresponding node
      const id = ids.shift(); const node = tree.getNodeView(id)
      // select the final folder?
      if (!ids.length) return tree.selection.set(id)
      if (!node) return
      node.once('reset', open)
      node.toggle(true)
    }

    api.path(id).done(function (path) {
      ids = _(path).pluck('id')
      open()
    })
  },

  getNodeView (id) {
    return this.$(`.folder[data-id="${CSS.escape(id)}"]`).data('view')
  },

  getSelectedNodeView (id) {
    return this.$(`.folder.selected[data-id="${CSS.escape(id)}"]`).data('view')
  },

  filter (folder, model) {
    // .hideTrashfolder hides the trashfolder, used when saving attachments to drive see Bug 38280
    if (this.options.hideTrashfolder && api.is('trash', model.attributes)) { return false }

    // custom filter?
    const filter = this.options.filter
    const result = _.isFunction(filter) ? filter.apply(this, arguments) : undefined
    if (result !== undefined) return result
    // other folders
    let module = model.get('module')
    if (module === 'event') module = 'calendar'
    return module === this.module || (this.module === 'mail' && (/^default\d+(\W|$)/i).test(model.id))
  },

  getOpenFolders () {
    return _(this.$el.find('.folder.open')).chain()
      .map(function (node) {
        const namespace = $(node).attr('data-namespace') ? $(node).attr('data-namespace') + ':' : ''
        return namespace + $(node).attr('data-id')
      })
      .uniq().value().sort()
  },

  getTreeNodeOptions (options, model) {
    if (model.get('id') === 'default0/INBOX' && options.parent.folder === 'virtual/standard') {
      // usually no subfolders; exception is altnamespace
      options.subfolders = !!api.altnamespace()
    }
    if (this.flat) {
      options.icons = false
      if (options.parent !== this) {
        options.subfolders = false
      }
    }
    if (options.parent.folder === 'virtual/standard') {
      options.icons = true
    }
    if (options.parent.folder === 'virtual/favorites/infostore') {
      options.inFavorites = true
    }
    if (model.get('icon')) options.icon = model.get('icon')
    return options
  },

  toggleContextMenu (pos) {
    // return early on close
    const isOpen = this.dropdown.$el.hasClass('open')
    if (isOpen || _.device('smartphone')) return
    if (!pos.target.is('.contextmenu-control')) pos.target = pos.target.find('.contextmenu-control').first()

    _.defer(() => {
      if (this.disposed) return
      this.$dropdownMenu.data({ top: pos.top, left: pos.left }).empty().busy()
      this.dropdown.$toggle = pos.target
      this.$dropdownToggle.dropdown('toggle')
    })
  },

  onToggleContextMenu (e) {
    const target = ($(e.target).is('a') && e.type === 'keydown') ? $(e.target) : $(e.currentTarget)
    // calculate proper position
    const offset = target.offset()
    const top = offset.top - 7
    const left = offset.left + target.outerWidth() + 7
    this.toggleContextMenu({ target, top, left })
  },

  onKeydown (e) {
    // home / end support
    if (!/35|36/.test(e.which)) return

    if (e.which === 36) {
      this.$el.find('li.folder.selectable:visible:first').trigger('click')
    } else if (e.which === 35) {
      this.$el.find('li.folder.selectable:visible:last').trigger('click')
    }
  },

  onKeydownMenuKeys (e) {
    ContextMenuUtils.macOSKeyboardHandler(e)
    // Needed for a11y, shift + F10 and the menu key open the contextmenu
    if (e.type !== 'keydown') return

    const shiftF10 = (e.shiftKey && e.which === 121)
    const menuKey = e.which === 93
    if (/13|32|38|40/.test(e.which) || shiftF10 || menuKey) {
      this.focus = /38/.test(e.which) ? 'li:last > a' : 'li:first > a'
    }

    if (shiftF10 && e.isKeyboardEvent) {
      // e.isKeyboardEvent will be true for Shift-F10 triggered context menus on macOS
      // other browsers will just trigger contextmenu events
      this.onContextMenu(e)
    }
  },

  onContextMenu (e) {
    // clicks bubbles. right-click not
    // DO NOT ADD e.preventDefault() HERE (see bug 42409)
    e.stopPropagation()
    this.toggleContextMenu(ContextMenuUtils.positionForEvent(e))
  },

  getContextMenuId (id) {
    return 'io.ox/core/foldertree/contextmenu/' + (id || 'default')
  },

  renderContextMenuItems (contextmenu) {
    const id = this.selection.get('data-contextmenu-id')
    const app = this.app
    const module = this.module
    const ul = this.$dropdownMenu.empty()
    const point = this.getContextMenuId(contextmenu)
    const view = this
    const favorite = this.selection.get('data-favorite')
    const dropdownToggle = this.$dropdownToggle
    // get folder data and redraw
    api.get(id).done(function (data) {
      // grab available deputy modules (needed for some extensions)
      // make sure filestorageApi did the rampup call to fill caches. If it failed, just draw without rampup (some items might be missing though)
      $.when(capabilities.has('deputy')
        ? import('@/io.ox/core/deputy/api').then(({ default: deputyApi }) => deputyApi.getAvailableModules())
        : [], filestorageApi.rampup()).always(function (availableDeputyModules) {
        const baton = new ext.Baton({ app, data, view, module, originFavorites: favorite, availableDeputyModules })
        ext.point(point).invoke('draw', ul, baton)
        ext.point(point).invoke('render', view.dropdown, baton)
        if (_.device('smartphone')) {
          ul.append(
            $('<li role="presentation">').append(
              $('<a href="#" role="menuitem" class="io-ox-action-link" data-action="close-menu">').text(gt('Close'))
            )
          )
          if (ul.find('[role=menuitem]').length === 0) {
            ul.prepend(
              $('<li>').append(
                $('<div class="custom-dropdown-label">').text(gt('No action available'))
              )
            )
          }
        }
        if (_.device('smartphone')) ul.find('.divider').remove()
        // remove unwanted dividers
        ul.find('.divider').each(function () {
          const node = $(this)
          const next = node.next()
          // remove leading, subsequent, and tailing dividers
          if (node.prev().length === 0 || next.hasClass('divider') || next.length === 0) node.remove()
        })
        if (!_.device('smartphone')) view.dropdown.setDropdownOverlay()

        if (view.focus) {
          ul.find(view.focus).focus()
        }
        view.focus = false
      })
    }).always(function () {
      // remove marker class
      dropdownToggle.removeClass('opening')
    })
  },

  renderContextMenu: (function () {
    function renderItems (contextmenu) {
      this.$dropdownMenu.idle()
      this.renderContextMenuItems(contextmenu)
    }

    function show () {
      // add marker class to prevent keyboard handlers from closing halfway during opening (creates too small dropdown with wrong position)
      this.$dropdownToggle.addClass('opening')
      // desktop 'burger' vs. mobile-edit-mode
      const contextmenu = this.dropdown.$toggle.attr('data-contextmenu') || this.selection.get('data-contextmenu')
      // load relevant code on demand
      import('@/io.ox/core/folder/contextmenu').then(_.lfo(renderItems.bind(this, contextmenu)))
      // a11y: The role menu should only be set if there are menuitems in it
      this.$dropdownMenu.attr('role', 'menu')
    }

    function fixFocus () {
      this.dropdown.$toggle.parents('li').first().focus()
    }

    return function () {
      this.$dropdownToggle = $('<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true">').attr('aria-label', gt('Folder options'))
      this.$dropdownMenu = $('<ul class="dropdown-menu">')
      this.dropdown = new Dropdown({
        smart: false,
        className: 'context-dropdown dropdown',
        $toggle: this.$dropdownToggle,
        $ul: this.$dropdownMenu,
        margin: 24
      })

      this.$el.after(
        this.dropdown.render().$el
          .on('show.bs.dropdown', show.bind(this))
          .on('hidden.bs.dropdown', fixFocus.bind(this))
      )
      this.$dropdownMenu.removeAttr('role')
    }
  }()),

  render () {
    ext.point('io.ox/core/foldertree/' + this.module + '/' + this.context).invoke('draw', this.$container, this)
    return this
  }
})

export default TreeView
